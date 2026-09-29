# SDD ledger — plan: docs/superpowers/plans/2026-09-29-holder-controlled-disclosure.md

Branch: `feat/holder-disclosure`, forked from `fa94529` (spec + plan commits).
Spec: `docs/superpowers/specs/2026-09-29-holder-controlled-disclosure-design.md` — reachable, binding.
Existing backend suite at fork: 16 tests, all passing. Target: 27.

## Setup rulings

Ruling: execute on a feature branch in the current checkout, not a separate
git worktree — the skill's worktree rule exists to keep work off `main`, which
`feat/holder-disclosure` satisfies, and Task 8 verifies the feature by driving the
running app. A separate worktree would put the code being edited in a different
directory from the code the servers serve on 6969/5173, so the Reticle run would
drive stale code and report a green result that proves nothing. Costs if wrong: a
stray commit lands on the branch instead of `main` — recoverable, not destructive.

Ruling: the uncommitted Reticle artifacts (3 modified, 7 untracked) stay uncommitted
in the working tree and are never staged. Global Constraint 12 already requires
staging only task-named files; every task's commit step uses explicit `git add <path>`,
never `git add -A`. Costs if wrong: verification artifacts land in a feature commit.

## Pre-flight conflict scan

Cross-task rows (one per pair sharing a file or an interface):

| Producer → Consumer | Interface / file | Finding |
|---|---|---|
| T1 → T2 | `CredentialDisclosureRepository#findByCredentialId`, `CredentialDisclosure#getHiddenClaims` | Consistent. T1 produces, T2 consumes as a `Optional` and defaults to empty set. Clean. |
| T1 → T4 | `CredentialDisclosureRepository#findByCredentialId` | Consistent. T4's `applyDisclosure` treats absent row as `Set.of()`. Same default as T2 — no divergence. Clean. |
| T1 → T8 | `CredentialDisclosure` in `DisclosureContractTest` | Consistent. T8's raw-download lock depends on T1's entity existing. Clean. |
| T2 → T3 | `HolderService` (same file, sequential) | T2 produces private `requireWalletEntry` / `loadClaims` and the new constructor; T3 consumes both and appends `setDisclosure`. Ordered, no overlap. Clean. |
| T2 → T6 | `DisclosureResponse {claims, hiddenClaims}` | T6's `getDisclosure` consumes exactly this shape. Clean. |
| T3 → T6 | `PUT` body `{hiddenClaims}`, endpoints under `/api/holder/credentials/{id}/disclosure` | T6's `setDisclosure` posts the same list. Clean. |
| T4 → T7 | `result.disclosure {disclosed, total, complete}` | T7 destructures `disclosure` and reads `.complete`. Matches T4's `DisclosureInfo`. Clean. |
| T4 → T8 | `applyDisclosure` semantics | T8's contract test asserts full claims in raw download while T4 filters only the verifier result. No contradiction — different code paths. Clean. |
| T5 → T8 | `claims` object in issue payload | T5 builds an arbitrary map; backend already accepts up to 50. T8 drives it live. Clean. |
| T6 → T7 | CSS classes / notice styling | Different components, no shared file. Clean. |

