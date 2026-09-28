package com.certchain.certchain.service;

import com.certchain.certchain.dto.response.DisclosureResponse;
import com.certchain.certchain.model.Credential;
import com.certchain.certchain.model.CredentialDisclosure;
import com.certchain.certchain.model.HolderWallet;
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
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

        DisclosureResponse response =
                holderService.getDisclosure(userId, credentialId);

        assertThat(response.hiddenClaims())
                .containsExactly("gpa");

        /*
         * Global Constraint 6. The holder is the one deciding what to
         * hide, so hiding must never take a claim away from them. This
         * is the guard against a future edit filtering hidden keys out
         * of the returned map - the very thing the verifier's view does
         * in Task 4, added to this same service.
         */
        assertThat(response.claims())
                .as("the holder still sees a claim they chose to hide")
                .containsEntry("gpa", "3.9");
    }

    @Test
    @DisplayName("an unreachable envelope is a 503 that names its cause")
    void unreachableEnvelopeIsServiceUnavailable() throws Exception {
        when(ipfsService.retrieve(anyString()))
                .thenThrow(new IOException("IPFS retrieval failed"));

        assertThatThrownBy(() ->
                holderService.getDisclosure(userId, credentialId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503")
                .hasCauseInstanceOf(IOException.class);
    }

    @Test
    @DisplayName("an interrupted fetch still leaves the thread interrupted")
    void interruptedFetchRestoresInterruptFlag() throws Exception {
        when(ipfsService.retrieve(anyString()))
                .thenThrow(new InterruptedException("fetch aborted"));

        try {
            assertThatThrownBy(() ->
                    holderService.getDisclosure(userId, credentialId))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("503");

            /*
             * Without restoring the flag, a shutdown or a request
             * timeout during an IPFS fetch is silently dropped and the
             * thread keeps running as if nothing happened.
             */
            assertThat(Thread.currentThread().isInterrupted())
                    .as("the interrupt signal must survive the 503")
                    .isTrue();
        } finally {
            // JUnit runs the next test on this same thread; a leaked
            // flag would break anything it blocks on.
            Thread.interrupted();
        }
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

        ArgumentCaptor<CredentialDisclosure> saved =
                ArgumentCaptor.forClass(CredentialDisclosure.class);

        verify(disclosureRepository).save(saved.capture());

        /*
         * The response is built from a local variable, so echoing
         * it back says nothing about what reached the database. Only
         * the entity handed to save() is the stored policy, and this
         * is the assertion that makes the feature falsifiable.
         */
        assertThat(saved.getValue().getHiddenClaims())
                .as("the holder's choice is what gets stored")
                .containsExactly("gpa");
    }

    @Test
    @DisplayName("an existing hidden set is replaced, not appended to")
    void replacesAnExistingHiddenSet() {
        /*
         * The production path for a holder changing their mind: the
         * row is loaded inside the same transaction, so this is the
         * branch that hands the setter a managed entity.
         */
        when(disclosureRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.of(
                        new CredentialDisclosure(credential, Set.of("major"))));
        when(disclosureRepository.save(any(CredentialDisclosure.class)))
                .thenAnswer(i -> i.getArgument(0));

        holderService.setDisclosure(userId, credentialId, List.of("gpa"));

        ArgumentCaptor<CredentialDisclosure> saved =
                ArgumentCaptor.forClass(CredentialDisclosure.class);

        verify(disclosureRepository).save(saved.capture());

        assertThat(saved.getValue().getHiddenClaims())
                .as("the old choice must be gone, not merged with "
                        + "the new one")
                .containsExactly("gpa");
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
    @DisplayName("an empty set stores a row that hides nothing")
    void emptySetStoresNothingHidden() {
        when(disclosureRepository.findByCredentialId(credentialId))
                .thenReturn(Optional.empty());
        when(disclosureRepository.save(any(CredentialDisclosure.class)))
                .thenAnswer(i -> i.getArgument(0));

        assertThat(holderService.setDisclosure(
                userId, credentialId, List.of()).hiddenClaims())
                .isEmpty();

        ArgumentCaptor<CredentialDisclosure> saved =
                ArgumentCaptor.forClass(CredentialDisclosure.class);

        verify(disclosureRepository).save(saved.capture());

        /*
         * Global Constraint 2. A row that hides nothing must be
         * written, not skipped: "no row" and "nothing hidden" mean
         * the same thing to a verifier, and only a stored empty set
         * makes them agree.
         */
        assertThat(saved.getValue().getHiddenClaims())
                .as("hide nothing is a stored decision, not no decision")
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
}
