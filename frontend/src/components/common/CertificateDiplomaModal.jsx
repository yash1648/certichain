import React from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  Award, 
  Building2
} from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

export function CertificateDiplomaModal({ credential, issuerName: issuerNameProp, onClose, onDownload }) {
  if (!credential) return null;

  const {
    title,
    type = 'Certificate',
    credentialNumber,
    issuerName = issuerNameProp || 'Issuing Institution',
    issuerDomain,
    recipientName,
    subjectId,
    claims = {},
    issuedAt,
    txHash,
    blockNumber,
    status = 'ACTIVE'
  } = credential;

  // Format Dates
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine recipient display name
  const displayName = recipientName || claims.studentName || claims.recipientName || claims.name || (subjectId ? `ID: ${subjectId.substring(0, 13)}...` : 'Certified Recipient');

  return (
    <div 
      className="modal-overlay animate-fade-in"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(8px, 2.5vw, 20px)',
        overflowY: 'auto'
      }}
    >
      <div 
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '94vh',
          overflowY: 'auto',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-overlay)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Top Bar (Action Header - Hidden in Print) */}
        <div className="no-print" style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          backgroundColor: 'var(--surface-sunken)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>
              Official Verifiable Credential
            </span>
            <Badge status={status} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              title="Print or Save as PDF"
            >
              Print / PDF
            </Button>

            {onDownload && (
              <Button
                variant="primary"
                size="sm"
                icon={Download}
                onClick={onDownload}
              >
                Download Envelope
              </Button>
            )}

            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px', minWidth: '32px' }}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body - The Diploma Canvas */}
        <div style={{ padding: 'clamp(var(--space-3), 3vw, var(--space-6))', backgroundColor: 'var(--surface-sunken)' }}>
          <div className="diploma-canvas">
            {/* Header: Institution & Seal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 'var(--space-5)',
              gap: 'var(--space-3)'
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={24} style={{ color: 'var(--ink)', flexShrink: 0 }} />
                  <span className="font-diploma-serif" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', fontWeight: 700, color: 'var(--ink)' }}>
                    {issuerName}
                  </span>
                </div>
                {issuerDomain && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: '2px' }}>
                    {issuerDomain}
                  </div>
                )}
              </div>

              {/* Verified Digital Seal Emblem */}
              <div className="diploma-seal">
                <ShieldCheck size={36} />
              </div>
            </div>

            {/* Diploma Main Heading */}
            <div style={{ margin: 'var(--space-4) 0' }}>
              <span className="font-diploma-display" style={{
                fontSize: '0.75rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--ink-secondary)',
                fontWeight: 700
              }}>
                Official Verifiable Credential
              </span>
              <h1 className="font-diploma-serif" style={{
                fontSize: 'clamp(1.5rem, 3.5vw, 2.35rem)',
                fontWeight: 700,
                color: 'var(--ink)',
                marginTop: '6px',
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                {type ? type.toUpperCase() : 'CERTIFICATE'} OF CONFERRAL
              </h1>
            </div>

            <p style={{ fontStyle: 'italic', fontSize: 'clamp(0.85rem, 1.8vw, var(--text-md))', color: 'var(--ink-secondary)', marginBottom: 'var(--space-3)' }}>
              This is officially conferred and cryptographically certified to
            </p>

            {/* Recipient Full Name */}
            <div style={{
              padding: '6px 0',
              borderBottom: '2px solid var(--line-strong)',
              maxWidth: '520px',
              margin: '0 auto var(--space-4)'
            }}>
              <h2 className="font-diploma-serif" style={{
                fontSize: 'clamp(1.5rem, 3.2vw, 2.15rem)',
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '0.01em',
                lineHeight: 1.2
              }}>
                {displayName}
              </h2>
            </div>

            <p style={{ fontStyle: 'italic', fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: 'var(--space-3)' }}>
              for successful completion and authorized award of
            </p>

            {/* Credential Degree / Certification Title */}
            <div style={{ maxWidth: '640px', margin: '0 auto var(--space-5)' }}>
              <h3 className="font-display" style={{
                fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
                fontWeight: 700,
                color: 'var(--accent-hover)',
                lineHeight: 1.3
              }}>
                {title}
              </h3>
            </div>

            {/* Claims / Academic Highlights Grid */}
            {claims && Object.keys(claims).length > 0 && (
              <div style={{
                maxWidth: '580px',
                margin: '0 auto var(--space-5)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px'
              }}>
                {Object.entries(claims).map(([k, v]) => (
                  <div key={k} style={{
                    backgroundColor: 'var(--surface)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line)',
                    boxShadow: 'var(--shadow-sm)',
                    fontSize: 'var(--text-xs)'
                  }}>
                    <span style={{ color: 'var(--ink-secondary)', textTransform: 'capitalize', marginRight: '6px' }}>
                      {k}:
                    </span>
                    <strong style={{ color: 'var(--ink)' }}>
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            {/* Signatures & Verification Footer */}
            <div style={{
              marginTop: 'var(--space-6)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px dashed var(--line-strong)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-4)'
            }}>
              {/* Left: Issue Date */}
              <div style={{ textAlign: 'left', flex: '1 1 130px' }}>
                <div style={{ borderBottom: '1px solid var(--ink-secondary)', paddingBottom: '4px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>
                    {formatDate(issuedAt)}
                  </span>
                </div>
                <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
                  Date of Conferral
                </span>
              </div>

              {/* Center: Tamper-Proof Digital Verification Stamp */}
              <div style={{ textAlign: 'center', flex: '1 1 160px', padding: '0 4px' }}>
                <div className="badge badge--ok" style={{ padding: '4px 12px', fontSize: 'var(--text-xs)' }}>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Blockchain Anchored & Sealed</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)', marginTop: '4px' }}>
                  CertiChain Cryptographic Verification
                </div>
              </div>

              {/* Right: Signature Authority */}
              <div style={{ textAlign: 'right', flex: '1 1 130px' }}>
                <div style={{ borderBottom: '1px solid var(--ink-secondary)', paddingBottom: '4px', marginBottom: '4px' }}>
                  <span className="font-diploma-serif" style={{ fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--ink)' }}>
                    {issuerName}
                  </span>
                </div>
                <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
                  Authorized Signatory
                </span>
              </div>
            </div>

            {/* Bottom Certificate Serial & Blockchain Identification */}
            <div style={{
              marginTop: 'var(--space-5)',
              padding: '10px 14px',
              backgroundColor: 'var(--surface-sunken)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: 'var(--text-xs)',
              color: 'var(--ink-secondary)',
              wordBreak: 'break-word'
            }}>
              <div>
                <span>Certificate Number: </span>
                <strong className="font-mono" style={{ color: 'var(--ink)', wordBreak: 'break-all' }}>
                  {credentialNumber || 'N/A'}
                </strong>
              </div>

              {txHash && (
                <div>
                  <span>Ledger Proof: </span>
                  <span className="font-mono" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>
                    Block #{blockNumber || 'N/A'} &bull; {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 6)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
