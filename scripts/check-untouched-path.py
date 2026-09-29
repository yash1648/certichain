#!/usr/bin/env python3
"""
check-untouched-path.py -- the regression check for Global Constraint 3.

Holder-controlled disclosure filters claims on the way to a VERIFIER. The
regression this rules out: a credential with NO disclosure policy must verify
with its full claim set, and the backend must itself report it as fully
disclosed. If the filtering leaked into credentials that never opted in, then
every already-anchored credential in existence would silently start rendering
wrong, and nothing in the unit suite would notice -- the filter tests all
construct a policy first.

This exists because the browser drive for this case never ran: the Reticle
session had no MCP tools and the host rebooted mid-run. The regression lives in
VerificationService.applyDisclosure, not in the browser, so it is checked
against the live API instead.

Usage (needs the backend up, schema at v11, plus PostgreSQL/IPFS/Anvil):

    python3 scripts/check-untouched-path.py

Exits 0 only if every undisclosed credential verifies with a complete claim
set, 1 on any failed check, 2 if the run could not proceed.

Two assertions are deliberately NOT made, and both print a NOTE instead:
  - anchorVerified. Anvil resets to block 0 when Docker bounces, which orphans
    every pre-existing anchor transaction. Asserting it here would be asserting
    on the environment. Re-run against a live chain to check it.
  - valid == true. Revocation is orthogonal to disclosure; a revoked credential
    is legitimately invalid, so REVOKED is asserted to report valid:false.

Credentials are discovered, not hardcoded: it logs in as the holder, then reads
the wallet and the disclosure endpoint of each credential.
"""
import json
import sys
import urllib.request
import urllib.error
import io

BASE = "http://localhost:6969"
HOLDER = ("alex.mercer@alumni.org", "DemoHolder123!")


def req(method, path, *, token=None, body=None, raw=None, ctype=None):
    url = BASE + path
    data, headers = None, {}
    if raw is not None:
        data = raw
        headers["Content-Type"] = ctype
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def jload(b):
    try:
        return json.loads(b)
    except Exception:
        return None


failures, checks = [], []


def check(name, ok, detail=""):
    checks.append((name, ok, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  -- {detail}" if detail else ""))
    if not ok:
        failures.append(name)


# 1. auth
st, b = req("POST", "/api/auth/login", body={"email": HOLDER[0], "password": HOLDER[1]})
if st != 200:
    print(f"FATAL: login failed {st}: {b[:300]!r}")
    sys.exit(2)
tok = (jload(b) or {}).get("accessToken")
if not tok:
    print(f"FATAL: no token in login response: {b[:300]!r}")
    sys.exit(2)
print("holder authenticated\n")

# 2. list credentials
st, b = req("GET", "/api/holder/wallet", token=tok)
if st != 200:
    # NB: do NOT coerce a non-200 body into a list. A Spring 404 error object
    # has 4 keys, so `jload(b) or []` silently becomes "4 credentials" and the
    # whole check reports a confident false pass over nothing.
    print(f"FATAL: wallet listing failed {st}: {b[:300]!r}")
    sys.exit(2)
creds = jload(b)
if not isinstance(creds, list):
    print(f"FATAL: wallet listing is {type(creds).__name__}, not a list: {json.dumps(creds)[:300]}")
    sys.exit(2)
print(f"holder holds {len(creds)} credential(s)")

undisclosed = []
for c in creds:
    cid = c.get("id") or c.get("credentialId")
    if not cid:
        continue
    st, b = req("GET", f"/api/holder/credentials/{cid}/disclosure", token=tok)
    d = jload(b)
    if st == 200 and d is not None:
        hidden = d.get("hiddenClaims") or []
        print(f"  {cid[:8]}  claims={len(d.get('claims') or {})}  hidden={len(hidden)}")
        if not hidden:
            undisclosed.append((cid, d.get("claims") or {}))
    else:
        print(f"  {cid[:8]}  disclosure GET -> {st}")

if not undisclosed:
    print("\nFATAL: no credential without a disclosure policy; cannot test the untouched path")
    sys.exit(2)

print(f"\n{len(undisclosed)} credential(s) with NO policy -- verifying each\n")

for cid, envelope_claims in undisclosed:
    print(f"--- {cid}")

    st, b = req("GET", f"/api/holder/credentials/{cid}/download", token=tok)
    check("raw download returns the envelope", st == 200 and len(b) > 0, f"status={st} bytes={len(b)}")
    if st != 200:
        continue

    env = jload(b)
    if env is None:
        check("downloaded envelope parses as JSON", False, f"first 120 bytes: {b[:120]!r}")
        continue
    check("downloaded envelope parses as JSON", True)

    all_claims = ((env.get("credential") or {}).get("claims")) or {}
    check("envelope carries a claim set", len(all_claims) > 0, f"{len(all_claims)} claim(s)")

    # multipart upload to the verifier
    boundary = "----certchaDrive4Boundary"
    parts = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="credentialFile"; filename="c.json"\r\n'
        f"Content-Type: application/json\r\n\r\n"
    ).encode() + b + f"\r\n--{boundary}--\r\n".encode()
    st, vb = req("POST", "/api/verifier/verify", raw=parts,
                 ctype=f"multipart/form-data; boundary={boundary}")
    check("POST /api/verifier/verify returns 200", st == 200, f"status={st} body={vb[:200]!r}")
    if st != 200:
        continue

    v = jload(vb)
    # Revocation is orthogonal to disclosure: a revoked credential is legitimately
    # invalid, so asserting valid=true on every one of them was my error, not a
    # finding. Only assert validity where the credential is not revoked.
    revoked = v.get("status") == "REVOKED"
    if revoked:
        check("revoked credential verifies as REVOKED (expected, not a defect)",
              v.get("valid") is False, f"status={v.get('status')}")
    else:
        check("result is valid", v.get("valid") is True, f"valid={v.get('valid')} status={v.get('status')}")

    # anchorVerified is REPORTED, not asserted. Anvil is at block 0 -- the chain
    # was reset when Docker bounced -- so every pre-existing credential's anchor
    # transaction is gone and anchorVerified is false for reasons that have
    # nothing to do with disclosure. Asserting here would be asserting on the
    # environment. Re-run against a live chain to check this.
    av = v.get("anchorVerified")
    print(f"  NOTE  anchorVerified={av} (not asserted: Anvil at block 0, chain reset)")

    disc = v.get("disclosure")
    check("backend reports disclosure metadata", isinstance(disc, dict), f"disclosure={disc!r}")
    if isinstance(disc, dict):
        check("backend reports complete:true", disc.get("complete") is True, f"complete={disc.get('complete')}")
        check("disclosed == total", disc.get("disclosed") == disc.get("total"),
              f"disclosed={disc.get('disclosed')} total={disc.get('total')}")
        check("count equals the envelope's claim count",
              disc.get("total") == len(all_claims),
              f"total={disc.get('total')} envelope claims={len(all_claims)}")

    seen = v.get("claims") or {}
    check("verifier claim count equals envelope claim count",
          len(seen) == len(all_claims), f"verifier={len(seen)} envelope={len(all_claims)}")
    missing = sorted(set(all_claims) - set(seen))
    check("no claim is missing from the verifier view", not missing, f"missing={missing}")
    print()

print("=" * 72)
passed = sum(1 for _, ok, _ in checks if ok)
print(f"{passed}/{len(checks)} checks passed")
if failures:
    print("FAILED: " + ", ".join(failures))
    sys.exit(1)
print("DRIVE 4 (API level): the untouched path is unchanged.")
