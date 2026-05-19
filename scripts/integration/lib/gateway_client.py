"""Cliente HTTP síncrono para o gateway BANTADS (`/api/...`)."""

from __future__ import annotations

import os
import sys
import time
from collections.abc import Callable
from typing import Any

import httpx

class GatewayClient:
    def __init__(self, base_url: str, timeout: float = 60.0) -> None:
        self.base = base_url.rstrip("/")
        self._client = httpx.Client(base_url=self.base, timeout=timeout, follow_redirects=True)

    def close(self) -> None:
        self._client.close()

    def request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        json_body: Any | None = None,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        headers: dict[str, str] = {"Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if json_body is not None:
            headers["Content-Type"] = "application/json"
        if method.upper() == "POST":
            normalized = path.rstrip("/")
            if normalized in ("/api/clientes", "/api/gerentes"):
                path = f"{normalized}/"
        return self._client.request(
            method,
            path,
            headers=headers,
            json=json_body,
            params=params,
        )

    def get_json(self, path: str, *, token: str | None = None, params: dict[str, Any] | None = None) -> Any:
        r = self.request("GET", path, token=token, params=params)
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise AssertionError(
                f"GET {path} → HTTP {r.status_code}\n{str(r.text)[:2000]}"
            ) from e
        if not r.content:
            return None
        return r.json()

    def post_json(self, path: str, body: Any, *, token: str | None = None, expect: int | None = None) -> httpx.Response:
        r = self.request("POST", path, token=token, json_body=body)
        if expect is not None and r.status_code != expect:
            raise AssertionError(
                f"POST {path} esperava {expect}, obteve {r.status_code}: {r.text[:800]}"
            )
        return r


def poll_until(
    fn,
    *,
    timeout_s: float = 120.0,
    interval_s: float = 2.0,
    desc: str = "condição",
    fail_fast_assertions: int = 3,
    log_pending: Callable[[], str | None] | None = None,
) -> Any:
    """
    Aguarda ``fn()`` retornar valor truthy (exceto False/None).

    Com ``BANTADS_POLL_VERBOSE=1`` (padrão), imprime progresso em stderr a cada tentativa.
    ``log_pending`` pode retornar texto extra (ex.: status atual da saga) enquanto aguarda.
    Após ``fail_fast_assertions`` AssertionErrors seguidos, aborta (ex.: HTTP 503 persistente).
    Em Ctrl+C, imprime diagnóstico em stderr antes de propagar (use pytest ``--full-trace`` para stack completo).
    """
    verbose = os.environ.get("BANTADS_POLL_VERBOSE", "1").lower() in ("1", "true", "yes")

    def _emit_interrupt(elapsed: float, attempt: int) -> None:
        print(
            f"\n[poll] Interrompido (Ctrl+C) durante: {desc} — tentativa {attempt}, {elapsed:.0f}s",
            file=sys.stderr,
            flush=True,
        )
        if log_pending:
            hint = log_pending()
            if hint:
                print(f"[poll] Último estado: {hint}", file=sys.stderr, flush=True)
        if last_exc:
            print(f"[poll] Última exceção: {last_exc}", file=sys.stderr, flush=True)
        print(
            "[poll] Dica: logs Docker → docker compose logs ms-saga ms-cliente ms-email --tail=50",
            file=sys.stderr,
            flush=True,
        )

    deadline = time.monotonic() + timeout_s
    started = time.monotonic()
    last_exc: Exception | None = None
    assert_streak = 0
    attempt = 0
    try:
        while time.monotonic() < deadline:
            attempt += 1
            elapsed = time.monotonic() - started
            if verbose:
                line = f"[poll] {desc} — tentativa {attempt}, {elapsed:.0f}s"
                if log_pending:
                    hint = log_pending()
                    if hint:
                        line += f" | {hint}"
                print(line, file=sys.stderr, flush=True)
            try:
                ok = fn()
                assert_streak = 0
                if ok is not False and ok is not None:
                    return ok
            except AssertionError as e:
                last_exc = e
                assert_streak += 1
                if assert_streak >= fail_fast_assertions:
                    raise TimeoutError(
                        f"{desc}: erro repetido ({assert_streak}x) após {elapsed:.0f}s — {e}"
                    ) from e
            except Exception as e:
                last_exc = e
                assert_streak = 0
            try:
                time.sleep(interval_s)
            except KeyboardInterrupt:
                _emit_interrupt(elapsed, attempt)
                raise
    except KeyboardInterrupt:
        _emit_interrupt(time.monotonic() - started, attempt)
        raise
    msg = f"Timeout aguardando {desc} ({timeout_s}s)"
    if last_exc:
        msg += f"; última exceção: {last_exc}"
    if log_pending:
        hint = log_pending()
        if hint:
            msg += f"; último estado: {hint}"
    raise TimeoutError(msg)


def sugestao_para_falha(
    status: int | None,
    body_snippet: str,
    nodeid: str,
    exc_msg: str,
) -> list[str]:
    """Heurísticas para realimentar agente (markdown)."""
    tips: list[str] = []
    low = (body_snippet or "").lower()
    if status == 401 or "401" in exc_msg:
        tips.append("Verifique `POST /api/auth/login`, `JWT_SECRET` alinhado entre gateway e ms-auth, e se o token foi colado sem expirar.")
    if status == 403 or "403" in exc_msg:
        tips.append("O gateway exige perfil correto (CLIENTE / GERENTE / ADMINISTRADOR). Confira `gateway/src/*-routes.js` para a rota usada.")
    if status == 404:
        tips.append("Confirme CPF/UUID/número de conta e se o seed foi aplicado (`GET /api/auth/reboot`).")
    if status == 409 or "conflito" in low or "já cadastrado" in low:
        tips.append("Possível dado duplicado (CPF/e-mail). Use outro CPF/e-mail no autocadastro ou limpe bases de dev.")
    if status == 422:
        tips.append("Validação de negócio ou Bean Validation — compare o JSON com o DTO no Swagger do microsserviço.")
    if status == 500 or "500" in exc_msg or "internal server error" in low:
        tips.append(
            "HTTP 500 no gateway costuma ser falha no microsserviço upstream ou na composição (ex.: ms-cliente chamando ms-conta/ms-gerente). "
            "Veja logs: `docker compose logs ms-cliente --tail=80`."
        )
    if "connection" in exc_msg.lower() or "refused" in exc_msg.lower() or "connect" in exc_msg.lower() or "getaddrinfo" in exc_msg.lower():
        if "getaddrinfo" in exc_msg.lower() and (
            "_send_handling_redirects" in exc_msg or "handling_redirects" in exc_msg
        ):
            tips.append(
                "Com stack de redirect: muito provável 302/301 com header Location apontando para hostname Docker (ex.: http://ms-auth:8081/…). "
                "Confirme com curl -v ou httpx sem follow_redirects; o gateway deve reescrever Location para o Host público."
            )
        tips.append(
            "Falha de rede/DNS. Use `BANTADS_GATEWAY=http://127.0.0.1` (porta 80 implícita) e confirme que o gateway escuta na máquina host."
        )
    if "timeout" in exc_msg.lower() or "TimeoutError" in exc_msg:
        tips.append("Para sagas: confira RabbitMQ (`:15672`), ms-saga-orchestrator, ms-email e MailHog (`:8025`). Aumente `BANTADS_SAGA_WAIT_S` se a máquina for lenta.")
    if "mailhog" in exc_msg.lower() or "e-mail" in exc_msg.lower():
        tips.append("Confira se MailHog está na porta 8025 e se ms-email envia para o SMTP 1025 (compose).")
    if not tips:
        tips.append("Reproduza o mesmo pedido no Swagger do microsserviço ou em `tutor/httpieTests.md` e compare status/corpo.")
    return tips
