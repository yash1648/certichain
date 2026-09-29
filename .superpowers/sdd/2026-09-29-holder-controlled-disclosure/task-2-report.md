# Task 2 Report: The holder's read path

**Status:** DONE
**Commit:** `737af3b` — feat(holder): expose a credential's claims and current hidden set
**Branch:** `feat/holder-disclosure`

---

## What I implemented

The holder's read path: given a `(userId, credentialId)`, return every claim on that
credential plus the list of claim keys the holder has chosen to hide. Nothing on this
path writes to the signed envelope or to the database.

1. **`DisclosureResponse`** (new record) — `Map<String, Object> claims` +
   `List<String> hiddenClaims`. Verbatim from the brief.

2. **`HolderService` constructor** — extended from five dependencies to seven, adding
   `CredentialDisclosureRepository` and `ObjectMapper`. The `ObjectMapper` is Spring's
   auto-configured bean, so no new `@Bean` or config was needed.

3. **`getDisclosure(UUID, UUID) -> DisclosureResponse`** — `@Transactional(readOnly = true)`;
   resolves the wallet entry, loads claims, reads the hidden keys.

4. **`requireWalletEntry(UUID, UUID) -> HolderWallet`** — the wallet-ownership check,
   extracted so it is not copy-pasted a third time.

5. **`loadClaims(Credential) -> Map<String, Object>`** — reads the envelope from IPFS via
   `ipfsService.retrieve(cid)`, deserialises it into `SignedCredentialEnvelope`, and returns
   `credential().claims()`. A null credential node or null claims map yields `Map.of()`.
   Any failure becomes a 503 rather than leaking an IPFS/Jackson exception to the caller.

6. **`hiddenClaimKeys(UUID) -> List<String>`** — `findByCredentialId` → `getHiddenClaims` →
   `List.copyOf`, or `List::of` when there is no row.

7. **`HolderServiceClaimTest.setUp`** — updated to the seven-argument constructor.

### Design points worth stating

- **`List.copyOf` is load-bearing, not decoration.** `CredentialDisclosure.getHiddenClaims()`
  returns Hibernate's live persistent set. Returning it directly would hand a mutable handle
  on managed state to a `@Transactional(readOnly = true)` read method, and Task 3's write path
  would then be writing through an alias. I added a comment at the copy so a future
  "simplification" does not remove it.
- **No row means nothing is hidden** (Global Constraint 2). `orElseGet(List::of)` is the only
  default; there is no path in this code that can invent a hidden key.
- **The full claim map is returned unfiltered** (Global Constraint 6). Core-field filtering is
  Task 4's job and is deliberately absent here.
- **`requireWalletEntry` is called outside `loadClaims`'s try block**, so the 404 from a
  credential outside the wallet is not swallowed and re-thrown as a 503. I checked this
  deliberately — the broad `catch (Exception ex)` was specified by the brief, and its blast
  radius is worth knowing.

---

## What I tested and the results

| Class | Tests | Result |
|---|---|---|
| `HolderDisclosureServiceTest` (new) | 4 | pass |
| `HolderServiceClaimTest` (existing, constructor updated) | 3 | pass |
| Full suite | 20 | pass |

16 pre-existing tests + 4 new = 20. No existing test was removed or altered beyond the
constructor arity in `HolderServiceClaimTest`.

`CertchainApplicationTests.contextLoads` boots the real Spring context against the live
PostgreSQL instance and passes, which is the evidence that the new constructor argument
resolves and the `CredentialDisclosureRepository` bean wires correctly.

### Do these tests actually bite?

I checked each one against the mutation it is meant to catch:

- `readsClaimsAndEmptyHiddenSet` — fails if `loadClaims` returns an empty map, or if the
  no-row default ever became a non-empty list.
- `noRowMeansNothingHidden` — `hasSize(2)` fails if claims are dropped or truncated. This is
  the explicit Global Constraint 2 guard; it overlaps test 1 but names a different invariant.
- `reportsExistingHiddenSet` — fails if `hiddenClaimKeys` short-circuits to `List.of()`
  without consulting the repository.
- `refusesCredentialNotInWallet` — this one is worth calling out. Mockito returns
  `Optional.empty()` for an unstubbed `Optional`-returning method, so if the ownership check
  were removed the test would not silently pass; it would fail with "expected an exception
  but none was thrown". The test genuinely fails when the check is dropped.