Self-consistency row (each task's own text vs its own specified code):

| Task | Finding |
|---|---|
| T1 | Self-consistent. Entity, migration and repository agree; no pre-existing dependency. |
| T2 | Self-consistent. DTO shape matches the spec's amended full-claim-map response. |
| T3 | Self-consistent. Request record matches the PUT consumer in T6. |
| T4 | **Two defects found, both fixed below.** |
| T5 | Self-consistent. Explicitly states no unit tests exist and defers proof to Task 8. |
| T6 | Self-consistent. `CLAIM_CAP` duplication with T5 is a non-issue (different components, different caps shown). |
| T7 | Self-consistent. Reads only what T4 produces. |
| T8 | Self-consistent. Depends on T1-T7, all ordered earlier. |

### T4 rulings

Ruling: `DisclosureInfo` is a **top-level** record in
`com.certchain.certchain.dto.response`, not a nested member of `VerificationResult`
— Task 4's Interfaces block still said "as `VerificationResult.DisclosureInfo`",
which contradicted both its own Step 1 (which creates the top-level file) and the
plan's File Structure table. The top-level form matches the existing DTO
convention and `DisclosureResponse` beside it. Stale text from an earlier draft;
removed. Costs if wrong: none — a rename at worst.

Ruling: Task 4 Step 4's expected compile failure now reads "no ten-argument
constructor", not "no eight-argument constructor" — the real
`VerificationService` constructor takes nine parameters and the test passes ten
with `disclosureRepository` appended. I corrected the test's call site during plan
self-review but left this prose behind, and a subagent told to expect eight would
have mis-read a correct result as a wrong one. Costs if wrong: an implementer
double-checks a green run.

Both edits are committed with Task 1's dispatch only if that task's diff touches
this file; they are plan-doc corrections and ride along in a docs commit.

## Task log

(entries appended as work proceeds)

## Task 1: Persistence for the disclosure policy

Ruling: the implementer subagent's harness denied `bash` outright, so it wrote
its three files but could not run the suite or commit, and returned BLOCKED. I
ran the two blocked mechanical steps myself — `./mvnw test` and an explicit
`git add <3 files> && git commit` — and dispatched the task reviewer as normal,
so the code still receives its full review. I did not write or alter any
implementation code; the subagent did. Costs if wrong: none to the code; the
only loss is that the test evidence in the report came from my run rather than
the implementer's own.

Subagent deviation flagged for the reviewer: used `import jakarta.persistence.*`
rather than the brief's eleven explicit imports, on the grounds that all 9
existing files in the model package use the wildcard.

Verification run by controller: Flyway validated 9 migrations, current v10,
migrated to v11; `EntityManagerFactory` initialized under `ddl-auto: validate`,
so the `@ElementCollection` mapping validates against the real schema — the one
novel construct the implementer could not verify. Suite 16/16, 0 failures,
0 errors, 0 skipped. Commit 9ae8c5b.

Task 1 review (base 8413c7c, head 9ae8c5b): spec ✅, quality **Needs fixes**.
Spec compliance verified line-by-line: pure-DDL migration with no backfill
(constraint 2), keys-not-values storage (constraint 3), no envelope reference
(constraint 1), derived query resolves because the entity property is
`credential` and `Credential`'s id is a UUID, and the unique constraint on
`credential_disclosures.credential_id` is what keeps that query returning
`Optional` rather than throwing on a second row.

Fix round 1/5 open finding:
- **Important, plan-mandated:** `CredentialDisclosure#setHiddenClaims` replaces
  the field. Under field access, Hibernate only tracks the `PersistentSet`
  instance it created at load time, so assigning a plain `LinkedHashSet` to a
  MANAGED entity leaves the new set unregistered and flush writes nothing —
  silently.

Ruling: this finding is real and **live, not latent** — the plan's own Task 3
write path does `findByCredentialId(...).orElseGet(() -> new CredentialDisclosure(...))`
(plan:766) and then `disclosure.setHiddenClaims(requested)` (plan:769). When a
policy row already exists the found entity is managed, so the holder's second
and subsequent changes to their own policy would silently do nothing. I chose
the reviewer's fix option (a), mutating the live collection, over option (b),
deleting the setter: option (b) would contradict the plan's Task 3 code, which
depends on the setter existing. The field is initialized at
`CredentialDisclosure.java:32`, so `clear()` + `addAll()` is correct for a fresh
instance too. The constructor's field assignment at `:42` is NOT the same bug —
it only ever runs for a transient entity that Hibernate wraps at persist time —
so I am leaving it alone. Costs if wrong: a reviewer's read of Hibernate
collection semantics differs from mine, in which case Task 3's write path fails
loudly in Task 3's own tests rather than corrupting data.

Task 1: minor (deferred): asymmetric FK delete rules within V11 —
`credential_disclosure_claims` cascades from the disclosure row, but
`credential_id -> credentials(id)` states no rule, so deleting a credential
holding a policy fails on an FK violation. Real, deferred: decide whether
credentials are ever deleted (ledger semantics suggest not) and record the
intent as `ON DELETE CASCADE` or explicit `ON DELETE RESTRICT`.
Task 1: minor (deferred): `new LinkedHashSet<>(null)` NPEs at
`CredentialDisclosure.java:42` and `:58`; a null set arguably means "hide
nothing" per constraint 2. Task 3 validates before calling, so nothing is
broken today.
Task 1: minor (deferred): `unique = true` at `CredentialDisclosure.java:18` is
documentation only under `ddl-auto: validate`, and would generate a
randomly-named constraint under `create`. The deliberate name lives in V11.
Task 1: minor (deferred): redundant `DEFAULT gen_random_uuid()` at `V11:2`
alongside `@GeneratedValue(strategy = UUID)`, which assigns client-side.
Task 1: cleared (not a finding): the wildcard-import deviation was checked
against all 9 pre-existing model-package files and matches the codebase
convention unanimously.

Task 1: fix round 1/5 dispatched and committed as eb55113. The implementer
correctly reported that the 16/16 suite does NOT cover this fix — nothing in it
calls setHiddenClaims on a managed entity, so it passes identically against the
buggy code. Carried forward: **Task 3's dispatch must require a regression test
that loads a managed CredentialDisclosure, calls setHiddenClaims, flushes, and
re-reads.** It is not optional and not deferrable to the final review, because
this is the exact failure the task review had to catch by reading.

Ruling: the covering test is required in Task 3 rather than added here, because
Task 3 is where the write path first exists and a test added now would have to
mock the very persistence behaviour it exists to prove. Costs if wrong: Task 3's
implementer omits it and the bug can silently return — mitigated by carrying it
explicitly in the Task 3 dispatch.

Task 1: fix round 1/5 (1 addressed, 0 open; commits 9ae8c5b..eb55113)
Task 1: complete (commits 8413c7c..eb55113, review clean)
Task 1: minor (deferred): `setHiddenClaims(getHiddenClaims())` now wipes the set
— clear() empties the source before addAll reads it. Behaviour change from the
old setter's no-op. No caller does this; the only caller is Task 3. Carried into
the Task 3 dispatch as a constraint: never pass the entity's own live set back
into its setter.

## Task 2: The holder's read path

Review (base eb55113, head 737af3b): spec ✅ on all seven brief requirements,
quality **Needs fixes**. The unlisted fourth file was NOT scope creep — the brief
names `HolderServiceClaimTest.java` in its own Step 8 and Step 10, and the change
was two imports and one constructor argument list with no assertion, stub or test
method touched, so the subject-only claiming regression test was not weakened.

Ruling: the `requireWalletEntry` deviation is ACCEPTED, do not revert. The brief
said "rather than copy it a third time" while naming only one of two existing
copies; the implementer found both and replaced both, −11 lines, behaviour
identical. Following the brief literally would have preserved the duplicate the
sentence exists to remove. Costs if wrong: none — the extraction is provably
character-for-character equivalent, and `contextLoads` plus the untouched claim
tests cover the result.

Fix round 1/5 open findings (all four Important, two of them plan-mandated):
1. `catch (Exception ex)` swallows `InterruptedException` without restoring the
   interrupt flag. `ipfsService.retrieve` declares it and its blocking
   `httpClient.send` throws it, so a shutdown or request timeout mid-fetch strips
   the signal and the thread never learns it was interrupted. Plan-mandated — the
   brief supplied the bare catch.
2. The 503 discards the cause and logs nothing, so every IPFS outage and every
   malformed envelope collapses to one opaque message. Plan-mandated. Ruling: fix
   by attaching the cause to the `ResponseStatusException`; no logger needed.
   Costs if wrong: an outage is still diagnosable from the response's cause chain.
3. The 503 branch has no test at all. The whole branch a real outage lands in is
   unverified. Ruling: add one test stubbing `retrieve` to throw.
4. **Global Constraint 6 — the invariant this task exists to establish — has no
   test guarding it.** `reportsExistingHiddenSet` asserts the hidden list is
   `["gpa"]` but never that `claims()` still CONTAINS `gpa`. The mutation that
   slips through is a later edit filtering hidden keys out of the returned map —
   and Task 4 is about to add exactly that filtering to this same service. All
   four current tests still pass under that mutation. Ruling: add
   `assertThat(response.claims()).containsEntry("gpa", "3.9")`. This is the same
   false-green shape Task 1 was corrected for, one level up.

Ruling on findings 1 and 2 together: fix by splitting the catch — an
`InterruptedException` branch that restores the interrupt flag, and an
`IOException`/remainder branch — with the cause attached in both. This satisfies
both findings in one edit and is smaller than adding a logger. Costs if wrong: a
different exception type escapes uncaught; the reviewer enumerated the declared
throws set (`IOException`, `InterruptedException`), so the split is exhaustive.

Task 2: minor (deferred but folded into this round anyway): unused import
`com.certchain.certchain.model.Issuer` at `HolderDisclosureServiceTest.java:272`.
Deferred by the rules, but it is one line of dead code introduced by this very
commit in a file this very commit created, so deferring it would mean leaving a
known-unused import for the final review to find. Removed in the same fix round.
Task 2: minor (deferred): bare `catch (Exception ex)` is the house pattern in
`VerificationService` and `IssuerKeyService`, so findings 1-2 are not local
sloppiness but a codebase-wide habit. Out of scope here; the final review should
judge whether it warrants a sweep.
Task 2: plan-doc defect fixed by controller: brief Step 9 used
`-Dtest='A+B'`, which surefire 3.5.6 rejects. Corrected to a comma in the plan.

Task 2: fix round 1/5 (4 addressed, 0 open; commits 737af3b..7c30f52)
Task 2: complete (commits eb55113..7c30f52, review clean)

Task 2: minor (deferred): attaching the cause to the `ResponseStatusException`
does NOT reach the application log — Spring serves a 5xx without logging it, so
an IPFS outage still leaves no trace in the app log. Verdict from the re-review:
observability gap, not correctness; the cause is on the exception and will
surface through any `@ControllerAdvice` added later. Injecting a logger into one
method of a codebase that logs nowhere is a branch-wide convention decision, not
a Task 2 one. Final review should decide whether the branch needs logging.

Task 2: NOT a finding, closed with evidence: the re-review flagged that
`getDisclosure` NPEs if `requireWalletEntry(...).getCredential()` returns null,
surfacing a 503 instead of a 404. `holder_wallets.credential_id` is `UUID NOT
NULL` (V8:7) and the entity declares `@JoinColumn(nullable = false)`
(`HolderWallet.java:29`), so the state is unreachable. A guard would be dead
defensive code. No action.

Task 2: minor (deferred): the new tests assert the status via
`hasMessageContaining("503")`, which depends on Spring 6 formatting `getMessage()`
as `503 SERVICE_UNAVAILABLE "…"`. Works today and matches the sibling 404 test's
idiom; `extracting(e -> ((ResponseStatusException) e).getStatusCode())` would be
version-proof. Polish.

Task 2: minor (deferred, unverifiable in a read-only review): the mandated fix
sets the interrupt flag on a Tomcat worker thread that is then about to write a
503 body. A pending interrupt flag plus NIO socket writes is a known
`ClosedByInterruptException` hazard, so response delivery under a genuine
interrupt is unproven. It only manifests during shutdown or timeout, where
delivery is moot. Flagged for the branch, not this task.

Plan-doc fix by controller: removed the unused `Issuer` import from the plan's
copy of the test file, so Tasks 3+ do not copy-paste it in. Committed with the
next docs change.

## Task 3: The write path, its validation, and the endpoints

**Ruling that overturns an earlier ruling of mine.** The Task 3 implementer
escalated with NEEDS_CONTEXT to report that the mandated regression test could
not be written, because its premise is false on this stack: with the ORIGINAL
field-assigning setter, the write still persists. It backed that with a
`@DataJpaTest` against real PostgreSQL and a 3-case matrix asserting on the raw
table via native query.

I did not take that on trust, because it contradicts a ruling I had made and
recorded, and because a factually false comment is currently committed in
`CredentialDisclosure.java`. I reproduced the experiment myself: reverted the
setter to `this.hiddenClaims = new LinkedHashSet<>(hiddenClaims)` and ran
`CredentialDisclosurePersistenceTest`. Result: **1 test, 0 failures, 0 errors —
it passes against the form the review called a silent-write-loss bug.** The
implementer is right and I was wrong.

Ruling: the Task 1 Important finding is **retracted as a false positive**. Its
reasoning was Hibernate 5-era. On Hibernate 6.6.53 (Spring Boot 3.5.16) the
flush-time processing re-wraps a plain collection that replaced the tracked
wrapper, so the collection table is recreated (observed `delete` + `insert`) and
the write lands. The finding came from a code-reading review, not an execution;
persistence behaviour of this kind is settled by running it, not by reasoning
about the ORM.

Ruling: keep the ORIGINAL one-line field-assigning setter and delete the
`clear()`+`addAll()` variant. It is simpler, it is self-contained (the other form
depends on the field initializer to avoid an NPE), it keeps the defensive copy,
and it is immune to the self-assignment trap that the mutating form has —
`setHiddenClaims(getHiddenClaims())` wipes the set under `clear()`+`addAll()`
but is a harmless no-op under field assignment. Costs if wrong: nothing
observable; both forms persist correctly on this stack.

Ruling: the block comment at `CredentialDisclosure.java:57-61` must be deleted,
not reworded. It asserts "a new Set assigned here would never be written back",
which is now measured to be false. A wrong comment is worse than no comment
because it invites a future developer to "fix" working code. The persistence
test is kept but reframed: it is a genuine test of the write path's persistence
and the suite's only such coverage, NOT a regression test for a bug that never
existed. Its name and comment must stop implying otherwise.

Process lesson, recorded because it will recur: a review finding that asserts
framework runtime semantics from code reading is a hypothesis, not a verdict.
Where the claim is about what a framework does at runtime, require the
experiment, or mark it ⚠️ for the implementer to settle.

### Task 3: COMPLETE — commits `ebb6c24`, `5021e3a`, `38d21a6`

Approved after one review and one fix round. Both Important findings were real and both are
closed with evidence, not assertion:

- **False `clear()` comment** — `HolderService.java:219-222` carried the retracted
  investigation's mechanism verbatim, in a second file. The first half of the comment
  (an empty request still writes a row, so "hide nothing" is a stored decision) is
  load-bearing and survived; the false half is gone. `rg` for `clear()`/`addAll` across
  both touched files now returns nothing.
- **Unasserted write path** — the response is built from the `requested` local, so
  echoing it proved nothing about stored policy. `verify(save(any()))` was untyped.
  The implementer demonstrated the gap before fixing it: breaking the write path to
  store `claims.keySet()` — the exact inverse of the feature — left all 28 tests
  **green**. After adding `ArgumentCaptor` assertions, 3 tests fail against that same
  broken code, while the pre-existing response-echo assertions still passed. That is
  the review's argument reproduced as evidence.

The existing-row branch (`orElse(existing)`) was rated higher than the review did: the
row is loaded *inside* the `@Transactional` `setDisclosure`, so production hands the
setter a **managed** entity — the one place the re-wrapping behaviour actually applies,
and the path any holder changing their mind takes. It now has coverage.

Controller verified independently: full suite **29 passing, 0 failures, 0 errors**,
`BUILD SUCCESS`. Not one test was weakened to get there; the count rose 28 → 29.

**Reviewer concurred with the retraction on its own reasoning**, citing Hibernate
6.6.53.Final's `WrapVisitor` re-inspecting attribute values at flush and re-wrapping a
field now holding a raw collection — and noting the observed
`delete` + `insert` signature is that mechanism, not the Hibernate 5 silent-drop. It
also declined to defer: its one departure from the implementer's own account was finding
#1, which existed *because* the earlier skip was costless. Recorded, because it is the
right way to review a contested ruling.

### Task 4: COMPLETE — commit `181fc81`, suite 29 → 34

Approved on the first review, no fix round. The implementer caught two false greens — one of them
in a test **the controller itself wrote into the brief** — and proved both by substitution
instead of by argument. That is the outcome the RED-phase discipline exists to produce.

- **The brief's 5th test was unsatisfiable.** It hid `gpa`, which was in the fixture, then
  asserted all 3 claims were still disclosed. Fixed by changing only the key list; all five
  assertions and the intent survived. The controller's brief carried the defect, not the
  implementer.
- **`preservesClaimOrder` could not detect the `HashMap` substitution it exists to prevent.**
  Reviewer independently probed and confirmed *both* coincidences, including that renaming a
  fixture key alone still isn't enough: after one key is removed, a fresh `HashMap` iterates
  `[program, honors]` too. Only the newly-added unfiltered-order assertion diverges
  (`[program, gpa, honors]` vs `[gpa, program, honors]`). The original test was cosmetic
  protection for a real invariant.
- **The pre-flight `complete` correction is the only guard.** Hand-checked: all four original
  tests produce identical answers under `hidden.isEmpty()` and under the corrected formula.
  `stalePolicyKeyDoesNotClaimPartiality` alone catches the bug. Without pre-flight this shipped.

The reviewer verified the presentation-only invariant by tracing line numbers rather than
trusting the comment: checks complete at `:210` (CHECK 1), `:224` (CHECK 2), `:238` (envelope
hash), `:257`/`:275` (CHECK 3 signature), `:295`/`:306` (status/expiry), `:390-419` (anchor
fetch **and** `verifyAnchor`) — all ahead of the filter at `:425`. The filter's only outputs are
`result.claims()` and `result.disclosure`; the envelope is never mutated and a new
`LinkedHashMap` is built. It also confirmed the filtered map is terminal: nothing downstream
reads `result.claims()` for hashing, signing, anchoring or persistence, and
`VerificationHistoryService.record` consumes only `credentialNumber`/`status`/`reason`.

Implementer self-reported a duplicated `forEach` block that kept the suite **green**, caught by
reading its own diff. Correct read: a passing suite is not sufficient evidence here.

**Open design decision, escalated not fixed** (reviewer Important #1, correctly labelled a
controller decision): `DisclosureInfo.total` discloses the *number* of withheld claims. A
verifier told `disclosed=2, total=3` learns the holder withheld exactly one claim while the key
itself stays hidden. In a selective-disclosure scheme the count is itself holder-private. The
record's javadoc only covers the "don't mistake partial for whole" case. Carried to the final
review as a conscious-acceptance question for the human — the brief mandated it verbatim, and
the reviewer declined to change code unilaterally.

Deferred, agreed: dead DB read on the failure path (`allClaims` is `Map.of()` there, so the
lookup is provably unused); untested `success()` → result wiring (needs an integration fixture
the brief did not ask for); the order test's first assertion is `HashMap`-blind, which its own
comment now states so nobody deletes the load-bearing second half.

### Task 5: review round 1 — three Important findings, one class

The review found no Critical issue and confirmed the central defect is fixed, but three
Important findings, all at the same trust boundary — **what gets signed into an immutable
artifact**. Recording the pattern rather than just the list, because it will recur in every
task that builds a UI over signed data.

- **The cap is off by one against the backend.** `trimmedRows.length >= CLAIM_CAP` gates
  *add buttons*, but typing a key into a pre-existing blank row is not an `addRow` call, so
  50 rows plus the seeded `recipientName` is a 51-entry map that `@Size(max = 50)` rejects with
  a 400 — while the counter reads a reassuring "50 / 50". The ceiling this task exists to
  expose is exceeded by the one key the task itself chose to seed.
- **A key with a blank value is now signed in as `""`.** The old code guarded every field
  (`if (gpa.trim()) obj.gpa = ...`); the new loop does not, and `:224` demonstrates the correct
  pattern two lines later. Reachable in one click: `+ gpa`, leave the value empty, sign. The
  brief mandated this loop, and the brief's own immutability invariant is what makes it matter.
- **The primary CTA is a silent no-op in the duplicate state.** The guard returns without a
  message and the "Sign & Issue" button is not `disabled`, while the `role="alert"` lives on the
  *previous* step. The brief asked for the guard and got half a guard.

Confirmed correct, and worth not re-litigating: the `useRef` id is the only writer in the file,
`removeRow` cannot rewind it, and the wizard reset does not clear `claimRows` so the ref is
never reused. `Gpa` vs `gpa` is deliberately *not* a collision — `:222` writes two distinct
object keys, so nothing is lost. Both implementer deviations hold: the `useRef` correction of
the brief's unsatisfiable "in state" wording, and the `recipientName` seed, whose two consumers
(`ResultCard.jsx:63`, `CertificateDiplomaModal.jsx:50`) the reviewer verified independently.

Deferred to the next fix round: the reserved-key diagnostic names the wrong remedy (#4);
`claimRows` survives "Issue Another Certificate" (#5, pre-existing, but the surface grew from
4 fields to 50 rows); the "Next: Academic Attributes" label is stale (#6); no `aria-invalid`
on the conflicting rows though the stylesheet defines it (#7); the counter counts keyed rows so
blank rows are uncapped and uncounted (#8); some comments restate the brief rather than
explaining the file (#9).

### Task 5: COMPLETE — commits `652fec2`, `458d393`

Approved after one review and one fix round, no fix round needed. All three Important findings
were the same shape — ways for an immutable artifact to come out wrong — and all three are
closed at the layer that matters rather than worked around.

The fix round's structural result is worth recording: **the payload invariant, the submit
gate, and all three UI numbers now derive from one quantity**, `claimCount`
(`IssuerStudio.jsx:102`), which counts the `recipientName` seed the issuer cannot see. The
400-with-a-cheerful-counter is unreachable — the reviewer could not construct any input
reaching `assembleClaims` with a blank value, a duplicate, or more than 50 entries. The
reviewer also proved the counter's deliberate over-count is the *safe* direction: it is an
upper bound on payload size at every point, where counting unique keys would under-report.

The implementer's two declared judgment calls were both upheld:
- **Dropping blank-valued rows rather than rejecting them** — sound, because the counter
  (`:834`) and the step-4 chips (`:919`) both read `signedRows`, so the preview can never
  show a claim that will not exist. A warning would be a permanent nag, since a just-created
  `+ gpa` row is blank by construction.
- **Counting rows rather than unique keys** — sound, and stronger than the implementer argued.
  The `3 / 50` against a 2-entry payload reads oddly but the state is blocked either way.

The reviewer's most useful output was refusing the implementer's own excuse on one point and
strengthening the rest: it noted the fix round **widened** the submit guard to three terms
while gating the explanation on one, so two pre-existing terms still dead-end — a contrived
path through the ungated wizard nav leaves Sign disabled with no visible cause. Not a
regression, hence Minor, but it is exactly the shape of Important #3 surviving on the terms
nobody touched. Deferred.

Also recorded, as a false-positive block rather than a false-negative one: a blank-valued row
keyed `gpa` alongside a complete `gpa` row blocks issuance even though the payload would have
been valid, because the duplicate check reads `keyedRows` and the payload reads `signedRows`.
Clearable with one Remove click. The two-list split is deliberate and was stated, so it stays.

**Verified by controller after the fix round:** lint 5 warnings (unchanged, none silenced, same
five files), `vite build` clean, backend suite 34 passing / `BUILD SUCCESS` — the frontend task
did not disturb the backend.

**Unverified, and it matters:** this task has **no executed verification of its own**. There is
no frontend test framework, the state-transition proof was a throwaway simulation outside the
commit, and `npm run build` compiles the duplicate-id bug cleanly. Task 8's Reticle drive —
including a rapid double-click on "Add claim" — is the first real check. Recorded so the
branch review does not read five green tasks as five verified ones.

### Task 6: COMPLETE — commits `e064afe`, `10ac3ea`

Approved after one review and one fix round. The plan contained a **real defect the brief caught
before it shipped**: the panel's `toggle` error path rolled back to
`setHidden(new Set(Object.keys(claims)))` — on a *failed* save, hiding every claim, the exact
opposite of what the holder just asked for, and a state the server had rejected. `setAll` had no
rollback at all. Fixed by collapsing both paths into one `save(next, previous)`, which is the
right shape: the plan's bug was two owners of an error path with two different wrong answers, and
one owner cannot drift from the other.

The review checked the one thing that would have made that fix a trap. `previous` is a **live
reference** to the `hidden` Set, so restoring it is worthless if anything mutates a Set in place.
Every write copies first (`new Set(previous)` before any `delete`/`add`, `new Set(...)` on every
other assignment), so the reference is still the server-held set at rollback time. Verified rather
than assumed.

The plan's mounting step was also unexecutable: it said to render inside "the per-credential
card", and `HolderWalletView.jsx` has no cards — it is a responsive table. Mounted as a sibling
`<tr>` with a `colSpan={5}` expanded row, key on the `Fragment`, real column count confirmed at
`:207-213`. And the plan's `onError` prop would have routed a disclosure failure into the
page-level `setError`, replacing the whole wallet with an `ErrorState` whose retry reloads the
wallet — wrong for that failure. The panel owns its error state, visible in the collapsed branch
too, so a load failure is never a silent no-op.

**Both fix-round findings were one-liners, and the second was found by reading rather than
running.** A dangling `aria-controls` — the button pointed at a `useId()` that existed in the view
while the panel rooted itself with a *different* `useId()` inside the component, so the reference
resolved to nothing — and a `|| {}` that turned a malformed non-JSON 200 into a confident "this
credential has no claims to choose from", indistinguishable from a genuinely empty credential.
Now one id, passed down; and a response with no `claims` object throws while `claims: {}` stays
legitimately empty. Verified by reading both files after the edit: the panel's internal `useId` is
gone entirely, so there is no second id left to drift.

**Two consecutive implementer reports carried a confident claim that was false when checked against
the code** — the `aria-controls` pairing, and a claim that `||` versus `??` at
`DisclosurePanel.jsx:62` would discard a "share everything" answer. It would not: an empty array is
truthy, so the operators are identical for a list-or-absent value. The code was always correct;
only the reasoning was wrong. The report was amended, because the report is this task's
verification record and it would otherwise invite a future reader to "fix" working code. Worth
watching: fluent, confident claims about code are cheaper to make than to check.

**Unverified, and it compounds Tasks 5 and 6:** neither frontend task has any executed check. No
test framework, both state-transition proofs traced by reading, and neither fix in this round is
observable to a compiler — an id is a containment property, and the empty-versus-unreadable
distinction only appears if a Reticle drive stubs a bad response. Lint 5 warnings (unchanged, same
files), `vite build` clean, verified by the controller. Tasks 7 and 8 remain, and Task 8's drive is
the first real evidence for any of it. **Six of nine tasks done is not six verified.**

### Task 7: COMPLETE — commits `4bfa4c7`, `e0490c5`

Approved after one review and one one-line fix. The unresolved design question from Task 4 —
whether to show the withheld count — was settled by the controller as **keep it**: `disclosed=2,
total=3` tells a verifier the holder withheld exactly one, which is a deliberate trade for honest
partiality signalling over presence-only SD-JWT-style signalling. The plan mandated it verbatim,
so the plan's wording naming both numbers is correct and the implementer was told not to
"improve" it into presence-only. Worth noting the implementer escalated two copy questions rather
than improvising on ruled-on text, and the review concluded both were already fine — "partial" in
ordinary English includes zero, and the very next clause disambiguates regardless. The reviewer's
framing was better than the implementer's, which is the value of escalating instead of editing.

**The brief caught the plan's one real defect before it shipped.** The plan said to add the notice
"immediately after the block that renders the claim list" — but that block sits inside
`{claimEntries.length > 0 && (...)}`, so a notice placed there renders *only when at least one
claim is visible*. When a holder hides every claim the whole section, notice included, is skipped,
and the verifier gets a valid anchored credential with no attribute table and no statement that
anything was withheld. The panel's "hide everything" makes that a one-click state, and the backend
already models it as `disclosed: 0, total: N, complete: false`. The notice is now a *sibling* of
the guard, verified structurally rather than trusted from the report, and the guard is otherwise
untouched so the empty table is still suppressed. The placement is one re-indent from regressing
and the reason is invisible from the diff, so it carries a comment.

Also caught by the implementer and worth recording: **the plan's `className="hint"` does not
exist in this codebase.** Shipping it would have produced an unstyled paragraph. The implementer
used the real `section-note` and then dropped the plan's `marginTop` entirely rather than swapping
`8px` for a token, because `card__body` already has `gap: var(--space-6)` and a margin would have
double-counted. Adding nothing was correct, not lazy.

**The fix round is the interesting part, and it came from the review's Minor #2, not from a
complaint about the diff.** The notice states the credential "is still valid and anchored".
Reviewer traced all nine `failureForCredential` sites and confirmed an *invalid* card can never
reach it — but only because those sites pass a `null` envelope, which lands on `(0,0,true)` for a
reason three files away and unrelated to this notice. Surface claims on a failure path, which is a
plausible next change, and a tampered card would assert its own validity. `isValid` was already
destructured at `:64`, so the guard became `isValid && disclosure && !disclosure.complete` — one
condition, zero behaviour change today, hazard removed. A comment explains why the condition is
load-bearing, because the next person to widen a failure path would otherwise delete it as
defensive.

Reviewer also found the implementer's report was right about invalid results staying silent but
wrong about the *mechanism* — it named the four `failure` sites (unknown credentials) rather than
the nine `failureForCredential` sites (known but invalid), and the conclusion only holds by
coincidence rather than by the stated path. Third report this plan where the conclusion was right
and the reasoning was not.

**Remaining Task 7 copy inconsistency, deferred as Minor and plan-level:** the notice says
"claims" while the section above is headed "Certified attributes" with columns "Attribute" /
"Certified value". A verifier could read two quantities. It holds together because the notice
explains the missing table and "claim" is the W3C term, matching the holder panel. Unify the terms
if they are ever unified; not this commit's defect.

**No executed evidence, seventh and eighth task in a row to go without it.** Lint 5, build clean,
verified by the controller. All three render cases traced from source. Task 8 is the only thing
left and it is the one that would actually run any of this.

### Task 8 Round A: COMPLETE — commit `63d6cff`

Two contract locks added, suite at **36 passing, 0 failures, 0 errors, 0 skipped**. One new test
file, zero files under `src/main` in the commit.

**The plan's version of this test did not lock what it claimed to lock.** It mocked
`CredentialDisclosureRepository`, never stubbed it, and never used it — so it asserted only that
bytes pass through a method that currently contains no filtering, which is true for reasons having
nothing to do with disclosure. The regression most likely to break the promise is someone wiring
claim filtering into the download path, since it lives in the same service as
`applyDisclosure` and reads like a tidy-up. With an unstubbed mock that filter would most likely
NPE, or would hit "no policy row" and conclude nothing is hidden — the *correct* default for the
verifier view, and exactly wrong for the download — and the test would have passed with the promise
broken. The repo is now stubbed to report `gpa` hidden while the assertion requires `gpa` present
in the bytes, so the test fails if the download path ever consults the policy for anything. The
commit message stays accurate: it locks the product's sentence, not the method's current shape.

The plan's expected total of 27 was stale and the implementer reported the real 36 with the reason
rather than reconciling to the number: `HolderDisclosureServiceTest` is 12 not 9, and the
real-PostgreSQL persistence test is not in the plan's list at all. Worth noting the discipline of
*not* chasing the plan's number — a plan that specifies 27 is describing the plan author's memory
of the suite, not a requirement, and reporting the discrepancy is the only way it stays visible.

**Round B is the whole remaining risk and it is the opposite of mechanical.** Steps 4–9 rebuild the
backend, start the app, and drive four flows in a browser. Every frontend task in this plan was
approved on *traced-from-source* reasoning, never executed evidence: Tasks 5, 6 and 7 all report
"nothing was executed", and their correctness rests on containment and conditional-render arguments
a compiler cannot check. The first three fixes this plan needed were all found by reading
(`aria-controls` pointing at a `useId()` that was never the panel's id, `|| {}` rendering a
malformed response as an empty credential, the notice's placement inside the empty-claims guard).
Reading has a real hit rate here, which is exactly why it should not be mistaken for a substitute
for running the thing.

### Task 8 Round B: PARTIAL — executed evidence obtained, Drive 4 did not run

A Reticle drive ran for **60 minutes** against the live app (session `s76374080`, run
`drive-s76374080`, profile `dev`, subject `http://localhost:5173/#/verify`). Backend on :6969 with
schema at v11, Vite on :5173 with `VITE_RETICLE_CAPTURE_BODIES=1`, Reticle daemon on :4400 with a
connected page. **70 checks: 46 yes, 18 no, 4 no-fault, 2 unknown. `consoleErrors: []`,
`networkAnomalies: []`, no risks.** Run verdict `partial`; `flows: []`, so nothing was saved as a
replayable flow and this evidence is not reproducible without re-driving.

**The single most valuable result in the whole plan is c69**, and it is the first executed
confirmation of any frontend task:

> heading `"Verified"` + `"Partially disclosed: the holder shared 5 of 6 claims."` +
> `"Anchored at block #3 on chain 31337."` + `"The contents match the digest recorded at issue."` +
> `researchTopic`, `major`, `recipientName` visible.

That is Task 7's Definition of Done observed in a real browser rather than argued from source: the
notice renders, the counts are the *ruled-on* counts (5 disclosed of 6 total — the keep-the-count
decision, exercised for real), the credential is still **valid**, the anchor still **verifies** on
chain 31337, and the digest still **matches**. Three separate claims this feature could plausibly
have broken — validity, anchoring, integrity — all held while a claim was withheld. c43
independently carries `net`-grade consequence for the verifying request itself, which matters
because c69 alone is `presence` grade and, per Reticle's own glossary, a rendered element never
proves an action worked.

**Holder side (Drive 2) substantively passed.** The button (c63), `GET .../disclosure` (c64, c30,
c37), and repeated `PUT .../disclosure` with the summary count actually updating across
`"4 of 6 claims are shared."` and `"5 of 6 claims are shared."` (c31, c35, c36, c40, c65) — that
count transition is the Task 6 panel's server-authoritative response, observed changing, not
traced. Preview rendered "A verifier sees exactly this" (c32, c66), a checkbox toggle fired its own
PUT (c67), and the raw download worked (c68, `GET .../download`).

**Issuer side (Drive 1) substantively passed.** `POST /api/issuer/credentials` fired (c13, c51,
c52, c57), the custom non-preset claim rendered as a real preview row
`"researchTopic : Verifiable Credential Interoperability"` (c34), the duplicate-key guard showed
`"is used by more than one claim"` (c16, c55), and the 50-entry cap produced
`"would carry 51 claims"` (c60) — Task 5's two riskiest behaviours, observed.

**What did NOT run, stated plainly:**

- **Drive 4, the untouched path, did not run at all.** No check in the 70 asserts that a credential
  with no disclosure policy verifies with *no* notice and a full claim set. This is the plan's
  highest-value check and its stated ship blocker: it is the one that would catch a mistake in
  Global Constraint 3, where already-anchored credentials have started behaving differently. A grep
  for any no-notice / complete-view / absence predicate across all 70 returned **NONE FOUND**. The
  feature is therefore **not verified safe to ship against the regression that matters most.**
- The "duplicate key fires **no** request" half of Drive 1 is unproven. c55 proves the error text;
  the combined claim (c14) came back `no-fault`, which is nothing-proved, not a pass.
- Neither state-transition check the brief asked for ran: rapid claim-row add/remove (the `useRef`
  id-collision risk) and the failed-save rollback (the live-`Set` copy risk). The 60 minutes went to
  the happy paths instead.
- Tasks 5, 6 and 7 remain unverified on rollback, cap enforcement under interaction, and the
  malformed-response branch.

**The 18 failures are mostly the agent's own bad assertions, not defects — but that is a judgement,
so the evidence is here rather than the conclusion.** Three patterns. Placeholder predicates the
agent invented and that match nothing: `{"testid":"noop"}` twice (c2, c3), `{"testid":"x"}` (c9),
`{"testid":"recipient-email-filled"}` (c6) — junk, never real checks. Stale expected-count retries
where the *same* predicate is both PASS and FAIL: `"PUT /disclosure"` + `"4 of 6"` is c35 **yes**
but c38 and c39 **no**; `POST /api/auth/login` is c44 **no** but c45 and c62 **yes**; `"would carry
51 claims"` is c59 **no** but c60 **yes**. And the exploratory first phase c1–c25, which is the
agent learning the app's shape.

**c70 needs stating precisely because it is the one failure that could be mistaken for a leak.** It
demanded `gpa`, `honors` and `department` *visible* alongside "Partially disclosed" and the digest
line, and came back `no` with `evidence: null`. c69 — the passing check, immediately before — saw
`researchTopic`, `major`, `recipientName`. So the two differ in exactly the claims the holder had
hidden: a failure of "X is visible" is the **expected consequence of X being hidden**, which is the
product working, not a leak. Read as a leak it would invert the feature's entire purpose. It is
better read as one more stale expectation, but it is a judgement and is logged as such.

### Task 8 Drive 4: PASS (API level) — the untouched path is unchanged

The browser drive never covered Drive 4, and a re-dispatch to cover it came back BLOCKED: that
session had **no `reticle_*` tools at all**, and the stack was down. Both were real. Reticle only
drives from an agent whose harness loaded the MCP tools — the 60-minute run logged
`agent: reticle-mcp` and both later dispatches did not, so tool availability is not something this
controller can assume. Separately, **the machine bounced mid-run**: Docker came back with the
containers at `Up 14 seconds` having previously reported `Up 56 minutes`, which killed the backend,
Vite and daemon outright. Nothing had decayed; the host restarted underneath it.

Rather than leave the plan's ship-blocker unverified, Drive 4's substance was tested against the
live API — the regression lives in `VerificationService.applyDisclosure`, not in the browser.
Script: `/tmp/opencode/drive4_untouched.py` (not committed; it needs a running server and is not a
suite test). It logs in as the holder, finds every credential with **no** disclosure policy, takes
each one's raw download, and POSTs it to `/api/verifier/verify` unauthenticated.

**55/55 checks passed across 4 undisclosed credentials** (1, 2, 1 and 5 claims). On every one:
`disclosure = {disclosed: N, total: N, complete: true}` with **N equal to the envelope's claim
count**, the verifier's claim count equal to the envelope's, and **`no claim is missing from the
verifier view`** (`missing=[]`). So the filtering path leaves credentials that never opted in
untouched, including the 5-claim one most likely to expose a leak. Global Constraint 3 holds
against real data, not just against the unit tests.

**Two of my own assertions were wrong, and both are worth recording because correcting an
assertion is exactly where honesty goes to die.**

First, `anchorVerified` was `false` on all four credentials, and I nearly filed that as a defect.
It is not: **`eth_blockNumber` on Anvil returns `0x0`.** The chain was reset by the Docker bounce,
every pre-existing anchor transaction is gone, and anchor verification cannot succeed for reasons
that have nothing to do with disclosure. Confirmed by inspecting the chain rather than by assuming
a benign cause, and then **reported rather than asserted** — the script prints
`anchorVerified=False (not asserted: Anvil at block 0, chain reset)` so the gap stays visible and
cannot be mistaken for a pass. It is genuinely unverified and needs a re-run against a live chain.

Second, the script asserted `valid == true` on every undisclosed credential and two of them came
back `REVOKED`. Revocation is orthogonal to disclosure and a revoked credential is legitimately
invalid; the assertion was wrong about the domain, not a finding. Those now assert
`REVOKED -> valid:false` instead. The load-bearing disclosure assertions were left exactly as strict
as they were.

**And the first version of the script was a false-positive generator, which is the finding I would
most want a future reader to have.** It called `GET /api/holder/credentials`, which does not exist
— the endpoint is `/api/holder/wallet` — and then did `jload(b) or []` on a Spring 404 body.
**A Spring error object has four keys**, so a 404 rendered as "holder holds 4 credential(s)" and
the script marched on to report that no undisclosed credential existed, with total confidence and
zero data. It now fails loudly on a non-200 and on a non-list body. A check that cannot distinguish
"four credentials" from "four keys of an error" is not a check, and it was one `if st != 200` away
from being obvious. Same species of error as the three frontend bugs this plan found by reading:
each one turned an absent or malformed value into a confident-looking wrong one.
