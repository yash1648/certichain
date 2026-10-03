import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { QrCodeDisplay } from './QrCodeDisplay';
import { buildEnvelopeFromCredential } from '../../utils/qrUtils';

export function CredentialQrModal({
  credential,
  onClose,
  onOpenVerifier,
}) {
  if (!credential) return null;

  const envelope = buildEnvelopeFromCredential(credential);
  const {
    title = 'Verifiable Credential',
    credentialNumber = credential.id,
    issuerName = 'Accredited Issuer',
    status = 'ACTIVE',
  } = credential;

  return (
    <Modal
      isOpen={!!credential}
      onClose={onClose}
      title="Credential QR Verification Code"
      subtitle="Scan with CertiChain Verifier to confirm cryptographic signatures and ledger proof"
      maxWidth="500px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          {onOpenVerifier ? (
            <Button
              variant="outline"
              size="sm"
              icon={ExternalLink}
              onClick={() => {
                onClose();
                onOpenVerifier(envelope);
              }}
            >
              Verify in Verifier
            </Button>
          ) : <span />}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Credential Overview Card */}
        <div
          style={{
            width: '100%',
            padding: '12px 14px',
            backgroundColor: 'var(--surface-sunken)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>
              {title}
            </div>
            <div className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
              {credentialNumber} &bull; {issuerName}
            </div>
          </div>
          <Badge status={status} />
        </div>

        {/* The QR Code */}
        <QrCodeDisplay
          value={envelope}
          size={240}
          downloadFilename={`${credentialNumber}-qr.png`}
          showActions={true}
        />

        {/* Security Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--text-xs)',
            color: 'var(--ink-secondary)',
            backgroundColor: 'var(--ok-subtle)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--ok-line)',
            width: '100%',
          }}
        >
          <ShieldCheck size={16} style={{ color: 'var(--ok)', flexShrink: 0 }} />
          <span>
            This QR code encapsulates the complete signed envelope, including Ed25519 issuer signatures and the SHA-256 payload hash.
          </span>
        </div>
      </div>
    </Modal>
  );
}
