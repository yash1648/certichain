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
    <div className="animate-fade-in" style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header & Welcome Banner */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
              border: '1px solid var(--border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan-primary)',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.1)'
            }}>
              <Award size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  My Certificates & Credentials
                </h1>
                <span className="badge badge-emerald">
                  <ShieldCheck size={12} />
                  Verified Holder
                </span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Welcome back, <strong>{user?.fullName || 'Student'}</strong>. Manage, present, and share your authentic degrees and certifications.
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
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Credentials
            </span>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {walletItems.length}
            </div>
          </div>

          <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ledger Anchored
            </span>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--emerald-primary)', marginTop: '2px' }}>
              {walletItems.filter(i => i.txHash).length}
            </div>
          </div>

          <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active & Valid
            </span>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cyan-primary)', marginTop: '2px' }}>
              {walletItems.filter(i => i.status === 'ACTIVE').length}
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadWallet} />}

      {/* Add a Certificate by ID / Code Section */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Sparkles size={18} color="var(--cyan-primary)" />
          <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            Add a Certificate to Your Wallet
          </h3>
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Received a degree or certification? Enter your Certificate UUID provided by your issuing university or training body to link it.
        </p>

        {addError && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(225, 29, 72, 0.08)',
            border: '1px solid rgba(225, 29, 72, 0.25)',
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
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            border: '1px solid rgba(5, 150, 105, 0.25)',
            color: 'var(--emerald-primary)',
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
              style={{ height: '44px' }}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={adding}
            disabled={!newCredentialId.trim()}
            icon={Plus}
            style={{ height: '44px', padding: '0 22px' }}
          >
            Claim Certificate
          </Button>
        </form>
      </div>

      {/* Certificates Directory Header & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700 }}>
            Your Official Credentials ({filteredItems.length})
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Each certificate is cryptographically signed and permanently anchored.
          </p>
        </div>

        {walletItems.length > 0 && (
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search certificates or institutions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          </div>
        )}
      </div>

      {/* Credential Cards Grid */}
      {walletItems.length === 0 ? (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)' }}>
          <EmptyState
            icon={Award}
            title="Your certificate wallet is empty"
            description="When your university, academy, or organization issues you a credential, enter the ID above to store and view your official certificate."
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No certificates matched "{searchQuery}".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '20px' }}>
          {filteredItems.map((item) => (
            <div
              key={item.credentialId}
              className="diploma-card"
              style={{
                border: '1px solid var(--border-subtle)',
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
                    color: 'var(--text-primary)',
                    backgroundColor: '#f8fafc',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <Building size={13} color="var(--purple-primary)" />
                    <span>{item.issuerName || 'Authorized Issuer'}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-display" style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  lineHeight: 1.3
                }}>
                  {item.title}
                </h3>

                {/* Certificate Number & Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Cert #: </span>
                    <code className="font-mono" style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>
                      {item.credentialNumber}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Issued: </span>
                    <span>{item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                {/* Blockchain Seal Banner */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(37, 99, 235, 0.04)',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan-primary)', fontWeight: 500 }}>
                    <ShieldCheck size={15} />
                    <span>Anchored on Blockchain (Block #{item.blockNumber ?? '1'})</span>
                  </div>
                  <span style={{ color: 'var(--emerald-primary)', fontWeight: 600 }}>
                    Tamper-Proof
                  </span>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div style={{
                padding: '14px 24px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid var(--border-subtle)',
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
                    View Certificate
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
                    Download File
                  </Button>

                  <button
                    onClick={() => setRemovingCredential(item)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--text-muted)', padding: '6px' }}
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
