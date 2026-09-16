import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

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
        maxWidth: '480px',
        width: '100%',
        padding: '24px',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185' }}>
            <AlertTriangle size={20} />
            <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Revoke Credential
            </h3>
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
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          You are about to permanently revoke credential{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{credential.credentialNumber}</strong> ({credential.title}).
          This revocation status will be permanently published on the cryptographic ledger.
        </p>

        {error && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            marginBottom: '16px',
            color: '#fb7185',
            fontSize: '0.825rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="revokeReason">
              Reason for Revocation (Optional)
            </label>
            <textarea
              id="revokeReason"
              className="input-field"
              rows={3}
              placeholder="e.g. Issued in error, honor code violation, course requirements expired..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading}
            >
              {loading ? 'Revoking on Chain...' : 'Confirm Revocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
