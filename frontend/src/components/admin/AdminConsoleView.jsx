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

const DEMO_ADMIN_ISSUERS = [
  {
    id: 'iss-mit',
    name: 'Massachusetts Institute of Technology',
    domain: 'mit.edu',
    verified: true,
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'iss-stanford',
    name: 'Stanford Center for Professional Development',
    domain: 'stanford.edu',
    verified: true,
    createdAt: '2024-03-20T11:30:00Z',
  },
  {
    id: 'iss-harvard',
    name: 'Harvard Division of Continuing Education',
    domain: 'harvard.edu',
    verified: false,
    createdAt: '2026-09-12T14:15:00Z',
  },
  {
    id: 'iss-cambridge',
    name: 'Cambridge Assessment International Education',
    domain: 'cam.ac.uk',
    verified: false,
    createdAt: '2026-09-28T08:45:00Z',
  },
];

const DEMO_ADMIN_USERS = [
  {
    id: 'usr-alex-mercer',
    fullName: 'Alex Mercer',
    email: 'alex.mercer@alumni.org',
    role: 'HOLDER',
    createdAt: '2024-02-10T12:00:00Z',
  },
  {
    id: 'usr-elena-rostova',
    fullName: 'Elena Rostova',
    email: 'e.rostova@mit.edu',
    role: 'HOLDER',
    createdAt: '2024-06-18T10:15:00Z',
  },
  {
    id: 'usr-mit-registrar',
    fullName: 'MIT Registrar Office',
    email: 'registrar@mit.edu',
    role: 'ISSUER',
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'usr-sarah-jenkins',
    fullName: 'Dr. Sarah Jenkins',
    email: 's.jenkins@stanford.edu',
    role: 'ISSUER',
    createdAt: '2024-03-20T11:30:00Z',
  },
  {
    id: 'usr-sys-admin',
    fullName: 'System Administrator',
    email: 'admin@certichain.org',
    role: 'ADMIN',
    createdAt: '2023-11-01T00:00:00Z',
  },
];

const DEMO_ADMIN_VERIFICATIONS = [
  {
    id: 'ver-1',
    credentialNumber: 'MIT-BSC-2026-CS8941',
    result: 'VALID',
    reason: 'Ed25519 signature valid against MIT key; Ethereum block #18492103 anchor confirmed.',
    verifiedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'ver-2',
    credentialNumber: 'SSD-CVE-2026-FB6370',
    result: 'VALID',
    reason: 'Cryptographic integrity verified; Ethereum block #18610442 anchor confirmed.',
    verifiedAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
  },
  {
    id: 'ver-3',
    credentialNumber: 'MIT-CERT-2025-QC109',
    result: 'REVOKED',
    reason: 'Cryptographic signature is valid, but credential was revoked on-chain at block #18104520.',
    verifiedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
  },
  {
    id: 'ver-4',
    credentialNumber: 'EXT-FRAUD-2026-9999',
    result: 'INVALID',
    reason: 'Signature mismatch: signed payload does not match issuer public key.',
    verifiedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

export function AdminConsoleView() {
  const { accessToken, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('issuers');
  const [issuers, setIssuers] = useState([]);
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);

  const [search, setSearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [promotingId, setPromotingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const tabRefs = useRef({});

  const loadAdminData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');

    try {
      const [issuerData, userData, verificationData] = await Promise.all([
        adminService.listIssuers(accessToken).catch(() => []),
        adminService.listUsers(accessToken).catch(() => []),
        adminService.listGlobalVerifications(accessToken).catch(() => []),
      ]);

      if (accessToken.startsWith('demo')) {
        setIssuers(issuerData && issuerData.length > 0 ? issuerData : DEMO_ADMIN_ISSUERS);
        setUsers(userData && userData.length > 0 ? userData : DEMO_ADMIN_USERS);
        setVerifications(verificationData && verificationData.length > 0 ? verificationData : DEMO_ADMIN_VERIFICATIONS);
      } else {
        setIssuers(issuerData || []);
        setUsers(userData || []);
        setVerifications(verificationData || []);
      }
    } catch (err) {
      if (accessToken.startsWith('demo')) {
        setIssuers(DEMO_ADMIN_ISSUERS);
        setUsers(DEMO_ADMIN_USERS);
        setVerifications(DEMO_ADMIN_VERIFICATIONS);
      } else {
        setError(err.message || 'Failed to load administrative directories.');
      }
    } finally {
      setLoading(false);
    }
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
      if (accessToken?.startsWith('demo')) {
        setIssuers((list) =>
          list.map((i) => (i.id === issuer.id ? { ...i, verified: true } : i))
        );
        setNotice(`${issuer.name} is now authorized to issue credentials.`);
      } else {
        setError(err.message || 'Could not approve that issuer.');
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handlePromoteIssuer = async (target) => {
    setPromotingId(target.id);
    setNotice('');
    setError('');
    try {
      await adminService.promoteIssuer(target.id, accessToken);
      setUsers((list) =>
        list.map((u) => (u.id === target.id ? { ...u, role: 'ISSUER' } : u))
      );
      setNotice(
        `${target.fullName || target.email} can now issue credentials. They need to sign in again for the new role to take effect.`
      );
    } catch (err) {
      if (accessToken?.startsWith('demo')) {
        setUsers((list) =>
          list.map((u) => (u.id === target.id ? { ...u, role: 'ISSUER' } : u))
        );
        setNotice(
          `${target.fullName || target.email} can now issue credentials. Role elevated in sandbox.`
        );
      } else {
        setError(err.message || 'Could not promote that account.');
      }
    } finally {
      setPromotingId(null);
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
      {
        label: 'Actions',
        // Only holders are offered the grant. Issuers and admins already
        // hold it, and an admin must not be reachable from here at all.
        render: (u) =>
          u.role === 'HOLDER' ? (
            <Button
              variant="primary"
              size="sm"
              icon={Building2}
              loading={promotingId === u.id}
              onClick={() => handlePromoteIssuer(u)}
            >
              Make issuer
            </Button>
          ) : (
            <span className="table__sub">—</span>
          ),
      },
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

      {/* Administrative Overview Metrics */}
      <div className="stats-grid">
        <div className="stat-card stat-card--accent">
          <span className="stat-card__label">Accredited Issuers</span>
          <span className="stat-card__value tabular-nums">{issuers.length}</span>
          <span className="stat-card__sub">
            {pendingApprovals > 0 ? (
              <span style={{ color: 'var(--warn)', fontWeight: 600 }}>{pendingApprovals} awaiting approval</span>
            ) : (
              'All institutions authorized'
            )}
          </span>
        </div>
        <div className="stat-card stat-card--ok">
          <span className="stat-card__label">Directory Users</span>
          <span className="stat-card__value tabular-nums">{users.length}</span>
          <span className="stat-card__sub">{users.filter((u) => u.role === 'ISSUER').length} Authorized signing authorities</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Global Verifications</span>
          <span className="stat-card__value tabular-nums">{verifications.length}</span>
          <span className="stat-card__sub">Cryptographic query audits logged</span>
        </div>
      </div>

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
            className="input-field field__input"
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
