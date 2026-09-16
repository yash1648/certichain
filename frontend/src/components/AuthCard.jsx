import React, { useState } from 'react';
import { Lock, Mail, User, ArrowRight, ShieldCheck, Key, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthCard() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { login, register, backendOnline } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (mode === 'register' && !fullName.trim()) {
      setFormError('Full Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, fullName });
        // After successful registration, switch to login tab with pre-filled email
        setMode('login');
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed. Please verify your input.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('demo.holder@certichain.org');
    setPassword('SecurePass123!');
    if (mode === 'register') {
      setFullName('Alex Mercer');
    }
  };

  return (
    <div className="glass-panel glass-panel-glow animate-fade-in" style={{
      maxWidth: '460px',
      margin: '0 auto',
      padding: '32px 28px',
      position: 'relative'
    }}>
      {/* Decorative top accent badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={16} color="var(--cyan-primary)" />
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cyan-primary)', fontWeight: 600 }}>
            Identity & Key Vault
          </span>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
          {mode === 'login' ? 'POST /api/auth/login' : 'POST /api/auth/register'}
        </span>
      </div>

      <h2 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '6px' }}>
        {mode === 'login' ? 'Sign In to CertiChain' : 'Register Identity'}
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        {mode === 'login'
          ? 'Authenticate to issue, hold, or verify cryptographic credentials.'
          : 'Create a decentralized identity holder account on the SSD-CVE network.'}
      </p>

      {/* Mode Switcher Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: 'rgba(0, 0, 0, 0.35)',
        padding: '4px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '24px',
        border: '1px solid var(--border-subtle)'
      }}>
        <button
          type="button"
          onClick={() => { setMode('login'); setFormError(''); }}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            background: mode === 'login' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
            color: mode === 'login' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
            borderBottom: mode === 'login' ? '2px solid var(--cyan-primary)' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setFormError(''); }}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            background: mode === 'register' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: mode === 'register' ? 'var(--emerald-primary)' : 'var(--text-secondary)',
            borderBottom: mode === 'register' ? '2px solid var(--emerald-primary)' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          Register
        </button>
      </div>

      {formError && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#fb7185',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <div style={{ position: 'relative' }}>
              <input
                id="fullName"
                type="text"
                className="input-field"
                placeholder="e.g. Alice Vance"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ paddingLeft: '38px' }}
              />
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="email">Email Address</label>
          <div style={{ position: 'relative' }}>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="name@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ paddingLeft: '38px' }}
            />
            <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="password">Password</label>
            {mode === 'register' && (
              <span style={{ fontSize: '0.72rem', color: password.length >= 8 ? 'var(--emerald-primary)' : 'var(--text-muted)' }}>
                {password.length >= 8 ? '✓ Length OK' : 'Min 8 characters'}
              </span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
              style={{ paddingLeft: '38px' }}
            />
            <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
          </div>
        </div>

        <button
          type="submit"
          className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-emerald'}`}
          disabled={submitting}
          style={{ width: '100%', marginTop: '10px', height: '46px' }}
        >
          {submitting ? (
            <span>Connecting to Backend...</span>
          ) : mode === 'login' ? (
            <>
              <span>Sign In with Credentials</span>
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              <span>Create Holder Account</span>
              <ShieldCheck size={16} />
            </>
          )}
        </button>
      </form>

      {/* Demo account quick fill button */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8rem'
      }}>
        <span style={{ color: 'var(--text-muted)' }}>Quick testing?</span>
        <button
          type="button"
          onClick={fillDemoAccount}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--cyan-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8rem',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <Sparkles size={13} />
          <span>Fill Demo Sample</span>
        </button>
      </div>

      {backendOnline === false && (
        <div style={{
          marginTop: '16px',
          padding: '10px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid rgba(244, 63, 94, 0.2)',
          fontSize: '0.75rem',
          color: '#fb7185',
          textAlign: 'center'
        }}>
          Backend on port 6969 is not reachable. Please ensure the Spring Boot server (`./mvnw spring-boot:run`) is started.
        </div>
      )}
    </div>
  );
}
