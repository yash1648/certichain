import json
import requests
import sys
import time
import uuid
import io
import zipfile

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

    # Ensure the issuer has an active signing key configured
    log("Ensuring issuer has active signing key...")
    key_res = requests.post(f"{BASE_URL}/api/issuer/keys", headers=issuer_headers)
    if key_res.status_code == 201:
        log(f"Created active signing key for issuer: {key_res.json().get('keyId')}")
    else:
        log("Issuer signing key already present or verified.")

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

    # 12. Enterprise Batch Verification End-to-End
    log("=== 12. Testing Enterprise Batch Credential Verification ===")
    # 12a. Issue a second fresh valid credential for the batch
    log("Issuer issuing a second fresh credential for batch testing...")
    issue2_res = requests.post(f"{BASE_URL}/api/issuer/credentials", headers=issuer_headers, json={
        "subjectId": new_user_id,
        "type": "DIPLOMA",
        "title": "Graduate Certificate in Applied Cryptography",
        "claims": {
            "track": "Applied Cryptography",
            "gpa": "3.99",
            "completionYear": 2026
        }
    })
    assert_true(issue2_res.status_code in [200, 201], "Issued second credential for batch")
    cred2_id = issue2_res.json()["id"]

    dl2_res = requests.get(f"{BASE_URL}/api/holder/credentials/{cred2_id}/download", headers=new_holder_headers)
    assert_true(dl2_res.status_code == 200, "Downloaded second credential")
    valid_cred2_bytes = dl2_res.content

    # Prepare batch components:
    # 1. valid credential (cred2)
    # 2. tampered credential (cred2 with altered claims)
    # 3. revoked credential (cred from step 10)
    # 4. malformed JSON file
    tampered_cred2 = json.loads(valid_cred2_bytes.decode("utf-8"))
    tampered_cred2["credential"]["claims"]["gpa"] = "4.00"
    tampered_cred2_bytes = json.dumps(tampered_cred2).encode("utf-8")

    revoked_cred_bytes = cred_bytes  # from step 10, already revoked
    malformed_bytes = b'{"credential": { incomplete: true, missing_closing_bracket'

    # Build ZIP archive in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("credentials/01-valid.json", valid_cred2_bytes)
        zf.writestr("credentials/02-tampered.json", tampered_cred2_bytes)
        zf.writestr("credentials/03-revoked.json", revoked_cred_bytes)
        zf.writestr("credentials/04-malformed.json", malformed_bytes)
    zip_bytes = zip_buffer.getvalue()

    log(f"Created batch ZIP archive with 4 test files ({len(zip_bytes)} bytes)")

    # 12b. Upload and process ZIP batch via public verifier endpoint
    log("Uploading ZIP to POST /api/verifier/verify/batch...")
    batch_res = requests.post(
        f"{BASE_URL}/api/verifier/verify/batch",
        files={"file": ("credentials_batch.zip", zip_bytes, "application/zip")}
    )
    assert_true(batch_res.status_code == 200, f"Batch verification succeeded: {batch_res.status_code}")
    batch_data = batch_res.json()

    log(f"Batch verification response: total={batch_data.get('total')}, valid={batch_data.get('valid')}, "
        f"tampered={batch_data.get('tampered')}, revoked={batch_data.get('revoked')}, failed={batch_data.get('failed')}")

    assert_true(batch_data.get("total") == 4, "Total batch count is 4")
    assert_true(batch_data.get("processed") == 4, "Processed batch count is 4")
    assert_true(batch_data.get("valid") == 1, "Exactly 1 valid credential in batch")
    assert_true(batch_data.get("tampered") == 1, "Exactly 1 tampered credential in batch")
    assert_true(batch_data.get("revoked") == 1, "Exactly 1 revoked credential in batch")
    assert_true(batch_data.get("failed") == 1, "Exactly 1 failed/malformed credential in batch")

    # Inspect individual results and checks
    results_map = {r["fileName"]: r for r in batch_data.get("results", [])}
    assert_true("credentials/01-valid.json" in results_map, "Valid item in results")
    assert_true("credentials/02-tampered.json" in results_map, "Tampered item in results")
    assert_true("credentials/03-revoked.json" in results_map, "Revoked item in results")
    assert_true("credentials/04-malformed.json" in results_map, "Malformed item in results")

    valid_item = results_map["credentials/01-valid.json"]
    assert_true(valid_item["status"] == "VALID", "Valid item status is VALID")
    assert_true(valid_item["checks"]["envelopeStructure"] is True, "Valid item envelopeStructure passed")
    assert_true(valid_item["checks"]["schemaConformance"] is True, "Valid item schemaConformance passed")
    assert_true(valid_item["checks"]["issuerSignature"] is True, "Valid item signature passed")
    assert_true(valid_item["checks"]["revocationStatus"] is True, "Valid item revocation passed")

    tampered_item = results_map["credentials/02-tampered.json"]
    assert_true(tampered_item["status"] == "TAMPERED", "Tampered item status is TAMPERED")

    revoked_item = results_map["credentials/03-revoked.json"]
    assert_true(revoked_item["status"] == "REVOKED", "Revoked item status is REVOKED")
    assert_true(revoked_item["checks"]["revocationStatus"] is False, "Revoked item revocation check failed")

    malformed_item = results_map["credentials/04-malformed.json"]
    assert_true(malformed_item["status"] == "FAILED", "Malformed item status is FAILED")
    assert_true(malformed_item["checks"]["envelopeStructure"] is False, "Malformed item envelopeStructure failed")

    # 12c. Test CSV Report Generation
    log("Requesting CSV report from POST /api/verifier/verify/batch/csv...")
    csv_res = requests.post(f"{BASE_URL}/api/verifier/verify/batch/csv", json=batch_data)
    assert_true(csv_res.status_code == 200, "CSV report export succeeded")
    csv_text = csv_res.text
    log(f"CSV report preview:\n{csv_text[:200]}...")
    assert_true(csv_text.startswith("credential_id,file_name,holder,issuer,status"), "CSV header is present and valid")
    assert_true("credentials/01-valid.json" in csv_text, "Valid file present in CSV")
    assert_true("VALID" in csv_text, "VALID status present in CSV")
    assert_true("TAMPERED" in csv_text, "TAMPERED status present in CSV")
    assert_true("REVOKED" in csv_text, "REVOKED status present in CSV")
    assert_true("FAILED" in csv_text, "FAILED status present in CSV")

    # 12d. Test Multi-file upload (files[] form data)
    log("Testing multi-file upload (files[] list)...")
    multi_res = requests.post(
        f"{BASE_URL}/api/verifier/verify/batch",
        files=[
            ("files", ("f1.json", valid_cred2_bytes, "application/json")),
            ("files", ("f2.json", tampered_cred2_bytes, "application/json")),
        ]
    )
    assert_true(multi_res.status_code == 200, "Multi-file batch verification succeeded")
    multi_data = multi_res.json()
    assert_true(multi_data["total"] == 2, "Multi-file total is 2")
    assert_true(multi_data["valid"] == 1 and multi_data["tampered"] == 1, "Multi-file counts match")

    # 12e. Security: Zip Slip Path Traversal Protection
    log("Testing Security: Zip Slip path traversal attempt...")
    slip_buffer = io.BytesIO()
    with zipfile.ZipFile(slip_buffer, "w") as zf:
        zf.writestr("../../etc/evil.json", valid_cred2_bytes)
    slip_res = requests.post(
        f"{BASE_URL}/api/verifier/verify/batch",
        files={"file": ("slip.zip", slip_buffer.getvalue(), "application/zip")}
    )
    assert_true(slip_res.status_code in [400, 403, 500], "Zip Slip exploit safely rejected")
    log("Zip Slip exploit safely blocked.")

    # 12f. Security: Unsupported File Type Rejection
    log("Testing Security: Unsupported file type rejection...")
    unsupported_res = requests.post(
        f"{BASE_URL}/api/verifier/verify/batch",
        files=[("files", ("bad.exe", b"\x4d\x5a\x90", "application/octet-stream"))]
    )
    assert_true(unsupported_res.status_code == 400, "Unsupported file rejected with 400 Bad Request")
    log("Unsupported file type safely rejected.")

    # 12g. Security: Empty batch rejection
    log("Testing Security: Empty batch rejection...")
    empty_multipart_res = requests.post(
        f"{BASE_URL}/api/verifier/verify/batch",
        files=[("files", ("", b"", "application/json"))]
    )
    assert_true(empty_multipart_res.status_code == 400, "Empty batch rejected with 400 Bad Request")

    empty_res = requests.post(f"{BASE_URL}/api/verifier/verify/batch")
    assert_true(empty_res.status_code in [400, 415], "Missing multipart body rejected with 4xx client error")
    log("Empty and invalid batch requests safely rejected.")

    log("=== ALL END-TO-END TESTS PASSED SUCCESSFULLY ===", "SUCCESS")

if __name__ == "__main__":
    run_tests()
