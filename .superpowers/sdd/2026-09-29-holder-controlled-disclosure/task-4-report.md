# Task 4 Report: Filter the verifier's view

**Status:** DONE_WITH_CONCERNS
**Commit:** `181fc81` — feat(verifier): disclose only what the holder chose to share
**Base:** `38d21a6`

---

## Summary

Added a presentation-only disclosure filter to the verifier path. `VerificationResult` now
carries a `DisclosureInfo(disclosed, total, complete)` component, and `VerificationService`
filters the claims at the single point where they are placed into the result — after CHECK 1,
CHECK 2, CHECK 3 (signature) and the anchor lookup have all run against the complete payload.
The holder's hidden-claim set is read from `CredentialDisclosureRepository`; absence of a row
means nothing is hidden, so the 8 already-anchored credentials behave exactly as before.

Both pre-flight findings were confirmed against the code and applied. The compiler independently
found the third `VerificationResult` call site the plan claimed did not exist. The
`hidden.isEmpty()` formula the plan specified was demonstrated by mutation testing to be a real
bug, not cosmetics.

---

## Files changed

| File | Change |
|---|---|
| `certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureInfo.java` | **New.** Top-level record `(int disclosed, int total, boolean complete)`. |
| `certchain/src/main/java/com/certchain/certchain/dto/response/VerificationResult.java` | Appended one component `DisclosureInfo disclosure`. The 15 existing components are untouched and unreordered. |
| `certchain/src/main/java/com/certchain/certchain/service/VerificationService.java` | Injected `CredentialDisclosureRepository` (field, import, 10th ctor param + assignment). Added package-private `applyDisclosure(Credential, Map)` and the nested package-private `DisclosedView` record. In `success()`, hoisted the claims into `allClaims`, called the filter, and passed `disclosed.visible()` / `disclosed.info()`. In `failure()`, appended `new DisclosureInfo(0, 0, true)`. |
| `certchain/src/main/java/com/certchain/certchain/controller/VerifierController.java` | **Third call site** (the site the plan omitted). Empty-upload rejection now appends `new DisclosureInfo(0, 0, true)`, plus the `DisclosureInfo` import. |
| `certchain/src/test/java/com/certchain/certchain/service/DisclosureFilterTest.java` | **New.** 5 tests. See Deviations for two changes to the plan's test source. |

No file outside this list was modified.

---

## RED phase evidence

### Step 4 — compile failure before the filter existed

Run: `./mvnw -B test -Dtest=DisclosureFilterTest`

```
[ERROR] COMPILATION ERROR :
[ERROR] .../controller/VerifierController.java:[49,21] constructor VerificationResult in record
        com.certchain.certchain.dto.response.VerificationResult cannot be applied to given types;
[ERROR] .../service/VerificationService.java:[413,16] constructor VerificationResult in record
        com.certchain.certchain.dto.response.VerificationResult cannot be applied to given types;
[ERROR] .../service/VerificationService.java:[464,16] constructor VerificationResult in record
        com.certchain.certchain.dto.response.VerificationResult cannot be applied to given types;
[INFO] BUILD FAILURE
[ERROR] .../controller/VerifierController.java:[49,21] constructor VerificationResult ...
        required: boolean,...boolean,com.certchain.certchain.dto.response.DisclosureInfo
        found:    boolean,...<nulltype>,boolean
[ERROR]   reason: actual and formal argument lists differ in length
[ERROR] .../service/VerificationService.java:[413,16] ... same required/found/reason
[ERROR] .../service/VerificationService.java:[464,16] ... same required/found/reason
```

**Pre-flight finding 1 confirmed.** The plan asserted "There are exactly two" call sites. The
compiler found three, and named the controller's line 49 itself. This is the strongest possible
evidence for the correction.

### Deliberate breaks (GREEN phase) — the tests actually bite

A suite that passes against a broken filter proves nothing. Three mutations were applied to
`applyDisclosure` and reverted.

**Break 1 — filter returns `allClaims` unfiltered**
(`new LinkedHashMap<>(allClaims)`, no `forEach` filtering)

