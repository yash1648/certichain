import React, { useState } from 'react';
import { Search, Link2, CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export function AnchorLookup() {
  const [credentialNumber, setCredentialNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [anchorData, setAnchorData] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!credentialNumber.trim()) return;

    setLoading(true);
    setLookupError(null);
    setAnchorData(null);

    try {
      const data = await verifierService.lookupAnchor(credentialNumber.trim());
      setAnchorData(data);
    } catch (err) {
      if (err.status === 404) {
        setLookupError('No anchor found for this credential number.');
      } else {
        setLookupError(err.message || 'Failed to look up on-chain anchor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px 28px',
      borderRadius: 'var(--radius-lg)',
      marginTop: '28px',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Link2 size={18} color="var(--cyan-primary)" />
        <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Direct Blockchain Anchor Lookup
        </h3>
        <span className="badge badge-cyan" style={{ fontSize: '11px' }}>
          Public On-Chain Proof
        </span>
      </div>

      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
        Query the Ethereum-compatible node directly to verify that a credential hash was permanently anchored in a mined block.
      </p>

      {/* Input Form */}
      <form onSubmit={handleLookup} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <input
            type="text"
            className="input-field font-mono"
            placeholder="e.g. SSD-CVE-2026-FB6370"
            value={credentialNumber}
            onChange={(e) => setCredentialNumber(e.target.value)}
            style={{ paddingLeft: '38px', height: '42px' }}
            required
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!credentialNumber.trim()}
          style={{ height: '42px' }}
        >
          Look Up On Chain
        </Button>
      </form>

      {/* Error display */}
      {lookupError && (
        <div className="animate-fade-in" style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          color: '#fb7185',
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{lookupError}</span>
        </div>
      )}

      {/* Anchor Proof Card Result */}
      {anchorData && (
        <div className="animate-fade-in" style={{
          marginTop: '16px',
          padding: '18px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(0, 229, 255, 0.05)',
          border: '1px solid var(--border-accent)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--cyan-primary)" />
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                Anchor Found for <span className="font-mono" style={{ color: 'var(--cyan-primary)' }}>{anchorData.credentialNumber}</span>
              </span>
            </div>
            <Badge
              status={anchorData.anchorVerified ? 'ACTIVE' : 'PENDING'}
              text={anchorData.anchorVerified ? 'Block Verified' : 'Database Record'}
              variant={anchorData.anchorVerified ? 'emerald' : 'amber'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Block Number</span>
              <div className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {anchorData.blockNumber ?? 'N/A'}
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Chain ID</span>
              <div className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {anchorData.chainId ?? '31337'}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Transaction Hash</span>
              <div className="font-mono" style={{
                color: 'var(--cyan-primary)',
                fontSize: '12px',
                padding: '6px 10px',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                borderRadius: '4px',
                marginTop: '3px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                userSelect: 'all',
              }}>
                {anchorData.txHash || 'N/A'}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Anchored Content Hash (SHA-256)</span>
              <div className="font-mono" style={{
                color: 'var(--text-secondary)',
                fontSize: '12px',
                padding: '6px 10px',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                borderRadius: '4px',
                marginTop: '3px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                userSelect: 'all',
              }}>
                {anchorData.contentHash || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
