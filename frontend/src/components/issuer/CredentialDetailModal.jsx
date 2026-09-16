import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, X, HardDrive, Key, FileText } from 'lucide-react';

export function CredentialDetailModal({ credential, onClose }) {
  const [copiedField, setCopiedField] = useState(null);

  if (!credential) return null;

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-cyan">{credential.type}</span>
              <span className={`badge ${credential.status === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'}`}>
                {credential.status}
              </span>
            </div>
            <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {credential.title}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Credential Number: <code className="font-mono" style={{ color: 'var(--cyan-primary)' }}>{credential.credentialNumber}</code>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cryptographic Details List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.825rem' }}>
          
          {/* IPFS CID */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--emerald-primary)', fontWeight: 600 }}>
                <HardDrive size={15} />
                <span>IPFS Content Identifier (CID)</span>
              </div>
              <button
                onClick={() => copyToClipboard(credential.ipfsCid, 'ipfs')}
                className="btn btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                {copiedField === 'ipfs' ? <Check size={12} color="var(--emerald-primary)" /> : <Copy size={12} />}
                <span>{copiedField === 'ipfs' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <code className="font-mono" style={{ color: '#6ee7b7', wordBreak: 'break-all', fontSize: '0.78rem' }}>
              {credential.ipfsCid}
            </code>
          </div>

          {/* Content Hash */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan-primary)', fontWeight: 600 }}>
                <FileText size={15} />
                <span>Canonical Content Hash (SHA-256)</span>
              </div>
              <button
                onClick={() => copyToClipboard(credential.contentHash, 'hash')}
                className="btn btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                {copiedField === 'hash' ? <Check size={12} color="var(--emerald-primary)" /> : <Copy size={12} />}
                <span>{copiedField === 'hash' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <code className="font-mono" style={{ color: 'var(--cyan-primary)', wordBreak: 'break-all', fontSize: '0.78rem' }}>
              {credential.contentHash}
            </code>
          </div>

          {/* Digital Signature & Key ID */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--purple-primary)', fontWeight: 600 }}>
                <Key size={15} />
                <span>Digital Signature ({credential.signatureAlgorithm || 'Ed25519'})</span>
              </div>
              <button
                onClick={() => copyToClipboard(credential.signature, 'sig')}
                className="btn btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                {copiedField === 'sig' ? <Check size={12} color="var(--emerald-primary)" /> : <Copy size={12} />}
                <span>{copiedField === 'sig' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <code className="font-mono" style={{ color: '#c4b5fd', wordBreak: 'break-all', fontSize: '0.75rem', display: 'block', maxHeight: '60px', overflowY: 'auto' }}>
              {credential.signature}
            </code>
            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Signing Key ID: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{credential.keyId}</span>
            </div>
          </div>

          {/* Timestamps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Issued At:</span>
              <div className="font-mono" style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                {new Date(credential.issuedAt).toLocaleString()}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Expires At:</span>
              <div className="font-mono" style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                {credential.expiresAt ? new Date(credential.expiresAt).toLocaleString() : 'Permanent (No Expiry)'}
              </div>
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 20px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