```
[ERROR] Tests run: 5, Failures: 3, Errors: 0, Skipped: 0

DisclosureFilterTest.hiddenClaimIsWithheld:101
Expecting actual:
  {"gpa"="3.9", "honors"="summa cum laude", "major"="Computer Science"}
not to contain key:
  "gpa"

DisclosureFilterTest.hidingEverythingYieldsEmptyView:116
Expecting empty but was: {"gpa"="3.9", "honors"="summa cum laude", "major"="Computer Science"}

DisclosureFilterTest.preservesClaimOrder:129
Expecting actual:
  ["major", "gpa", "honors"]
to contain exactly (and in same order):
  ["major", "honors"]
but some elements were not expected:
  ["gpa"]
```

`noPolicyDisclosesEverything` and `stalePolicyKeyDoesNotClaimPartiality` correctly stayed green —
with no filtering there is nothing to withhold, so a complete view is the right answer for both.

**Break 2 — the plan's `hidden.isEmpty()` formula** (correct filter, plan's `complete`)

```
[ERROR] Tests run: 5, Failures: 1, Errors: 0, Skipped: 0

DisclosureFilterTest.stalePolicyKeyDoesNotClaimPartiality:153
[a policy key with no matching claim hides nothing, so this view is complete]
Expecting value to be true but was false
```

**This is the key result.** Exactly one test fails, and it is the fifth test. The four tests the
plan specified pass against the plan's formula — they cannot distinguish it from the correct one.
Pre-flight finding 2 is therefore a real bug that would have shipped, and the added test is the
only thing standing between it and production.

**Break 3 — `HashMap` instead of `LinkedHashMap`** — see Deviations. The first attempt **did not
fail**, exposing a false green in the plan's `preservesClaimOrder`; after strengthening the test
it does:

```
[ERROR] Tests run: 5, Failures: 3, Errors: 0, Skipped: 0

DisclosureFilterTest.noPolicyDisclosesEverything:86
DisclosureFilterTest.preservesClaimOrder:142
DisclosureFilterTest.stalePolicyKeyDoesNotClaimPartiality:160

DisclosureFilterTest.preservesClaimOrder -- Time elapsed: 0.034 s <<< FAILURE!
org.opentest4j.AssertionFailedError:

Expecting actual:
  ["gpa", "program", "honors"]
to contain exactly (and in same order):
  ["program", "gpa", "honors"]
but there were differences at these indexes:
  - element at index 0: expected "program" but was "gpa"
```

All three mutations reverted; `./mvnw -B clean test` is green at 34.

---

## Full suite

Baseline, measured before any edit: `Tests run: 29, Failures: 0, Errors: 0, Skipped: 0`

Command: `cd certchain && ./mvnw -B clean test`

