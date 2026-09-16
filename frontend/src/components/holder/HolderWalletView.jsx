import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  Plus, 
  Download, 
  Trash2, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  HardDrive, 
  RefreshCw, 
  LayoutGrid, 
  Table as TableIcon,
  Sparkles,
  Building,
  Calendar,
  Key
} from 'lucide-react';
import { holderService } from '../../services/holderService';
import { useAuth } from '../../context/AuthContext';
import { RemoveWalletModal } from './RemoveWalletModal';

export function HolderWalletView() {
  const { user, accessToken } = useAuth();

  const [wallet, setWallet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [searchQuery, setSearchQuery] = useState('');

  // Claim credential input state
  const [claimId, setClaimId] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  // Download state tracking
  const [downloadingId, setDownloadingId] = useState(null);

  // Remove modal state
  const [removingCred, setRemovingCred] = useState(null);

  // Load wallet items
  const loadWallet = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const items = await holderService.listWallet(accessToken);
      setWallet(items);
    } catch (err) {
      console.warn('Failed to load wallet', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Handle claiming / adding a credential by ID
  const handleClaim = async (e) => {
    e.preventDefault();
    if (!claimId.trim()) return;

    setClaiming(true);
    setClaimError('');
    setClaimSuccess('');

    try {
      const added = await holderService.addToWallet(claimId.trim(), accessToken);
      setClaimSuccess(`Added "${added.title}" (${added.credentialNumber}) to your wallet!`);
      setClaimId('');
      // Update wallet state
      if (!wallet.some(w => w.credentialId === added.credentialId)) {
        setWallet([added, ...wallet]);
      }
    } catch (err) {
      setClaimError(err.message || 'Could not find or add credential. Verify the UUID.');
    } finally {
      setClaiming(false);
    }
  };

  // Handle direct file download
  const handleDownload = async (cred) => {
    setDownloadingId(cred.credentialId);
    try {
      await holderService.downloadCredential(
        cred.credentialId, 
        accessToken, 
        `${cred.credentialNumber}.json`
      );
    } catch (err) {
      alert(err.message || 'Failed to download credential from IPFS.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRemovedSuccess = (removedId) => {
    setWallet(wallet.filter(w => w.credentialId !== removedId));
  };

  const filteredWallet = wallet.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.credentialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.issuerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = wallet.filter(w => w.status === 'ACTIVE').length;
  const revokedCount = wallet.filter(w => w.status === 'REVOKED').length;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Wallet Header Banner */}
      <div className="glass-panel glass-panel-glow" style={{ padding: '26px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(0, 229, 255, 0.25))',
              border: '1px solid var(--border-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emerald-primary)',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)'
            }}>
              <Wallet size={28} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                <h1 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                  Digital Credential Wallet
                </h1>
                <span className="badge badge-emerald">
                  <ShieldCheck size={12} />
                  Self-Sovereign Identity
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Holder: <strong style={{ color: 'var(--text-primary)' }}>{user?.fullName}</strong> — Recipient UUID:{' '}
                <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>{user?.id}</code>
              </p>
            </div>
          </div>

          <button
            onClick={loadWallet}
            className="btn btn-outline"
            style={{ padding: '8px 14px', fontSize: '0.825rem' }}
            title="Sync wallet from backend (GET /api/holder/wallet)"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync Wallet</span>
          </button>
        </div>

        {/* Claim Bar */}
        <div style={{
          marginTop: '22px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <form onSubmit={handleClaim} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '280px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Paste Credential UUID to claim into wallet (e.g. 550e8400-e29b-41d4...)"
                className="input-field font-mono"
                style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                value={claimId}
                onChange={(e) => setClaimId(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-emerald"
              disabled={claiming || !claimId.trim()}
              style={{ padding: '10px 20px', fontSize: '0.875rem' }}
            >
              <Plus size={16} />
              <span>{claiming ? 'Claiming...' : 'Claim to Wallet (POST /api/holder/wallet/:id)'}</span>
            </button>
          </form>

          {claimSuccess && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--border-emerald)',
              color: 'var(--emerald-primary)',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={16} />
              <span>{claimSuccess}</span>
            </div>
          )}

          {claimError && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              fontSize: '0.825rem'
            }}>
              {claimError}
            </div>
          )}
        </div>
      </div>

      {/* Filter & View Mode Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Your Credentials</span>
          <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
            {wallet.length} Total
          </span>
          {activeCount > 0 && (
            <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
              {activeCount} Active
            </span>
          )}
          {revokedCount > 0 && (
            <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
              {revokedCount} Revoked
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              placeholder="Filter by title, issuer..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '7px 12px 7px 30px', fontSize: '0.825rem' }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          </div>

          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.35)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            padding: '2px'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                background: viewMode === 'cards' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                color: viewMode === 'cards' ? 'var(--cyan-primary)' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title="Certificate Card View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                color: viewMode === 'table' ? 'var(--cyan-primary)' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title="Compact Table View"
            >
              <TableIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--emerald-primary)' }} />
          <p>Syncing verifiable credentials with IPFS...</p>
        </div>
      ) : filteredWallet.length === 0 ? (
        /* Empty State */
        <div className="glass-panel" style={{
          textAlign: 'center',
          padding: '60px 24px',
          color: 'var(--text-secondary)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--cyan-primary)'
          }}>
            <Sparkles size={28} />
          </div>
          <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No Credentials in Wallet Yet
          </h3>
          <p style={{ maxWidth: '480px', margin: '0 auto 20px', fontSize: '0.875rem', lineHeight: 1.5 }}>
            When an institution or university issues a verifiable credential to your User UUID (<code>{user?.id}</code>), it can be claimed directly into this cryptographically secure wallet.
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.4)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Share your recipient ID with issuers:</span>
            <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>{user?.id}</code>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* ==========================================
           CARD / CERTIFICATE VIEW
           ========================================== */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
          gap: '20px'
        }}>
          {filteredWallet.map((cred) => (
            <div
              key={cred.credentialId}
              className="glass-panel"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              {/* Metallic Accent Top Bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: cred.status === 'ACTIVE'
                  ? 'linear-gradient(90deg, #10b981 0%, #00e5ff 100%)'
                  : 'linear-gradient(90deg, #f59e0b 0%, #f43f5e 100%)'
              }} />

              <div>
                {/* Header: Type and Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                    {cred.type}
                  </span>
                  <span className={`badge ${cred.status === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                    {cred.status}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-display" style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: '12px',
                  lineHeight: 1.3,
                  color: 'var(--text-primary)'
                }}>
                  {cred.title}
                </h3>

                {/* Issuer info */}
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={14} color="var(--cyan-primary)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cred.issuerName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ExternalLink size={13} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-secondary)' }}>{cred.issuerDomain}</span>
                  </div>
                </div>

                {/* Metadata details */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Credential #:</span>
                    <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>{cred.credentialNumber}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Issued:</span>
                    <span>{new Date(cred.issuedAt).toLocaleDateString()}</span>
                  </div>
                  {cred.expiresAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Expires:</span>
                      <span>{new Date(cred.expiresAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '8px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '14px'
              }}>
                <button
                  onClick={() => handleDownload(cred)}
                  disabled={downloadingId === cred.credentialId}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }}
                  title="Download verifiable JSON directly from IPFS via GET /api/holder/credentials/:id/download"
                >
                  <Download size={14} />
                  <span>{downloadingId === cred.credentialId ? 'Downloading...' : 'Download JSON'}</span>
                </button>

                <button
                  onClick={() => setRemovingCred(cred)}
                  className="btn btn-outline"
                  style={{ padding: '8px 12px', color: 'var(--rose-primary)' }}
                  title="Remove from personal wallet (DELETE /api/holder/wallet/:id)"
                >
                  <Trash2 size={14} />
                </button>
              </div>

            </div>
          ))}
        </div>
      ) : (
        /* ==========================================
           TABLE VIEW
           ========================================== */
        <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 10px', fontWeight: 500 }}>Credential #</th>
                <th style={{ padding: '12px 10px', fontWeight: 500 }}>Title</th>
                <th style={{ padding: '12px 10px', fontWeight: 500 }}>Issuer</th>
                <th style={{ padding: '12px 10px', fontWeight: 500 }}>Type</th>
                <th style={{ padding: '12px 10px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px 10px', fontWeight: 500 }}>Issued</th>
                <th style={{ padding: '12px 10px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWallet.map((cred) => (
                <tr key={cred.credentialId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>{cred.credentialNumber}</code>
                  </td>
                  <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                    {cred.title}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ color: 'var(--text-primary)' }}>{cred.issuerName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cred.issuerDomain}</div>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{cred.type}</span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span className={`badge ${cred.status === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                      {cred.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                    {new Date(cred.issuedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleDownload(cred)}
                        disabled={downloadingId === cred.credentialId}
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => setRemovingCred(cred)}
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', color: 'var(--rose-primary)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {removingCred && (
        <RemoveWalletModal
          credential={removingCred}
          onClose={() => setRemovingCred(null)}
          onRemoved={handleRemovedSuccess}
          token={accessToken}
          holderService={holderService}
        />
      )}

    </div>
  );
}
