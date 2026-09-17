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
    label: 'Network Admin',
    badge: 'System Administrator',
    icon: ShieldAlert,
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    fullName: 'System Administrator',
    email: 'admin@certichain.org',
    password: 'AdminPassword123!',
    desc: 'Access admin console, inspect system metrics & verify new institutions.'
  },
  {
    role: 'ISSUER',
    label: 'University Registrar',
    badge: 'Issuing Authority',
    icon: Building2,
    color: '#6b21a8',
    bg: '#faf5ff',
    border: '#e9d5ff',
    fullName: 'Massachusetts Institute of Technology',
    email: 'registrar@mit.edu',
    password: 'IssuerPassword123!',
    desc: 'Credential Studio access, Ed25519 cryptographic key generation & issuance.'
  },
  {
    role: 'HOLDER',
    label: 'Student / Graduate',
    badge: 'Credential Holder',
    icon: Award,
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
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

  const { login, register, loginDemoUser } = useAuth();

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
    <div className="glass-panel animate-fade-in" style={{
      maxWidth: '500px',
      margin: '0 auto',
      padding: '36px 32px',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: '#ffffff',
      border: '1px solid #cbd5e1',
      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1d4ed8'
          }}>
            <Key size={15} />
          </div>
          <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1d4ed8', fontWeight: 700 }}>
            Identity & Key Vault
          </span>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '11.5px' }}>
          {mode === 'login' ? 'Secure Sign In' : 'New Account'}
        </span>
      </div>

      <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
        {mode === 'login' ? 'Sign In to CertiChain' : 'Create Identity'}
      </h2>
      <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: 1.5 }}>
        {mode === 'login'
          ? 'Authenticate to access your credential workspace.'
          : 'Create a new verifiable identity on the CertiChain network.'}
      </p>

      {/* Mode Switcher Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '24px',
        border: '1px solid #e2e8f0',
        gap: '4px'
      }}>
        <button
          type="button"
          onClick={() => { setMode('login'); setFormError(''); }}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: mode === 'login' ? '1px solid #cbd5e1' : '1px solid transparent',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13.5px',
            background: mode === 'login' ? '#ffffff' : 'transparent',
            color: mode === 'login' ? '#0f172a' : '#64748b',
            boxShadow: mode === 'login' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s ease'
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
            border: mode === 'register' ? '1px solid #cbd5e1' : '1px solid transparent',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13.5px',
            background: mode === 'register' ? '#ffffff' : 'transparent',
            color: mode === 'register' ? '#0f172a' : '#64748b',
            boxShadow: mode === 'register' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Register
        </button>
      </div>

      {formError && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#b91c1c',
          fontSize: '13px'
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
              { id: 'HOLDER', label: 'Holder', icon: Award, desc: 'Student' },
              { id: 'ISSUER', label: 'University', icon: Building2, desc: 'Issuer' },
              { id: 'ADMIN', label: 'Admin', icon: ShieldAlert, desc: 'Network' }
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
                    border: selected ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                    background: selected ? '#eff6ff' : '#ffffff',
                    color: selected ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={18} />
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: selected ? '#1d4ed8' : '#0f172a' }}>
                    {r.label}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>
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
                <Building2 size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              ) : (
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
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
            <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="password">Password</label>
            {mode === 'register' && (
              <span style={{ fontSize: '11px', color: password.length >= 8 ? '#15803d' : '#64748b' }}>
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
            <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ width: '100%', marginTop: '12px', height: '42px', fontSize: '14.5px' }}
        >
          {submitting ? (
            <span>Connecting...</span>
          ) : mode === 'login' ? (
            <>
              <span>Sign In</span>
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              <span>Register Account</span>
              <ShieldCheck size={16} />
            </>
          )}
        </button>
      </form>

      {/* 1-Click Demo Profiles */}
      <div style={{
        marginTop: '28px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#1d4ed8" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              Quick Demo Personas
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
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
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: profile.bg,
                    border: `1px solid ${profile.border}`,
                    color: profile.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        {profile.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => selectDemoProfile(profile, false)}
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                    title="Fill form"
                  >
                    Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDemoProfile(profile, true)}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '12px', padding: '4px 12px' }}
                    title="Instant sign in"
                  >
                    Enter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
