"""Lê MailHog (API v2) para validar e-mail da saga e extrair senha provisória."""

from __future__ import annotations

import base64
import email
import json
import os
import quopri
import re
import sys
from typing import Any

import httpx


def _decode_quoted_printable(text: str) -> str:
    if not text or not re.search(r"=[0-9A-Fa-f]{2}", text):
        return text
    try:
        normalized = text.replace("=\r\n", "").replace("=\n", "")
        return quopri.decodestring(normalized.encode("utf-8", errors="replace")).decode(
            "utf-8",
            errors="replace",
        )
    except Exception:
        return text


def _decode_body(raw: str) -> str:
    if not raw:
        return ""
    raw = raw.strip()
    if not raw.startswith("Content-") and "MIME-Version" not in raw[:200]:
        return _decode_quoted_printable(raw)
    try:
        msg = email.message_from_string(raw)
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    pl = part.get_payload(decode=True)
                    if isinstance(pl, bytes):
                        return pl.decode(part.get_content_charset() or "utf-8", errors="replace")
        pl = msg.get_payload(decode=True)
        if isinstance(pl, bytes):
            return pl.decode(msg.get_content_charset() or "utf-8", errors="replace")
        return str(msg.get_payload() or "")
    except Exception:
        try:
            return _decode_quoted_printable(
                base64.b64decode(raw).decode("utf-8", errors="replace"),
            )
        except Exception:
            return _decode_quoted_printable(raw)


def buscar_senha_provisoria(
    client: httpx.Client,
    mailhog_base: str,
    destinatario_email: str,
    timeout_s: float = 90.0,
    interval_s: float = 2.0,
) -> tuple[str, str | None]:
    """
    Poll MailHog até encontrar e-mail de aprovação para `destinatario_email`.
    Retorna (senha_provisória, numero_conta_4_digitos ou None).
    """
    import time

    verbose = os.environ.get("BANTADS_POLL_VERBOSE", "1").lower() in ("1", "true", "yes")
    deadline = time.monotonic() + timeout_s
    started = time.monotonic()
    attempt = 0
    url = f"{mailhog_base.rstrip('/')}/api/v2/messages"
    pwd_re = re.compile(r"Senha provis[oó]ria:\s*(\S+)", re.I)
    conta_re = re.compile(r"Conta \(4 dígitos\):\s*(\d{4})", re.I)

    while time.monotonic() < deadline:
        attempt += 1
        if verbose:
            elapsed = time.monotonic() - started
            print(
                f"[poll] MailHog senha para {destinatario_email} — tentativa {attempt}, {elapsed:.0f}s",
                file=sys.stderr,
                flush=True,
            )
        r = client.get(url, timeout=10.0)
        r.raise_for_status()
        data: dict[str, Any] = r.json()
        for item in data.get("items") or []:
            blob = json.dumps(item, ensure_ascii=False).lower()
            if destinatario_email.lower() not in blob:
                continue
            content = item.get("Content") or {}
            body = _decode_body(content.get("Body") or "")
            body_lower = body.lower()
            approval_markers = (
                "conta foi aprovada",
                "cadastro foi aprovado",
                "senha provisória",
                "senha provisoria",
            )
            if not any(m in body_lower or m in blob for m in approval_markers):
                continue
            m = pwd_re.search(body) or pwd_re.search(blob)
            if not m:
                continue
            senha = m.group(1).strip()
            mc = conta_re.search(body)
            numero = mc.group(1) if mc else None
            return senha, numero
        time.sleep(interval_s)
    raise TimeoutError(f"E-mail de credenciais não chegou para {destinatario_email} em {timeout_s}s")


_REJECTION_MARKERS = (
    "não aprovado",
    "não foi aprovado",
    "cadastro não aprovado",
    "nao foi aprovado",
    "nao aprovado",
)

_FALHA_SAGA_MARKERS = (
    "solicitação não concluída",
    "solicitacao nao concluida",
    "não foi efetivada",
    "nao foi efetivada",
    "falha em processos internos",
)


def _email_item_matches(
    item: dict[str, Any],
    destinatario_email: str,
    markers: tuple[str, ...],
) -> bool:
    blob = json.dumps(item, ensure_ascii=False).lower()
    if destinatario_email.lower() not in blob:
        return False
    content = item.get("Content") or {}
    body = _decode_body(content.get("Body") or "").lower()
    subject = " ".join((content.get("Headers") or {}).get("Subject") or []).lower()
    hay = f"{body} {subject} {blob}"
    return any(m in hay for m in markers)


def buscar_email_rejeicao(
    client: httpx.Client,
    mailhog_base: str,
    destinatario_email: str,
    timeout_s: float = 60.0,
    interval_s: float = 2.0,
) -> None:
    """Poll MailHog até encontrar e-mail de rejeição de cadastro (R11)."""
    import time

    deadline = time.monotonic() + timeout_s
    url = f"{mailhog_base.rstrip('/')}/api/v2/messages"
    while time.monotonic() < deadline:
        r = client.get(url, timeout=10.0)
        r.raise_for_status()
        for item in r.json().get("items") or []:
            if _email_item_matches(item, destinatario_email, _REJECTION_MARKERS):
                return
        time.sleep(interval_s)
    raise TimeoutError(f"E-mail de rejeição não chegou para {destinatario_email} em {timeout_s}s")


def buscar_email_rejeicao_com_motivo(
    client: httpx.Client,
    mailhog_base: str,
    destinatario_email: str,
    motivo_esperado: str,
    timeout_s: float = 60.0,
    interval_s: float = 2.0,
) -> None:
    """R11: e-mail de rejeição deve conter o motivo informado."""
    import time

    deadline = time.monotonic() + timeout_s
    url = f"{mailhog_base.rstrip('/')}/api/v2/messages"
    motivo_lower = motivo_esperado.lower()
    while time.monotonic() < deadline:
        r = client.get(url, timeout=10.0)
        r.raise_for_status()
        for item in r.json().get("items") or []:
            if not _email_item_matches(item, destinatario_email, _REJECTION_MARKERS):
                continue
            content = item.get("Content") or {}
            body = _decode_body(content.get("Body") or "").lower()
            if motivo_lower in body:
                return
        time.sleep(interval_s)
    raise TimeoutError(f"E-mail de rejeição sem motivo '{motivo_esperado}' para {destinatario_email}")


def buscar_email_falha_saga(
    client: httpx.Client,
    mailhog_base: str,
    destinatario_email: str,
    timeout_s: float = 90.0,
    interval_s: float = 2.0,
) -> None:
    """R1: e-mail quando a saga de aprovação falha após análise favorável."""
    import time

    deadline = time.monotonic() + timeout_s
    url = f"{mailhog_base.rstrip('/')}/api/v2/messages"
    while time.monotonic() < deadline:
        r = client.get(url, timeout=10.0)
        r.raise_for_status()
        for item in r.json().get("items") or []:
            if _email_item_matches(item, destinatario_email, _FALHA_SAGA_MARKERS):
                return
        time.sleep(interval_s)
    raise TimeoutError(f"E-mail de falha na saga não chegou para {destinatario_email} em {timeout_s}s")
