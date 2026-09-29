# Task 6 Report: The holder's disclosure panel

**Commit:** `e064afe` — `feat(ui): give holders a per-claim disclosure control`
**Status:** DONE

## Summary

Three files, no backend change, no new dependency.

- `holderService.getDisclosure(credentialId, token)` and
  `holderService.setDisclosure(credentialId, hiddenClaims, token)`.
- `DisclosurePanel.jsx` — the holder's per-credential disclosure control. Owns its own
  error state, rolls both error paths back to the previous selection, adopts the server's
  stored `hiddenClaims`, and prints nested claim values readably.
- `HolderWalletView.jsx` — mounts the panel as an expanded table row, one credential at a
  time, behind a new **Sharing** button between View and Download.

The panel takes `{ credentialId, token, panelId }` — `panelId` was added in fix round 1 so
the Sharing button's `aria-controls` resolves to the panel root; before that it named an id
that existed nowhere. The page-level `setError` is untouched, so a disclosure failure cannot
replace the wallet with a page-level `ErrorState` whose "Try again" reloads the wallet.

## The mounting

**The column count is 5.** `thead` carries five `<th>` at `HolderWalletView.jsx:207-213` —
Credential, Issuer, Status, Issued, and an `sr-only` "Actions" cell. The body row is one
`<th scope="row">` plus four `<td>`, also five. The expanded row is therefore
`<td colSpan={5}>` (`HolderWalletView.jsx:284`).

The table is still valid markup: `<tbody>` contains `<tr>` elements, and the expanded row
is a *sibling* `<tr>` immediately after its credential's row, holding a single cell that
spans all five columns. Nothing is nested inside a `<tr>`, and the row header stays on the
credential row.

Two details the raw column count does not cover:

- `data-label=""` on the expanded cell. Below 720px the table becomes a stacked list and
  every cell gets a caption from `content: attr(data-label)` (`index.css:734-753`); the
  stylesheet already has `[data-label='']::before { content: none }` for a cell that needs
  no caption, and the actions cell above it uses that same idiom.
- The panel wrapper is `width: '100%'` (`DisclosurePanel.jsx:121`). On mobile that cell
  becomes `display: flex`, where a content-width child would shrink-wrap to the width of
  its widest label instead of filling the card.

**One panel at a time.** `openDisclosureId` (`HolderWalletView.jsx:30`) holds a single
credentialId, and the button toggles it to `null` on a second click. Two open panels raise
the question of which credential a change applies to, and these are per-credential settings.

The trigger carries `aria-expanded` and `aria-controls={disclosureId}`.

> **Correction (fix round 1).** The line this paragraph replaced asserted that "the panel root
> carries that id in both its collapsed and expanded branches". It did not. The view created
> `disclosureId` at `:35` and referenced it only in `aria-controls`; the panel created its own
> unrelated `useId()` internally, so the button pointed at an id that was not in the document.
> `panelId` is now passed down and applied to the root in both branches
> (`DisclosurePanel.jsx:119` collapsed, `:136` expanded).

## The rollback

This is the section that matters, so it is traced rather than described.

**One save path, two callers.** `toggle` (`:71-81`) and `setAll` (`:83-100`) both compute
their sets and hand them to a single `save(next, previous)` (`:56-69`). The previous set is
captured *by the caller* before any state change and passed in explicitly, so neither path
can read a stale closure and the two cannot drift apart:

```
toggle(key):  previous = hidden;  next = new Set(previous) ± key;  setHidden(next);  save(next, previous)
setAll(bool): previous = hidden;  next = bool ? keys(claims) : [];  …confirm…;       setHidden(new Set(next));  save(next, previous)
save:         setSaving(true); setError(null);
              try   → PUT → setHidden(new Set(data?.hiddenClaims ?? [...next]))
              catch → setHidden(previous); setError(err.message)
              finally → setSaving(false)
```

