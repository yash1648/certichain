package com.certchain.certchain.repository;

import com.certchain.certchain.model.IssuerKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IssuerKeyRepository extends JpaRepository<IssuerKey, UUID> {

    Optional<IssuerKey> findByKeyId(String keyId);

    Optional<IssuerKey> findByIssuerIdAndKeyId(UUID issuerId, String keyId);

    Optional<IssuerKey> findByIssuerIdAndActiveTrue(UUID issuerId);

    boolean existsByKeyId(String keyId);
}