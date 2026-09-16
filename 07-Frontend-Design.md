# SSD-CVE — Section 7: Frontend Design (React)

Ground-truth documentation of the current CertiChain frontend and its exact
backend contract. Every endpoint, request, response, and error shape below is
verified against the running Spring Boot backend. Use this as the source of
truth when rebuilding or redesigning the frontend.

---

## 1. Tech Stack

| Concern | Technology |
|---------|-----------|
| Build | Vite 8 (`vite.config.js`, port 5173) |
| Framework | React 19 (function components + hooks only) |
| HTTP | Native `fetch` (no Axios) |
| Routing | None — single-page tab state in `App.jsx` |
| State | React Context (`AuthContext`) + local component state |
| Forms | Plain controlled inputs (no form library) |
| Validation | Backend-side (Jakarta Validation); minimal client checks |
| Styling | Plain CSS with CSS variables (dark theme, no Tailwind) |
| Icons | lucide-react |
| QR | Not implemented (planned: client-side QR of `credentialNumber`) |
| File handling | Native File API + FormData |

## 2. File Structure

```
frontend/
├── index.html
├── vite.config.js            # dev proxy: /api, /swagger-ui, /v3/api-docs → :6969
├── Dockerfile                # node build → nginx static + proxy
├── nginx.conf                # prod: serves dist/, proxies /api to backend
└── src/
    ├── main.jsx
    ├── App.jsx               # single-page shell: header, tab switcher, footer
    ├── App.css / index.css   # plain CSS, dark theme via CSS variables
    ├── context/
    │   └── AuthContext.jsx   # session state, auto-refresh, backend health poll
    ├── services/             # fetch-based API layer, relative /api paths
    │   ├── authService.js    #   /api/auth/**
    │   ├── issuerService.js  #   /api/issuer/**
    │   ├── holderService.js  #   /api/holder/**
    │   ├── verifierService.js#   /api/verifier/**
    │   └── adminService.js   #   /api/admin/**
    └── components/
        ├── Header.jsx        # nav + "Verify Credential" (guest-accessible)
        ├── AuthCard.jsx      # login / register card
        ├── StatusAlert.jsx   # toast for last action status
        ├── UserSessionDashboard.jsx   # session & token info
        ├── issuer/
        │   ├── IssuerStudio.jsx           # issue form, credential list, revoke
        │   ├── CredentialDetailModal.jsx
        │   └── RevokeModal.jsx
        ├── holder/
        │   ├── HolderWalletView.jsx       # wallet list, add, download
        │   └── RemoveWalletModal.jsx
        ├── verifier/
        │   ├── PublicVerifierView.jsx     # upload → result card
        │   └── VerificationHistoryView.jsx
        └── admin/
            └── AdminConsoleView.jsx       # issuer approvals, user directory, audits
```

## 3. Navigation Model

Single-page, tab-based — **no React Router**. `App.jsx` holds one `currentTab`
state; the switcher bar renders role-gated tabs and `MainContent` renders the
active view.

```
Guest:   hero banner + AuthCard        | "Verify Credential" from header (public)
ADMIN:   Admin Console | Issuer Studio | My Wallet | Verify File | Audit History | Session & Tokens
ISSUER:  Issuer Studio | Verify File | Audit History | Session & Tokens
HOLDER:  My Wallet | Verify File | Audit History | Session & Tokens
```

Role gating is UI-only (tab visibility); the backend is authoritative via
`SecurityConfig`:

| Path | Roles |
|---|---|
| `/api/auth/**` | public |
| `POST /api/verifier/verify` | public |
| `GET /api/verifier/anchor/**` | public |
| `/api/issuer/**` | ISSUER, ADMIN |
| `/api/holder/**` | HOLDER, ADMIN |
| `GET /api/verifier/history` | any authenticated |
| `/api/admin/**` | ADMIN |

A `VERIFIER` role exists in the enum but is never assigned or enforced —
verification is public by design.

## 4. Auth Flow