**Reference safety.** `previous` is a reference to the live `hidden` Set, so it is only safe
if nothing ever mutates a Set in place. Checked: `toggle` builds a fresh
`new Set(previous)` before any `has`/`delete`; `setAll` builds a fresh `new Set(next)`;
`save` builds a fresh `new Set(...)` on both branches. There is no in-place mutation of
`hidden` anywhere in the component, so at rollback time `previous` is exactly the set that
was in force when the save began — which is exactly the set the server still holds.

**Unticking a claim, then a failed save.** `toggle('gpa')` captures `previous` (say empty),
builds `next = {gpa}`, and `setHidden(next)` so the box unticks at once. The PUT rejects →
`catch` at `:63` → `setHidden(previous)` restores the empty Set → the box re-ticks, and the
alert at `:132-135` explains why. The panel shows precisely the pre-click selection: the
change is neither silently applied nor inverted. The plan's version called
`setHidden(new Set(Object.keys(claims)))` here, which would have left *every* box unticked —
the exact opposite of the untick the holder just made, and a state the server had just
rejected.

**Hiding everything, then a failed save.** `setAll(true)` captures `previous`, computes
`next = Object.keys(claims)`, and the confirm fires (`:90-96`) before any state change — a
cancel returns at `:95` with the panel untouched and no request sent. On accept,
`setHidden(new Set(next))` unticks everything, then a rejected PUT rolls back to `previous`.
The plan's `setAll` had no rollback at all, so a failed "Hide everything" left the panel
claiming every claim was hidden while the server still had nothing hidden.

**Why one path, not two.** The defect was that `toggle` and `setAll` each owned their own
catch. Collapsing them into `save` puts the rollback in exactly one place, so there is no
third caller to get it wrong later.

**Nothing is shown that the server did not accept.** On success the panel adopts the
response: `setHidden(new Set(data?.hiddenClaims ?? [...next]))` (now `:75` after this round's
edits). Only a null/undefined `hiddenClaims` falls back to what was sent; on a 200 the server
accepted `next`, so the fallback shows nothing unaccepted either. Verified against the
backend: `HolderService.setDisclosure` rejects unknown claim keys with a 400 (`:209-217`) and
returns `List.copyOf(requested)`, so the echoed set is authoritative.

> **Correction (fix round 1).** This passage previously claimed that `??` rather than `||`
> *matters*, because an empty list from the server is a real answer. That reasoning was wrong.
> An empty array is truthy in JavaScript, so `[] || x` returns `[]` and `||` behaves
> identically to `??` for a list-or-absent value. The source line was always correct; only this
> explanation was false, and it invited a future reader to "fix" working code. `??` is kept
> because it is the operator that expresses the intent (fall back only on nullish), not because
> `||` would be a bug. The same error appeared in the **For the review** section below; both are
> corrected. See the fix report at the end of this file.

## State transitions

**1. First open, no policy row.** The panel mounts with `claims === null`, so the collapsed
branch renders (`:102-115`): one "What do verifiers see?" button, no error, nothing to
misread. Clicking runs `open()` (`:33-47`). The server has no row, so `hiddenClaimKeys`
returns `orElseGet(List::of)` (`HolderService.java:314-323`) — `hiddenClaims: []` — and
`claims` is the full signed map. `setHidden(new Set([]))` at `:41`. Every checkbox is
ticked (`checked={!hidden.has(key)}`), the count reads "N of N claims are shared.", **Share
everything** is disabled, **Hide everything** is enabled, and the download warning at `:230`
is absent because `hidden.size === 0`. Nothing is hidden, matching the server.

**2. Untick one claim, then fail the save.** Traced above. Result: the box re-ticks, the
count returns to its prior value, and an inline `role="alert"` error appears under the
heading. The holder's click is never left looking applied when it was not.

**3. Hide all, then fail the save.** Confirm → all untick → PUT rejects → `setHidden(previous)`
restores the prior set and the alert appears. The panel never claims everything is hidden
while the server has nothing hidden.

**4. Collapse and reopen after a change.** A saved change is adopted from the response, so
the panel and server agree. Collapsing unmounts the whole `<tr>` (the panel is a child of
it), which discards every piece of local panel state. Reopening mounts a *fresh*
`DisclosurePanel` — `claims === null` again, collapsed branch again, one GET of the stored
policy. A collapse/reopen round trip therefore cannot show an unaccepted state: the panel
has no memory of its own across that boundary, and the GET it issues is the one it needed
anyway.

