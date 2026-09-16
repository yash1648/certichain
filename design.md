# CertiChain — Frontend Redesign Specification

Complete build spec for rewriting the CertiChain frontend. Feed this together
with `07-Frontend-Design.md` (the verified backend contract) to an AI coding
agent; it contains everything needed to rebuild the UI without re-exploring
the codebase: design system, view-by-view specs with wireframes, exact data
contracts, component library, UX states, and build instructions.

---

## 1. Product Overview

CertiChain is a verifiable-credential platform: issuers sign digital
credentials with Ed25519, store them on IPFS, and anchor the content hash on
a blockchain (Ethereum-compatible, local Anvil node). Anyone can verify a
credential file without an account; the result proves integrity (hash),
authenticity (signature), registry status, and on-chain anchoring.

**Audience:** hackathon judges + demo users. The UI must make the security
story visible in under a minute: issue → verify → tamper → fail. It must also
be usable by a non-technical person with zero explanation.

**Roles:** `HOLDER`, `ISSUER`, `ADMIN` (ADMIN sees all workspaces). A
`VERIFIER` role exists in the enum but is never assigned or enforced —
verification is public by design.

**Design goals for the rewrite:**
1. **Security as spectacle** — the verification result is the hero moment.
   Show the checks (hash, signature, registry, blockchain anchor) as explicit,
   verifiable steps, not a single "valid" badge.
2. **Zero-friction verification** — the public verifier must work for guests
   with no login, no explanation, no dead ends.
3. **Guided onboarding** — a new user always knows what to do next: empty
   states carry a call-to-action, every form explains itself, every action
   confirms itself.
4. **Role clarity** — each workspace is visually distinct (color-coded tabs).
5. **Honest states** — loading, empty, error, and offline states everywhere;
   backend messages are surfaced, never swallowed.

## 2. Design Principles

1. **Show the proof, not the badge.** Every security claim is a visible,
   verifiable step.
2. **Dark, technical, trustworthy.** Keep the dark cyber aesthetic; refine it
   into a consistent system.
3. **One screen, one job.** Each view has a single primary action.
4. **Never a dead end.** Every empty/error state offers a next step.
5. **Consistency over cleverness.** One button style, one card style, one
   modal pattern — everywhere.

## 3. Design System

### 3.1 Tokens (from `src/index.css` — keep these)

| Token | Value | Usage |
|---|---|---|
| `--bg-dark` | `#070a12` | page background |
| `--bg-card` | `rgba(14,20,36,0.75)` | cards, panels |
| `--bg-input` | `rgba(10,15,28,0.9)` | inputs |
| `--border-subtle` | `rgba(255,255,255,0.08)` | default borders |
| `--cyan-primary` | `#00e5ff` | primary accent, verify |
| `--emerald-primary` | `#10b981` | success, wallet |
| `--amber-primary` | `#f59e0b` | admin, warnings |
| `--rose-primary` | `#f43f5e` | errors, revoke |
| `--purple-primary` | `#8b5cf6` | issuer |
| `--text-primary` | `#f1f5f9` | headings, body |
| `--text-secondary` | `#94a3b8` | secondary text |
| `--text-muted` | `#64748b` | captions, meta |
| `--font-sans` | Inter | body |
| `--font-display` | Outfit | headings |
| `--font-mono` | JetBrains Mono | hashes, CIDs, tx hashes |

**Semantic color mapping:**
- Verify / primary → cyan
- Issuer → purple
- Wallet / success → emerald
- Admin / warning → amber
- Error / revoke → rose

### 3.2 Add these tokens

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 8px | inputs, small elements |
| `--radius-md` | 12px | cards, buttons |
| `--radius-lg` | 16px | modals, panels |
| `--radius-pill` | 9999px | badges, chips |
| `--space-1..8` | 4/8/12/16/24/32/48/64px | spacing scale |
| `--shadow-card` | `0 4px 24px rgba(0,0,0,0.4)` | cards |
| `--shadow-modal` | `0 8px 48px rgba(0,0,0,0.6)` | modals |
| `--focus-ring` | `0 0 0 3px rgba(0,229,255,0.35)` | keyboard focus |

### 3.3 Typography scale

| Role | Font | Size / Weight |
|---|---|---|
| Display (page title) | Outfit | 32px / 700 |
| H1 (section title) | Outfit | 24px / 600 |
| H2 (card title) | Outfit | 18px / 600 |
| Body | Inter | 15px / 400 |
| Body strong | Inter | 15px / 600 |
| Small / meta | Inter | 13px / 400 |
| Caption | Inter | 12px / 400 |
| Mono (hashes, CIDs, tx) | JetBrains Mono | 13px / 400, `break-all` |

