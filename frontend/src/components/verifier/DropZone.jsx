import React, { useState, useRef } from 'react';
import { UploadCloud, FileCheck2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';

export function DropZone({ onFileSelected, loading = false, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [fileError, setFileError] = useState(null);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const handleFile = (file) => {
    setFileError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setFileError('Please select a valid .json credential envelope file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('Upload exceeds the 2MB limit.');
      return;
    }

    setSelectedFileName(file.name);
    onFileSelected(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !loading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || loading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loading && !disabled && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? '#1d4ed8' : '#cbd5e1'}`,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: isDragOver ? '#eff6ff' : '#f8fafc',
          padding: '44px 24px',
          textAlign: 'center',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled || loading}
        />

        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1d4ed8',
          marginBottom: '16px',
        }}>
          {loading ? (
            <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
          ) : selectedFileName ? (
            <FileCheck2 size={28} />
          ) : (
            <UploadCloud size={28} />
          )}
        </div>

        <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          {loading
            ? 'Verifying credential with cryptographic ledger...'
            : selectedFileName
            ? `Ready to verify: ${selectedFileName}`
            : 'Drop certificate file here, or browse files'}
        </h3>

        <p style={{ fontSize: '14px', color: '#475569', maxWidth: '440px', lineHeight: 1.5, marginBottom: '18px' }}>
          Upload an official <code className="font-mono" style={{ color: '#1d4ed8', fontWeight: 600 }}>.json</code> credential envelope for instant verification.
        </p>

        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || loading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          {selectedFileName ? 'Select Another File' : 'Browse Local Files'}
        </Button>
      </div>

      {fileError && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{fileError}</span>
        </div>
      )}
    </div>
  );
}