**5. A credential carrying a nested claim value.** `renderValue` (`:11-12`) sends anything
`typeof === 'object'` and non-null through `JSON.stringify`, and everything else through
`String`. So `{"term":"2026"}` prints as `{"term":"2026"}`, not `[object Object]`, and
`[1,2]` prints as `[1,2]` rather than the ambiguous `1,2` that `String` would give. The
helper is used in both the claim list (`:154-160`) and the verifier preview (`:222-223`),
so the preview shows the identical text the holder is judging. The `!== null` guard matches
`ResultCard.jsx:182-184` so a null value renders as `null` instead of a quoted `"null"`.

**The error while collapsed.** A failed *load* leaves `claims === null`, so the collapsed
branch renders the `role="alert"` error above the button (`:105-108`) and relabels that
button "Try again" (`:111`), wired to the same `open` handler. Every outcome of the click is
visible: a spinner while loading, the panel on success, an alert on failure. There is no
click in this component that produces silence.

Two extra checks I ran while reading the backend, because both could have produced a stuck
control:

- A stored hidden key can never be absent from `claims` — the setter 400s on an unknown key
  and signed claims are immutable. So the `visible.length === entries.length` disable on
  **Share everything** cannot trap a holder with a stale key they can no longer clear.
- `saving` disables every checkbox and both buttons, so only one PUT is ever in flight and a
  late failure cannot roll back over a newer save.

## Files changed

| File | Change |
| --- | --- |
| `frontend/src/services/holderService.js` | +`getDisclosure`, +`setDisclosure` (39 lines) |
| `frontend/src/components/holder/DisclosurePanel.jsx` | new, 240 lines |
| `frontend/src/components/holder/HolderWalletView.jsx` | import, 3 lines of state, `Fragment` + Sharing button + expanded row |

No file outside the brief's list was modified. The `Button` component, `lucide-react`, and
the existing CSS classes are all reused; no CSS file was touched and no dependency was added.

## Lint and build

**Before** — 5 warnings: `AuthContext.jsx:283` (only-export-components),
`VerificationHistoryView.jsx:42`, `HolderWalletView.jsx:51`, `AdminConsoleView.jsx:60`,
`IssuerStudio.jsx:177` (all set-state-in-effect).

**After** — 5 warnings, the same five files, none silenced, none added:

```
src/components/verifier/VerificationHistoryView.jsx:42:5   react(set-state-in-effect)
src/components/holder/HolderWalletView.jsx:54:5             react(set-state-in-effect)
src/context/AuthContext.jsx:283:17                          react(only-export-components)
src/components/admin/AdminConsoleView.jsx:60:5              react(set-state-in-effect)
src/components/issuer/IssuerStudio.jsx:177:5               react(set-state-in-effect)
```

`HolderWalletView`'s warning moved from `:51` to `:54` because three lines of state were
added above the effect. Same rule, same statement, not silenced.

**Build:**

```
vite v8.3.0 building client environment for production...
✓ 1900 modules transformed.
dist/index.html                   1.21 kB │ gzip:  0.61 kB
dist/assets/index-CyFkpznI.css   30.17 kB │ gzip:  5.99 kB
dist/assets/index-CysHHOlS.js   337.92 kB │ gzip: 98.73 kB
✓ built in 590ms
```

No errors. The bundle grew 0.01 kB (337.91 → 337.92 kB) — the panel is a rounding error.

**What the build does and does not prove.** It proves the component compiles and its JSX is
well-formed. It does not prove the rollback is correct — a component that rolls back to the
wrong state compiles perfectly well, which is exactly why the plan's defect survived to
review. There is no test framework in this repo and I did not add one, so **no runtime
check was performed**; the five transitions above are traced by reading the code, and the
first executed check is Task 8's Reticle drive.

## Deviations