The test is written against behaviour derived from the collaborators (a real JSON envelope
deserialised by a real `ObjectMapper`, a real `CredentialDisclosure`), not by re-asserting
mock configuration.

### Test output

Clean. The only warnings are the pre-existing project-wide Mockito self-attach /
dynamic-agent-loading warnings that every Mockito test in this suite already produces. No new
warnings were introduced.

---

## TDD evidence

### RED — before the implementation existed

Command:

```
cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B test -Dtest=HolderDisclosureServiceTest
```

Output (trimmed to the relevant failures):

```
[INFO] BUILD FAILURE
[ERROR] .../HolderDisclosureServiceTest.java:[52,25] constructor HolderService in class
        com.certchain.certchain.service.HolderService cannot be applied to given types;
[ERROR]   required: HolderWalletRepository, CredentialRepository, CredentialStatusRepository,
          IpfsService, CredentialAnchorRepository
[ERROR]   found:    HolderWalletRepository, CredentialRepository, CredentialStatusRepository,
          IpfsService, CredentialAnchorRepository, CredentialDisclosureRepository, ObjectMapper
[ERROR]   reason: actual and formal argument lists differ in length
[ERROR] .../HolderDisclosureServiceTest.java:[121,30] cannot find symbol
[ERROR]   symbol:   method getDisclosure(java.util.UUID,java.util.UUID)
[ERROR]   location: variable holderService of type com.certchain.certchain.service.HolderService
[ERROR] .../HolderDisclosureServiceTest.java:[135,33] cannot find symbol
[ERROR]   symbol:   method getDisclosure(java.util.UUID,java.util.UUID)
[ERROR] .../HolderDisclosureServiceTest.java:[147,33] cannot find symbol
[ERROR]   symbol:   method getDisclosure(java.util.UUID,java.util.UUID)
[ERROR] .../HolderDisclosureServiceTest.java:[158,30] cannot find symbol
[ERROR]   symbol:   method getDisclosure(java.util.UUID,java.util.UUID)
[INFO] 5 errors
```

**Why this is the correct failure.** The test could not even build, because the API it
describes did not exist: `HolderService` had a five-argument constructor and no
`getDisclosure` method. Every one of the five errors is "the thing I asked for is missing",
and none is a typo, a bad import, or a malformed fixture. This is the expected RED for a
new method — the test is the specification, and nothing about it is satisfiable yet.

### GREEN — after the implementation

Command:

```
cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B test -Dtest='HolderDisclosureServiceTest,HolderServiceClaimTest'
```

Output:

```
[INFO] Running com.certchain.certchain.service.HolderDisclosureServiceTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.154 s
[INFO] Running com.certchain.certchain.service.HolderServiceClaimTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.037 s
[INFO] Results:
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

Note: the brief's Step 9 gives the selector as `-Dtest='HolderDisclosureServiceTest+HolderServiceClaimTest'`.
The `+` form does not work with surefire 3.5.6 in this project — it reports
`No tests matching pattern ... were executed!` and fails the build. The comma form is the
correct selector here and selects the same two classes. Anyone re-running this task should
use the comma.

### Full suite

Command:

```
cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B test
```

Output (tail):

```
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 6.960 s
    -- in com.certchain.certchain.CertchainApplicationTests
[INFO] Results:
[INFO] Tests run: 20, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

---

## Files changed

```
certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureResponse.java   (new,     15 lines)
certchain/src/main/java/com/certchain/certchain/service/HolderService.java            (modified)
certchain/src/test/java/com/certchain/certchain/service/HolderDisclosureServiceTest.java (new)
certchain/src/test/java/com/certchain/certchain/service/HolderServiceClaimTest.java  (modified, 6 lines)
```

`git show --stat HEAD`: 4 files changed, 283 insertions(+), 27 deletions(-).

Staging was explicit per file. The working tree's pre-existing Reticle artifacts (3 modified,
7 untracked, under `.reticle/` and `frontend/.reticle/`) were left untouched and are not in
the commit — verified with `git status --short` immediately before committing.

---

## Deviations from the brief, and why

**1. `credentialFilename` also now uses `requireWalletEntry`.** (The only code deviation.)

