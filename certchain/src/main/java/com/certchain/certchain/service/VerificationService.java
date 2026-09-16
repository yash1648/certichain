package com.certchain.certchain.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.certchain.certchain.dto.response.SignedCredentialEnvelope;
import com.certchain.certchain.dto.response.AnchorLookupResponse;
import com.certchain.certchain.dto.response.VerificationResult;
import com.certchain.certchain.model.Credential;
import com.certchain.certchain.model.CredentialAnchor;
import com.certchain.certchain.model.CredentialStatus;
import com.certchain.certchain.model.CredentialStatus.Status;
import com.certchain.certchain.model.IssuerKey;
import com.certchain.certchain.model.VerificationStatus;
import com.certchain.certchain.repository.CredentialAnchorRepository;
import com.certchain.certchain.repository.CredentialRepository;
import com.certchain.certchain.repository.CredentialStatusRepository;
import com.certchain.certchain.repository.IssuerKeyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;

@Service
public class VerificationService {

    private final ObjectMapper objectMapper;
    private final CredentialRepository credentialRepository;
    private final CredentialStatusRepository statusRepository;
    private final IssuerKeyRepository issuerKeyRepository;
    private final IpfsService ipfsService;
    private final CanonicalizationService canonicalizationService;
    private final CryptoService cryptoService;
    private final CredentialAnchorRepository anchorRepository;
    private final BlockchainAnchorService blockchainAnchorService;

    public VerificationService(
            ObjectMapper objectMapper,
            CredentialRepository credentialRepository,
            CredentialStatusRepository statusRepository,
            IssuerKeyRepository issuerKeyRepository,
            IpfsService ipfsService,
            CanonicalizationService canonicalizationService,
            CryptoService cryptoService,
            CredentialAnchorRepository anchorRepository,
            BlockchainAnchorService blockchainAnchorService) {

        this.objectMapper = objectMapper;
        this.credentialRepository = credentialRepository;
        this.statusRepository = statusRepository;
        this.issuerKeyRepository = issuerKeyRepository;
        this.ipfsService = ipfsService;
        this.canonicalizationService = canonicalizationService;
        this.cryptoService = cryptoService;
        this.anchorRepository = anchorRepository;
        this.blockchainAnchorService = blockchainAnchorService;
    }

