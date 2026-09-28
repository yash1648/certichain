# Holder-Controlled Disclosure and Open Issuer Claims

**Date:** 2026-09-29
**Status:** Approved design, not yet implemented
**Path:** Architectural

---

## Problem

Two problems, one root cause.

1. **The issuer can only issue a fixed set of claims.** The data model already
   accepts arbitrary content — `CredentialIssueRequest.claims` is a
   `Map<String, Object>` capped at 50 entries, and `CanonicalCredential.claims`
   is likewise an open map that participates in canonicalization. The limit is
   entirely in the frontend: `assembleClaims()` in
   `frontend/src/components/issuer/IssuerStudio.jsx` hardcodes exactly five
   claims (`recipientName`, `major`, `gpa`, `honors`, `department`).

2. **The holder has no authority over disclosure.** A verifier receives the
   entire signed payload, always. The holder cannot withhold anything.

They share a root cause: the signed payload is simultaneously the thing that is
authenticated *and* the only thing a verifier can ever see. There is no layer
between them.

### The constraint that shapes the solution

`VerificationService.verify()` performs, at lines 191-224:

- **CHECK 1** — `sha256(uploaded) == envelope.contentHash`
- **CHECK 2** — `sha256(uploaded) == credential.getContentHash()` (database)

plus signature verification against the issuer key and blockchain anchor
verification. Any byte a holder adds to, or removes from, the uploaded envelope
fails as `TAMPERED`. **This must not be loosened.** Relaxing it would make
every credential forgeable by anyone who can read one.

Therefore the holder's choice can never be expressed by mutating the signed
bytes. It has to be expressed by a separate, server-held policy applied when
the verification result is built.

---

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Who may add content | Issuer only | The issuer is the authority. The holder never signs anything. |
| Who controls disclosure | Holder | One policy per credential, applied to all verifiers. |
| What may be hidden | Free-form claims only | Core fields (title, type, issuer, subject, dates, credential number) always show, or the credential is useless to a verifier. |
| Enforcement | Server-side | Chosen over cryptographic disclosure. |
| Strength of assurance | Presentation-layer | Stated plainly below; never described as cryptographic. |
| Raw credential download | Kept, relabelled honestly | It contains all claims by definition. |

### Why server-side rather than cryptographic

Cryptographic selective disclosure (a Merkle tree over claims, with the anchored
hash as its root) would let a verifier independently prove that a disclosed
subset really is part of the issuer-signed set. It was considered and declined:
it requires a new envelope version and every already-anchored credential stops
verifying until migrated. Server-side enforcement achieves the product goal at a
fraction of the cost and keeps all 8 existing credentials valid.

This is recorded as a named upgrade path, not dismissed. See *Upgrade path*.

---

## Non-goals

Explicitly out of scope, so that it cannot creep in:

- Per-verifier audiences or per-recipient disclosure policies
- Merkle / cryptographic selective disclosure
- Holder-asserted (self-attested) claims
- Editing claims after issuance
- Hiding or redacting core credential fields
- Account provisioning, invitations, or a re-request flow

---

## Data model

### New entity: `CredentialDisclosure`

- `id` — `UUID`, primary key
- `credential_id` — `UUID`, unique, foreign key to `Credential`
- `hidden_claims` — `@ElementCollection Set<String>`, backed by
  `credential_disclosure_claims (disclosure_id, claim_key)`

**Why hidden keys rather than visible keys.** The absence of a row means "hide
nothing", so all 8 already-anchored credentials continue to behave exactly as
they do today, with **zero migration**. Storing the visible set would
silently default every existing credential to "disclose nothing" — a
catastrophic and invisible failure mode.

Storing hidden keys is also stable: claims are immutable once signed, so a
hidden key can never drift out of alignment with reality.

Policy is stored per credential rather than per wallet entry. A holder can hold
a given credential at most once (unique constraint on `(user_id, credential_id)`
in the wallet), and there is no transfer feature, so the two are equivalent —
and per-credential storage makes "one policy per credential" literally true.

### Unchanged

`Credential`, `CredentialAnchor`, the canonicalization service, the signature
scheme, and the blockchain anchoring path are all untouched.

---

## API

### New — holder

```
GET /api/holder/credentials/{id}/disclosure
  -> 200 { claims: { <key>: <value> }, hiddenClaims: [String] }
```

Returns the credential's **full** claim map, not merely the keys. This is
required, not incidental: the holder cannot make an informed decision about
what to withhold without seeing what is actually there, and
`WalletCredentialResponse` carries no claims at all, so this endpoint is the
only way the holder can read them. It is also what the "what verifiers see"
preview renders from, so no second round trip is needed.

The claim map is not stored in the database. The `credentials` table has no
claims column — claims exist only inside the signed envelope on IPFS,
addressed by `credentials.ipfs_cid`. Reading them means retrieving the CID,
parsing `SignedCredentialEnvelope`, and reading `credential().claims()`.

```
PUT /api/holder/credentials/{id}/disclosure
   body: { "hiddenClaims": ["gpa"] }
   -> 200 { claims: { <key>: <value> }, hiddenClaims: [String] }
```

An empty array resets to show-everything. No separate `DELETE` is provided —
`PUT` with `[]` is the whole reset story.

Both endpoints are holder-scoped by the existing
`/api/holder/**` rule, and both must additionally confirm the credential is in
the caller's own wallet.

### Scope of application: the verifier path only

Disclosure filters the **verifier** response. It deliberately does **not** apply
to administrative or audit views. The registry operator's ability to see the
complete record is part of running the registry, and an audit trail that
silently omitted claims would be worthless. This is stated explicitly because
"the holder controls what can be seen" could otherwise be read as a claim about
every view in the application.

