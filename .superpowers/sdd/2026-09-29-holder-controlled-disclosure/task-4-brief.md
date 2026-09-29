# Task 4 Brief: Filter the verifier's view

**Source of truth:** `docs/superpowers/plans/2026-09-29-holder-controlled-disclosure.md`, Task 4.
**Base commit:** `38d21a6`.
**Status:** READY. Two defects in the plan text were found in controller pre-flight and are
corrected below. Everything else in the plan's Task 4 stands as written.

## Binding invariants for this task

- **Presentation only.** The filter runs *after* every integrity check, and touches only the
  claims placed into the result. The hash, signature and anchor must still cover the
  **complete** payload. A verifier looking at a partial view knows the whole credential is
  authentic; their view is narrow, their assurance is not.
- **No policy row means nothing is hidden.** The 8 credentials already on chain must come back
  byte-identical to how they behaved before this feature existed.
- **Claim order is preserved** — the verifier's view must be stable between runs.
- `LinkedHashMap`, not `Collectors.toMap`, which would scramble order.
- `DisclosureInfo` is a **top-level type** in `dto/response`, alongside `DisclosureResponse`.
  Not nested in `VerificationResult`.
- Do not add an overloaded constructor to dodge updating call sites. The compiler finding
  them is the point.

## Pre-flight findings (verified against the code, not assumed)

**1. There are THREE `new VerificationResult(...)` call sites, not two.**

The plan says "There are exactly two: `success()` (line ~413) and `failure()` (line ~464)."
That is wrong. The third is `controller/VerifierController.java:49` — the empty-upload
rejection (`valid=false`, `TAMPERED`, `reason="Credential file is empty"`, `claims=null`).
It is outside the service and the plan never mentions it, so a literal implementation
would leave the build broken or, worse, "fix" it with a placeholder.

Give it the same terminal value as `failure()`: `new DisclosureInfo(0, 0, true)`. No file was
parsed, so no policy can exist and there is nothing to disclose or withhold.

**2. `complete` must be derived from what was ACTUALLY withheld, not from the policy's intent.**

The plan computes `complete = hidden.isEmpty()`. That is wrong in two cases, and one of them
is a real bug, not cosmetics:

- **Stale policy key.** If a holder hid `gpa` and the credential no longer carries `gpa`
  (a claim removed from the envelope, or a policy row left behind), `hidden` is non-empty so
  `complete=false` — but **nothing was actually withheld**. Every future verification of that
  credential would permanently announce "the holder hid some claims" when they hid nothing
  that exists. The filter removes only keys actually present in `allClaims`.
- **Failure path with a known credential.** `failureForCredential` delegates to `success()`
  with `envelope == null`, so `allClaims` is `Map.of()`. With a non-empty policy that yields
  `{disclosed: 0, total: 0, complete: false}` — "you are not seeing everything" about a
  response that contains no claims at all.

Use the number actually withheld:

```java
new DisclosureInfo(
        visible.size(),
        allClaims.size(),
        visible.size() == allClaims.size()
)
```

This is the same length, it passes all four of the plan's tests **unmodified** (the two
formulas agree on every case they cover), and it is the only one that is true. `disclosed` and
`total` were already counts rather than policy restatements; `complete` is the same question.

## Step 1 — Create the disclosure summary record

Create `certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureInfo.java`:

```java
package com.certchain.certchain.dto.response;

/**
 * Tells a verifier how much of the credential they were shown, so a
 * partial view is never mistaken for the whole record.
 */
public record DisclosureInfo(
        int disclosed,
        int total,
        boolean complete
) {
}
```

## Step 2 — Append the component to `VerificationResult`

Add one component at the end of the existing record:

```java
        boolean anchorVerified,
        DisclosureInfo disclosure
```

Do not reorder or alter the 15 existing components.

## Step 3 — Write the failing test

