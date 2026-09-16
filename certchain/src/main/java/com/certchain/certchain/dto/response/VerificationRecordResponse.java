package com.certchain.certchain.dto.response;

import com.certchain.certchain.model.CredentialStatus;

import java.time.Instant;
import java.time.LocalDateTime;

public record VerificationRecordResponse(

        String credentialNumber,

        CredentialStatus.Status status,

        String reason,

        LocalDateTime revokedAt,

        Instant issuedAt,

        Instant expiresAt
) {
}