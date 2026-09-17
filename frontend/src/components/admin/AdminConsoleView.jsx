import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Building2, 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  History, 
  Clock, 
  Check, 
  Filter
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';

export function AdminConsoleView() {
  const { accessToken, user } = useAuth();

  const [activeTab, setActiveTab] = useState('issuers'); // 'issuers' | 'users' | 'verifications'
  const [loading, setLoading] = useState(true);

  const [issuers, setIssuers] = useState([]);
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Action states
  const [approvingId, setApprovingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const loadAdminData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setActionError('');

    try {
      const [issuersData, usersData, verifsData] = await Promise.all([
        adminService.listIssuers(accessToken).catch(() => []),
        adminService.listUsers(accessToken).catch(() => []),
        adminService.listGlobalVerifications(accessToken).catch(() => []),
      ]);

      setIssuers(issuersData || []);
      setUsers(usersData || []);
      setVerifications(verifsData || []);
    } catch (err) {
      setActionError(err.message || 'Failed to load administrative records.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Handle approving an issuer
  const handleApproveIssuer = async (issuerId, issuerName) => {
    setApprovingId(issuerId);
    setActionSuccess('');
    setActionError('');

    try {
      const updated = await adminService.verifyIssuer(issuerId, accessToken);
      setIssuers(issuers.map(i => i.id === issuerId ? updated : i));
      setActionSuccess(`Issuer "${issuerName}" has been successfully approved & verified! Key creation and credential minting are now unlocked.`);
    } catch (err) {
      setActionError(err.message || 'Failed to approve issuer.');
    } finally {
      setApprovingId(null);
    }
  };

  const pendingApprovalsCount = issuers.filter(i => !i.verified).length;

  const filteredIssuers = issuers.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u => {
    const matchesQuery = 
      (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.id && u.id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchesQuery && matchesRole;
  });

  const filteredVerifications = verifications.filter(v =>
    (v.credentialNumber && v.credentialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (v.result && v.result.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (v.reason && v.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Admin Banner */}
      <div className="glass-panel" style={{ padding: '26px 28px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(139, 92, 246, 0.25))',
              border: '1px solid var(--border-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--amber-primary)',
            }}>
              <ShieldAlert size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                  Network Admin Console
                </h1>
                <Badge status="ADMIN" text="System Authority" variant="amber" />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Overseer: <strong style={{ color: 'var(--text-primary)' }}>{user?.fullName}</strong> · Network Management & Approvals
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadAdminData}
            loading={loading}
            icon={RefreshCw}
          >
            Sync State
          </Button>
        </div>

        {/* KPI Metrics Summary Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginTop: '22px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
              <Users size={14} color="var(--cyan-primary)" />
              <span>Registered Users</span>
            </div>
            <div className="font-mono" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {users.length}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
              <Building2 size={14} color="#a78bfa" />
              <span>Registered Issuers</span>
            </div>
            <div className="font-mono" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {issuers.length}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card-hover)',
            border: pendingApprovalsCount > 0 ? '1px solid rgba(217, 119, 6, 0.4)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
              <Clock size={14} color="var(--amber-primary)" />
              <span>Pending Approvals</span>
            </div>
            <div className="font-mono" style={{
              fontSize: '1.65rem',
              fontWeight: 700,
              color: pendingApprovalsCount > 0 ? 'var(--amber-primary)' : 'var(--text-primary)',
            }}>
              {pendingApprovalsCount}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
              <History size={14} color="var(--cyan-primary)" />
              <span>Global Audits</span>
            </div>
            <div className="font-mono" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {verifications.length}
            </div>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="animate-fade-in" style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <ErrorState message={actionError} onRetry={loadAdminData} />
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        paddingBottom: '4px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('issuers')}
            className={`tab-btn ${activeTab === 'issuers' ? 'active-amber' : ''}`}
          >
            <Building2 size={15} />
            <span>Issuers Directory ({issuers.length})</span>
            {pendingApprovalsCount > 0 && (
              <span className="badge badge-amber" style={{ padding: '1px 6px', fontSize: '10px' }}>
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`tab-btn ${activeTab === 'users' ? 'active-amber' : ''}`}
          >
            <Users size={15} />
            <span>User Directory ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            className={`tab-btn ${activeTab === 'verifications' ? 'active-amber' : ''}`}
          >
            <History size={15} />
            <span>Global Verifications ({verifications.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '240px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
          />
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
        </div>
      </div>

      {/* TAB 1: Issuers Management */}
      {activeTab === 'issuers' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Certifying Issuer Organizations
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Review and approve issuer verification status to authorize Ed25519 key generation.
              </p>
            </div>
          </div>

          {filteredIssuers.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No issuers found"
              description="No issuer authorities registered on the platform matching your criteria."
            />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Verified Domain</th>
                    <th>Status</th>
                    <th>Registered At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssuers.map((issuer) => (
                    <tr key={issuer.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {issuer.name}
                      </td>
                      <td>
                        <code className="font-mono" style={{ color: 'var(--cyan-primary)', fontSize: '13px' }}>
                          {issuer.domain}
                        </code>
                      </td>
                      <td>
                        <Badge
                          status={issuer.verified ? 'VERIFIED' : 'PENDING'}
                          text={issuer.verified ? 'Verified' : 'Pending Approval'}
                          variant={issuer.verified ? 'emerald' : 'amber'}
                        />
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {issuer.createdAt ? new Date(issuer.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!issuer.verified ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Check}
                            loading={approvingId === issuer.id}
                            onClick={() => handleApproveIssuer(issuer.id, issuer.name)}
                          >
                            Approve & Verify
                          </Button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--emerald-primary)', fontWeight: 500 }}>
                            ✓ Authorized
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: User Directory */}
      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Platform User Directory
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                All registered accounts and security roles across CertiChain.
              </p>
            </div>

            {/* Role Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select
                className="select-field"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{ height: '34px', padding: '4px 10px', fontSize: '12px', width: 'auto' }}
              >
                <option value="ALL">All Roles</option>
                <option value="HOLDER">Holders</option>
                <option value="ISSUER">Issuers</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="No registered platform users match your search query or filter."
            />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User / Full Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>User ID (UUID)</th>
                    <th style={{ textAlign: 'right' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.fullName}
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)' }}>{u.email}</span>
                      </td>
                      <td>
                        <Badge status={u.role} />
                      </td>
                      <td>
                        <code className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {u.id}
                        </code>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Global Verifications Audits */}
      {activeTab === 'verifications' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Global Verification Ledger
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Platform-wide verification audits performed by public verifiers and accounts.
              </p>
            </div>
          </div>

          {filteredVerifications.length === 0 ? (
            <EmptyState
              icon={History}
              title="No global verifications logged"
              description="Platform verification attempts will appear in this audit trail."
            />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Credential Number</th>
                    <th>Outcome</th>
                    <th>Verifier</th>
                    <th>Reason / Details</th>
                    <th style={{ textAlign: 'right' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVerifications.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <code className="font-mono" style={{ color: 'var(--cyan-primary)', fontSize: '13px', fontWeight: 600 }}>
                          {v.credentialNumber || 'Anonymous'}
                        </code>
                      </td>
                      <td>
                        <Badge status={v.result} />
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: v.verifierId ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {v.verifierId ? `User: ${v.verifierId.substring(0, 8)}...` : 'Public / Anonymous'}
                        </span>
                      </td>
                      <td style={{ color: v.reason && v.result !== 'VALID' ? '#fb7185' : 'var(--text-secondary)' }}>
                        {v.reason || 'Cryptographic integrity verified'}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {v.verifiedAt ? new Date(v.verifiedAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
