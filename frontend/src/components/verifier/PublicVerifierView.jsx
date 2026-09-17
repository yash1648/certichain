import React, { useState } from 'react';
import { ShieldCheck, FileCheck, Search, HelpCircle } from 'lucide-react';
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

  return (
    <div className="animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 14px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid var(--border-accent)',
          color: 'var(--cyan-primary)',
          fontSize: '12.5px',
          fontWeight: 600,
          marginBottom: '14px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          <ShieldCheck size={15} />
          <span>Official Public Verification Portal</span>
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(1.85rem, 4vw, 2.6rem)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          marginBottom: '10px',
        }}>
          Verify an Authentic Credential
        </h1>

        <p style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Instantly verify diplomas, degrees, and certificates issued on CertiChain. Ensure documents are genuine, untampered, and backed by immutable blockchain proof.
        </p>
      </div>

      {/* Main Verification Spectacle or Result */}
      {verificationResult ? (
        <ResultCard result={verificationResult} onReset={handleReset} />
      ) : (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
          {/* Dual Mode Switcher */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            gap: '4px'
          }}>
            <button
              type="button"
              onClick={() => { setActiveVerifyMode('file'); setError(null); }}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeVerifyMode === 'file' ? '#ffffff' : 'transparent',
                color: activeVerifyMode === 'file' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
                fontWeight: activeVerifyMode === 'file' ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeVerifyMode === 'file' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <FileCheck size={16} />
              <span>Upload Certificate Document</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveVerifyMode('number'); setError(null); }}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeVerifyMode === 'number' ? '#ffffff' : 'transparent',
                color: activeVerifyMode === 'number' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
                fontWeight: activeVerifyMode === 'number' ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeVerifyMode === 'number' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Search size={16} />
              <span>Verify by Certificate Number</span>
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
                justifyContent: 'center',
                gap: '6px',
                fontSize: '12.5px',
                color: 'var(--text-muted)'
              }}>
                <HelpCircle size={14} />
                <span>Candidate provided a downloaded .json credential file? Upload it above for complete cryptographic verification.</span>
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
