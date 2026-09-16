import React from 'react';
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { StatusRow } from '../common/StatusRow';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export function ResultCard({ result, onReset }) {
  if (!result) return null;

  const {
    valid,
    status,
    credentialNumber,
    reason,
    issuerName,
    issuerDomain,
    issuerVerified,
    claims,
    issuedAt,
    expiresAt,
    verifiedAt,
    anchorTxHash,
    anchorBlockNumber,
    anchorChainId,
    anchorVerified,
  } = result;

  const isValid = valid === true;
  const isTampered = status === 'TAMPERED';
  const isRevoked = status === 'REVOKED';
  const isExpired = status === 'EXPIRED';

  // Format ISO timestamp
  const formatDate = (isoStr) => {
    if (!isoStr) return null;
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{
      borderRadius: 'var(--radius-lg)',
      border: isValid ? '1px solid rgba(0, 229, 255, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)',
      boxShadow: isValid ? '0 8px 32px -8px rgba(0, 229, 255, 0.25)' : '0 8px 32px -8px rgba(244, 63, 94, 0.25)',
      overflow: 'hidden',
    }}>
      {/* Verdict Header Banner */}
      <div style={{
        padding: '24px 28px',
        background: isValid
          ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            backgroundColor: isValid ? 'rgba(0, 229, 255, 0.2)' : 'rgba(244, 63, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isValid ? 'var(--cyan-primary)' : 'var(--rose-primary)',
          }}>
            {isValid ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="font-display" style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: isValid ? 'var(--cyan-primary)' : 'var(--rose-primary)',
                letterSpacing: '0.02em',
              }}>
                {isValid ? 'VALID' : status || 'INVALID'}
              </span>
              <Badge status={status} />
            </div>

            <p style={{
              fontSize: '13.5px',
              color: isValid ? 'var(--text-secondary)' : '#fca5a5',
              marginTop: '4px',
            }}>
              {reason || (isValid ? 'Credential verified successfully' : 'Cryptographic verification failed')}
            </p>
          </div>
        </div>

        {credentialNumber && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Credential Number
            </span>
            <div className="font-mono" style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginTop: '2px',
            }}>
              {credentialNumber}
            </div>
          </div>
        )}
      </div>

      {/* Security Proof Spectacle Rows */}
      <div style={{ padding: '24px 28px' }}>
        <h4 className="font-display" style={{
          fontSize: '13px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          marginBottom: '16px',
        }}>
          Cryptographic Verification Pipeline
        </h4>

        {/* 1. Integrity Check */}
        <StatusRow
          status={isTampered ? 'error' : 'success'}
          label="1. Integrity"
          detail={isTampered
            ? 'SHA-256 content hash mismatch. The credential payload has been modified or corrupted!'
            : 'SHA-256 content hash verified against cryptographic digest.'}
        />

        {/* 2. Authenticity Check */}
        <StatusRow
          status={isTampered ? 'error' : 'success'}
          label="2. Authenticity"
          detail={isTampered
            ? 'Ed25519 digital signature verification failed for the given public key.'
            : 'Ed25519 asymmetric signature verified using registered issuer public key.'}
        />

        {/* 3. Registry Check */}
        <StatusRow
          status={issuerVerified ? 'success' : 'warning'}
          label="3. Issuer Registry"
          detail={issuerName
            ? `Registered authority: ${issuerName}${issuerDomain ? ` · ${issuerDomain}` : ''}`
            : 'Issuer registered on CertiChain platform'}
          extra={
            issuerVerified ? (
              <Badge status="VERIFIED" text="Verified Issuer" variant="emerald" />
            ) : (
              <Badge status="PENDING" text="Pending Approval" variant="amber" />
            )
          }
        />

        {/* 4. Blockchain Anchor Check */}
        {anchorTxHash ? (
          <StatusRow
            status={anchorVerified ? 'success' : 'warning'}
            label="4. Blockchain Anchor"
            detail={
              anchorVerified
                ? `Anchored on-chain — block ${anchorBlockNumber ?? 'N/A'}, chain ${anchorChainId ?? '31337'}`
                : 'Anchored (chain node unreachable — showing database anchor record)'
            }
            monoDetail={`Tx Hash: ${anchorTxHash}`}
            extra={
              anchorVerified ? (
                <Badge status="ACTIVE" text="On-Chain Verified" variant="emerald" />
              ) : (
                <Badge status="PENDING" text="Chain Unreachable" variant="amber" />
              )
            }
          />
        ) : (
          <StatusRow
            status="info"
            label="4. Blockchain Anchor"
            detail="Legacy credential — issued prior to on-chain state anchoring."
          />
        )}

        {/* 5. Status & Expiry Check */}
        <StatusRow
          status={isRevoked ? 'error' : isExpired ? 'warning' : 'success'}
          label="5. Credential Status"
          detail={`Status: ${status} · Issued ${formatDate(issuedAt) || 'N/A'}${expiresAt ? ` · Expires ${formatDate(expiresAt)}` : ' · No Expiration'}`}
          extra={<Badge status={status} />}
        />

        {/* Claims Table */}
        {claims && Object.keys(claims).length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 className="font-display" style={{
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}>
              Certified Attributes (Claims)
            </h4>

            <div className="table-container" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Claim Attribute</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(claims).map(([key, val]) => (
                    <tr key={key}>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{key}</td>
                      <td>
                        <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Verified at: {verifiedAt ? new Date(verifiedAt).toLocaleString() : new Date().toLocaleString()}
          </span>

          <Button variant="secondary" onClick={onReset} icon={ArrowLeft}>
            Verify Another Credential
          </Button>
        </div>
      </div>
    </div>
  );
}
