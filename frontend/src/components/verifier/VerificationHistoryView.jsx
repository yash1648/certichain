import React, { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, Search, ShieldCheck, ShieldAlert, AlertTriangle, Clock } from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { useAuth } from '../../context/AuthContext';

export function VerificationHistoryView() {
  const { accessToken } = useAuth();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);

    try {
      const records = await verifierService.listVerificationHistory(accessToken);
      setHistory(records);
    } catch (err) {
      console.warn('Failed to load verification history', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = history.filter(item =>
    (item.credentialNumber && item.credentialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.result && item.result.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getResultBadge = (result) => {
    switch (result) {
      case 'VALID':
        return <span className="badge badge-emerald">✓ Valid</span>;
      case 'TAMPERED':
        return <span className="badge" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}>Tampered</span>;
      case 'REVOKED':
        return <span className="badge badge-amber">Revoked</span>;
      case 'EXPIRED':
        return <span className="badge badge-amber">Expired</span>;
      case 'NOT_FOUND':
      case 'UNAVAILABLE':
      default:
        return <span className="badge badge-purple">{result}</span>;
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(0, 229, 255, 0.1)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan-primary)'
          }}>
            <History size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Verification Audit History
              </h2>
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                {history.length} Audits
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Logged audits queried from <code>GET /api/verifier/history</code>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              placeholder="Search audit records..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '7px 12px 7px 30px', fontSize: '0.825rem' }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          </div>

          <button
            onClick={loadHistory}
            className="btn btn-outline"
            style={{ padding: '7px 12px', fontSize: '0.8rem' }}
            title="Reload verification history"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--cyan-primary)' }} />
          <p style={{ fontSize: '0.85rem' }}>Loading verification records...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <History size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.9rem' }}>No verification records recorded under your account yet.</p>
          <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            Verify a credential file using the Verifier Portal to generate audit records.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 10px', fontWeight: 500 }}>Credential #</th>
                <th style={{ padding: '12px 10px', fontWeight: 500 }}>Verification Result</th>
                <th style={{ padding: '12px 10px', fontWeight: 500 }}>Audit Notes / Reason</th>
                <th style={{ padding: '12px 10px', fontWeight: 500, textAlign: 'right' }}>Verified At</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>
                      {item.credentialNumber || 'Anonymous Envelope'}
                    </code>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    {getResultBadge(item.result)}
                  </td>
                  <td style={{ padding: '12px 10px', color: item.reason ? '#fb7185' : 'var(--text-muted)' }}>
                    {item.reason || 'Cryptographic proof valid'}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {new Date(item.verifiedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
