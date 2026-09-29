# Task 5 Report: Let the issuer attach arbitrary claims

**Commit:** `652fec2` — feat(ui): let issuers attach arbitrary claims
**Base:** `181fc81`
**Files changed:** 1 (`frontend/src/components/issuer/IssuerStudio.jsx`, +146 / −65)

## Summary

Replaced the four hardcoded academic-attribute states (`programMajor`, `gpa`,
`honors`, `department`) with a dynamic row model. The issuer can now add up to 50
named claims, with four one-click presets for the common ones, and sees a live
`n / 50` counter. Duplicate keys are detected on every render and block
submission, because object/Map semantics would silently keep only the last
value on a credential that is immutable once signed.

No backend change. `issuerService.issueCredential(payload, token)` is untouched.
No disclosure control was built (that is Task 6).

## The id strategy

The plan's `nextRowId` was a `useState` counter read from the render in which
the `addRow` handler was created. I did not implement that. I used a **ref**:

```jsx
const nextRowId = useRef(2);
...
const addRow = (preset) => {
  const id = nextRowId.current++;
  setClaimRows((prev) => [...prev, { id, key: preset ? preset.key : '', value: '' }]);
};
```

### Why this is immune to the stale closure

A `useState` value is a **snapshot of one render**. Two `addRow` calls before
React re-renders both close over the *same* snapshot, so both read the same
`nextRowId` and append two rows with an identical `id`. A ref is a mutable box:
`nextRowId.current++` reads and writes the live value, so the second call
observes the first call's increment. There is no snapshot to be stale.

I demonstrated the difference rather than asserting it. Same two-clicks-in-one-tick
sequence, both implementations transcribed verbatim:

```
plan (useState)  ids = [ 1, 2, 2 ]  <- id 2 twice
implemented (useRef) ids = [ 1, 2, 3 ]  <- distinct
```

With `[1, 2, 2]` the second row shares a React `key` with the first, so React
reconciles them into one element: two clicks, one visible row, and a claim the
issuer believes they entered that is silently gone from the credential.

### Why the ref also fixes the removal case

The brief noted that deriving from `prev[prev.length - 1].id + 1` breaks when
the last row is deleted — the counter rewinds and reissues a live id. The ref is
advanced **only** in `addRow` and is never touched by `removeRow`, which only
filters the array. The counter is therefore monotonic and non-decreasing
regardless of which rows are removed.

### Tracing the three required cases

I transcribed the real implementation (`addRow` / `updateRow` / `removeRow`,
the `trimmedRows` and `duplicateKey` derivations, and `assembleClaims`) into a
standalone script with a minimal render loop, and ran the three cases plus five
adjacent ones. 14/14 pass.

**Case 1 — two rows added in one tick.** Both `addRow` calls run before any
commit. Call one takes `id = 2` and leaves `nextRowId.current === 3`; call two
takes `id = 3`. The functional updater appends both, so the array is
`[1, 2, 3]` — three rows, three distinct keys, all three render. **No duplicate
id; no discarded claim.** (Under the plan's version this is exactly the
`[1, 2, 2]` failure above.)

**Case 2 — a row removed, then a new one added.** Starting from ids `[1,2,3,4]`,
removing the last row (`id 4`) leaves the counter at 5 untouched; the next
`addRow` takes 5. Id 4 is never reissued. Verified further for removing a
*middle* row, and for removing **every** row and then adding one — no duplicate
id in any variant. The counter only ever increases.

**Case 3 — a key left blank.** `trimmedRows` is `claimRows.filter(r => r.key.trim())`,
so a row whose key is empty (or whitespace-only) is dropped before
`assembleClaims` ever iterates it. The payload for one typed row plus one
value-with-no-key row is exactly `{"gpa":"3.9","recipientName":"Jane Doe"}` —
the orphan row contributes nothing. **No empty key can reach the payload.**
The same filter means blank rows are also excluded from the `n / 50` count and
cannot trigger the duplicate warning.

Adjacent cases, also verified: a duplicate is detected and clears when the key is
renamed; `"  gpa  "` collides with `"gpa"` (both are compared trimmed, matching
what `assembleClaims` writes); a whitespace-only key is not treated as a claim
at all.

### Why the duplicate derivation is correct

`seenKeys.has(k) || !seenKeys.add(k)` — `Set.prototype.add` returns the Set, so
`!add(k)` is always `false`; it is a side effect, not a value. The first
sighting of a key is recorded and the predicate is `false`; the second returns
`true` from `has`. `find` stops at the first duplicate. Verified by stepping the
predicate per row.

## Deviations

Four. All are stated plainly.

