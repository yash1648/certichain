import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Key, 
  AlertCircle, 
  Building2, 
  Award, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_PROFILES = [
  {
    role: 'ADMIN',
    label: 'Admin',
    badge: 'Network Administrator',
    icon: ShieldAlert,
    color: 'var(--amber-primary)',
    fullName: 'System Administrator',
    email: 'admin@certichain.org',
    password: 'AdminPassword123!',
    desc: 'Access admin console, inspect system metrics & verify new institutions.'
  },
  {
    role: 'ISSUER',
    label: 'Institution',
    badge: 'Issuing Authority',
    icon: Building2,
    color: '#a855f7',
    fullName: 'Massachusetts Institute of Technology',
    email: 'registrar@mit.edu',
    password: 'IssuerPassword123!',
    desc: 'Credential Studio access, Ed25519 cryptographic key generation & issuance.'
  },
  {
    role: 'HOLDER',
    label: 'Holder',
    badge: 'Student / Graduate',
    icon: Award,
    color: 'var(--cyan-primary)',
    fullName: 'Alex Mercer',
    email: 'alex.mercer@alumni.org',
    password: 'HolderPassword123!',
    desc: 'Personal credential wallet, official diploma inspection & verification sharing.'
  }
];

export function AuthCard() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('HOLDER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { login, register, loginDemoUser, backendOnline } = useAuth();

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
        await register({ email, password, fullName, role });
        setMode('login');
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed. Please verify your input.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectDemoProfile = (profile, autoLogin = false) => {
    setEmail(profile.email);
    setPassword(profile.password);
    setRole(profile.role);
    if (mode === 'register') {
      setFullName(profile.fullName);
    }

    if (autoLogin) {
      loginDemoUser({
        role: profile.role,
        email: profile.email,
        fullName: profile.fullName
      });
    }
  };

  return (
    <div className="glass-panel glass-panel-glow animate-fade-in" style={{
      maxWidth: '540px',
      margin: '0 auto',
      padding: '36px 32px',
      position: 'relative',
      borderRadius: 'var(--radius-lg)'
    }}>
      {/* Decorative top accent badge - NO raw endpoints */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={16} color="var(--cyan-primary)" />
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cyan-primary)', fontWeight: 700 }}>
            Identity & Key Vault
          </span>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
          {mode === 'login' ? 'Decentralized Auth' : 'Self-Sovereign Identity'}
        </span>
      </div>

      <h2 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
        {mode === 'login' ? 'Sign In to CertiChain' : 'Register Identity'}
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        {mode === 'login'
          ? 'Authenticate to access your role-specific credential workspace.'
          : 'Create a new decentralized identity on the CertiChain network.'}
      </p>

      {/* Mode Switcher Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: 'rgba(4, 8, 18, 0.85)',
        padding: '5px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '24px',
        border: '1px solid var(--border-subtle)',
        gap: '4px'
      }}>
        <button
          type="button"
          onClick={() => { setMode('login'); setFormError(''); }}
          style={{
            padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            border: mode === 'login' ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.875rem',
            background: mode === 'login' ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
            color: mode === 'login' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
            boxShadow: mode === 'login' ? '0 0 15px rgba(0, 240, 255, 0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setFormError(''); }}
          style={{
            padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            border: mode === 'register' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.875rem',
            background: mode === 'register' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
            color: mode === 'register' ? 'var(--emerald-primary)' : 'var(--text-secondary)',
            boxShadow: mode === 'register' ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Register
        </button>
      </div>

      {formError && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--rose-primary)',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </div>
      )}

      {/* Account Type Selector for Registration */}
      {mode === 'register' && (
        <div style={{ marginBottom: '22px' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
            Select Account Role
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px'
          }}>
            {[
              { id: 'HOLDER', label: 'Holder', icon: Award, desc: 'Student / Recipient' },
              { id: 'ISSUER', label: 'Institution', icon: Building2, desc: 'University / Issuer' },
              { id: 'ADMIN', label: 'Admin', icon: ShieldAlert, desc: 'System Admin' }
            ].map((r) => {
              const selected = role === r.id;
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: selected ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                    background: selected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(4, 8, 18, 0.6)',
                    color: selected ? 'var(--cyan-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    textAlign: 'center',
                    boxShadow: selected ? '0 0 12px rgba(0, 240, 255, 0.2)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={18} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: selected ? '#ffffff' : 'inherit' }}>
                    {r.label}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {r.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">
              {role === 'ISSUER' ? 'Institution / University Name' : 'Full Name'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="fullName"
                type="text"
                className="input-field"
                placeholder={role === 'ISSUER' ? 'e.g. Massachusetts Institute of Technology' : 'e.g. Alex Mercer'}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ paddingLeft: '38px' }}
              />
              {role === 'ISSUER' ? (
                <Building2 size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
              ) : (
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
              )}
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
              <span style={{ fontSize: '11px', color: password.length >= 8 ? 'var(--emerald-primary)' : 'var(--text-muted)' }}>
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
          style={{ width: '100%', marginTop: '12px', height: '46px', letterSpacing: '0.04em' }}
        >
          {submitting ? (
            <span>Connecting to Secure Vault...</span>
          ) : mode === 'login' ? (
            <>
              <span>Sign In with Credentials</span>
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              <span>Register as {role === 'ADMIN' ? 'Admin' : role === 'ISSUER' ? 'Institution' : 'Holder'}</span>
              <ShieldCheck size={16} />
            </>
          )}
        </button>
      </form>

      {/* 1-Click Demo Registration & Sign In Profiles (Admin, Institution, Holder) */}
      <div style={{
        marginTop: '28px',
        paddingTop: '20px',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="var(--cyan-primary)" />
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
              Quick Demo Profiles
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            1-Click Fill & Instant Access
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DEMO_PROFILES.map((profile) => {
            const Icon = profile.icon;
            return (
              <div
                key={profile.role}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(4, 8, 18, 0.75)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: `${profile.color}20`,
                    color: profile.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                        {profile.label}
                      </span>
                      <span className="badge" style={{ fontSize: '0.65rem', padding: '1px 6px', background: `${profile.color}20`, color: profile.color, border: `1px solid ${profile.color}40` }}>
                        {profile.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => selectDemoProfile(profile, false)}
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: '0.75rem', padding: '5px 9px' }}
                    title="Fill the form with these demo credentials"
                  >
                    Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDemoProfile(profile, true)}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                    title="Instant sign in with demo credentials"
                  >
                    Instant Access
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {backendOnline === false && (
        <div style={{
          marginTop: '20px',
          padding: '12px 14px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(0, 240, 255, 0.08)',
          border: '1px solid var(--border-accent)',
          fontSize: '0.78rem',
          color: 'var(--cyan-primary)',
          textAlign: 'center',
          lineHeight: 1.5
        }}>
          💡 <strong>Sandbox Ready:</strong> Click <strong>Instant Access</strong> on any Demo Profile above to explore the Admin Center, Credential Studio, or Student Wallet immediately.
        </div>
      )}
    </div>
  );
}
