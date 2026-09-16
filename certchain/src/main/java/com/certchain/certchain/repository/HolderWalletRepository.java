package com.certchain.certchain.repository;

import com.certchain.certchain.model.HolderWallet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HolderWalletRepository
        extends JpaRepository<HolderWallet, UUID> {

    List<HolderWallet> findByUserIdOrderByStoredAtDesc(
            UUID userId
    );

    Optional<HolderWallet> findByUserIdAndCredentialId(
            UUID userId,
            UUID credentialId
    );

    boolean existsByUserIdAndCredentialId(
            UUID userId,
            UUID credentialId
    );

    void deleteByUserIdAndCredentialId(
            UUID userId,
            UUID credentialId
    );
}