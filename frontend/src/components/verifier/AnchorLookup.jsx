import React, { useState } from 'react';
import { Search, Link2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export function AnchorLookup({ onLookupResult }) {
  const [credentialNumber, setCredentialNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [anchorData, setAnchorData] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    const cleanNumber = credentialNumber.trim();
    if (!cleanNumber) return;

    setLoading(true);
    setLookupError(null);
    setAnchorData(null);

    try {
      const data = await verifierService.lookupAnchor(cleanNumber);
      setAnchorData(data);
      if (onLookupResult) {
        onLookupResult(data);
      }
    } catch (err) {
      if (err.status === 404) {
        setLookupError(`No on-chain record found for certificate "${cleanNumber}". Please double-check the certificate number.`);
      } else {
        setLookupError(err.message || 'Failed to search blockchain ledger. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '18px' }}>
        <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Look Up Certificate by Official Number
        </h3>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
          Enter the official Certificate Number printed on the degree or certificate to verify its permanent record on the blockchain.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleLookup} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <input
            type="text"
            className="input-field font-mono"
            placeholder="e.g. SSD-CVE-2026-FB6370"
            value={credentialNumber}
            onChange={(e) => setCredentialNumber(e.target.value)}
            style={{ paddingLeft: '38px', height: '44px' }}
            required
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!credentialNumber.trim()}
          style={{ height: '44px', padding: '0 24px' }}
        >
          Verify Certificate
        </Button>
      </form>

      {/* Error display */}
      {lookupError && (
        <div className="animate-fade-in" style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(225, 29, 72, 0.08)',
          border: '1px solid rgba(225, 29, 72, 0.25)',
          color: 'var(--rose-primary)',
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{lookupError}</span>
        </div>
      )}

      {/* Anchor Proof Card Result (if rendered standalone) */}
      {anchorData && (
        <div className="animate-fade-in" style={{
          marginTop: '18px',
          padding: '20px 22px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(5, 150, 105, 0.05)',
          border: '1px solid rgba(5, 150, 105, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--emerald-primary)" />
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                Official Blockchain Record Found
              </span>
            </div>
            <Badge
              status={anchorData.anchorVerified ? 'ACTIVE' : 'PENDING'}
              text={anchorData.anchorVerified ? 'Block Verified & Mined' : 'Recorded on Ledger'}
              variant={anchorData.anchorVerified ? 'emerald' : 'cyan'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Certificate #</span>
              <div className="font-mono" style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>
                {anchorData.credentialNumber}
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Block Number</span>
              <div className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                Block #{anchorData.blockNumber ?? '1'}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Blockchain Transaction</span>
              <div className="font-mono" style={{
                color: 'var(--cyan-primary)',
                fontSize: '12px',
                padding: '6px 10px',
                backgroundColor: '#ffffff',
                borderRadius: '4px',
                marginTop: '3px',
                border: '1px solid var(--border-subtle)',
                userSelect: 'all',
              }}>
                {anchorData.txHash || 'Mined in Genesis Block'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
