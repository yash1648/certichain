# Task 1 Report: Persistence for the disclosure policy

**Status: BLOCKED** — implementation complete, but the two verification/commit steps
of the brief could not be executed. See "Blocker" below. **No test run and no commit
was performed; nothing in this report should be read as a passing suite.**

---

## What I implemented

The persistence layer for the holder-controlled disclosure policy, exactly as
specified in `task-1-brief.md`. Three new files, no existing file modified.

### 1. `certchain/src/main/resources/db/migration/V11__create_credential_disclosures.sql`

Two tables, verbatim from the brief:

- `credential_disclosures` — `id UUID PK DEFAULT gen_random_uuid()`,
  `credential_id UUID NOT NULL REFERENCES credentials(id)`, with
  `uk_credential_disclosures_credential UNIQUE (credential_id)` giving one policy
  row per credential.
- `credential_disclosure_claims` — `disclosure_id UUID NOT NULL REFERENCES
  credential_disclosures(id) ON DELETE CASCADE`, `claim_key VARCHAR(100) NOT NULL`,
  composite PK `(disclosure_id, claim_key)` making a repeated key impossible.

`V11` is the correct next version: the directory holds V1, V2, V5–V10 (V3/V4 do
not exist; Flyway tolerates the gap and the database is already at V10, so V11
applies as a normal in-order migration with no `outOfOrder` setting needed).

### 2. `certchain/src/main/java/com/certchain/certchain/model/CredentialDisclosure.java`

