"""
LuciusProxy - DNS-level threat interception engine.
Runs as a systemd service on port 5353 UDP/TCP.
"""

from __future__ import annotations

import asyncio
import logging
import os
import socket
from datetime import datetime, timezone
from pathlib import Path

import requests
from dnslib import DNSRecord, QTYPE
from dnslib.server import BaseResolver, DNSServer
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / "api" / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("lucius.dns")

UPSTREAM_DNS = os.getenv("UPSTREAM_DNS", "1.1.1.1")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
BLOCKLIST_REFRESH = int(os.getenv("BLOCKLIST_REFRESH_SECONDS", "300"))

SUSPICIOUS_TLDS = {".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".pw"}

_blocklist: set[str] = set()
_allowlist: set[str] = set()
_cache: dict[str, dict] = {}
_blocked_log: list[dict] = []


def _sb_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def load_blocklist_from_supabase() -> None:
    global _blocklist, _allowlist

    if not SUPABASE_URL:
        log.warning("SUPABASE_URL not set - blocklist disabled")
        return

    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/proxy_blocklist?select=domain,list_type&is_active=eq.true",
            headers=_sb_headers(),
            timeout=5,
        )
        response.raise_for_status()
        rows = response.json()
        _blocklist = {row["domain"].lower() for row in rows if row["list_type"] == "block"}
        _allowlist = {row["domain"].lower() for row in rows if row["list_type"] == "allow"}
        log.info("Blocklist loaded: %s blocked, %s allowed", len(_blocklist), len(_allowlist))
    except Exception as exc:
        log.error("Blocklist load failed: %s", exc)


def flush_blocked_events() -> None:
    global _blocked_log

    if not _blocked_log or not SUPABASE_URL:
        return

    batch = _blocked_log[:]
    _blocked_log = []
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/proxy_events",
            headers=_sb_headers(),
            json=batch,
            timeout=5,
        )
        response.raise_for_status()
        log.info("Flushed %s proxy events to Supabase", len(batch))
    except Exception as exc:
        log.error("Event flush failed: %s", exc)
        _blocked_log = batch + _blocked_log


def is_suspicious_domain(domain: str) -> tuple[bool, str]:
    value = domain.lower().rstrip(".")

    if value in _allowlist:
        return False, ""

    if value in _blocklist:
        return True, "custom_blocklist"

    parts = value.split(".")
    for index in range(1, len(parts)):
        parent = ".".join(parts[index:])
        if parent in _blocklist:
            return True, "parent_blocklist"

    for tld in SUSPICIOUS_TLDS:
        if value.endswith(tld):
            return True, f"suspicious_tld:{tld}"

    if len(parts) >= 3:
        subdomain = parts[0]
        if len(subdomain) > 12:
            vowels = sum(1 for char in subdomain if char in "aeiou")
            if vowels / len(subdomain) < 0.15:
                return True, "dga_heuristic"

    return False, ""


def forward_upstream(request: DNSRecord) -> DNSRecord | None:
    try:
        payload = request.pack()
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(3)
        sock.sendto(payload, (UPSTREAM_DNS, 53))
        data, _ = sock.recvfrom(4096)
        sock.close()
        return DNSRecord.parse(data)
    except Exception as exc:
        log.error("Upstream DNS forward failed: %s", exc)
        return None


class LuciusResolver(BaseResolver):
    def resolve(self, request: DNSRecord, handler) -> DNSRecord:
        qname = str(request.q.qname).rstrip(".")
        qtype = QTYPE[request.q.qtype]
        client = handler.client_address[0] if handler.client_address else "unknown"

        suspicious, reason = is_suspicious_domain(qname)
        if suspicious:
            log.warning("BLOCKED %s (%s) from %s", qname, reason, client)
            _blocked_log.append(
                {
                    "domain": qname,
                    "reason": reason,
                    "client_ip": client,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            reply = request.reply()
            reply.header.rcode = 3
            return reply

        cache_key = f"{qname}:{qtype}"
        cached = _cache.get(cache_key)
        if cached:
            age = (datetime.now(timezone.utc) - cached["ts"]).seconds
            if age < cached["ttl"]:
                reply = request.reply()
                for record in cached["rrs"]:
                    reply.add_answer(record)
                return reply

        upstream = forward_upstream(request)
        if upstream:
            ttl = upstream.rr[0].ttl if upstream.rr and hasattr(upstream.rr[0], "ttl") else 300
            _cache[cache_key] = {
                "rrs": list(upstream.rr),
                "ttl": ttl,
                "ts": datetime.now(timezone.utc),
            }
            return upstream

        reply = request.reply()
        reply.header.rcode = 2
        return reply


async def refresh_loop() -> None:
    while True:
        await asyncio.sleep(BLOCKLIST_REFRESH)
        load_blocklist_from_supabase()
        flush_blocked_events()


def main() -> None:
    log.info("LuciusProxy DNS engine starting...")
    load_blocklist_from_supabase()

    resolver = LuciusResolver()
    udp_server = DNSServer(resolver, port=5353, address="0.0.0.0")
    tcp_server = DNSServer(resolver, port=5353, address="0.0.0.0", tcp=True)

    udp_server.start_thread()
    tcp_server.start_thread()

    log.info("LuciusProxy DNS listening on :5353 (UDP+TCP)")
    log.info("Upstream DNS: %s", UPSTREAM_DNS)
    log.info("Blocklist: %s entries", len(_blocklist))

    try:
        asyncio.run(refresh_loop())
    except KeyboardInterrupt:
        log.info("LuciusProxy DNS stopping...")
        flush_blocked_events()
        udp_server.stop()
        tcp_server.stop()


if __name__ == "__main__":
    main()