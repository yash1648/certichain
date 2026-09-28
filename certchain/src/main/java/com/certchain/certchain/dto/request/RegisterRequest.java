package com.certchain.certchain.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Public self-registration payload.
 *
 * <p>There is deliberately no role field. Accounts created here are
 * always HOLDER; granting ISSUER or ADMIN is an administrative action.
 * {@code ignoreUnknown} keeps a stale client that still sends
 * {@code "role"} working instead of failing with a 400.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RegisterRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        String email,

        @NotBlank(message = "Password is required")
        @Size(
                min = 8,
                max = 72,
                message = "Password must be 8-72 characters"
        )
        String password,

        @NotBlank(message = "Full name is required")
        @Size(max = 255)
        String fullName
) {
}