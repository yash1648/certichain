# Holder-Controlled Disclosure and Open Issuer Claims — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let issuers attach arbitrary claims to a credential, and let the holder choose which of those claims a verifier is shown.

**Architecture:** A new `CredentialDisclosure` row per credential stores the set of *hidden* claim keys. The signed envelope and its hash are never touched. Disclosure is applied at exactly one point — the moment claims are placed into `VerificationResult` — so every integrity check continues to run against the complete payload. Absence of a row means "hide nothing", which leaves all 8 already-anchored credentials behaving exactly as today.

**Tech Stack:** Java 21, Spring Boot 3.5.16, Spring Data JPA / Hibernate (`ddl-auto: validate`), Flyway, PostgreSQL, JUnit 5 + Mockito + AssertJ. React 19, Vite 8, plain CSS — **no frontend test framework exists in this repo**, so UI tasks are verified by `npm run build`, `npm run lint`, and a Reticle drive, not by unit tests.

**Spec:** `docs/superpowers/specs/2026-09-29-holder-controlled-disclosure-design.md` — read it before starting. This plan argues from it; where the two appear to differ, the spec wins and the plan is wrong.

---

## Global Constraints

These apply to every task. They are not task-specific instructions.

1. **Never mutate the signed envelope.** The holder's choice is a server-side policy. Any change that alters the canonical bytes, the `contentHash`, or the signature is a failure, not a feature.
2. **Every integrity check stays.** `VerificationService` CHECK 1 (`sha256(uploaded) == envelope.contentHash`), CHECK 2 (`== credential.getContentHash()`), signature verification against the issuer key, and anchor verification all continue to run on the **complete** payload. Do not skip, reorder around, or weaken any of them.
3. **No disclosure row means nothing is hidden.** This is what keeps the 8 anchored credentials valid without migration. Never introduce a default that hides anything.
4. **Core fields are never hideable.** Title, type, issuer, subject, dates and credential number always reach a verifier.
5. **Disclosure applies to the verifier path only.** Admin and audit views see the complete record. Do not filter `AdminService` or any admin/audit response.
6. **The holder's own view shows all claims**, each marked shared or hidden. Concealing a claim from the person who decided to conceal it defeats the feature.
7. **The raw download returns every claim, always** — including hidden ones. It is presentation-layer privacy, not cryptographic. No UI copy may call it sealed, protected, or hidden.
8. **Claims are not in the database.** The `credentials` table has no claims column. Claims live only in the signed envelope on IPFS, addressed by `credentials.ipfs_cid`. Read them via `ipfsService.retrieve(cid)` → `SignedCredentialEnvelope` → `credential().claims()`.
9. **Backend cap is 50 claims** (`@Size(max = 50)` on `CredentialIssueRequest.claims`). Duplicate claim keys are rejected at the UI: `Map` semantics silently discard all but the last value, and the credential is immutable once signed.
10. **PostgreSQL must be running** for `./mvnw test` — there is no embedded test database. `CertchainApplicationTests.contextLoads` boots the real context, runs Flyway, and `ddl-auto: validate` checks every entity against the migrated schema. That test is the safety net for any schema or entity mistake in Task 1.
11. **Reticle is required for any user-visible change** (`frontend/AGENTS.md`). Only `reticle_act_and_wait` and `reticle_assert` produce a verdict. `verified: "unknown"` and `verified: "no-fault"` are both failures to report as failures.
12. **Do not commit unrelated work.** The working tree also holds uncommitted Reticle artifacts from an earlier session. Stage only the files named in each task.

---

## File Structure

**Create:**

| Path | Responsibility |
|---|---|
| `certchain/src/main/resources/db/migration/V11__create_credential_disclosures.sql` | Schema: the disclosure row and its claim-key collection |
| `certchain/src/main/java/com/certchain/certchain/model/CredentialDisclosure.java` | JPA entity: credential + hidden claim keys |
| `certchain/src/main/java/com/certchain/certchain/repository/CredentialDisclosureRepository.java` | Lookup by credential id |
| `certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureResponse.java` | `{claims, hiddenClaims}` returned to the holder |
| `certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureInfo.java` | `{disclosed, total, complete}` returned to a verifier |
| `certchain/src/main/java/com/certchain/certchain/dto/request/DisclosureUpdateRequest.java` | `{hiddenClaims}` request body |
| `certchain/src/test/java/com/certchain/certchain/service/HolderDisclosureServiceTest.java` | Read/write/validation unit tests |
| `certchain/src/test/java/com/certchain/certchain/service/DisclosureFilterTest.java` | Filter + backward-compat unit tests |
| `frontend/src/components/holder/DisclosurePanel.jsx` | Holder's per-credential toggles, preview, and download warning |

**Modify:**

| Path | Change |
|---|---|
| `certchain/.../service/HolderService.java` | Inject disclosure repo + `ObjectMapper`; add `getDisclosure` / `setDisclosure`; extract `requireWalletEntry` |
| `certchain/.../controller/HolderController.java` | Two endpoints under `/api/holder/credentials/{id}/disclosure` |
| `certchain/.../service/VerificationService.java` | Filter claims at line ~424; add `DisclosureInfo` to the result |
| `certchain/.../dto/response/VerificationResult.java` | Append a `DisclosureInfo disclosure` component |
| `frontend/src/components/issuer/IssuerStudio.jsx` | Delete `assembleClaims()` and the four fixed inputs; add a key/value claim editor |
| `frontend/src/components/holder/HolderWalletView.jsx` | Mount `DisclosurePanel`; relabel the download button |
| `frontend/src/components/verifier/ResultCard.jsx` | Render the disclosure block |
| `frontend/src/services/holderService.js` | `getDisclosure` / `setDisclosure` |

---

## Task 1: Persistence for the disclosure policy

**Files:**
- Create: `certchain/src/main/resources/db/migration/V11__create_credential_disclosures.sql`
- Create: `certchain/src/main/java/com/certchain/certchain/model/CredentialDisclosure.java`
- Create: `certchain/src/main/java/com/certchain/certchain/repository/CredentialDisclosureRepository.java`

**Interfaces:**
- Consumes: existing `Credential` entity (`com.certchain.certchain.model.Credential`).
- Produces:
  - `CredentialDisclosureRepository#findByCredentialId(UUID) -> Optional<CredentialDisclosure>`
  - `CredentialDisclosure#getCredential() -> Credential`
  - `CredentialDisclosure#getHiddenClaims() -> Set<String>`
  - `CredentialDisclosure#setHiddenClaims(Set<String>) -> void`
  - `CredentialDisclosure(Credential, Set<String>)` constructor

- [ ] **Step 1: Write the migration**

Create `certchain/src/main/resources/db/migration/V11__create_credential_disclosures.sql`:

```sql
CREATE TABLE credential_disclosures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id   UUID NOT NULL REFERENCES credentials(id),
    CONSTRAINT uk_credential_disclosures_credential UNIQUE (credential_id)
);

CREATE TABLE credential_disclosure_claims (
    disclosure_id   UUID NOT NULL REFERENCES credential_disclosures(id) ON DELETE CASCADE,
    claim_key       VARCHAR(100) NOT NULL,
    CONSTRAINT pk_credential_disclosure_claims PRIMARY KEY (disclosure_id, claim_key)
);
```

