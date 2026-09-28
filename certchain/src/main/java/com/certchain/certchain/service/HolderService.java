package com.certchain.certchain.service;

import com.certchain.certchain.dto.response.DisclosureResponse;
import com.certchain.certchain.dto.response.SignedCredentialEnvelope;
import com.certchain.certchain.dto.response.WalletCredentialResponse;
import com.certchain.certchain.model.Credential;
import com.certchain.certchain.model.CredentialAnchor;
import com.certchain.certchain.model.CredentialDisclosure;
import com.certchain.certchain.model.CredentialStatus;
import com.certchain.certchain.model.CredentialStatus.Status;
import com.certchain.certchain.model.HolderWallet;
import com.certchain.certchain.model.User;
import com.certchain.certchain.repository.CredentialAnchorRepository;
import com.certchain.certchain.repository.CredentialDisclosureRepository;
import com.certchain.certchain.repository.CredentialRepository;
import com.certchain.certchain.repository.CredentialStatusRepository;
import com.certchain.certchain.repository.HolderWalletRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class HolderService {

    private final HolderWalletRepository walletRepository;
    private final CredentialRepository credentialRepository;
    private final CredentialStatusRepository statusRepository;
    private final IpfsService ipfsService;
    private final CredentialAnchorRepository anchorRepository;
    private final CredentialDisclosureRepository disclosureRepository;
    private final ObjectMapper objectMapper;

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
    }

    @Transactional(readOnly = true)
    public String credentialFilename(
            UUID userId,
            UUID credentialId) {

        HolderWallet wallet = requireWalletEntry(userId, credentialId);

        return wallet.getCredential()
                .getCredentialNumber()
                + ".json";
    }

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

        /*
         * Core fields are never hideable: only keys the credential
         * actually carries are choosable. Rejecting an unknown key by
         * name means a typo is a 400 rather than a preference that
         * silently does nothing.
         */
        Set<String> unknown = new LinkedHashSet<>(requested);
        unknown.removeAll(claims.keySet());

        if (!unknown.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Not claims on this credential: " + unknown
            );
        }

        /*
         * An empty request still writes a row, so "hide nothing" is
         * a stored decision rather than the absence of one. The
         * request set is a fresh copy, never the entity's own live
         * collection: passing that in would make the setter's clear()
         * wipe it before addAll could read it.
         */
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

    /*
     * Claims are not stored in the database - they exist only inside
     * the signed envelope on IPFS, so that is where they are read from.
     */
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

        } catch (InterruptedException ex) {

            /*
             * The blocking IPFS call is the thing that gets
             * interrupted. Dropping the signal here would let a
             * shutdown, a request timeout or a container stop
             * disappear and leave the thread running on.
             */
            Thread.currentThread().interrupt();

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Credential content is unavailable",
                    ex
            );

        } catch (Exception ex) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Credential content is unavailable",
                    ex
            );
        }
    }

    /*
     * A copy, never the live persistent set: the holder reading
     * their own policy must not be able to modify it by holding on
     * to the returned list.
     */
    private List<String> hiddenClaimKeys(
            UUID credentialId) {

        return disclosureRepository
                .findByCredentialId(credentialId)
                .map(CredentialDisclosure::getHiddenClaims)
                .map(List::copyOf)
                .orElseGet(List::of);
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