import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileCheck, 
  UploadCloud, 
  Building, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RotateCcw,
  Sparkles,
  Layers,
  Code
} from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { useAuth } from '../../context/AuthContext';

export function PublicVerifierView() {
  const { accessToken } = useAuth();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file.name.endsWith('.json')) {
      setError('Please upload a valid JSON verifiable credential file (.json).');
      return;
    }

    setSelectedFile(file);
    setVerifying(true);
    setError('');
    setResult(null);

    try {
      const res = await verifierService.verifyCredentialFile(file, accessToken);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Verification failed. The file format may be invalid.');
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  // Helper: Status badge styling & icons
  const getStatusDisplay = (status, valid) => {
    switch (status) {
      case 'VALID':
        return {
          icon: <ShieldCheck size={36} color="var(--emerald-primary)" />,
          title: 'Authentic & Cryptographically Valid',
          color: 'var(--emerald-primary)',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'var(--border-emerald)',
          desc: 'The Ed25519 digital signature is valid, IPFS content matches the ledger, and the credential has not been revoked.'
        };
      case 'TAMPERED':
        return {
          icon: <ShieldAlert size={36} color="#fb7185" />,
          title: 'Tampered / Invalid Signature',
          color: '#fb7185',
          bg: 'rgba(244, 63, 94, 0.12)',
          border: 'rgba(244, 63, 94, 0.4)',
          desc: 'Cryptographic signature verification failed or content does not match the canonical hash.'
        };
      case 'REVOKED':
        return {
          icon: <AlertTriangle size={36} color="var(--amber-primary)" />,
          title: 'Credential Revoked',
          color: 'var(--amber-primary)',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.4)',
          desc: 'This credential was revoked by the issuing authority and is no longer valid.'
        };
      case 'EXPIRED':
        return {
          icon: <Clock size={36} color="var(--amber-primary)" />,
          title: 'Credential Expired',
          color: 'var(--amber-primary)',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.4)',
          desc: 'The credential expiration date has passed.'
        };
      case 'NOT_FOUND':
      case 'UNAVAILABLE':
      default:
        return {
          icon: <XCircle size={36} color="#94a3b8" />,
          title: `Status: ${status}`,
          color: '#94a3b8',
          bg: 'rgba(255, 255, 255, 0.06)',
          border: 'var(--border-subtle)',
          desc: result?.reason || 'Unable to locate credential or IPFS content unavailable.'
        };
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel glass-panel-glow" style={{ padding: '28px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid var(--border-accent)',
          color: 'var(--cyan-primary)',
          fontSize: '0.8rem',
          fontWeight: 600,
          marginBottom: '14px'
        }}>
          <ShieldCheck size={16} />
          <span>Public Verifier Engine (POST /api/verifier/verify)</span>
        </div>

        <h1 className="font-display" style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '8px' }}>
          Instant Credential Verification
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto' }}>
          Upload any CertiChain verifiable credential file (.json) to cryptographically audit its Ed25519 signature, IPFS content integrity, and revocation status on the ledger.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: '#fb7185',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* ==========================================
          UPLOAD DROPZONE (When no result)
          ========================================== */}
      {!result && (
        <div
          className="glass-panel"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            border: dragActive ? '2px dashed var(--cyan-primary)' : '2px dashed var(--border-subtle)',
            backgroundColor: dragActive ? 'rgba(0, 229, 255, 0.05)' : 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".json"
            onChange={handleChange}
            style={{ display: 'none' }}
          />

          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(0, 229, 255, 0.1)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan-primary)',
            margin: '0 auto 16px'
          }}>
            <UploadCloud size={30} />
          </div>

          <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '6px' }}>
            {verifying ? 'Auditing Cryptographic Signature...' : 'Drag and Drop Credential File'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
            Supports canonical verifiable credential envelopes in <code>.json</code> format
          </p>

          <button
            type="button"
            className="btn btn-primary"
            disabled={verifying}
            style={{ padding: '9px 20px', fontSize: '0.875rem' }}
          >
            {verifying ? 'Verifying on Ledger...' : 'Browse Files on Device'}
          </button>
        </div>
      )}

      {/* ==========================================
          VERIFICATION RESULT REPORT
          ========================================== */}
      {result && (() => {
        const statusConfig = getStatusDisplay(result.status, result.valid);

        return (
          <div className="glass-panel animate-fade-in" style={{ padding: '32px 28px' }}>
            
            {/* Status Banner */}
            <div style={{
              backgroundColor: statusConfig.bg,
              border: `1px solid ${statusConfig.border}`,
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '28px'
            }}>
              <div style={{ flexShrink: 0 }}>
                {statusConfig.icon}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, color: statusConfig.color }}>
                    {statusConfig.title}
                  </h2>
                  <span className="badge" style={{
                    backgroundColor: statusConfig.bg,
                    borderColor: statusConfig.border,
                    color: statusConfig.color,
                    fontSize: '0.75rem'
                  }}>
                    {result.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {statusConfig.desc}
                </p>
                {result.reason && (
                  <div style={{ marginTop: '8px', fontSize: '0.825rem', color: '#fb7185' }}>
                    Reason: <strong>{result.reason}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Credential & Issuer Summary Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* Issuer Trust Profile */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                  Issuing Authority
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Building size={16} color="var(--cyan-primary)" />
                  <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {result.issuerName || 'Unknown Issuer'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <ExternalLink size={13} />
                  <span>{result.issuerDomain || 'Domain Unspecified'}</span>
                </div>
                <div>
                  <span className={`badge ${result.issuerVerified ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                    {result.issuerVerified ? '✓ Verified Issuer Identity' : '⚠ Unverified Issuer Profile'}
                  </span>
                </div>
              </div>

              {/* Credential Identification */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                  Credential Identification
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Credential #:</span>
                    <code className="font-mono" style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>
                      {result.credentialNumber || 'N/A'}
                    </code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Issued At:</span>
                    <span>{result.issuedAt ? new Date(result.issuedAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expires At:</span>
                    <span>{result.expiresAt ? new Date(result.expiresAt).toLocaleString() : 'Permanent (No Expiry)'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Verified At:</span>
                    <span style={{ color: 'var(--cyan-primary)' }}>{new Date(result.verifiedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decoded Claims Table */}
            {result.claims && Object.keys(result.claims).length > 0 && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Code size={16} color="var(--emerald-primary)" />
                  <h4 className="font-display" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    Verified Attribute Claims
                  </h4>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '10px'
                }}>
                  {Object.entries(result.claims).map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px'
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {key}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset / Verify Another Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleReset}
                className="btn btn-outline"
                style={{ padding: '9px 18px', fontSize: '0.85rem' }}
              >
                <RotateCcw size={15} />
                <span>Verify Another Credential</span>
              </button>
            </div>

          </div>
        );
      })()}

    </div>
  );
}