- **Access token:** returned in the login body, cached in `localStorage`
  (`certichain_auth`), auto-refreshed ~1 min before expiry via the refresh
  cookie
- **Refresh token:** HttpOnly cookie (never readable by JS), rotated on refresh
- **Backend health:** polled every 10 s via `GET /v3/api-docs`; UI shows
  online/offline state
- **Session hydration on load:** cached token if unexpired → else silent
  refresh via cookie → else guest

```
Login → POST /api/auth/login → accessToken (body) + refresh cookie
  → cached in localStorage, auto-refresh timer scheduled
  → on refresh 401/400/403 → clear local state → guest
Logout → POST /api/auth/logout → revoke cookie → clear local state
```

## 5. API Contract (complete)

Base URL: `/api` (relative — Vite dev proxy → `http://localhost:6969`, nginx
prod proxy → `backend` container). Authenticated endpoints use
`Authorization: Bearer <accessToken>`.

### 5.1 Auth

**`POST /api/auth/register`** — public
```json
// request
{ "email": "a@b.c", "password": "Passw0rd!123", "fullName": "Jane" }
// 201 response — UserResponse
{ "id": "uuid", "email": "a@b.c", "fullName": "Jane", "role": "HOLDER" }
```
Validation: email valid, password 8–72 chars, fullName ≤255.

**`POST /api/auth/login`** — public
```json
// request
{ "email": "a@b.c", "password": "Passw0rd!123" }
// 200 response — AuthResponse (also sets HttpOnly refresh cookie)
{
  "accessToken": "eyJ...", "tokenType": "Bearer",
  "expiresInSeconds": 3600,
  "userId": "uuid", "email": "a@b.c", "fullName": "Jane", "role": "HOLDER"
}
```
Bad credentials → 401 `{"error": "..."}`.

**`POST /api/auth/refresh`** — public (uses refresh cookie)
Same `AuthResponse` shape as login; rotates the refresh token.

**`POST /api/auth/logout`** — public
204 on success; revokes the refresh cookie.

### 5.2 Issuer — `/api/issuer/**` (ISSUER, ADMIN)

**`POST /api/issuer/register`**
```json
// request
{ "name": "Demo University", "domain": "demo.edu" }
// 201 response — IssuerResponse
{ "id": "uuid", "name": "Demo University", "domain": "demo.edu",
  "verified": false, "createdAt": "2026-09-16T23:45:51Z" }
```
Domain must be a valid hostname. One issuer per user (400 if already
registered).

**`POST /api/issuer/keys`** — creates an Ed25519 signing key
```json
// 201 response — IssuerKeyResponse
{ "keyId": "issuer-key-2026-...", "publicKey": "MCowBQYDK2VwAyEA...",
  "algorithm": "Ed25519", "active": true,
  "createdAt": "...", "revokedAt": null }
```
403 `{"error":"Issuer is not verified"}` if the issuer awaits admin approval.

**`POST /api/issuer/credentials`** — issue (anchors on-chain)
```json
// request
{ "subjectId": "uuid", "type": "Degree", "title": "B.Sc. Computer Science",
  "claims": { "program": "CS", "gpa": "9.2" } }
// 201 response — CredentialResponse (see 5.6)
```

**`GET /api/issuer/credentials`** → `[CredentialResponse]` (newest first)

**`GET /api/issuer/credentials/{id}`** → `CredentialResponse` (404 if not
owned by this issuer)

**`POST /api/issuer/credentials/{id}/revoke`**
```json
// request (optional body)
{ "reason": "Academic misconduct" }
// 200 response — RevokeResponse
{ "credentialId": "uuid", "credentialNumber": "SSD-CVE-...",
  "status": "REVOKED", "revokedAt": "...", "reason": "..." }
```

**`GET /api/issuer/verifications`** → `[VerificationRecordResponse]`
```json
{ "credentialNumber": "SSD-CVE-...", "status": "ACTIVE",
  "reason": null, "revokedAt": null, "issuedAt": "...", "expiresAt": null }
```

