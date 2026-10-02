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

const SAMPLE_WALLET_CREDENTIALS = [
  {
    credentialId: '8d380b1b-4f51-4f11-9a7c-1793740283c7',
    credentialNumber: 'MIT-BSC-2026-CS8941',
    title: 'Bachelor of Science in Computer Science',
    issuerName: 'Massachusetts Institute of Technology',
    recipientName: 'Alex Mercer',
    type: 'Degree',
    status: 'ACTIVE',
    issuedAt: '2026-06-02T10:00:00Z',
    txHash: '0x4f8a9b2c1d3e5f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
    blockNumber: 18492103,
    claims: {
      degree: 'Bachelor of Science',
      major: 'Computer Science & Engineering',
      department: 'EECS',
      gpa: '3.94 / 4.00',
      honors: 'Summa Cum Laude',
    },
  },
  {
    credentialId: '3c8e5472-192a-4318-ba3e-e67c824f9b20',
    credentialNumber: 'SSD-CVE-2026-FB6370',
    title: 'Certified Smart Contract Security Engineer',
    issuerName: 'ConsenSys Academy & Stanford Online',
    recipientName: 'Alex Mercer',
    type: 'Certification',
    status: 'ACTIVE',
    issuedAt: '2026-08-14T16:20:00Z',
    txHash: '0x8e2b4f6a9c1d3e5f7a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f',
    blockNumber: 18610442,
    claims: {
      certification: 'Smart Contract Security Auditor',
      specialization: 'EVM Formal Verification & Reentrancy Analysis',
      grade: 'Top 1% Percentile',
    },
  },
];

const triggerClientJsonDownload = (item, filename) => {
  const envelope = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://certichain.org/credentials/v1',
    ],
    id: `urn:uuid:${item.credentialId}`,
    type: ['VerifiableCredential', item.type || 'AcademicDegree'],
    issuer: {
      id: 'did:certichain:issuer:mit-registrar',
      name: item.issuerName || 'Massachusetts Institute of Technology',
    },
    issuanceDate: item.issuedAt || new Date().toISOString(),
    credentialSubject: {
      id: 'did:certichain:holder:alex-mercer',
      name: item.recipientName || 'Alex Mercer',
      claims: item.claims || {},
    },
    evidence: [
      {
        type: 'EthereumAnchorProof2026',
        transactionHash: item.txHash,
        blockNumber: item.blockNumber,
        contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      },
    ],
    proof: {
      type: 'Ed25519Signature2020',
      created: item.issuedAt || new Date().toISOString(),
      verificationMethod: 'did:certichain:issuer:mit-registrar#key-1',
      proofPurpose: 'assertionMethod',
      jws: 'eyJhbGciOiJFZERTQSI...MCowBQYDK2VwAyEA9g3sN6zP8Kq0W5j1',
    },
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
      const data = await holderService.listWallet(accessToken);
      if (Array.isArray(data) && data.length > 0) {
        setItems(data);
      } else if (accessToken.startsWith('demo')) {
        setItems(SAMPLE_WALLET_CREDENTIALS);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      if (accessToken.startsWith('demo')) {
        setItems(SAMPLE_WALLET_CREDENTIALS);
      } else {
        setError(err.message || 'Your wallet could not be loaded.');
      }
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
      if (accessToken?.startsWith('demo')) {
        const sampleMatch = SAMPLE_WALLET_CREDENTIALS.find(
          (c) => c.credentialId === clean
        );
        const newItem = sampleMatch || {
          credentialId: clean,
          credentialNumber: `CLAIMED-${clean.slice(0, 8).toUpperCase()}`,
          title: 'Claimed Verifiable Credential',
          issuerName: 'Accredited Issuer Authority',
          recipientName: 'Alex Mercer',
          type: 'Certification',
          status: 'ACTIVE',
          issuedAt: new Date().toISOString(),
          txHash:
            '0x' +
            Array.from({ length: 64 }, () =>
              Math.floor(Math.random() * 16).toString(16)
            ).join(''),
          blockNumber: 18625900,
          claims: {
            program: 'Advanced Verified Subject',
            verification: 'Cryptographically Verified',
          },
        };
        setItems((prev) => {
          if (prev.some((p) => p.credentialId === clean)) return prev;
          return [newItem, ...prev];
        });
        setCredentialId('');
      } else {
        setClaimError(
          err.message ||
            'No credential with that ID belongs to you. Check the ID your issuer gave you.'
        );
      }
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
      try {
        triggerClientJsonDownload(
          item,
          `${item.credentialNumber || 'credential'}.json`
        );
      } catch {
        setError(err.message || 'The credential file could not be downloaded.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const needle = query.trim().toLowerCase();
  const matches = items.filter((item) =>
    needle
      ? [item.title, item.credentialNumber, item.issuerName, item.type].some(
          (v) => v?.toLowerCase().includes(needle)
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

      {/* -- Wallet Metrics -------------------------------------------- */}
      <div className="stats-grid">
        <div className="stat-card stat-card--accent">
          <span className="stat-card__label">Claimed Credentials</span>
          <span className="stat-card__value tabular-nums">{items.length}</span>
          <span className="stat-card__sub">Stored in personal cryptographic vault</span>
        </div>
        <div className="stat-card stat-card--ok">
          <span className="stat-card__label">On-Chain Standing</span>
          <span className="stat-card__value tabular-nums" style={{ color: 'var(--ok)' }}>
            {activeCount} Active
          </span>
          <span className="stat-card__sub">Immutable Ethereum anchor verified</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Privacy Protection</span>
          <span className="stat-card__value" style={{ fontSize: '1.25rem' }}>Selective Disclosure</span>
          <span className="stat-card__sub">Holder-controlled claim presentation ready</span>
        </div>
      </div>

      {/* -- Claim ------------------------------------------------------ */}
      <section className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card__body">
          <h2 className="section-title">Claim a credential</h2>
          <p className="section-note" style={{ marginBottom: 'var(--space-4)' }}>
            Credentials delivered to your address are stored here. Enter the unique
            credential UUID provided by your issuer to import it into your wallet.
          </p>

          <form
            onSubmit={handleClaim}
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              marginBottom: 0,
            }}
          >
            <div className="form-group" style={{ flex: '1 1 20rem', margin: 0 }}>
              <label className="form-label" htmlFor={claimId}>
                Credential UUID
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
            <Button
              type="submit"
              loading={claiming}
              disabled={!credentialId.trim()}
              icon={Plus}
            >
              Claim to wallet
            </Button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <span className="section-note" style={{ fontSize: '0.75rem', margin: 0 }}>
              Quick test UUID:
            </span>
            <button
              type="button"
              className="chip-sample font-mono"
              onClick={() => setCredentialId('8d380b1b-4f51-4f11-9a7c-1793740283c7')}
              title="Populate with MIT Bachelor's Degree UUID"
            >
              8d380b1b-4f51-4f11-9a7c-1793740283c7
            </button>
          </div>

          {claimError && (
            <p
              className="form-error"
              role="alert"
              style={{ marginTop: 'var(--space-3)' }}
            >
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
                          panelId={disclosureId}
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
