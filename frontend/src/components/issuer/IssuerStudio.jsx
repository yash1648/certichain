import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Award, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Search, 
  Check, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { issuerService } from '../../services/issuerService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { RevokeModal } from './RevokeModal';
import { CertificateDiplomaModal } from '../common/CertificateDiplomaModal';

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
  const [recipientName, setRecipientName] = useState('Jane Doe');
  const [subjectId, setSubjectId] = useState('');
  
  // Step 2: Credential Details
  const [credType, setCredType] = useState('Degree');
  const [credTitle, setCredTitle] = useState('Bachelor of Science in Computer Science');
  
  // Step 3: Academic Attributes
  const [programMajor, setProgramMajor] = useState('Computer Science');
  const [gpa, setGpa] = useState('3.92');
  const [honors, setHonors] = useState('Summa Cum Laude');
  const [department, setDepartment] = useState('School of Engineering');
  const [customClaims, setCustomClaims] = useState([]);

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
      const creds = await issuerService.listCredentials(accessToken);
      setCredentials(creds || []);

      if (creds && creds.length > 0) {
        const latest = creds[0];
        if (latest.keyId) {
          setSigningKey({ keyId: latest.keyId, active: true });
        }
      }
    } catch (err) {
      if (err.status !== 404) {
        setError(err.message || 'Failed to load issuer records.');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadIssuerData();
  }, [loadIssuerData]);

  // Set default subject ID to current user ID if empty (for convenient testing)
  useEffect(() => {
    if (!subjectId && user?.id) {
      setSubjectId(user.id);
    }
  }, [user?.id, subjectId]);

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

  // Custom Claims Handlers
  const handleAddCustomClaim = () => {
    setCustomClaims([...customClaims, { key: '', value: '' }]);
  };

  const handleRemoveCustomClaim = (index) => {
    setCustomClaims(customClaims.filter((_, i) => i !== index));
  };

  const handleCustomClaimChange = (index, field, val) => {
    const copy = [...customClaims];
    copy[index][field] = val;
    setCustomClaims(copy);
  };

  // Build Payload Claims Object
  const assembleClaims = () => {
    const obj = {
      recipientName: recipientName.trim(),
    };
    if (programMajor.trim()) obj.major = programMajor.trim();
    if (gpa.trim()) obj.gpa = gpa.trim();
    if (honors.trim()) obj.honors = honors.trim();
    if (department.trim()) obj.department = department.trim();

    customClaims.forEach(c => {
      if (c.key.trim() && c.value.trim()) {
        obj[c.key.trim()] = c.value.trim();
      }
    });
    return obj;
  };

  // Issue Credential Submission
  const handleIssueCredential = async () => {
    if (!subjectId.trim() || !credTitle.trim()) return;

    setIssuing(true);
    setIssueError(null);
    setIssuedResult(null);

    const payload = {
      subjectId: subjectId.trim(),
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
      setIssueError(err.message || 'Could not issue credential. Please check that recipient ID exists and the digital seal is active.');
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
      <div className="glass-panel" style={{ padding: '26px 28px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
              border: '1px solid var(--border-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--purple-primary)',
              boxShadow: '0 4px 15px rgba(124, 58, 237, 0.15)'
            }}>
              <Building2 size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h1 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {issuerInfo?.name || 'Credential Issuance Studio'}
                </h1>
                {issuerInfo?.domain && (
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9' }}>
                    {issuerInfo.domain}
                  </span>
                )}
                <span className="badge badge-purple">
                  <ShieldCheck size={12} />
                  Authorized Institution
                </span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Issue, manage, and anchor verifiable academic degrees, badges, and certificates on the blockchain ledger.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Digital Seal Status Indicator */}
            <div style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: signingKey?.keyId ? 'rgba(5, 150, 105, 0.08)' : 'rgba(217, 119, 6, 0.08)',
              border: `1px solid ${signingKey?.keyId ? 'rgba(5, 150, 105, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`,
              color: signingKey?.keyId ? 'var(--emerald-primary)' : 'var(--amber-primary)',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <ShieldCheck size={15} />
              <span>{signingKey?.keyId ? 'Digital Signing Seal Ready' : 'Seal Inactive'}</span>
            </div>

            <Button variant="secondary" size="sm" onClick={loadIssuerData} loading={loading} icon={RefreshCw}>
              Refresh
            </Button>
          </div>
        </div>

        {/* If seal not activated, show quick activation bar */}
        {!signingKey?.keyId && (
          <div style={{
            marginTop: '20px',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(217, 119, 6, 0.06)',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} color="var(--amber-primary)" />
              <span style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                Your institution requires an active digital seal before certificates can be signed.
              </span>
            </div>

            <Button
              variant="amber"
              size="sm"
              onClick={handleActivateSeal}
              loading={activatingSeal}
            >
              Activate Digital Signing Seal
            </Button>
          </div>
        )}
        {sealError && <p style={{ color: 'var(--rose-primary)', fontSize: '12.5px', marginTop: '8px' }}>{sealError}</p>}
      </div>

      {error && <ErrorState message={error} onRetry={loadIssuerData} />}

      {!issuerInfo && credentials.length === 0 && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '6px' }}>
            Register Your Educational Institution
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Register your institution's official name and verified domain to activate your credential issuing profile.
          </p>
          {registerError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(225, 29, 72, 0.08)', color: 'var(--rose-primary)', fontSize: '13px', marginBottom: '14px' }}>
              {registerError}
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
              variant="purple"
              loading={registering}
              disabled={!registerName.trim() || !registerDomain.trim()}
              style={{ height: '42px' }}
            >
              Register Institution
            </Button>
          </form>
        </div>
      )}

      {/* Main Tab Navigation: Issue Wizard vs Issued Records */}
      <div style={{
        display: 'flex',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '6px',
        gap: '8px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('wizard')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'wizard' ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
            color: activeTab === 'wizard' ? 'var(--purple-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'wizard' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Award size={16} />
          <span>Issue New Certificate (Guided Wizard)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'directory' ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
            color: activeTab === 'directory' ? 'var(--purple-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'directory' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Building2 size={16} />
          <span>Issued Certificates Directory ({credentials.length})</span>
        </button>
      </div>

      {/* TAB 1: GUIDED ISSUANCE WIZARD */}
      {activeTab === 'wizard' && (
        <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}>
          
          {/* Success Celebratory Banner if just issued */}
          {issuedResult ? (
            <div className="animate-fade-in" style={{
              textAlign: 'center',
              padding: '36px 20px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(5, 150, 105, 0.04)',
              border: '1px solid rgba(5, 150, 105, 0.25)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(5, 150, 105, 0.15)',
                color: 'var(--emerald-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <ShieldCheck size={36} />
              </div>

              <h2 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Certificate Successfully Issued & Sealed!
              </h2>

              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px' }}>
                <strong>"{issuedResult.title}"</strong> has been digitally signed and permanently anchored on the blockchain ledger.
              </p>

              <div style={{
                display: 'inline-block',
                padding: '10px 18px',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '24px'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Official Certificate #: </span>
                <strong className="font-mono" style={{ fontSize: '14px', color: 'var(--cyan-primary)' }}>
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
                  { step: 3, label: '3. Attributes' },
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
                    <span style={{ fontSize: '13.5px', fontWeight: wizardStep === item.step ? 700 : 500, color: wizardStep === item.step ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {issueError && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(225, 29, 72, 0.08)',
                  border: '1px solid rgba(225, 29, 72, 0.25)',
                  color: 'var(--rose-primary)',
                  fontSize: '13.5px',
                  marginBottom: '20px'
                }}>
                  {issueError}
                </div>
              )}

              {/* STEP 1: RECIPIENT */}
              {wizardStep === 1 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Step 1: Recipient Student / Candidate
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" htmlFor="subId" style={{ marginBottom: 0 }}>
                        Recipient Account ID (User UUID)
                      </label>
                      {user?.id && (
                        <button
                          type="button"
                          onClick={() => setSubjectId(user.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '11.5px', color: 'var(--cyan-primary)', padding: '2px 6px' }}
                        >
                          Use My Account ID (for testing)
                        </button>
                      )}
                    </div>
                    <input
                      id="subId"
                      type="text"
                      className="input-field font-mono"
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      required
                      style={{ marginTop: '6px' }}
                    />
                    <span className="form-helper">
                      The registered student's account identifier where this certificate will be securely delivered.
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <Button
                      variant="primary"
                      icon={ArrowRight}
                      disabled={!recipientName.trim() || !subjectId.trim()}
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
                    <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Step 2: Certificate Degree & Title
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
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
                      Next: Academic Attributes
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: ACADEMIC ATTRIBUTES */}
              {wizardStep === 3 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Step 3: Academic Highlights & Honors
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Enter graduation honors, GPA, specialization, and department information.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="wMajor">Major / Program</label>
                      <input
                        id="wMajor"
                        type="text"
                        className="input-field"
                        placeholder="e.g. Computer Science"
                        value={programMajor}
                        onChange={(e) => setProgramMajor(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="wGpa">Grade / GPA</label>
                      <input
                        id="wGpa"
                        type="text"
                        className="input-field"
                        placeholder="e.g. 3.92 or First Class"
                        value={gpa}
                        onChange={(e) => setGpa(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="wHonors">Honors / Distinction</label>
                      <input
                        id="wHonors"
                        type="text"
                        className="input-field"
                        placeholder="e.g. Summa Cum Laude"
                        value={honors}
                        onChange={(e) => setHonors(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="wDept">Issuing Department</label>
                      <input
                        id="wDept"
                        type="text"
                        className="input-field"
                        placeholder="e.g. School of Engineering"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Custom Attributes */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Additional Custom Attributes (Optional)
                      </span>
                      <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddCustomClaim}>
                        Add Attribute
                      </Button>
                    </div>

                    {customClaims.map((claim, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Attribute name (e.g. Dean's List)"
                          value={claim.key}
                          onChange={(e) => handleCustomClaimChange(idx, 'key', e.target.value)}
                        />
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Value (e.g. 2026)"
                          value={claim.value}
                          onChange={(e) => handleCustomClaimChange(idx, 'value', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomClaim(idx)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--rose-primary)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
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
                    <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Step 4: Live Certificate Preview
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Review how the certificate will appear to the student and verifiers before signing.
                    </p>
                  </div>

                  {/* Visual Diploma Preview Canvas */}
                  <div className="diploma-canvas" style={{ maxWidth: '720px', margin: '0 auto', padding: '36px 28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={20} color="#1e293b" />
                          <span className="font-diploma-serif" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                            {issuerInfo?.name || user?.fullName || 'Authorized University'}
                          </span>
                        </div>
                      </div>
                      <div className="diploma-seal" style={{ width: '56px', height: '56px' }}>
                        <ShieldCheck size={28} />
                      </div>
                    </div>

                    <span className="font-diploma-display" style={{ fontSize: '10.5px', letterSpacing: '0.2em', color: '#b45309', fontWeight: 700 }}>
                      OFFICIAL VERIFIABLE CREDENTIAL
                    </span>
                    <h2 className="font-diploma-serif" style={{ fontSize: '1.8rem', fontWeight: 700, margin: '6px 0 12px' }}>
                      {credType.toUpperCase()} OF ACHIEVEMENT
                    </h2>

                    <p style={{ fontStyle: 'italic', fontSize: '13.5px', color: '#64748b', marginBottom: '8px' }}>
                      Awarded with highest distinction to
                    </p>

                    <h3 className="font-diploma-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', maxWidth: '400px', margin: '0 auto 12px' }}>
                      {recipientName || 'Candidate Name'}
                    </h3>

                    <h4 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0369a1', margin: '0 auto 16px' }}>
                      {credTitle}
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      {programMajor && <span style={{ backgroundColor: '#ffffff', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', border: '1px solid #e2e8f0' }}>Major: <strong>{programMajor}</strong></span>}
                      {gpa && <span style={{ backgroundColor: '#ffffff', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', border: '1px solid #e2e8f0' }}>GPA: <strong>{gpa}</strong></span>}
                      {honors && <span style={{ backgroundColor: '#ffffff', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', border: '1px solid #e2e8f0' }}>Honors: <strong>{honors}</strong></span>}
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Ready to be cryptographically signed with private key and anchored on the Ethereum ledger.
                    </div>
                  </div>

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
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Issued Certificates Archive
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
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
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
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
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No certificates match your query "{searchQuery}".
            </div>
          ) : (
            <div className="table-container" style={{ backgroundColor: '#ffffff' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Certificate Title</th>
                    <th>Certificate #</th>
                    <th>Date Issued</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCredentials.map((cred) => (
                    <tr key={cred.id || cred.credentialId}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cred.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Recipient: {cred.claims?.recipientName || cred.claims?.studentName || cred.subjectId?.substring(0, 16) + '...'}
                        </div>
                      </td>
                      <td>
                        <code className="font-mono" style={{ color: 'var(--cyan-primary)', fontSize: '12.5px' }}>
                          {cred.credentialNumber}
                        </code>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {cred.issuedAt ? new Date(cred.issuedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        <Badge status={cred.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
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
