import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Building2, 
  Award, 
  RefreshCw, 
  Eye, 
  Search, 
  Check, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { issuerService } from '../../services/issuerService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { RevokeModal } from './RevokeModal';
import { CertificateDiplomaModal } from '../common/CertificateDiplomaModal';

const DEMO_ISSUER_PROFILE = {
  id: 'mit-registrar-authority',
  name: 'Massachusetts Institute of Technology',
  domain: 'mit.edu',
  status: 'ACTIVE',
  approved: true,
  createdAt: '2024-01-15T09:00:00Z',
};

const DEMO_ISSUER_KEY = {
  keyId: 'ed25519-2026-mit-root',
  algorithm: 'Ed25519',
  publicKey: 'MCowBQYDK2VwAyEA9g3sN6zP8Kq0W5j1Vx2L4n6p7R9sA1B2C3D4E5F6G7H=',
  active: true,
};

const DEMO_ISSUER_CREDS = [
  {
    id: 'cred-1',
    credentialId: '8d380b1b-4f51-4f11-9a7c-1793740283c7',
    credentialNumber: 'MIT-BSC-2026-CS8941',
    title: 'Bachelor of Science in Computer Science',
    recipientName: 'Alex Mercer',
    recipientEmail: 'alex.mercer@alumni.org',
    subjectId: 'usr-alex-mercer',
    type: 'Degree',
    status: 'ACTIVE',
    issuedAt: '2026-06-02T10:00:00Z',
    txHash: '0x4f8a9b2c1d3e5f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
    blockNumber: 18492103,
    keyId: 'ed25519-2026-mit-root',
    claims: {
      degree: 'Bachelor of Science',
      major: 'Computer Science & Engineering',
      department: 'EECS',
      gpa: '3.94 / 4.00',
      honors: 'Summa Cum Laude',
    },
  },
  {
    id: 'cred-2',
    credentialId: '9e491c2c-5a62-4b22-8b8d-2804851394d8',
    credentialNumber: 'MIT-MENG-2026-AI4021',
    title: 'Master of Engineering in Artificial Intelligence',
    recipientName: 'Elena Rostova',
    recipientEmail: 'e.rostova@mit.edu',
    subjectId: 'usr-elena-rostova',
    type: 'Degree',
    status: 'ACTIVE',
    issuedAt: '2026-08-10T14:30:00Z',
    txHash: '0x7b1c3d5e9f0a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c',
    blockNumber: 18581290,
    keyId: 'ed25519-2026-mit-root',
    claims: {
      degree: 'Master of Engineering',
      major: 'Artificial Intelligence',
      department: 'CSAIL',
      gpa: '4.00 / 4.00',
    },
  },
  {
    id: 'cred-3',
    credentialId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    credentialNumber: 'MIT-CERT-2025-QC109',
    title: 'Executive Certificate in Quantum Computing Algorithms',
    recipientName: 'David K. Vance',
    recipientEmail: 'dvance@alum.mit.edu',
    subjectId: 'usr-david-vance',
    type: 'Certificate',
    status: 'REVOKED',
    issuedAt: '2025-11-20T11:15:00Z',
    revokedAt: '2026-01-14T09:40:00Z',
    revocationReason: 'Superseded by accredited postgraduate diploma issuance',
    txHash: '0x3c5e7a9b1d3f5a7b9c1d3e5f7a9b1c3d5e7a9b1d3f5a7b9c1d3e5f7a9b1c3d5e',
    blockNumber: 18104520,
    keyId: 'ed25519-2026-mit-root',
    claims: {
      program: 'Quantum Algorithms and Error Mitigation',
      department: 'Physics',
    },
  },
];

function createSimulatedCredential({ credType, credTitle, recipientName, recipientEmail, resolvedHolder, signingKey, claims }) {
  const timestamp = Date.now();
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const randomHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return {
    id: 'cred-' + timestamp,
    credentialId: 'urn:uuid:' + crypto.randomUUID(),
    credentialNumber: `MIT-${credType.toUpperCase()}-2026-${randNum}`,
    title: credTitle.trim(),
    recipientName: recipientName.trim() || resolvedHolder?.fullName || 'Alex Mercer',
    recipientEmail: recipientEmail.trim() || resolvedHolder?.email || 'alex.mercer@alumni.org',
    subjectId: resolvedHolder?.id || 'usr-alex-mercer',
    type: credType.trim(),
    status: 'ACTIVE',
    issuedAt: new Date().toISOString(),
    txHash: '0x' + randomHex,
    blockNumber: 18630120,
    keyId: signingKey?.keyId || 'ed25519-2026-mit-root',
    claims,
  };
}

