import React from 'react';

export function Badge({ status, text, variant }) {
  const label = text || status || '';

  // Determine variant based on status string if variant is not explicitly provided
  const computeVariant = () => {
    if (variant) return variant;
    const normalized = String(status || '').toUpperCase();
    switch (normalized) {
      case 'ACTIVE':
      case 'VERIFIED':
      case 'TRUE':
      case 'HOLDER':
        return 'emerald';
      case 'VALID':
      case 'VERIFIER':
        return 'cyan';
      case 'ISSUER':
        return 'purple';
      case 'PENDING':
      case 'EXPIRED':
      case 'ADMIN':
      case 'FALSE':
        return 'amber';
      case 'REVOKED':
      case 'TAMPERED':
      case 'ERROR':
        return 'rose';
      case 'NOT_FOUND':
      case 'UNAVAILABLE':
      default:
        return 'muted';
    }
  };

  const badgeVariant = computeVariant();

  return (
    <span className={`badge badge-${badgeVariant}`}>
      <span className="badge-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
