# Task 8, Round A Report: the raw-download contract lock

**Commit:** `63d6cff` — `test: lock in that the raw download is never filtered`
**Base:** `e0490c5`
**File added:** `certchain/src/test/java/com/certchain/certchain/service/DisclosureContractTest.java`
(1 file changed, 129 insertions, 0 deletions — no production code touched)

---

## Summary

One new test class, two tests, locking the two promises the holder UI makes about the raw download:

1. **`rawDownloadIsNeverFiltered`** — "the raw download still contains every claim, hidden ones
   included." A credential with `major` and `gpa` is placed in a holder's wallet, stored on a mocked
   IPFS, and downloaded. Both claims come back byte-for-byte. Critically, this now holds **while the
   disclosure repository reports `gpa` as hidden** — see Correction 1.
2. **`downloadRemainsScopedToTheOwner`** — "the download still requires wallet ownership." A
   `HolderWallet` row that does not exist yields `ResponseStatusException` carrying a 404, so no
   user can download a credential they do not hold.

Both are unit tests: every collaborator is a Mockito mock, no Spring context, no database, no
network. They are contract locks, not integration tests — the point is that the *shape* of the
service call cannot change without one of them failing.

---

## Correction 1 — how the policy stub is wired

The plan's version of test 1 created `mock(CredentialDisclosureRepository.class)` inline in the
constructor call and never used it. Mockito's default for an unstubbed `Optional`-returning method
is `Optional.empty()`, which is precisely the "no policy row → nothing hidden" default that is
**correct for the verifier view and exactly wrong for the download**. A future filter wired into
`downloadCredential` would have read that empty, concluded nothing was hidden, passed the bytes
through unchanged, and the test would still have gone green with the promise broken.

The stub is now named and wired:

```java
CredentialDisclosureRepository disclosureRepository =
        mock(CredentialDisclosureRepository.class);
...
when(disclosureRepository.findByCredentialId(credentialId))
        .thenReturn(Optional.of(
                new CredentialDisclosure(credential, Set.of("gpa"))));
...
        disclosureRepository,   // passed to the constructor instead of an inline mock
```

Built from the real API, verified against the source rather than assumed:

- `CredentialDisclosureRepository.findByCredentialId(UUID)` → `Optional<CredentialDisclosure>`
  (`repository/CredentialDisclosureRepository.java:12`).
- `CredentialDisclosure(Credential, Set<String>)` (`model/CredentialDisclosure.java:37-43`) — the
  same constructor the existing tests in `DisclosureFilterTest` and `HolderDisclosureServiceTest`
  already use, so the stub matches surrounding convention rather than inventing a second style. It
  also attaches the `Credential` in the same call, so the disclosure row is visibly *the policy for
  this credential* and a future reader is not misled into thinking it is a floating orphan.
- `hiddenClaims` is a `Set<String>` of *hidden* keys, and `Set.of("gpa")` is exactly "gpa is
  hidden" (`model/CredentialDisclosure.java:21-32`).

**The assertion that now carries it** is the existing one, unchanged:

```java
assertThat(json).contains("\"gpa\"").contains("3.9");
```

Its meaning changed. Previously it asserted "bytes pass through a method with no filtering." Now it
asserts "`gpa` survives a download even though the policy says `gpa` is hidden" — which is the
sentence the product actually says to the holder. A comment above the stub records this, because a
reader who sees a mocked repository and nothing else will assume the test is weaker than it is.

---

## The suite

Real output from `./mvnw -B clean test` in `certchain/`:

```
[INFO] Tests run: 36, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time:  47.651 s
```

**Total: 36. Passes: 36. Failures: 0. Errors: 0. Skipped: 0.**

Per class:

| Class | Tests |
|---|---|
| `CertchainApplicationTests` (context load) | 1 |
| `CredentialDisclosurePersistenceTest` (real PostgreSQL) | 1 |
| `AuthServiceRegistrationTest` | 12 |
| **`DisclosureContractTest` (new)** | **2** |
| `DisclosureFilterTest` | 5 |
| `HolderDisclosureServiceTest` | 12 |
| `HolderServiceClaimTest` | 3 |
| **Total** | **36** |

**On the plan's expected 27:** not chased, as instructed. The plan's own breakdown (1 + 12 + 3 + 9 +
4 + 2) is stale in two places — `HolderDisclosureServiceTest` is at 12 rather than 9, and
`CredentialDisclosurePersistenceTest` (the real-PostgreSQL persistence test from Task 1) is not in
the plan's list at all. The discrepancy is on the record: **the plan expected 27, the suite has
36, and all 36 pass.** The deliverable is that everything passes; the count is not.

---

## The download path

**Confirmed by reading `HolderService`: `downloadCredential` never touches `disclosureRepository`.**

- `downloadCredential` — `service/HolderService.java:143-160`. The entire body is
  `requireWalletEntry(userId, credentialId)` followed by
  `ipfsService.retrieve(wallet.getCredential().getIpfsCid())`. Two collaborators, neither of them
  the disclosure repository. Its own comment states the contract in prose: *"Return the exact
  stored envelope from IPFS - never regenerate or re-sign. This file always contains every claim,
  including any the holder has chosen to hide."*
- `requireWalletEntry` — `service/HolderService.java:239-254`. Touches only `walletRepository`, and
  this is the sole ownership gate the download passes through.
- **Full reachable line range of the download path: 143-254.** No reference to
  `disclosureRepository` anywhere in it.

For completeness, the field is declared at `:39`, assigned at `:56`, and read in exactly two places,
neither of which the download can reach: `setDisclosure` (`:224`, `:231`) and `hiddenClaimKeys`
(`:317`). `hiddenClaimKeys` is the read used by `getDisclosure` (`:175-187`) and is what feeds the
verifier-facing view — the correct place for the policy to apply.

So the stub in test 1 is a stub of a dependency the code under test deliberately ignores. That is
the point, and it is the reason the test is worth more than the plan's version: the assertion holds
*despite* the repository saying `gpa` is hidden, so it fails the moment anyone makes the download
path consult the policy for anything. The honest implementation ignores the policy entirely; this
test makes that non-negotiable rather than incidental.

---

## Deviations

None in substance. Notes on judgment calls, all within the brief's instructions:

1. **Used the 2-arg `CredentialDisclosure` constructor rather than the no-arg constructor plus
   `setHiddenClaims`.** The brief listed both options; the brief's own instruction was to attach the
   credential "if the entity requires it ... and set it if a future reader would otherwise be
   misled." The 2-arg constructor does both in one call and is the form the three existing
   disclosure test classes already use, so the codebase has exactly one style here and the new file
   follows it. No `@ManyToOne` and no production change was added for convenience.
2. **Test 2 keeps the unstubbed inline mock**, as in the plan. That is correct: it 404s in
   `requireWalletEntry` before any disclosure is reachable, and stubbing a policy there would imply
   a coupling that does not exist.
3. **Comment added above the stub**, as the brief directed, so the next reader does not read a
   mocked repository and assume the test is weaker than it is.
4. Nothing else. No production code was modified, no existing test was touched, no dependency or
   framework was added (JUnit, AssertJ, Mockito were already present), no server was started,
   stopped or restarted, and no subagent was dispatched. Only the one new file was staged, by
   explicit path; the uncommitted Reticle artifacts in the working tree are untouched and remain
   untracked.
