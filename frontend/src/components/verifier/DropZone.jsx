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
          border: `2px dashed ${isDragOver ? 'var(--cyan-primary)' : 'var(--border-accent)'}`,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: isDragOver ? 'rgba(0, 229, 255, 0.08)' : 'rgba(10, 15, 28, 0.65)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: isDragOver ? '0 0 25px rgba(0, 229, 255, 0.2)' : 'none',
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
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          backgroundColor: 'rgba(0, 229, 255, 0.1)',
          border: '1px solid var(--border-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--cyan-primary)',
          marginBottom: '16px',
        }}>
          {loading ? (
            <span className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
          ) : selectedFileName ? (
            <FileCheck2 size={32} />
          ) : (
            <UploadCloud size={32} />
          )}
        </div>

        <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {loading
            ? 'Cryptographically verifying credential envelope...'
            : selectedFileName
            ? `Ready to verify: ${selectedFileName}`
            : 'Drop credential file here, or click to browse'}
        </h3>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.5, marginBottom: '16px' }}>
          Select the downloaded <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>.json</code> envelope file signed with Ed25519. Max file size: 2MB.
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
          {selectedFileName ? 'Choose a Different File' : 'Browse Files'}
        </Button>
      </div>

      {fileError && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fb7185',
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
