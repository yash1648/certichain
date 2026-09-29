# Task 5 Brief: Let the issuer attach arbitrary claims

**Source of truth:** `docs/superpowers/plans/2026-09-29-holder-controlled-disclosure.md`, Task 5.
**Base commit:** `181fc81`.
**Status:** READY. Pre-flight confirmed the plan's four usage sites and verified the backend
claim. Two small corrections and one UX hazard are noted below.

## Binding invariants for this task

- The backend already accepts up to **50** arbitrary claims — `CredentialIssueRequest.claims`
  carries `@Size(max = 50)`, verified. A hardcoded four-claim `assembleClaims()` is the only
  thing limiting issuers. This task removes that ceiling from the UI; it adds no backend.
- `issuerService.issueCredential(payload, token)` is **unchanged**. This is a single-file
  frontend change.
- **Anything added here is signed into the certificate** and is immutable the moment it is
  signed. The copy must say so.
- Duplicate keys are **silent data loss** — object/Map semantics keep only the last value, and
  the credential cannot be corrected afterwards. Surface it before submission, not after.
- The holder's later choice about what a verifier sees is a **separate** concern (Tasks 6/7).
  Do not build disclosure controls here.

## Pre-flight findings (verified against the code)

**1. `programMajor` has exactly four usage sites**, all in `IssuerStudio.jsx`:
line 66 (the `useState`), 189 (in `assembleClaims`), 692 (the input's `value`), and 802 (the
summary chip). The plan names three of these and says "find and fix the remaining reference" for
the last. All four must go — a leftover reference is a build error, which is the good outcome.
No other file in `src/` references it.

**2. The five lint warnings are pre-existing.** Run them once *before* you change anything and
save the count. If the number changes, you introduced something; if it is the same, you did not.

**HAZARD — `nextRowId` is a stale closure in the plan's `addRow`.** The plan's version reads
`nextRowId` from the render in which the handler was created. Two `addRow` calls in the same
tick — or a click that lands before React re-renders — append two rows with the **same `id`**.
`id` is the React `key`, so the second row replaces the first in the DOM instead of appearing:
a silently discarded claim. Use the functional-updater form so the id is derived from the
previous state, e.g. compute the next id inside `setClaimRows(prev => ...)` from
`prev[prev.length - 1].id + 1`, and drop the separate `nextRowId` state entirely. That removes a
piece of state *and* removes the bug — fewer moving parts, and the ids stay unique no matter how
the updates batch.

Verify this specifically: add two rows rapidly and confirm both appear.

**Also:** `id` must stay unique after a removal. Deriving from the last element's id breaks if
the last row is deleted and a new one added. Use a monotonically increasing source of truth —
the highest id ever issued, kept in state, advanced only in the functional updater. The point is
that the increment must happen where it cannot be read stale, and must not decrease on removal.

## Step 1 — Replace the four fixed states with a row model

Delete the four `useState` lines at 66-69 (`programMajor`, `gpa`, `honors`, `department`) and
add a single row array plus the cap and presets:

```jsx
  const [claimRows, setClaimRows] = useState([
    { id: 1, key: '', value: '' },
  ]);

  const CLAIM_CAP = 50;

  const PRESETS = [
    { key: 'major', value: '' },
    { key: 'gpa', value: '' },
    { key: 'honors', value: '' },
    { key: 'department', value: '' },
  ];
```

Implement the id strategy from the HAZARD note above rather than the plan's `nextRowId` state.

## Step 2 — Derive the duplicate-key error

```jsx
  const trimmedRows = claimRows.filter((r) => r.key.trim());
  const seenKeys = new Set();
  const duplicateKey = trimmedRows.find(
    (r) => seenKeys.has(r.key.trim()) || !seenKeys.add(r.key.trim())
  )?.key.trim();
```

This runs on every render, so the error appears as the issuer types and needs no state.

## Step 3 — Rewrite `assembleClaims`

```jsx
  const assembleClaims = () => {
    const obj = {};
    for (const row of trimmedRows) {
      obj[row.key.trim()] = row.value.trim();
    }
    return obj;
  };
```

Rows with a blank key are dropped by `trimmedRows` — an issuer who adds a row and leaves the
key empty does not send `{ "": "something" }`.

## Step 4 — Add the row handlers

`addRow(preset)`, `updateRow(id, field, value)`, `removeRow(id)` per the plan, with the id
strategy corrected as above. `updateRow` and `removeRow` use functional updaters and are fine
as written.

## Step 5 — Replace the fixed form inputs

Replace the JSX block containing the `programMajor` input and its `gpa`, `honors` and
`department` siblings (around line 692) with the plan's block. It is good — keep the
`aria-label`s and the `role="alert"` on the duplicate-key message, both of which exist for real
reasons (screen readers, and Task 8's Reticle drive locates controls by accessible name).

Confirm the copy states that what is added is signed in and that the holder decides what a
verifier sees. That sentence is the feature's whole point at this step.

## Step 6 — Block submission while a key is duplicated

In `handleIssueCredential`, extend the first-line guard:

```jsx
    if (!resolvedHolder?.id || !credTitle.trim() || duplicateKey) return;
```

## Step 7 — Fix the summary chip

Line ~802 renders `programMajor` in a credential summary chip. Replace it with the plan's
render over `trimmedRows`. Use `r.id` as the React key, not `r.key` — two rows can transiently
share a key, which is exactly the state the duplicate warning is reporting, and keying on it
would collide while the user is mid-edit.

## Step 8 — Lint and build

```bash
cd /home/grim/Projects/CertiChain/frontend && npm run lint && npm run build
```

Expected: no errors. Five pre-existing warnings are normal — do not silence them, and do not
introduce new ones. Compare against the count you captured in pre-flight.

## Step 9 — Commit

Stage only `frontend/src/components/issuer/IssuerStudio.jsx`, by explicit path. Never
`git add -A`, `git add .`, or `git commit -a` — the tree holds uncommitted Reticle artifacts.

```
feat(ui): let issuers attach arbitrary claims

The backend has accepted 50 arbitrary claims all along; a hardcoded
assembleClaims() was the only thing limiting them. Duplicate keys are
rejected before submission because Map semantics would silently keep
only the last one on a credential that is immutable once signed.
```

## Self-review before reporting

- Are all four `programMajor` references gone?
- Can two rows ever share an `id`, under rapid clicking or after a removal?
- Would a blank key reach `assembleClaims`? (It must not.)
- Do the new inputs keep their `aria-label`s and the alert its `role="alert"`?
- Lint warning count unchanged from the pre-flight baseline?
- Anything left referencing a deleted state?