The brief's Step 5 says "Rather than copy it a third time, extract it and use it in both
places", and then names only `downloadCredential`. When I opened the file, the same
nine-line ownership check appeared in **two** existing methods — `downloadCredential` *and*
`credentialFilename` — so `getDisclosure` would have been a third. Following the letter of
the brief would have left the duplicate in place, which is the opposite of its stated intent.

Behaviour is byte-for-byte identical: same repository call, same `HttpStatus.NOT_FOUND`, same
`"Credential not in wallet: " + credentialId` message, same exception type. It is a pure
extraction. Net effect is −11 lines. Flagging it explicitly so the reviewer can rule on it; if
the brief is authoritative, reverting it is a two-line change.

**2. The test file is verbatim from the brief, including one unused import.**
`HolderDisclosureServiceTest` imports `com.certchain.certchain.model.Issuer` and never uses
it. The brief said to write the test "exactly as the brief specifies", so I left it. It is
dead weight; say the word and I will delete the one line.

**3. Two block comments beyond the brief's snippets.** On `loadClaims` (records that claims
live only in the IPFS envelope, not the database) and on `hiddenClaimKeys` (records that the
`List.copyOf` is mandatory because the entity hands back a live set). The file's established
style places exactly this kind of "why, not what" comment at constraint-bearing points
(`addToWallet`, `downloadCredential`, `IpfsService.remove`). I did not add comments to
`requireWalletEntry` or `getDisclosure` — those are self-evident.

---

## Concerns

- **The 503 swallows the cause.** `catch (Exception ex)` is what the brief specifies and it
  is correct at the API boundary — an IPFS outage and a malformed envelope are both "your
  content is unavailable" to a holder. But `ex` is discarded and nothing is logged, so an
  operator debugging a real IPFS outage has nothing to grep for. Adding a logger here is one
  line and I deliberately did not do it, because it was not requested and no other service in
  this codebase logs. Worth a decision before this reaches production.
- **`HolderService` is now 240 lines** and this task added roughly 70 of them. It is not
  tangled — the method boundaries are clean and each method does one thing — but it is
  approaching the point where a `CredentialDisclosureService` would be the more honest home
  for the new disclosure methods. I did not split it, as that is a restructure outside this
  task's scope.
- **No controller or endpoint calls `getDisclosure` yet.** That is correct for this task
  (Task 3 adds the write path and the HTTP endpoints), but it means this method is only
  covered by unit tests until then. Nothing here is verified against a running app, and
  nothing here should be treated as such.

---

# Fix Round 1

**Status:** DONE
**Commit:** `7c30f52` — fix(holder): keep the interrupt signal and the cause when IPFS is down
Spec verdict from review: ✅ (all four findings were about tests and exception hygiene, not
about the design being wrong).

---

## Finding 1 + Finding 2 — one edit, `HolderService.loadClaims`

The single `catch (Exception ex)` became two branches, and both now attach the cause.

```java
} catch (InterruptedException ex) {

    /*
     * The blocking IPFS call is the thing that gets
     * interrupted. Dropping the signal here would let a
     * shutdown, a request timeout or a container stop
     * disappear and leave the thread running on.
     */
    Thread.currentThread().interrupt();

    throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Credential content is unavailable",
            ex
    );

} catch (Exception ex) {

    throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Credential content is unavailable",
            ex
    );
}
```

`InterruptedException` has to come first — Java requires the more specific catch clause
first, and it would not compile otherwise.

### Which exception types can actually escape — verified, not assumed

The ruling asked me to read the real signatures rather than guess, so I did. Two sources:

**`IpfsService.retrieve`** (read, `IpfsService.java:98`):

```java
public byte[] retrieve(String cid) throws IOException, InterruptedException
```

It can also throw **unchecked** `IllegalArgumentException` — lines 101-103 reject a null or
blank CID before the HTTP call. This one is easy to miss, and it is why the second branch
must stay a broad `catch (Exception)` rather than narrowing to `IOException`.

**`ObjectMapper.readValue(byte[], Class<T>)`** — I ran `javap` against the actual
jackson-databind jar in the local repository rather than trusting my recollection of the
signature:

```
public <T> T readValue(byte[], java.lang.Class<T>)
    throws java.io.IOException,
           com.fasterxml.jackson.core.exc.StreamReadException,
           com.fasterxml.jackson.databind.DatabindException
```

