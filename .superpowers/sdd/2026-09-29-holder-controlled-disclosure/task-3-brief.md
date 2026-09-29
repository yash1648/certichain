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

