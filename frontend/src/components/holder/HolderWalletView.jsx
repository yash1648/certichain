import React, { Fragment, useState, useEffect, useCallback, useId } from 'react';
import { Award, Plus, Download, RefreshCw, Eye, SlidersHorizontal, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { holderService } from '../../services/holderService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { CertificateDiplomaModal } from '../common/CertificateDiplomaModal';
import DisclosurePanel from './DisclosurePanel';

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
};

export function HolderWalletView() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [credentialId, setCredentialId] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);

  const [query, setQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [openDisclosureId, setOpenDisclosureId] = useState(null);

  const claimId = useId();
  const searchId = useId();
  const disclosureId = useId();

  const loadWallet = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems((await holderService.listWallet(accessToken)) || []);
    } catch (err) {
      setError(err.message || 'Your wallet could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleClaim = async (e) => {
    e.preventDefault();
    const clean = credentialId.trim();
    if (!clean) return;

    setClaiming(true);
    setClaimError(null);
    try {
      await holderService.addToWallet(clean, accessToken);
      setCredentialId('');
      await loadWallet();
    } catch (err) {
      setClaimError(
        err.message || 'No credential with that ID belongs to you. Check the ID your issuer gave you.'
      );
    } finally {
      setClaiming(false);
    }
  };

  const handleDownload = async (item) => {
    setDownloadingId(item.credentialId);
    try {
      await holderService.downloadCredential(
        item.credentialId,
        accessToken,
        `${item.credentialNumber || 'credential'}.json`
      );
    } catch (err) {
      setError(err.message || 'The credential file could not be downloaded.');
    } finally {
      setDownloadingId(null);
    }
  };

  const needle = query.trim().toLowerCase();
  const matches = items.filter((item) =>
    needle
      ? [item.title, item.credentialNumber, item.issuerName, item.type].some((v) =>
          v?.toLowerCase().includes(needle)
        )
      : true
  );

  const activeCount = items.filter((i) => i.status === 'ACTIVE').length;

  return (
    <div className="animate-fade-in">
      {error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorState message={error} onRetry={loadWallet} />
        </div>
      )}

      {/* -- Claim ------------------------------------------------------ */}
      <section className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card__body">
          <h2 className="section-title">Claim a credential</h2>
          <p className="section-note" style={{ marginBottom: 'var(--space-4)' }}>
            Credentials are delivered here automatically once your issuer signs them. Use
            this to recover one you removed, or one issued before this worked. It is only
            added to your wallet if the credential names you as its subject.
          </p>

          <form onSubmit={handleClaim} className="toolbar" style={{ marginBottom: 0 }}>
            <div className="field" style={{ flex: '1 1 18rem' }}>
              <label className="form-label" htmlFor={claimId}>
                Credential ID
              </label>
              <input
                id={claimId}
                type="text"
                className="input-field font-mono"
                placeholder="8d380b1b-4f51-4f11-9a7c-1793740283c7"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                required
              />
            </div>
            <Button type="submit" loading={claiming} disabled={!credentialId.trim()} icon={Plus}>
              Claim
            </Button>
          </form>

          {claimError && (
            <p className="form-error" role="alert" style={{ marginTop: 'var(--space-3)' }}>
              {claimError}
            </p>
          )}
        </div>
      </section>

      {/* -- Credentials ------------------------------------------------ */}
      <div className="toolbar">
        <div className="toolbar__search">
          <label className="sr-only" htmlFor={searchId}>
            Search credentials
          </label>
          <Search size={15} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            className="input-field"
            placeholder="Search by title, issuer or number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={loadWallet} loading={loading} icon={RefreshCw}>
          Refresh
        </Button>
        {items.length > 0 && (
          <span className="count-note">
            {matches.length} of {items.length} &middot; {activeCount} active
          </span>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="card">
          <div className="loading-row">
            <span className="spinner" />
            <span>Loading your wallet</span>
          </div>
        </div>
      ) : matches.length === 0 ? (
        <div className="card card--flush">
          {needle ? (
            <EmptyState
              icon={Search}
              title="No matching credentials"
              description={`Nothing in your wallet matches "${query.trim()}".`}
              actionLabel="Clear search"
              onAction={() => setQuery('')}
            />
          ) : (
            <EmptyState
              icon={Award}
              title="Your wallet is empty"
              description="Claim a credential above to store it here and download a signed copy."
            />
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table table--responsive">
            <thead>
              <tr>
                <th scope="col">Credential</th>
                <th scope="col">Issuer</th>
                <th scope="col">Status</th>
                <th scope="col">Issued</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {matches.map((item) => (
                <Fragment key={item.credentialId}>
                  <tr>
                    <th scope="row" data-label="Credential">
                      <span className="table__primary">{item.title || 'Untitled credential'}</span>
                      <span className="table__sub font-mono">{item.credentialNumber}</span>
                      {/*
                        The transaction proves a hash was submitted, not that the
                        anchor was confirmed. Only claim a block when the row
                        actually carries one.
                      */}
                      {item.txHash && (
                        <span className="table__sub">
                          {item.blockNumber != null
                            ? `Anchored at block #${item.blockNumber}`
                            : 'Submitted to the ledger, not yet confirmed'}
                        </span>
                      )}
                    </th>
                    <td data-label="Issuer">{item.issuerName || 'Not stated'}</td>
                    <td data-label="Status">
                      <Badge status={item.status} />
                    </td>
                    <td data-label="Issued" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(item.issuedAt) || 'Not stated'}
                    </td>
                    <td data-label="">
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => setViewing(item)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={SlidersHorizontal}
                          aria-expanded={openDisclosureId === item.credentialId}
                          aria-controls={disclosureId}
                          onClick={() =>
                            setOpenDisclosureId((open) =>
                              open === item.credentialId ? null : item.credentialId
                            )
                          }
                        >
                          Sharing
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Download}
                          loading={downloadingId === item.credentialId}
                          onClick={() => handleDownload(item)}
                        >
                          Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {/* One credential's panel at a time: these are per-credential
                      settings, and two open panels side by side invite the
                      question of which one a change applies to. */}
                  {openDisclosureId === item.credentialId && (
                    <tr>
                      <td colSpan={5} data-label="">
                        <DisclosurePanel
                          credentialId={item.credentialId}
                          token={accessToken}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <CertificateDiplomaModal
          credential={viewing}
          onClose={() => setViewing(null)}
          onDownload={() => handleDownload(viewing)}
        />
      )}
    </div>
  );
}
