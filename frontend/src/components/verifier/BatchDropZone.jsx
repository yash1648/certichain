import React, { useState, useRef, useId } from 'react';
import { UploadCloud, FileStack, AlertCircle, Trash2, CheckCircle2, FileJson, Archive } from 'lucide-react';
import { Button } from '../common/Button';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB for JSON
const MAX_ZIP_SIZE = 20 * 1024 * 1024; // 20MB for ZIP
const MAX_FILES = 500;

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function BatchDropZone({ onStartVerification, onTrySample, loading = false, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);
  const hintId = useId();

  const blocked = disabled || loading;

  const validateAndAddFiles = (newFiles) => {
    setValidationError(null);
    if (!newFiles || newFiles.length === 0) return;

    const fileList = Array.from(newFiles);
    const validFiles = [];
    let err = null;

    for (const file of fileList) {
      const lower = file.name.toLowerCase();
      const isJson = lower.endsWith('.json');
      const isZip = lower.endsWith('.zip');

      if (!isJson && !isZip) {
        err = `Unsupported file type: "${file.name}". Only .json and .zip files are supported.`;
        break;
      }

      if (isJson && file.size > MAX_FILE_SIZE) {
        err = `File "${file.name}" exceeds the 2MB limit (${formatBytes(file.size)}).`;
        break;
      }

      if (isZip && file.size > MAX_ZIP_SIZE) {
        err = `ZIP archive "${file.name}" exceeds the 20MB limit (${formatBytes(file.size)}).`;
        break;
      }

      validFiles.push(file);
    }

    if (err) {
      setValidationError(err);
      return;
    }

    const merged = [...selectedFiles];
    for (const f of validFiles) {
      if (!merged.some((existing) => existing.name === f.name && existing.size === f.size)) {
        merged.push(f);
      }
    }

    if (merged.length > MAX_FILES) {
      setValidationError(`Maximum of ${MAX_FILES} files allowed in a batch.`);
      return;
    }

    setSelectedFiles(merged);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (blocked) return;
    if (e.dataTransfer.files?.length) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!blocked) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget)) return;
          setIsDragOver(false);
        }}
        onDrop={handleDrop}
        className="dropzone"
        data-dragover={isDragOver || undefined}
        data-busy={blocked || undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.zip,application/json,application/zip,application/x-zip-compressed"
          multiple
          data-testid="batch-verify-file-input"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) {
              validateAndAddFiles(e.target.files);
            }
            e.target.value = '';
          }}
          disabled={blocked}
          tabIndex={-1}
          aria-hidden="true"
        />

        <span className="dropzone__icon" aria-hidden="true">
          {loading ? (
            <span className="spinner" />
          ) : selectedFiles.length > 0 ? (
            <CheckCircle2 size={24} style={{ color: 'var(--ok)' }} />
          ) : (
            <FileStack size={24} />
          )}
        </span>

        <h2 className="dropzone__title">
          {loading
            ? 'Processing batch verification...'
            : selectedFiles.length > 0
              ? `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected (${formatBytes(totalBytes)})`
              : 'Drop credential files or ZIP archive here'}
        </h2>

        <p className="dropzone__note" id={hintId}>
          Upload multiple Verifiable Credential .json files or a single .zip archive. All
          credentials will be verified concurrently through the cryptographic trust engine.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="primary"
            disabled={blocked}
            aria-describedby={hintId}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFiles.length > 0 ? 'Add more files' : 'Browse files or ZIP'}
          </Button>

          {onTrySample && selectedFiles.length === 0 && (
            <Button
              variant="outline"
              disabled={blocked}
              onClick={onTrySample}
            >
              Try sample batch
            </Button>
          )}
        </div>
      </div>

      {validationError && (
        <p className="form-error" role="alert" style={{ marginTop: 'var(--space-3)' }}>
          <AlertCircle size={14} aria-hidden="true" />
          {validationError}
        </p>
      )}

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 className="section-title" style={{ margin: 0, fontSize: '13.5px' }}>
              Selected Files ({selectedFiles.length}) &middot; {formatBytes(totalBytes)}
            </h3>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={blocked}>
              Clear all
            </Button>
          </div>

          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface-subtle)',
            }}
          >
            <table className="table" style={{ margin: 0, fontSize: '13px' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ width: '40px' }}>Type</th>
                  <th scope="col">File Name</th>
                  <th scope="col" style={{ width: '100px' }}>Size</th>
                  <th scope="col" style={{ width: '60px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedFiles.map((file, idx) => {
                  const isZip = file.name.toLowerCase().endsWith('.zip');
                  return (
                    <tr key={`${file.name}-${idx}`}>
                      <td style={{ verticalAlign: 'middle' }}>
                        {isZip ? (
                          <Archive size={16} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                        ) : (
                          <FileJson size={16} style={{ color: 'var(--ink-muted)' }} aria-hidden="true" />
                        )}
                      </td>
                      <td style={{ verticalAlign: 'middle', wordBreak: 'break-all' }} className="font-mono">
                        {file.name}
                      </td>
                      <td style={{ verticalAlign: 'middle', color: 'var(--ink-secondary)' }}>
                        {formatBytes(file.size)}
                      </td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px', height: 'auto', color: 'var(--ink-muted)' }}
                          onClick={() => removeFile(idx)}
                          disabled={blocked}
                          title={`Remove ${file.name}`}
                          aria-label={`Remove ${file.name}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button
              variant="primary"
              disabled={blocked || selectedFiles.length === 0}
              onClick={() => onStartVerification(selectedFiles)}
              icon={UploadCloud}
              style={{ minWidth: '180px' }}
            >
              {loading ? 'Verifying...' : `Verify ${selectedFiles.length} Credential${selectedFiles.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
