import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function RevokeModal({ credential, onClose, onRevoked, token, issuerService }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!credential) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await issuerService.revokeCredential(credential.id, reason, token);
      onRevoked(credential.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to revoke credential.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={!!credential}
      onClose={onClose}
      title="Revoke Credential"
      subtitle={`Permanently invalidate ${credential.credentialNumber}`}
      maxWidth="480px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSubmit} loading={loading}>
            Confirm Revocation
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="alert alert--bad" role="alert">
          <AlertTriangle size={18} className="alert__icon" aria-hidden="true" />
          <div className="alert__body">
            You are revoking <strong>{credential.credentialNumber}</strong> ({credential.title}). This revocation will be permanently recorded in the cryptographic registry.
          </div>
        </div>

        {error && (
          <div className="alert alert--bad" role="alert">
            <AlertTriangle size={18} className="alert__icon" aria-hidden="true" />
            <div className="alert__body">{error}</div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="revokeReason">
            Reason for Revocation (Optional)
          </label>
          <textarea
            id="revokeReason"
            className="textarea-field"
            rows={3}
            placeholder="e.g. Academic misconduct, issued in error, requirements superseded..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>
    </Modal>
  );
}
