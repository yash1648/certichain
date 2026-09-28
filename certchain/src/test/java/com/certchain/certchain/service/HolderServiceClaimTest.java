package com.certchain.certchain.service;

import com.certchain.certchain.model.Credential;
import com.certchain.certchain.model.HolderWallet;
import com.certchain.certchain.model.Issuer;
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

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * A credential UUID was a bearer secret: anyone who learned one could
 * add someone else's credential to their own wallet, because the claim
 * never compared the credential's subject to the caller. Delivery is now
 * automatic at issuance, so the claim is a recovery path and must only
 * ever return a credential to its actual owner.
 */
class HolderServiceClaimTest {

    private HolderWalletRepository walletRepository;
    private CredentialRepository credentialRepository;
    private HolderService holderService;

    private UUID subjectId;
    private UUID credentialId;
    private Credential credential;

    @BeforeEach
    void setUp() {
        walletRepository = mock(HolderWalletRepository.class);
        credentialRepository = mock(CredentialRepository.class);
        when(walletRepository.save(any(HolderWallet.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        holderService = new HolderService(
                walletRepository,
                credentialRepository,
                mock(CredentialStatusRepository.class),
                mock(IpfsService.class),
                mock(CredentialAnchorRepository.class),
                mock(CredentialDisclosureRepository.class),
                new ObjectMapper()
        );

        User owner = new User();
        subjectId = UUID.randomUUID();
        credentialId = UUID.randomUUID();

        // The issuer resolved this user at issuance and stored it on the
        // credential, so the claim has a real owner to compare against.
        setId(owner, subjectId);
        owner.setEmail("owner@example.com");
        owner.setFullName("The Owner");
        owner.setRole(com.certchain.certchain.model.Role.HOLDER);

        credential = new Credential();
        setId(credential, credentialId);
        credential.setSubject(owner);

        // The wallet response is built from the issuer too, so the
        // fixture needs one even though the claim never reads it.
        Issuer issuer = new Issuer();
        setId(issuer, UUID.randomUUID());
        issuer.setName("Example University");
        issuer.setDomain("example.edu");
        credential.setIssuer(issuer);
        credential.setIssuedAt(java.time.LocalDateTime.now());
        credential.setCredentialNumber("SSD-TEST-0001");
        credential.setType("Degree");
        credential.setTitle("Bachelor of Science");

        when(credentialRepository.findById(credentialId))
                .thenReturn(Optional.of(credential));
    }

    /** The ids are @GeneratedValue, so reach them the way JPA does. */
    private static void setId(Object entity, UUID id) {
        try {
            java.lang.reflect.Field field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    @DisplayName("the subject can still claim their own credential by id")
    void subjectMayClaimOwnCredential() {
        holderService.addToWallet(subjectId, credentialId);

        verify(walletRepository).save(any(HolderWallet.class));
    }

    @Test
    @DisplayName("a different holder cannot claim someone else's credential")
    void otherHolderCannotClaimForeignCredential() {
        UUID attackerId = UUID.randomUUID();

        assertThatThrownBy(() ->
                holderService.addToWallet(attackerId, credentialId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");

        verify(walletRepository, never()).save(any(HolderWallet.class));
    }

    @Test
    @DisplayName("claiming a credential with no subject is refused, not allowed through")
    void credentialWithoutSubjectIsRefused() {
        // Defensive: a credential row that never got a subject must not
        // become claimable by whoever presents its id.
        credential.setSubject(null);

        assertThatThrownBy(() ->
                holderService.addToWallet(subjectId, credentialId))
                .isInstanceOf(ResponseStatusException.class);

        verify(walletRepository, never()).save(any(HolderWallet.class));
    }
}