1. **`return handleResponse(response)`** instead of the plan's
   `if (!response.ok) await handleResponse(response); return response.json();`. Identical
   behaviour — `handleResponse` throws a structured error with a `status` on `!ok` and
   parses JSON on `ok` — and it matches `listWallet`/`addToWallet`/`removeFromWallet` in the
   same object. The plan's shape is `downloadCredential`'s because that method needs the raw
   `Response` for its headers and blob. Six lines shorter.
2. **`var(--warn)`** instead of the plan's hardcoded `#b45309`. The token is `#92610a`
   (~5.5:1 on white) rather than ~4.9:1, and the repo uses the token elsewhere. Copy is
   unchanged.
3. **Bare `<button>`s and `className="hint"` became the repo's `Button` and `.form-helper`.**
   `hint` is not a class in `index.css`, and the brief says to prefer the components already
   in the tree. No wording changed.
4. **`<h4>` → `<h3 className="section-title">`.** The nearest heading on the page is the h2
   "Claim a credential", so h4 skipped a level.
5. **`.choice` / `.choice__title` / `.choice__note`** (`index.css:558-600`, defined but
   currently unused by any component) for the claim rows instead of ad-hoc inline styling.
   `.choice:has(input:checked)` tints the shared rows, which reads as the useful half of the
   distinction. No new class, no CSS edit.
6. **`width: '100%'` on the panel wrapper**, and **Share everything disabled when everything
   is already shared / Hide everything disabled when everything is already hidden**, so
   neither button can fire a no-op PUT. Not in the plan.
7. **A credential with zero claims** renders "This credential has no claims to choose from."
   and hides the buttons. Not in the plan; three lines.
8. **JSDoc on the two service methods** in the file's existing style; the plan had none.

No deviation on anything load-bearing: rollback to `previous` in both paths, the panel-owned
inline `role="alert"` error, no `onError` prop, adopting the server's `hiddenClaims`,
readable nested values, the hide-everything confirmation, the "sharing this file shares
everything" warning, `item.credentialId`, `accessToken` from `useAuth()`, and `colSpan={5}`.

## For the review
Worth a second pair of eyes: the two disabled-button conditions (deviation 6) are the only
place the panel declines to do something the holder asked for.

> **Correction (fix round 1).** This section previously nominated "the `??` vs `||` in the
> response adoption at `DisclosurePanel.jsx:62`" as the thing to scrutinise, on the claim that
> `||` "would silently discard a legitimate 'share everything' answer". That was wrong — `[]`
> is truthy, so `||` and `??` agree here — and the line needed no scrutiny. Withdrawn. The two
> fixes from this round are described in the fix report at the end of this file.


`git status` still shows the pre-existing modified and untracked Reticle artifacts; they were
in the tree before this task and were not staged.

---

# Fix round 1 report

**Commit:** `10ac3ea` — `fix(ui): point the Sharing button at the panel it controls`
**Status:** DONE
**Scope:** the two Important findings and Minor #1. Minor #2–#6 left untouched as triaged.

## Changes

**Important #1 — `aria-controls` named an id that did not exist.**
`HolderWalletView.jsx:258` set `aria-controls={disclosureId}` from a `useId()` created at `:35`,
and that id was applied to no element anywhere in the file. The panel rooted itself with its own
`useId()` (`DisclosurePanel.jsx:31`), so the two were unrelated values and the button announced a
relationship to an element that was not in the document.

Fixed by passing the id down rather than deleting the attribute, matching the convention at
`ResultCard.jsx:200`, `AccountProfileView.jsx:144`, `PublicVerifierView.jsx:68` and
`AdminConsoleView.jsx:208`, each of which pairs `aria-controls` with the controlled element's
real id:

- `HolderWalletView.jsx:288` — `panelId={disclosureId}` passed to the panel.
- `DisclosurePanel.jsx:27` — signature is now `({ credentialId, token, panelId })`.
- `DisclosurePanel.jsx:1` — `useId` dropped from the import; the panel no longer mints an id of
  its own, so there is no second value to drift.
- `DisclosurePanel.jsx:119` and `:136` — the root div carries `id={panelId}` in the collapsed and
  expanded branches. `:203`/`:211` derive the preview id from the same prop.