`StreamReadException` and `DatabindException` both extend `JsonProcessingException`, which
extends `IOException`. So every declared Jackson failure is already an `IOException` and is
covered by the second branch.

**Conclusion: there is no third type needing its own branch.** The full set that can escape
the `try` is:

| Type | Source | Covered by |
|---|---|---|
| `InterruptedException` | `HttpClient.send` in `retrieve` | branch 1 (flag restored) |
| `IOException` | `retrieve`; `readValue` incl. `StreamReadException` / `DatabindException` | branch 2 |
| `IllegalArgumentException` | blank CID in `retrieve`; null content in `readValue` | branch 2 |
| any other unchecked | Jackson internals | branch 2 |

**One thing I re-confirmed while editing:** the 404 from `requireWalletEntry` is thrown
*outside* this try block (it is a separate statement in `getDisclosure`), so the broadened
catch cannot swallow an authorisation failure and re-throw it as a 503. The pre-existing
`refusesCredentialNotInWallet` test still passes, which is the runtime proof of that.

No logger was added, per the ruling.

---

## Finding 3 — the 503 branch now has tests

Two tests, not one. I considered the controller's alternative of a single test and rejected
it, for a concrete reason:

> A test that only asserted the 503 on the `InterruptedException` branch **passes with or
> without the fix** — the old code already threw a 503. It would pin nothing.

So the interrupt test asserts the thing that actually distinguishes fixed from broken: the
restored flag. That needs its own test method, and the two tests are cheap.

**`unreachableEnvelopeIsServiceUnavailable`** — stubs `retrieve` to throw `IOException`,
asserts 503 *and* `hasCauseInstanceOf(IOException.class)`. The cause assertion is what pins
finding 2; a status-code-only assertion would have passed before this round's fix.

**`interruptedFetchRestoresInterruptFlag`** — stubs `retrieve` to throw `InterruptedException`,
asserts 503 and that `Thread.currentThread().isInterrupted()` is still `true`.

```java
} finally {
    // JUnit runs the next test on this same thread; a leaked
    // flag would break anything it blocks on.
    Thread.interrupted();
}
```

That `finally` is not decoration. JUnit 5 runs test methods sequentially on one thread, so
setting the interrupt flag and never clearing it would poison every subsequent test that
blocks on anything. The flag is asserted *inside* the `try` and cleared in the `finally`.
The 22/22 full-suite result confirms nothing leaked.

Both stubbing calls required `throws Exception` on the test method — `retrieve` declares
checked exceptions, so the `when(...)` call site has to permit them. This matches the
existing `setUp() throws Exception` idiom in the same file.

---

## Finding 4 — Global Constraint 6 is now pinned

Added to the existing `reportsExistingHiddenSet`, using the value from that test's own
fixture (`claims.put("gpa", "3.9")`):

```java
assertThat(response.claims())
        .as("the holder still sees a claim they chose to hide")
        .containsEntry("gpa", "3.9");
```

**Honest note on the TDD cycle here:** this assertion was **green on first run**, and I
expect it to be. The production code already returns the full unfiltered map — the review
said so, and it is true. This is a characterisation test that pins existing correct
behaviour, not a RED→GREEN cycle, and I am not going to dress it up as one. Its value is
purely prospective: it is the tripwire for the specific mutation the finding describes, a
later edit filtering hidden keys out of the returned map. Under that mutation
`containsEntry("gpa", "3.9")` fails while all three other tests still pass — which is
precisely why the review was right that it was missing. The comment on the assertion says so,
and names Task 4 as the change it is guarding against.

I did **not** add any filtering. Constraint 4 and Task 4's job are untouched.

---

## Trivial — unused import

Removed `import com.certchain.certchain.model.Issuer;` from
`HolderDisclosureServiceTest.java` (dead code this task's own commit introduced into a file
this task created). The identical import in `HolderServiceClaimTest.java` is pre-existing and
was deliberately left alone, as instructed.

---

## TDD evidence

### RED — tests written before the fix

The first run was a compile error, not a test failure: stubbing a checked-exception throw
requires the test method to declare it. That is a harness mistake on my part, not the RED I
wanted, so I fixed the harness and re-ran.

Command:

```
cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B test -Dtest=HolderDisclosureServiceTest
```

Relevant failing output:

```
[ERROR] ...HolderDisclosureServiceTest.unreachableEnvelopeIsServiceUnavailable -- Time elapsed: 0.060 s <<< FAILURE!
java.lang.AssertionError:

Expecting a throwable with cause being an instance of:
  java.io.IOException
but current throwable has no cause.
Throwable that failed the check:
org.springframework.web.server.ResponseStatusException: 503 SERVICE_UNAVAILABLE "Credential content is unavailable"
	at com.certchain.certchain.service.HolderService.loadClaims(HolderService.java:233)

[ERROR] ...HolderDisclosureServiceTest.interruptedFetchRestoresInterruptFlag -- Time elapsed: 0.014 s <<< FAILURE!
org.opentest4j.AssertionFailedError:
[the interrupt signal must survive the 503]
Expecting value to be true but was false
	at ...HolderDisclosureServiceTest.interruptedFetchRestoresInterruptFlag(HolderDisclosureServiceTest.java:197)

[ERROR] Tests run: 6, Failures: 2, Errors: 0, Skipped: 0
```

**Why these are the expected failures.** Each failure names the exact defect the finding
described, and neither is a typo or a fixture problem:

- Finding 2: "current throwable has no cause" — the 503 was already correct, so the only
  thing that could fail is the missing cause. The stack trace points at the old
  `HolderService.java:233`.
- Finding 1: "Expecting value to be true but was false" — the interrupt flag was consumed
  and never restored. The old code had no `Thread.currentThread().interrupt()` at all.

The other 4 tests passed, confirming the new tests were targeted and did not disturb
existing behaviour.

### GREEN — after the fix

```
cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B test -Dtest=HolderDisclosureServiceTest
```

```
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.164 s -- in com.certchain.certchain.service.HolderDisclosureServiceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### Full suite

```
cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B test
```

```
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0 -- in com.certchain.certchain.service.AuthServiceRegistrationTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0 -- in com.certchain.certchain.service.HolderDisclosureServiceTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0 -- in com.certchain.certchain.service.HolderServiceClaimTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0 -- in com.certchain.certchain.CertchainApplicationTests
[INFO] Results:
[INFO] Tests run: 22, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

20 → 22 (the two new tests). `contextLoads` still boots the real Spring context against live
PostgreSQL, so the production change did not break wiring. Output carries only the
pre-existing project-wide Mockito self-attach warnings; no new warnings.

---

## Files changed

```
certchain/src/main/java/com/certchain/certchain/service/HolderService.java                 (+19 / -1)
certchain/src/test/java/com/certchain/certchain/service/HolderDisclosureServiceTest.java  (+58 / -3)
```

`git show --stat HEAD`: 2 files changed, 74 insertions(+), 3 deletions(-).

Staged by explicit path. The pre-existing Reticle artifacts (3 modified, 7 untracked) remain
unstaged and uncommitted — confirmed with `git status --short` immediately before committing.

**Deliberately not touched,** per the round's instructions: `DisclosureResponse`;
`requireWalletEntry` and its use in `credentialFilename` (controller ruled do-not-revert, and
I did not); `HolderServiceClaimTest.java` in any way; the `Issuer` import in that file; any
admin or audit path; any claim-filtering behaviour.

---

## Concerns

- **Still no log line, by ruling.** The cause is now attached to the 503, which is a real
  improvement, but Spring Boot's default error handling does not log `ResponseStatusException`
  causes at WARN for a 5xx served to a client. An operator still gets nothing in the
  application log during an IPFS outage. I did not add a logger because this round explicitly
  ruled against it and no other service in this codebase logs. This remains the one thing I
  would change before production, and it needs a decision rather than my judgement.
- **The interrupt test mutates global thread state.** It is correct as written — asserted
  inside `try`, cleared in `finally` — but it is the only test in the suite that touches the
  interrupt flag. If anyone later enables JUnit parallel execution on the same thread pool,
  this is the test that would misbehave. The `finally` block is the guard; I have noted why it
  exists in a comment so it does not get "simplified" away.
- **The cause is attached but the two branches are otherwise identical.** That is duplication
  by design — the interrupt branch exists for the side effect, not the throw. It could
  collapse to a single catch with a conditional, but that trades clarity at the exact spot
  where a future reader most needs to see that the flag is being restored. I left it explicit.
