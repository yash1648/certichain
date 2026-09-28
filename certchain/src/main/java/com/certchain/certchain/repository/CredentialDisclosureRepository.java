package com.certchain.certchain.repository;

import com.certchain.certchain.model.CredentialDisclosure;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CredentialDisclosureRepository
        extends JpaRepository<CredentialDisclosure, UUID> {

    Optional<CredentialDisclosure> findByCredentialId(UUID credentialId);
}
