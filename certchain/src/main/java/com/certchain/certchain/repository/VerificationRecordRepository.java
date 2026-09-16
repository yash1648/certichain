package com.certchain.certchain.repository;

import com.certchain.certchain.model.VerificationRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VerificationRecordRepository
        extends JpaRepository<VerificationRecord, UUID> {

    List<VerificationRecord> findByVerifierIdOrderByVerifiedAtDesc(
            UUID verifierId
    );

    List<VerificationRecord> findAllByOrderByVerifiedAtDesc();
}