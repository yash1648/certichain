package com.certchain.certchain.dto.response;

import com.certchain.certchain.model.CredentialStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record RevokeResponse(

        UUID credentialId,

        String credentialNumber,

        CredentialStatus.Status status,

        LocalDateTime revokedAt,

        String reason
) {
}