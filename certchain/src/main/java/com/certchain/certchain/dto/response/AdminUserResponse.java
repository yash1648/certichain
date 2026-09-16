package com.certchain.certchain.dto.response;

import com.certchain.certchain.model.Role;

import java.time.Instant;
import java.util.UUID;

public record AdminUserResponse(

        UUID id,

        String email,

        String fullName,

        Role role,

        Instant createdAt,

        Instant updatedAt
) {
}