Verified by reading both files after the edit, not from intent:

```
HolderWalletView.jsx:35   const disclosureId = useId();
HolderWalletView.jsx:258  aria-controls={disclosureId}
HolderWalletView.jsx:288  panelId={disclosureId}
DisclosurePanel.jsx:119   <div id={panelId}>                     (collapsed)
DisclosurePanel.jsx:136   <div id={panelId} style={{…}}>        (expanded)
DisclosurePanel.jsx       useId: no occurrences remaining
```

The previous report's claim that "the panel root carries that id in both its collapsed and
expanded branches" was false. Corrected in place with a marked correction block.

**Important #2 — a malformed response rendered as a confident "no claims".**
`DisclosurePanel.jsx:38` was `setClaims(data?.claims || {})`. `handleResponse` returns
`response.text()` for any 200 whose content type is not JSON (`holderService.js:17-21`), so
`claims` was `undefined` → `{}` → the panel rendered "This credential has no claims to choose
from" with no controls and no error, indistinguishable from a genuinely empty credential.

- `DisclosurePanel.jsx:40` — `const loaded = data?.claims;`
- `DisclosurePanel.jsx:48-52` — a response with no `claims` object throws, so the existing
  `catch` at `:57` renders it through the same `role="alert"` path as any other load failure.
  A genuine `claims: {}` passes the guard and still renders the empty state.
- `DisclosurePanel.jsx:56` — `new Set(data.hiddenClaims)` no longer needs the `|| []` fallback,
  because the guard at `:48` has already established it is an array.

The guard is `!loaded || typeof loaded !== 'object' || !Array.isArray(data?.hiddenClaims)`. It
covers the string case (non-JSON body), `undefined`, and `null` — `typeof null === 'object'`, so
the `!loaded` term is what excludes it. Requiring `hiddenClaims` to be an array closes the same
hole on the other field: a response that cannot say what is hidden is a broken response, and
defaulting it to "nothing hidden" would fail open, which is the worse direction. The backend
always sends a list — `hiddenClaimKeys` ends in `orElseGet(List::of)` (`HolderService.java:314-323`)
and the setter returns `List.copyOf(requested)` — so no legitimate response is rejected by the
guard.

**Minor #1 — the `??` claim in this report.** Corrected at both places, each with a marked
correction block: the **Nothing is shown that the server did not accept** passage in the rollback
section, and the **For the review** section that nominated the line for scrutiny. The
controller is right that an empty array is truthy, so `[] || x` returns `[]` and `||` and `??`
behave identically for a list-or-absent value. The source line was never wrong and was not
touched. The report had been telling the next reader that correct code contained a latent bug.

Two other statements in this report were made false by this round's edits and were corrected in
the same pass, rather than left to be found by someone else: the summary's "the panel takes
`{ credentialId, token }` and nothing else", and the mounting section's claim about the id.

## States re-traced

**1. `GET` returns a non-JSON 200.** `handleResponse` sees a content type that is not JSON and
returns `response.text()`, so `data` is a string. `data?.claims` is `undefined`; `!loaded` is
true; the guard throws at `:49` with "Your sharing settings could not be read: the server sent an
unexpected response." The `catch` at `:57` sets that message, `finally` clears `loading`, and
`setClaims` is never called — so `claims` stays `null` and the panel stays in the collapsed
branch, which renders the `role="alert"` error above the button and relabels the button "Try
again". **Outcome: the holder sees an error and a retry, not an empty credential.** Before the
fix this was the "no claims to choose from" empty state with no controls and no error.

**2. `GET` returns `claims: {}`.** `loaded` is `{}`: truthy, `typeof 'object'`, and
`hiddenClaims` is `[]`, which `Array.isArray` accepts. No throw. `setClaims({})` at `:53` makes
`claims !== null`, so the expanded branch runs, `entries` is empty, and the count line reads
"This credential has no claims to choose from." **Outcome: the empty state renders, and it is
visually and textually distinct from case 1** — case 1 is an alert plus a "Try again" button in
the collapsed branch, case 2 is a quiet message inside the opened panel. The two are now
distinguishable to the holder, which was the finding.

