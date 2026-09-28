package com.certchain.certchain.config;

import com.certchain.certchain.model.Role;
import com.certchain.certchain.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the demo accounts the frontend "Quick Demo" personas log in with.
 * Idempotent: the email is checked before insert, so a re-run against an
 * existing database is a no-op.
 *
 * <p>Uses {@code provisionUser} rather than the public
 * {@code /api/auth/register} endpoint: the demo personas need privileged
 * roles, and self-registration is deliberately restricted to HOLDER so
 * that the issuer approval flow cannot be bypassed.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log =
            LoggerFactory.getLogger(DemoDataSeeder.class);

    private final AuthService authService;

    public DemoDataSeeder(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed("admin@certichain.org", "DemoAdmin123!",
                "System Administrator", Role.ADMIN, false);
        seed("registrar@mit.edu", "DemoIssuer123!",
                "Massachusetts Institute of Technology", Role.ISSUER, true);
        seed("alex.mercer@alumni.org", "DemoHolder123!",
                "Alex Mercer", Role.HOLDER, false);
    }

    private void seed(String email, String password,
                      String fullName, Role role,
                      boolean provisionVerifiedIssuer) {
        try {
            authService.provisionUser(
                    email,
                    password,
                    fullName,
                    role,
                    provisionVerifiedIssuer
            );
            log.info("Seeded demo {}: {}", role, email);
        } catch (IllegalArgumentException ex) {
            log.debug("Demo {} already present ({}): {}",
                    role, email, ex.getMessage());
        }
    }
}