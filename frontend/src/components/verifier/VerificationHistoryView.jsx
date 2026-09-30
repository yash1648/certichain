import React, { useState, useEffect, useCallback, useId } from 'react';
import { History, RefreshCw, Search } from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';

const formatDateTime = (iso) => {
  if (!iso) return 'Not recorded';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

export function VerificationHistoryView() {
  const { accessToken } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const searchId = useId();

  const loadHistory = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      setHistory((await verifierService.listVerificationHistory(accessToken)) || []);
    } catch (err) {
      setError(err.message || 'The history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const needle = query.trim().toLowerCase();
  const matches = history.filter((item) =>
    needle
      ? [item.credentialNumber, item.result, item.reason].some((v) =>
          v?.toLowerCase().includes(needle)
        )
      : true
  );

  return (
    <div className="animate-fade-in">
      <div className="toolbar">
        <div className="toolbar__search">
          {/* Visible label would unbalance the toolbar; the name is still
              announced, which is what the filter needs. */}
          <label className="sr-only" htmlFor={searchId}>
            Filter history
          </label>
          <Search size={15} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            className="input-field"
            placeholder="Filter by certificate, outcome or reason"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={loadHistory} loading={loading} icon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ErrorState message={error} onRetry={loadHistory} />
        </div>
      )}

      <div className="card card--flush">
        <div className="card__header">
          <h2 className="section-title" style={{ margin: 0 }}>
            Checks
          </h2>
          {/* Counts what is on screen, not what is in memory. */}
          <span className="count-note">
            {matches.length} of {history.length}
          </span>
        </div>

        {matches.length === 0 ? (
          // An empty log and an over-narrow filter are different states and the
          // user needs different actions for each.
          needle ? (
            <EmptyState
              icon={Search}
              title="No matching checks"
              description={`Nothing in your history matches "${query.trim()}".`}
              actionLabel="Clear filter"
              onAction={() => setQuery('')}
            />
          ) : (
            <EmptyState
              icon={History}
              title="No checks yet"
              description="Verifying a credential records it here."
            />
          )
        ) : (
          <div className="table-container">
            <table className="table table--responsive">
              <thead>
                <tr>
                  <th scope="col">Certificate</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Detail</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Checked
                  </th>
                </tr>
              </thead>
              <tbody>
                {matches.map((item) => (
                  <tr key={item.id}>
                    <th scope="row" className="table__primary font-mono" data-label="Certificate">
                      {item.credentialNumber || 'Not stated'}
                    </th>
                    <td data-label="Outcome">
                      <Badge status={item.result} />
                    </td>
                    <td data-label="Detail">{item.reason || 'No detail recorded'}</td>
                    <td data-label="Checked" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatDateTime(item.verifiedAt)}
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
