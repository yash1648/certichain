import React, { useState, useEffect, useCallback } from 'react';
import { 
  Award, 
  Plus, 
  Download, 
  Trash2, 
  RefreshCw, 
  Building, 
  Eye, 
  Share2, 
  Check, 
  Search, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { holderService } from '../../services/holderService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { RemoveWalletModal } from './RemoveWalletModal';
import { CertificateDiplomaModal } from '../common/CertificateDiplomaModal';

export function HolderWalletView() {
  const { accessToken, user } = useAuth();
  const [walletItems, setWalletItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Credential Form State
  const [newCredentialId, setNewCredentialId] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Downloading State
  const [downloadingId, setDownloadingId] = useState(null);

  // Modals State
  const [viewingCredential, setViewingCredential] = useState(null);
  const [removingCredential, setRemovingCredential] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch Wallet Items
  const loadWallet = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const data = await holderService.listWallet(accessToken);
      setWalletItems(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load your certificates. Please check connection and try again.');
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
    const cleanId = newCredentialId.trim();
    if (!cleanId) return;

    setAdding(true);
    setAddError(null);
    setAddSuccess(null);

    try {
      const added = await holderService.addToWallet(cleanId, accessToken);
      setAddSuccess(`"${added.title || added.credentialNumber || 'Certificate'}" successfully linked to your wallet!`);
      setNewCredentialId('');
      loadWallet();
    } catch (err) {
      setAddError(err.message || 'Could not find or add credential. Please verify the ID provided by your institution.');
    } finally {
      setAdding(false);
    }
  };

  // Handle Download Signed Envelope
  const handleDownload = async (credential) => {
    setDownloadingId(credential.credentialId);
    try {
      const filename = `${credential.credentialNumber || 'certificate'}.json`;
      await holderService.downloadCredential(credential.credentialId, accessToken, filename);
    } catch (err) {
      setError(err.message || 'Failed to download official credential file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShare = (credential) => {
    const text = `Verify my official certificate "${credential.title}" on CertiChain (Certificate #: ${credential.credentialNumber})`;
    navigator.clipboard.writeText(text);
    setCopiedId(credential.credentialId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRemoved = (credentialId) => {
    setWalletItems(prev => prev.filter(c => c.credentialId !== credentialId));
    if (viewingCredential?.credentialId === credentialId) {
      setViewingCredential(null);
    }
  };

  const filteredItems = walletItems.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.credentialNumber && item.credentialNumber.toLowerCase().includes(q)) ||
      (item.issuerName && item.issuerName.toLowerCase().includes(q)) ||
      (item.type && item.type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header & Welcome Banner */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1d4ed8'
            }}>
              <Award size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
                  My Credential Wallet
                </h1>
                <span className="badge badge-emerald">
                  <ShieldCheck size={12} />
                  Verified Holder
                </span>
              </div>
              <p style={{ fontSize: '14px', color: '#475569' }}>
                Welcome, <strong>{user?.fullName || 'Student'}</strong>. Manage, view, and share your authentic degrees and credentials.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button variant="secondary" size="sm" onClick={loadWallet} loading={loading} icon={RefreshCw}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Total Credentials
            </span>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {walletItems.length}
            </div>
          </div>

          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Ledger Anchored
            </span>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', marginTop: '2px' }}>
              {walletItems.filter(i => i.txHash).length}
            </div>
          </div>

          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Active & Valid
            </span>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8', marginTop: '2px' }}>
              {walletItems.filter(i => i.status === 'ACTIVE').length}
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadWallet} />}

      {/* Add a Certificate by ID / Code Section */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Sparkles size={18} color="#1d4ed8" />
          <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0f172a' }}>
            Claim a Certificate to Your Wallet
          </h3>
        </div>
        <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '16px' }}>
          Received a degree or certificate? Enter the unique Certificate UUID provided by your issuing institution to claim and store it.
        </p>

        {addError && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
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
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: '13px',
            marginBottom: '14px',
          }}>
            {addSuccess}
          </div>
        )}

        <form onSubmit={handleAddCredential} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px' }}>
            <input
              type="text"
              className="input-field font-mono"
              placeholder="e.g. 8d380b1b-4f51-4f11-9a7c-1793740283c7"
              value={newCredentialId}
              onChange={(e) => setNewCredentialId(e.target.value)}
              required
              style={{ height: '40px' }}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={adding}
            disabled={!newCredentialId.trim()}
            icon={Plus}
            style={{ height: '40px', padding: '0 18px' }}
          >
            Claim Credential
          </Button>
        </form>
      </div>

      {/* Certificates Directory Header & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Official Credentials ({filteredItems.length})
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Each certificate is cryptographically signed with Ed25519 and permanently anchored.
          </p>
        </div>

        {walletItems.length > 0 && (
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search certificates or universities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          </div>
        )}
      </div>

      {/* Credential Cards Grid */}
      {walletItems.length === 0 ? (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)' }}>
          <EmptyState
            icon={Award}
            title="Your certificate wallet is empty"
            description="When your university or certification board issues you a credential, enter the ID above to store and view your official diploma."
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>No certificates matched "{searchQuery}".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '20px' }}>
          {filteredItems.map((item) => (
            <div
              key={item.credentialId}
              className="diploma-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Card Upper Section */}
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                      {item.type || 'Degree'}
                    </span>
                    <Badge status={item.status} />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#f8fafc',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <Building size={13} color="#6b21a8" />
                    <span>{item.issuerName || 'Authorized Issuer'}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-display" style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px',
                  lineHeight: 1.3
                }}>
                  {item.title}
                </h3>

                {/* Certificate Number & Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12.5px', color: '#475569', marginBottom: '16px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Cert #: </span>
                    <code className="font-mono" style={{ color: '#1d4ed8', fontWeight: 600 }}>
                      {item.credentialNumber}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Issued: </span>
                    <span>{item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                {/* Blockchain Seal Banner */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', fontWeight: 600 }}>
                    <ShieldCheck size={15} />
                    <span>Anchored on Blockchain (Block #{item.blockNumber ?? '1'})</span>
                  </div>
                  <span style={{ color: '#15803d', fontWeight: 600 }}>
                    Tamper-Proof
                  </span>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div style={{
                padding: '14px 24px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Eye}
                    onClick={() => setViewingCredential(item)}
                  >
                    View Official Diploma
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    icon={copiedId === item.credentialId ? Check : Share2}
                    onClick={() => handleShare(item)}
                    title="Copy verification link"
                  >
                    {copiedId === item.credentialId ? 'Copied' : 'Share'}
                  </Button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Download}
                    onClick={() => handleDownload(item)}
                    loading={downloadingId === item.credentialId}
                    title="Download verifiable .json file for job applications"
                  >
                    Download JSON
                  </Button>

                  <button
                    onClick={() => setRemovingCredential(item)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#94a3b8', padding: '6px' }}
                    title="Remove from wallet"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Diploma Full-Screen Preview Modal */}
      {viewingCredential && (
        <CertificateDiplomaModal
          credential={viewingCredential}
          onClose={() => setViewingCredential(null)}
          onDownload={() => handleDownload(viewingCredential)}
        />
      )}

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
