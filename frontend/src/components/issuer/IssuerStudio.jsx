import React, { useState, useEffect, useCallback } from 'react';
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
  
  // Step 3: Academic Attributes
  const [programMajor, setProgramMajor] = useState('');
  const [gpa, setGpa] = useState('');
  const [honors, setHonors] = useState('');
  const [department, setDepartment] = useState('');

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
      setIssuerInfo(profile);
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
  const assembleClaims = () => {
    const obj = {
      recipientName: recipientName.trim(),
    };
    if (programMajor.trim()) obj.major = programMajor.trim();
    if (gpa.trim()) obj.gpa = gpa.trim();
    if (honors.trim()) obj.honors = honors.trim();
    if (department.trim()) obj.department = department.trim();
    return obj;
  };

  // Issue Credential Submission
  const handleIssueCredential = async () => {
    if (!resolvedHolder?.id || !credTitle.trim()) return;

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
      setIssueError(err.message || 'Could not issue credential. Please check that the recipient holder exists and the digital seal is active.');
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
      <div className="card card--flush" style={{ padding: '26px 28px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="icon-tile" aria-hidden="true">
              <Building2 size={22} />
            </span>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                {issuerInfo?.domain && (
                  <span style={{ fontSize: '13px', color: 'var(--ink-secondary)', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9' }}>
                    {issuerInfo.domain}
                  </span>
                )}

              </div>
              <p style={{ fontSize: '14px', color: 'var(--ink-secondary)' }}>
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
          <div style={{
            marginTop: '20px',
            padding: '14px 18px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(217, 119, 6, 0.06)',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} className="alert__icon" aria-hidden="true" />
              <div className="alert__body">
                <strong className="alert__title">Signing seal required</strong>
                <p className="alert__message">
                  Your institution needs an active digital seal before certificates can be signed.
                </p>
              </div>
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
          style={{ padding: '32px', borderRadius: 'var(--radius-lg)' }}
        >
          
          {/* Success Celebratory Banner if just issued */}
          {issuedResult ? (
            <div className="animate-fade-in" style={{
              textAlign: 'center',
              padding: '36px 20px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'rgba(5, 150, 105, 0.04)',
              border: '1px solid rgba(5, 150, 105, 0.25)'
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
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
                marginBottom: '24px'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Official Certificate #: </span>
                <strong className="font-mono" style={{ fontSize: '14px', color: 'var(--accent)' }}>
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
                    <span style={{ fontSize: '13.5px', fontWeight: wizardStep === item.step ? 700 : 500, color: wizardStep === item.step ? 'var(--ink)' : 'var(--ink-secondary)' }}>
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
                  color: 'var(--bad)',
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
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--success, #2f9e6e)',
                          fontSize: '0.85rem',
                        }}
                      >
                        Matched holder: <strong>{resolvedHolder.fullName}</strong> ({resolvedHolder.email})
                      </div>
                    )}
                    {recipientError && (
                      <div style={{ marginTop: '8px', color: 'var(--danger, #d9534f)', fontSize: '0.85rem' }}>
                        {recipientError}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
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
                      Next: Academic Attributes
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: ACADEMIC ATTRIBUTES */}
              {wizardStep === 3 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                      Step 3: Academic Highlights & Honors
                    </h2>
                    <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
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
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          {cred.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                          Recipient: {cred.subjectName || cred.claims?.recipientName || `${cred.subjectId?.substring(0, 16) || 'unknown'}...`}
                        </div>
                      </td>
                      <td>
                        <code className="font-mono" style={{ color: 'var(--accent)', fontSize: '12.5px' }}>
                          {cred.credentialNumber}
                        </code>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
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
