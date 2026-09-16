import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Key, 
  Award, 
  ListOrdered, 
  FileCheck, 
  PlusCircle, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  AlertOctagon,
  Sparkles,
  Search,
  HardDrive
} from 'lucide-react';
import { issuerService } from '../../services/issuerService';
import { useAuth } from '../../context/AuthContext';
import { RevokeModal } from './RevokeModal';
import { CredentialDetailModal } from './CredentialDetailModal';

export function IssuerStudio() {
  const { user, accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [issuerProfile, setIssuerProfile] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [signingKey, setSigningKey] = useState(null);

  // Registration Form state
  const [orgName, setOrgName] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Studio tabs
  const [activeTab, setActiveTab] = useState('list'); // 'issue' | 'list' | 'audit'
  const [credentials, setCredentials] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [detailModalCred, setDetailModalCred] = useState(null);
  const [revokeModalCred, setRevokeModalCred] = useState(null);

  // Issue Credential Form state
  const [subjectId, setSubjectId] = useState('');
  const [credType, setCredType] = useState('Degree');
  const [credTitle, setCredTitle] = useState('');
  const [claimsList, setClaimsList] = useState([
    { key: 'major', value: 'Computer Science' },
    { key: 'grade', value: 'Summa Cum Laude' },
    { key: 'graduationYear', value: '2026' }
  ]);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [lastIssued, setLastIssued] = useState(null);

  // Fetch Issuer Status & Data
  const loadIssuerData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);

    try {
      // Check if credentials can be listed (means registered & verified/unverified)
      const creds = await issuerService.listCredentials(accessToken);
      setIsRegistered(true);
      setIsVerified(true); // If listCredentials works without 403 SecurityException, issuer is verified
      setCredentials(creds);

      try {
        const verifs = await issuerService.listVerifications(accessToken);
        setVerifications(verifs);
      } catch (e) {
        console.warn('Verifications list error', e);
      }
    } catch (err) {
      if (err.status === 403 && err.message?.includes('not verified')) {
        // Registered but awaiting admin verification!
        setIsRegistered(true);
        setIsVerified(false);
      } else if (err.status === 400 && (err.message?.includes('not registered') || err.message?.includes('User not found'))) {
        // Not registered as issuer yet
        setIsRegistered(false);
        setIsVerified(false);
      } else {
        // Check for other errors
        console.warn('Issuer load data error', err);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadIssuerData();
  }, [loadIssuerData]);

  // Handle Organization Registration
  const handleRegisterIssuer = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setRegisterError('');

    try {
      const response = await issuerService.registerIssuer({
        name: orgName,
        domain: orgDomain
      }, accessToken);

      setIssuerProfile(response);
      setIsRegistered(true);
      setIsVerified(response.verified || false);
    } catch (err) {
      setRegisterError(err.message || 'Failed to register issuer profile.');
    } finally {
      setRegistering(false);
    }
  };

  // Handle Create Signing Key
  const handleCreateKey = async () => {
    try {
      const keyResp = await issuerService.createSigningKey(accessToken);
      setSigningKey(keyResp);
      alert('Ed25519 Signing Key generated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create signing key. Ensure issuer is verified by Admin.');
    }
  };

  // Add/Remove Claims in Issue Form
  const addClaimRow = () => {
    setClaimsList([...claimsList, { key: '', value: '' }]);
  };

  const updateClaim = (index, field, value) => {
    const updated = [...claimsList];
    updated[index][field] = value;
    setClaimsList(updated);
  };

  const removeClaim = (index) => {
    setClaimsList(claimsList.filter((_, i) => i !== index));
  };

  const fillDemoIssue = () => {
    setSubjectId(user?.id || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    setCredType('Certification');
    setCredTitle('Certified Cryptographic Systems Engineer');
    setClaimsList([
      { key: 'credentialId', value: 'CC-2026-ENG-089' },
      { key: 'specialization', value: 'Ed25519 & Zero Knowledge' },
      { key: 'score', value: '98%' },
      { key: 'validity', value: 'Lifetime' }
    ]);
  };

  // Handle Issue Credential
  const handleIssueCredential = async (e) => {
    e.preventDefault();
    setIssuing(true);
    setIssueError('');
    setLastIssued(null);

    // Convert claims array to JSON object
    const claimsObj = {};
    claimsList.forEach(({ key, value }) => {
      if (key.trim()) {
        claimsObj[key.trim()] = value.trim();
      }
    });

    try {
      const response = await issuerService.issueCredential({
        subjectId,
        type: credType,
        title: credTitle,
        claims: claimsObj
      }, accessToken);

      setLastIssued(response);
      setCredentials([response, ...credentials]);
      // Reset form
      setCredTitle('');
    } catch (err) {
      setIssueError(err.message || 'Failed to issue credential.');
    } finally {
      setIssuing(false);
    }
  };

  const handleRevokeSuccess = (revokedId) => {
    setCredentials(credentials.map(c => 
      c.id === revokedId ? { ...c, status: 'REVOKED' } : c
    ));
    setVerifications(verifications.map(v => 
      v.credentialNumber === revokedId ? { ...v, status: 'REVOKED' } : v
    ));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--cyan-primary)' }} />
        <p>Loading Issuer Workspace...</p>
      </div>
    );
  }

  // ==========================================
  // STATE 1: NOT REGISTERED AS ISSUER YET
  // ==========================================
  if (!isRegistered) {
    return (
      <div className="glass-panel glass-panel-glow animate-fade-in" style={{
        maxWidth: '540px',
        margin: '0 auto',
        padding: '36px 30px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a78bfa'
          }}>
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              Issuer Organization Onboarding
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Register your certifying body or institution
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
          Your account has the <strong style={{ color: '#a78bfa' }}>ISSUER</strong> role. To begin issuing cryptographic credentials, register your organization name and authorized web domain below.
        </p>

        {registerError && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '18px',
            color: '#fb7185',
            fontSize: '0.85rem'
          }}>
            {registerError}
          </div>
        )}

        <form onSubmit={handleRegisterIssuer}>
          <div className="form-group">
            <label className="form-label" htmlFor="orgName">Organization Name</label>
            <input
              id="orgName"
              type="text"
              className="input-field"
              placeholder="e.g. Stanford University or CertiChain Labs"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="orgDomain">Authorized Domain</label>
            <input
              id="orgDomain"
              type="text"
              className="input-field"
              placeholder="e.g. stanford.edu or certichain.org"
              value={orgDomain}
              onChange={(e) => setOrgDomain(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={registering}
            style={{ width: '100%', marginTop: '12px' }}
          >
            {registering ? 'Registering Issuer...' : 'Register Issuer Profile (POST /api/issuer/register)'}
          </button>
        </form>
      </div>
    );
  }

  // ==========================================
  // STATE 2: REGISTERED BUT VERIFICATION PENDING
  // ==========================================
  if (!isVerified) {
    return (
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '36px 30px',
        border: '1px solid rgba(245, 158, 11, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--amber-primary)'
          }}>
            <Clock size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 700 }}>
                Verification Pending
              </h2>
              <span className="badge badge-amber">Awaiting Admin Approval</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Issuer Profile Registered: <strong style={{ color: 'var(--text-primary)' }}>{issuerProfile?.name || 'Your Organization'}</strong> ({issuerProfile?.domain || 'domain.com'})
            </p>
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          <p style={{ marginBottom: '10px' }}>
            🔒 <strong>Self-Sovereign Trust Model:</strong> In accordance with CertiChain's security rules, an issuer profile must be verified (<code>verified = true</code> in the database) by a network administrator before signing keys can be created and credentials can be minted.
          </p>
          <p>
            Once you or an administrator verifies your organization via the database or upcoming Admin Controller, your Ed25519 signing key and Credential Studio will automatically unlock.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Endpoints protected: <code>/api/issuer/keys</code>, <code>/api/issuer/credentials</code>
          </span>
          <button
            onClick={loadIssuerData}
            className="btn btn-outline"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} />
            <span>Re-check Verification Status</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // STATE 3: VERIFIED ISSUER STUDIO WORKSPACE
  // ==========================================
  const filteredCredentials = credentials.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.credentialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Issuer Header Banner */}
      <div className="glass-panel glass-panel-glow" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(0, 229, 255, 0.25))',
              border: '1px solid var(--border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a78bfa'
            }}>
              <Award size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  Issuer Credential Studio
                </h1>
                <span className="badge badge-emerald">
                  <ShieldCheck size={12} />
                  Verified Issuer
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Authenticated as: <strong style={{ color: 'var(--text-primary)' }}>{user?.fullName}</strong> ({user?.email})
              </p>
            </div>
          </div>

          {/* Quick Key Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleCreateKey}
              className="btn btn-outline"
              style={{ fontSize: '0.825rem', padding: '8px 14px' }}
              title="Generates active Ed25519 signing key via POST /api/issuer/keys"
            >
              <Key size={14} color="var(--cyan-primary)" />
              <span>Generate Signing Key</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => setActiveTab('list')}
          className="btn"
          style={{
            background: activeTab === 'list' ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
            color: activeTab === 'list' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
            border: activeTab === 'list' ? '1px solid var(--border-accent)' : '1px solid transparent',
            padding: '8px 16px',
            fontSize: '0.875rem'
          }}
        >
          <ListOrdered size={16} />
          <span>Issued Credentials ({credentials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('issue')}
          className="btn"
          style={{
            background: activeTab === 'issue' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
            color: activeTab === 'issue' ? 'var(--emerald-primary)' : 'var(--text-secondary)',
            border: activeTab === 'issue' ? '1px solid var(--border-emerald)' : '1px solid transparent',
            padding: '8px 16px',
            fontSize: '0.875rem'
          }}
        >
          <PlusCircle size={16} />
          <span>Issue New Credential</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className="btn"
          style={{
            background: activeTab === 'audit' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeTab === 'audit' ? '#a78bfa' : 'var(--text-secondary)',
            border: activeTab === 'audit' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
            padding: '8px 16px',
            fontSize: '0.875rem'
          }}
        >
          <FileCheck size={16} />
          <span>Verifications Audit Trail</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: ISSUE CREDENTIAL FORM
          ========================================== */}
      {activeTab === 'issue' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 600 }}>
                Mint Verifiable Credential
              </h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Signs payload with Ed25519, pins canonical envelope to IPFS, and publishes on ledger
              </p>
            </div>

            <button
              type="button"
              onClick={fillDemoIssue}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <Sparkles size={14} color="var(--cyan-primary)" />
              <span>Fill Demo Details</span>
            </button>
          </div>

          {issueError && (
            <div style={{
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '18px',
              color: '#fb7185',
              fontSize: '0.85rem'
            }}>
              {issueError}
            </div>
          )}

          {lastIssued && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid var(--border-emerald)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-primary)', fontWeight: 600, marginBottom: '6px' }}>
                <ShieldCheck size={18} />
                <span>Credential Issued Successfully!</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Credential Number: <strong className="font-mono" style={{ color: 'var(--cyan-primary)' }}>{lastIssued.credentialNumber}</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                IPFS CID: <code className="font-mono" style={{ color: '#6ee7b7' }}>{lastIssued.ipfsCid}</code>
              </div>
            </div>
          )}

          <form onSubmit={handleIssueCredential}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="subjectId">Recipient Subject User ID (UUID)</label>
                <input
                  id="subjectId"
                  type="text"
                  className="input-field font-mono"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="credType">Credential Type</label>
                <select
                  id="credType"
                  className="input-field"
                  value={credType}
                  onChange={(e) => setCredType(e.target.value)}
                >
                  <option value="Degree">Degree</option>
                  <option value="Certification">Certification</option>
                  <option value="CourseCompletion">Course Completion</option>
                  <option value="EmploymentBadge">Employment Badge</option>
                  <option value="SkillVerification">Skill Verification</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="credTitle">Credential Title</label>
              <input
                id="credTitle"
                type="text"
                className="input-field"
                placeholder="e.g. Master of Science in Computer Science"
                value={credTitle}
                onChange={(e) => setCredTitle(e.target.value)}
                required
              />
            </div>

            {/* Dynamic Claims Builder */}
            <div style={{ marginTop: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="form-label">Verifiable Metadata Claims (JSON attributes)</span>
                <button
                  type="button"
                  onClick={addClaimRow}
                  className="btn btn-outline"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  + Add Claim Field
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {claimsList.map((claim, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Attribute Name (e.g. gpa)"
                      className="input-field"
                      style={{ flex: '1', padding: '8px 12px', fontSize: '0.85rem' }}
                      value={claim.key}
                      onChange={(e) => updateClaim(idx, 'key', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 3.9)"
                      className="input-field"
                      style={{ flex: '1.5', padding: '8px 12px', fontSize: '0.85rem' }}
                      value={claim.value}
                      onChange={(e) => updateClaim(idx, 'value', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeClaim(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--rose-primary)',
                        cursor: 'pointer',
                        padding: '6px',
                        fontSize: '1rem'
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-emerald"
              disabled={issuing}
              style={{ width: '100%', height: '46px', fontSize: '0.95rem' }}
            >
              {issuing ? 'Canonicalizing, Signing & Pinning to IPFS...' : 'Mint & Issue Verifiable Credential (POST /api/issuer/credentials)'}
            </button>
          </form>
        </div>
      )}

      {/* ==========================================
          TAB 2: ISSUED CREDENTIALS REGISTRY
          ========================================== */}
      {activeTab === 'list' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Issued Credentials Directory
              </h2>
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                {credentials.length} Total
              </span>
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <input
                type="text"
                placeholder="Search by title or #..."
                className="input-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '8px 12px 8px 32px', fontSize: '0.825rem' }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            </div>
          </div>

          {filteredCredentials.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 20px',
              color: 'var(--text-muted)',
              fontSize: '0.9rem'
            }}>
              <Award size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>No credentials match your query or none have been issued yet.</p>
              <button
                onClick={() => setActiveTab('issue')}
                className="btn btn-outline"
                style={{ marginTop: '12px', fontSize: '0.8rem' }}
              >
                Issue First Credential
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Credential #</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Title</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Type</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>IPFS CID</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500 }}>Issued</th>
                    <th style={{ padding: '12px 10px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCredentials.map((cred) => (
                    <tr
                      key={cred.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '12px 10px' }}>
                        <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>
                          {cred.credentialNumber}
                        </code>
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                        {cred.title}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                          {cred.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <code className="font-mono" style={{ fontSize: '0.75rem', color: '#6ee7b7' }} title={cred.ipfsCid}>
                          {cred.ipfsCid ? `${cred.ipfsCid.substring(0, 10)}...` : 'N/A'}
                        </code>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge ${cred.status === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                          {cred.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                        {new Date(cred.issuedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => setDetailModalCred(cred)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Inspect details (GET /api/issuer/credentials/{id})"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>

                          {cred.status === 'ACTIVE' && (
                            <button
                              onClick={() => setRevokeModalCred(cred)}
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              title="Revoke (POST /api/issuer/credentials/{id}/revoke)"
                            >
                              <AlertOctagon size={13} />
                              <span>Revoke</span>
                            </button>
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
      )}

      {/* ==========================================
          TAB 3: VERIFICATIONS & STATUS AUDIT TRAIL
          ========================================== */}
      {activeTab === 'audit' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Verification & Status Audit Records
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Audited ledger events queried via <code>GET /api/issuer/verifications</code>
              </p>
            </div>
            <button
              onClick={loadIssuerData}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <RefreshCw size={13} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {verifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>No verification or revocation records recorded yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Credential #</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px' }}>Revocation Reason</th>
                    <th style={{ padding: '10px' }}>Revoked At</th>
                    <th style={{ padding: '10px' }}>Issued At</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '10px' }}>
                        <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>{v.credentialNumber}</code>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span className={`badge ${v.status === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                          {v.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: v.reason ? '#fb7185' : 'var(--text-muted)' }}>
                        {v.reason || 'None'}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                        {v.revokedAt ? new Date(v.revokedAt).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                        {new Date(v.issuedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {detailModalCred && (
        <CredentialDetailModal
          credential={detailModalCred}
          onClose={() => setDetailModalCred(null)}
        />
      )}

      {revokeModalCred && (
        <RevokeModal
          credential={revokeModalCred}
          onClose={() => setRevokeModalCred(null)}
          onRevoked={handleRevokeSuccess}
          token={accessToken}
          issuerService={issuerService}
        />
      )}

    </div>
  );
}