### 5.3 Holder — `/api/holder/**` (HOLDER, ADMIN)

**`GET /api/holder/wallet`** → `[WalletCredentialResponse]` (see 5.7)

**`POST /api/holder/wallet/{credentialId}`** → `WalletCredentialResponse`
(201; idempotent — an existing wallet entry is returned as-is, no error)

**`DELETE /api/holder/wallet/{credentialId}`** → 204

**`GET /api/holder/credentials/{id}/download`** → the signed credential
envelope as a JSON file attachment (`Content-Disposition: attachment;
filename="SSD-CVE-....json"`). This file is what you feed the verifier.

### 5.4 Verifier — `/api/verifier/**`

**`POST /api/verifier/verify`** — public, multipart
```
form-data: credentialFile=<the downloaded envelope .json>
→ 200 VerificationResult (see 5.8)
```
413 `{"error":"Upload exceeds the 2MB limit"}` if the file is too large.

**`GET /api/verifier/anchor/{credentialNumber}`** — public
```json
// 200 — AnchorLookupResponse
{ "credentialNumber": "SSD-CVE-...", "contentHash": "4d85ea64...",
  "txHash": "0x4891a5de...", "blockNumber": 1, "chainId": 31337,
  "anchorVerified": true }
```
404 if the credential or its anchor does not exist.

**`GET /api/verifier/history`** — any authenticated
```json
// [VerificationHistoryResponse]
{ "id": "uuid", "credentialId": "uuid", "credentialNumber": "SSD-CVE-...",
  "result": "VALID", "reason": "...", "verifiedAt": "..." }
```

### 5.5 Admin — `/api/admin/**` (ADMIN)

**`GET /api/admin/issuers`** → `[AdminIssuerResponse]`
```json
{ "id": "uuid", "userId": "uuid", "name": "Demo University",
  "domain": "demo.edu", "verified": false, "createdAt": "...", "updatedAt": "..." }
```

**`POST /api/admin/issuers/{id}/verify`** → `AdminIssuerResponse` (verified: true)

**`GET /api/admin/users`** → `[AdminUserResponse]`
```json
{ "id": "uuid", "email": "a@b.c", "fullName": "Jane", "role": "HOLDER",
  "createdAt": "...", "updatedAt": "..." }
```

**`GET /api/admin/verifications`** → `[AdminVerificationResponse]`
```json
{ "id": "uuid", "credentialId": "uuid", "credentialNumber": "SSD-CVE-...",
  "verifierId": "uuid", "result": "VALID", "reason": "...", "verifiedAt": "..." }
```

### 5.6 CredentialResponse (shared)

```json
{
  "id": "8d380b1b-...",
  "credentialNumber": "SSD-CVE-2026-FB6370",
  "type": "Degree",
  "title": "B.Sc. Computer Science",
  "contentHash": "4d85ea640ca41bde9e59d883fca93a8f4b2d552fcacd634be5a64ae54221519c",
  "ipfsCid": "QmPe9XCM1iVsDqdGsE56yNwGTPNjFtsyymUHL26LXHN64s",
  "txHash": "0x4891a5deba6634385887b3123868b927c47d8851a2d08e6ea9944471b7cd47c8",
  "blockNumber": 1,
  "chainId": 31337,
  "signature": "WH75K4UZaJJe3wXGDgHp/IU2f8pUfiRC2U0Q+cTdfOQ4ZNePx2EBXZCbHauPeVX5g07LXyS2/HJPTBigl6gNCw==",
  "signatureAlgorithm": "Ed25519",
  "keyId": "issuer-key-2026-8823b4b9-...",
  "issuedAt": "2026-09-16T18:16:03Z",
  "expiresAt": null,
  "status": "ACTIVE"
}
```
`status` enum: `ACTIVE | REVOKED`. `txHash`/`blockNumber`/`chainId` are the
on-chain anchor (null only for legacy credentials issued before anchoring).

### 5.7 WalletCredentialResponse

