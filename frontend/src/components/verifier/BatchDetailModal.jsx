import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Building2, Lock, Eye, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { StatusRow } from '../common/StatusRow';
import { CertificateDiplomaModal } from '../common/CertificateDiplomaModal';

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{
        padding: '2px 8px',
        height: '24px',
        fontSize: '11.5px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        color: copied ? 'var(--ok)' : 'var(--ink-muted)',
      }}
      onClick={handleCopy}
      title={label}
      aria-label={copied ? 'Copied to clipboard' : label}
    >
      {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

export function BatchDetailModal({ item, onClose }) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showDiploma, setShowDiploma] = useState(false);

  if (!item) return null;

  const {
    fileName,
    credentialNumber,
    recipientName,
    issuerName,
    status,
    valid,
    checks = {},
    result,
    errorMessage,
  } = item;

  const isValid = valid === true;
  const claims = result?.claims;
  const claimEntries = claims ? Object.entries(claims) : [];

  const credentialTitle =
    claims?.program || claims?.degree || claims?.title || 'Verifiable Credential';

  return (
    <>
      <Modal
        isOpen={Boolean(item)}
        onClose={onClose}
        title={fileName || 'Credential Details'}
        subtitle={credentialNumber ? `Certificate #${credentialNumber}` : 'Batch Credential Verification'}
        maxWidth="680px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {isValid && (
              <Button variant="primary" icon={Eye} onClick={() => setShowDiploma(true)}>
                View Certificate
              </Button>
            )}
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {/* Header verdict badge */}
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius)',
              background: isValid ? 'var(--ok-subtle)' : 'var(--bad-subtle)',
              border: `1px solid ${isValid ? 'var(--ok-line)' : 'var(--bad-line)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            {isValid ? (
              <ShieldCheck size={22} style={{ color: 'var(--ok)' }} aria-hidden="true" />
            ) : (
              <AlertTriangle size={22} style={{ color: 'var(--bad)' }} aria-hidden="true" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: isValid ? 'var(--ok)' : 'var(--bad)' }}>
                  {isValid ? 'Verified Authenticity' : 'Verification Unsuccessful'}
                </span>
                <Badge status={status} />
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-secondary)' }}>
                {errorMessage || result?.reason || (isValid ? 'All cryptographic and registry checks passed.' : 'Credential failed verification checks.')}
              </p>
            </div>
          </div>

          {/* Key metadata */}
          <dl className="kv">
            <dt className="kv__key">Recipient</dt>
            <dd className="kv__value" style={{ fontWeight: 600, color: 'var(--ink)' }}>
              {recipientName || 'Not stated in the document'}
            </dd>

            <dt className="kv__key">Issuing organisation</dt>
            <dd className="kv__value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Building2 size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <span>{issuerName || 'Not stated'}</span>
              {result?.issuerDomain && (
                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>({result.issuerDomain})</span>
              )}
            </dd>

            <dt className="kv__key">Certificate #</dt>
            <dd className="kv__value font-mono tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{credentialNumber || 'None'}</span>
              {credentialNumber && <CopyButton value={credentialNumber} label="Copy certificate number" />}
            </dd>

            <dt className="kv__key">File Name</dt>
            <dd className="kv__value font-mono" style={{ wordBreak: 'break-all' }}>{fileName}</dd>

            {result?.issuedAt && (
              <>
                <dt className="kv__key">Issued</dt>
                <dd className="kv__value">{formatDate(result.issuedAt)}</dd>
              </>
            )}

            {result?.expiresAt && (
              <>
                <dt className="kv__key">Expires</dt>
                <dd className="kv__value">{formatDate(result.expiresAt)}</dd>
              </>
            )}
          </dl>

          {/* Six Verification Checks */}
          <section>
            <h3 className="section-title">Verification Checks</h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <StatusRow
                status={checks.envelopeStructure ? 'success' : 'error'}
                label="Envelope Structure"
                detail={
                  checks.envelopeStructure
                    ? 'Valid W3C Verifiable Credential envelope format and required fields.'
                    : 'Malformed credential envelope structure or missing required envelope fields.'
                }
              />

              <StatusRow
                status={checks.schemaConformance ? 'success' : 'error'}
                label="Schema Conformance"
                detail={
                  checks.schemaConformance
                    ? 'Payload canonicalization and SHA-256 digest match registration record.'
                    : 'Credential content hash or schema fields do not match registration.'
                }
              />

              <StatusRow
                status={checks.issuerSignature ? 'success' : 'error'}
                label="Ed25519 Issuer Signature"
                detail={
                  checks.issuerSignature
                    ? 'Asymmetric cryptographic signature verified against authorized issuer key.'
                    : 'Cryptographic signature is invalid or signing key is unauthorized.'
                }
              />

              <StatusRow
                status={checks.onChainAnchor ? 'success' : 'warning'}
                label="On-Chain Anchor"
                detail={
                  checks.onChainAnchor && result?.anchorBlockNumber != null
                    ? `Anchored at block #${result.anchorBlockNumber} on chain ${result.anchorChainId ?? 'unknown'}.`
                    : 'No confirmed ledger anchor found on chain.'
                }
                monoDetail={result?.anchorTxHash || undefined}
              />

              <StatusRow
                status={checks.revocationStatus ? 'success' : 'error'}
                label="Revocation Status"
                detail={
                  checks.revocationStatus
                    ? 'Credential is valid and in good standing with issuer.'
                    : 'Credential has been explicitly revoked by the issuer.'
                }
              />

              <StatusRow
                status={checks.ipfsIntegrity ? 'success' : 'warning'}
                label="IPFS CID Content Integrity"
                detail={
                  checks.ipfsIntegrity
                    ? 'Decentralized storage payload matches registered IPFS CID digest.'
                    : 'Decentralized IPFS payload could not be verified or is unavailable.'
                }
              />
            </div>
          </section>

          {/* Certified attributes */}
          {claimEntries.length > 0 && (
            <section>
              <h3 className="section-title">Certified Attributes</h3>
              <div className="table-container" style={{ marginTop: 'var(--space-2)', maxHeight: '180px', overflowY: 'auto' }}>
                <table className="table table--responsive" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th scope="col">Attribute</th>
                      <th scope="col">Certified Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claimEntries.map(([key, val]) => (
                      <tr key={key}>
                        <th scope="row" className="table__primary" data-label="Attribute">
                          {key}
                        </th>
                        <td data-label="Certified value" style={{ wordBreak: 'break-word' }}>
                          {typeof val === 'object' && val !== null
                            ? JSON.stringify(val)
                            : String(val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Technical Anchor details toggle */}
          {result?.anchorTxHash && (
            <section style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
              <button
                type="button"
                className="btn btn-ghost"
                aria-expanded={showTechnicalDetails}
                onClick={() => setShowTechnicalDetails((v) => !v)}
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  borderRadius: 'var(--radius)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Lock size={14} aria-hidden="true" />
                  Ledger Record Details
                </span>
                {showTechnicalDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showTechnicalDetails && (
                <dl className="card__body kv" style={{ margin: 0, borderTop: '1px solid var(--line)' }}>
                  <dt className="kv__key">Verified at</dt>
                  <dd className="kv__value">{formatDateTime(result.verifiedAt)}</dd>

                  <dt className="kv__key">Block</dt>
                  <dd className="kv__value font-mono tabular-nums">#{result.anchorBlockNumber}</dd>

                  <dt className="kv__key">Chain ID</dt>
                  <dd className="kv__value font-mono tabular-nums">{result.anchorChainId}</dd>

                  <dt className="kv__key">Transaction Hash</dt>
                  <dd className="kv__value font-mono tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '8px', wordBreak: 'break-all' }}>
                    <span>{result.anchorTxHash}</span>
                    <CopyButton value={result.anchorTxHash} label="Copy transaction hash" />
                  </dd>
                </dl>
              )}
            </section>
          )}
        </div>
      </Modal>

      {showDiploma && (
        <CertificateDiplomaModal
          credential={{
            title: credentialTitle,
            type: claims?.type || 'Certificate',
            credentialNumber,
            issuerName,
            issuerDomain: result?.issuerDomain,
            recipientName,
            claims,
            issuedAt: result?.issuedAt,
            expiresAt: result?.expiresAt,
            txHash: result?.anchorTxHash,
            blockNumber: result?.anchorBlockNumber,
            status,
          }}
          onClose={() => setShowDiploma(false)}
        />
      )}
    </>
  );
}
