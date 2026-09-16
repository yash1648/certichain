package com.certchain.certchain.repository;

import com.certchain.certchain.model.CredentialStatus;
import com.certchain.certchain.model.CredentialStatus.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CredentialStatusRepository
        extends JpaRepository<CredentialStatus, UUID> {

    Optional<CredentialStatus> findByCredentialId(
            UUID credentialId
    );

    Optional<CredentialStatus> findByCredentialIdAndStatus(
            UUID credentialId,
            Status status
    );
}