**1. `nextRowId` is a `useRef`, not `useState` (as the brief directed).** The
brief said to use "a monotonically increasing source of truth — the highest id
ever issued, kept in state". I used a ref instead, because a state counter
cannot satisfy "the increment must happen where it cannot be read stale": any
counter read during a click handler is by definition a render snapshot, which
is the exact bug being fixed. A ref is the minimal construct that is both
monotonic and not snapshotted. This is the correction the brief asked for,
pushed one step further; the plan's `useState` version is not implementable as
specified.

**2. `assembleClaims` still seeds `recipientName`.** The brief's Step 3
replacement deletes it. I kept it, conditionally (`if (recipientName.trim())`).
Dropping it is a live regression: `ResultCard.jsx:63` reads
`claims?.studentName || claims?.recipientName || claims?.name` to render the
verifier's **Recipient** field, and `CertificateDiplomaModal.jsx:50` uses
`claims.recipientName` in its name fallback. With the seed removed, a
certificate issued through the new row UI shows "Not stated in the document" in
both places. The original code seeded it unconditionally; the guard only avoids
writing an empty-string name when the issuer has not filled the recipient field.

**3. Because of (2), `recipientName` is treated as a reserved claim key.** A
consequence I had to close: with the seed restored, an issuer who typed a row
key of literally `recipientName` would have their value **silently overwritten**
at assembly — the same data-loss class the duplicate alert exists to prevent,
just through a different door. I added one line to the derivation:

```jsx
if (recipientName.trim()) seenKeys.add('recipientName');
```

This makes such a row report as a duplicate and block submission, rather than
being discarded. It is a genuine behaviour change beyond the brief's letter, but
leaving it out would have reintroduced the exact defect the task is about. If
the reviewer prefers, the alternative is to drop the seed (deviation 2) and let
the row win — but that reintroduces the verifier regression.

**4. The plan's JSX block was restyled onto this codebase's design system.** The
plan's markup uses bare `<input>` and `<button>` elements, `className="field"`,
and `className="hint"`. I checked: `.hint` **does not exist** anywhere in this
repo's CSS, and `.field` (index.css:935) is a `position: relative; display: flex`
wrapper for a leading-icon input — not a form group. Rendering the plan's markup
literally would have produced unstyled inputs and buttons in a file where every
other control uses `input-field`, `form-helper`, `form-error` and the shared
`Button` component. I kept the plan's structure, copy, `aria-label`s, `role="alert"`
and disabled-on-cap logic exactly, and mapped the chrome onto the conventions
already used in this file. Step 3's heading changed from "Academic Highlights &
Honors" to "Certificate Claims" to match what the step now does.

## Lint and build

**Baseline captured before any edit** (on the unmodified file at `181fc81`):
**5 warnings** — matching the brief exactly.

| | before | after |
|---|---|---|
| oxlint warnings | 5 | 5 |
| errors | 0 | 0 |

The same five warnings are present, one per file: `VerificationHistoryView.jsx:42`,
`AuthContext.jsx:283`, `HolderWalletView.jsx:51`, `AdminConsoleView.jsx:60`, and
`IssuerStudio.jsx` (line 113 before, 137 after — the same pre-existing
`set-state-in-effect` on the `loadIssuerData` effect, shifted by my additions).
**Nothing was silenced and nothing new was introduced.**

```
> oxlint
5 warnings, 0 errors

> vite build
vite v8.3.0 building client environment for production...
✓ 1899 modules transformed.
dist/index.html                   1.21 kB │ gzip:   0.61 kB
dist/assets/index-CyFkpznI.css   30.17 kB │ gzip:   5.99 kB
dist/assets/index-CBWKxtLw.js   332.44 kB │ gzip:  97.22 kB
✓ built in 484ms
```

## Self-review checklist

- **All four `programMajor` references gone?** Yes — zero occurrences of
  `programMajor`, `setProgramMajor`, `setGpa`, `setHonors`, `setDepartment` in
  the file. The remaining `gpa` / `honors` / `department` strings are PRESETS
  entries and one input placeholder, which is intended.
- **Can two rows ever share an `id`?** No — ref counter, monotonic, advanced only
  in `addRow`, never rewound by `removeRow`. Verified for same-tick double click,
  removal-then-add, middle-row removal, and full-list emptying.
- **Would a blank key reach `assembleClaims`?** No — `trimmedRows` filters it out
  first. Verified: the assembled payload contains no `""` entry.
