#!/usr/bin/env python3
"""
Probe Sera testnet: which tokens have a quotable route into ~10,000 USDC right
now? Hits POST /swap/quote/batch (50/req) and reports `ok` legs with a
non-zero minOutputAmount and the implied rate.

Run: python3 scripts/probe-usdc-liquidity.py
"""
from __future__ import annotations
import json, math, time, urllib.request, urllib.error

BASE = "https://api-testnet.sera.cx/api/v1"
USDC = "0x6553a0500e935f7ca017a1eddd9570f4d24fefdd"
DUMMY = "0x0000000000000000000000000000000000000001"
TARGET_USDC = 10_000
# Rough FX seed used to size each `from_amount`. We over-quote by 20% so a
# token slightly weaker than USD still produces a quote large enough to cover
# 10k USDC.
APPROX_RATE_TO_USD = {"USD": 1.0, "EUR": 1.08, "GBP": 1.27, "JPY": 0.0064, "CHF": 1.12,
                      "CAD": 0.73, "AUD": 0.66, "SGD": 0.74, "HKD": 0.128, "NZD": 0.60,
                      "BRL": 0.20, "MXN": 0.055, "ZAR": 0.054, "KRW": 0.00073,
                      "INR": 0.012, "IDR": 0.000062, "THB": 0.028, "TRY": 0.029,
                      "PHP": 0.018, "CNY": 0.139, "ARS": 0.001, "COP": 0.00025,
                      "NGN": 0.00065, "VND": 0.00004, "AED": 0.272, "ILS": 0.27,
                      "EGP": 0.020, "PEN": 0.27, "CLP": 0.0010, "PKR": 0.0036,
                      "MYR": 0.21, "UYU": 0.025}

def http_json(url: str, body: dict | None = None, timeout: int = 15) -> dict:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data,
                                 headers={"Content-Type": "application/json",
                                          "Accept": "application/json",
                                          "User-Agent": "settla-probe/1.0"},
                                 method="POST" if body else "GET")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

print("Fetching token + market registries...")
tokens = {t["address"].lower(): t for t in http_json(f"{BASE}/tokens")["tokens"]}
markets = http_json(f"{BASE}/markets")["markets"]

# Which non-USDC tokens have a direct USDC market (either orientation)?
candidates: dict[str, dict] = {}  # addr -> token-meta
for m in markets:
    base_addr, quote_addr = m["base_address"].lower(), m["quote_address"].lower()
    if base_addr == USDC.lower():
        other = quote_addr
    elif quote_addr == USDC.lower():
        other = base_addr
    else:
        continue
    if other in tokens:
        candidates[other] = tokens[other]

print(f"{len(candidates)} tokens have a direct USDC market on Sera testnet.\n")

# Build batch request: ask each candidate to quote enough of itself to produce
# ~12k USDC (20% buffer). Sera will return ok=true with the actual route, or a
# typed rejection (no_liquidity, amount_below_min, ...).
exp = int(time.time()) + 600
def from_amount_raw(tok: dict) -> str:
    sym, cur, dec = tok["symbol"], tok.get("currency", "USD"), tok["decimals"]
    rate = APPROX_RATE_TO_USD.get(cur, 1.0)  # tokens / USD
    qty = (TARGET_USDC * 1.2) / max(rate, 1e-6)
    raw = int(qty * (10 ** dec))
    floor = int(tok.get("min_trade_amount_raw", "0"))
    return str(max(raw, floor + 1))

quotes_req = [
    {"from_token": addr, "to_token": USDC, "from_amount": from_amount_raw(t),
     "owner_address": DUMMY, "recipient": DUMMY, "expiration": exp,
     "gas_mode": "receive_less"}
    for addr, t in candidates.items()
]

# Chunk into 50/req per the docs.
results: list[tuple[dict, dict]] = []
for i in range(0, len(quotes_req), 50):
    chunk = quotes_req[i:i+50]
    print(f"Batch {i//50 + 1}: {len(chunk)} quotes -> /swap/quote/batch ...")
    try:
        resp = http_json(f"{BASE}/swap/quote/batch", {"quotes": chunk}, timeout=60)
    except urllib.error.HTTPError as e:
        print("  HTTP error:", e.code, e.read()[:500].decode(errors="replace"))
        continue
    for q, item in zip(chunk, resp.get("items", [])):
        results.append((q, item))

# Render
ok, rejected = [], []
for q, item in results:
    tok = candidates[q["from_token"].lower()]
    if item.get("ok") and item.get("quote"):
        rp = item["quote"]["route_params"]
        max_in = int(rp["maxInputAmount"])
        min_out = int(rp["minOutputAmount"])
        if min_out == 0:
            rejected.append((tok, "informational_only (minOut=0)"))
            continue
        in_dec = max_in / (10 ** tok["decimals"])
        out_dec = min_out / (10 ** 6)
        rate = (out_dec / in_dec) if in_dec else 0
        ok.append((tok, in_dec, out_dec, rate))
    else:
        err = (item or {}).get("error") or {}
        rejected.append((tok, err.get("rejectionCategory") or err.get("message") or "?"))

ok.sort(key=lambda r: -r[2])
print()
print(f"=== {len(ok)} tokens CAN currently quote into >= {TARGET_USDC} USDC ===")
print(f"{'SYMBOL':10} {'INPUT':>16} {'OUTPUT_USDC':>14} {'RATE':>10}  ADDRESS")
for tok, inp, outp, rate in ok:
    enough = "*" if outp >= TARGET_USDC else " "
    print(f"{tok['symbol']:10} {inp:>16.4f} {outp:>14.4f} {rate:>10.6f} {enough} {tok['address']}")
print()
print(f"=== {len(rejected)} tokens rejected (no_liquidity / floor / other) ===")
by_reason: dict[str, list[str]] = {}
for tok, why in rejected:
    by_reason.setdefault(str(why), []).append(tok["symbol"])
for why, syms in sorted(by_reason.items(), key=lambda kv: -len(kv[1])):
    print(f"  {why} ({len(syms)}): {', '.join(sorted(syms))}")
