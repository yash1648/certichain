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