The composite primary key on `(disclosure_id, claim_key)` is what makes a repeated key impossible, matching the UI rule in constraint 9.

- [ ] **Step 2: Create the entity**

Create `certchain/src/main/java/com/certchain/certchain/model/CredentialDisclosure.java`:

```java
package com.certchain.certchain.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "credential_disclosures")
public class CredentialDisclosure {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "credential_id", nullable = false, unique = true)
    private Credential credential;

    /*
     * Hidden keys, not visible keys. A missing row therefore means
     * "hide nothing", which is what keeps the 8 already-anchored
     * credentials valid without a migration.
     */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "credential_disclosure_claims",
            joinColumns = @JoinColumn(name = "disclosure_id")
    )
    @Column(name = "claim_key", nullable = false, length = 100)
    private Set<String> hiddenClaims = new LinkedHashSet<>();

    public CredentialDisclosure() {
    }

    public CredentialDisclosure(
            Credential credential,
            Set<String> hiddenClaims) {

        this.credential = credential;
        this.hiddenClaims = new LinkedHashSet<>(hiddenClaims);
    }

    public UUID getId() {
        return id;
    }

    public Credential getCredential() {
        return credential;
    }

    public Set<String> getHiddenClaims() {
        return hiddenClaims;
    }

    public void setHiddenClaims(Set<String> hiddenClaims) {
        this.hiddenClaims = new LinkedHashSet<>(hiddenClaims);
    }
}
```

- [ ] **Step 3: Create the repository**

Create `certchain/src/main/java/com/certchain/certchain/repository/CredentialDisclosureRepository.java`:

```java
package com.certchain.certchain.repository;

import com.certchain.certchain.model.CredentialDisclosure;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CredentialDisclosureRepository
        extends JpaRepository<CredentialDisclosure, UUID> {

    Optional<CredentialDisclosure> findByCredentialId(UUID credentialId);
}
```

- [ ] **Step 4: Run the full test suite**

Run: `cd certchain && ./mvnw -B clean test`

Expected: all tests pass. `CertchainApplicationTests.contextLoads` boots the real context, Flyway applies V11, and `ddl-auto: validate` compares the entity to the migrated schema. **A failure here means the entity and migration disagree** — fix before continuing. If PostgreSQL is not reachable, every test fails with a connection error; start the database first.

- [ ] **Step 5: Commit**

```bash
git add certchain/src/main/resources/db/migration/V11__create_credential_disclosures.sql \
        certchain/src/main/java/com/certchain/certchain/model/CredentialDisclosure.java \
        certchain/src/main/java/com/certchain/certchain/repository/CredentialDisclosureRepository.java
git commit -m "feat: persist per-credential disclosure policy

Stores the set of hidden claim keys rather than visible ones, so a
credential with no row hides nothing and every already-anchored
credential keeps verifying without a migration."
```

---

## Task 2: The holder's read path

**Files:**
- Create: `certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureResponse.java`
- Modify: `certchain/.../service/HolderService.java:32-44` (constructor), add `getDisclosure` and two private helpers
- Test: `certchain/src/test/java/com/certchain/certchain/service/HolderDisclosureServiceTest.java`

**Interfaces:**
- Consumes: `CredentialDisclosureRepository#findByCredentialId`, `HolderWalletRepository#findByUserIdAndCredentialId`, `IpfsService#retrieve(String)`, `Credential#getIpfsCid()`.
- Produces:
  - `HolderService#getDisclosure(UUID userId, UUID credentialId) -> DisclosureResponse`
  - `record DisclosureResponse(Map<String, Object> claims, List<String> hiddenClaims)`
  - private `HolderService#requireWalletEntry(UUID, UUID) -> HolderWallet`
  - private `HolderService#loadClaims(Credential) -> Map<String, Object>`

- [ ] **Step 1: Create the response DTO**

Create `certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureResponse.java`:

```java
package com.certchain.certchain.dto.response;

import java.util.List;
import java.util.Map;

/**
 * The holder's own record of a credential: every claim, plus which
 * of them are withheld from verifiers. The full claim map is required
 * because the holder cannot choose what to hide without seeing it.
 */
public record DisclosureResponse(
        Map<String, Object> claims,
        List<String> hiddenClaims
) {
}
```

- [ ] **Step 2: Write the failing test**

Create `certchain/src/test/java/com/certchain/certchain/service/HolderDisclosureServiceTest.java`:

```java
package com.certchain.certchain.service;

import com.certchain.certchain.dto.response.DisclosureResponse;
import com.certchain.certchain.model.Credential;
import com.certchain.certchain.model.CredentialDisclosure;
import com.certchain.certchain.model.HolderWallet;
import com.certchain.certchain.model.Issuer;
import com.certchain.certchain.model.Role;
import com.certchain.certchain.model.User;
import com.certchain.certchain.repository.CredentialAnchorRepository;
import com.certchain.certchain.repository.CredentialDisclosureRepository;
import com.certchain.certchain.repository.CredentialRepository;
import com.certchain.certchain.repository.CredentialStatusRepository;
import com.certchain.certchain.repository.HolderWalletRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HolderDisclosureServiceTest {

    private HolderWalletRepository walletRepository;
    private CredentialDisclosureRepository disclosureRepository;
    private IpfsService ipfsService;
    private HolderService holderService;

    private UUID userId;
    private UUID credentialId;
    private Credential credential;

    private static final String CID = "bafytestcid";

    @BeforeEach
    void setUp() throws Exception {
        walletRepository = mock(HolderWalletRepository.class);
        disclosureRepository = mock(CredentialDisclosureRepository.class);
        ipfsService = mock(IpfsService.class);

        holderService = new HolderService(
                walletRepository,
                mock(CredentialRepository.class),
                mock(CredentialStatusRepository.class),
                ipfsService,
                mock(CredentialAnchorRepository.class),
                disclosureRepository,
                new ObjectMapper()
        );

        userId = UUID.randomUUID();
        credentialId = UUID.randomUUID();

        credential = new Credential();
        credential.setIpfsCid(CID);
        credential.setSubject(holder(userId));

        HolderWallet wallet = new HolderWallet();
        wallet.setCredential(credential);

        when(walletRepository.findByUserIdAndCredentialId(userId, credentialId))
                .thenReturn(Optional.of(wallet));
        when(ipfsService.retrieve(anyString()))
                .thenReturn(envelopeBytes());
    }

    private static User holder(UUID id) {
        User user = new User();
        user.setEmail("holder@example.com");
        user.setFullName("A Holder");
        user.setRole(Role.HOLDER);
        try {
            java.lang.reflect.Field field =
                    User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return user;
    }

    private static byte[] envelopeBytes() throws Exception {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("major", "Computer Science");
        claims.put("gpa", "3.9");

        Map<String, Object> credentialNode = new LinkedHashMap<>();
        credentialNode.put("credentialNumber", "SSD-TEST-0001");
        credentialNode.put("type", "Degree");
        credentialNode.put("title", "Bachelor of Science");
        credentialNode.put("claims", claims);

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("credential", credentialNode);
        envelope.put("contentHash", "a".repeat(64));
        envelope.put("signature", "sig");
        envelope.put("keyId", "key-1");

        return new ObjectMapper().writeValueAsBytes(envelope);
    }

    @Test
    @DisplayName("the holder sees every claim and no hidden set when none is set")
    void readsClaimsAndEmptyHiddenSet() {
        when(disclosureRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.empty());

        DisclosureResponse response =
                holderService.getDisclosure(userId, credentialId);

        assertThat(response.claims())
                .containsEntry("major", "Computer Science")
                .containsEntry("gpa", "3.9");
        assertThat(response.hiddenClaims()).isEmpty();
    }

    @Test
    @DisplayName("a credential with no disclosure row still reports its full claims")
    void noRowMeansNothingHidden() {
        when(disclosureRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.empty());

        assertThat(holderService.getDisclosure(userId, credentialId).claims())
                .hasSize(2);
    }

    @Test
    @DisplayName("an existing hidden set is reported back to the holder")
    void reportsExistingHiddenSet() {
        CredentialDisclosure disclosure =
                new CredentialDisclosure(credential, Set.of("gpa"));
        when(disclosureRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.of(disclosure));

        assertThat(holderService.getDisclosure(userId, credentialId).hiddenClaims())
                .containsExactly("gpa");
    }

    @Test
    @DisplayName("a credential outside the caller's wallet is not readable")
    void refusesCredentialNotInWallet() {
        when(walletRepository.findByUserIdAndCredentialId(userId, credentialId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                holderService.getDisclosure(userId, credentialId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd certchain && ./mvnw -B test -Dtest=HolderDisclosureServiceTest`

