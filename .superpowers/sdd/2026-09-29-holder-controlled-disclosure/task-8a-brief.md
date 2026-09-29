# Task 8, Round A Brief: the raw-download contract lock

**Source of truth:** `docs/superpowers/plans/2026-09-29-holder-controlled-disclosure.md`, Task 8,
Steps 1–3.
**Base commit:** `e0490c5`.
**Status:** READY. The plan's test code is accurate against the refactored `HolderService`; two
corrections below, one of them substantive.

Round A is mechanical: one new test file, run the suite, commit. Round B is where the real work
is — rebuild the backend, start the app, and drive four flows in a browser. **Do not attempt any
of Round B.** No servers need to be running for this round, and starting one is out of scope.

## What this test is actually for

The product makes a promise in the holder UI: hiding a claim affects what a *verifier* sees, and
the downloaded file still contains everything. That second half is a promise about a file the
holder may share with anyone. If it stops being true, the product is describing a guarantee it does
not have, and it does so in the one place where a holder is being asked to trust it.

So the test locks: **a hidden claim is still present in the raw download**, and **the download
still requires wallet ownership**.

## Correction 1 — the plan's test does not lock what it says it locks

This is the one that matters. The plan mocks `CredentialDisclosureRepository`, never stubs it, and
never uses it. So the test asserts that bytes come back out of a method that currently contains no
filtering. It passes today for a reason that has nothing to do with disclosure.

The failure mode is not hypothetical. The most likely regression this feature can introduce is
someone wiring `applyDisclosure` — or any claim filtering — into the download path, because
"holder hid a claim" and "holder downloads the credential" sit in the same service and it would
look like a natural tidy-up. With an unstubbed mock, a new filter would most likely NPE or treat
"no policy row" as "nothing hidden" (the correct default for the *verifier* view, and exactly
wrong here) and the test could pass while the promise is broken. The test would catch a
filtering implementation that strips claims; it would not catch one that reads the policy and
concludes, correctly-but-wrongly, that nothing is hidden.

Make the guarantee explicit in the test. Stub the disclosure repository so it reports that `gpa`
**is** hidden, and then assert `gpa` is still in the downloaded bytes. After that change the test
says what the product says, and it fails if anyone ever makes the download path consult the policy
for *anything*.

Build the stub from the real API, verified against the source:

- `CredentialDisclosureRepository.findByCredentialId(UUID)` returns `Optional<CredentialDisclosure>`.
- `CredentialDisclosure` has a public no-arg constructor and `setHiddenClaims(Set<String>)`; its
  `hiddenClaims` field initialises to an empty `LinkedHashSet`.

So the stub returns a `CredentialDisclosure` whose `hiddenClaims` is `Set.of("gpa")`, wrapped in
`Optional.of(...)`. Attach it to the credential if the entity requires it — check whether the
constructor or setter needs a `Credential` reference, and set it if the code path or a future
reader would otherwise be misled. Do not add a `@ManyToOne` or any production change to make the
test convenient.

The assertion that matters is the existing one: `gpa` and `3.9` must both be in the returned JSON,
**and that must now hold while the repository reports `gpa` as hidden.** Add a comment saying so,
because otherwise the next reader sees a mocked repository and assumes the test is weaker than it
is.

## Correction 2 — the plan's expected test count is stale

The plan expects **27**. The suite is currently at **34**, and Tasks 1–4 added more than the plan
anticipated (the real-PostgreSQL persistence test, the extra claim-ownership cases, the stale-policy
and ordering tests). Your two new tests make it 36.

**Do not chase 27.** Report whatever the suite actually prints. The requirement is that every test
passes — the count is not the deliverable, and a smaller number is not a failure. Say the real
number in your report so the discrepancy is on the record.

## The rest of the plan's code is accurate — verified, not assumed

Checked against the source before writing this brief:

- `HolderService`'s constructor takes exactly the 7 arguments the plan passes, in that order, with
  `CredentialDisclosureRepository` sixth and `ObjectMapper` seventh.
- `downloadCredential` returns `byte[]` and declares `throws Exception`, so the test method needs
  `throws Exception`.
- Ownership failure comes from `requireWalletEntry`, which throws
  `ResponseStatusException(HttpStatus.NOT_FOUND, ...)`; `hasMessageContaining("404")` holds because
  Spring's message carries the status code.
- `downloadCredential` reads `wallet.getCredential().getIpfsCid()` and calls
  `ipfsService.retrieve(cid)`, so the `Credential` needs only its CID set.

Use the plan's test as the starting point. It compiles as written against today's code.

## Steps

1. Create `certchain/src/test/java/com/certchain/certchain/service/DisclosureContractTest.java`
   with the two tests the plan specifies, plus Correction 1's stub.
2. Run the full suite from `certchain/`: `./mvnw -B clean test`
3. Stage **only** that one file, by explicit path, and commit:

```
test: lock in that the raw download is never filtered

If this fails the product is describing a privacy guarantee it does
not have. The holder UI tells the holder the file contains everything,
so that statement has to stay true.
```

Never `git add -A`, `git add .`, or `git commit -a`; uncommitted Reticle artifacts are in the tree.

## Constraints

- **One new test file. No production code changes.** If the test will not compile or will not pass
  against the current `HolderService`, that is a finding to report, not something to fix by editing
  `HolderService`. Changing production code to make a contract test pass destroys the contract.
- Do not add a test framework or a dependency. JUnit, AssertJ and Mockito are already present.
- Do not touch any existing test.
- Do not start, stop, or restart any server. Nothing is listening on 6969 and that is correct for
  this round.
- Report the suite's real test count.

## Verify before claiming done

Run the suite and paste the actual summary line. If it fails, report BLOCKED with the output — do
not edit anything to make it pass.

Also confirm by reading, and state it in the report: **the download path must not consult
`disclosureRepository` at all.** Read `downloadCredential` and say so. The point of the test is
that the honest implementation ignores the policy entirely; a test that stubs a policy the code
never reads would be documenting a coincidence.

## Do not dispatch subagents

Do the work yourself. Do not spawn a reviewer or any other subagent.

## Report

Write a full report to
`/home/grim/Projects/CertiChain/.superpowers/sdd/2026-09-29-holder-controlled-disclosure/task-8a-report.md`

- **Summary** — the two tests and what each locks
- **Correction 1** — how the disclosure policy stub is wired, and the assertion that now carries it
- **The suite** — the real pass/fail/error/skipped counts, and the actual total
- **The download path** — confirmation, with the line range, that it never reads
  `disclosureRepository`
- **Deviations** — anything you did differently and why, or a statement that you did not deviate

Then reply to me with ONLY:
- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED
- Commit created (short SHA + subject)
- Suite result, with the real total and the counts
- One line on whether the two tests would actually fail if the download path started filtering

Under 15 lines. Detail goes in the report file.