The holder's own wallet view also shows **all** claims, including ones they
have hidden, each marked with whether it is hidden from verifiers. Concealing
a claim from the person who decided to conceal it would make the disclosure
choice impossible to evaluate, which defeats the feature.

### Changed — verifier

`VerificationResult` gains one field and changes the contents of another:

```
disclosure: { disclosed: 3, total: 7, complete: false }
claims:     { only the visible claims }
```

`complete` is `true` when nothing is hidden. A verifier is therefore never
silently handed a partial view while believing they received the whole
credential — the block makes partiality explicit and countable.

The verify endpoint's request signature is **unchanged**: still a multipart
upload of the signed envelope.

### Claim key validation

Hidden keys are validated at save time against the credential's real claim
keys. Hiding `gpa` on a credential with no `gpa` claim is a `400` naming the
offending keys, not a silent no-op.

---

## Data flow

### Verification

The existing sequence is unchanged in every respect. The disclosure filter is
inserted at **exactly one point**: the moment claims are placed into the
verification result.

All integrity checks continue to run against the **complete** payload — the
canonical hash, the IPFS-stored copy, the issuer signature, and the blockchain
anchor. Nothing is skipped, and no check is loosened.

The property this yields is worth stating precisely, because it is the strongest
honest claim the design supports:

> A verifier examining a partially disclosed credential still knows the **entire**
> credential is authentic, because the issuer's signature covers claims they
> cannot see. Their view is narrow; their assurance is not.

### Issuance

Unchanged. The issuer form submits whatever claim map the editor produced, and
the existing request DTO already accepts it.

### Disclosure change

1. Holder toggles claims in the wallet UI.
2. `PUT` validates: caller owns the credential, every key is a real claim key.
3. Row is created or replaced.
4. Next verification of that credential reflects the new policy immediately.
5. A `VerificationRecord` is written on verification as it already is; the
   recorded result reflects what that verifier was actually shown.

---

## User interface

### Issuer — open claim editor

Delete `assembleClaims()`. Replace the five hardcoded inputs with a repeatable
key/value row editor.

- Add, edit and remove rows
- **Duplicate keys are rejected as the user types.** This is not cosmetic:
  `Map` semantics silently discard all but the last value for a repeated key,
  so a repeated `gpa` would become one GPA with no warning, on a credential that
  is signed and immutable the moment it is issued.
- Visible counter against the existing 50-claim cap
- The five existing fields are retained as **one-click presets** that populate
  a filled-in row, preserving the vocabulary issuers already know. (A previous
  variant of this design offered a clean slate instead; presets were chosen.)
- `recipientName` continues to be injected into claims, as today.

### Holder — "What verifiers see"

Per credential, in the wallet:

- One toggle per issuer claim
- Show-all / hide-all
- **A preview that renders the actual verifier view**, so the holder is never
  adjusting disclosure blind
- Hiding every claim is permitted, with a UI confirmation. It is a coherent
  choice: the verifier sees title, issuer and dates with no claims.
- The holder's own view continues to show every claim, each marked as shared or
  hidden. The preview sits alongside it, not instead of it.
- When any claim is hidden, the raw download button carries an explicit
  warning: the downloaded file contains **all** claims, including hidden ones.

---

## Error handling

| Condition | Response |
|---|---|
| Credential not in caller's wallet | `404` |
| Hidden key is not a real claim key | `400`, naming the invalid keys |
| `hiddenClaims` absent from body | `400` |
| No disclosure row exists | Not an error — all claims visible, `complete: true` |
| More than 50 hidden keys | Impossible; bounded by the issuer's claim cap |

---

## Testing

**Unit — filtering**
- No disclosure row → all claims returned, `complete: true`
- Some hidden → exactly the complement returned, counts correct
- All hidden → empty claim map, `complete: false`

**Unit — endpoints**
- `PUT` with a valid key set persists and is reflected on the next read
- `PUT` with an unknown key → `400` naming it
- `PUT` on a credential in someone else's wallet → `404`
- `PUT` with `[]` resets to show-everything

**Regression — the important one**
- A credential with no disclosure row returns `claims` byte-identical to
  today's response and `complete: true`. This test is what protects the 8
  credentials already anchored on chain.

**Contract lock**
- The raw download still returns every claim including hidden ones. This locks
  in the documented behaviour so it cannot drift silently and invalidate the
  privacy claims made in the UI.

**End-to-end (Reticle, per `frontend/AGENTS.md`)**
- Issuer issues a credential with custom, non-preset claims
- Holder hides one claim and opens the preview
- Verifier uploads the credential: sees the core fields and the visible claims,
  `complete: false`, with the signature and anchor still verifying

---

## Privacy properties and their honest limits

This is presentation-layer privacy enforced by the application.

**What it protects:** what the verifier's response contains. A verifier using
the application sees only the disclosed claims.

**What it does not protect:** the raw signed file. The holder can still download
the complete credential, and that file contains every claim, hidden or not.
Anyone who receives that file directly can read everything in it.

Therefore the product must describe this as **"what the verifier tool displays"**
and never as sealed, protected, or cryptographically hidden. The holder
interface is required to carry the download warning described above, and no
copy anywhere in the application may imply a guarantee that does not exist.

---

## Upgrade path

If cryptographic disclosure is ever required, the schema here does not block
it: claims are already an open map in the canonical payload, so a Merkle root
over claim leaves could be added to the signed canonical form at issuance and
verified alongside the existing hash. That change would require a new envelope
version and a migration for existing credentials — which is precisely why it is
a deliberate future step rather than something to pay for now.
