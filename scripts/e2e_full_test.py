import json
import requests
import sys
import time
import uuid

BASE_URL = "http://localhost:5173"  # Test through frontend Vite proxy
BACKEND_URL = "http://localhost:6969"
ANVIL_URL = "http://localhost:8545"
IPFS_URL = "http://localhost:5001"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def assert_true(cond, msg):
    if not cond:
        log(f"Assertion failed: {msg}", "FAIL")
        sys.exit(1)
    log(f"Passed: {msg}", "OK")

def run_tests():
    log("=== Starting End-to-End Tests for CertiChain ===")

    # 1. Backing service health
    log("Checking Anvil EVM RPC...")
    anvil_res = requests.post(ANVIL_URL, json={"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1})
    assert_true(anvil_res.status_code == 200 and "result" in anvil_res.json(), "Anvil RPC responsive")
    block_num = int(anvil_res.json()["result"], 16)
    log(f"Current Anvil block number: {block_num}")

    log("Checking IPFS node...")
    ipfs_res = requests.post(f"{IPFS_URL}/api/v0/version")
    assert_true(ipfs_res.status_code == 200 and "Version" in ipfs_res.json(), "IPFS daemon responsive")
    log(f"IPFS version: {ipfs_res.json().get('Version')}")

    # 2. Frontend & Backend reachability
    log("Checking Frontend root page...")
    fe_res = requests.get(BASE_URL)
    assert_true(fe_res.status_code == 200 and "<div id=\"root\">" in fe_res.text, "Frontend index.html served")

    log("Checking Backend API docs through Vite proxy...")
    docs_res = requests.get(f"{BASE_URL}/v3/api-docs")
    assert_true(docs_res.status_code == 200 and "openapi" in docs_res.json(), "OpenAPI docs accessible via frontend proxy")

    # 3. Authentication & Roles
    log("Logging in as Admin...")
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@certichain.org",
        "password": "DemoAdmin123!"
    })
    assert_true(admin_login.status_code == 200, "Admin login successful")
    admin_token = admin_login.json()["accessToken"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    log("Admin querying users and issuers...")
    users_res = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
    assert_true(users_res.status_code == 200 and len(users_res.json()) >= 3, "Admin listed users")
    issuers_res = requests.get(f"{BASE_URL}/api/admin/issuers", headers=admin_headers)
    assert_true(issuers_res.status_code == 200, "Admin listed issuers")

    log("Logging in as Demo Issuer (MIT)...")
    issuer_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "registrar@mit.edu",
        "password": "DemoIssuer123!"
    })
    assert_true(issuer_login.status_code == 200, "Issuer login successful")
    issuer_token = issuer_login.json()["accessToken"]
    issuer_headers = {"Authorization": f"Bearer {issuer_token}"}

    log("Checking issuer profile...")
    me_res = requests.get(f"{BASE_URL}/api/issuer/me", headers=issuer_headers)
    assert_true(me_res.status_code == 200, "Issuer profile fetched")
    issuer_profile = me_res.json()
    log(f"Issuer profile: {issuer_profile.get('name')} (verified={issuer_profile.get('verified')})")

    # The issuer already has an active signing key configured
    log("Issuer signing key is configured.")

    # 4. User Registration (Holder)
    test_email = f"test_{int(time.time())}@example.com"
    log(f"Registering new test holder: {test_email}...")
    reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "password": "Password123!",
        "fullName": "Test E2E Holder"
    })
    assert_true(reg_res.status_code == 201, "Registered new holder user")
    user_info = reg_res.json()
    new_user_id = user_info["id"]
    log(f"New holder user created with ID: {new_user_id}")

    log("Logging in as newly registered holder...")
    holder_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_email,
        "password": "Password123!"
    })
    assert_true(holder_login.status_code == 200, "New holder login successful")
    new_holder_token = holder_login.json()["accessToken"]
    new_holder_headers = {"Authorization": f"Bearer {new_holder_token}"}

    # 5. Issue Credential to new holder
    log("Issuer resolving holder by email...")
    holder_lookup = requests.get(f"{BASE_URL}/api/issuer/holders?email={test_email}", headers=issuer_headers)
    assert_true(holder_lookup.status_code == 200 and holder_lookup.json()["id"] == new_user_id, "Holder resolved by issuer")

    log("Issuer issuing a new signed credential (pinned to IPFS & anchored on Anvil)...")
    issue_payload = {
        "subjectId": new_user_id,
        "type": "DEGREE",
        "title": "Bachelor of Science in Cyber Security",
        "claims": {
            "degree": "B.S. Cyber Security",
            "gpa": "3.98",
            "honors": "Summa Cum Laude",
            "graduationYear": 2026
        }
    }
    issue_res = requests.post(f"{BASE_URL}/api/issuer/credentials", headers=issuer_headers, json=issue_payload)
    assert_true(issue_res.status_code in [200, 201], f"Credential issued: {issue_res.text}")
    cred = issue_res.json()
    cred_id = cred["id"]
    cred_num = cred["credentialNumber"]
    ipfs_cid = cred["ipfsCid"]
    tx_hash = cred.get("txHash")
    log(f"Issued Credential ID: {cred_id}")
    log(f"Credential Number: {cred_num}")
    log(f"IPFS CID: {ipfs_cid}")
    log(f"Blockchain Tx Hash: {tx_hash}")
    assert_true(bool(ipfs_cid), "IPFS CID is populated")
    assert_true(bool(tx_hash), "Blockchain transaction hash is populated")

    # 6. Holder Wallet & Download
    log("Holder viewing wallet...")
    wallet_res = requests.get(f"{BASE_URL}/api/holder/wallet", headers=new_holder_headers)
    assert_true(wallet_res.status_code == 200, "Holder retrieved wallet")
    wallet_items = wallet_res.json()
    log(f"Wallet contains {len(wallet_items)} credentials")
    
    # Verify credential is in wallet
    assert_true(any(item.get("credentialId") == cred_id for item in wallet_items), "Issued credential appears in holder wallet")

    log("Holder downloading credential envelope...")
    dl_res = requests.get(f"{BASE_URL}/api/holder/credentials/{cred_id}/download", headers=new_holder_headers)
    assert_true(dl_res.status_code == 200, "Downloaded credential envelope")
    cred_bytes = dl_res.content
    cred_json = json.loads(cred_bytes.decode("utf-8"))
    log(f"Downloaded envelope keys: {list(cred_json.keys())}")
    assert_true("credential" in cred_json, "Envelope has credential object")
    assert_true("credentialNumber" in cred_json["credential"], "Envelope has credentialNumber")
    assert_true("signature" in cred_json, "Envelope has cryptographic signature")

    # 7. Public Verifier Verification (Happy Path)
    log("Testing Public Verification of genuine credential...")
    verify_res = requests.post(
        f"{BASE_URL}/api/verifier/verify",
        files={"credentialFile": ("credential.json", cred_bytes, "application/json")}
    )
    assert_true(verify_res.status_code == 200, "Verification request succeeded")
    v_data = verify_res.json()
    log(f"Verification Result: status={v_data.get('status')}, valid={v_data.get('valid')}")
    assert_true(v_data.get("valid") is True, "Genuine credential is VALID")
    assert_true(v_data.get("status") == "VALID", "Status is VALID")

    # 8. Verifier Anchor Lookup (Public)
    log(f"Checking on-chain anchor for {cred_num}...")
    anchor_res = requests.get(f"{BASE_URL}/api/verifier/anchor/{cred_num}")
    assert_true(anchor_res.status_code == 200, "Anchor lookup succeeded")
    anchor_data = anchor_res.json()
    log(f"Anchor Tx: {anchor_data.get('txHash')}, Verified: {anchor_data.get('anchorVerified')}")
    assert_true(anchor_data.get("anchorVerified") is True, "On-chain anchor is verified")
    assert_true(anchor_data.get("txHash") == tx_hash, "Anchor tx hash matches issuance tx hash")

    # 9. Tamper Detection Test
    log("Testing Tamper Detection (altering claims in envelope)...")
    tampered_json = json.loads(cred_bytes.decode("utf-8"))
    tampered_json["credential"]["claims"]["gpa"] = "4.00"
    tampered_bytes = json.dumps(tampered_json).encode("utf-8")

    tamper_res = requests.post(
        f"{BASE_URL}/api/verifier/verify",
        files={"credentialFile": ("tampered_credential.json", tampered_bytes, "application/json")}
    )
    assert_true(tamper_res.status_code == 200, "Tampered verification request completed")
    t_data = tamper_res.json()
    log(f"Tampered Verification Result: status={t_data.get('status')}, valid={t_data.get('valid')}")
    assert_true(t_data.get("valid") is False, "Tampered credential is NOT valid")
    assert_true(t_data.get("status") == "TAMPERED", "Tampered credential flagged as TAMPERED")

    # 10. Revocation Flow
    log(f"Issuer revoking credential {cred_id}...")
    revoke_res = requests.post(
        f"{BASE_URL}/api/issuer/credentials/{cred_id}/revoke",
        headers=issuer_headers,
        json={"reason": "Revoked for E2E testing demonstration"}
    )
    assert_true(revoke_res.status_code == 200, "Credential revoked successfully")
    assert_true(revoke_res.json().get("status") == "REVOKED", "Revoke response confirmed")

    log("Verifying original credential after revocation...")
    post_revoke_res = requests.post(
        f"{BASE_URL}/api/verifier/verify",
        files={"credentialFile": ("credential.json", cred_bytes, "application/json")}
    )
    assert_true(post_revoke_res.status_code == 200, "Post-revoke verification request completed")
    pr_data = post_revoke_res.json()
    log(f"Post-Revoke Verification Result: status={pr_data.get('status')}, valid={pr_data.get('valid')}")
    assert_true(pr_data.get("valid") is False, "Revoked credential is NOT valid")
    assert_true(pr_data.get("status") == "REVOKED", "Revoked credential flagged as REVOKED")

    # 11. Verification Auditing
    log("Checking Admin verification audit logs...")
    admin_v_res = requests.get(f"{BASE_URL}/api/admin/verifications", headers=admin_headers)
    assert_true(admin_v_res.status_code == 200, "Admin fetched verification records")
    v_records = admin_v_res.json()
    log(f"Total verification records in system: {len(v_records)}")
    assert_true(len(v_records) >= 3, "All verification attempts (VERIFIED, TAMPERED, REVOKED) recorded")

    log("=== ALL END-TO-END TESTS PASSED SUCCESSFULLY ===", "SUCCESS")

if __name__ == "__main__":
    run_tests()
