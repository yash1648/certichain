package com.certchain.certchain.service;

import com.certchain.certchain.dto.request.RegisterRequest;
import com.certchain.certchain.dto.response.UserResponse;
import com.certchain.certchain.model.Issuer;
import com.certchain.certchain.model.Role;
import com.certchain.certchain.model.User;
import com.certchain.certchain.repository.IssuerRepository;
import com.certchain.certchain.repository.RefreshTokenRepository;
import com.certchain.certchain.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Guards the public self-registration endpoint against privilege
 * escalation. An attacker can POST any JSON they like to
 * /api/auth/register; none of it may influence the assigned role.
 */
class AuthServiceRegistrationTest {

    private UserRepository userRepository;
    private IssuerRepository issuerRepository;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        issuerRepository = mock(IssuerRepository.class);
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        authService = new AuthService(
                userRepository,
                mock(RefreshTokenRepository.class),
                issuerRepository,
                mock(JwtUtil.class),
                7L
        );
    }

    @Test
    @DisplayName("self-registration always yields HOLDER")
    void selfRegistrationAlwaysYieldsHolder() {
        UserResponse response = authService.register(
                new RegisterRequest("a@b.edu", "password123", "A B"));

        assertThat(response.role()).isEqualTo(Role.HOLDER);
    }

    @Test
    @DisplayName("a forged role in the JSON payload is ignored, not honoured")
    void forgedRoleInPayloadIsIgnored() throws Exception {
        String attack = """
                {
                  "email": "attacker@evil.example",
                  "password": "password123",
                  "fullName": "Attacker",
                  "role": "ADMIN"
                }
                """;

        // The payload must still bind rather than 400, and the role must
        // be dropped rather than promoted.
        RegisterRequest parsed = new ObjectMapper()
                .readValue(attack, RegisterRequest.class);

        UserResponse response = authService.register(parsed);

        assertThat(response.email()).isEqualTo("attacker@evil.example");
        assertThat(response.role()).isEqualTo(Role.HOLDER);
    }

    @Test
    @DisplayName("self-registration cannot self-provision a verified issuer")
    void selfRegistrationCannotProvisionVerifiedIssuer() {
        authService.register(
                new RegisterRequest("registrar@evil.example",
                        "password123", "Evil Registrar"));

        verify(issuerRepository, never()).save(any(Issuer.class));
    }

    @Test
    @DisplayName("provisionUser is the only path that can grant a role")
    void provisionUserCanGrantPrivilegedRole() {
        UserResponse response = authService.provisionUser(
                "admin@certichain.org",
                "DemoAdmin123!",
                "System Administrator",
                Role.ADMIN,
                false
        );

        assertThat(response.role()).isEqualTo(Role.ADMIN);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("duplicate email is still rejected")
    void duplicateEmailRejected() {
        when(userRepository.existsByEmail("a@b.edu")).thenReturn(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                authService.register(
                        new RegisterRequest("a@b.edu", "password123", "A B")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already registered");
    }

    @Test
    @DisplayName("provisionUser is idempotent, so the seeder can skip")
    void provisionUserIsIdempotent() {
        // The seeder relies on this to be a no-op on a database that
        // already holds the demo accounts. A raw constraint violation
        // would escape its IllegalArgumentException catch and abort
        // startup.
        when(userRepository.existsByEmail("admin@certichain.org"))
                .thenReturn(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                authService.provisionUser(
                        "admin@certichain.org",
                        "DemoAdmin123!",
                        "System Administrator",
                        Role.ADMIN,
                        false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already registered");

        verify(userRepository, never()).save(any(User.class));
    }

    // -- Admin-driven issuer promotion -------------------------------
    //
    // The admin is the only party allowed to decide who issues. These
    // guard that decision and its blast radius: promotion must grant a
    // working issuer, and must not be usable to reach ADMIN or to
    // double-grant.

    private User existingUser(Role role) {
        User user = new User();
        // The id is @GeneratedValue, so there is no setter. Reach it the
        // way JPA does after a persist, since the service reads it back
        // to key the issuer lookup.
        try {
            java.lang.reflect.Field id = User.class.getDeclaredField("id");
            id.setAccessible(true);
            id.set(user, UUID.randomUUID());
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        user.setEmail("someone@example.com");
        user.setFullName("Some One");
        user.setPasswordHash("hash");
        user.setRole(role);
        return user;
    }

    @Test
    @DisplayName("promoting a holder grants ISSUER and a verified issuer record")
    void promotingHolderGrantsWorkingIssuer() {
        User holder = existingUser(Role.HOLDER);
        when(userRepository.findById(holder.getId()))
                .thenReturn(java.util.Optional.of(holder));

        UserResponse response = authService.promoteToIssuer(holder.getId());

        assertThat(response.role()).isEqualTo(Role.ISSUER);
        assertThat(holder.getRole()).isEqualTo(Role.ISSUER);

        ArgumentCaptor<Issuer> saved = ArgumentCaptor.forClass(Issuer.class);
        verify(issuerRepository).save(saved.capture());
        assertThat(saved.getValue().isVerified()).isTrue();
        assertThat(saved.getValue().getDomain())
                .isEqualTo("example.com");
    }

    @Test
    @DisplayName("an already-verified issuer is not granted a second record")
    void promotionDoesNotDuplicateIssuerRecord() {
        User issuer = existingUser(Role.HOLDER);
        when(userRepository.findById(issuer.getId()))
                .thenReturn(java.util.Optional.of(issuer));
        when(issuerRepository.existsByUserId(issuer.getId()))
                .thenReturn(true);

        authService.promoteToIssuer(issuer.getId());

        verify(issuerRepository, never()).save(any(Issuer.class));
    }

    @Test
    @DisplayName("promotion cannot be aimed at an account that is already an issuer")
    void promotingExistingIssuerIsRejected() {
        User already = existingUser(Role.ISSUER);
        when(userRepository.findById(already.getId()))
                .thenReturn(java.util.Optional.of(already));

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                authService.promoteToIssuer(already.getId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already an issuer");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("promotion cannot reach an admin, so roles cannot be escalated")
    void promotingAdminIsRejected() {
        User admin = existingUser(Role.ADMIN);
        when(userRepository.findById(admin.getId()))
                .thenReturn(java.util.Optional.of(admin));

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                authService.promoteToIssuer(admin.getId()))
                .isInstanceOf(IllegalArgumentException.class);

        verify(issuerRepository, never()).save(any(Issuer.class));
    }

    @Test
    @DisplayName("promoting an unknown user is a not-found, not a silent no-op")
    void promotingUnknownUserIsRejected() {
        UUID ghost = UUID.randomUUID();
        when(userRepository.findById(ghost))
                .thenReturn(java.util.Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                authService.promoteToIssuer(ghost))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not found");
    }

    @Test
    @DisplayName("email is normalised before the duplicate check and insert")
    void emailIsNormalised() {
        UserResponse response = authService.register(
                new RegisterRequest("  MiXeD@Example.COM ", "password123", "A B"));

        assertThat(response.email()).isEqualTo("mixed@example.com");

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("mixed@example.com");
    }
}