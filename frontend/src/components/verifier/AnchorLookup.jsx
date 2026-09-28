import React, { useState, useId } from 'react';
import { Search, Link2, AlertTriangle } from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export function AnchorLookup() {
  const [credentialNumber, setCredentialNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [error, setError] = useState(null);
  const inputId = useId();
  const inputHintId = useId();

  const handleLookup = async (e) => {
    e.preventDefault();
    const clean = credentialNumber.trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    setAnchor(null);

    try {
      setAnchor(await verifierService.lookupAnchor(clean));
    } catch (err) {
      setError(
        err.status === 404
          ? `No ledger record for "${clean}". Check the certificate number as printed on the document.`
          : err.message || 'The ledger could not be reached. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Look up a ledger record</h2>
      <p className="section-note" id={inputHintId}>
        Enter the certificate number printed on the document. This confirms the record
        exists in the ledger &mdash; it cannot verify a document you have not uploaded.
      </p>

      <form
        onSubmit={handleLookup}
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          marginTop: 'var(--space-4)',
        }}
      >
        <div className="field" style={{ flex: '1 1 16rem' }}>
          <label className="form-label" htmlFor={inputId}>
            Certificate number
          </label>
          <Search size={15} className="field__icon" aria-hidden="true" />
          <input
            id={inputId}
            type="text"
            className="input-field field__input font-mono"
            placeholder="SSD-CVE-2026-FB6370"
            value={credentialNumber}
            onChange={(e) => setCredentialNumber(e.target.value)}
            aria-describedby={inputHintId}
            autoComplete="off"
            spellCheck="false"
            required
          />
        </div>

        <Button type="submit" loading={loading} disabled={!credentialNumber.trim()}>
          Look up
        </Button>
      </form>

      {error && (
        <div className="alert alert--bad" role="alert" style={{ marginTop: 'var(--space-4)' }}>
          <AlertTriangle size={16} className="alert__icon" aria-hidden="true" />
          <p className="alert__body">{error}</p>
        </div>
      )}

      {anchor && (
        <div
          className="card"
          style={{ marginTop: 'var(--space-5)', borderColor: 'var(--ok-line)' }}
        >
          <div className="card__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Link2 size={16} style={{ color: 'var(--ok)' }} aria-hidden="true" />
              <h3 className="section-title" style={{ margin: 0 }}>
                Record found in ledger
              </h3>
            </div>
            <Badge
              status={anchor.anchorVerified ? 'VALID' : 'PENDING'}
              text={anchor.anchorVerified ? 'Anchor confirmed' : 'Awaiting confirmations'}
            />
          </div>

          <dl className="card__body kv" style={{ margin: 0 }}>
            <dt className="kv__key">Certificate</dt>
            <dd className="kv__value font-mono">{anchor.credentialNumber}</dd>

            <dt className="kv__key">Block</dt>
            <dd className="kv__value font-mono">
              {anchor.blockNumber != null ? `#${anchor.blockNumber}` : 'Pending'}
            </dd>

            <dt className="kv__key">Chain</dt>
            <dd className="kv__value font-mono">
              {anchor.chainId != null ? anchor.chainId : 'Pending'}
            </dd>

            <dt className="kv__key">Content hash</dt>
            <dd className="kv__value font-mono">{anchor.contentHash || 'Not published'}</dd>

            <dt className="kv__key">Transaction</dt>
            <dd className="kv__value font-mono">{anchor.txHash || 'Pending'}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
