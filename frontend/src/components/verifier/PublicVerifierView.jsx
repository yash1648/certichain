import React, { useState } from 'react';
import { FileCheck, Search } from 'lucide-react';
import { verifierService } from '../../services/verifierService';
import { useAuth } from '../../context/AuthContext';
import { DropZone } from './DropZone';
import { ResultCard } from './ResultCard';
import { AnchorLookup } from './AnchorLookup';
import { ErrorState } from '../common/ErrorState';

const MODES = [
  { id: 'file', label: 'Verify a document', Icon: FileCheck },
  { id: 'anchor', label: 'Check an anchor record', Icon: Search },
];

export function PublicVerifierView() {
  const { accessToken } = useAuth();
  const [mode, setMode] = useState('file');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const selectMode = (next) => {
    setMode(next);
    setError(null);
  };

  const handleVerifyFile = async (file) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setResult(await verifierService.verifyCredentialFile(file, accessToken));
    } catch (err) {
      setError(
        err.message ||
          'The document could not be read as a CertiChain credential. Check that it is the .json file issued to you.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="animate-fade-in">
      {result ? (
        <ResultCard result={result} onReset={handleReset} />
      ) : (
        <>
          {/*
            The two modes are not equivalent and the copy must not pretend they
            are. Uploading the document runs the full Ed25519 signature check.
            Looking up a number only confirms a record exists in the ledger -- it
            cannot verify a document the verifier has never seen.
          */}
          <div className="segmented" role="tablist" aria-label="Verification method">
            {MODES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                aria-controls={`verify-panel-${id}`}
                id={`verify-tab-${id}`}
                className="segmented__item"
                onClick={() => selectMode(id)}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`verify-panel-${mode}`}
            aria-labelledby={`verify-tab-${mode}`}
            className="card card--flush"
            style={{ marginTop: 'var(--space-4)' }}
          >
            <div className="card__body">
              {mode === 'file' ? (
                <>
                  <DropZone onFileSelected={handleVerifyFile} loading={loading} />
                  <p className="section-note" style={{ marginTop: 'var(--space-4)' }}>
                    Requests are logged to your verification history when you are signed in.
                  </p>
                </>
              ) : (
                <AnchorLookup />
              )}

              {error && (
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <ErrorState title="Could not verify" message={error} onRetry={handleReset} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
