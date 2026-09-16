import React, { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, Search } from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';

export function VerificationHistoryView() {
  const { accessToken } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const records = await verifierService.listVerificationHistory(accessToken);
      setHistory(records || []);
    } catch (err) {
      setError(err.message || 'Failed to load verification history.');
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

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid var(--border-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--amber-primary)',
            }}>
              <History size={20} />
            </div>
            <div>
              <h1 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Audit History
              </h1>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                Ledger of verification checks performed under your account.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              placeholder="Filter audit log..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
          </div>

          <Button variant="secondary" size="sm" onClick={loadHistory} loading={loading} icon={RefreshCw}>
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadHistory} />}

      {/* Main Table Panel */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            Past Verifications
          </h3>
          <span className="badge badge-amber">
            {history.length} Audits Logged
          </span>
        </div>

        {filteredHistory.length === 0 ? (
          <EmptyState
            icon={History}
            title="No verifications yet"
            description="Verify a credential file to see it recorded here in your audit ledger."
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Credential #</th>
                  <th>Outcome</th>
                  <th>Reason / Details</th>
                  <th style={{ textAlign: 'right' }}>Verified At</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code className="font-mono" style={{ color: 'var(--cyan-primary)', fontSize: '13px', fontWeight: 600 }}>
                        {item.credentialNumber || 'Anonymous'}
                      </code>
                    </td>
                    <td>
                      <Badge status={item.result} />
                    </td>
                    <td style={{ color: item.reason && item.result !== 'VALID' ? '#fb7185' : 'var(--text-secondary)' }}>
                      {item.reason || 'Verified successfully'}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {item.verifiedAt ? new Date(item.verifiedAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