Expected: FAIL to compile — `HolderService` has no constructor taking seven arguments and no `getDisclosure`. That is the correct failure; the test cannot even build until the method exists.

- [ ] **Step 4: Extend the HolderService constructor**

In `certchain/src/main/java/com/certchain/certchain/service/HolderService.java`, add the two new dependencies. Change the constructor to:

```java
    public HolderService(
            HolderWalletRepository walletRepository,
            CredentialRepository credentialRepository,
            CredentialStatusRepository statusRepository,
            IpfsService ipfsService,
            CredentialAnchorRepository anchorRepository,
            CredentialDisclosureRepository disclosureRepository,
            ObjectMapper objectMapper) {

        this.walletRepository = walletRepository;
        this.credentialRepository = credentialRepository;
        this.statusRepository = statusRepository;
        this.ipfsService = ipfsService;
        this.anchorRepository = anchorRepository;
        this.disclosureRepository = disclosureRepository;
        this.objectMapper = objectMapper;
    }
```

Add the imports and fields:

```java
import com.certchain.certchain.dto.response.DisclosureResponse;
import com.certchain.certchain.model.CredentialDisclosure;
import com.certchain.certchain.repository.CredentialDisclosureRepository;
import com.certchain.certchain.dto.response.SignedCredentialEnvelope;
import com.fasterxml.jackson.databind.ObjectMapper;
```

```java
    private final CredentialDisclosureRepository disclosureRepository;
    private final ObjectMapper objectMapper;
```

- [ ] **Step 5: Extract the wallet-ownership lookup**

`downloadCredential` already performs this check inline. Rather than copy it a third time, extract it and use it in both places. Add:

```java
    private HolderWallet requireWalletEntry(
            UUID userId,
            UUID credentialId) {

        return walletRepository
                .findByUserIdAndCredentialId(
                        userId,
                        credentialId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Credential not in wallet: "
                                        + credentialId
                        ));
    }
```

Then replace the body of `downloadCredential` (lines 135-154) with:

```java
        HolderWallet wallet = requireWalletEntry(userId, credentialId);

        /*
         * Return the exact stored envelope from IPFS - never
         * regenerate or re-sign. This file always contains every
         * claim, including any the holder has chosen to hide; the
         * holder interface must say so wherever it is offered.
         */
        return ipfsService.retrieve(
                wallet.getCredential().getIpfsCid()
        );
```

Behaviour is identical; the comment records the constraint from Global Constraint 7 at the place that governs it.

- [ ] **Step 6: Add the claim loader**

Add two private methods. Claims are not in the database (Global Constraint 8), so they come from the IPFS envelope:

```java
    private Map<String, Object> loadClaims(
            Credential credential) {

        try {

            byte[] bytes = ipfsService.retrieve(
                    credential.getIpfsCid()
            );

            SignedCredentialEnvelope envelope =
                    objectMapper.readValue(
                            bytes,
                            SignedCredentialEnvelope.class
                    );

            if (envelope.credential() == null
                    || envelope.credential().claims() == null) {

                return Map.of();
            }

            return envelope.credential().claims();

        } catch (Exception ex) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Credential content is unavailable"
            );
        }
    }

    private List<String> hiddenClaimKeys(
            UUID credentialId) {

        return disclosureRepository
                .findByCredentialId(credentialId)
                .map(CredentialDisclosure::getHiddenClaims)
                .map(List::copyOf)
                .orElseGet(List::of);
    }
```

- [ ] **Step 7: Add the public read method**

```java
    @Transactional(readOnly = true)
    public DisclosureResponse getDisclosure(
            UUID userId,
            UUID credentialId) {

        Credential credential =
                requireWalletEntry(userId, credentialId)
                        .getCredential();

        return new DisclosureResponse(
                loadClaims(credential),
                hiddenClaimKeys(credentialId)
        );
    }
```

- [ ] **Step 8: Update the existing test's constructor**

`HolderServiceClaimTest` constructs `HolderService` with five arguments and will no longer compile. Change its `setUp` to pass seven:

```java
        holderService = new HolderService(
                walletRepository,
                credentialRepository,
                mock(CredentialStatusRepository.class),
                mock(IpfsService.class),
                mock(CredentialAnchorRepository.class),
                mock(CredentialDisclosureRepository.class),
                new ObjectMapper()
        );
```

Add the `CredentialDisclosureRepository` and `ObjectMapper` imports to that file.

- [ ] **Step 9: Run the tests to verify they pass**

Run: `cd certchain && ./mvnw -B test -Dtest='HolderDisclosureServiceTest+HolderServiceClaimTest'`

Expected: PASS — 4 + 3 tests.

- [ ] **Step 10: Commit**

```bash
git add certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureResponse.java \
        certchain/src/main/java/com/certchain/certchain/service/HolderService.java \
        certchain/src/test/java/com/certchain/certchain/service/HolderDisclosureServiceTest.java \
        certchain/src/test/java/com/certchain/certchain/service/HolderServiceClaimTest.java
git commit -m "feat(holder): expose a credential's claims and current hidden set

The holder cannot choose what to withhold without seeing what is
there, and the wallet response carries no claims, so this returns the
full claim map read from the IPFS envelope. Extracts the wallet
ownership check rather than copying it a third time."
```

---

## Task 3: The write path, its validation, and the endpoints

**Files:**
- Create: `certchain/src/main/java/com/certchain/certchain/dto/request/DisclosureUpdateRequest.java`
- Modify: `certchain/.../service/HolderService.java` (add `setDisclosure`)
- Modify: `certchain/.../controller/HolderController.java:65-92`
- Test: `certchain/src/test/java/com/certchain/certchain/service/HolderDisclosureServiceTest.java`