### 3.4 Components

**Button** — 3 variants, 2 sizes:
- `primary` (filled accent), `secondary` (outline), `danger` (rose outline/fill)
- `md` (default, 40px), `sm` (32px)
- Disabled state: 50% opacity, no pointer events
- Loading state: inline spinner + disabled

**Card** — `--bg-card`, 1px `--border-subtle`, `--radius-md`, `--shadow-card`,
padding `--space-5` (24px). Optional header row (title + action).

**Input / Select / Textarea** — `--bg-input`, 1px border, `--radius-sm`,
padding 10px 12px, focus ring on focus. Label above (13px, secondary), helper
text below (12px, muted), error text below (12px, rose).

**Table** — header row muted uppercase 12px, row hover highlight, mono cells
for hashes, right-aligned numeric cells, empty state row.

**Modal** — centered, `--radius-lg`, `--shadow-modal`, backdrop
`rgba(0,0,0,0.6)`, Escape closes, focus trapped, title + close button,
footer with actions.

**Toast (StatusAlert)** — fixed top-right, auto-dismiss 5s, variants:
success (emerald border), error (rose border), info (cyan border).

**Badge** — pill, 12px, colored dot + text:
- ACTIVE → emerald, REVOKED → rose, VALID → cyan, TAMPERED → rose,
  EXPIRED → amber, NOT_FOUND → muted, UNAVAILABLE → muted,
  verified → emerald, pending → amber

**Status row (verification check)** — icon (✓/✕/⚠) + label + detail, mono
value, colored by outcome. This is the signature component of the app.

## 4. Information Architecture

Single-page app, tab-based workspace (no router today; a router may be added
in the redesign — see §10).

```
Guest
├── Hero + AuthCard (login/register)
└── Public Verifier (from header, no auth)

Authenticated — role-gated tabs:
ADMIN   Admin Console | Issuer Studio | My Wallet | Verify File | Audit History | Session & Tokens
ISSUER  Issuer Studio | Verify File | Audit History | Session & Tokens
HOLDER  My Wallet | Verify File | Audit History | Session & Tokens
```

Tab bar: color-coded active state per workspace (cyan verify, purple issuer,
emerald wallet, amber admin). Header: logo, tab bar, "Verify Credential"
(always visible, even for guests), user chip (name + role) with logout.

## 5. View Specifications

Each view: purpose, wireframe, data contract (exact shapes from the backend),
interactions, and required states. All response shapes are verified against
the live API — build against them exactly.

### 5.1 Public Verifier (hero view) — cyan

**Purpose:** upload a credential file, see the full security verdict. This is
the demo centerpiece and the first thing judges see.

**Flow:** drag-and-drop / file picker → `POST /api/verifier/verify`
(multipart `credentialFile`) → result card.

**Wireframe:**
```
┌────────────────────────────────────────────────────────────┐
│  VERIFY A CREDENTIAL                                       │
│  Drop the credential file here, or click to browse          │
│  [  drag & drop zone  —  .json up to 2MB  ]                │
│                                                            │
│  ┌─ Result ──────────────────────────────────────────────┐ │
│  │  VALID                    SSD-CVE-2026-FB6370         │ │
│  │  ───────────────────────────────────────────────────  │ │
│  │  ✓ Integrity     SHA-256 hash verified                │ │
│  │  ✓ Authenticity  Ed25519 signature verified           │ │
│  │  ✓ Registry      Registered · Demo University (✓)     │ │
│  │  ✓ Blockchain    Anchored · block 1 · chain 31337     │ │
│  │                  0x4891a5de…7cd47c8                   │ │
│  │  ✓ Status        ACTIVE · issued 2026-09-16           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Anchor lookup ───────────────────────────────────────┐ │
│  │  Enter a credential number → [Look up on chain]       │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Data contract — `VerificationResult`:**
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
still show the anchor info from the DB).

**Result card rules:**
- Render each check as a **status row** (icon + label + detail), not a single
  badge. Judges must see the *steps*.
- `valid:true` → cyan header "VALID"; otherwise rose header with the status
  name and `reason` as the explanation.
- Claims rendered as a key/value list (mono values).
- Anchor row: `✓ Anchored on-chain — block {anchorBlockNumber}, chain
  {anchorChainId}` + tx hash in mono. If `anchorVerified:false`, show
  `⚠ Anchored (chain unreachable — showing DB record)`.
- "Verify another" button resets to the drop zone.

**Anchor lookup** — one input + button → `GET
/api/verifier/anchor/{credentialNumber}` (public):
```json
{ "credentialNumber": "SSD-CVE-2026-FB6370", "contentHash": "4d85ea64...",
  "txHash": "0x4891a5de...", "blockNumber": 1, "chainId": 31337,
  "anchorVerified": true }
