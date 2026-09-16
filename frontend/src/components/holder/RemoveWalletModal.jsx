import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function RemoveWalletModal({ credential, onClose, onRemoved, token, holderService }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!credential) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      await holderService.removeFromWallet(credential.credentialId, token);
      onRemoved(credential.credentialId);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to remove credential from wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={!!credential}
      onClose={onClose}
      title="Remove from Wallet"
      subtitle={`Credential: ${credential.credentialNumber}`}
      maxWidth="460px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={loading} icon={Trash2}>
            Confirm Removal
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{credential.title}</strong> from your wallet?
        </p>

        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          This only removes the credential from your local wallet view. It does not delete or revoke the credential on the IPFS ledger or blockchain. You can re-add it at any time using its UUID.
        </p>

        {error && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
