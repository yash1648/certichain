import React, { useState } from 'react';
import { ShieldCheck, Sparkles, FileCode2 } from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { useAuth } from '../../context/AuthContext';
import { DropZone } from './DropZone';
import { ResultCard } from './ResultCard';
import { AnchorLookup } from './AnchorLookup';
import { ErrorState } from '../common/ErrorState';

export function PublicVerifierView() {
  const { accessToken } = useAuth();
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
      setError(err.message || 'Verification failed. The uploaded file may not be a valid JSON credential envelope.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setVerificationResult(null);
    setError(null);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid var(--border-accent)',
          color: 'var(--cyan-primary)',
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '12px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          <ShieldCheck size={14} />
          <span>Public Verification Portal</span>
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}>
          Verify a Digital Credential
        </h1>

        <p style={{
          fontSize: '14.5px',
          color: 'var(--text-secondary)',
          maxWidth: '560px',
          margin: '0 auto',
          lineHeight: 1.5,
        }}>
          Upload any signed credential file to inspect its cryptographic integrity, Ed25519 signature authenticity, issuer registry status, and Ethereum blockchain anchor.
        </p>
      </div>

      {/* Main Verification Spectacle */}
      {verificationResult ? (
        <ResultCard result={verificationResult} onReset={handleReset} />
      ) : (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <DropZone onFileSelected={handleVerifyFile} loading={loading} />

          {error && (
            <ErrorState
              title="Verification Could Not Be Completed"
              message={error}
              onRetry={handleReset}
            />
          )}
        </div>
      )}

      {/* On-Chain Anchor Lookup Tool */}
      <AnchorLookup />
    </div>
  );
}
