package com.certchain.certchain.repository;

import com.certchain.certchain.model.Issuer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IssuerRepository extends JpaRepository<Issuer, UUID> {

    Optional<Issuer> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);
    List<Issuer> findAllByOrderByCreatedAtDesc();
}