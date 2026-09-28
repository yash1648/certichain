import React, { useState, useRef, useId } from 'react';
import { UploadCloud, FileCheck2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function DropZone({ onFileSelected, loading = false, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [fileError, setFileError] = useState(null);
  const fileInputRef = useRef(null);
  const hintId = useId();

  const blocked = disabled || loading;

  const handleFile = (file) => {
    setFileError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setFileError('Select the .json credential file issued to you.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('That file is over the 2MB limit.');
      return;
    }

    setSelectedFileName(file.name);
    onFileSelected(file);
  };

  // The visible <button> is the only way in. Making the whole box clickable too
  // would add a second, mouse-only path and a nested-interactive control, so the
  // container handles drag and drop only.
  const onDragOver = (e) => {
    e.preventDefault();
    if (!blocked) setIsDragOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (blocked) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="dropzone"
        data-dragover={isDragOver || undefined}
        data-busy={blocked || undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          data-testid="verify-file-input"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            // Allow re-picking the same file after an error.
            e.target.value = '';
          }}
          disabled={blocked}
          tabIndex={-1}
          aria-hidden="true"
        />

        <span className="dropzone__icon" aria-hidden="true">
          {loading ? (
            <span className="spinner" />
          ) : selectedFileName ? (
            <FileCheck2 size={22} />
          ) : (
            <UploadCloud size={22} />
          )}
        </span>

        <h2 className="dropzone__title">
          {loading
            ? 'Checking signature and ledger anchor'
            : selectedFileName
              ? selectedFileName
              : 'Drop the credential file here'}
        </h2>

        <p className="dropzone__note" id={hintId}>
          The .json envelope issued to you. Its Ed25519 signature and ledger anchor are
          both checked.
        </p>

        <Button
          variant="secondary"
          disabled={blocked}
          aria-describedby={hintId}
          onClick={() => fileInputRef.current?.click()}
        >
          {selectedFileName ? 'Choose another file' : 'Browse files'}
        </Button>
      </div>

      {fileError && (
        <p className="form-error" role="alert" style={{ marginTop: 'var(--space-3)' }}>
          <AlertCircle size={14} aria-hidden="true" />
          {fileError}
        </p>
      )}
    </div>
  );
}