**Interfaces:**
- Consumes: `HolderService#requireWalletEntry`, `#loadClaims`, `CredentialDisclosureRepository#save`.
- Produces:
  - `HolderService#setDisclosure(UUID userId, UUID credentialId, List<String> hiddenClaims) -> DisclosureResponse`
  - `record DisclosureUpdateRequest(List<String> hiddenClaims)`
  - `GET /api/holder/credentials/{id}/disclosure`
  - `PUT /api/holder/credentials/{id}/disclosure`

- [ ] **Step 1: Create the request DTO**

Create `certchain/src/main/java/com/certchain/certchain/dto/request/DisclosureUpdateRequest.java`:

```java
package com.certchain.certchain.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record DisclosureUpdateRequest(
        @NotNull List<String> hiddenClaims
) {
}
```

`@NotNull` is deliberate: a missing field is a `400`, not an implicit "hide nothing". A client that wants everything visible sends an empty list, which is unambiguous.

- [ ] **Step 2: Write the failing tests**

Append to `HolderDisclosureServiceTest`:

```java
    @Test
    @DisplayName("a valid hidden set is saved and echoed back")
    void savesValidHiddenSet() {
        when(disclosureRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.empty());
        when(disclosureRepository.save(any(CredentialDisclosure.class)))
                .thenAnswer(i -> i.getArgument(0));

        DisclosureResponse response = holderService.setDisclosure(
                userId, credentialId, List.of("gpa"));

        assertThat(response.hiddenClaims()).containsExactly("gpa");
        assertThat(response.claims()).hasSize(2);
        verify(disclosureRepository).save(any(CredentialDisclosure.class));
    }

    @Test
    @DisplayName("hiding a claim the credential does not have is rejected by name")
    void rejectsUnknownClaimKey() {
        assertThatThrownBy(() -> holderService.setDisclosure(
                userId, credentialId, List.of("gpa", "salary")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400")
                .hasMessageContaining("salary");

        verify(disclosureRepository, never()).save(any(CredentialDisclosure.class));
    }

    @Test
    @DisplayName("an empty set resets the credential to showing everything")
    void emptySetResetsToVisible() {
        when(disclosureRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.empty());
        when(disclosureRepository.save(any(CredentialDisclosure.class)))
                .thenAnswer(i -> i.getArgument(0));

        assertThat(holderService.setDisclosure(
                userId, credentialId, List.of()).hiddenClaims())
                .isEmpty();
    }

    @Test
    @DisplayName("hiding every claim is allowed")
    void allowsHidingEverything() {
        when(disclosureRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.empty());
        when(disclosureRepository.save(any(CredentialDisclosure.class)))
                .thenAnswer(i -> i.getArgument(0));

        assertThat(holderService.setDisclosure(
                userId, credentialId, List.of("major", "gpa")).hiddenClaims())
                .hasSize(2);
    }

    @Test
    @DisplayName("another holder cannot set disclosure on a credential they do not hold")
    void refusesSettingDisclosureForForeignCredential() {
        when(walletRepository.findByUserIdAndCredentialId(userId, credentialId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> holderService.setDisclosure(
                userId, credentialId, List.of("gpa")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }
```

Add the static imports `verify`, `never`, and `any` if the file does not already have them.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd certchain && ./mvnw -B test -Dtest=HolderDisclosureServiceTest`

Expected: compile failure — no `setDisclosure`. Correct.

- [ ] **Step 4: Implement `setDisclosure`**

Add to `HolderService`:

```java
    @Transactional
    public DisclosureResponse setDisclosure(
            UUID userId,
            UUID credentialId,
            List<String> hiddenClaims) {

        Credential credential =
                requireWalletEntry(userId, credentialId)
                        .getCredential();

        Map<String, Object> claims = loadClaims(credential);

        Set<String> requested = new LinkedHashSet<>(hiddenClaims);

        Set<String> unknown = new LinkedHashSet<>(requested);
        unknown.removeAll(claims.keySet());

        if (!unknown.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Not claims on this credential: " + unknown
            );
        }

        CredentialDisclosure disclosure =
                disclosureRepository
                        .findByCredentialId(credentialId)
                        .orElseGet(() -> new CredentialDisclosure(
                                credential, requested));

        disclosure.setHiddenClaims(requested);

        disclosureRepository.save(disclosure);

        return new DisclosureResponse(
                claims,
                List.copyOf(requested)
        );
    }
```

Add imports: `java.util.LinkedHashSet`, `java.util.Set`, `java.util.List`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd certchain && ./mvnw -B test -Dtest=HolderDisclosureServiceTest`

Expected: PASS — 9 tests.

- [ ] **Step 6: Add the two endpoints**

In `HolderController`, after the existing `download` mapping, add:

```java
    @GetMapping("/credentials/{id}/disclosure")
    public ResponseEntity<DisclosureResponse> getDisclosure(
            Authentication authentication,
            @PathVariable UUID id) {

        return ResponseEntity.ok(
                holderService.getDisclosure(
                        currentUserId(authentication),
                        id
                )
        );
    }

    @PutMapping("/credentials/{id}/disclosure")
    public ResponseEntity<DisclosureResponse> setDisclosure(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody DisclosureUpdateRequest request) {

        return ResponseEntity.ok(
                holderService.setDisclosure(
                        currentUserId(authentication),
                        id,
                        request.hiddenClaims()
                )
        );
    }
```

Add imports: `com.certchain.certchain.dto.request.DisclosureUpdateRequest`, `com.certchain.certchain.dto.response.DisclosureResponse`, and `jakarta.validation.Valid` if absent. Both endpoints sit under the existing `/api/holder` mapping, so the current `SecurityFilterChain` already scopes them to holders and admins — no security change is needed or permitted here.

- [ ] **Step 7: Run the whole backend suite**

Run: `cd certchain && ./mvnw -B clean test`

Expected: all tests pass, including `contextLoads`.

- [ ] **Step 8: Commit**

```bash
git add certchain/src/main/java/com/certchain/certchain/dto/request/DisclosureUpdateRequest.java \
        certchain/src/main/java/com/certchain/certchain/service/HolderService.java \
        certchain/src/main/java/com/certchain/certchain/controller/HolderController.java \
        certchain/src/test/java/com/certchain/certchain/service/HolderDisclosureServiceTest.java
git commit -m "feat(holder): let a holder choose which claims verifiers see

Validates hidden keys against the credential's real claims so a typo
is a 400 naming the key rather than a silent no-op. An empty set
resets to showing everything, so no separate delete endpoint."
```

---

## Task 4: Filter the verifier's view

**Files:**
- Create: `certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureInfo.java`
- Modify: `certchain/.../dto/response/VerificationResult.java` (append one component)
- Modify: `certchain/.../service/VerificationService.java:413-445` and `:464`
- Test: `certchain/src/test/java/com/certchain/certchain/service/DisclosureFilterTest.java`

**Interfaces:**
- Consumes: `CredentialDisclosureRepository#findByCredentialId`.
- Produces:
  - `record DisclosureInfo(int disclosed, int total, boolean complete)` — as `VerificationResult.DisclosureInfo`
  - `VerificationResult#disclosure() -> DisclosureInfo`
  - `VerificationService#applyDisclosure(Credential, Map<String,Object>) -> VerificationService.DisclosedView` (package-private)
  - `record VerificationService.DisclosedView(Map<String,Object> visible, DisclosureInfo info)`