Entity with `@Id UUID id` (`GenerationType.UUID`), a `@OneToOne(fetch = LAZY,
optional = false)` to `Credential` on a `unique` `credential_id` join column, and
`@ElementCollection` `Set<String> hiddenClaims` mapped to the claim-keys table
with `claim_key VARCHAR(100)`. Public API is exactly the five members the brief
requires (`getCredential`, `getHiddenClaims`, `setHiddenClaims`, the
`(Credential, Set<String>)` constructor, and `findByCredentialId`'s return type),
plus `getId()` and the JPA no-arg constructor.

Both constructors/setter copy into a `LinkedHashSet`, so a caller mutating the
set it passed in cannot retroactively change the entity. `getHiddenClaims()`
returns the live set, which the later tasks' add/remove flows need.

### 3. `certchain/src/main/java/com/certchain/certchain/repository/CredentialDisclosureRepository.java`

`JpaRepository<CredentialDisclosure, UUID>` with
`Optional<CredentialDisclosure> findByCredentialId(UUID credentialId)`.

---

## Blocker: the `bash` tool is denied in this session

Every `bash` invocation is rejected by a permission rule before execution:

```
The user has specified a rule which prevents you from using this specific tool call.
The following rules were applied:
  {"permission":"*","action":"allow","pattern":"*"}
  {"permission":"bash","pattern":"*","action":"deny"}
  {"permission":"bash","pattern":"bash .opencode/skills/task-management/router.sh complete*","action":"allow"}
  {"permission":"bash","pattern":"bash .opencode/skills/task-management/router.sh status*","action":"allow"}
```

The only allowed bash patterns are the task-management `router.sh` calls, and
`.opencode/skills/task-management/router.sh` does not exist in this repo (this is
an SDD-style brief, not a `.tmp/tasks/` subtask), so those are not usable either.

Consequently **Step 4 and Step 5 of the brief did not run**:

| Step | Command | Status |
|---|---|---|
| 4. Verify | `cd certchain && ./mvnw -B clean test` | **NOT RUN** — tool denied |
| 5. Commit | `git add <3 files> && git commit` | **NOT RUN** — tool denied |
| (constraint 4) | `git status` to confirm only 3 files staged | **NOT RUN** — tool denied |

I attempted the suite once to confirm the denial was real and not specific to one
command form; it was rejected identically.

**To unblock:** grant the `bash` tool for this session (or run
`cd certchain && ./mvnw -B clean test` and the commit commands out of band and
hand me the output).

---

## What I tested

**Nothing was executed.** There is no test output for this task, and I am making
no claim about the state of the suite.

The brief's verification is sound and is the right gate: `ddl-auto: validate` plus
`CertchainApplicationTests.contextLoads` boots the real Spring context against the
live database, so Flyway applies V11 and Hibernate then checks every entity mapping
against the migrated schema. A mismatch between the entity and the migration fails
that test. I could not run it.

### Static verification I was able to do instead

Because the gate is specifically "do the entity and the migration agree", I checked
that by hand, column by column, against the already-validated neighbours:

| Entity mapping | Expected PG type | V11 column | |
|---|---|---|---|
| `@Id UUID id` | `uuid` | `id UUID` | ✓ |
| `@OneToOne` → `Credential` (`UUID` id) | `uuid` | `credential_id UUID` | ✓ |
| `@CollectionTable` join column → parent id | `uuid` | `disclosure_id UUID` | ✓ |
| `@Column(length = 100) String` | `varchar(100)` | `claim_key VARCHAR(100)` | ✓ |
| `@Table(name = "credential_disclosures")` | — | table present | ✓ |

Both table shapes are structurally identical to `credential_anchors`/`V10` and
`credential_status`/`V7`, which pass `validate` today against the same database, so
the mapping has direct precedent rather than being a novel shape. `@ElementCollection`
is the one construct with no precedent in this codebase, but it is plain Jakarta
Persistence 3.1 under Hibernate 6.6 (Spring Boot 3.5.16, Java 21) and needs no
extra configuration.

`findByCredentialId` is a valid Spring Data derived query: it resolves to
`credential.id` on the `@OneToOne` association, the same shape as the existing
`CredentialRepository#existsByIssuerIdAndCredentialNumber` traversing a
`@ManyToOne`. Spring Data validates derived queries at context startup, so a bad
property path would also fail `contextLoads`.

`@SpringBootApplication` sits at `com.certchain.certchain`, the common parent of
both new packages, so entity and repository scanning pick them up with no
configuration change. Flyway (`flyway-core` + `flyway-database-postgresql`) is on the
classpath and there is no test-resources override of `application.yaml`, so the
`validate` config in force is the main one.

---

## Files changed

Created (3):

- `certchain/src/main/resources/db/migration/V11__create_credential_disclosures.sql`
- `certchain/src/main/java/com/certchain/certchain/model/CredentialDisclosure.java`
- `certchain/src/main/java/com/certchain/certchain/repository/CredentialDisclosureRepository.java`

Modified: none. Deleted: none.

I made exactly three `write` calls, each to a path that did not previously exist —
a repo-wide grep for `CredentialDisclosure|credential_disclosure` confirms the only
source hits are these three files, plus the plan and design documents, which I did
not touch. I used no `edit` on any existing file. So my footprint is provably
limited to the three intended files, and no Reticle artifact was read, staged, or
altered. **However, the required `git status` confirmation before committing was not
possible, so the "stage only three files" rule is satisfied by construction but not
by the verification the brief asked for.**

---

## Self-review findings

**Completeness.** All four brief code artifacts (migration, entity, repository) plus
the `Set<String>` element collection are present. All five interface members from
the brief's "Produces" list are implemented with the exact signatures. Nothing from
the brief is missing; nothing was added beyond it.

**Discipline (YAGNI).** No speculative additions. In particular I did *not* add a
`@OneToOne(mappedBy = "credential")` back-reference on `Credential`: the brief does
not ask for one, Task 2 and Task 4 both reach the policy through
`findByCredentialId`, and it would have meant editing a file outside my task. No
setters beyond the two named. No `@PrePersist` timestamps — the brief's table has no
audit columns, and unlike `Credential`/`CredentialAnchor` a disclosure row is not an
audit record, so the omission is correct rather than an oversight. No repository
methods beyond the one required.

**Global constraints.**

1. *Never mutate the signed envelope.* No envelope field, canonical byte,
   `contentHash`, or signature is referenced by any of the three files. This table
   stores disclosure preference only. ✓
2. *No disclosure row means nothing is hidden.* The entity stores **hidden** keys,
   not visible ones, and V11 is pure `CREATE TABLE` — no `NOT NULL DEFAULT`, no
   backfill, no `INSERT` that would give the 8 already-anchored credentials a row.
   Their absence from the new tables is precisely what keeps them verifying with
   everything visible. ✓
3. *Claims are not in the database.* `claim_key` is a key the holder chose to hide,
   never a claim value. No JSONB column, no text blob of claim values, and no column
   added to `credentials`. ✓
4. *Commit discipline.* Addressed above — footprint is exactly three new files, but
   the `git status` pre-check could not be run. See the Blocker.

**One deliberate deviation from the brief's literal text.** The brief spells out
eleven explicit `import jakarta.persistence.X;` lines. I used
`import jakarta.persistence.*;` instead. All nine existing files in
`com.certchain.certchain.model` use the wildcard, and the controller's Code
Organization section directs me to match the style of the neighbouring entity. This
is an import-list formatting choice with no semantic effect; the annotations,
attribute declarations, and method bodies are otherwise verbatim. Flagging it
explicitly so a reviewer does not read it as drift. Say the word and I will expand
the imports to match the brief character-for-character.

I also left the brief's stray blank line at the end of the wrapped two-arg
constructor parameter list (line 40). It is mildly unusual, but it is the brief's
code, no neighbouring entity has a two-arg constructor to match against, and
changing it would be a second cosmetic deviation for no benefit.

**Concern about the unverified part.** The static reasoning above is careful but it
is reasoning, not a green build. The one genuinely novel construct in this codebase
is `@ElementCollection` on a `Set<String>` against an explicitly-named
`@CollectionTable`, and the one thing I would most want a real run to confirm is
that Hibernate's schema validator is satisfied by a composite-PK'd element table
whose DDL nullability is stricter than the mapping's (the `@JoinColumn` on
`@CollectionTable` defaults to nullable while the column is `NOT NULL`). I believe
Hibernate 6's validator checks table and column existence and type compatibility
but not nullability, and the types match — but "I believe" is exactly why the
brief's Step 4 exists, and it did not run. **This is the single most likely place
for `contextLoads` to fail if something is off, and it is unproven.**

