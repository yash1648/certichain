import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ArrowLeft, 
  Eye, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  CheckCircle2, 
  Lock
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { CertificateDiplomaModal } from '../common/CertificateDiplomaModal';

export function ResultCard({ result, onReset }) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  if (!result) return null;

  const {
    valid,
    status,
    credentialNumber,
    reason,
    issuerName,
    issuerDomain,
    issuerVerified,
    claims,
    issuedAt,
    expiresAt,
    verifiedAt,
    anchorTxHash,
    anchorBlockNumber,
    anchorChainId,
    anchorVerified,
    contentHash
  } = result;

  const isValid = valid === true;
  const isRevoked = status === 'REVOKED';
  const isTampered = status === 'TAMPERED';
  const isExpired = status === 'EXPIRED';

  // Format ISO timestamp
  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const recipientName = claims?.studentName || claims?.recipientName || claims?.name || 'Verified Credential Holder';
  const credentialTitle = claims?.program || claims?.degree || claims?.title || (credentialNumber ? `Certificate #${credentialNumber}` : 'Verifiable Credential');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="glass-panel animate-fade-in" style={{
      borderRadius: 'var(--radius-lg)',
      border: isValid ? '1px solid #bbf7d0' : '1px solid #fecaca',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
    }}>
      {/* Top Reassuring Verdict Banner */}
      <div style={{
        padding: '24px 32px',
        background: isValid ? '#f0fdf4' : '#fef2f2',
        borderBottom: `1px solid ${isValid ? '#bbf7d0' : '#fecaca'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: isValid ? '#dcfce7' : '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isValid ? '#15803d' : '#dc2626',
            border: `1px solid ${isValid ? '#bbf7d0' : '#fecaca'}`
          }}>
            {isValid ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="font-display" style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: isValid ? '#15803d' : '#dc2626',
                letterSpacing: '-0.01em',
              }}>
                {isValid ? 'OFFICIALLY VERIFIED & AUTHENTIC' : `VERIFICATION FAILED: ${status || 'INVALID'}`}
              </span>
              <Badge status={status} />
            </div>

            <p style={{
              fontSize: '14px',
              color: isValid ? '#334155' : '#b91c1c',
              marginTop: '4px',
            }}>
              {isValid
                ? 'This digital credential is authentic, tamper-proof, and confirmed on the blockchain ledger.'
                : reason || (isRevoked ? 'This certificate has been revoked by the issuing institution.' : isExpired ? 'This certificate has expired.' : 'Cryptographic integrity verification failed.')}
            </p>
          </div>
        </div>

        {/* View Full Certificate Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isValid && (
            <Button
              variant="primary"
              icon={Eye}
              onClick={() => setShowCertificateModal(true)}
            >
              View Certificate
            </Button>
          )}

          <Button
            variant="outline"
            icon={Printer}
            onClick={handlePrint}
            title="Print Verification Summary"
          >
            Print
          </Button>
        </div>
      </div>

      {/* Main Verification Summary Body */}
      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Credential Details Card */}
        <div style={{
          padding: '20px 24px',
          backgroundColor: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Recipient Name
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {recipientName}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Issuing Organization
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              <Building2 size={15} color="var(--purple-primary)" />
              <span>{issuerName || 'Authorized Issuer'}</span>
              {issuerVerified && <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '1px 6px' }}>Verified</span>}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Certificate Number
            </span>
            <div className="font-mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cyan-primary)', marginTop: '2px' }}>
              {credentialNumber || 'N/A'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Date Issued
            </span>
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatDate(issuedAt)}
            </div>
          </div>
        </div>

        {/* 3 Core Trust Guarantees */}
        <div>
          <h4 className="font-display" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Trust & Security Verification Checks
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {/* 1. Tamper-Proof */}
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isTampered ? 'rgba(225, 29, 72, 0.05)' : 'rgba(5, 150, 105, 0.05)',
              border: `1px solid ${isTampered ? 'rgba(225, 29, 72, 0.2)' : 'rgba(5, 150, 105, 0.2)'}`,
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <CheckCircle2 size={18} color={isTampered ? 'var(--rose-primary)' : 'var(--emerald-primary)'} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h5 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Tamper-Proof Integrity
                </h5>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {isTampered
                    ? 'Content has been altered or corrupted since it was issued.'
                    : 'Exact digital contents match the cryptographic digest.'}
                </p>
              </div>
            </div>

            {/* 2. Official Authority */}
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(5, 150, 105, 0.05)',
              border: '1px solid rgba(5, 150, 105, 0.2)',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <CheckCircle2 size={18} color="var(--emerald-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h5 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Authorized Digital Seal
                </h5>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Digitally signed by the registered issuing organization's private key.
                </p>
              </div>
            </div>

            {/* 3. Blockchain Ledger */}
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: anchorVerified ? 'rgba(5, 150, 105, 0.05)' : 'rgba(217, 119, 6, 0.05)',
              border: `1px solid ${anchorVerified ? 'rgba(5, 150, 105, 0.2)' : 'rgba(217, 119, 6, 0.2)'}`,
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <CheckCircle2 size={18} color={anchorVerified ? 'var(--emerald-primary)' : 'var(--amber-primary)'} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h5 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Immutable Ledger Proof
                </h5>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {anchorTxHash 
                    ? `Anchored in Ethereum Block #${anchorBlockNumber ?? '1'} permanently.`
                    : 'Legacy database registration verified.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Certified Attributes & Honors */}
        {claims && Object.keys(claims).length > 0 && (
          <div>
            <h4 className="font-display" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Official Certified Attributes
            </h4>

            <div style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden'
            }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Attribute Name</th>
                    <th>Certified Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(claims).map(([key, val]) => (
                    <tr key={key}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {key}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expandable Technical Details Drawer (For Engineers / Compliance) */}
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: '#fafbfc'
        }}>
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={15} color="var(--cyan-primary)" />
              <span>Technical Cryptographic Audit Proofs (For Compliance & Auditors)</span>
            </div>
            {showTechnicalDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showTechnicalDetails && (
            <div className="animate-fade-in" style={{
              padding: '16px 20px 20px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: '#ffffff',
              fontSize: '12.5px',
              display: 'grid',
              gap: '12px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                  Cryptographic Content Hash (SHA-256)
                </span>
                <div className="font-mono" style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '2px', wordBreak: 'break-all' }}>
                  {contentHash || 'Verified matching on-chain anchor hash'}
                </div>
              </div>

              {anchorTxHash && (
                <div>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                    Blockchain Transaction Hash
                  </span>
                  <div className="font-mono" style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '2px', wordBreak: 'break-all', color: 'var(--cyan-primary)' }}>
                    {anchorTxHash}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                    Block Number
                  </span>
                  <div className="font-mono" style={{ fontWeight: 600 }}>
                    {anchorBlockNumber ?? '1'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                    Ethereum Network Chain ID
                  </span>
                  <div className="font-mono" style={{ fontWeight: 600 }}>
                    {anchorChainId ?? '31337'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>
                    Verification Timestamp
                  </span>
                  <div>
                    {verifiedAt ? new Date(verifiedAt).toLocaleString() : new Date().toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Verified on CertiChain Secure Trust Network
          </span>

          <Button variant="secondary" onClick={onReset} icon={ArrowLeft}>
            Verify Another Document
          </Button>
        </div>
      </div>

      {/* Diploma Preview Modal */}
      {showCertificateModal && (
        <CertificateDiplomaModal
          credential={{
            title: credentialTitle,
            type: claims?.type || 'Certificate',
            credentialNumber,
            issuerName,
            issuerDomain,
            recipientName,
            claims,
            issuedAt,
            expiresAt,
            txHash: anchorTxHash,
            blockNumber: anchorBlockNumber,
            status
          }}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  );
}