- [ ] **Step 1: Create the disclosure summary record**

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

- [ ] **Step 2: Append the component to `VerificationResult`**

Add one component to the existing record, at the end:

```java
public record VerificationResult(
        ... existing components unchanged ...
        boolean anchorVerified,
        DisclosureInfo disclosure
) {
}
```

Every `new VerificationResult(...)` call site must now pass one more argument. There are exactly two: `success()` (line ~413) and `failure()` (line ~464). The compiler will find them; do not add an overloaded constructor to avoid the fix.

- [ ] **Step 3: Write the failing test**

Create `certchain/src/test/java/com/certchain/certchain/service/DisclosureFilterTest.java`:

```java
package com.certchain.certchain.service;

import com.certchain.certchain.model.Credential;
import com.certchain.certchain.model.CredentialDisclosure;
import com.certchain.certchain.repository.CredentialAnchorRepository;
import com.certchain.certchain.repository.CredentialDisclosureRepository;
import com.certchain.certchain.repository.CredentialRepository;
import com.certchain.certchain.repository.CredentialStatusRepository;
import com.certchain.certchain.repository.IssuerKeyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The holder's disclosure policy is presentation only. The property
 * that matters most is the negative one: a credential with no policy
 * must come back byte-identical to how it behaved before disclosure
 * existed, or the 8 credentials already on chain start behaving
 * differently for no reason.
 */
class DisclosureFilterTest {

    private CredentialDisclosureRepository disclosureRepository;
    private VerificationService verificationService;
    private Credential credential;

    private Map<String, Object> claims;

    @BeforeEach
    void setUp() {
        disclosureRepository = mock(CredentialDisclosureRepository.class);

        credential = new Credential();
        try {
            java.lang.reflect.Field field =
                    Credential.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(credential, UUID.randomUUID());
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }

        claims = new LinkedHashMap<>();
        claims.put("major", "Computer Science");
        claims.put("gpa", "3.9");
        claims.put("honors", "summa cum laude");

        verificationService = new VerificationService(
                new ObjectMapper(),
                mock(CredentialRepository.class),
                mock(CredentialStatusRepository.class),
                mock(IssuerKeyRepository.class),
                mock(IpfsService.class),
                new CanonicalizationService(new ObjectMapper()),
                mock(CryptoService.class),
                mock(CredentialAnchorRepository.class),
                mock(BlockchainAnchorService.class),
                disclosureRepository
        );
    }

    /** Package-private on the service, so no reflection is needed here. */
    private VerificationService.DisclosedView filter(Map<String, Object> allClaims) {
        return verificationService.applyDisclosure(credential, allClaims);
    }
    @Test
    @DisplayName("no policy means every claim is disclosed and the view is complete")
    void noPolicyDisclosesEverything() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.empty());

        VerificationService.DisclosedView result = filter(claims);

        assertThat(result.visible()).containsExactlyEntriesOf(claims);
        assertThat(result.info().complete()).isTrue();
    }

    @Test
    @DisplayName("a hidden claim is withheld and the view reports itself partial")
    void hiddenClaimIsWithheld() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.of(new CredentialDisclosure(
                        credential, Set.of("gpa"))));

        VerificationService.DisclosedView result = filter(claims);

        assertThat(result.visible())
                .containsEntry("major", "Computer Science")
                .doesNotContainKey("gpa");
        assertThat(result.info().disclosed()).isEqualTo(2);
        assertThat(result.info().total()).isEqualTo(3);
        assertThat(result.info().complete()).isFalse();
    }

    @Test
    @DisplayName("hiding every claim yields an empty but honest view")
    void hidingEverythingYieldsEmptyView() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.of(new CredentialDisclosure(
                        credential, Set.of("major", "gpa", "honors"))));

        VerificationService.DisclosedView result = filter(claims);

        assertThat(result.visible()).isEmpty();
        assertThat(result.info().disclosed()).isZero();
        assertThat(result.info().complete()).isFalse();
    }

    @Test
    @DisplayName("claim order is preserved so the verifier view is stable")
    void preservesClaimOrder() {
        when(disclosureRepository.findByCredentialId(credential.getId()))
                .thenReturn(Optional.of(new CredentialDisclosure(
                        credential, Set.of("gpa"))));

        assertThat(filter(claims).visible().keySet())
                .containsExactly("major", "honors");
    }
}
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd certchain && ./mvnw -B test -Dtest=DisclosureFilterTest`

Expected: compile failure — `VerificationService` has no eight-argument constructor and no `applyDisclosure` method. Correct.

- [ ] **Step 5: Inject the repository**

In `VerificationService`, add the field, the import, and one constructor parameter:

```java
    private final CredentialDisclosureRepository disclosureRepository;
```

```java
        this.disclosureRepository = disclosureRepository;
```

- [ ] **Step 6: Add the filter**

Add this private method to `VerificationService`:

```java
    /*
     * Presentation only. Every integrity check above this point has
     * already run against the COMPLETE payload, so a verifier looking
     * at a partial view still knows the whole credential is authentic
     * - their view is narrow, their assurance is not.
     *
     * Package-private rather than private so the unit test can call
     * it directly instead of through reflection.
     */
    DisclosedView applyDisclosure(
            Credential credential,
            Map<String, Object> allClaims) {

        Set<String> hidden = disclosureRepository
                .findByCredentialId(credential.getId())
                .map(CredentialDisclosure::getHiddenClaims)
                .orElseGet(Set::of);

        Map<String, Object> visible = new LinkedHashMap<>();

        allClaims.forEach((key, value) -> {
            if (!hidden.contains(key)) {
                visible.put(key, value);
            }
        });

        return new DisclosedView(
                visible,
                new DisclosureInfo(
                        visible.size(),
                        allClaims.size(),
                        hidden.isEmpty()
                )
        );
    }

    /** The claims a verifier is shown, plus a count of what was withheld. */
    record DisclosedView(
            Map<String, Object> visible,
            DisclosureInfo info
    ) {
    }
```

The `LinkedHashMap` is deliberate: `Collectors.toMap` would scramble the order and the verifier's view would change between runs for no reason.

- [ ] **Step 7: Apply it at the single insertion point**

In `success()`, replace lines 422-424 — the argument currently reading `envelope == null ? Map.of() : envelope.credential().claims()` — with a call to the filter, and add the disclosure argument to the constructor call:

```java
        Map<String, Object> allClaims = envelope == null
                ? Map.of()
                : envelope.credential().claims();

        DisclosedView disclosed = applyDisclosure(credential, allClaims);
```

Then change the claims argument in the `new VerificationResult(...)` call to `disclosed.visible()`, and append the disclosure argument last:

```java
                disclosed.info()
```

In `failure()`, append a terminal disclosure argument. There are no claims to describe:

```java
                new DisclosureInfo(0, 0, true)
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd certchain && ./mvnw -B test -Dtest=DisclosureFilterTest`

Expected: PASS — 4 tests.

- [ ] **Step 9: Run the full suite**

Run: `cd certchain && ./mvnw -B clean test`

