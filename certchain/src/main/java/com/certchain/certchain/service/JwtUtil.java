package com.certchain.certchain.service;

import com.certchain.certchain.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private static final String DEFAULT_SECRET =
            "change-me-in-production-minimum-32-bytes-long!!!";

    private final SecretKey key;
    private final long accessTokenTtlMinutes;

    public JwtUtil(
            @Value("${certichain.jwt.secret}") String secret,
            @Value("${certichain.jwt.access-token-ttl-minutes}")
            long accessTokenTtlMinutes) {

        if (secret == null
                || secret.getBytes(StandardCharsets.UTF_8).length
                < 32) {

            throw new IllegalStateException(
                    "certichain.jwt.secret must be at least "
                            + "32 bytes"
            );
        }

        if ("production".equals(System.getenv("CERTCHAIN_ENV"))
                && DEFAULT_SECRET.equals(secret)) {

            throw new IllegalStateException(
                    "certichain.jwt.secret must be overridden "
                            + "in production"
            );
        }

        this.key =
                Keys.hmacShaKeyFor(
                        secret.getBytes(StandardCharsets.UTF_8)
                );
        this.accessTokenTtlMinutes =
                accessTokenTtlMinutes;
    }

    public String generateAccessToken(
            UUID userId,
            Role role) {

        Instant now = Instant.now();

        return Jwts.builder()
                .subject(userId.toString())
                .claim("role", role.name())
                .issuedAt(Date.from(now))
                .expiration(
                        Date.from(
                                now.plusSeconds(
                                        accessTokenTtlMinutes * 60
                                )
                        )
                )
                .signWith(key)
                .compact();
    }

    public Claims parseAccessToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    public Role extractRole(Claims claims) {
        return Role.valueOf(
                claims.get("role", String.class)
        );
    }
}