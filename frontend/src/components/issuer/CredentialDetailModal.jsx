import React, { useState } from 'react';
import { HardDrive, Key, FileText, Link2, Copy, Check, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export function CredentialDetailModal({ credential, onClose, onOpenRevoke }) {
  const [copiedField, setCopiedField] = useState(null);

  if (!credential) return null;

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const isRevoked = credential.status === 'REVOKED';

  return (
    <Modal
      isOpen={!!credential}
      onClose={onClose}
      title={credential.title}
      subtitle={`Credential Number: ${credential.credentialNumber}`}
      maxWidth="680px"
      footer={
        <>
          {!isRevoked && onOpenRevoke && (
            <Button
              variant="danger"
              size="sm"
              icon={AlertTriangle}
              onClick={() => {
                onClose();
                onOpenRevoke(credential);
              }}
            >
              Revoke Credential
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status & Type Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '12px 14px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Credential Type:</span>
            <Badge text={credential.type} variant="cyan" />
          </div>
          <Badge status={credential.status} />
        </div>

        {/* Blockchain Anchor Details */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan-primary)', fontWeight: 600, fontSize: '13px' }}>
              <Link2 size={16} />
              <span>On-Chain Blockchain Anchor</span>
            </div>
            {credential.txHash && (
              <button
                onClick={() => copyToClipboard(credential.txHash, 'txHash')}
                className="btn btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              >
                {copiedField === 'txHash' ? <Check size={12} color="var(--emerald-primary)" /> : <Copy size={12} />}
                <span>{copiedField === 'txHash' ? 'Copied' : 'Copy Tx'}</span>
              </button>
            )}
          </div>

          {credential.txHash ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Block Number: <strong style={{ color: 'var(--text-primary)' }}>{credential.blockNumber ?? '1'}</strong></span>
                <span>Chain ID: <strong style={{ color: 'var(--text-primary)' }}>{credential.chainId ?? '31337'}</strong></span>
              </div>
              <code className="font-mono" style={{ color: 'var(--cyan-primary)', fontSize: '12px', wordBreak: 'break-all' }}>
                {credential.txHash}
              </code>
            </div>
          ) : (
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              No on-chain anchor recorded (legacy credential).
            </span>
          )}
        </div>

        {/* IPFS CID */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--emerald-primary)', fontWeight: 600, fontSize: '13px' }}>
              <HardDrive size={16} />
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
          <code className="font-mono" style={{ color: '#6ee7b7', fontSize: '12px', wordBreak: 'break-all' }}>
            {credential.ipfsCid || 'N/A'}
          </code>
        </div>

        {/* Content Hash */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan-primary)', fontWeight: 600, fontSize: '13px' }}>
              <FileText size={16} />
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
          <code className="font-mono" style={{ color: 'var(--cyan-primary)', fontSize: '12px', wordBreak: 'break-all' }}>
            {credential.contentHash || 'N/A'}
          </code>
        </div>

        {/* Signature & Key ID */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--purple-primary)', fontWeight: 600, fontSize: '13px' }}>
              <Key size={16} />
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
          <code className="font-mono" style={{
            color: '#c4b5fd',
            fontSize: '11.5px',
            wordBreak: 'break-all',
            display: 'block',
            maxHeight: '64px',
            overflowY: 'auto',
          }}>
            {credential.signature || 'N/A'}
          </code>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Key ID: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{credential.keyId || 'N/A'}</span>
          </div>
        </div>

        {/* Timestamps Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Issued At</span>
            <div className="font-mono" style={{ color: 'var(--text-primary)', marginTop: '3px', fontSize: '13px' }}>
              {credential.issuedAt ? new Date(credential.issuedAt).toLocaleString() : 'N/A'}
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Expires At</span>
            <div className="font-mono" style={{ color: 'var(--text-primary)', marginTop: '3px', fontSize: '13px' }}>
              {credential.expiresAt ? new Date(credential.expiresAt).toLocaleString() : 'Permanent (No Expiry)'}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