Create `certchain/src/test/java/com/certchain/certchain/service/DisclosureFilterTest.java` with
the plan's four tests: `noPolicyDisclosesEverything`, `hiddenClaimIsWithheld`,
`hidingEverythingYieldsEmptyView`, `preservesClaimOrder`.

Verified against the tree, so these details are correct:
- `Credential.id` is `private UUID id;` — **not** final, so the plan's reflection to set it works.
- `VerificationService`'s current constructor takes **9** parameters; the test's 10-argument
  call is the RED you expect.

**Add a fifth test** the plan lacks, covering the stale-policy-key bug from finding 2:

```java
    @Test
    @DisplayName("a policy naming a claim the credential no longer has withholds nothing")
    void stalePolicyKeyDoesNotClaimPartiality() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.of(new CredentialDisclosure(
                        credential, Set.of("gpa", "aClaimThisCredentialNeverHad"))));

        VerificationService.DisclosedView result = filter(claims);

        assertThat(result.visible()).containsExactlyEntriesOf(claims);
        assertThat(result.info().disclosed()).isEqualTo(3);
        assertThat(result.info().total()).isEqualTo(3);
        assertThat(result.info().complete())
                .as("a policy key with no matching claim hides nothing, "
                        + "so this view is complete")
                .isTrue();
    }
```

## Step 4 — Verify RED

Run: `cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B test -Dtest=DisclosureFilterTest`

Expected: compile failure — no ten-argument constructor, no `applyDisclosure`, no
`DisclosureInfo`. Report the actual compiler output.

## Step 5 — Inject the repository

In `VerificationService`, add the field, the import, and one constructor parameter plus its
assignment, following the existing nine exactly.

## Step 6 — Add the filter

Add the plan's `applyDisclosure` and the `DisclosedView` record, with **two corrections**:

- the `complete` formula from finding 2 above;
- the plan's comment is accurate and should be kept, since it carries the real reason the
  filter sits where it does.

`DisclosedView` is a package-private nested record in `VerificationService`, and
`applyDisclosure` is package-private, so the test can call it without reflection.

## Step 7 — Apply it

In `success()` (line ~413): replace the claims argument — currently
`envelope == null ? Map.of() : envelope.credential().claims()` at lines 422-424 — with a
local, then pass the filtered map and append the disclosure argument last:

```java
        Map<String, Object> allClaims = envelope == null
                ? Map.of()
                : envelope.credential().claims();

        DisclosedView disclosed = applyDisclosure(credential, allClaims);
```

In `failure()` (line ~464): append `new DisclosureInfo(0, 0, true)`.

In `VerifierController.java:49` (**the site the plan forgot**): append
`new DisclosureInfo(0, 0, true)`.

## Step 8 — Verify GREEN

Run: `cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B test -Dtest=DisclosureFilterTest`

Expected: PASS — 5 tests.

## Step 9 — Run the full suite

Run: `cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B clean test`

Expected: all pass, now 34. `HolderServiceClaimTest`, `HolderDisclosureServiceTest` and
`CredentialDisclosurePersistenceTest` must be unaffected — **disclosure must not change claim
behaviour at all**. If any of them changes behaviour, that is a defect, not a pass.

## Step 10 — Commit

Stage only the five files, by explicit path. Never `git add -A`, `git add .`, or
`git commit -a` — the tree holds uncommitted Reticle artifacts from an earlier session that
must not be touched.

```
feat(verifier): disclose only what the holder chose to share

The filter runs after every integrity check and touches only the claims
placed into the result, so the hash, signature and anchor still cover the
complete credential. A partial view now reports itself partial instead of
looking identical to a whole one.
```

## Self-review before reporting

- Does `complete` come from what was withheld, not from the policy?
- Are all THREE call sites updated, including the controller's?
- Would each new test fail if the production logic were wrong? A test that passes against a
  broken filter is worse than no test.
- Did the full suite rise by exactly 5, with no pre-existing test weakened to get there?
