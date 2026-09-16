package com.certchain.certchain.dto.response;

import com.certchain.certchain.model.VerificationStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record VerificationResult(

        boolean valid,

        VerificationStatus status,

        String credentialNumber,

        String reason,

        UUID issuerId,

        String issuerName,

        String issuerDomain,

        boolean issuerVerified,

        Map<String, Object> claims,

        Instant issuedAt,

        Instant expiresAt,

        Instant verifiedAt,

        String anchorTxHash,

        Long anchorBlockNumber,

        Long anchorChainId,

        boolean anchorVerified
) {
}