"""Lê MailHog (API v2) para validar e-mail da saga e extrair senha provisória."""

from __future__ import annotations

import base64
import email
import re
from typing import Any

import httpx


def _decode_body(raw: str) -> str:
    if not raw:
        return ""
    raw = raw.strip()
    if not raw.startswith("Content-") and "MIME-Version" not in raw[:200]:
        return raw
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
            return base64.b64decode(raw).decode("utf-8", errors="replace")
        except Exception:
            return raw


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

    deadline = time.monotonic() + timeout_s
    url = f"{mailhog_base.rstrip('/')}/api/v2/messages"
    pwd_re = re.compile(r"Senha provisória:\s*(\S+)", re.I)
    conta_re = re.compile(r"Conta \(4 dígitos\):\s*(\d{4})", re.I)

    while time.monotonic() < deadline:
        r = client.get(url, timeout=10.0)
        r.raise_for_status()
        data: dict[str, Any] = r.json()
        for item in data.get("items") or []:
            blob = json.dumps(item, ensure_ascii=False).lower()
            if destinatario_email.lower() not in blob:
                continue
            content = item.get("Content") or {}
            body = _decode_body(content.get("Body") or "")
            if "conta foi aprovada" not in body.lower() and "senha provisória" not in body.lower():
                continue
            m = pwd_re.search(body)
            if not m:
                continue
            senha = m.group(1).strip()
            mc = conta_re.search(body)
            numero = mc.group(1) if mc else None
            return senha, numero
        time.sleep(interval_s)
    raise TimeoutError(f"E-mail de credenciais não chegou para {destinatario_email} em {timeout_s}s")
