import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, Users, FileCheck2, Check, Search, RefreshCw, CircleCheck } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';

const TABS = [
  { key: 'issuers', label: 'Issuers', Icon: Building2, empty: [Building2, 'No issuers found', 'No issuer authorities are registered on this network.'] },
  { key: 'users', label: 'Users', Icon: Users, empty: [Users, 'No users found', 'No accounts match the current search.'] },
  { key: 'verifications', label: 'Verifications', Icon: FileCheck2, empty: [FileCheck2, 'No verifications yet', 'Verification attempts appear here as they happen.'] },
];

const matches = (query, ...values) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => String(v ?? '').toLowerCase().includes(q));
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : 'Not recorded');

export function AdminConsoleView() {
  const { accessToken, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('issuers');
  const [issuers, setIssuers] = useState([]);
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);

  const [search, setSearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const tabRefs = useRef({});

  const loadAdminData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');

    // Each panel degrades independently: a failed directory should not blank
    // the two that loaded.
    const [issuerData, userData, verificationData] = await Promise.all([
      adminService.listIssuers(accessToken).catch(() => []),
      adminService.listUsers(accessToken).catch(() => []),
      adminService.listGlobalVerifications(accessToken).catch(() => []),
    ]);
    setIssuers(issuerData || []);
    setUsers(userData || []);
    setVerifications(verificationData || []);
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleApproveIssuer = async (issuer) => {
    setApprovingId(issuer.id);
    setNotice('');
    setError('');
    try {
      const updated = await adminService.verifyIssuer(issuer.id, accessToken);
      setIssuers((list) => list.map((i) => (i.id === issuer.id ? updated : i)));
      setNotice(`${issuer.name} is now authorized to issue credentials.`);
    } catch (err) {
      setError(err.message || 'Could not approve that issuer.');
    } finally {
      setApprovingId(null);
    }
  };

  const pendingApprovals = issuers.filter((i) => !i.verified).length;

  const visible = {
    issuers: issuers.filter((i) => matches(search, i.name, i.domain)),
    users: users.filter((u) => matches(search, u.email, u.fullName)),
    verifications: verifications.filter((v) => matches(search, v.credentialNumber, v.result, v.reason)),
  };
  const visibleRows = visible[activeTab] ?? [];

  /* Arrow-key roving focus, matching the verifier's segmented control. */
  const onTabKeyDown = (e) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = TABS[(TABS.findIndex((t) => t.key === activeTab) + delta + TABS.length) % TABS.length];
    setActiveTab(next.key);
    tabRefs.current[next.key]?.focus();
  };

  const columns = {
    issuers: [
      { label: 'Organization', render: (i) => <span className="table__primary">{i.name}</span> },
      { label: 'Verified domain', render: (i) => <span className="font-mono">{i.domain || 'Not stated'}</span> },
      { label: 'Status', render: (i) => <Badge status={i.verified ? 'VERIFIED' : 'PENDING'} text={i.verified ? 'Authorized' : 'Pending approval'} /> },
      { label: 'Registered', render: (i) => formatDate(i.createdAt) },
      {
        label: 'Actions',
        render: (i) =>
          i.verified ? (
            <span className="table__sub" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--ok)' }}>
              <CircleCheck size={14} aria-hidden="true" />
              Authorized
            </span>
          ) : (
            <Button variant="primary" size="sm" icon={Check} loading={approvingId === i.id} onClick={() => handleApproveIssuer(i)}>
              Approve
            </Button>
          ),
      },
    ],
    users: [
      { label: 'Name', render: (u) => <span className="table__primary">{u.fullName || 'Not recorded'}</span> },
      { label: 'Email', render: (u) => <span className="font-mono">{u.email}</span> },
      { label: 'Role', render: (u) => <Badge status={u.role} text={u.role} /> },
      { label: 'Registered', render: (u) => formatDate(u.createdAt) },
    ],
    verifications: [
      { label: 'Credential', render: (v) => <span className="font-mono">{v.credentialNumber || 'Unknown'}</span> },
      { label: 'Result', render: (v) => <Badge status={v.result} text={v.result} /> },
      { label: 'Reason', render: (v) => (v.reason || 'No reason recorded') },
      { label: 'Checked at', render: (v) => (v.verifiedAt ? new Date(v.verifiedAt).toLocaleString() : 'Not recorded') },
    ],
  }[activeTab];

  const active = TABS.find((t) => t.key === activeTab);
  const [EmptyIcon, emptyTitle, emptyBody] = active.empty;

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <p className="section-note">
        Network directories and verification audit, for {user?.fullName}.{' '}
        {pendingApprovals > 0 && (
          <>
            <strong style={{ color: 'var(--warn)' }}>{pendingApprovals}</strong> issuer
            {pendingApprovals === 1 ? '' : 's'} awaiting approval.
          </>
        )}
        {pendingApprovals === 0 && 'No issuer approvals are outstanding.'}
      </p>

      {notice && (
        <div className="alert alert--ok" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          <div className="alert__body">
            <strong className="alert__title">Issuer approved</strong>
            <p className="alert__message">{notice}</p>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={loadAdminData} />}

      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="segmented" role="tablist" aria-label="Admin directory" onKeyDown={onTabKeyDown} style={{ flex: '1 1 18rem' }}>
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              ref={(el) => { tabRefs.current[key] = el; }}
              type="button"
              role="tab"
              id={`admin-tab-${key}`}
              aria-selected={activeTab === key}
              aria-controls={`admin-panel-${key}`}
              tabIndex={activeTab === key ? 0 : -1}
              className={`segmented__item ${activeTab === key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={15} aria-hidden="true" />
              <span>
                {label} ({key === 'issuers' ? issuers.length : key === 'users' ? users.length : verifications.length})
              </span>
            </button>
          ))}
        </div>

        <div className="field" style={{ flex: '0 1 15rem' }}>
          <label className="sr-only" htmlFor="admin-search">Search the {active.label.toLowerCase()} directory</label>
          <Search size={15} className="field__icon" aria-hidden="true" />
          <input
            id="admin-search"
            className="field__input"
            type="search"
            value={search}
            placeholder="Search…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button variant="outline" onClick={loadAdminData} loading={loading} icon={RefreshCw}>
          Refresh
        </Button>
      </div>

      <section
        className="card"
        role="tabpanel"
        id={`admin-panel-${activeTab}`}
        aria-labelledby={`admin-tab-${activeTab}`}
      >
        <div className="card__header">
          <h2 className="section-title" style={{ margin: 0 }}>
            {activeTab === 'issuers' && 'Certifying issuer organizations'}
            {activeTab === 'users' && 'Platform accounts'}
            {activeTab === 'verifications' && 'Verification audit'}
          </h2>
          <p className="section-note">
            {activeTab === 'issuers' && 'Approving an issuer authorizes key generation and credential minting for that organization.'}
            {activeTab === 'users' && 'Every registered account and the role it holds.'}
            {activeTab === 'verifications' && 'Every verification attempt on the network, with its recorded outcome.'}
          </p>
        </div>

        {visibleRows.length === 0 ? (
          <div className="card__body">
            <EmptyState icon={EmptyIcon} title={emptyTitle} description={search ? 'No results for that search.' : emptyBody} />
          </div>
        ) : (
          <div className="table-container">
            <table className="table table--responsive">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.label} scope="col">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => (
                      <td key={c.label} data-label={c.label}>
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
