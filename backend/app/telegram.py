import logging

import httpx

log = logging.getLogger("telegram")


def send_message(token: str, chat_id: str, text: str) -> bool:
    """Send a Telegram message. Never raises – logs and returns False on failure."""
    if not token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        resp = httpx.post(url, json={"chat_id": chat_id, "text": text}, timeout=10)
    except Exception as exc:  # network error
        log.warning("Telegram-Versand fehlgeschlagen: %s", exc)
        return False
    if resp.status_code != 200:
        log.warning("Telegram-Fehler %s: %s", resp.status_code, resp.text)
        return False
    return True