- **Do the new inputs keep their `aria-label`s and the alert its `role="alert"`?**
  Yes — `Claim key ${row.id}` (line 742), `Claim value ${row.id}` (749),
  `Remove claim ${row.id}` (758), and `role="alert"` on the duplicate message
  (793). These drive both screen readers and Task 8's Reticle accessible-name
  lookups.
- **Lint warning count unchanged?** Yes — 5 before, 5 after.
- **Anything left referencing a deleted state?** No. A grep for all four names
  returns only literal preset strings.
- **Backend untouched?** Confirmed — `@Size(max = 50)` on
  `CredentialIssueRequest.claims` (verified by reading the record) is what this
  task now fills up to. No Java file was modified.
- **Only the brief's file staged?** Yes — `git add` by explicit path. The
  uncommitted Reticle artifacts in the tree were left unstaged and uncommitted.

## Notes for the review

- The reasoning above is the only behavioural check available: there is no
  frontend test framework in this repo, and I was instructed not to add one. The
  throwaway simulation was run from `/tmp` and is **not** part of the commit.
  Task 8's Reticle drive is the real end-to-end proof — the rapid double-click
  on "Add claim" is the specific flow worth driving there, since that is the
  behaviour `npm run build` cannot see.
- Deviation 3 (reserved `recipientName` key) is the one I would most like a
  second opinion on. It is a two-line behaviour change the brief did not ask
  for, taken to avoid a silent-overwrite defect that its own duplicate alert is
  designed to prevent.

---

# Fix Round 1 of 5

**Commit:** `458d393` — fix(ui): keep a wrong claim off an immutable credential
**Base:** `652fec2`
**Files changed:** 1 (`frontend/src/components/issuer/IssuerStudio.jsx`, +85 / −30)

The `useRef` id strategy and the `Gpa`-vs-`gpa` decision were confirmed correct by
the review and are untouched. Three Important findings and Minor #4–#7 are fixed.

## Changes

### Important #1 — the 50-claim cap could produce 51 claims

- `IssuerStudio.jsx:102` — new `claimCount = signedRows.length + (seededName ? 1 : 0)`.
  The seed is counted, because `assembleClaims` puts it in the same map and
  `@Size(max = 50)` counts the map, not the rows.
- `:103` — `overCap = claimCount > CLAIM_CAP`.
- `:818`, `:828` — both add buttons now `disabled={claimCount >= CLAIM_CAP}`.
- `:834` — the counter renders `{claimCount} / {CLAIM_CAP}`.

**Decision: the seed is counted, not a slot held back.** The review allowed either.
Counting it is one number used by the counter, both disabled states and the
over-cap message, so they cannot drift apart; a `CLAIM_CAP - 1` rows-cap would
have left the counter reading 49 while the payload carried 50, which is the same
class of reassuring-but-wrong number this finding is about. `seededName` is
conditional, so an issuer with no recipient name gets the full 50 rows.

The disabled buttons alone do **not** close this — typing a key into a pre-existing
blank row is not an `addRow` call. `overCap` is what actually makes an
over-cap request unreachable, and it gates submission (`:124`).

### Important #2 — a key with a blank value was signed as an empty string

- `:94-95` — split into `keyedRows` (key present) and `signedRows` (key **and**
  value present, both trimmed).
- `:257` — `assembleClaims` now iterates `signedRows`.
- `:95` is the single definition the counter, the preview and the payload all
  read, so they agree by construction. This also resolves the review's note that
  the old `trimmedRows` filter (key only) would have disagreed with what is sent.

**Decision: dropped, not rejected.** Reasoning: (a) it matches the code this
replaced — the old `assembleClaims` guarded every field with `if (gpa.trim())`,
so a blank field was already silently omitted and this restores that; (b) the
row the issuer just pressed `+ gpa` on is *always* momentarily blank, so
rejecting would mean blocking submission on the default state of a control the
UI itself offers, with no keystroke by the issuer; (c) a half-typed row is not
finished, and a blank claim is not a claim. The counter and the preview chip
(`:900`, now over `signedRows`) show only what will be signed, so a dropped row
is visible as absent from both rather than appearing out of nowhere on the
certificate. That is the discoverability the review asked about, achieved
without a second blocking state.

Duplicate detection deliberately still uses `keyedRows` (`:112`), so a named row
with a blank value can still collide and be reported — it is only excluded from
the payload.

### Important #3 — Sign was a silent no-op

- `:132` — `issuanceBlocked = !resolvedHolder?.id || !credTitle.trim() || Boolean(claimBlockReason)`.
- `:284` — the guard now reads `if (issuanceBlocked) return;`. Kept as the
  controller directed; the disabled button and the guard are belt and braces.
