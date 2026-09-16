package com.certchain.certchain.repository;

import com.certchain.certchain.model.CredentialAnchor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CredentialAnchorRepository
        extends JpaRepository<CredentialAnchor, UUID> {

    Optional<CredentialAnchor> findByCredentialId(
            UUID credentialId
    );
}