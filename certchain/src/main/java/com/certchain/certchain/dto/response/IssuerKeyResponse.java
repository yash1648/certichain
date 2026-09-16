package com.certchain.certchain.dto.response;

import java.time.LocalDateTime;

public record IssuerKeyResponse(

        String keyId,

        String publicKey,

        String algorithm,

        boolean active,

        LocalDateTime createdAt,

        LocalDateTime revokedAt
) {
}