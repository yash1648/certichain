import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

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
        maxWidth: '460px',
        width: '100%',
        padding: '24px',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185' }}>
            <Trash2 size={20} />
            <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Remove from Wallet
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

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{credential.title}</strong> (<code>{credential.credentialNumber}</code>) from your personal wallet?
        </p>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Note: This only removes the credential from your local wallet view. It does not affect the credential on the IPFS ledger or revoke it. You can re-add it at any time using its UUID.
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn btn-danger"
            disabled={loading}
          >
            {loading ? 'Removing...' : 'Confirm Removal'}
          </button>
        </div>
      </div>
    </div>
  );
}