Expected: all pass. The existing `HolderServiceClaimTest` and `HolderDisclosureServiceTest` must be unaffected — disclosure must not change claim behaviour at all.

- [ ] **Step 10: Commit**

```bash
git add certchain/src/main/java/com/certchain/certchain/dto/response/DisclosureInfo.java \
        certchain/src/main/java/com/certchain/certchain/dto/response/VerificationResult.java \
        certchain/src/main/java/com/certchain/certchain/service/VerificationService.java \
        certchain/src/test/java/com/certchain/certchain/service/DisclosureFilterTest.java
git commit -m "feat(verifier): disclose only what the holder chose to share

The filter runs after every integrity check and touches only the
claims placed into the result, so the hash, signature and anchor still
cover the complete credential. A partial view now reports itself
partial instead of looking identical to a whole one."
```

---

## Task 5: Let the issuer attach arbitrary claims

**Files:**
- Modify: `frontend/src/components/issuer/IssuerStudio.jsx:66-69, 185-194, 680-720`

**Interfaces:**
- Consumes: `issuerService.issueCredential(payload, token)` — unchanged.
- Produces: a `claims` object built from user-edited rows.

There is no frontend test framework in this repo, so this task is verified by build, lint, and the Reticle drive in Task 8.

- [ ] **Step 1: Replace the four fixed states with a row model**

In `IssuerStudio.jsx`, delete the four `useState` lines at 66-69 (`programMajor`, `gpa`, `honors`, `department`) and add:

```jsx
  const [claimRows, setClaimRows] = useState([
    { id: 1, key: '', value: '' },
  ]);
  const [nextRowId, setNextRowId] = useState(2);

  const CLAIM_CAP = 50;

  const PRESETS = [
    { key: 'major', value: '' },
    { key: 'gpa', value: '' },
    { key: 'honors', value: '' },
    { key: 'department', value: '' },
  ];
```

- [ ] **Step 2: Derive the duplicate-key error**

Add after the state:

```jsx
  const trimmedRows = claimRows.filter((r) => r.key.trim());
  const seenKeys = new Set();
  const duplicateKey = trimmedRows.find(
    (r) => seenKeys.has(r.key.trim()) || !seenKeys.add(r.key.trim())
  )?.key.trim();
```

A repeated key is silent data loss — `Map` keeps the last value and the credential is immutable the moment it is signed — so this is surfaced before submission, not after.

- [ ] **Step 3: Rewrite `assembleClaims`**

Replace the existing 8-line function with:

```jsx
  const assembleClaims = () => {
    const obj = {};
    for (const row of trimmedRows) {
      obj[row.key.trim()] = row.value.trim();
    }
    return obj;
  };
```

- [ ] **Step 4: Add the row handlers**

```jsx
  const addRow = (preset) => {
    setClaimRows((prev) => [
      ...prev,
      preset
        ? { id: nextRowId, key: preset.key, value: '' }
        : { id: nextRowId, key: '', value: '' },
    ]);
    setNextRowId((n) => n + 1);
  };

  const updateRow = (id, field, value) => {
    setClaimRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeRow = (id) => {
    setClaimRows((prev) => prev.filter((r) => r.id !== id));
  };
```

- [ ] **Step 5: Replace the fixed form inputs**

Find the JSX block containing the `programMajor` input (around line 692) together with the sibling `gpa`, `honors` and `department` inputs, and replace the whole block with:

```jsx
                        <div className="field">
                          <label htmlFor="claimRows">Certificate claims</label>
                          <p className="hint">
                            Anything you add here is signed into the
                            certificate. The holder decides which of it a
                            verifier sees.
                          </p>

                          {claimRows.map((row) => (
                            <div
                              key={row.id}
                              style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                            >
                              <input
                                aria-label={`Claim key ${row.id}`}
                                placeholder="e.g. gpa"
                                value={row.key}
                                onChange={(e) =>
                                  updateRow(row.id, 'key', e.target.value)
                                }
                                style={{ flex: '1' }}
                              />
                              <input
                                aria-label={`Claim value ${row.id}`}
                                placeholder="e.g. 3.9"
                                value={row.value}
                                onChange={(e) =>
                                  updateRow(row.id, 'value', e.target.value)
                                }
                                style={{ flex: '1' }}
                              />
                              <button
                                type="button"
                                aria-label={`Remove claim ${row.id}`}
                                onClick={() => removeRow(row.id)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => addRow(null)}
                              disabled={trimmedRows.length >= CLAIM_CAP}
                            >
                              Add claim
                            </button>
                            {PRESETS.map((p) => (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() => addRow(p)}
                                disabled={trimmedRows.length >= CLAIM_CAP}
                              >
                                + {p.key}
                              </button>
                            ))}
                            <span className="hint">
                              {trimmedRows.length} / {CLAIM_CAP}
                            </span>
                          </div>

                          {duplicateKey && (
                            <p role="alert" style={{ color: '#b91c1c' }}>
                              &ldquo;{duplicateKey}&rdquo; is used more than once. Each
                              claim needs its own name, or only the last one is
                              kept.
                            </p>
                          )}
                        </div>
```

- [ ] **Step 6: Block submission while a key is duplicated**

In `handleIssueCredential`, change the guard at its first line from:

```jsx
    if (!resolvedHolder?.id || !credTitle.trim()) return;
```

to:

```jsx
    if (!resolvedHolder?.id || !credTitle.trim() || duplicateKey) return;
```

- [ ] **Step 7: Find and fix the remaining reference**

Line ~802 renders `programMajor` in a credential summary chip. Replace any remaining use of the deleted states with a render over `trimmedRows`:

```jsx
                      {trimmedRows.map((r) => (
                        <span
                          key={r.key}
                          style={{
                            backgroundColor: '#ffffff',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {r.key}: <strong>{r.value}</strong>
                        </span>
                      ))}
```

- [ ] **Step 8: Lint and build**

Run: `cd frontend && npm run lint && npm run build`

Expected: no errors. Five pre-existing warnings are normal and were present before this work — do not treat them as regressions, and do not silence them as part of this task.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/issuer/IssuerStudio.jsx
git commit -m "feat(ui): let issuers attach arbitrary claims

The backend has accepted 50 arbitrary claims all along; a hardcoded
assembleClaims() was the only thing limiting them. Duplicate keys are
rejected before submission because Map semantics would silently keep
only the last one on a credential that is immutable once signed."
```

---

## Task 6: The holder's disclosure panel

**Files:**
- Modify: `frontend/src/services/holderService.js` (add two methods)
- Create: `frontend/src/components/holder/DisclosurePanel.jsx`
- Modify: `frontend/src/components/holder/HolderWalletView.jsx`

**Interfaces:**
- Consumes: `GET`/`PUT /api/holder/credentials/{id}/disclosure` returning `{claims, hiddenClaims}`.
- Produces: `holderService.getDisclosure(credentialId, token)`, `holderService.setDisclosure(credentialId, hiddenClaims, token)`.

- [ ] **Step 1: Add the two service methods**

In `frontend/src/services/holderService.js`, following the shape of `downloadCredential`:

```js
  async getDisclosure(credentialId, token) {
    const response = await fetchWithTimeout(`${API_BASE}/credentials/${credentialId}/disclosure`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      await handleResponse(response); // Throws structured error
    }

    return response.json();
  },

  async setDisclosure(credentialId, hiddenClaims, token) {
    const response = await fetchWithTimeout(`${API_BASE}/credentials/${credentialId}/disclosure`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hiddenClaims }),
    });

    if (!response.ok) {
      await handleResponse(response); // Throws structured error
    }

    return response.json();
  },
