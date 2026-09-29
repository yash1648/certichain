# Task 3 report: the write path, its validation, and the endpoints

**Status: NEEDS_CONTEXT** — the task is delivered, green and committed, but the
**mandatory regression test could not be written as specified because its premise
is false on this stack.** Details in "The mandated regression test" below.

---

## What I implemented

- `DisclosureUpdateRequest` — `record DisclosureUpdateRequest(@NotNull List<String> hiddenClaims)`,
  verbatim from the brief.
- `HolderService#setDisclosure(UUID userId, UUID credentialId, List<String> hiddenClaims)` —
  `@Transactional`, reuses `requireWalletEntry` for ownership and `loadClaims` for the
  IPFS fetch. Validates requested keys against the real claim map, then writes the row.
- `HolderController` — `GET` and `PUT /api/holder/credentials/{id}/disclosure`.
- Five tests from the brief appended to `HolderDisclosureServiceTest`.
- `CredentialDisclosurePersistenceTest` — a new JPA slice test (see below).

No security change: both endpoints sit under the existing `/api/holder` mapping, so
the current `SecurityFilterChain` already scopes them.

---

## TDD evidence

### RED — the five brief tests

Command:

```
cd certchain && ./mvnw -B -o test -Dtest=HolderDisclosureServiceTest
```

Output before `setDisclosure` existed:

```
[ERROR] .../HolderDisclosureServiceTest.java:[229,52] cannot find symbol
[ERROR] .../HolderDisclosureServiceTest.java:[240,47] cannot find symbol
[ERROR] .../HolderDisclosureServiceTest.java:[257,33] cannot find symbol
[ERROR] .../HolderDisclosureServiceTest.java:[270,33] cannot find symbol
[ERROR] .../HolderDisclosureServiceTest.java:[281,47] cannot find symbol
[INFO] BUILD FAILURE
```

**Why this is the expected failure:** exactly five errors, one per new test, at the
five `holderService.setDisclosure(...)` call sites (lines 229, 240, 257, 270, 281).
The missing symbol is the method under test, not an import or a typo. The imports
(`any`, `never`, `verify`, `List`) resolved cleanly, which is why the errors point at
the call sites and not at the import block.

### GREEN — focused

```
cd certchain && ./mvnw -B -o test -Dtest=HolderDisclosureServiceTest,CredentialDisclosurePersistenceTest
```

```
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0 -- HolderDisclosureServiceTest
[INFO] Tests run:  1, Failures: 0, Errors: 0, Skipped: 0 -- CredentialDisclosurePersistenceTest
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

The brief predicted 9; the file already held 6 tests from Task 2, so 11 is the correct
total (6 existing + 5 new). I did not touch the 6 existing ones.

### GREEN — full suite

```
cd certchain && ./mvnw -B -o clean test
```

```
[INFO] Tests run:  1 -- CertchainApplicationTests          (contextLoads)
[INFO] Tests run:  1 -- CredentialDisclosurePersistenceTest
[INFO] Tests run: 12 -- AuthServiceRegistrationTest
[INFO] Tests run: 11 -- HolderDisclosureServiceTest
[INFO] Tests run:  3 -- HolderServiceClaimTest
[INFO] Tests run: 28, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

28 tests, up from the 22 baseline, none removed or altered. `contextLoads` still boots
the real context against live PostgreSQL. The only warnings are the pre-existing
SpringDoc and generated-password ones from the baseline run.

### Mutation check — is the validation test load-bearing?

I temporarily neutered the rejection branch (`if (false)`):

```
[ERROR] Tests run: 11, Failures: 1 -- HolderDisclosureServiceTest
[ERROR]   HolderDisclosureServiceTest.rejectsUnknownClaimKey:240
```

Exactly one test fails, then the service file was restored byte-for-byte (verified with
`git diff --stat`: 55 insertions, 0 deletions — my addition only). The 400 validation
is genuinely covered, not incidentally passed.

---

## The mandated regression test — CANNOT BE WRITTEN AS SPECIFIED

### What I built