- `:963` — `disabled={issuanceBlocked}` on "Sign & Issue Official Certificate".
- `:940-947` — the reason is repeated in a `role="alert"` on **step 4**, where the
  click happens. The step-3 alert at `:838` is two steps back, so a disabled
  button alone would have been a dead end with no visible cause.

Both alerts render the same `claimBlockReason` string (`:122-130`), so they cannot
disagree about why issuance is stuck.

### Minor #4 — the reserved-key diagnostic was wrong

- `:115` — `clashesWithSeed = Boolean(seededName && duplicateKey === 'recipientName')`.
- `:127-129` — the message now branches. A seed clash reads "“recipientName” is the
  recipient's name on the certificate. Rename this claim, or clear the recipient
  name." A genuine duplicate reads "“gpa” is used by more than one claim. Rename one
  of them, or remove it." The old text claimed the key was "used more than once"
  and prescribed "each claim needs its own name", which is both false (it was typed
  once) and inapplicable (there is no second name to change).

### Minor #5 — claims survived "Issue Another Certificate"

- `:558-562` — the handler now also calls
  `setClaimRows([{ id: 1, key: '', value: '' }])`.

Safe against the ref: `nextRowId` is untouched, so it keeps counting and the next
`addRow` gets a fresh id. Rows go `[1,6]`, never a collision. Verified below.

### Minor #6 — stale button label

- `:757` — "Next: Academic Attributes" → "Next: Certificate Claims".
- `:576` — the wizard nav, same staleness one level up: "3. Attributes" → "3. Claims".
  Not named in the review, but it is the identical defect in the same feature and
  leaving it would have re-introduced the inconsistency finding #6 is about.

### Minor #7 — no `aria-invalid` on the conflicting rows

- `:116-119` — `conflictingRowIds`, a Set of the row ids holding the duplicate key.
- `:788` — `aria-invalid={conflictingRowIds.has(row.id)}` on the key input.

Uses the convention already in `index.css:534`. **Both** conflicting rows get it,
not just the second one: the key itself is the problem, and marking only the
offender would tell the issuer their other, correct `gpa` row was also wrong. The
value input is not marked — it is not what is invalid.

### Minor #9 — comments in touched regions (only where already editing)

Tightened the `assembleClaims` comment (`:249-253`) and the summary-chip comment
(`:893-897`) to explain *why* rather than restate the brief, and rewrote the
derivation block comment (`:86-109`) to state the invariants each list upholds.
No comment-hunting beyond the regions findings #1, #2 and #4 already required
editing.

## State-transition reasoning

Re-verified by transcribing the current implementation into a standalone script
and running the required cases. **26/26 checks pass.** Three of my assertions
were wrong on first run and I confirmed each was a test bug, not a code bug,
before correcting it — the failures are documented in the appendix.

**Case 1 — 50 rows typed one at a time, never via `addRow`.** 51 blank rows exist;
the issuer types into 50 of them. **The issuer sees:** the counter climb to
`51 / 50` (the seed is counted), the add buttons disabled from the moment the
count hits 50, and an alert reading "This certificate would carry 51 claims, and
the ledger accepts 50. Remove one before signing." **What would be sent:**
nothing — `issuanceBlocked` is true, so the guard returns and the Sign button is
disabled. The 51st row, left blank, contributes nothing. This is the exact case
finding #1 describes and it is now unreachable rather than a 400.

**Case 2 — 50 rows via the button.** **The issuer sees:** the add buttons disable
at exactly 50 (49 rows + the seed), the counter reads `50 / 50`, and no alert —
signing is allowed. **What would be sent:** 50 entries, at the cap, not over. With
no recipient name typed, 50 rows are affordable and the counter reads `50 / 50`
with the same disable point. The counter, both disabled states and the over-cap
threshold all read the same number, so they cannot disagree.

**Case 3 — a key with a blank value.** Press `+ gpa`, leave the value blank.
**The issuer sees:** no alert, the row still there to type into, and the counter
unmoved (1, for the name only) — the blank claim is counted as nothing, matching
the old per-field behaviour. **What would be sent:** `{"recipientName":"Jane Doe"}`
— no `"gpa": ""` on an immutable artifact. It is also absent from the step-4
preview, which renders the same `signedRows` list, so the issuer is not shown a
chip for a claim that will not exist. Typing `3.9` brings it back. A
whitespace-only value behaves identically to an empty one.

