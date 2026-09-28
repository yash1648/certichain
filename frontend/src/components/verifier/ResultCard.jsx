import React, { useState } from 'react';
import { Eye, Printer, ChevronDown, ChevronUp, Building2, Lock, RotateCcw } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { StatusRow } from '../common/StatusRow';
import { CertificateDiplomaModal } from '../common/CertificateDiplomaModal';

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
            alignItems: 'flex-start',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 className="section-title" style={{ color: isValid ? 'var(--ok)' : 'var(--bad)' }}>
              {isValid ? 'Verified' : 'Not verified'}
            </h2>
            <p className="status-row__detail" style={{ marginTop: 'var(--space-1)' }}>
              {reason ||
                (isValid
                  ? 'The signature is valid and the document matches the issued record.'
                  : 'This document could not be confirmed against the issuing record.')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
            <Badge status={status} />
          </div>
        </div>

        <div className="card__body" style={{ display: 'grid', gap: 'var(--space-6)' }}>
          {/* -- What this document is ---------------------------------- */}
          <dl className="kv">
            <dt className="kv__key">Recipient</dt>
            <dd className="kv__value">{recipientName || 'Not stated in the document'}</dd>

            <dt className="kv__key">Issuing organisation</dt>
            <dd className="kv__value" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Building2 size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
              {issuerName || 'Not stated'}
              {issuerVerified && <Badge status="VERIFIED" text="Registered issuer" />}
            </dd>

            <dt className="kv__key">Certificate</dt>
            <dd className="kv__value font-mono">{credentialNumber || 'Not stated'}</dd>

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
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Attribute</th>
                      <th scope="col">Certified value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claimEntries.map(([key, val]) => (
                      <tr key={key}>
                        <th scope="row" className="table__primary">
                          {key}
                        </th>
                        <td>
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
              <dl className="card__body kv" id={detailId} style={{ margin: 0 }}>
                <dt className="kv__key">Checked at</dt>
                <dd className="kv__value">
                  {formatDateTime(verifiedAt) || 'Not recorded by the server'}
                </dd>

                <dt className="kv__key">Block</dt>
                <dd className="kv__value font-mono">
                  {anchorBlockNumber != null ? `#${anchorBlockNumber}` : 'No anchor'}
                </dd>

                <dt className="kv__key">Chain id</dt>
                <dd className="kv__value font-mono">{anchorChainId ?? 'No anchor'}</dd>

                <dt className="kv__key">Anchor transaction</dt>
                <dd className="kv__value font-mono">{anchorTxHash || 'No anchor'}</dd>
              </dl>
            )}
          </section>
        </div>

        {/* -- Actions -------------------------------------------------- */}
        <div className="card__footer">
          <Button variant="ghost" onClick={onReset} icon={RotateCcw}>
            Verify another document
          </Button>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
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
