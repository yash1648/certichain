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