```

- [ ] **Step 2: Create the panel component**

Create `frontend/src/components/holder/DisclosurePanel.jsx`:

```jsx
import { useState } from 'react';
import { holderService } from '../../services/holderService';

/**
 * The holder decides what a verifier is shown. This is presentation
 * control, not secrecy: the downloaded file always contains every
 * claim, and the copy here says so rather than implying otherwise.
 */
export default function DisclosurePanel({ credential, token, onError }) {
  const [claims, setClaims] = useState(null);
  const [hidden, setHidden] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const open = async () => {
    try {
      const data = await holderService.getDisclosure(credential.id, token);
      setClaims(data.claims || {});
      setHidden(new Set(data.hiddenClaims || []));
    } catch (err) {
      onError?.(err.message || 'Could not load the disclosure settings.');
    }
  };

  const toggle = async (key) => {
    const next = new Set(hidden);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setHidden(next);
    setSaving(true);
    try {
      await holderService.setDisclosure(credential.id, [...next], token);
    } catch (err) {
      setHidden(new Set(claims ? Object.keys(claims) : []));
      onError?.(err.message || 'Could not save the disclosure settings.');
    } finally {
      setSaving(false);
    }
  };

  const setAll = async (hideEverything) => {
    const next = hideEverything ? Object.keys(claims || {}) : [];

    // Hiding everything is legitimate but drastic, and it is one
    // misclick away from being unrecoverable-feeling, so it is
    // confirmed rather than merely allowed.
    if (hideEverything && next.length > 0) {
      const ok = window.confirm(
        `Hide all ${next.length} claims? A verifier will see the title, ` +
          'issuer and dates, but none of the details.'
      );
      if (!ok) return;
    }

    setHidden(new Set(next));
    setSaving(true);
    try {
      await holderService.setDisclosure(credential.id, next, token);
    } catch (err) {
      onError?.(err.message || 'Could not save the disclosure settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!claims) {
    return (
      <button type="button" onClick={open}>
        What do verifiers see?
      </button>
    );
  }

  const entries = Object.entries(claims);
  const visible = entries.filter(([k]) => !hidden.has(k));

  return (
    <div className="disclosure-panel">
      <h4>What do verifiers see?</h4>
      <p className="hint">
        {visible.length} of {entries.length} claims are shared.
        {saving ? ' Saving…' : ''}
      </p>

      {entries.map(([key, value]) => (
        <label key={key} style={{ display: 'block', marginBottom: '4px' }}>
          <input
            type="checkbox"
            checked={!hidden.has(key)}
            onChange={() => toggle(key)}
            disabled={saving}
          />
          <strong>{key}</strong>: {String(value)}
        </label>
      ))}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button type="button" onClick={() => setAll(false)} disabled={saving}>
          Share everything
        </button>
        <button type="button" onClick={() => setAll(true)} disabled={saving}>
          Hide everything
        </button>
        <button type="button" onClick={() => setPreview((p) => !p)}>
          {preview ? 'Back to your record' : 'Preview verifier view'}
        </button>
      </div>

      {preview && (
        <div style={{ marginTop: '8px', padding: '8px', border: '1px solid #e2e8f0' }}>
          <p className="hint">A verifier sees exactly this:</p>
          {visible.length === 0 ? (
            <p>No claims — just the title, issuer and dates.</p>
          ) : (
            <ul>
              {visible.map(([key, value]) => (
                <li key={key}>
                  <strong>{key}</strong>: {String(value)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hidden.size > 0 && (
        <p className="hint" style={{ color: '#b45309' }}>
          The downloaded file still contains every claim, including the{' '}
          {hidden.size} you hid. Sharing this file shares everything.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount it in the wallet view**

In `HolderWalletView.jsx`, import the panel and render it inside the per-credential card, below the existing details and above the download button:

```jsx
import DisclosurePanel from './DisclosurePanel';
```

```jsx
        <DisclosurePanel
          credential={cred}
          token={accessToken}
          onError={setWalletError}
        />
```

Use whichever prop already carries the access token and error setter in that file — read the component first rather than assuming these names. If no error state exists, pass `onError` as a function that sets the message into the component's existing notification area.

- [ ] **Step 4: Lint and build**

Run: `cd frontend && npm run lint && npm run build`

Expected: no errors; the five pre-existing warnings remain.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/holderService.js \
        frontend/src/components/holder/DisclosurePanel.jsx \
        frontend/src/components/holder/HolderWalletView.jsx
git commit -m "feat(ui): give holders a per-claim disclosure control

Includes a preview of the exact verifier view, because adjusting
disclosure without seeing the result means toggling blind, and a
warning that the downloaded file still contains hidden claims."
```

---

## Task 7: Show partial disclosure to the verifier

**Files:**
- Modify: `frontend/src/components/verifier/ResultCard.jsx:67, 263-268`

**Interfaces:**
- Consumes: `result.disclosure` — `{disclosed, total, complete}` from the API.
- Produces: a visible notice when a credential was only partly disclosed.

- [ ] **Step 1: Destructure the new field**

Where `ResultCard.jsx` destructures the result (line ~52, where `claims` is read), add:

```jsx
  disclosure,
```

- [ ] **Step 2: Render the notice above the claims**

`claimEntries` is built at line 67. Immediately after the block that renders the claim list, add:

```jsx
      {disclosure && !disclosure.complete && (
        <p
          role="status"
          className="hint"
          style={{ color: '#b45309', marginTop: '8px' }}
        >
          Partially disclosed: the holder shared {disclosure.disclosed} of{' '}
          {disclosure.total} claims. The rest were withheld by the holder.
          This credential is still valid and anchored — you are seeing fewer
          details, not a different document.
        </p>
      )}
```

The wording matters. It must not imply the credential is incomplete or suspect, and it must not imply the hidden claims were removed from the record.

- [ ] **Step 3: Lint and build**

Run: `cd frontend && npm run lint && npm run build`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/verifier/ResultCard.jsx
git commit -m "feat(ui): tell a verifier when a credential is partly disclosed

A filtered view that looks identical to a whole one is how a verifier
ends up drawing a wrong conclusion from correct data."
```

---

## Task 8: End-to-end verification and the regression locks

**Files:**
- Test: `certchain/src/test/java/com/certchain/certchain/service/DisclosureContractTest.java` (new)
- Verify: the running app, via Reticle

**Interfaces:**
- Consumes: everything from Tasks 1-7.
- Produces: proof the feature works in the running app, and two tests that stop the documented limits from eroding.

- [ ] **Step 1: Write the contract lock for the raw download**

Create `certchain/src/test/java/com/certchain/certchain/service/DisclosureContractTest.java`:

```java
package com.certchain.certchain.service;

import com.certchain.certchain.model.Credential;
import com.certchain.certchain.model.HolderWallet;
import com.certchain.certchain.repository.CredentialAnchorRepository;
import com.certchain.certchain.repository.CredentialDisclosureRepository;
import com.certchain.certchain.repository.CredentialRepository;
import com.certchain.certchain.repository.CredentialStatusRepository;
import com.certchain.certchain.repository.HolderWalletRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Disclosure is presentation-layer privacy. The raw file still
 * contains every claim, and the UI tells the holder so. If this test
 * ever fails, the product is describing a guarantee it does not have.
 */
class DisclosureContractTest {

    @Test
    @DisplayName("the raw download still contains every claim, hidden ones included")
    void rawDownloadIsNeverFiltered() throws Exception {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("major", "Computer Science");
        claims.put("gpa", "3.9");

        Map<String, Object> credentialNode = new LinkedHashMap<>();
        credentialNode.put("credentialNumber", "SSD-TEST-0001");
        credentialNode.put("type", "Degree");
        credentialNode.put("title", "Bachelor of Science");
        credentialNode.put("claims", claims);

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("credential", credentialNode);
        envelope.put("contentHash", "a".repeat(64));
        envelope.put("signature", "sig");
        envelope.put("keyId", "key-1");

        byte[] stored = new ObjectMapper().writeValueAsBytes(envelope);

        HolderWalletRepository walletRepository = mock(HolderWalletRepository.class);
        IpfsService ipfsService = mock(IpfsService.class);

        UUID userId = UUID.randomUUID();
        UUID credentialId = UUID.randomUUID();

        Credential credential = new Credential();
        credential.setIpfsCid("bafytestcid");

        HolderWallet wallet = new HolderWallet();
        wallet.setCredential(credential);

        when(walletRepository.findByUserIdAndCredentialId(userId, credentialId))
                .thenReturn(Optional.of(wallet));
        when(ipfsService.retrieve("bafytestcid")).thenReturn(stored);

        HolderService holderService = new HolderService(
                walletRepository,
                mock(CredentialRepository.class),
                mock(CredentialStatusRepository.class),
                ipfsService,
                mock(CredentialAnchorRepository.class),
                mock(CredentialDisclosureRepository.class),
                new ObjectMapper()
        );

        byte[] downloaded = holderService.downloadCredential(userId, credentialId);

        String json = new String(downloaded, StandardCharsets.UTF_8);

        assertThat(json).contains("\"gpa\"").contains("3.9");
    }

    @Test
    @DisplayName("the download still requires wallet ownership")
    void downloadRemainsScopedToTheOwner() {
        HolderWalletRepository walletRepository = mock(HolderWalletRepository.class);

        UUID userId = UUID.randomUUID();
        UUID credentialId = UUID.randomUUID();

        when(walletRepository.findByUserIdAndCredentialId(userId, credentialId))
                .thenReturn(Optional.empty());

        HolderService holderService = new HolderService(
                walletRepository,
                mock(CredentialRepository.class),
                mock(CredentialStatusRepository.class),
                mock(IpfsService.class),
                mock(CredentialAnchorRepository.class),
                mock(CredentialDisclosureRepository.class),
                new ObjectMapper()
        );

        assertThatThrownBy(() -> holderService.downloadCredential(userId, credentialId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }
}
```

- [ ] **Step 2: Run the whole backend suite**

Run: `cd certchain && ./mvnw -B clean test`

Expected: all pass. The expected total is **27** tests: 1 context load, 12 auth registration, 3 claim ownership, 9 holder disclosure, 4 filter, 2 contract.

- [ ] **Step 3: Commit the contract lock**

```bash
git add certchain/src/test/java/com/certchain/certchain/service/DisclosureContractTest.java
git commit -m "test: lock in that the raw download is never filtered

If this fails the product is describing a privacy guarantee it does
not have. The holder UI tells the holder the file contains everything,
so that statement has to stay true."
```

- [ ] **Step 4: Get the app running**

The backend must be rebuilt and restarted so the new schema and endpoints are live. If a dev server is already running on its port, stop that one first — never start a second.

```bash
cd certchain && ./mvnw -B -q clean package
SSDCVE_KEYSTORE_PATH=/home/grim/Projects/CertiChain/keystore/ssdcve.p12 \
  setsid java -jar target/certchain-0.0.1-SNAPSHOT.jar > /tmp/certchain-backend.log 2>&1 &
```

Confirm it came up: the Flyway log must show V11 applied, and the app must be listening on 6969.

- [ ] **Step 5: Drive the issuer side with Reticle**

Log in as the demo issuer (`registrar@mit.edu`). Issue a credential to `alex.mercer@alumni.org` using claims that include the presets plus at least one custom key that is not a preset, for example `researchTopic`.

Verdict required, using `reticle_act_and_wait` with `until` set on the issuing request:

- Issuing a credential whose claim keys are custom **and** not a preset results in `POST /api/issuer/credentials` returning 201.
- A second attempt that types a duplicate key shows the duplicate-key error **and does not fire a request** — the submit button is blocked.

If the tab was opened by this harness rather than the CLI, it may be hidden and throttled; pass `refuseWhenThrottled: true` so a silent no-op becomes a loud failure rather than a false pass.

- [ ] **Step 6: Drive the holder side with Reticle**

Log in as `alex.mercer@alumni.org`, open the new credential, open "What do verifiers see?", and hide one claim — use a claim that is not the recipient name, so the change is unmistakable.

Verdict required:

- Toggling a claim results in `PUT /api/holder/credentials/{id}/disclosure` returning 200.
- The panel's summary text updates to the new shared count, and the preview omits exactly the hidden claim.

- [ ] **Step 7: Drive the verifier side with Reticle**

Download the credential, then verify it as an unauthenticated verifier through the app's verification view.

Verdict required:

- The result shows the partially-disclosed notice with the correct `disclosed` / `total` counts.
- The result is still **valid** and the anchor still verifies — a partial view must not read as a broken credential.
- The hidden claim is absent from the claims the verifier can see.

- [ ] **Step 8: Verify the untouched path still works**

Verify a credential that has no disclosure policy — any of the 8 pre-existing ones, or the new one before Step 6 hid anything.

Verdict required:

- It verifies with **no** partially-disclosed notice and its full claim set intact.

This is the check that would catch a mistake in Global Constraint 3. If it fails, the whole feature is unsafe to ship because already-anchored credentials have started behaving differently.

- [ ] **Step 9: Report the verdicts honestly**

State each of the four drives and its verdict. `verified: "unknown"` and `verified: "no-fault"` are not passes and must be reported as failures. Reticle could not observe request bodies in this environment unless `VITE_RETICLE_CAPTURE_BODIES=1` is set, so assert on what the user can see and on response status — do not attempt `requestBodyMatches` and then report a pass you did not get.

---

## Definition of Done

- [ ] All 27 backend tests pass, including the two contract locks
- [ ] `./mvnw clean package` succeeds; `contextLoads` validates the V11 schema against the entity
- [ ] `npm run lint` reports no errors and `npm run build` succeeds
- [ ] All four Reticle drives produced a real verdict, and Step 8 confirmed an undisclosed credential is unchanged
- [ ] No commit touches the signed envelope, the content hash, or any integrity check
- [ ] No UI copy claims the hidden claims are sealed, protected, or removed
