# Task 7 Report: Show partial disclosure to the verifier

**Status:** DONE_WITH_CONCERNS (one copy question raised, see [Deviations](#deviations))
**Commit:** `4bfa4c7` — `feat(ui): tell a verifier when a credential is partly disclosed`
**Base:** `10ac3ea`
**Files changed:** 1 (`frontend/src/components/verifier/ResultCard.jsx`, +19 lines)

---

## Summary

Two changes, both in `ResultCard.jsx`:

1. **`disclosure` added to the result destructuring** (`ResultCard.jsx:60`). It goes last, after
   `anchorVerified`, because it is the last field on the backend record — verified against
   `certchain/src/main/java/com/certchain/certchain/dto/response/VerificationResult.java:43`, where
   `DisclosureInfo disclosure` is the final component and the record's JavaDoc states its purpose as
   "so a partial view is never mistaken for the whole record."
2. **A `role="status"` notice paragraph** rendered outside the claim-list guard
   (`ResultCard.jsx:195-211`), conditioned on `disclosure && !disclosure.complete`.

No new file, no dependency, no backend change, no test framework added. The full text of the notice
is the plan's wording verbatim.

---

## Placement

This is the section the review should look hardest at.

| What | Line (post-commit) |
|---|---|
| `{claimEntries.length > 0 && (` — guard opens | **165** |
| `)}` — guard closes, "Certified attributes" section ends | **193** |
| Comment explaining the placement | 195-199 |
| `{disclosure && !disclosure.complete && (` — notice opens | **200** |
| `)}` — notice closes | **211** |
| `{/* -- Audit detail */}` — next sibling | 213 |

**The guard is `ResultCard.jsx:165-193`. The notice is `ResultCard.jsx:200-211`. The notice is not
inside the guard** — it is the next sibling of the guard's closing `)}`, at the same indentation
(10 spaces), directly inside the same `card__body` grid that holds the other top-level sections.

### Why that is outside, and why it has to be

Both branches of the guard are children of `{claimEntries.length > 0 && ( ... )}`. The only way to be
outside is to be a sibling of the whole expression, which is where it is.

Trace the case the notice exists for:

```
holder hides all 3 claims
  → backend returns claims = {} (or the field omitted entirely)
  → ResultCard.jsx:67   claimEntries = claims ? Object.entries(claims) : []   →  []
  → ResultCard.jsx:165  [].length > 0  →  false
  → React renders `false` as nothing; the <section> and its <table> are never mounted
  → ResultCard.jsx:200  disclosure = {disclosed: 0, total: 3, complete: false}
                        disclosure is truthy, !disclosure.complete === true
  → the <p> mounts, on its own
```

Note `Object.entries` returns `[]` for **both** an empty map and an omitted field, because of the
`claims ? ... : []` ternary at line 67. So the notice does not depend on which of those two shapes the
backend sends — it renders either way.

Had the notice been placed inside the guard (as the plan's literal instruction specified), this
trace terminates at line 165: the whole subtree, table and notice together, is skipped. The verifier
would get a green "Verified" verdict, an anchored signature row, and **no attribute table and no
explanation at all** — a document that is indistinguishable from an empty one. That state is
reachable in one click from the panel's own "Hide everything" control, and the backend already models
it as a first-class outcome (`disclosed: 0, total: N, complete: false`).

The guard itself is otherwise **untouched** — line 165 and line 193 are byte-identical to the base
commit. The "Certified attributes" section still renders a heading and a table header row only when
there is at least one row to put under them, which remains correct: an empty attribute table would
be worse than none.

I left a short comment at 195-199 recording the constraint, because the placement is a single
re-indent away from regressing and the reason is invisible from the diff alone.

---

## The three cases

**Nothing here was executed.** There is no test framework in this repo, and per the brief I did not
add one or any dependency. `npm run build` compiles this JSX and proves it is syntactically valid; it
would compile the notice inside the guard exactly as happily as outside it, so it is not evidence of
placement. The outcomes below are traced from the source, not observed in a browser. Reticle
verification is Task 8's.

### 1. Partial view — `disclosure: {disclosed: 2, total: 3, complete: false}`, 2 claims visible

- Guard at 165: `2 > 0` → true → attribute table renders with 2 rows.
- Notice at 200: truthy disclosure, `!false` → true → renders.
- Reads: *"Partially disclosed: the holder shared 2 of 3 claims. The rest were withheld by the
  holder. This credential is still valid and anchored — you are seeing fewer details, not a
  different document."*
- Numbers come straight off `disclosure.disclosed` / `disclosure.total`. `{' '}` at line 206 keeps
  "2 of 3" from collapsing to "2of3".

### 2. Every claim withheld — `disclosure: {disclosed: 0, total: 3, complete: false}`, 0 claims visible

- Guard at 165: `0 > 0` → false → **nothing** from the table block renders.
- Notice at 200: truthy disclosure, `!false` → true → **renders**.
- The card shows: verdict header ("Verified"), the identity `<dl>`, the three `StatusRow` checks, a
  green anchored-ledger row, then this notice, then "Record details". The missing table is now
  explained rather than blank.
- Exact sentence at 0 of 3, as it would render:

  > Partially disclosed: the holder shared 0 of 3 claims. The rest were withheld by the holder.
  > This credential is still valid and anchored — you are seeing fewer details, not a different
  > document.

  Does it read like a broken document? No. "shared 0 of 3 claims" is a complete, self-explanatory
  statement of fact — nothing is elided or garbled at the empty end, and there is no singular/plural
  or zero-handling branch to get wrong. "The rest were withheld by the holder" is still correct when
  "the rest" is all three, and `disclosure.total` keeps naming the full size so the reader knows the
  credential has 3 claims, not 0. The two invariants both hold: the document is explicitly called
  valid and anchored, and "withheld" is used rather than any word implying removal from the record.

### 3. Complete view, and no `disclosure` at all

- `{disclosed: 3, total: 3, complete: true}` → `disclosure` truthy, but `!true` → `false` → **not
  rendered**.
- `disclosure` absent (undefined) → the `disclosure &&` short-circuits before `.complete` is read →
  **not rendered**, and no `TypeError` from dereferencing undefined. This matters because the guard
  expression is evaluated on every result the component receives, including ones from before this
  field existed.
- The backend's two failure paths, `VerificationService.failure` and the empty-upload rejection in
  `VerifierController`, both return `DisclosureInfo(0, 0, true)` → `complete: true` → silent. A
  policy naming a claim the credential no longer has also withholds nothing, and `complete` is
  derived from `visible.size() == allClaims.size()`, so it is `true` → silent. Both are correct
  silences; neither was "fixed".

### Copy check against the two prohibitions

- **No implication of incompleteness or suspicion:** the second sentence states the credential is
  "still valid and anchored" and reframes the view as "fewer details, not a different document".
  Tone is `var(--warn)`, which is the amber status token, not `--bad` — nothing here renders red or
  error-styled, and the paragraph is a `<p>`, not a `StatusRow` with a `warning` icon that would put
  it in the same visual register as "The signing key is not registered. Treat this document with
  caution" at line 147.
- **No implication of removal:** "withheld by the holder" describes the *view*, matching the holder
  panel's own wording from the previous task ("The downloaded file still contains every claim,
  including the N you hid", `DisclosurePanel.jsx:246-248`). The word "removed", "deleted" and
  "missing" appear nowhere in the notice.

---

## Lint and build

**Lint — before:** 5 warnings, 0 errors.
**Lint — after:** 5 warnings, 0 errors. Byte-identical output; same five files
(`VerificationHistoryView.jsx`, `AuthContext.jsx`, `HolderWalletView.jsx`, `AdminConsoleView.jsx`,
`IssuerStudio.jsx`), same rules. `ResultCard.jsx` produced no warning before or after. **Nothing was
silenced** — no `oxlint-disable`, no rule suppression, no `eslint-disable`.

**Build — after:**

```
> frontend@0.0.0 build
> vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 1900 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.21 kB │ gzip:  0.61 kB
dist/assets/index-CyFkpznI.css   30.17 kB │ gzip:  5.99 kB
dist/assets/index-B9SGMFOt.js   338.42 kB │ gzip: 98.93 kB

✓ built in 803ms
```

**Build proves:** the JSX parses and the bundle builds.
**Build does not prove:** that the notice renders, where it renders, or what it says. It is
orthogonal to the placement question this task turns on.

---

## Deviations

Three, all deliberate and all in the direction the brief directed.

**1. The notice is outside the `claimEntries.length > 0` guard, not "immediately after the claim
list" as the plan said.** This is the brief's own instruction and its stated reason; the plan's
literal placement would have deleted the notice in the one state it exists for. Detailed above.

**2. Tokens instead of the plan's inline values.** `color: '#b45309'` → `color: 'var(--warn)'`
(`index.css:46`, `#92610a`, which is what `DisclosurePanel.jsx:246` already uses). `#b45309` is not
in the token set at all; the stylesheet's own header comment says "If a value is not a token here, it
does not belong in a component." `--warn` on white is 5.34:1, so the 13px text clears WCAG AA for
normal text.

**3. Dropped `className="hint"` and dropped `marginTop`.** Two small calls worth stating:

- **`hint` does not exist.** There is no `.hint` class anywhere in `index.css` and no component in
  the repo uses it, so the plan's `className="hint"` was a dead class that styled nothing. I used
  `section-note` (`index.css:261`, `font-size: var(--text-sm)`) for the text size, with the warn
  colour inline. This is also the pattern already used in this exact file at line 87:
  `className="status-row__detail"` with `style={{ marginTop: 'var(--space-1)' }}` — class for type
  treatment, inline for the specific override.
- **No `marginTop` at all, rather than a token one.** The notice is a direct child of
  `card__body`, which is `display: grid; gap: var(--space-6)` (line 99). Every sibling section is
  spaced by that gap alone. The plan's `marginTop: '8px'` would have *added* to the grid gap, giving
  this one element 2.5rem of separation where its neighbours have 2rem — the plan's value was
  already redundant on that count, and replacing it with `var(--space-2)` would have preserved the
  inconsistency. The grid gap is the spacing system here and it is already token-driven, so the
  laziest correct thing was to add nothing. It is load-bearing in neither branch: when the table
  renders the notice is 2rem below it, and when it does not the notice is 2rem below "Checks
  performed".

### One question for the reviewer, not a change I made

The notice's lead phrase is the plan's: **"Partially disclosed:"**. At `0 of 3` the label is strictly
a slight overstatement — nothing was disclosed, so the state is "not fully disclosed" rather than
"partially disclosed". I kept it because the brief instructed me to keep the plan's wording and
explicitly not to "improve" the notice, and because the second sentence is fully explicit about the
counts, so nothing is actually misread. Changing the lead phrase to "Not fully disclosed:" would
cover 0/3 and 2/3 equally and is the same length — but it is a copy change, and the controller ruled
on the notice's copy, so I am raising it rather than improvising.

### Observation, no action taken

The notice says "claims" while the section above it is headed "Certified attributes"
(`ResultCard.jsx:167`). The backend field and the plan's wording both use "claims", and the brief
told me to keep the wording, so I did — but a verifier could reasonably read "0 of 3 claims" and
"Certified attributes" as two different quantities. Worth a ruling if the review wants the two terms
unified.

### Not done, deliberately

- **No Reticle drive.** The `AGENTS.md` verification section normally applies to a user-visible
  change, and this is one. The plan assigns the in-app drive to Task 8 and the controller told me
  not to dispatch subagents for it, so I stopped at build. Flagging rather than skipping silently.
- **No test, no dependency, no new file.** The entire surface is one conditional paragraph.
- **No "show withheld" affordance, download button, or anything else.** The panel that controls
  this already exists from the previous tasks; this task adds one notice.
- **No other file touched.** `git diff --stat` shows the only source change is
  `ResultCard.jsx`. The `.reticle/*` modifications and untracked flow/capsule JSON were already in
  the working tree before I started; the commit was staged by explicit path and contains exactly one
  file. `git status` after the commit is identical to `git status` before it.
