# Task 7 Brief: Show partial disclosure to the verifier

**Source of truth:** `docs/superpowers/plans/2026-09-29-holder-controlled-disclosure.md`, Task 7.
**Base commit:** `10ac3ea`.
**Status:** READY. One placement defect in the plan and one styling conflict, both corrected below.

## Design decision now settled

The controller ruled on the question Task 4's review escalated: **`DisclosureInfo.total` stays.**
A verifier told `disclosed=2, total=3` learns the holder withheld exactly one claim, and the key
itself stays hidden. The count is a deliberate trade for honest partiality signalling — the
verifier knows they are missing something rather than looking at a document that happens to have
three fields. The plan mandated it verbatim and the feature's stated purpose is honest signalling.

So the plan's notice wording, which names both numbers, is correct and should be kept. Do **not**
"improve" it into presence-only signalling, and do not strip the numbers.

## Binding invariants for this task

- **The notice must not imply the credential is incomplete or suspect.** It is still valid,
  still anchored; the viewer is seeing fewer details, not a different document. That sentence is
  the point of the whole notice.
- **The notice must not imply the withheld claims were removed from the record.** They were
  withheld from *this view* by the holder; the credential itself is unchanged and the downloaded
  file still contains everything.
- **A valid result with no visible claims is exactly the case that needs the notice most.** A
  verifier seeing a valid credential with no attribute table and no explanation would reasonably
  conclude the document is empty. That must not be the outcome.
- Show it only when `disclosure` is present and `disclosure.complete` is `false`. Absent
  `disclosure`, and `complete: true`, mean say nothing.
- One file. No backend, no dependency, no new files.

## Pre-flight findings (verified against the code)

**1. The plan's placement makes the notice disappear in the case it exists for.**

The plan says to add the notice "immediately after the block that renders the claim list". In
`ResultCard.jsx` the claim list lives inside a guard:

```
ResultCard.jsx:164   {claimEntries.length > 0 && (
ResultCard.jsx:165     <section>
ResultCard.jsx:166       <h3 className="section-title">Certified attributes</h3>
...
```

So a notice placed inside that block renders **only when at least one claim is visible**. When a
holder hides *every* claim, `claims` is an empty map, `claimEntries` is `[]`, the whole section
including the notice is skipped — and the verifier gets a valid, anchored credential with no
attribute table and no statement that anything was withheld. The panel's own "Hide everything"
button makes that a one-click state, and the empty case is a first-class outcome the backend
already models (`disclosed: 0, total: N, complete: false`).

Render the notice **outside** that guard, as its own element, so it appears whether or not any
claim survived. Keep the "Certified attributes" section itself gated exactly as it is — an empty
table would be worse than none.

**2. The plan hardcodes a hex the design system does not have.**

The plan's inline style is `color: '#b45309'`. The repo's token is `--warn: #92610a`
(`index.css:46`), and it is what the rest of the codebase uses — including `DisclosurePanel.jsx`
in the previous task. Use `var(--warn)`. Same for spacing: the file uses `var(--space-*)` tokens
throughout, so follow that rather than a bare `marginTop: '8px'`.

**3. For reference, the states that must NOT show the notice.** The backend returns
`DisclosureInfo(0, 0, true)` on both failure paths (`VerificationService.failure` and the
empty-upload rejection in `VerifierController`), and `complete` is derived from
`visible.size() == allClaims.size()`, so a policy naming a claim the credential no longer has
withholds nothing and is also `complete: true`. Both are correct silences — do not "fix" them.

## Step 1 — Destructure the field

`ResultCard.jsx:44-61` destructures the result. Add `disclosure` to that list, alongside `claims`.
It is the last component the backend appends to `VerificationResult`, so it belongs at the end.

## Step 2 — Render the notice

Add it after the "Certified attributes" section, **outside** the `claimEntries.length > 0` guard,
guarded on `disclosure && !disclosure.complete`.

The plan's wording is right — keep it, adjusted to the tokens above. It must convey, in order: the
credential is partly disclosed, how much the holder shared, that the holder withheld the rest, and
that the document is still valid and anchored. `role="status"` is correct for a non-interrupting
status message; keep it.

One thing to get right: with the count kept, "shared 0 of 3" must read sensibly, since that is a
real and reachable state. Check the sentence against that value, not only against a partial one.

## Step 3 — Lint and build

```bash
cd /home/grim/Projects/CertiChain/frontend && npm run lint && npm run build
```

Expected: no errors, **five** warnings, same files, none silenced. As in the last two tasks,
`npm run build` is not evidence of behaviour — it will compile this notice appearing in the wrong
place just as happily as the right one.

## Step 4 — Commit

Stage only `frontend/src/components/verifier/ResultCard.jsx`, by explicit path. Never
`git add -A`, `git add .`, or `git commit -a`; uncommitted Reticle artifacts are in the tree.

```
feat(ui): tell a verifier when a credential is partly disclosed

A filtered view that looks identical to a whole one is how a verifier
ends up drawing a wrong conclusion from correct data.
```

## Self-review before reporting

- Does the notice render when **zero** claims are visible? Trace it.
- Does it stay hidden when `disclosure` is absent, and when `complete` is true?
- Is it outside the `claimEntries.length > 0` guard, with that guard otherwise untouched?
- Does "shared 0 of 3" read correctly, or does the wording break at the empty end?
- Do the copy's two prohibitions hold — no implication of invalidity, no implication the claims
  were removed from the record?
- Any hardcoded hex, or any bare pixel value where the file uses a token?

**No test framework exists in this repo** — do not add one, and do not add dependencies. This
task's whole surface is one conditional paragraph, so the report is the verification: state the
outcome for each of the three cases (partial view, all hidden, complete view) and say plainly that
nothing was executed.