---

## Issues and concerns

1. **BLOCKER — bash denied.** Steps 4 (test) and 5 (commit) of the brief could not
   be executed. Needs a permission grant or out-of-band execution. This is the
   reason for the BLOCKED status rather than DONE.
2. **No test evidence exists for this task.** The controller asked for the
   `contextLoads` result specifically; I have none. Reviewers should not treat the
   static table above as a substitute for a run.
3. **Not committed.** The work exists only in the working tree on
   `feat/holder-disclosure`. A reviewer can still read the diff of untracked files,
   but the commit the brief specifies does not exist.

---

# Fix round 1

**Status: DONE_WITH_CONCERNS** — the finding is fixed; nothing was tested or
committed, because `bash` is still denied (see "Test evidence").

## Finding addressed

`CredentialDisclosure.java:57-59` — `setHiddenClaims` silently dropped writes on a
managed entity. Reviewed and accepted: the finding is real and live, not latent.

I agree with the mechanism, and I want to record why I now think it is worth
stating precisely. Under field access, flush-time collection dirty-checking does
not read the field's current value. It iterates the collection *entries
registered in the persistence context*, each of which holds a reference to the
`PersistentSet` wrapper Hibernate created when the entity was loaded, and calls
`preFlush()`/`postFlush()` on that wrapper. The wrapper's dirty check compares the
wrapper's own contents against the snapshot it took at load. Assigning a new plain
`LinkedHashSet` to the field leaves the registered wrapper holding the old,
unmodified contents, so `isDirty()` is false, no DELETE or INSERT is issued, and
the new set is never registered with anything. Silent no-op — no exception, no
log line, which is the worst failure mode available.

The plan's Task 3 write path makes this reachable in normal use: it does
`findByCredentialId(...).orElseGet(() -> new CredentialDisclosure(credential,
Set.of()))` and then `setHiddenClaims(requested)`. When a policy row already
exists the `findByCredentialId` branch wins and hands back a **managed** entity,
so the very first disclosure a holder makes works and every subsequent change to
it silently does nothing.

## What I changed

One method, plus a comment. `CredentialDisclosure.java` only.

```java
    /*
     * Mutates the live set instead of replacing it. Under field access
     * Hibernate only tracks the collection wrapper it created at load
     * time, so a new Set assigned here would never be written back.
     */
    public void setHiddenClaims(Set<String> hiddenClaims) {
        this.hiddenClaims.clear();
        this.hiddenClaims.addAll(hiddenClaims);
    }
```

`clear()` and `addAll()` dispatch through the `PersistentSet` delegate, so the
wrapper is marked dirty and its snapshot updated; on flush Hibernate issues the
DELETEs and INSERTs against `credential_disclosure_claims`. On a transient
instance the field is a plain `LinkedHashSet` (initialised at line 32), both calls
are ordinary `Collection` calls, and there is no NPE. The setter is retained, as
Task 3 depends on it existing.

The comment matches the block-comment prose style already used at lines 21-25 of
the same file: it states why the code takes this shape, not what the code does,
so the mutation is not "simplified" back into an assignment later.

