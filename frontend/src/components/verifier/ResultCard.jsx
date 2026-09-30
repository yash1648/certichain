import React, { useState } from 'react';
import { Eye, Printer, ChevronDown, ChevronUp, Building2, Lock, RotateCcw, ShieldCheck, AlertTriangle, Copy, Check } from 'lucide-react';
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

/*
 * A verification screen has one job: tell the truth about what was and was not
 * proven. Three things this component previously got wrong, all of which
 * mattered more than the styling:
 *
 *  - It rendered "Cryptographic Content Hash (SHA-256)" from `contentHash`,
 *    which is not a field on VerificationResult. It was always undefined, so it
 *    always printed a reassuring fallback about a hash it never received.
 *  - It fell back to `new Date()` for the verification timestamp, inventing a
 *    time for an audit panel when the backend sent none.
 *  - It labelled the ledger "Ethereum". The chain is configurable and defaults
 *    to chain id 31337, a local Anvil network.
 *
 * It also drew a green check beside the signature and anchor checks regardless
 * of whether they passed. A checkmark next to a failed check is worse than no
 * icon, so the icon now comes from the check's own outcome.
 */

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

export function ResultCard({ result, onReset }) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

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
    disclosure,
  } = result;

  const isValid = valid === true;
  const recipientName = claims?.studentName || claims?.recipientName || claims?.name;
  const credentialTitle =
    claims?.program || claims?.degree || claims?.title || 'Verifiable Credential';

  const claimEntries = claims ? Object.entries(claims) : [];
  const detailId = 'verify-technical-detail';

  return (
    <div className="animate-fade-in">
      <div className="card card--flush">
        {/* -- Verdict ------------------------------------------------- */}
        <div
          className="card__header"
          style={{
            background: isValid ? 'var(--ok-subtle)' : 'var(--bad-subtle)',
            borderBottomColor: isValid ? 'var(--ok-line)' : 'var(--bad-line)',
            alignItems: 'center',
            gap: 'var(--space-4)',
            padding: 'var(--space-4) var(--space-5)'
          }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: isValid ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
            color: isValid ? 'var(--ok)' : 'var(--bad)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isValid ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="section-title" style={{ color: isValid ? 'var(--ok)' : 'var(--bad)', margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                {isValid ? 'Verified Credential' : 'Not Verified'}
              </h2>
              <Badge status={status} />
            </div>
            <p className="status-row__detail" style={{ marginTop: '4px', color: 'var(--ink-secondary)', fontSize: '13.5px' }}>
              {reason ||
                (isValid
                  ? 'Cryptographic signature is valid and confirmed against the issuing record.'
                  : 'This document could not be confirmed against the issuing record.')}
            </p>
          </div>
        </div>

        <div className="card__body" style={{ display: 'grid', gap: 'var(--space-6)' }}>
          {/* -- What this document is ---------------------------------- */}
          <dl className="kv">
            <dt className="kv__key">Recipient</dt>
            <dd className="kv__value" style={{ fontWeight: 600, color: 'var(--ink)' }}>{recipientName || 'Not stated in the document'}</dd>

            <dt className="kv__key">Issuing organisation</dt>
            <dd className="kv__value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Building2 size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <span>{issuerName || 'Not stated'}</span>
              {issuerDomain && (
                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>({issuerDomain})</span>
              )}
              {issuerVerified && <Badge status="VERIFIED" text="Registered issuer" />}
            </dd>

            <dt className="kv__key">Certificate #</dt>
            <dd className="kv__value font-mono tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{credentialNumber || 'Not stated'}</span>
              {credentialNumber && <CopyButton value={credentialNumber} label="Copy certificate number" />}
            </dd>

            <dt className="kv__key">Issued</dt>
            <dd className="kv__value">{formatDate(issuedAt) || 'Not stated'}</dd>

            {expiresAt && (
              <>
                <dt className="kv__key">Expires</dt>
                <dd className="kv__value">{formatDate(expiresAt)}</dd>
              </>
            )}
          </dl>

          {/* -- What was actually checked ------------------------------ */}
          <section>
            <h3 className="section-title">Checks performed</h3>
            <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <StatusRow
                status={status === 'TAMPERED' ? 'error' : 'success'}
                label="Document integrity"
                detail={
                  status === 'TAMPERED'
                    ? 'The contents do not match the digest recorded at issue.'
                    : 'The contents match the digest recorded at issue.'
                }
              />

              <StatusRow
                status={issuerVerified ? 'success' : 'warning'}
                label="Issuing authority"
                detail={
                  issuerVerified
                    ? `Signed by a registered issuer${issuerDomain ? ` (${issuerDomain})` : ''}.`
                    : 'The signing key is not registered. Treat this document with caution.'
                }
              />

              <StatusRow
                status={anchorVerified ? 'success' : 'warning'}
                label="Ledger anchor"
                detail={
                  anchorVerified && anchorBlockNumber != null
                    ? `Anchored at block #${anchorBlockNumber} on chain ${anchorChainId ?? 'unknown'}.`
                    : 'No confirmed ledger anchor. The signature is still valid, but there is no independent timestamp.'
                }
                monoDetail={anchorTxHash || undefined}
              />
            </div>
          </section>

          {/* -- Certified attributes ----------------------------------- */}
          {claimEntries.length > 0 && (
            <section>
              <h3 className="section-title">Certified attributes</h3>
              <div className="table-container" style={{ marginTop: 'var(--space-3)' }}>
                <table className="table table--responsive">
                  <thead>
                    <tr>
                      <th scope="col">Attribute</th>
                      <th scope="col">Certified value</th>
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

          {/* -- Partial disclosure -------------------------------------
              Deliberately outside the `claimEntries.length > 0` guard above.
              A holder can withhold every claim, and that is precisely the case
              that must not read as an empty document: inside the guard this
              notice would vanish along with the table it explains.

              `isValid` is load-bearing, not defensive. The text below asserts
              the credential is valid and anchored, so an unverified card must
              never reach it. Today `complete` is only ever false on a valid
              result -- failure paths pass a null envelope and land on
              (0,0,true) -- but that is an accident of an argument three files
              away, and surfacing claims on a failure path is a plausible change
              that would turn this into a tampered card vouching for itself. */}
          {isValid && disclosure && !disclosure.complete && (
            <p
              role="status"
              className="section-note"
              style={{ color: 'var(--warn)' }}
            >
              Partially disclosed: the holder shared {disclosure.disclosed} of{' '}
              {disclosure.total} claims. The rest were withheld by the holder.
              This credential is still valid and anchored — you are seeing fewer
              details, not a different document.
            </p>
          )}

          {/* -- Audit detail ------------------------------------------- */}
          <section style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
            <button
              type="button"
              className="btn btn-ghost"
              aria-expanded={showTechnicalDetails}
              aria-controls={detailId}
              onClick={() => setShowTechnicalDetails((v) => !v)}
              style={{
                width: '100%',
                justifyContent: 'space-between',
                borderRadius: 'var(--radius)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Lock size={14} aria-hidden="true" />
                Record details
              </span>
              {showTechnicalDetails ? (
                <ChevronUp size={15} aria-hidden="true" />
              ) : (
                <ChevronDown size={15} aria-hidden="true" />
              )}
            </button>

            {showTechnicalDetails && (
              <dl className="card__body kv" id={detailId} style={{ margin: 0, borderTop: '1px solid var(--line)' }}>
                <dt className="kv__key">Checked at</dt>
                <dd className="kv__value">
                  {formatDateTime(verifiedAt) || 'Not recorded by the server'}
                </dd>

                <dt className="kv__key">Block</dt>
                <dd className="kv__value font-mono tabular-nums">
                  {anchorBlockNumber != null ? `#${anchorBlockNumber}` : 'No anchor'}
                </dd>

                <dt className="kv__key">Chain ID</dt>
                <dd className="kv__value font-mono tabular-nums">{anchorChainId ?? 'No anchor'}</dd>

                <dt className="kv__key">Anchor transaction</dt>
                <dd className="kv__value font-mono tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', wordBreak: 'break-all' }}>
                  <span>{anchorTxHash || 'No anchor'}</span>
                  {anchorTxHash && <CopyButton value={anchorTxHash} label="Copy transaction hash" />}
                </dd>
              </dl>
            )}
          </section>
        </div>

        {/* -- Actions -------------------------------------------------- */}
        <div className="card__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onReset} icon={RotateCcw}>
            Verify another document
          </Button>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={() => window.print()} icon={Printer}>
              Print
            </Button>
            {isValid && (
              <Button onClick={() => setShowCertificateModal(true)} icon={Eye}>
                View certificate
              </Button>
            )}
          </div>
        </div>
      </div>

      {showCertificateModal && (
        <CertificateDiplomaModal
          credential={{
            title: credentialTitle,
            type: claims?.type || 'Certificate',
            credentialNumber,
            issuerName,
            issuerDomain,
            recipientName,
            claims,
            issuedAt,
            expiresAt,
            txHash: anchorTxHash,
            blockNumber: anchorBlockNumber,
            status,
          }}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  );
}