**Case 4 — two rows with duplicate keys.** Two `gpa` rows with values. **The
issuer sees:** an alert naming `gpa` and offering "Rename one of them, or remove
it", both `gpa` key inputs outlined in the error colour via `aria-invalid`, and
the Sign button disabled with the same reason repeated on step 4. **What would be
sent:** nothing — blocked. The counter reads 3 (two rows + the seed) while only 2
unique keys exist; this **over**-reports, never under, because a duplicate can
only inflate the count. Over-reporting is the safe direction — it cannot hide an
over-cap payload — and the state is blocked regardless. Renaming one row clears
it. The reserved-key case is separate: typing `recipientName` as a key produces
the "is the recipient's name on the certificate" message with both real remedies,
and never the "used more than once" text.

**Case 5 — the last row removed, then a new one added.** Rows `a, b, c` at ids
2, 3, 4; remove id 4 (the last); add `d`. **The issuer sees:** `a, b, d`, with no
visual glitch or lost input. **What would be sent:** `{a, b, d, recipientName}`.
Ids are `[1,2,3,5]` — id 4 is gone and never reissued, because `removeRow` only
filters the array and the ref is advanced solely in `addRow`. The round-1 fix to
"Issue Another Certificate" does not disturb this: after a reset to `[{id: 1}]`
the ref is still at 6, so the next row is id 6 and the ids stay unique. The reset
also means a second certificate carries only the new claims, not the previous
certificate's.

## Lint and build

```
> oxlint
5 warnings, 0 errors   (unchanged)

src/components/verifier/VerificationHistoryView.jsx:42:5   set-state-in-effect
src/context/AuthContext.jsx:283:17                          only-export-components
src/components/holder/HolderWalletView.jsx:51:5             set-state-in-effect
src/components/admin/AdminConsoleView.jsx:60:5              set-state-in-effect
src/components/issuer/IssuerStudio.jsx:177:5                set-state-in-effect
```

The same five pre-existing warnings, one per file. The `IssuerStudio` one is the
same `set-state-in-effect` on the `loadIssuerData` effect, shifted from 137 to 177
by the added lines. **Nothing silenced, nothing new.**

```
> vite build
✓ 1899 modules transformed.
dist/index.html                   1.21 kB │ gzip:   0.61 kB
dist/assets/index-CyFkpznI.css   30.17 kB │ gzip:   5.99 kB
dist/assets/index-3zutIl-B.js   333.02 kB │ gzip:  97.43 kB
✓ built in 636ms
```

## Self-review

- All four deleted states still gone, and no `trimmedRows` reference remains.
- The counter, both add-button disabled states and the over-cap message all derive
  from `claimCount` — one number, so no drift.
- No path reaches a payload over the backend's `@Size(max = 50)`.
- No blank key **or** blank value reaches `assembleClaims`.
- All three `aria-label`s and both `role="alert"`s intact; `aria-invalid` added on
  the duplicate rows using the repo's own convention.
- No new files, no backend change, no disclosure control.
- Only `IssuerStudio.jsx` staged, by explicit path; Reticle artifacts untouched.

## Appendix — three test failures that were my bugs, not the code's

Worth recording, because the first read of each looked like a defect:

1. **"no seed ⇒ 50 rows" printed 49.** The initial row (id 1) is blank, so 50
   `addRow` calls produce 51 rows of which ids 2–51 are the 50 fillable; I had
   filled only ids 2–50. 49 + 0 = 49. The implementation was right; my loop bound
   was wrong.
2. **Duplicate counter read 3, not 2.** `claimCount` counts rows, and two `gpa`
   rows collapse to one key at assembly. This over-reports, which is the safe
   direction, and the state is blocked regardless. I documented it as intended
   behaviour rather than "fixing" the counter to count unique keys — that would
   have required building a map to dedupe, and it would under-report in the
   over-cap case if a future filter diverged from assembly.
3. **"fresh certificate carries only the new claim" failed.** I guessed the row
   after reset would be id 2; the ref correctly kept counting and produced id 6, so
   my `updateRow(2, …)` wrote to a row that no longer existed. I read the actual
   id instead. This failure is itself evidence that the ref never rewinds.

## Concerns

- **#2's drop-vs-reject decision is the one worth challenging.** I chose dropping
  for the reasons above, chiefly that a rejected blank value would block the
  default state of a control the UI itself offers. The cost is that a row the
  issuer started and abandoned is dropped without a word, visible only as absent
  from the counter and the preview. If the reviewer wants a warning on abandoned
  rows, that is a fourth blocking state and a message I did not build.
- **The counter counts rows, not unique keys** (case 4). Safe as argued, but a
  reviewer may see `3 / 50` beside a 2-entry payload and call it a bug. It is a
  deliberate over-count, commented at `:97-101`.
- Still no runtime proof. The reasoning above is a transcription of the logic, not
  the running app; Task 8's drive remains the only real verification.