export function IssuerStudio() {
  const { accessToken, user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [issuerInfo, setIssuerInfo] = useState(null);
  const [signingKey, setSigningKey] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState(null);

  // Active Main Tab: 'wizard' | 'directory'
  const [activeTab, setActiveTab] = useState('wizard');

  // Modals
  const [previewingCredential, setPreviewingCredential] = useState(null);
  const [revokingCredential, setRevokingCredential] = useState(null);

  // Organization Registration Form
  const [registerName, setRegisterName] = useState('');
  const [registerDomain, setRegisterDomain] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState(null);

  // Digital Seal / Key State
  const [activatingSeal, setActivatingSeal] = useState(false);
  const [sealError, setSealError] = useState(null);

  // Issuance Wizard State (Steps 1 to 4)
  const [wizardStep, setWizardStep] = useState(1);
  
  // Step 1: Recipient
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [resolvedHolder, setResolvedHolder] = useState(null);
  const [lookingUpHolder, setLookingUpHolder] = useState(false);
  const [recipientError, setRecipientError] = useState(null);
  
  // Step 2: Credential Details
  const [credType, setCredType] = useState('Degree');
  const [credTitle, setCredTitle] = useState('');
  
  // Step 3: Claims
  //
  // A ref, not state: the id is read and written synchronously inside
  // the click handler, so a render-snapshot would hand out the same
  // value twice under rapid clicking and React's key would collapse
  // the two rows into one. A ref is not snapshotted, and never moves
  // backwards when a row is removed.
  const nextRowId = useRef(2);
  const [claimRows, setClaimRows] = useState([
    { id: 1, key: '', value: '' },
  ]);

  const CLAIM_CAP = 50;

  const PRESETS = [
    { key: 'major', value: '' },
    { key: 'gpa', value: '' },
    { key: 'honors', value: '' },
    { key: 'department', value: '' },
  ];

  // Derived on every render, so a problem surfaces as it is typed.
  //
  // keyedRows is every row with a name; signedRows is the subset that
  // also has a value, and is the only list assembleClaims reads. A row
  // with no name is not a claim, and a row with a name but no value is
  // a claim with nothing to say - signing either one in writes a blank
  // entry onto a credential that cannot be corrected afterwards.
  const seededName = recipientName.trim();
  const keyedRows = claimRows.filter((r) => r.key.trim());
  const signedRows = claimRows.filter((r) => r.key.trim() && r.value.trim());

  // What the backend will actually count, and therefore what the UI
  // has to measure itself against. The recipient name is seeded into
  // the same map and the ledger caps that map at 50, so it consumes a
  // slot the issuer cannot see: 50 rows plus a name is 51, and the
  // request comes back 400 with the counter reading a cheerful 50/50.
  const claimCount = signedRows.length + (seededName ? 1 : 0);
  const overCap = claimCount > CLAIM_CAP;

  // Set.add() returns the Set, so !seen.add(k) is a falsy side effect
  // that records the first sighting; the has() is the real test. The
  // seed goes in first so a row claiming recipientName collides with
  // it: otherwise assembleClaims would overwrite that row silently,
  // which is the loss this whole block exists to prevent.
  const seenKeys = new Set();
  if (seededName) seenKeys.add('recipientName');
  const duplicateKey = keyedRows.find(
    (r) => seenKeys.has(r.key.trim()) || !seenKeys.add(r.key.trim())
  )?.key.trim();
  const clashesWithSeed = Boolean(seededName && duplicateKey === 'recipientName');
  const conflictingRowIds = new Set(
    duplicateKey
      ? claimRows.filter((r) => r.key.trim() === duplicateKey).map((r) => r.id)
      : []
  );

  // One reason string, rendered on step 3 and again on step 4, so the
  // Sign button and the alert can never disagree about why it is stuck.
  const claimBlockReason = overCap
    ? `This certificate would carry ${claimCount} claims, and the ledger accepts ${CLAIM_CAP}. Remove one before signing.`
    : duplicateKey
      ? (clashesWithSeed
          ? `“recipientName” is the recipient’s name on the certificate. Rename this claim, or clear the recipient name.`
          : `“${duplicateKey}” is used by more than one claim. Rename one of them, or remove it.`)
      : '';

  const issuanceBlocked =
    !resolvedHolder?.id || !credTitle.trim() || Boolean(claimBlockReason);

  // Issuance Execution State
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState(null);
  const [issuedResult, setIssuedResult] = useState(null);

  // Directory Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load Issuer & Credentials
  const loadIssuerData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const [profile, creds] = await Promise.all([
        issuerService.getIssuerProfile(accessToken).catch((err) => {
          if (err.status === 404) return null; // not registered yet
          throw err;
        }),
        issuerService.listCredentials(accessToken),
      ]);
      if (profile) {
        setIssuerInfo(profile);
      } else if (accessToken.startsWith('demo')) {
        setIssuerInfo(DEMO_ISSUER_PROFILE);
      }

      if (creds && creds.length > 0) {
        setCredentials(creds);
        const latest = creds[0];
        if (latest.keyId) {
          setSigningKey({ keyId: latest.keyId, active: true });
        }
      } else if (accessToken.startsWith('demo')) {
        setCredentials(DEMO_ISSUER_CREDS);
        setSigningKey(DEMO_ISSUER_KEY);
      } else {
        setCredentials([]);
      }
    } catch (err) {
      if (accessToken.startsWith('demo')) {
        setIssuerInfo(DEMO_ISSUER_PROFILE);
        setCredentials(DEMO_ISSUER_CREDS);
        setSigningKey(DEMO_ISSUER_KEY);
      } else if (err.status !== 404) {
        setError(err.message || 'Failed to load issuer records.');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadIssuerData();
  }, [loadIssuerData]);

  /**
   * Resolve the recipient email to a real holder. The resolved id is
   * what gets issued to, so a typo or an unregistered address fails
   * here rather than minting a certificate nobody can ever open.
   */
  const handleResolveHolder = async () => {
    if (!recipientEmail.trim()) return;

    setLookingUpHolder(true);
    setRecipientError(null);
    setResolvedHolder(null);

    if (accessToken?.startsWith('demo')) {
      setTimeout(() => {
        setResolvedHolder({
          id: 'usr-alex-mercer',
          fullName: recipientName.trim() || 'Alex Mercer',
          email: recipientEmail.trim(),
        });
        if (!recipientName.trim()) {
          setRecipientName('Alex Mercer');
        }
        setLookingUpHolder(false);
      }, 150);
      return;
    }

    try {
      const holder = await issuerService.findHolderByEmail(
        recipientEmail.trim(),
        accessToken
      );
      setResolvedHolder(holder);
      if (!recipientName.trim() && holder?.fullName) {
        setRecipientName(holder.fullName);
      }
    } catch (err) {
      setRecipientError(
        err.status === 404
          ? 'No holder is registered with that email. Ask them to register first.'
          : err.message || 'Could not look up that holder.'
      );
    } finally {
      setLookingUpHolder(false);
    }
  };

  // Register Organization Authority
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
      setRegisterError(err.message || 'Failed to register institution. Please check domain format.');
    } finally {
      setRegistering(false);
    }
  };

  // Activate Digital Seal (Generates Key)
  const handleActivateSeal = async () => {
    setActivatingSeal(true);
    setSealError(null);

    try {
      const keyResp = await issuerService.createSigningKey(accessToken);
      setSigningKey(keyResp);
    } catch (err) {
      setSealError(err.message || 'Could not activate digital seal. (Ensure institution is approved by an administrator).');
    } finally {
      setActivatingSeal(false);
    }
  };

  // Build Payload Claims Object
  //
  // Iterates signedRows, not claimRows, so a named row with a blank
  // value is left out rather than signed in as "gpa": "" - the same
  // per-field guard the fixed inputs had. recipientName is seeded
  // separately and last, so it wins any collision the check above
  // would have blocked anyway.
  const assembleClaims = () => {
    const obj = {};
    for (const row of signedRows) {
      obj[row.key.trim()] = row.value.trim();
    }
    if (seededName) obj.recipientName = seededName;
    return obj;
  };

  const addRow = (preset) => {
    const id = nextRowId.current++;
    setClaimRows((prev) => [
      ...prev,
      { id, key: preset ? preset.key : '', value: '' },
    ]);
  };

  const updateRow = (id, field, value) => {
    setClaimRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeRow = (id) => {
    setClaimRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Issue Credential Submission
  const handleIssueCredential = async () => {
    if (issuanceBlocked) return;

    setIssuing(true);
    setIssueError(null);
    setIssuedResult(null);

    const payload = {
      subjectId: resolvedHolder.id,
      type: credType.trim(),
      title: credTitle.trim(),
      claims: assembleClaims(),
    };

    try {
      const newCred = await issuerService.issueCredential(payload, accessToken);
      setIssuedResult(newCred);
      setCredentials(prev => [newCred, ...prev]);
      // If no key was marked active, mark it now
      if (!signingKey) {
        setSigningKey({ keyId: newCred.keyId, active: true });
      }
    } catch (err) {
      if (accessToken?.startsWith('demo')) {
        const simulatedCred = createSimulatedCredential({
          credType,
          credTitle,
          recipientName,
          recipientEmail,
          resolvedHolder,
          signingKey,
          claims: assembleClaims(),
        });
        setIssuedResult(simulatedCred);
        setCredentials(prev => [simulatedCred, ...prev]);
        if (!signingKey) {
          setSigningKey(DEMO_ISSUER_KEY);
        }
      } else {
        setIssueError(err.message || 'Could not issue credential. Please check that the recipient holder exists and the digital seal is active.');
      }
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoked = (id) => {
    setCredentials(prev => prev.map(c => c.id === id ? { ...c, status: 'REVOKED' } : c));
  };

  const filteredCredentials = credentials.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.credentialNumber && c.credentialNumber.toLowerCase().includes(q)) ||
      (c.subjectId && c.subjectId.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner: Institution Header */}
      <div className="card card--flush" style={{ padding: '24px 28px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="icon-tile" aria-hidden="true">
              <Building2 size={22} />
            </span>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h1 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                  {issuerInfo?.name || user?.fullName || 'Issuer Studio'}
                </h1>
                {issuerInfo?.domain && (
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-secondary)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--line)' }}>
                    {issuerInfo.domain}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)', margin: 0 }}>
                Issue, manage, and anchor verifiable academic degrees, badges, and certificates on the blockchain ledger.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Digital Seal Status Indicator */}
            <Badge
              status={signingKey?.keyId ? 'VERIFIED' : 'PENDING'}
              text={signingKey?.keyId ? 'Seal active' : 'Seal inactive'}
              icon={ShieldCheck}
            />

            <Button variant="secondary" size="sm" onClick={loadIssuerData} loading={loading} icon={RefreshCw}>
              Refresh
            </Button>
          </div>
        </div>

        {/* If seal not activated, show quick activation bar */}
        {!signingKey?.keyId && (
          <div
            className="alert alert--warn"
            role="alert"
            style={{
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} className="alert__icon" aria-hidden="true" />
              <div className="alert__body">
                <strong className="alert__title">Signing seal required</strong>
                <p className="alert__message" style={{ margin: 0 }}>
                  Your institution needs an active digital seal before certificates can be signed.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleActivateSeal}
              loading={activatingSeal}
            >
              Activate Digital Signing Seal
            </Button>
          </div>
        )}
        {sealError && <p style={{ color: 'var(--bad)', fontSize: '12.5px', marginTop: '8px' }}>{sealError}</p>}
      </div>

      {error && <ErrorState message={error} onRetry={loadIssuerData} />}

      {!issuerInfo && credentials.length === 0 && (
        <div className="card card--flush" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '6px' }}>
            Register Your Educational Institution
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)', marginBottom: '16px' }}>
            Register your institution's official name and verified domain to activate your credential issuing profile.
          </p>
          {registerError && (
            <div className="alert alert--bad" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
              <AlertTriangle size={18} className="alert__icon" aria-hidden="true" />
              <div className="alert__body">
                <p className="alert__message">{registerError}</p>
              </div>
            </div>
          )}
          <form onSubmit={handleRegisterIssuer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="regName">Institution Name</label>
              <input
                id="regName"
                type="text"
                className="input-field"
                placeholder="e.g. Stanford University or MIT"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="regDomain">Institution Domain</label>
              <input
                id="regDomain"
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
              variant="primary"
              loading={registering}
              disabled={!registerName.trim() || !registerDomain.trim()}
              style={{ height: '42px' }}
            >
              Register Institution
            </Button>
          </form>
        </div>
      )}

      {/* Stats Summary Strip */}
      <div className="stats-grid">
        <div className="stat-card stat-card--accent">
          <span className="stat-card__label">Total Issued Records</span>
          <span className="stat-card__value tabular-nums">{credentials.length}</span>
          <span className="stat-card__sub">Signed under official authority key</span>
        </div>
        <div className="stat-card stat-card--ok">
          <span className="stat-card__label">Active On Ledger</span>
          <span className="stat-card__value tabular-nums" style={{ color: 'var(--ok)' }}>
            {credentials.filter((c) => c.status === 'ACTIVE').length} Active
          </span>
          <span className="stat-card__sub">Immutable Ethereum anchor verified</span>
        </div>
        <div className="stat-card stat-card--ok">
          <span className="stat-card__label">Digital Seal Status</span>
          <span className="stat-card__value" style={{ fontSize: '1.25rem', color: signingKey?.keyId ? 'var(--ok)' : 'var(--warn)' }}>
            {signingKey?.keyId ? 'Ed25519 Active' : 'Unsealed'}
          </span>
          <span className="stat-card__sub">{signingKey?.keyId ? `Key ID: ${signingKey.keyId}` : 'Generate key to sign'}</span>
        </div>
      </div>

      {/* Main Tab Navigation: Issue Wizard vs Issued Records */}
      <div className="segmented" role="tablist" aria-label="Issuer workspace">
        <button
          type="button"
          role="tab"
          id="studio-tab-wizard"
          aria-selected={activeTab === 'wizard'}
          aria-controls="studio-panel-wizard"
          onClick={() => setActiveTab('wizard')}
          className={`segmented__item ${activeTab === 'wizard' ? 'is-active' : ''}`}
        >
          <Award size={15} aria-hidden="true" />
          <span>Issue new credential</span>
        </button>

        <button
          type="button"
          role="tab"
          id="studio-tab-directory"
          aria-selected={activeTab === 'directory'}
          aria-controls="studio-panel-directory"
          onClick={() => setActiveTab('directory')}
          className={`segmented__item ${activeTab === 'directory' ? 'is-active' : ''}`}
        >
          <Building2 size={15} aria-hidden="true" />
          <span>Issued credentials ({credentials.length})</span>
        </button>
      </div>

      {/* TAB 1: GUIDED ISSUANCE WIZARD */}
      {activeTab === 'wizard' && (
        <div
          id="studio-panel-wizard"
          role="tabpanel"
          aria-labelledby="studio-tab-wizard"
          className="card card--flush"
          style={{ padding: 'clamp(16px, 3.5vw, 32px)', borderRadius: 'var(--radius-lg)' }}
        >
          
          {/* Success Celebratory Banner if just issued */}
          {issuedResult ? (
            <div className="animate-fade-in" style={{
              textAlign: 'center',
              padding: '36px 20px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--ok-subtle)',
              border: '1px solid var(--ok-line)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(5, 150, 105, 0.15)',
                color: 'var(--ok)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <ShieldCheck size={36} />
              </div>

              <h2 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>
                Certificate Successfully Issued & Sealed!
              </h2>

              <p style={{ fontSize: '15px', color: 'var(--ink-secondary)', maxWidth: '520px', margin: '0 auto 20px' }}>
                <strong>"{issuedResult.title}"</strong> has been digitally signed and permanently anchored on the blockchain ledger.
              </p>

              <div style={{
                display: 'inline-block',
                padding: '10px 18px',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
                marginBottom: '24px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Official Certificate #: </span>
                <strong className="font-mono tabular-nums" style={{ fontSize: '14px', color: 'var(--accent)' }}>
                  {issuedResult.credentialNumber}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  icon={Eye}
                  onClick={() => setPreviewingCredential(issuedResult)}
                >
                  View Official Certificate
                </Button>

                <Button
                  variant="secondary"
                  icon={Plus}
                  onClick={() => {
                    setIssuedResult(null);
                    setWizardStep(1);
                    // The next certificate is a new document, not an
                    // amendment to this one. Leaving the rows would
                    // silently re-sign every claim under a second
                    // certificate number.
                    setClaimRows([{ id: 1, key: '', value: '' }]);
                  }}
                >
                  Issue Another Certificate
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {/* Wizard Steps Navigation Bar */}
              <div className="wizard-nav">
                {[
                  { step: 1, label: '1. Recipient' },
                  { step: 2, label: '2. Certificate' },
                  { step: 3, label: '3. Claims' },
                  { step: 4, label: '4. Preview & Seal' },
                ].map((item) => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setWizardStep(item.step)}
                    className={`wizard-step-item ${wizardStep === item.step ? 'active' : ''} ${wizardStep > item.step ? 'completed' : ''}`}
                  >
                    <div className="wizard-step-circle">
                      {wizardStep > item.step ? <Check size={16} /> : item.step}
                    </div>
                    <span style={{ fontSize: '13.5px', fontWeight: wizardStep === item.step ? 700 : 500, color: wizardStep === item.step ? 'var(--ink)' : 'var(--ink-secondary)' }}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {issueError && (
                <div className="alert alert--bad" role="alert" style={{ marginBottom: '20px' }}>
                  <AlertTriangle size={18} className="alert__icon" aria-hidden="true" />
                  <div className="alert__body">
                    <p className="alert__message">{issueError}</p>
                  </div>
                </div>
              )}

              {/* STEP 1: RECIPIENT */}
              {wizardStep === 1 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                      Step 1: Recipient Student / Candidate
                    </h2>
                    <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
                      Specify who will receive this official certificate.
                    </p>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="recName">
                      Recipient Full Name (as it appears on diploma)
                    </label>
                    <input
                      id="recName"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Jane Doe or Alex Rivera"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="subEmail">
                      Recipient Email Address
                    </label>
                    <input
                      id="subEmail"
                      type="email"
                      className="input-field"
                      placeholder="e.g. jane.doe@example.com"
                      value={recipientEmail}
                      onChange={(e) => {
                        setRecipientEmail(e.target.value);
                        setResolvedHolder(null);
                        setRecipientError(null);
                      }}
                      required
                    />
                    <span className="form-helper">
                      The certificate is delivered straight to the wallet of the holder
                      registered with this email address. No account is created here.
                    </span>
                    {resolvedHolder && (
                      <div className="alert alert--ok" style={{ marginTop: '10px' }}>
                        <Check size={16} className="alert__icon" aria-hidden="true" />
                        <div className="alert__body">
                          Matched holder: <strong>{resolvedHolder.fullName}</strong> ({resolvedHolder.email})
                        </div>
                      </div>
                    )}
                    {recipientError && (
                      <div className="alert alert--bad" role="alert" style={{ marginTop: '10px' }}>
                        <AlertTriangle size={16} className="alert__icon" aria-hidden="true" />
                        <div className="alert__body">
                          <p className="alert__message">{recipientError}</p>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="section-note" style={{ fontSize: '0.75rem', margin: 0 }}>
                          Sample holder:
                        </span>
                        <button
                          type="button"
                          className="chip-sample font-mono"
                          onClick={async () => {
                            setRecipientEmail('alex.mercer@alumni.org');
                            setRecipientName('Alex Mercer');
                            setRecipientError(null);
                            if (accessToken && !accessToken.startsWith('demo')) {
                              setLookingUpHolder(true);
                              try {
                                const h = await issuerService.findHolderByEmail('alex.mercer@alumni.org', accessToken);
                                setResolvedHolder(h);
                              } catch {
                                setRecipientError('Could not find holder record for alex.mercer@alumni.org');
                              } finally {
                                setLookingUpHolder(false);
                              }
                            } else {
                              setResolvedHolder({
                                id: 'usr-alex-mercer',
                                fullName: 'Alex Mercer',
                                email: 'alex.mercer@alumni.org',
                              });
                            }
                          }}
                        >
                          alex.mercer@alumni.org
                        </button>
                      </div>

                      <Button
                        variant="secondary"
                        disabled={!recipientEmail.trim() || lookingUpHolder}
                        onClick={handleResolveHolder}
                      >
                        {lookingUpHolder ? 'Checking...' : 'Find Holder'}
                      </Button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <Button
                      variant="primary"
                      icon={ArrowRight}
                      disabled={!recipientName.trim() || !resolvedHolder}
                      onClick={() => setWizardStep(2)}
                    >
                      Next: Certificate Details
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: CERTIFICATE DETAILS */}
              {wizardStep === 2 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                      Step 2: Certificate Degree & Title
                    </h2>
                    <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
                      Define the credential category and official award title.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="wCredType">Credential Type</label>
                      <select
                        id="wCredType"
                        className="select-field"
                        value={credType}
                        onChange={(e) => setCredType(e.target.value)}
                      >
                        <option value="Degree">Academic Degree</option>
                        <option value="Certificate">Certificate of Completion</option>
                        <option value="Professional License">Professional License</option>
                        <option value="Achievement Badge">Achievement Badge</option>
                        <option value="Diploma">Diploma</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="wCredTitle">Official Certificate Title</label>
                      <input
                        id="wCredTitle"
                        type="text"
                        className="input-field"
                        placeholder="e.g. Bachelor of Science in Computer Science"
                        value={credTitle}
                        onChange={(e) => setCredTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    <Button
                      variant="secondary"
                      icon={ArrowLeft}
                      onClick={() => setWizardStep(1)}
                    >
                      Back
                    </Button>

                    <Button
                      variant="primary"
                      icon={ArrowRight}
                      disabled={!credTitle.trim()}
                      onClick={() => setWizardStep(3)}
                    >
                      Next: Certificate Claims
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: ACADEMIC ATTRIBUTES */}
              {wizardStep === 3 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                      Step 3: Certificate Claims
                    </h2>
                    <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
                      Add any attributes the certificate should carry. Each claim needs its own name.
                    </p>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <p className="form-helper">
                      Anything you add here is signed into the certificate and cannot be
                      changed afterwards. The holder decides which of it a verifier sees.
                    </p>

                    {claimRows.map((row) => (
                      <div
                        key={row.id}
                        style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                      >
                        <input
                          aria-label={`Claim key ${row.id}`}
                          aria-invalid={conflictingRowIds.has(row.id)}
                          className="input-field"
                          placeholder="e.g. gpa"
                          value={row.key}
                          onChange={(e) => updateRow(row.id, 'key', e.target.value)}
                        />
                        <input
                          aria-label={`Claim value ${row.id}`}
                          className="input-field"
                          placeholder="e.g. 3.9"
                          value={row.value}
                          onChange={(e) => updateRow(row.id, 'value', e.target.value)}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Remove claim ${row.id}`}
                          onClick={() => removeRow(row.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '12px' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Plus}
                        onClick={() => addRow(null)}
                        disabled={claimCount >= CLAIM_CAP}
                      >
                        Add claim
                      </Button>
                      {PRESETS.map((p) => (
                        <Button
                          key={p.key}
                          variant="outline"
                          size="sm"
                          onClick={() => addRow(p)}
                          disabled={claimCount >= CLAIM_CAP}
                        >
                          + {p.key}
                        </Button>
                      ))}
                      <span className="form-helper" style={{ marginLeft: 'auto' }}>
                        {claimCount} / {CLAIM_CAP} claims
                      </span>
                    </div>

                    {claimBlockReason && (
                      <p className="form-error" role="alert" style={{ marginTop: '10px' }}>
                        <AlertTriangle size={14} aria-hidden="true" />
                        <span>{claimBlockReason}</span>
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    <Button
                      variant="secondary"
                      icon={ArrowLeft}
                      onClick={() => setWizardStep(2)}
                    >
                      Back
                    </Button>

                    <Button
                      variant="primary"
                      icon={ArrowRight}
                      onClick={() => setWizardStep(4)}
                    >
                      Next: Live Preview & Seal
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: LIVE PREVIEW & SEAL */}
              {wizardStep === 4 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                      Step 4: Live Certificate Preview
                    </h2>
                    <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
                      Review how the certificate will appear to the student and verifiers before signing.
                    </p>
                  </div>

                  {/* Visual Diploma Preview Canvas */}
                  <div className="diploma-canvas" style={{ maxWidth: '720px', margin: '0 auto', padding: '36px 28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building2 size={22} style={{ color: 'var(--ink)' }} />
                          <span className="font-diploma-serif" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
                            {issuerInfo?.name || user?.fullName || 'Authorized Institution'}
                          </span>
                        </div>
                        {issuerInfo?.domain && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: '2px' }}>
                            {issuerInfo.domain}
                          </div>
                        )}
                      </div>
                      <div className="diploma-seal">
                        <ShieldCheck size={32} />
                      </div>
                    </div>

                    <div style={{ margin: 'var(--space-4) 0' }}>
                      <span className="font-diploma-display" style={{
                        fontSize: '0.75rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-secondary)',
                        fontWeight: 700
                      }}>
                        OFFICIAL VERIFIABLE CREDENTIAL
                      </span>
                      <h2 className="font-diploma-serif" style={{
                        fontSize: '1.85rem',
                        fontWeight: 700,
                        color: 'var(--ink)',
                        marginTop: '6px',
                        letterSpacing: '-0.01em'
                      }}>
                        {credType.toUpperCase()} OF CONFERRAL
                      </h2>
                    </div>

                    <p style={{ fontStyle: 'italic', fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: '8px' }}>
                      Awarded with highest distinction to
                    </p>

                    <div style={{
                      padding: '8px 0',
                      borderBottom: '2px solid var(--line-strong)',
                      maxWidth: '440px',
                      margin: '0 auto 16px'
                    }}>
                      <h3 className="font-diploma-serif" style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: 'var(--ink)',
                        letterSpacing: '0.01em'
                      }}>
                        {recipientName || 'Candidate Name'}
                      </h3>
                    </div>

                    <p style={{ fontStyle: 'italic', fontSize: 'var(--text-xs)', color: 'var(--ink-secondary)', marginBottom: '6px' }}>
                      for successful completion and authorized award of
                    </p>

                    <h4 className="font-display" style={{
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      color: 'var(--accent-hover)',
                      margin: '0 auto 20px',
                      lineHeight: 1.3
                    }}>
                      {credTitle || 'Certificate Title'}
                    </h4>

                    {signedRows.length > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginBottom: '20px'
                      }}>
                        {/* signedRows, not claimRows: the preview has to show
                            exactly what gets signed, or a blank-value row
                            disappears from here and then appears on the
                            certificate. Keyed on r.id, because two rows can
                            share a key and that is the state being reported. */}
                        {signedRows.map((r) => (
                          <div
                            key={r.id}
                            style={{
                              backgroundColor: 'var(--surface)',
                              padding: '5px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--text-xs)',
                              border: '1px solid var(--line)',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <span style={{ color: 'var(--ink-secondary)', textTransform: 'capitalize', marginRight: '4px' }}>
                              {r.key}:
                            </span>
                            <strong style={{ color: 'var(--ink)' }}>{r.value}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{
                      marginTop: '20px',
                      paddingTop: '16px',
                      borderTop: '1px dashed var(--line-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--ink-muted)'
                    }}>
                      <ShieldCheck size={14} style={{ color: 'var(--ok)' }} />
                      <span>Ready to be cryptographically signed with private key and anchored on the Ethereum ledger.</span>
                    </div>
                  </div>

                  {/*
                    The step-3 alert is two steps back from the click that
                    fails, so a disabled button here would be a dead end.
                    Repeating the reason means the control explains itself
                    where the issuer is actually looking.
                  */}
                  {claimBlockReason && (
                    <p className="form-error" role="alert">
                      <AlertTriangle size={14} aria-hidden="true" />
                      <span>{claimBlockReason}</span>
                    </p>
                  )}

                  {/* Issuance Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <Button
                      variant="secondary"
                      icon={ArrowLeft}
                      onClick={() => setWizardStep(3)}
                    >
                      Back
                    </Button>

                    <Button
                      variant="primary"
                      size="lg"
                      icon={ShieldCheck}
                      onClick={handleIssueCredential}
                      loading={issuing}
                      disabled={issuanceBlocked}
                      style={{ padding: '0 32px' }}
                    >
                      Sign & Issue Official Certificate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ISSUED CERTIFICATES DIRECTORY */}
      {activeTab === 'directory' && (
        <div
          id="studio-panel-directory"
          role="tabpanel"
          aria-labelledby="studio-tab-directory"
          className="card card--flush"
          style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)' }}>
                Issued Certificates Archive
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                Audit all credentials conferred by your organization.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search by title, number, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '34px', height: '38px', fontSize: '13px' }}
                />
                <Search size={14} color="var(--ink-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              </div>

              <select
                className="select-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: '38px', width: 'auto', fontSize: '13px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="REVOKED">Revoked</option>
              </select>
            </div>
          </div>

          {credentials.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No credentials issued yet"
              description="Use the guided wizard to mint your institution's first verifiable degree or certificate."
            />
          ) : filteredCredentials.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-secondary)' }}>
              No certificates match your query "{searchQuery}".
            </div>
          ) : (
            <div className="table-container" style={{ backgroundColor: '#ffffff' }}>
              <table className="table table--responsive">
                <thead>
                  <tr>
                    <th scope="col">Certificate Title</th>
                    <th scope="col">Certificate #</th>
                    <th scope="col">Date Issued</th>
                    <th scope="col">Status</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCredentials.map((cred) => (
                    <tr key={cred.id || cred.credentialId}>
                      <td data-label="Certificate">
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          {cred.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                          Recipient: {cred.subjectName || cred.claims?.recipientName || `${cred.subjectId?.substring(0, 16) || 'unknown'}...`}
                        </div>
                      </td>
                      <td data-label="Certificate #">
                        <code className="font-mono" style={{ color: 'var(--accent)', fontSize: '12.5px' }}>
                          {cred.credentialNumber}
                        </code>
                      </td>
                      <td data-label="Date Issued" style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                        {cred.issuedAt ? new Date(cred.issuedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td data-label="Status">
                        <Badge status={cred.status} />
                      </td>
                      <td data-label="" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Eye}
                            onClick={() => setPreviewingCredential(cred)}
                          >
                            View
                          </Button>

                          {cred.status !== 'REVOKED' && (
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
      )}

      {/* Diploma View Modal */}
      {previewingCredential && (
        <CertificateDiplomaModal
          credential={previewingCredential}
          issuerName={issuerInfo?.name}
          onClose={() => setPreviewingCredential(null)}
        />
      )}

      {/* Revoke Confirmation Modal */}
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
