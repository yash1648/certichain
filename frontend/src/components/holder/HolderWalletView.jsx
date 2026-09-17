import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  Plus, 
  Download, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Building, 
  CheckCircle2, 
  AlertCircle,
  Link2,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { holderService } from '../../services/holderService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { RemoveWalletModal } from './RemoveWalletModal';

export function HolderWalletView() {
  const { accessToken } = useAuth();
  const [walletItems, setWalletItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Credential Form State
  const [newCredentialId, setNewCredentialId] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  // Downloading State
  const [downloadingId, setDownloadingId] = useState(null);

  // Remove Modal State
  const [removingCredential, setRemovingCredential] = useState(null);

  // Fetch Wallet Items
  const loadWallet = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const data = await holderService.listWallet(accessToken);
      setWalletItems(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load wallet credentials.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Handle Add to Wallet
  const handleAddCredential = async (e) => {
    e.preventDefault();
    if (!newCredentialId.trim()) return;

    setAdding(true);
    setAddError(null);
    setAddSuccess(null);

    try {
      const added = await holderService.addToWallet(newCredentialId.trim(), accessToken);
      setAddSuccess(`Credential ${added.credentialNumber || newCredentialId} successfully synced to wallet!`);
      setNewCredentialId('');
      loadWallet();
    } catch (err) {
      setAddError(err.message || 'Failed to add credential. Please ensure the UUID is valid and exists on the platform.');
    } finally {
      setAdding(false);
    }
  };

  // Handle Download Signed Envelope
  const handleDownload = async (credential) => {
    setDownloadingId(credential.credentialId);
    try {
      const filename = `${credential.credentialNumber || 'credential'}.json`;
      await holderService.downloadCredential(credential.credentialId, accessToken, filename);
    } catch (err) {
      setError(err.message || 'Failed to download credential file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRemoved = (credentialId) => {
    setWalletItems(prev => prev.filter(c => c.credentialId !== credentialId));
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--border-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emerald-primary)',
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <h1 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                My Credential Wallet
              </h1>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                Your decentralized digital repository of verifiable certificates, degrees, and licenses.
              </p>
            </div>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={loadWallet} loading={loading} icon={RefreshCw}>
          Refresh Wallet
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={loadWallet} />}

      {/* Add Credential by ID Section */}
      <div className="glass-panel" style={{ padding: '22px 24px', borderRadius: 'var(--radius-lg)' }}>
        <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px' }}>
          Add Credential to Wallet
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Claim or sync an issued credential by entering its unique UUID identifier provided by your issuing authority.
        </p>

        {addError && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--rose-primary)',
            fontSize: '13px',
            marginBottom: '14px',
          }}>
            {addError}
          </div>
        )}

        {addSuccess && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--emerald-primary)',
            fontSize: '13px',
            marginBottom: '14px',
          }}>
            {addSuccess}
          </div>
        )}

        <form onSubmit={handleAddCredential} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <input
              type="text"
              className="input-field font-mono"
              placeholder="e.g. 8d380b1b-4f51-4f11-9a7c-1793740283c7"
              value={newCredentialId}
              onChange={(e) => setNewCredentialId(e.target.value)}
              required
              style={{ height: '42px' }}
            />
          </div>
          <Button
            type="submit"
            variant="emerald"
            loading={adding}
            disabled={!newCredentialId.trim()}
            icon={Plus}
            style={{ height: '42px' }}
          >
            Add to Wallet
          </Button>
        </form>
      </div>

      {/* Credential Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
            Stored Credentials
          </h3>
          <span className="badge badge-emerald">
            {walletItems.length} in Wallet
          </span>
        </div>

        {walletItems.length === 0 ? (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)' }}>
            <EmptyState
              icon={Wallet}
              title="Your wallet is currently empty"
              description="Add a credential by its ID — ask your issuer for the ID to store and download it here."
            />
          </div>
        ) : (
          walletItems.map((item) => (
            <div
              key={item.credentialId}
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                transition: 'border-color 0.2s ease',
              }}
            >
              {/* Card Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '11px' }}>{item.type}</span>
                    <Badge status={item.status} />
                  </div>

                  <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Credential #:</span>
                    <code className="font-mono" style={{ fontSize: '13px', color: 'var(--cyan-primary)', fontWeight: 600 }}>
                      {item.credentialNumber}
                    </code>
                  </div>
                </div>

                {/* Issuer Authority Chip */}
                <div style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'right',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <Building size={14} color="var(--purple-primary)" />
                    <span>{item.issuerName || 'Authorized Issuer'}</span>
                  </div>
                  {item.issuerDomain && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {item.issuerDomain}
                    </div>
                  )}
                </div>
              </div>

              {/* Blockchain Anchor Row */}
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 229, 255, 0.04)',
                border: '1px solid rgba(0, 229, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link2 size={16} color="var(--cyan-primary)" />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {item.txHash
                      ? `Anchored on-chain — Block ${item.blockNumber ?? '1'} · Chain ${item.chainId ?? '31337'}`
                      : 'Legacy unanchored credential'}
                  </span>
                </div>

                {item.txHash && (
                  <code className="font-mono" style={{ fontSize: '12px', color: 'var(--cyan-primary)' }}>
                    {item.txHash.substring(0, 16)}...{item.txHash.substring(item.txHash.length - 8)}
                  </code>
                )}
              </div>

              {/* Card Actions Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(15, 23, 42, 0.06)',
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Issued: {item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : 'N/A'}
                  {item.expiresAt && ` · Expires: ${new Date(item.expiresAt).toLocaleDateString()}`}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Download}
                    onClick={() => handleDownload(item)}
                    loading={downloadingId === item.credentialId}
                    title="Download the exact cryptographic envelope .json for verification"
                  >
                    Download credential file
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => setRemovingCredential(item)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Remove Confirmation Modal */}
      {removingCredential && (
        <RemoveWalletModal
          credential={removingCredential}
          onClose={() => setRemovingCredential(null)}
          onRemoved={handleRemoved}
          token={accessToken}
          holderService={holderService}
        />
      )}
    </div>
  );
}
