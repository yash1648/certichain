import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  History, 
  ExternalLink,
  Clock,
  ShieldCheck,
  UserCheck,
  Filter
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

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

      setIssuers(issuersData);
      setUsers(usersData);
      setVerifications(verifsData);
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
      setActionSuccess(`Issuer "${issuerName}" has been successfully approved & verified! Key creation and credential minting are now unlocked for them.`);
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
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchesQuery && matchesRole;
  });

  const filteredVerifications = verifications.filter(v =>
    (v.credentialNumber && v.credentialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (v.result && v.result.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (v.reason && v.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="badge badge-amber">ADMIN</span>;
      case 'ISSUER':
        return <span className="badge badge-purple">ISSUER</span>;
      case 'VERIFIER':
        return <span className="badge badge-cyan">VERIFIER</span>;
      case 'HOLDER':
      default:
        return <span className="badge badge-emerald">HOLDER</span>;
    }
  };

  const getVerificationBadge = (result) => {
    switch (result) {
      case 'VALID':
        return <span className="badge badge-emerald">✓ Valid</span>;
      case 'TAMPERED':
        return <span className="badge" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}>Tampered</span>;
      case 'REVOKED':
        return <span className="badge badge-amber">Revoked</span>;
      case 'EXPIRED':
        return <span className="badge badge-amber">Expired</span>;
      default:
        return <span className="badge badge-purple">{result}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Admin Banner */}
      <div className="glass-panel glass-panel-glow" style={{ padding: '26px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(139, 92, 246, 0.25))',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--amber-primary)',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)'
            }}>
              <ShieldAlert size={28} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                <h1 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                  Network Admin Console
                </h1>
                <span className="badge badge-amber">
                  <ShieldCheck size={12} />
                  System Authority
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Overseer: <strong style={{ color: 'var(--text-primary)' }}>{user?.fullName}</strong> — Platform Administration (/api/admin/**)
              </p>
            </div>
          </div>

          <button
            onClick={loadAdminData}
            className="btn btn-outline"
            style={{ padding: '8px 14px', fontSize: '0.825rem' }}
            title="Refresh administrative data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync Admin State</span>
          </button>
        </div>

        {/* KPI Metrics Summary Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginTop: '22px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          {/* Total Users */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '4px' }}>
              <Users size={14} color="var(--cyan-primary)" />
              <span>Registered Users</span>
            </div>
            <div className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {users.length}
            </div>
          </div>

          {/* Registered Issuers */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '4px' }}>
              <Building2 size={14} color="#a78bfa" />
              <span>Certifying Issuers</span>
            </div>
            <div className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {issuers.length}
            </div>
          </div>

          {/* Pending Issuer Approvals */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: pendingApprovalsCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '4px' }}>
              <Clock size={14} color="var(--amber-primary)" />
              <span>Pending Approvals</span>
            </div>
            <div className="font-mono" style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: pendingApprovalsCount > 0 ? 'var(--amber-primary)' : 'var(--text-primary)'
            }}>
              {pendingApprovalsCount}
            </div>
          </div>

          {/* Global Verifications */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '4px' }}>
              <History size={14} color="var(--emerald-primary)" />
              <span>Global Audits</span>
            </div>
            <div className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {verifications.length}
            </div>
          </div>
        </div>

      </div>

      {actionSuccess && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid var(--border-emerald)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: 'var(--emerald-primary)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: '#fb7185',
          fontSize: '0.85rem'
        }}>
          {actionError}
        </div>
      )}

      {/* Tabs Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setActiveTab('issuers'); setSearchQuery(''); }}
            className="btn"
            style={{
              background: activeTab === 'issuers' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              color: activeTab === 'issuers' ? '#a78bfa' : 'var(--text-secondary)',
              border: activeTab === 'issuers' ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
              padding: '8px 16px',
              fontSize: '0.875rem'
            }}
          >
            <Building2 size={16} />
            <span>Issuers Directory ({issuers.length})</span>
            {pendingApprovalsCount > 0 && (
              <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                {pendingApprovalsCount} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
            className="btn"
            style={{
              background: activeTab === 'users' ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
              color: activeTab === 'users' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
              border: activeTab === 'users' ? '1px solid var(--border-accent)' : '1px solid transparent',
              padding: '8px 16px',
              fontSize: '0.875rem'
            }}
          >
            <Users size={16} />
            <span>Users Directory ({users.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('verifications'); setSearchQuery(''); }}
            className="btn"
            style={{
              background: activeTab === 'verifications' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              color: activeTab === 'verifications' ? 'var(--emerald-primary)' : 'var(--text-secondary)',
              border: activeTab === 'verifications' ? '1px solid var(--border-emerald)' : '1px solid transparent',
              padding: '8px 16px',
              fontSize: '0.875rem'
            }}
          >
            <History size={16} />
            <span>Global Audits ({verifications.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '260px' }}>
          <input
            type="text"
            placeholder="Search records..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '7px 12px 7px 30px', fontSize: '0.825rem' }}
          />
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
        </div>
      </div>

      {/* ==========================================
          TAB 1: ISSUERS DIRECTORY & APPROVALS
          ========================================== */}
      {activeTab === 'issuers' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Certifying Issuers Directory
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Review and approve issuer organizations to authorize Ed25519 signing keys and credential issuance
              </p>
            </div>
          </div>

          {filteredIssuers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>No issuer organizations found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Organization</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Domain</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>User UUID</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Registered</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssuers.map((iss) => (
                    <tr key={iss.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                        {iss.name}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ color: 'var(--cyan-primary)' }}>{iss.domain}</span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <code className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {iss.userId ? `${iss.userId.substring(0, 13)}...` : 'N/A'}
                        </code>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge ${iss.verified ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                          {iss.verified ? '✓ Verified' : '⏳ Awaiting Approval'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                        {new Date(iss.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        {iss.verified ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--emerald-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} />
                            <span>Approved</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApproveIssuer(iss.id, iss.name)}
                            disabled={approvingId === iss.id}
                            className="btn btn-emerald"
                            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                            title="Verify and approve issuer via POST /api/admin/issuers/:id/verify"
                          >
                            <UserCheck size={13} />
                            <span>{approvingId === iss.id ? 'Approving...' : 'Approve & Verify'}</span>
                          </button>
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

      {/* ==========================================
          TAB 2: PLATFORM USERS DIRECTORY
          ========================================== */}
      {activeTab === 'users' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Platform Users Directory
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Registered holders, issuers, verifiers, and administrators queried via <code>GET /api/admin/users</code>
              </p>
            </div>

            {/* Role filter pills */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
              {['ALL', 'HOLDER', 'ISSUER', 'ADMIN'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setUserRoleFilter(r)}
                  style={{
                    background: userRoleFilter === r ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: userRoleFilter === r ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>No users found matching filter criteria.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Full Name</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Email Address</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Role</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>User UUID</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500, textAlign: 'right' }}>Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                        {u.fullName}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {getRoleBadge(u.role)}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <code className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--cyan-primary)' }}>
                          {u.id}
                        </code>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: GLOBAL VERIFICATION AUDITS
          ========================================== */}
      {activeTab === 'verifications' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Platform-Wide Verification Audit Ledger
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Global verification checks across all public verifiers and users queried via <code>GET /api/admin/verifications</code>
              </p>
            </div>
          </div>

          {filteredVerifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>No verification ledger records logged yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Credential #</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Verifier</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Result</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Audit Notes</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500, textAlign: 'right' }}>Audit Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVerifications.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>
                          {v.credentialNumber || 'Anonymous Envelope'}
                        </code>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {v.verifierId ? (
                          <code className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {v.verifierId.substring(0, 13)}...
                          </code>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Public Guest</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {getVerificationBadge(v.result)}
                      </td>
                      <td style={{ padding: '12px 10px', color: v.reason ? '#fb7185' : 'var(--text-muted)' }}>
                        {v.reason || 'Cryptographic validity confirmed'}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {new Date(v.verifiedAt).toLocaleString()}
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
