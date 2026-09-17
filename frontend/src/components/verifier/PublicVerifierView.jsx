import React, { useState } from 'react';
import { ShieldCheck, FileCheck, Search, HelpCircle, Download } from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { useAuth } from '../../context/AuthContext';
import { DropZone } from './DropZone';
import { ResultCard } from './ResultCard';
import { AnchorLookup } from './AnchorLookup';
import { ErrorState } from '../common/ErrorState';

export function PublicVerifierView() {
  const { accessToken } = useAuth();
  const [activeVerifyMode, setActiveVerifyMode] = useState('file'); // 'file' | 'number'
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerifyFile = async (file) => {
    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const result = await verifierService.verifyCredentialFile(file, accessToken);
      setVerificationResult(result);
    } catch (err) {
      setError(err.message || 'Verification could not be completed. Please ensure you uploaded an official CertiChain credential document.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setVerificationResult(null);
    setError(null);
  };

  const downloadSampleCredential = () => {
    const sample = {
      credentialNumber: "MIT-CS-2025-0841",
      issuer: {
        name: "Massachusetts Institute of Technology",
        domain: "mit.edu",
        did: "did:certchain:mit:registrar"
      },
      recipient: {
        name: "Alex Mercer",
        studentId: "MIT-982104"
      },
      claims: {
        studentName: "Alex Mercer",
        program: "Master of Science in Computer Science",
        major: "Artificial Intelligence & Distributed Systems",
        graduationDate: "2025-06-15",
        honors: "Summa Cum Laude"
      },
      issuedAt: "2025-06-15T10:00:00Z",
      proof: {
        type: "Ed25519Signature2020",
        created: "2025-06-15T10:05:00Z",
        verificationMethod: "did:certchain:mit:registrar#key-1",
        proofValue: "z3h29...mockEd25519SignatureProofValue"
      }
    };
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Sample_MIT_Credential.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '880px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 12px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1d4ed8',
          fontSize: '12.5px',
          fontWeight: 600,
          marginBottom: '14px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          <ShieldCheck size={15} />
          <span>Public Credential Verification</span>
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#0f172a',
          marginBottom: '10px',
        }}>
          Verify Authentic Credentials
        </h1>

        <p style={{
          fontSize: '15px',
          color: '#475569',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Instantly verify diplomas, degrees, and certificates issued on CertiChain. Confirm cryptographic authenticity, Ed25519 signatures, and blockchain anchors in real-time.
        </p>
      </div>

      {/* Main Verification View or Result */}
      {verificationResult ? (
        <ResultCard result={verificationResult} onReset={handleReset} />
      ) : (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
          {/* Dual Mode Switcher */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            gap: '6px'
          }}>
            <button
              type="button"
              onClick={() => { setActiveVerifyMode('file'); setError(null); }}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                border: activeVerifyMode === 'file' ? '1px solid #cbd5e1' : '1px solid transparent',
                background: activeVerifyMode === 'file' ? '#ffffff' : 'transparent',
                color: activeVerifyMode === 'file' ? '#1d4ed8' : '#475569',
                fontWeight: activeVerifyMode === 'file' ? 600 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeVerifyMode === 'file' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <FileCheck size={16} />
              <span>Verify Credential Document (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveVerifyMode('number'); setError(null); }}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                border: activeVerifyMode === 'number' ? '1px solid #cbd5e1' : '1px solid transparent',
                background: activeVerifyMode === 'number' ? '#ffffff' : 'transparent',
                color: activeVerifyMode === 'number' ? '#1d4ed8' : '#475569',
                fontWeight: activeVerifyMode === 'number' ? 600 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeVerifyMode === 'number' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Search size={16} />
              <span>Lookup by Certificate ID</span>
            </button>
          </div>

          {/* Active Mode Form */}
          {activeVerifyMode === 'file' ? (
            <div>
              <DropZone onFileSelected={handleVerifyFile} loading={loading} />

              <div style={{
                marginTop: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#475569'
                }}>
                  <HelpCircle size={15} color="#1d4ed8" />
                  <span>Don't have a credential file on hand?</span>
                </div>

                <button
                  type="button"
                  onClick={downloadSampleCredential}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    color: '#1d4ed8',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <Download size={13} />
                  <span>Download Sample Credential</span>
                </button>
              </div>
            </div>
          ) : (
            <AnchorLookup />
          )}

          {error && (
            <div style={{ marginTop: '20px' }}>
              <ErrorState
                title="Verification Check Inconclusive"
                message={error}
                onRetry={handleReset}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
