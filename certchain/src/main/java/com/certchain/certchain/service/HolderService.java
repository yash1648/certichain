package com.certchain.certchain.service;

import com.certchain.certchain.dto.response.WalletCredentialResponse;
import com.certchain.certchain.model.Credential;
import com.certchain.certchain.model.CredentialAnchor;
import com.certchain.certchain.model.CredentialStatus;
import com.certchain.certchain.model.CredentialStatus.Status;
import com.certchain.certchain.model.HolderWallet;
import com.certchain.certchain.model.User;
import com.certchain.certchain.repository.CredentialAnchorRepository;
import com.certchain.certchain.repository.CredentialRepository;
import com.certchain.certchain.repository.CredentialStatusRepository;
import com.certchain.certchain.repository.HolderWalletRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
public class HolderService {

    private final HolderWalletRepository walletRepository;
    private final CredentialRepository credentialRepository;
    private final CredentialStatusRepository statusRepository;
    private final IpfsService ipfsService;
    private final CredentialAnchorRepository anchorRepository;

    public HolderService(
            HolderWalletRepository walletRepository,
            CredentialRepository credentialRepository,
            CredentialStatusRepository statusRepository,
            IpfsService ipfsService,
            CredentialAnchorRepository anchorRepository) {

        this.walletRepository = walletRepository;
        this.credentialRepository = credentialRepository;
        this.statusRepository = statusRepository;
        this.ipfsService = ipfsService;
        this.anchorRepository = anchorRepository;
    }

    @Transactional(readOnly = true)
    public List<WalletCredentialResponse> listWallet(
            UUID userId) {

        return walletRepository
                .findByUserIdOrderByStoredAtDesc(userId)
                .stream()
                .map(this::toWalletResponse)
                .toList();
    }

    @Transactional
    public WalletCredentialResponse addToWallet(
            UUID userId,
            UUID credentialId) {

        Credential credential =
                credentialRepository.findById(credentialId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Credential not found: "
                                                + credentialId
                                ));

        /*
         * A credential id is not a secret. It turns up in issuer
         * screens, logs and screenshots, so the claim only returns a
         * credential to the person it was issued to. Delivery happens
         * automatically at issuance; this path exists to recover one
         * that was removed or has not arrived, never to collect
         * somebody else's.
         */
        User subject = credential.getSubject();

        if (subject == null
                || !subject.getId().equals(userId)) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "This credential was issued to someone else"
            );
        }

        /*
         * Idempotent: an existing wallet entry is returned as-is.
         */
        HolderWallet wallet =
                walletRepository
                        .findByUserIdAndCredentialId(
                                userId,
                                credentialId
                        )
                        .orElseGet(() -> {

                            HolderWallet entry =
                                    new HolderWallet();

                            entry.setUser(subject);
                            entry.setCredential(credential);

                            return walletRepository.save(entry);
                        });

        return toWalletResponse(wallet);
    }

    @Transactional
    public void removeFromWallet(
            UUID userId,
            UUID credentialId) {

        /*
         * Scoped to the authenticated user: another holder's
         * wallet entry can never be touched. Idempotent - a
         * missing entry is a no-op.
         */
        walletRepository.deleteByUserIdAndCredentialId(
                userId,
                credentialId
        );
    }

    @Transactional(readOnly = true)
    public byte[] downloadCredential(
            UUID userId,
            UUID credentialId)
            throws Exception {

        HolderWallet wallet =
                walletRepository
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

        /*
         * Return the exact stored envelope from IPFS - never
         * regenerate or re-sign.
         */
        return ipfsService.retrieve(
                wallet.getCredential().getIpfsCid()
        );
    }

    @Transactional(readOnly = true)
    public String credentialFilename(
            UUID userId,
            UUID credentialId) {

        HolderWallet wallet =
                walletRepository
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

        return wallet.getCredential()
                .getCredentialNumber()
                + ".json";
    }

    private WalletCredentialResponse toWalletResponse(
            HolderWallet wallet) {

        Credential credential = wallet.getCredential();

        CredentialStatus status =
                statusRepository
                        .findByCredentialId(
                                credential.getId()
                        )
                        .orElse(null);

        CredentialAnchor anchor =
                anchorRepository
                        .findByCredentialId(
                                credential.getId()
                        )
                        .orElse(null);

        return new WalletCredentialResponse(
                credential.getId(),
                credential.getCredentialNumber(),
                credential.getType(),
                credential.getTitle(),
                credential.getIssuer().getId(),
                credential.getIssuer().getName(),
                credential.getIssuer().getDomain(),
                anchor == null
                        ? null
                        : anchor.getTxHash(),
                anchor == null
                        ? null
                        : anchor.getBlockNumber(),
                anchor == null
                        ? null
                        : anchor.getChainId(),
                credential.getIssuedAt()
                        .toInstant(ZoneOffset.UTC),
                credential.getExpiresAt() == null
                        ? null
                        : credential.getExpiresAt()
                            .toInstant(ZoneOffset.UTC),
                status == null
                        ? Status.ACTIVE
                        : status.getStatus()
        );
    }
}