    @Transactional(readOnly = true)
    public VerificationResult verify(
            byte[] uploadedCredential)
            throws Exception {

        if (uploadedCredential == null
                || uploadedCredential.length == 0) {

            return failure(
                    VerificationStatus.NOT_FOUND,
                    "Credential payload is empty"
            );
        }

        final SignedCredentialEnvelope envelope;

        try {
            envelope =
                    objectMapper.readValue(
                            uploadedCredential,
                            SignedCredentialEnvelope.class
                    );
        } catch (Exception ex) {

            return failure(
                    VerificationStatus.TAMPERED,
                    "Invalid credential JSON"
            );
        }

        if (envelope.credential() == null
                || envelope.contentHash() == null
                || envelope.signature() == null
                || envelope.keyId() == null) {

            return failure(
                    VerificationStatus.TAMPERED,
                    "Credential envelope is incomplete"
            );
        }

        String credentialNumber =
                envelope.credential().credentialNumber();

        Optional<Credential> credentialOptional =
                credentialRepository
                        .findByCredentialNumber(
                                credentialNumber
                        );

        if (credentialOptional.isEmpty()) {

            return failure(
                    VerificationStatus.NOT_FOUND,
                    "Credential not in registry"
            );
        }

        Credential credential =
                credentialOptional.get();

        IssuerKey issuerKey =
                issuerKeyRepository
                        .findByIssuerIdAndKeyId(
                                credential.getIssuer().getId(),
                                envelope.keyId()
                        )
                        .orElse(null);

        if (issuerKey == null) {

            return failureForCredential(
                    credential,
                    VerificationStatus.NOT_FOUND,
                    "Unknown issuer key"
            );
        }

        final byte[] storedBytes;

        try {

            storedBytes =
                    ipfsService.retrieve(
                            credential.getIpfsCid()
                    );

        } catch (Exception ex) {

            return failureForCredential(
                    credential,
                    VerificationStatus.UNAVAILABLE,
                    "IPFS document unavailable"
            );
        }

        final SignedCredentialEnvelope storedEnvelope;

        try {

            storedEnvelope =
                    objectMapper.readValue(
                            storedBytes,
                            SignedCredentialEnvelope.class
                    );

        } catch (Exception ex) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Stored credential is invalid"
            );
        }

        /*
         * The uploaded credential must represent the same
         * registered credential envelope.
         */
        if (!credentialNumber.equals(
                storedEnvelope.credential()
                        .credentialNumber())) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Credential number mismatch"
            );
        }

        String recomputedHash =
                canonicalizationService.sha256(
                        objectMapper.valueToTree(
                                envelope.credential()
                        )
                );

        /*
         * CHECK 1:
         * recomputed payload hash == envelope hash
         */
        if (!recomputedHash.equals(
                envelope.contentHash())) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Content hash mismatch"
            );
        }

        /*
         * CHECK 2:
         * recomputed payload hash == DB hash
         */
        if (!recomputedHash.equals(
                credential.getContentHash())) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Database hash mismatch"
            );
        }

        /*
         * Also ensure the uploaded envelope hash agrees
         * with the registered envelope.
         */
        if (!envelope.contentHash().equals(
                storedEnvelope.contentHash())) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Envelope hash mismatch"
            );
        }

        /*
         * CHECK 3:
         * Ed25519 signature over contentHash.
         */
        final boolean signatureValid;

        try {

            signatureValid =
                    cryptoService.verify(
                            envelope.contentHash(),
                            envelope.signature(),
                            cryptoService
                                    .decodeEd25519PublicKey(
                                            issuerKey.getPublicKey()
                                    )
                    );

        } catch (Exception ex) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Invalid signature"
            );
        }

        if (!signatureValid) {

            return failureForCredential(
                    credential,
                    VerificationStatus.TAMPERED,
                    "Invalid signature"
            );
        }

        /*
         * Cryptographic integrity and authenticity are now
         * established. Only now do we trust status and expiry.
         */
        CredentialStatus status =
                statusRepository
                        .findByCredentialId(
                                credential.getId()
                        )
                        .orElse(null);

        if (status != null
                && status.getStatus() == Status.REVOKED) {

            return success(
                    credential,
                    envelope,
                    VerificationStatus.REVOKED,
                    "Credential revoked by issuer"
            );
        }

        if (credential.getExpiresAt() != null
                && credential.getExpiresAt()
                        .isBefore(
                                LocalDateTime.now()
                        )) {

            return success(
                    credential,
                    envelope,
                    VerificationStatus.EXPIRED,
                    "Credential has expired"
            );
        }

        return success(
                credential,
                envelope,
                VerificationStatus.VALID,
                "Credential verified successfully"
        );
    }

    /**
     * Public anchor lookup: anyone can check a credential's on-chain
     * anchor by credential number, without uploading the file.
     * Returns null when the credential or its anchor does not exist.
     */
    @Transactional(readOnly = true)
    public AnchorLookupResponse lookupAnchor(
            String credentialNumber) {

        Credential credential =
                credentialRepository
                        .findByCredentialNumber(
                                credentialNumber
                        )
                        .orElse(null);

        if (credential == null) {
            return null;
        }

        CredentialAnchor anchor =
                anchorRepository
                        .findByCredentialId(
                                credential.getId()
                        )
                        .orElse(null);

        if (anchor == null) {
            return null;
        }

        boolean anchorVerified = false;

        try {

            anchorVerified =
                    blockchainAnchorService.verifyAnchor(
                            credential.getContentHash(),
                            anchor.getTxHash()
                    );

        } catch (Exception ex) {

            anchorVerified = false;
        }

        return new AnchorLookupResponse(
                credential.getCredentialNumber(),
                credential.getContentHash(),
                anchor.getTxHash(),
                anchor.getBlockNumber(),
                anchor.getChainId(),
                anchorVerified
        );
    }

    private VerificationResult success(
            Credential credential,
            SignedCredentialEnvelope envelope,
            VerificationStatus status,
            String reason) {

        CredentialAnchor anchor =
                anchorRepository
                        .findByCredentialId(
                                credential.getId()
                        )
                        .orElse(null);

        /*
         * Best-effort on-chain check: confirm the stored tx carries
         * this content hash. If the node is unreachable, the anchor
         * info from the DB is still shown - the chain is evidence,
         * not a single point of failure.
         */
        boolean anchorVerified = false;

        if (anchor != null) {

            try {

                anchorVerified =
                        blockchainAnchorService.verifyAnchor(
                                credential.getContentHash(),
                                anchor.getTxHash()
                        );

            } catch (Exception ex) {

                anchorVerified = false;
            }
        }

        return new VerificationResult(
                status == VerificationStatus.VALID,
                status,
                credential.getCredentialNumber(),
                reason,
                credential.getIssuer().getId(),
                credential.getIssuer().getName(),
                credential.getIssuer().getDomain(),
                credential.getIssuer().isVerified(),
                envelope == null
                        ? Map.of()
                        : envelope.credential().claims(),
                credential.getIssuedAt()
                        .toInstant(ZoneOffset.UTC),
                credential.getExpiresAt() == null
                        ? null
                        : credential.getExpiresAt()
                            .toInstant(
                                ZoneOffset.UTC
                            ),
                Instant.now(),
                anchor == null
                        ? null
                        : anchor.getTxHash(),
                anchor == null
                        ? null
                        : anchor.getBlockNumber(),
                anchor == null
                        ? null
                        : anchor.getChainId(),
                anchorVerified
        );
    }

    private VerificationResult failureForCredential(
            Credential credential,
            VerificationStatus status,
            String reason) {

        return success(
                credential,
                null,
                status,
                reason
        );
    }

    private VerificationResult failure(
            VerificationStatus status,
            String reason) {

        return new VerificationResult(
                false,
                status,
                null,
                reason,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                Instant.now(),
                null,
                null,
                null,
                false
        );
    }
}