A genuine integration test, not a mock. Mocks cannot produce a managed entity, and a
mocked repository would return whatever it was told to, so it would agree equally with
a working setter and a broken one — exactly the false green the mandate warned about.

`CredentialDisclosurePersistenceTest` is a `@DataJpaTest` against the **real
PostgreSQL** (`@AutoConfigureTestDatabase(replace = NONE)`, so the live `certichain`
database, which the constraint requires be running). It persists the full
`User → Issuer → Credential → CredentialDisclosure` graph, clears, re-reads the
disclosure through `CredentialDisclosureRepository#findByCredentialId` — which is how
the write path obtains it — and asserts `EntityManager.contains(entity)` so the test
fails loudly rather than passing vacuously if it ever stops being managed. Then
`setHiddenClaims` → `flush()` → `clear()` → re-read → assert.

I confirmed the managed instance is real: `contains(managed) = true` and the
`hiddenClaims` field is `org.hibernate.collection.spi.PersistentSet`, not a plain set.

### Why it could not satisfy the mandate

The mandate requires: *"It must fail against the old field-assigning setter."*

**It does not fail. The old setter works correctly on this stack.**

I reverted `setHiddenClaims` to `this.hiddenClaims = new LinkedHashSet<>(hiddenClaims)`
and ran a three-case matrix against real PostgreSQL, asserting on the raw
`credential_disclosure_claims` table via a native query (not through Hibernate, so
there is no way for Hibernate's own caching to flatter the result):

| Case | Buggy setter | Fixed setter |
|---|---|---|
| Uninitialised LAZY collection, `{gpa,major}` → `{gpa}` | **passes** | passes |
| Initialised collection, `{gpa,major}` → `{gpa}` | **passes** | passes |
| Growing, `{gpa,major}` → `{gpa,major,honours}` | **passes** | passes |

With `-Dspring.jpa.show-sql=true` the buggy setter produces exactly the correct
statements:

```
delete from credential_disclosure_claims where disclosure_id=?
insert into credential_disclosure_claims (disclosure_id, claim_key) values (?, ?)
```

**The mechanism:** Hibernate 6 does not only track the `PersistentSet` wrapper it built
at load time. During flush, `WrapVisitor` re-inspects the entity's attribute values
and re-wraps a field that now holds a raw collection, which drives a full collection
recreate (delete-all + insert-all). The observed SQL proves it. The diagnostic printed
the field class before and after the setter: with the buggy setter the field becomes
`java.util.LinkedHashSet`; with the fixed setter it stays
`org.hibernate.collection.spi.PersistentSet`. The first looks wrong and yet persists.

This project runs **Hibernate ORM 6.6.53.Final** (Spring Boot 3.5.16), reported by the
build itself. The silent-data-loss behaviour described in the mandate is a
Hibernate 5-era failure mode. On this stack both setter forms write to the database.

### What I need from the controller

One of:

1. **Accept that the fix in `eb55113` was not load-bearing on this stack**, and accept
   `CredentialDisclosurePersistenceTest` as what it honestly is: a real persistence
   test for the write path (it *does* fail if the setter stops writing, if the setter
   body is emptied, or if persistence is broken) — but **not** a regression test that
   discriminates between the two setter forms. It must not be counted as satisfying
   the mandate.
2. **Point me at the actual failing scenario** if one is known — a Hibernate version, a
   fetch type, a second-level cache, or a code path outside this write path where the
   old setter was observed to lose the change. I will write the test against that.
3. **Retract the mandate** as based on a mistaken diagnosis.

I did not write a test asserting a behaviour I had measured to be false, and I did not
present the test above as the mandated regression test.

### A related false statement left in the tree (not mine to fix)

`CredentialDisclosure.java:57-61` carries this comment on the fixed setter:

> *"Mutates the live set instead of replacing it. Under field access Hibernate only
> tracks the collection wrapper it created at load time, so a new Set assigned here
> would never be written back."*

I have measured that second sentence to be **false** on Hibernate 6.6.53. The code is
correct and I left it exactly as committed — but a future developer will read that
comment and believe the field-assigning form is broken, and may "fix" working code on
the strength of it. Recommend rewriting it or deleting it. It is Task 1's file, so I
did not touch it.

---

## Files changed

| File | Change |
|---|---|
| `dto/request/DisclosureUpdateRequest.java` | new — 10 lines, verbatim from brief |
| `service/HolderService.java` | +55 — `setDisclosure` plus 3 imports |
| `controller/HolderController.java` | +31 — two endpoints plus 3 imports |
| `service/HolderDisclosureServiceTest.java` | +70 — 5 tests plus 3 static imports |
| `model/CredentialDisclosurePersistenceTest.java` | new — 120 lines, JPA slice test |

Commit `ebb6c24`. Staged by explicit path, one `git add` per file. The 3 modified and
7 untracked Reticle artifacts remain unstaged and uncommitted.

---

## Self-review findings

**Global constraints — all satisfied.**

1. *Envelope never mutated* — nothing in this path writes to the envelope; only the
   preference is stored. `loadClaims` is the single IPFS fetch.
2. *No row means nothing hidden* — an empty request still writes a row with an empty
   set (`orElseGet` creates one; an existing one is cleared). There is no default that
   hides anything.
4. *Core fields never hideable* — only keys present in the claims map are accepted;
   an unknown key is a 400 naming it, not a silent ignore.
6. *Holder's own view shows all claims* — the response carries the unfiltered `claims`
   map. Verified by `savesValidHiddenSet` asserting `claims()` has 2 entries while
   `gpa` is hidden.
7. *Raw download untouched* — I did not modify `downloadCredential` or the download
   mapping.
10. *PostgreSQL running* — used, not reconfigured. No container touched.

**The aliasing trap.** `setDisclosure` builds `requested` as a fresh
`new LinkedHashSet<>(hiddenClaims)` from the caller's `List<String>`. A `List` can
never be the entity's live `PersistentSet`, so the `clear()`-then-`addAll()` wipe is
structurally impossible on this path. I left a comment at the call site recording
why, since the trap is not obvious from the code alone.

**Reuse.** `requireWalletEntry` and `loadClaims` are both reused as-is. I did not
write a second ownership check or a second IPFS fetch, so the interrupt-flag
restoration and the 503-with-cause behaviour from `7c30f52` are inherited rather than
re-derived.

**Status codes.** I checked `GlobalExceptionHandler` for a catch-all: it handles only
`MaxUploadSizeExceededException`, `BadCredentialsException`, `IllegalArgumentException`
and `SecurityException`. `ResponseStatusException` is untouched by it and resolves
through `ResponseStatusExceptionResolver` to its own status, matching how Task 2's
existing `getDisclosure` already behaves. `@Valid` + `@NotNull` on the request body
gives a 400 for a missing field, as the brief intends.

**Not built, deliberately.** No `DELETE` endpoint (an empty PUT resets, per the
brief). No controller-level `@WebMvcTest` — the brief did not ask for one, and the
endpoints are two-line delegations over an already-tested service method. Noted
rather than invented: nothing currently exercises the endpoints' HTTP binding, the
`@NotNull` 400, or the security scope; if you want that covered, a slice test is the
place, and it is Task 8's natural home.

**Code size.** `HolderService` is now 373 lines. It is still cohesive, but it is
drifting toward wanting a split (credential lifecycle vs disclosure policy). I did
not restructure it — that is outside this task.

---

# Fix round 1 of 5

The controller ruled in favour of my finding and against the original
silent-write-loss diagnosis. Two changes to code, one ruling that turned
out to need no change.

## 1. Setter restored to field assignment (ruling 1)

`CredentialDisclosure#setHiddenClaims` is back to the one-line form:

```java
public void setHiddenClaims(Set<String> hiddenClaims) {
    this.hiddenClaims = new LinkedHashSet<>(hiddenClaims);
}
```

The `clear()` + `addAll()` variant is gone.

## 2. False comment deleted (ruling 2)

The block comment above the setter - "Under field access Hibernate only
tracks the collection wrapper it created at load time, so a new Set
assigned here would never be written back" - is removed in full, not
reworded. No comment remains on the method, so none can invite a future
developer to "fix" working code.

## 3. Persistence test reframed (ruling 3) - needed no change

**I did not change this file, and I want to be precise about why rather
than claim a change I did not make.** `git diff` on
`CredentialDisclosurePersistenceTest.java` is empty against `ebb6c24`.
Its framing already satisfied ruling 3:

- The class comment states the question as "whether a change to the
  hidden set on a MANAGED entity survives a real flush" and that "a
  mocked repository would return whatever it was told to - it would
  agree with a working setter and a broken one". That is a statement
  about mocks, not a claim that a particular setter is broken.
- The `@DisplayName` is "changing the hidden set on a managed entity
  reaches the database" - what it actually proves.
- There is no reference anywhere in the file to the field-assignment
  form being broken, and no claim that the mutating form is required
  for correctness.

The phantom-bug framing the ruling refers to lived in
`CredentialDisclosure.java`, not in the test, and ruling 2 removed it.
During this round I briefly introduced and then repaired a stray blank
line in the test file while checking the above; the file is
byte-identical to the committed version and `git status` shows it
unmodified.

The `entityManager.contains(managed)` assertion is kept exactly as it
was, per the ruling.

## Files touched

**One file:**

- `certchain/src/main/java/com/certchain/certchain/model/CredentialDisclosure.java`
  (-6 lines: comment block deleted, setter body back to one line)

Explicitly **not** touched, per the "what NOT to change" list:
`DisclosureUpdateRequest`, `HolderService#setDisclosure`, both
controller endpoints, the 5 tests in `HolderDisclosureServiceTest`,
`loadClaims`, `requireWalletEntry`, and the aliasing-trap reasoning in
`setDisclosure`.

## Full suite

```
cd certchain && ./mvnw -B -o test
```

```
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0 -- CredentialDisclosurePersistenceTest
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0 -- AuthServiceRegistrationTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0 -- HolderDisclosureServiceTest
[INFO] Tests run:  3, Failures: 0, Errors: 0, Skipped: 0 -- HolderServiceClaimTest
[INFO] Tests run:  1, Failures: 0, Errors: 0, Skipped: 0 -- CertchainApplicationTests
[INFO] Tests run: 28, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

28 tests, unchanged from the pre-fix count. No test was weakened,
deleted or skipped.

## Load-bearing check - persistence test under field assignment

**Confirmed: `CredentialDisclosurePersistenceTest` passes with the
field-assigning setter restored.** 1 test, 0 failures, 0 errors, against
real PostgreSQL via `@DataJpaTest` +
`@AutoConfigureTestDatabase(replace = NONE)`, reading the disclosure
back through `CredentialDisclosureRepository#findByCredentialId`,
asserting the entity is managed, then `setHiddenClaims` -> `flush()` ->
`clear()` -> re-read -> assert the new set is in the database.

This is the same run the controller performed independently. Both agree:
the write persists under both setter forms on Hibernate 6.6.53. No
workaround was needed and none was applied.

## Where I disagree, and what I still think is worth flagging

**I agree with all three rulings.** Ruling 1 is a simplicity call and
the simplicity argument is sound, not just plausible: field assignment
does not depend on the field initializer to avoid an NPE, it keeps the
defensive copy, and it is a no-op if handed the entity's own live set
where `clear()` + `addAll()` would wipe it. That last point is a real
robustness advantage and it is the reason I would not argue the other
way even if the two forms differed on persistence.

Two things I want on the record rather than left implicit:

1. **The aliasing trap argument in `setDisclosure` is now stronger, not
   weaker, and it still holds.** The ruling notes the mutating form is
   vulnerable to `setHiddenClaims(getHiddenClaims())`; my write path
   builds `requested` as a fresh `new LinkedHashSet<>(hiddenClaims)`
   from the caller's `List<String>`, and a `List` can never be the
   entity's live `PersistentSet`, so neither form can be handed its own
   collection from this path. The comment at the call site recording
   that reasoning is still true and I left it.

2. **A residual risk that survives the revert, unchanged by it.** Both
   forms work through Hibernate's flush-time re-wrap and collection
   recreate. That mechanism is a *flush-time* behaviour of Hibernate 6,
   not a documented guarantee of the JPA spec. If this project ever
   moves to a second-level cache, or a build that enables bytecode
   enhancement for lazy-loading, or a Hibernate major version that
   changes collection re-wrapping, field assignment is the form whose
   behaviour is least pinned down by anything the test can assert. That
   is a reason to keep
   `CredentialDisclosurePersistenceTest` in the suite permanently
   rather than a reason to prefer either setter - which is exactly the
   framing ruling 3 settles on. Worth remembering at the next major
   upgrade, not worth a comment in the file now.

I have no objection to any ruling and nothing further to escalate.

---

# Fix round 2 of 5

Both Important findings fixed, plus the two Minor ones folded into the
same test edit. One file's behaviour is unchanged; the other file's
comment is now true.

## Change 1 - false `clear()` claim removed (Important #1)

`service/HolderService.java:219-222`. Deleted the second half of the
comment block. It read:

> The request set is a fresh copy, never the entity's own live
> collection: passing that in would make the setter's **clear()** wipe
> it before **addAll** could read it.

`setHiddenClaims` has no `clear()` and no `addAll()` since round 1.
The retracted investigation's mechanism had survived verbatim here,
in a file the round-1 ruling told me not to touch - so nothing
swept it up. I took the shorter option and deleted the half rather
than restating it.

What remains:

```java
/*
 * An empty request still writes a row, so "hide nothing" is
 * a stored decision rather than the absence of one.
 */
```

Reads as a complete thought, not a non-sequitur. The defensive copy
at `:201` (`new LinkedHashSet<>(hiddenClaims)`) is untouched - it is
independent of any setter implementation and was never the problem.
`disclosure.setHiddenClaims(requested)` at `:229` is back to the
correct form after the RED experiment below.

## Change 2 - captor assertion on the create branch (Important #2)

`service/HolderDisclosureServiceTest.java:232-247`. `savesValidHiddenSet`
now captures the entity handed to `save` and asserts
`getHiddenClaims()` is exactly the requested keys. The untyped
`verify(...).save(any(CredentialDisclosure.class))` is gone.

The comment records why this is the only assertion that counts: the
response is built from a local variable, so echoing it back says
nothing about what reached the database.

## Change 3 - new test for the existing-row branch (Minor #3)

`service/HolderDisclosureServiceTest.java:249-274`.
`replacesAnExistingHiddenSet` stubs `findByCredentialId` to return a
disclosure already hiding `{"major"}`, requests `["gpa"]`, and asserts
the captured entity contains exactly `gpa`.

This closes Important #2 for the common case and Minor #3 at once.
The controller's reasoning holds and the test now covers it: the row
is loaded at `:225` inside the same `@Transactional` that `save`
commits in, so in production this branch hands the setter a managed
entity - the condition
`CredentialDisclosurePersistenceTest` exercises in isolation, and the
one where the re-wrapping behaviour applies. The assertion is
`containsExactly`, not `contains`, so it also pins that the old choice
is *replaced* rather than merged with the new one.

## Change 4 - DisplayName corrected (Minor #4)

`service/HolderDisclosureServiceTest.java:292-293`. After adding
change 3, "an empty set resets the credential to showing everything"
was still wrong: the stub returns `Optional.empty()`, so it only ever
tested first-time creation with an empty set. Renamed to
"an empty set stores a row that hides nothing" and to
`emptySetStoresNothingHidden`.

The "resets" case now lives in `replacesAnExistingHiddenSet`, where
there is an existing row. Each name matches what its test does.

I also gave this test a captor assertion, which the finding did not
ask for but which the constraint it names deserves: the response echo
proves a `List.of()` came back empty, not that an empty set was
stored. It now asserts the saved entity's set is empty, which is the
actual Global Constraint 2 claim.

## RED-phase evidence

The gap was real, and larger than the review stated.

**Step 1 - confirm the suite is blind.** Broke the write path at
`HolderService.java:232`, replacing

```java
disclosure.setHiddenClaims(requested);
```

with

```java
disclosure.setHiddenClaims(claims.keySet());
```

- storing the *whole* claim map as the hidden set, the exact inverse
of the feature. Full suite:

```
[INFO] Tests run:  1 -- CredentialDisclosurePersistenceTest
[INFO] Tests run: 12 -- AuthServiceRegistrationTest
[INFO] Tests run: 11 -- HolderDisclosureServiceTest
[INFO] Tests run:  3 -- HolderServiceClaimTest
[INFO] Tests run:  1 -- CertchainApplicationTests
[INFO] Tests run: 28, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

**28 green with the feature inverted.** The task's central claim was
unfalsifiable.

**Step 2 - add the assertions, still against the broken code.**

```
[ERROR] Tests run: 12, Failures: 3, Errors: 0, Skipped: 0 -- HolderDisclosureServiceTest
[ERROR]   savesValidHiddenSet -- FAILURE!            but some elements were not expected
[ERROR]   emptySetStoresNothingHidden -- FAILURE!    Expecting empty but was: ["major", "gpa"]
[ERROR]   replacesAnExistingHiddenSet -- FAILURE!    but some elements were not expected
[INFO] BUILD FAILURE
```

All three catch it. Worth noting *where* they failed: the failures
are on the captor assertions, while the pre-existing response-echo
assertions on the two lines above each still passed. That is the
review's point demonstrated rather than argued - the response
asserted the holder's request faithfully while the database was
being handed its exact inverse.

**Step 3 - restore the correct code.** `:229` back to
`setHiddenClaims(requested)`, verified by reading the file.

## Full suite

```
cd certchain && ./mvnw -B -o test
```

```
[INFO] Tests run:  1, Failures: 0, Errors: 0, Skipped: 0 -- CredentialDisclosurePersistenceTest
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0 -- AuthServiceRegistrationTest
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0 -- HolderDisclosureServiceTest
[INFO] Tests run:  3, Failures: 0, Errors: 0, Skipped: 0 -- HolderServiceClaimTest
[INFO] Tests run:  1, Failures: 0, Errors: 0, Skipped: 0 -- CertchainApplicationTests
[INFO] Tests run: 29, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

29 tests, up from 28: one net new test, no test weakened, deleted or
skipped. `contextLoads` still boots.

## Files touched

- `certchain/src/main/java/com/certchain/certchain/service/HolderService.java`
  (comment only -3 lines; behaviour restored to correct after the RED
  experiment, net zero change from `ebb6c24`)
- `certchain/src/test/java/com/certchain/certchain/service/HolderDisclosureServiceTest.java`
  (+1 import, captor assertions, one new test, one rename)

Staged by explicit path. The Reticle artifacts remain uncommitted.

## On the triage

I agree with all four findings and with all three out-of-scope calls.
Two notes, no action taken:

1. **Minor #3 outranks the review's rating, as the controller said.**
   The managed-entity condition is the one place the retraction's
   behaviour is load-bearing, and it is the branch a real holder hits
   on every change of mind. Worth noting for the record: the new test
   uses a plain `new CredentialDisclosure(...)` from a mocked
   repository, so it proves the *service* passes the right set on the
   existing-row branch. It does not prove managed-entity persistence
   through the service - that is
   `CredentialDisclosurePersistenceTest`'s job, and together the two
   cover it. Neither alone would.

2. **The dead `setHiddenClaims(requested)` on the create branch is
   harmless, and I now think it is worth keeping for a stronger reason
   than uniformity.** The constructor already takes `requested`, so on
   the create branch the setter re-assigns the same contents. If that
   single call were ever hoisted above the `orElseGet` - a natural
   "simplification" given it looks unconditional - it would NPE on the
   create path, where no entity exists yet. The uniformity is what
   makes the hoisting mistake reachable, but removing it would remove
   the only line that would crash and thereby hide the mistake. I
   agree with leaving it, and I would rather it stay than be tidied.

No disagreement with the triage.