**3. `GET` returns a real credential.** `loaded` is a populated object, `hiddenClaims` is an
array, so the guard passes and `setClaims(loaded)` / `setHidden(new Set(data.hiddenClaims))` run
exactly as before. No policy row still means `hiddenClaims: []` → an empty Set → every checkbox
ticked. **Outcome: unchanged from the pre-fix behaviour of a first open**, which is the point —
the guard rejects only responses the previous code silently mistook for an empty credential. The
save path, the rollback to `previous`, and the response adoption are untouched.

**4. `aria-expanded` / `aria-controls` before and after the panel opens.** Before this fix, in
both states the button announced `aria-expanded="false"` and an `aria-controls` pointing at an id
with no element behind it — so collapsed was announced as collapsed, and the relationship was
dangling in both states. After the fix, before opening: `aria-expanded="false"` and
`aria-controls="«r3»"`; the panel is not in the document yet, which is the same condition as
`PublicVerifierView.jsx:68` and is the accepted pattern for a control whose content is not
rendered. After opening: `aria-expanded="true"`, the same `aria-controls`, and the element with
that id is in the document — the collapsed branch's root at `DisclosurePanel.jsx:119`. After the
holder presses "What do verifiers see?" and the panel loads, the component re-renders the
expanded branch, whose root also carries `id={panelId}` at `:136`, so the relationship survives
the branch swap rather than breaking at exactly the moment the panel becomes useful. Clicking
again sets `openDisclosureId` to `null`, the row unmounts, `aria-expanded` returns to `"false"`
and the id goes dangling again for the closed state only.

## Lint and build

```
$ cd frontend && npm run lint && npm run build

src/components/verifier/VerificationHistoryView.jsx:42:5    react(set-state-in-effect)
src/components/holder/HolderWalletView.jsx:54:5              react(set-state-in-effect)
src/context/AuthContext.jsx:283:17                           react(only-export-components)
src/components/admin/AdminConsoleView.jsx:60:5               react(set-state-in-effect)
src/components/issuer/IssuerStudio.jsx:177:5                react(set-state-in-effect)

vite v8.3.0 building client environment for production...
✓ 1900 modules transformed.
dist/index.html                   1.21 kB │ gzip:  0.61 kB
dist/assets/index-CyFkpznI.css   30.17 kB │ gzip:  5.99 kB
dist/assets/index-DLSXcnzq.js   338.07 kB │ gzip: 98.78 kB
✓ built in 435ms
```

**5 warnings**, the same five files as before this round and as before the task; none added, none
silenced. Build clean, no errors. The bundle moved 337.92 → 338.07 kB (98.73 → 98.78 kB
gzipped).

`npm run build` again proves only that this compiles. The two fixes are containment
properties, not expressions: an id that is passed and applied correctly, and a response that is
rejected before it can be rendered as something false. Neither is observable to a compiler, and
the second one — distinguishing an empty credential from an unreadable response — is the sort of
thing a Reticle drive can only prove by stubbing a bad response. I have not run the app; these
outcomes are traced from the code.

## Commit

`10ac3ea`, staging the two source files by explicit path. The pre-existing modified and
untracked Reticle artifacts were not staged. The report lives under `.superpowers/sdd/`, which
carries a `.gitignore` of `*`, so it is deliberately uncommitted — that is what tasks 1–5 did
and this matches it.

## Disagreements with this round's triage

None material. Two notes:

- I extended the Important #2 guard to `hiddenClaims` as well as `claims`. The finding named
  `claims`; the same "malformed response rendered as a confident truth" defect exists on the
  other field, and leaving it would mean a response that cannot report the policy still shows
  every claim shared. No legitimate response fails the guard.
- Minor #1 is a correction to the report rather than the code, which is the right call, and worth
  saying plainly: two of the last three reports I have read — mine included — contained a
  confident claim that did not survive being checked against the code. The report is the
  verification record for a repo with no test framework, so an unverified assertion in it is not
  a formatting problem. What worked here was grepping for the claimed usage rather than
  reasoning about what I had written.