```json
{
  "credentialId": "8d380b1b-...",
  "credentialNumber": "SSD-CVE-2026-FB6370",
  "type": "Degree",
  "title": "B.Sc. Computer Science",
  "issuerId": "d29c8536-...",
  "issuerName": "Demo University",
  "issuerDomain": "demo.edu",
  "txHash": "0x4891a5de...",
  "blockNumber": 1,
  "chainId": 31337,
  "issuedAt": "2026-09-16T18:16:03Z",
  "expiresAt": null,
  "status": "ACTIVE"
}
```

### 5.8 VerificationResult

```json
{
  "valid": true,
  "status": "VALID",
  "credentialNumber": "SSD-CVE-2026-FB6370",
  "reason": "Credential verified successfully",
  "issuerId": "d29c8536-...",
  "issuerName": "Demo University",
  "issuerDomain": "demo.edu",
  "issuerVerified": true,
  "claims": { "program": "CS", "gpa": "9.2" },
  "issuedAt": "2026-09-16T18:16:03Z",
  "expiresAt": null,
  "verifiedAt": "2026-09-16T18:16:25Z",
  "anchorTxHash": "0x4891a5deba6634385887b3123868b927c47d8851a2d08e6ea9944471b7cd47c8",
  "anchorBlockNumber": 1,
  "anchorChainId": 31337,
  "anchorVerified": true
}
```
`status` enum: `VALID | TAMPERED | REVOKED | EXPIRED | NOT_FOUND | UNAVAILABLE`.
`anchorVerified` is best-effort (false if the chain node is unreachable —
anchor info still comes from the DB).

## 6. Error Handling

All errors are JSON. The frontend must surface the message, never swallow it.

| Status | Body | Trigger |
|---|---|---|
| 400 | `{"error": "<message>"}` | bad request (IllegalArgumentException) |
| 400 | Spring validation body with `errors` | field validation failures |
| 401 | `{"error": "Unauthorized"}` | missing/invalid token |
| 401 | `{"error": "<message>"}` | bad credentials |
| 403 | `{"error": "Forbidden"}` | role not allowed |
| 403 | `{"error": "<message>"}` | business rule (e.g. "Issuer is not verified") |
| 404 | `{"error": "<message>"}` | not found |
| 413 | `{"error": "Upload exceeds the 2MB limit"}` | file too large |
| 429 | `{"error": "Too many requests"}` | rate limited |

## 7. Rate Limits (per IP, fixed window)

| Endpoint | Limit |
|---|---|
| login / register | 10 per 15 min |
| refresh | 30 per 15 min |
| verify | 60 per 15 min |

On 429 the UI should show a friendly "too many attempts, try again later"
message — do not retry automatically.

## 8. Views (current behavior)

### Issuer Studio (`IssuerStudio.jsx`)
- Issue form: recipient `subjectId` (raw UUID input), type, title, claims
  (key/value pairs)
- Credential list with detail modal (content hash, IPFS CID, signature,
  **anchor: tx hash, block number, chain id**)
- Revoke with reason

### Holder Wallet (`HolderWalletView.jsx`)
- Wallet list: credential number, type, issuer, status, **anchor**
- Add credential by ID, download the signed envelope, remove from wallet

### Public Verifier (`PublicVerifierView.jsx`)
- File upload → `POST /api/verifier/verify` → result card
- Result card shows the three-check story (hash, signature, registry) plus
  status/expiry — and the **on-chain anchor**

### Audit History (`VerificationHistoryView.jsx`)
- `GET /api/verifier/history` — past verification attempts with outcome

### Admin Console (`AdminConsoleView.jsx`)
- Issuer verification approvals, user directory, global verification audits

## 9. Deployment

- **Dev:** `npm run dev` (Vite :5173) — proxy forwards `/api`, `/swagger-ui`,
  `/v3/api-docs` to `http://localhost:6969`
- **Prod:** `docker compose up --build` — frontend Dockerfile builds `dist/`
  into nginx; nginx serves static files and proxies the same three paths to
  the `backend` container