```
Render as a compact proof card: content hash, tx hash, block, chain, verified
badge. 404 → "No anchor found for this credential number."

**States:** idle (drop zone), uploading (spinner on zone), result, error
(backend message), offline (health banner).

### 5.2 Issuer Studio — purple

**Purpose:** register as issuer, create signing key, issue/revoke credentials.

**Wireframe:**
```
┌─ Issuer status ────────────────────────────────────────────┐
│  Demo University · demo.edu          [✓ Verified]          │
│  Signing key: issuer-key-2026-8823…  [Create key]          │
│  (pending approval → amber "Awaiting admin approval")      │
└────────────────────────────────────────────────────────────┘
┌─ Issue credential ─────────────────────────────────────────┐
│  Recipient subject ID (UUID)  [________________________]   │
│  Type        [Degree ▾]   Title  [____________________]    │
│  Claims      key [________] value [________]  [+ add]     │
│  [ Issue credential ]                                      │
└────────────────────────────────────────────────────────────┘
┌─ Credentials ──────────────────────────────────────────────┐
│  SSD-CVE-2026-FB6370 · Degree · ACTIVE · block 1  [view]   │
│  …                                                         │
└────────────────────────────────────────────────────────────┘
```

**Data contracts:**
- `POST /api/issuer/register` `{name, domain}` → `{id, name, domain,
  verified, createdAt}`. Domain must be a valid hostname; one issuer per user.
- `POST /api/issuer/keys` → `{keyId, publicKey, algorithm: "Ed25519",
  active, createdAt, revokedAt}`. 403 `{"error":"Issuer is not verified"}`
  if pending approval.
- `POST /api/issuer/credentials` `{subjectId, type, title, claims}` →
  `CredentialResponse` (below). `subjectId` is a **raw UUID** — no email
  lookup exists; label the field clearly.
- `GET /api/issuer/credentials` → `[CredentialResponse]`
- `POST /api/issuer/credentials/{id}/revoke` `{reason?}` →
  `{credentialId, credentialNumber, status: "REVOKED", revokedAt, reason}`

**CredentialResponse:**
```json
{ "id": "8d380b1b-...", "credentialNumber": "SSD-CVE-2026-FB6370",
  "type": "Degree", "title": "B.Sc. Computer Science",
  "contentHash": "4d85ea640ca41bde9e59d883fca93a8f4b2d552fcacd634be5a64ae54221519c",
  "ipfsCid": "QmPe9XCM1iVsDqdGsE56yNwGTPNjFtsyymUHL26LXHN64s",
  "txHash": "0x4891a5deba6634385887b3123868b927c47d8851a2d08e6ea9944471b7cd47c8",
  "blockNumber": 1, "chainId": 31337,
  "signature": "WH75K4UZaJJe3wXGDgHp/IU2f8pUfiRC2U0Q+cTdfOQ4ZNePx2EBXZCbHauPeVX5g07LXyS2/HJPTBigl6gNCw==",
  "signatureAlgorithm": "Ed25519", "keyId": "issuer-key-2026-8823b4b9-...",
  "issuedAt": "2026-09-16T18:16:03Z", "expiresAt": null, "status": "ACTIVE" }
```
`status` enum: `ACTIVE | REVOKED`.

**Detail modal:** content hash, IPFS CID, signature (mono, break-all), key id,
anchor (tx hash, block, chain), status, issued/expires; revoke button with
reason input + confirm.

**States:** no issuer yet (register form), pending approval (amber banner,
issue form disabled), verified (full studio), empty credential list (CTA:
"issue your first credential"), revoke confirm.

### 5.3 Holder Wallet — emerald

**Purpose:** store, view, download, remove credentials.

**Wireframe:**
```
┌─ My Wallet ────────────────────────────────────────────────┐
│  [Add credential by ID]  [________________]  [+ Add]       │
│                                                            │
│  ┌─ SSD-CVE-2026-FB6370 ────────────────────────────────┐  │
│  │  Degree · B.Sc. Computer Science                     │  │
│  │  Demo University · demo.edu          [✓ Verified]     │  │
│  │  ACTIVE · anchored block 1 · chain 31337             │  │
│  │  [Download]  [Remove]                                │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Data contracts:**
- `GET /api/holder/wallet` → `[WalletCredentialResponse]`
- `POST /api/holder/wallet/{credentialId}` → `WalletCredentialResponse`
  (idempotent — an existing entry is returned as-is, no error)
