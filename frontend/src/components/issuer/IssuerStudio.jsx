import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Key, 
  Award, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert,
  Send,
  Eye,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { issuerService } from '../../services/issuerService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { CredentialDetailModal } from './CredentialDetailModal';
import { RevokeModal } from './RevokeModal';

export function IssuerStudio() {
  const { accessToken, user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [issuerInfo, setIssuerInfo] = useState(null);
  const [signingKey, setSigningKey] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState(null);

  // Modals
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [revokingCredential, setRevokingCredential] = useState(null);

  // Forms
  const [registerName, setRegisterName] = useState('');
  const [registerDomain, setRegisterDomain] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState(null);

  const [creatingKey, setCreatingKey] = useState(false);
  const [keyError, setKeyError] = useState(null);

  // Issue Form
  const [subjectId, setSubjectId] = useState('');
  const [credType, setCredType] = useState('Degree');
  const [credTitle, setCredTitle] = useState('');
  const [claims, setClaims] = useState([{ key: 'program', value: 'CS' }, { key: 'gpa', value: '3.9' }]);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState(null);
  const [issueSuccess, setIssueSuccess] = useState(null);

  // Load Issuer & Credentials
  const loadIssuerData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch credentials
      const creds = await issuerService.listCredentials(accessToken);
      setCredentials(creds || []);

      // If credentials exist, extract issuer info and keyId from latest credential
      if (creds && creds.length > 0) {
        const latest = creds[0];
        if (latest.keyId) {
          setSigningKey({ keyId: latest.keyId, active: true });
        }
      }

      // Check if user has registered issuer profile by inspecting credentials or admin data
      // For a fresh issuer with 0 credentials, we try inferring from user session or previous registration
    } catch (err) {
      // If 403 or 404, might not be registered yet
      if (err.status !== 404) {
        setError(err.message || 'Failed to load issuer data');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadIssuerData();
  }, [loadIssuerData]);

  // Issuer Registration
  const handleRegisterIssuer = async (e) => {
    e.preventDefault();
    if (!registerName.trim() || !registerDomain.trim()) return;

    setRegistering(true);
    setRegisterError(null);

    try {
      const resp = await issuerService.registerIssuer({
        name: registerName.trim(),
        domain: registerDomain.trim().toLowerCase(),
      }, accessToken);
      setIssuerInfo(resp);
    } catch (err) {
      setRegisterError(err.message || 'Failed to register issuer authority.');
    } finally {
      setRegistering(false);
    }
  };

  // Create Signing Key
  const handleCreateKey = async () => {
    setCreatingKey(true);
    setKeyError(null);

    try {
      const keyResp = await issuerService.createSigningKey(accessToken);
      setSigningKey(keyResp);
    } catch (err) {
      setKeyError(err.message || 'Could not generate signing key. (Ensure issuer is verified by an Admin).');
    } finally {
      setCreatingKey(false);
    }
  };

  // Add / Remove Claims Rows
  const handleAddClaim = () => {
    setClaims([...claims, { key: '', value: '' }]);
  };

  const handleRemoveClaim = (index) => {
    setClaims(claims.filter((_, i) => i !== index));
  };

  const handleClaimChange = (index, field, value) => {
    const updated = [...claims];
    updated[index][field] = value;
    setClaims(updated);
  };

  // Issue Credential
  const handleIssueCredential = async (e) => {
    e.preventDefault();
    if (!subjectId.trim() || !credTitle.trim()) return;

    setIssuing(true);
    setIssueError(null);
    setIssueSuccess(null);

    // Format claims object
    const claimsObj = {};
    claims.forEach(({ key, value }) => {
      if (key.trim()) claimsObj[key.trim()] = value.trim();
    });

    try {
      const newCred = await issuerService.issueCredential({
        subjectId: subjectId.trim(),
        type: credType,
        title: credTitle.trim(),
        claims: claimsObj,
      }, accessToken);

      setIssueSuccess(`Successfully issued ${newCred.credentialNumber} and anchored on blockchain block ${newCred.blockNumber ?? '1'}!`);
      setCredTitle('');
      setSubjectId('');
      setClaims([{ key: '', value: '' }]);
      loadIssuerData();
    } catch (err) {
      setIssueError(err.message || 'Failed to issue credential.');
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoked = (credentialId) => {
    setCredentials(prev => prev.map(c => c.id === credentialId ? { ...c, status: 'REVOKED' } : c));
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* View Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid var(--border-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--purple-primary)',
            }}>
              <Award size={20} />
            </div>
            <div>
              <h1 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Issuer Studio
              </h1>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                Register authority, manage Ed25519 signing keys, and mint verifiable credentials.
              </p>
            </div>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={loadIssuerData} loading={loading} icon={RefreshCw}>
          Refresh Studio
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={loadIssuerData} />}

      {/* SECTION 1: Issuer Organization Status or Registration */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        {issuerInfo || credentials.length > 0 ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  Registered Issuer Authority
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 600 }}>
                    {issuerInfo?.name || 'Authorized Credential Issuer'}
                  </h3>
                  {issuerInfo?.domain && (
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      {issuerInfo.domain}
                    </span>
                  )}
                  <Badge
                    status={issuerInfo?.verified ?? true ? 'VERIFIED' : 'PENDING'}
                    text={issuerInfo?.verified ?? true ? 'Verified Issuer' : 'Awaiting Admin Approval'}
                    variant={issuerInfo?.verified ?? true ? 'emerald' : 'amber'}
                  />
                </div>
              </div>

              {/* Signing Key Controls */}
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  Ed25519 Signing Key
                </span>
                <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {signingKey?.keyId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-purple font-mono" style={{ fontSize: '11px' }}>
                        {signingKey.keyId.substring(0, 24)}...
                      </span>
                      <Badge status="ACTIVE" text="Key Ready" variant="emerald" />
                    </div>
                  ) : (
                    <Button
                      variant="purple"
                      size="sm"
                      icon={Key}
                      onClick={handleCreateKey}
                      loading={creatingKey}
                      disabled={issuerInfo && !issuerInfo.verified}
                    >
                      Generate Signing Key
                    </Button>
                  )}
                </div>
                {issuerInfo && !issuerInfo.verified && (
                  <p style={{ fontSize: '12px', color: 'var(--amber-primary)', marginTop: '4px' }}>
                    Awaiting admin approval to generate signing keys
                  </p>
                )}
                {keyError && (
                  <p style={{ fontSize: '12px', color: 'var(--rose-primary)', marginTop: '4px' }}>
                    {keyError}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Building2 size={20} color="var(--purple-primary)" />
              <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Register as an Issuer Organization
              </h3>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Before issuing credentials, register your organization name and authorized domain. An administrator will verify your profile.
            </p>

            {registerError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {registerError}
              </div>
            )}

            <form onSubmit={handleRegisterIssuer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="orgName">Organization Name</label>
                <input
                  id="orgName"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Stanford University or CertiChain Academy"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="orgDomain">Verified Domain</label>
                <input
                  id="orgDomain"
                  type="text"
                  className="input-field"
                  placeholder="e.g. stanford.edu"
                  value={registerDomain}
                  onChange={(e) => setRegisterDomain(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="purple"
                loading={registering}
                disabled={!registerName.trim() || !registerDomain.trim()}
                style={{ height: '42px' }}
              >
                Register Organization
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* SECTION 2: Issue Verifiable Credential Form */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Award size={20} color="var(--purple-primary)" />
          <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
            Issue Verifiable Credential
          </h3>
          <span className="badge badge-purple" style={{ fontSize: '11px' }}>
            Ed25519 Signed & Anchored
          </span>
        </div>

        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Mint a cryptographically signed credential envelope stored on IPFS and anchored on Ethereum Anvil.
        </p>

        {issueError && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {issueError}
          </div>
        )}

        {issueSuccess && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {issueSuccess}
          </div>
        )}

        <form onSubmit={handleIssueCredential}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="subjectId">
                Recipient Subject ID (User UUID)
              </label>
              <input
                id="subjectId"
                type="text"
                className="input-field font-mono"
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
              />
              <span className="form-helper">
                Raw user UUID of the recipient holder account.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="credType">Credential Type</label>
              <select
                id="credType"
                className="select-field"
                value={credType}
                onChange={(e) => setCredType(e.target.value)}
              >
                <option value="Degree">Degree</option>
                <option value="Certificate">Certificate</option>
                <option value="Professional License">Professional License</option>
                <option value="Achievement Badge">Achievement Badge</option>
                <option value="Identity Document">Identity Document</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
              <label className="form-label" htmlFor="credTitle">Credential Title</label>
              <input
                id="credTitle"
                type="text"
                className="input-field"
                placeholder="e.g. B.Sc. in Computer Science & Cryptography"
                value={credTitle}
                onChange={(e) => setCredTitle(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Dynamic Claims Section */}
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Custom Claims (Key / Value Attributes)
              </label>
              <Button variant="secondary" size="sm" icon={Plus} onClick={handleAddClaim}>
                Add Claim Row
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {claims.map((claim, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Attribute Key (e.g. major, gpa, honors)"
                    value={claim.key}
                    onChange={(e) => handleClaimChange(index, 'key', e.target.value)}
                    style={{ flex: '1 1 180px' }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Attribute Value (e.g. Computer Science, 3.9)"
                    value={claim.value}
                    onChange={(e) => handleClaimChange(index, 'value', e.target.value)}
                    style={{ flex: '2 1 240px' }}
                  />
                  {claims.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveClaim(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--rose-primary)',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Remove claim row"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <Button
              type="submit"
              variant="purple"
              loading={issuing}
              icon={Send}
              disabled={!subjectId.trim() || !credTitle.trim()}
            >
              Issue Credential & Anchor On-Chain
            </Button>
          </div>
        </form>
      </div>

      {/* SECTION 3: Issued Credentials Directory */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Issued Credentials
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Registry of credentials minted by your issuer organization.
            </p>
          </div>
          <span className="badge badge-purple">
            {credentials.length} Issued
          </span>
        </div>

        {credentials.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No credentials issued yet"
            description="Use the form above to mint and anchor your first verifiable credential."
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Credential #</th>
                  <th>Type & Title</th>
                  <th>On-Chain Anchor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred) => (
                  <tr key={cred.id}>
                    <td>
                      <code className="font-mono" style={{ color: 'var(--cyan-primary)', fontSize: '13px', fontWeight: 600 }}>
                        {cred.credentialNumber}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{cred.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cred.type}</div>
                    </td>
                    <td>
                      {cred.txHash ? (
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Block {cred.blockNumber ?? '1'} · Chain {cred.chainId ?? '31337'}
                          </div>
                          <code className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {cred.txHash.substring(0, 14)}...{cred.txHash.substring(cred.txHash.length - 8)}
                          </code>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unanchored</span>
                      )}
                    </td>
                    <td>
                      <Badge status={cred.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => setSelectedCredential(cred)}
                        >
                          View Details
                        </Button>
                        {cred.status === 'ACTIVE' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setRevokingCredential(cred)}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedCredential && (
        <CredentialDetailModal
          credential={selectedCredential}
          onClose={() => setSelectedCredential(null)}
          onOpenRevoke={(cred) => setRevokingCredential(cred)}
        />
      )}

      {revokingCredential && (
        <RevokeModal
          credential={revokingCredential}
          onClose={() => setRevokingCredential(null)}
          onRevoked={handleRevoked}
          token={accessToken}
          issuerService={issuerService}
        />
      )}
    </div>
  );
}
