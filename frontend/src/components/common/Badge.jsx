import React from 'react';

/*
 * Status maps to severity, not to a decorative hue.
 *
 * The previous version sent VALID to cyan and both NOT_FOUND and
 * UNAVAILABLE to neutral grey. On a verification product, a credential
 * that could not be found and a ledger that could not be reached are
 * both failures the user must act on, and neither may read as "nothing
 * to see here".
 */
const SEVERITY = {
  // -- affirmative: signed, valid, in good standing
  VALID: 'ok',
  VERIFIED: 'ok',
  ACTIVE: 'ok',
  ISSUED: 'ok',
  CONFIRMED: 'ok',
  HOLDER: 'info',
  ISSUER: 'info',
  VERIFIER: 'info',
  ADMIN: 'info',

  // -- caution: real state, but time-bound or awaiting a decision
  PENDING: 'warn',
  EXPIRED: 'warn',
  UNKNOWN: 'warn',
  UNAVAILABLE: 'warn',
  NOT_FOUND: 'bad',
  UNVERIFIED: 'warn',

  // -- failure: the credential cannot be relied on
  REVOKED: 'bad',
  TAMPERED: 'bad',
  INVALID: 'bad',
  ERROR: 'bad',
  FAILED: 'bad',
};

/**
 * Tone is derived from `status` and cannot be overridden.
 *
 * An earlier version accepted a `variant` prop. Every caller used it to pass a
 * decorative hue ('emerald', 'cyan', 'amber', 'violet', 'blue', 'gray') that did
 * not correspond to any defined class, so those badges rendered unstyled. Tone
 * is a function of severity, so severity is the only input.
 */
export function Badge({ status, text, className = '' }) {
  const label = text || status || '';
  const key = String(status ?? '').toUpperCase();
  const tone = SEVERITY[key] || 'neutral';

  return (
    <span className={`badge badge--${tone} ${className}`.trim()}>
      <span className="badge-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

/**
 * A badge for a boolean outcome, where there is no status enum to map.
 * Used by the verification result, where valid/invalid is the whole point.
 */
export function VerdictBadge({ valid, label, children }) {
  return (
    <span className={`badge badge--${valid ? 'ok' : 'bad'}`}>
      <span className="badge-dot" aria-hidden="true" />
      <span>{label || (valid ? 'Valid' : 'Invalid')}</span>
      {children}
    </span>
  );
}