```
[INFO] Tests run: 1,  Failures: 0, Errors: 0, Skipped: 0 -- in CertchainApplicationTests
[INFO] Tests run: 1,  Failures: 0, Errors: 0, Skipped: 0 -- in CredentialDisclosurePersistenceTest
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0 -- in AuthServiceRegistrationTest
[INFO] Tests run: 5,  Failures: 0, Errors: 0, Skipped: 0 -- in DisclosureFilterTest
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0 -- in HolderDisclosureServiceTest
[INFO] Tests run: 3,  Failures: 0, Errors: 0, Skipped: 0 -- in HolderServiceClaimTest
[INFO] Tests run: 34, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

29 → 34, exactly +5. Skipped count was 0 before and remains 0. No pre-existing test was
weakened, skipped or deleted — `HolderServiceClaimTest`, `HolderDisclosureServiceTest` and
`CredentialDisclosurePersistenceTest` all still pass with unchanged counts, confirming disclosure
did not alter claim behaviour.

### Integrity invariant, verified by reading the final code

`applyDisclosure` is called at `VerificationService.java:425`, inside `success()` (starts line
384). CHECK 1 (`:207-211`), CHECK 2 (`:238`), CHECK 3 signature verification (`:249-258`) and the
anchor verification (`:364`, `:410`) all execute in `verify()` *before* `success()` is reached.
The filter's only output is `disclosed.visible()`, feeding the result's `claims` field. Nothing
it produces reaches a hash comparison, a signature check or an anchor lookup. The signed envelope
is never mutated — the filter builds a new `LinkedHashMap` and reads `credential.getId()` only
for the repository lookup.

---

## Deviations

Three. All are in the test file, which is within the brief's file list.

**1. The brief's fifth test was self-contradictory; I kept its assertions and intent.**

The brief supplied this test verbatim:

```java
credential, Set.of("gpa", "aClaimThisCredentialNeverHad")));
...
assertThat(result.visible()).containsExactlyEntriesOf(claims);   // claims has 3 entries incl. "gpa"
assertThat(result.info().disclosed()).isEqualTo(3);
```

`"gpa"` **is** a key in the shared fixture (`{major, gpa, honors}`). Hiding it while asserting
all three are still disclosed is unsatisfiable — the test could never pass. The assertions and the
stated intent (a policy key with no matching claim withholds nothing) are unambiguous; only the
key list was wrong. I changed the hidden set to two genuinely stale keys:

```java
credential, Set.of("aClaimThisCredentialNeverHad", "anotherRetiredClaim")));
```

All five assertions are preserved verbatim and the test now does what its name says. The
mutation evidence in Break 2 confirms it is load-bearing.

**2. `preservesClaimOrder` was a false green against `HashMap`; I strengthened it.**

The task asked me to confirm `preservesClaimOrder` fails when `applyDisclosure` returns a
`HashMap`. **It did not.** Two independent coincidences were hiding it:

- The fixture keys `{major, gpa, honors}` happen to hash into insertion order, so the filtered
  2-element view `{major, honors}` iterates identically under `HashMap`.
- Even with different keys, a *freshly built* 2-entry `HashMap` can still coincide with insertion
  order; my first key substitution only exposed the divergence on a copy-then-remove map, which
  is not how the production code builds it.

Two changes, both minimal:
- Renamed the fixture key `major` → `program` (4 sites). Verified by direct probe that
  `{program, gpa, honors}` → `{program, honors}` differs between `LinkedHashMap` and `HashMap`.
- Added a second assertion to `preservesClaimOrder` covering the **unfiltered** order, which is
  where the substitution is actually visible (`["gpa","program","honors"]` vs
  `["program","gpa","honors"]`).

Result: `preservesClaimOrder` now fails under the `HashMap` break. Without this, the plan's
claimed protection for the `LinkedHashMap` invariant was cosmetic — the named test passed against
exactly the substitution it exists to prevent.

**3. I introduced a duplicated `allClaims.forEach` block and caught it in the diff review.**

Restoring the filter after Break 1 produced two identical `forEach` blocks. It was idempotent —
putting the same keys twice yields the same map — so **the entire suite stayed green with the
dead code in place**, and it would not have shown up without reading `git diff` before committing.
Removed; re-verified green at 34. Flagging it because it is a reminder that a passing suite is
not sufficient evidence in this codebase, and it is the concrete reason the brief's
"review before committing" step matters.

### Not done, deliberately

- No overloaded constructor was added; the compiler was allowed to find all three call sites.
- No `Collectors.toMap`.
- `DisclosureInfo` is top-level in `dto/response`, not nested in `VerificationResult`.
- The `success()` call site keeps the brief's exact style: the claims are hoisted into a local
  `allClaims` and passed to `applyDisclosure`, which is the only place filtering occurs.

### Concern for the reviewer

`applyDisclosure` is invoked inside `success()`, which `failureForCredential` also reaches with
`envelope == null`. In that path `allClaims` is `Map.of()`, so the result is
`{disclosed: 0, total: 0, complete: true}` — consistent, because a failure response carries no
claims. But note this means **a failed verification of a known credential now issues a database
read** (`findByCredentialId`) that the previous code did not make. It is a single indexed lookup
on a read-only transaction, so I judged it not worth a special case, but it is a behaviour change
on the failure path and worth a second opinion.

---

## Verification commands run

```bash
cd certchain
./mvnw -B test                                     # baseline: 29, 0 skipped
./mvnw -B test -Dtest=DisclosureFilterTest         # RED: compile failure, 3 call sites
./mvnw -B test -Dtest=DisclosureFilterTest         # GREEN: 5 passed
# Break 1: unfiltered      -> 3 failures (hiddenClaimIsWithheld, hidingEverythingYieldsEmptyView, preservesClaimOrder)
# Break 2: hidden.isEmpty -> 1 failure  (stalePolicyKeyDoesNotClaimPartiality)
# Break 3: HashMap         -> 3 failures (after strengthening preservesClaimOrder)
./mvnw -B clean test                               # 34 passed, 0 skipped, BUILD SUCCESS
```