Nothing else was touched. The migration `V11__create_credential_disclosures.sql`
is unmodified — it is already applied to the live database and editing it would
desynchronise the schema from `flyway_schema_history`. The repository and every
other file in the task are unmodified.

## Observation: the constructor at lines 37-43

Left as-is, per the finding, and I agree it does not need to change.

It also assigns the field, but it only ever runs for a transient entity, which
Hibernate wraps at persist time — so at the moment the assignment happens there
is no wrapper to orphan, and the collection is correctly registered when the
entity is persisted. It is not the same bug. The plan's Task 3 path
(`orElseGet(() -> new CredentialDisclosure(credential, Set.of()))` followed by
`setHiddenClaims(requested)`) is the case that matters here: the constructor
leaves a plain `LinkedHashSet`, and the new setter then mutates that plain set
correctly before persist. Rewriting the constructor as
`this.hiddenClaims.clear(); this.hiddenClaims.addAll(hiddenClaims);` would
be behaviourally identical today and would only couple a transient-only path to
the reasoning that applies to managed ones. No edit.

## One footgun worth knowing about, not worth changing

`setHiddenClaims(getHiddenClaims())` would now clear the set and then re-add it
from the emptied source, wiping the policy. No caller does this — the only caller
is Task 3, which passes a fresh set built from the request body — and guarding it
would add a branch that nothing exercises, so I have not added one. Noting it so
a future caller is not surprised.

## Covering test

Two different things, and the distinction matters for how much the green run is
worth.

**What can run today, and what it actually proves:**

```
cd certchain && ./mvnw -B clean test
```

Expected 16/16, including `CertchainApplicationTests.contextLoads`. This proves the
file still compiles, that the entity still satisfies `ddl-auto: validate` against
the V11 schema, and that the Spring context still starts. **It does not cover
this fix.** The existing suite never calls `setHiddenClaims` on a managed entity,
so it would have passed identically against the buggy setter — which is precisely
why review caught this and the suite did not. A green run is a regression check
here, not evidence that the finding is resolved.

**The test that would actually cover it** (not added — the brief states this task
adds no test file, and the fix round says change nothing else):

A repository-level integration test that fails before this change and passes
after:

1. persist a `Credential` and a `CredentialDisclosure` with one hidden key
2. `flush()` + `clear()` the persistence context
3. re-read via `CredentialDisclosureRepository#findByCredentialId` — this is the
   step that matters, it is what makes the returned entity **managed**
4. call `setHiddenClaims` with a *different* set
5. `flush()` + `clear()`
6. re-read and assert the new set is what is stored

Against the old setter, step 6 returns the original set and the assertion fails.
The natural home for this is Task 3, which is where the write path and its tests
land; the test belongs with the code that calls the setter, not here.

## Test evidence

**I could not run anything.** The `bash` tool remains denied in this session, the
same as in the previous round. I re-attempted rather than assuming, since
permissions could have been reconfigured between rounds:

```
$ cd /home/grim/Projects/CertiChain/certchain && ./mvnw -B test
The user has specified a rule which prevents you from using this specific tool call.
The following rules were applied:
  {"permission":"*","action":"allow","pattern":"*"}
  {"permission":"bash","pattern":"*","action":"deny"}
  {"permission":"bash","pattern":"bash .opencode/skills/task-management/router.sh complete*","action":"allow"}
  {"permission":"bash","pattern":"bash .opencode/skills/task-management/router.sh status*","action":"allow"}
```

No test output exists for this task. I am not reporting a pass.

**Please run:** `cd certchain && ./mvnw -B clean test` (PostgreSQL is up on
localhost:5432) and supply the output as the evidence for this round. Expect 16
tests, and note that a green result is a regression check, not proof the finding
is fixed — see "Covering test" above.

## Commit

**Not committed** — `git` is unreachable for the same reason. The change is in the
working tree on `feat/holder-disclosure`.

To commit, staging only the one file:

```
git add certchain/src/main/java/com/certchain/certchain/model/CredentialDisclosure.java
git status
git commit -m "fix: mutate hidden claim set so updates to a managed disclosure persist"
```

`git status` before committing should show the three Task 1 files still untracked
plus the pre-existing Reticle artifacts (3 modified, 7 untracked under `.reticle/`
and `frontend/.reticle/`). Only the entity file is to be staged; leave the rest.