- `DELETE /api/holder/wallet/{credentialId}` → 204
- `GET /api/holder/credentials/{id}/download` → signed envelope as a JSON
  attachment (this file feeds the verifier — label the button "Download
  credential file")

**WalletCredentialResponse:**
```json
{ "credentialId": "8d380b1b-...", "credentialNumber": "SSD-CVE-2026-FB6370",
  "type": "Degree", "title": "B.Sc. Computer Science",
  "issuerId": "d29c8536-...", "issuerName": "Demo University",
  "issuerDomain": "demo.edu",
  "txHash": "0x4891a5de...", "blockNumber": 1, "chainId": 31337,
  "issuedAt": "2026-09-16T18:16:03Z", "expiresAt": null, "status": "ACTIVE" }
```

**States:** empty wallet (CTA: "add a credential by its ID — ask your issuer
for the ID"), add error (credential not found), remove confirm modal.

### 5.4 Audit History — amber

**Purpose:** past verification attempts.

**Wireframe:** table — credential number, result badge, reason, verified at.

**Data contract — `GET /api/verifier/history`:**
```json
{ "id": "uuid", "credentialId": "uuid", "credentialNumber": "SSD-CVE-2026-FB6370",
  "result": "VALID", "reason": "Credential verified successfully",
  "verifiedAt": "2026-09-16T18:16:25Z" }
```
Result badge colored by status (§3.4). Empty state: "No verifications yet —
verify a credential to see it here."

### 5.5 Admin Console — amber

**Purpose:** issuer approvals, user directory, global audits.

**Wireframe:** three sections (tabs or stacked cards):
1. **Issuers** — table: name, domain, verified badge, [Approve] button on
   pending rows → `POST /api/admin/issuers/{id}/verify`
2. **Users** — table: email, full name, role badge
3. **Verifications** — table: credential number, result badge, verifier,
   reason, time

**Data contracts:**
- `GET /api/admin/issuers` → `[{id, userId, name, domain, verified,
  createdAt, updatedAt}]`
- `POST /api/admin/issuers/{id}/verify` → same shape, `verified:true`
- `GET /api/admin/users` → `[{id, email, fullName, role, createdAt,
  updatedAt}]`
- `GET /api/admin/verifications` → `[{id, credentialId, credentialNumber,
  verifierId, result, reason, verifiedAt}]`

**States:** empty issuer queue ("no pending approvals"), approve confirm.

### 5.6 Session & Tokens — cyan

**Purpose:** show the auth state — user info, role, token expiry, backend
health, refresh/logout actions. Backend health is polled every 10 s via
`GET /v3/api-docs`.

**Wireframe:** info card — email, full name, role badge, token expiry
countdown, backend online/offline indicator, [Refresh session] [Log out].

## 6. Component Library

| Component | Spec |
|---|---|
| `Header` | logo, tab bar (color-coded active), "Verify Credential" link (always), user chip + logout |
| `AuthCard` | login/register toggle; login: email+password; register: email+password+full name; inline field errors; submit loading |
| `StatusAlert` | toast, 5s auto-dismiss, success/error/info variants |
| `DropZone` | drag-and-drop + click-to-browse, file name shown, 2MB limit note, upload spinner |
| `ResultCard` | status header + status rows + claims + anchor + "verify another" |
| `StatusRow` | icon + label + detail (mono value), colored by outcome |
| `AnchorLookup` | input + button → proof card (content hash, tx hash, block, chain, verified badge) |
| `IssuerStudio` | status card + issue form (dynamic claims rows) + credential list |
| `CredentialDetailModal` | full credential fields + anchor + revoke |
| `RevokeModal` | reason input + confirm |
| `HolderWalletView` | add-by-ID row + credential cards (download/remove) |
| `RemoveWalletModal` | confirm |
| `VerificationHistoryView` | result table |
| `AdminConsoleView` | issuers/users/verifications tables |
| `UserSessionDashboard` | auth state card |
| `EmptyState` | icon + title + description + CTA button |
| `ErrorState` | icon + backend message + retry |
| `Badge` | pill with colored dot (§3.4) |

## 7. Key User Flows

1. **Onboarding (new user)** — register → HOLDER → wallet empty state →
   "add a credential by its ID" → add → download → verify. Every step has a
   next-step hint.
2. **Issue (demo)** — register issuer → admin approves → create key → issue →
   credential appears with anchor (block 1, tx hash).
3. **Verify (happy)** — download from wallet → upload to verifier → VALID
   with all four checks green.
4. **Verify (tamper)** — edit one character in the file → TAMPERED. *The demo
   moment.*
5. **Anchor lookup** — enter credential number → on-chain proof, no login.
6. **Admin approve** — pending issuer → verify → issuer can now issue.

## 8. UX States & Error Handling

Every data view needs four states: **loading** (skeleton/spinner), **empty**
(clear call-to-action), **error** (backend message surfaced), **offline**
(backend health banner).

Error contract (from the backend — surface the message verbatim):

| Status | Body |
|---|---|
| 400 | `{"error": "<message>"}` or validation `errors` |
| 401 | `{"error": "Unauthorized"}` |
| 403 | `{"error": "<message>"}` (e.g. "Issuer is not verified") |
| 404 | `{"error": "<message>"}` |
| 413 | `{"error": "Upload exceeds the 2MB limit"}` |
| 429 | `{"error": "Too many requests"}` |

Rules:
- Never swallow an error — always show the message with a retry where
  sensible.
- 429 → friendly "too many attempts, try again in a few minutes"; no auto-retry.
- 401 on a background refresh → silently return to guest (do not flash an
  error).
- Offline backend → banner "Backend unreachable — showing cached data" (health
  poll every 10 s via `GET /v3/api-docs`).

## 9. Accessibility & Responsive

- Keyboard-navigable forms and modals; focus management on modal open/close;
  Escape closes modals.
- Color is not the only signal: pair status colors with icons + text.
- Contrast: `--text-secondary` (#94a3b8) on `--bg-dark` (#070a12) passes AA;
  keep it that way.
- Visible focus ring (`--focus-ring`) on all interactive elements.
- Form labels associated with inputs; helper text for UUID fields.
- Responsive: tab bar wraps; cards stack; result card readable on mobile;
  tables scroll horizontally on small screens.
- Mono font for hashes/CIDs/tx hashes with `break-all` to avoid overflow.

## 10. Technical Constraints & Build Instructions

**Stack (keep):** React 19 + Vite 8, function components + hooks, native
`fetch` (no Axios), plain CSS with variables (no Tailwind), lucide-react
icons, no router (tab state in `App.jsx` — a router may be added; if so keep
the public verifier reachable without auth).

**Auth contract (preserve exactly):**
- Access token in `localStorage` (`certichain_auth`), refresh via HttpOnly
  cookie, auto-refresh ~1 min before expiry, backend health poll every 10 s
  via `GET /v3/api-docs`.
- Services in `src/services/`, relative `/api` paths (Vite dev proxy → :6969;
  nginx prod proxy → backend container).

**Build order:**
1. Design tokens + base styles (index.css) + component primitives
   (Button, Card, Input, Badge, Modal, Toast, EmptyState, ErrorState).
2. Auth flow (AuthCard, AuthContext, session dashboard) — keep the contract.
3. Public Verifier (DropZone, ResultCard, StatusRow, AnchorLookup) — the hero.
4. Issuer Studio (status card, issue form, credential list, detail/revoke
   modals).
5. Holder Wallet (add, list, download, remove).
6. Audit History + Admin Console (tables).
7. Header + tab bar + responsive pass + a11y pass.

**Do not:** add heavy dependencies, change the API paths, change the auth
contract, or invent endpoints. Every shape in this spec and in
`07-Frontend-Design.md` is verified against the running backend.

## 11. Redesign Priorities

1. **Verifier result card** — the four-check security story + anchor rows
   (this is what judges see).
2. **Anchor lookup** — public, one input, instant on-chain proof.
3. **Issuer Studio** — clean issue flow + credential detail with anchor.
4. **Wallet** — card-based credential list with anchor + download.
5. **Admin console** — approval queue clarity.
6. **Design system polish** — tokens, spacing scale, consistent buttons/cards.
7. **Onboarding & empty states** — every screen tells the user what to do next.