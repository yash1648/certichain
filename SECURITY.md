# Security Policy

## Supported Versions

CertiChain is under active development. Security fixes are applied to the latest `main` branch.

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| Older commits | ❌ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, contact the team privately:

- **Email:** `yashbagal1648@gmail.com` <!-- replace with a real team contact -->
- Include: a description of the issue, steps to reproduce, the potential impact, and any suggested fix.

We will acknowledge your report as soon as possible and keep you informed as we investigate and release a fix. Please give us a reasonable window to remediate before any public disclosure.

## Security Design

CertiChain is a credential system, so its security properties are central to the design:

- **Credential integrity** — credentials are signed with **Ed25519** keys. Private keys live in a password-protected **PKCS#12 keystore** that is generated on first boot and persisted in a volume.
- **Content addressing** — credential content is stored on **IPFS** and referenced by CID, so the document cannot change without changing its hash.
- **Immutability** — a hash anchor is written to a blockchain, providing an independent, tamper-evident record.
- **Password storage** — passwords are hashed with **BCrypt**.
- **Sessions** — short-lived JWT access tokens (60 minutes) plus a refresh token in an `httpOnly`, `Secure` (production), `SameSite=Lax` cookie scoped to `/api/auth`.
- **Authorization** — role-based access control (`ADMIN`, `ISSUER`, `HOLDER`, `VERIFIER`) enforced in the Spring Security filter chain.
- **Rate limiting** — a dedicated filter throttles sensitive endpoints.
- **Transport hardening** — HSTS, `Referrer-Policy: no-referrer`, and a `default-src 'self'` Content-Security-Policy are set by the backend.

## Deployment Hardening Checklist

Before running CertiChain in a production or shared environment:

- [ ] Generate strong secrets — `openssl rand -hex 32` for `SSDCVE_JWT_SECRET` and `SSDCVE_KEYSTORE_PASSWORD`. Never use the defaults.
- [ ] Set `CERTICHAIN_AUTH_COOKIE_SECURE=true` when served over HTTPS.
- [ ] Serve the API over HTTPS (place a TLS reverse proxy or tunnel in front of it).
- [ ] Restrict inbound access to the backend port; expose only what the frontend needs.
- [ ] Rotate database credentials and keep them out of source control.
- [ ] **Back up the keystore volume.** Losing it means every issued credential can no longer be verified.
- [ ] Restrict/gate the Swagger UI and OpenAPI endpoints if the deployment is not meant to be public.
