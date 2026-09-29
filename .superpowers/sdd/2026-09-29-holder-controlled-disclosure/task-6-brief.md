# Task 6 Brief: The holder's disclosure panel

**Source of truth:** `docs/superpowers/plans/2026-09-29-holder-controlled-disclosure.md`, Task 6.
**Base commit:** `458d393`.
**Status:** READY. Pre-flight found the plan's mounting step targets a structure this file does
not have, and one outright defect in the panel's error path. Both corrections are below.

## Binding invariants for this task

- **This is presentation control, not secrecy.** The downloaded file always contains every claim,
  including hidden ones. The copy must say so rather than implying the holder is hiding something
  from anyone. The plan gets this right — keep it.
- **The holder's own view shows all claims.** The panel lists every claim, hidden or not; the
  checkbox controls what a *verifier* sees, not what the holder sees.
- **No policy row means nothing is hidden**, so a credential with no prior choice must open showing
  everything shared. The backend returns `hiddenClaims: []` in that case.
- **The server is the source of truth** for what got stored. Prefer the response of the `PUT` over
  your own optimistic guess.
- `GET`/`PUT /api/holder/credentials/{id}/disclosure` return
  `{ claims: Map<String,Object>, hiddenClaims: List<String> }` — `DisclosureResponse`, verified.
- One credential at a time, one claim key per row. No new backend, no new dependency.

## Pre-flight findings (verified against the code)

**1. There are no "per-credential cards". Step 3 of the plan cannot be followed literally.**

`HolderWalletView.jsx` renders a **responsive table**, not cards: `<table>` at `:201`, `<tbody>` at
`:213`, one `<tr>` per credential at `:214-261`, and the actions cell at `:239-259` holding the
View and Download buttons. The plan says "render it inside the per-credential card, below the
existing details and above the download button". There is no such element.

Mount the panel as an **expanded row**: track which credential's panel is open (one credential at a
time is plenty — these are per-credential settings and showing two open panels invites confusion),
and render a sibling `<tr>` immediately after that credential's row, with a single
`<td colSpan={5}>` holding the panel. The table has 5 columns; count them yourself at `:202-212`
and use the real number.

Note the item shape while you are there: the list comes from `holderService.listWallet`, so the
identifier is **`item.credentialId`**, not `credential.id`. The plan's `cred` and `credential.id`
exist nowhere in this file. `accessToken` from `useAuth()` (`:18`) is the right token.

**2. `setError` is the wrong error channel, and passing it would be a visible regression.**

`HolderWalletView.jsx:20` defines `setError`, and it renders a **page-level** `ErrorState` at
`:102-106` with `onRetry={loadWallet}`. Routing a disclosure save failure there would replace the
entire wallet with an error banner and offer a "retry" that reloads the wallet — for a failure that
has nothing to do with the wallet. The file also has a separate inline `claimError` (`:140-144`).

So: **the panel owns its own error state and renders it inline** with `role="alert"`, the
convention this repo already uses at `:141`. Do not plumb a page-level error setter through. Drop
the `onError` prop entirely rather than accepting an unused one.

One consequence to handle: when the panel is **collapsed**, a load failure has nowhere to render.
The error must be visible in the collapsed state too — otherwise "I clicked and nothing happened"
is exactly the silent-failure shape Task 5's review flagged on the issue button.

**3. The plan's `toggle` error path inverts the user's choice. This is a defect, not a nit.**

```jsx
    } catch (err) {
      setHidden(new Set(claims ? Object.keys(claims) : []));   // ← hides EVERYTHING
```

On a **failed** save the panel rolls back to *hiding every claim*. The holder unticks a box, the
network fails, and the UI flips to the opposite of what they asked for — a state the server
rejected and the holder never requested. For the user this is worse than the failed save.

Roll back to the **previous** `hidden` set, the one in scope before the toggle. Compute `next`,
keep a reference to the old value, and restore that on failure.

**4. `setAll` has no rollback at all.** It sets `hidden` before saving and only calls `onError` in
the catch, so a failed "Hide everything" leaves the panel showing everything hidden while the
server still has nothing hidden. Same fix as #3: restore the previous set on failure.

**5. `String(value)` renders nested claims as `[object Object]`.** Task 5 lets issuers attach
arbitrary claims, so a value can legitimately be a number, boolean, array or object. `String({})`
is `[object Object]`, which the holder cannot read and cannot then judge whether to share. Render
scalars directly and `JSON.stringify` objects and arrays, so the panel shows what is actually
stored. Keep it small — a one-line helper is enough.

**6. The happy path should adopt the server's answer.** `setDisclosure` returns the stored
`hiddenClaims`. Setting state from that response rather than from your own optimistic guess means
the panel and the server cannot drift, and it costs one line.

## Step 1 — Add the two service methods

In `frontend/src/services/holderService.js`, following the shape of `downloadCredential` exactly
(`fetchWithTimeout`, `Bearer` header, `!response.ok` → `await handleResponse(response)` which
throws a structured error, `Content-Type: application/json` on the `PUT`). `API_BASE` is
`/api/holder` and is already in scope. `setDisclosure` takes `(credentialId, hiddenClaims, token)`
and sends `{ hiddenClaims }`.

Do not add a try/catch — `handleResponse` already throws with a useful message and a `status`.

## Step 2 — Create the panel component

Create `frontend/src/components/holder/DisclosurePanel.jsx`. The plan's JSX is a good skeleton and
its **copy is the best part — keep the wording**, particularly:

- the note that the downloaded file still contains every hidden claim, with the count, and
- "Sharing this file shares everything."
- the verifier-view preview, because toggling blind is how holders misconfigure this.

Apply the corrections: own error state rendered inline with `role="alert"` and visible in the
collapsed state too; roll back to the previous set in both `toggle` and `setAll`; adopt the
server's `hiddenClaims` from the response; render nested values readably.

Keep the "hide everything" confirmation. It is one of the few genuinely irreversible-feeling
actions in the product, and the plan's reasoning for it is sound.

The component takes `{ credentialId, token }` and nothing else.

## Step 3 — Mount it

Import into `HolderWalletView.jsx`, track the open credential, and render the expanded row. Use
the real column count. Keep the existing View/Download buttons working exactly as they are.

## Step 4 — Lint and build

```bash
cd /home/grim/Projects/CertiChain/frontend && npm run lint && npm run build
```

Expected: no errors. **Five** pre-existing warnings, same files, none silenced. `npm run build`
compiles this component happily whether or not the rollback is correct, so it is not evidence of
behaviour — reason through the states instead and say so in your report.

## Step 5 — Commit

Stage the three files by explicit path. Never `git add -A`, `git add .`, or `git commit -a` —
uncommitted Reticle artifacts are in the tree.

```
feat(ui): give holders a per-claim disclosure control

Includes a preview of the exact verifier view, because adjusting
disclosure without seeing the result means toggling blind, and a
warning that the downloaded file still contains hidden claims.
```

## Self-review before reporting

- Do both error paths restore the **previous** selection rather than an arbitrary one?
- Is the panel's error visible while the panel is collapsed?
- Does the expanded row use the table's real column count, and is the table still valid markup?
- Can a claim value be a nested object or array? Does it render readably?
- Does the state ever show something the server did not accept?
- Anything referencing `cred` or `credential.id` that should be `item.credentialId`?

**No test framework exists in this repo.** Do not add one, and do not add dependencies. Your
report is the verification, so trace these states explicitly and show the outcome: first open
with no policy row, untick one claim then fail the save, hide all then fail the save, collapse
and reopen after a change, and a credential with a nested claim value.
