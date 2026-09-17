import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  Download, 
  Check, 
  ShieldCheck, 
  Award, 
  Building2
} from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

export function CertificateDiplomaModal({ credential, onClose, onDownload }) {
  const [copied, setCopied] = useState(false);

  if (!credential) return null;

  const {
    title,
    type = 'Certificate',
    credentialNumber,
    issuerName = 'Authorized Issuing Institution',
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

  const handleShare = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/verify`;
    navigator.clipboard.writeText(
      `Verify my official certificate "${title}" on CertiChain: ${shareUrl} (Certificate #: ${credentialNumber})`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
    >
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Top Bar (Action Header - Hidden in Print) */}
        <div className="no-print" style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#f8fafc',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="var(--amber-primary)" />
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
              Official Verifiable Certificate View
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
              Print / Save PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={copied ? Check : Share2}
              onClick={handleShare}
            >
              {copied ? 'Link Copied!' : 'Share Proof'}
            </Button>

            {onDownload && (
              <Button
                variant="primary"
                size="sm"
                icon={Download}
                onClick={onDownload}
              >
                Download File
              </Button>
            )}

            <button
              onClick={onClose}
              className="btn btn-outline btn-sm"
              style={{ padding: '6px', minWidth: '32px' }}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body - The Diploma Canvas */}
        <div style={{ padding: '32px 28px', backgroundColor: '#e2e8f0' }}>
          <div className="diploma-canvas">
            {/* Corner Decorative Elements */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px'
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={24} color="#1e293b" />
                  <span className="font-diploma-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                    {issuerName}
                  </span>
                </div>
                {issuerDomain && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {issuerDomain}
                  </div>
                )}
              </div>

              {/* Verified Digital Seal Emblem */}
              <div className="diploma-seal">
                <ShieldCheck size={38} />
              </div>
            </div>

            {/* Diploma Main Heading */}
            <div style={{ margin: '24px 0 16px' }}>
              <span className="font-diploma-display" style={{
                fontSize: '12px',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#b45309',
                fontWeight: 700
              }}>
                Official Verifiable Credential
              </span>
              <h1 className="font-diploma-serif" style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                fontWeight: 700,
                color: '#0f172a',
                marginTop: '6px',
                letterSpacing: '-0.01em'
              }}>
                {type ? type.toUpperCase() : 'CERTIFICATE'} OF ACHIEVEMENT
              </h1>
            </div>

            <p style={{ fontStyle: 'italic', fontSize: '15px', color: '#475569', marginBottom: '12px' }}>
              This is proudly presented and permanently certified to
            </p>

            {/* Recipient Full Name */}
            <div style={{
              padding: '10px 0',
              borderBottom: '2px solid #cbd5e1',
              maxWidth: '520px',
              margin: '0 auto 20px'
            }}>
              <h2 className="font-diploma-serif" style={{
                fontSize: '2.1rem',
                fontWeight: 700,
                color: '#1e293b',
                letterSpacing: '0.02em'
              }}>
                {displayName}
              </h2>
            </div>

            <p style={{ fontStyle: 'italic', fontSize: '14.5px', color: '#475569', marginBottom: '12px' }}>
              for successful completion and authorized conferral of
            </p>

            {/* Credential Degree / Certification Title */}
            <div style={{ maxWidth: '640px', margin: '0 auto 28px' }}>
              <h3 className="font-display" style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#0369a1',
                lineHeight: 1.3
              }}>
                {title}
              </h3>
            </div>

            {/* Claims / Academic Highlights Grid */}
            {claims && Object.keys(claims).length > 0 && (
              <div style={{
                maxWidth: '560px',
                margin: '0 auto 32px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '12px'
              }}>
                {Object.entries(claims).map(([k, v]) => (
                  <div key={k} style={{
                    backgroundColor: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    fontSize: '13px'
                  }}>
                    <span style={{ color: '#64748b', textTransform: 'capitalize', marginRight: '6px' }}>
                      {k}:
                    </span>
                    <strong style={{ color: '#0f172a' }}>
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            {/* Signatures & Verification Footer */}
            <div style={{
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '24px'
            }}>
              {/* Left: Issue Date */}
              <div style={{ textAlign: 'left', minWidth: '160px' }}>
                <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '4px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                    {formatDate(issuedAt)}
                  </span>
                </div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  Date of Issue
                </span>
              </div>

              {/* Center: Tamper-Proof Digital Verification Stamp */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(5, 150, 105, 0.08)',
                  border: '1px solid rgba(5, 150, 105, 0.3)',
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  <ShieldCheck size={15} />
                  <span>Blockchain Anchored & Sealed</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  CertiChain Verified Proof
                </div>
              </div>

              {/* Right: Signature Authority */}
              <div style={{ textAlign: 'right', minWidth: '160px' }}>
                <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '4px', marginBottom: '4px' }}>
                  <span className="font-diploma-serif" style={{ fontSize: '1.1rem', fontStyle: 'italic', color: '#0369a1' }}>
                    {issuerName}
                  </span>
                </div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  Authorized Signatory
                </span>
              </div>
            </div>

            {/* Bottom Certificate Serial & Blockchain Identification */}
            <div style={{
              marginTop: '32px',
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '11.5px',
              color: '#64748b'
            }}>
              <div>
                <span>Certificate Number: </span>
                <strong className="font-mono" style={{ color: '#0f172a' }}>
                  {credentialNumber || 'N/A'}
                </strong>
              </div>

              {txHash && (
                <div>
                  <span>Ledger Proof: </span>
                  <span className="font-mono" style={{ color: '#0369a1' }}>
                    Block #{blockNumber || '1'} · {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 6)}
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
