package com.certchain.certchain.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "holder_wallet",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_holder_wallet_user_credential",
                        columnNames = {"user_id", "credential_id"}
                )
        }
)
public class HolderWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "credential_id", nullable = false)
    private Credential credential;

    @Column(name = "stored_at", nullable = false)
    private LocalDateTime storedAt;

    @PrePersist
    protected void onCreate() {
        if (storedAt == null) {
            storedAt = LocalDateTime.now();
        }
    }

    public HolderWallet() {
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Credential getCredential() {
        return credential;
    }

    public void setCredential(Credential credential) {
        this.credential = credential;
    }

    public LocalDateTime getStoredAt() {
        return storedAt;
    }

    public void setStoredAt(LocalDateTime storedAt) {
        this.storedAt = storedAt;
    }
}