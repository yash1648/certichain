package com.certchain.certchain.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;
import java.util.UUID;

public record CredentialIssueRequest(

        @NotNull
        UUID subjectId,

        @NotBlank
        @Size(max = 255)
        String type,

        @NotBlank
        @Size(max = 255)
        String title,

        @NotNull
        @Size(max = 50)
        Map<String, Object> claims
) {
}