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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './common/Badge';

/*
 * These mirror DemoDataSeeder exactly. They are the only way to reach the
 * issuer and admin workspaces, because self-registration is restricted
 * to credential holders.
 */
const DEMO_PROFILES = [
  {
    role: 'HOLDER',
    roleBadge: 'Alumni Holder',
    name: 'Alex Mercer',
    label: 'Credential holder',
    note: 'Alex Mercer',
    icon: Award,
    email: 'alex.mercer@alumni.org',
    password: 'DemoHolder123!',
    workspace: 'View claimed diplomas, inspect cryptographic signatures, export proofs',
  },
  {
    role: 'ISSUER',
    roleBadge: 'Issuing Authority',
    name: 'MIT Registrar Office',
    label: 'Issuing institution',
    note: 'MIT Registrar',
    icon: Building2,
    email: 'registrar@mit.edu',
    password: 'DemoIssuer123!',
    workspace: 'Issue accredited credentials, manage Ed25519 signing keys, revoke certificates',
  },
  {
    role: 'ADMIN',
    roleBadge: 'Registry Admin',
    name: 'System Administrator',
    label: 'Registry administrator',
    note: 'System Administrator',
    icon: ShieldAlert,
    email: 'admin@certichain.org',
    password: 'DemoAdmin123!',
    workspace: 'Authorize accredited institutions, review global audit logs, promote users',
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthCard() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, loginDemoUser } = useAuth();

  const switchMode = (next) => {
    setMode(next);
    setFormError('');
    setFieldErrors({});
  };

  /* Mirrors RegisterRequest's bean validation so the user is told what
     is wrong before a round trip. The server remains the authority. */
  const validate = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_RE.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (mode === 'register' && password.length < 8) {
      errors.password = 'Must be at least 8 characters';
    } else if (password.length > 72) {
      errors.password = 'Must be 72 characters or fewer';
    }

    if (mode === 'register' && !fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, fullName });
        // Self-registration always yields a holder account, so the
        // natural next step is signing in with what was just created.
        setMode('login');
        setPassword('');
      }
    } catch (err) {
      setFormError(err.message || 'Request failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const applyDemo = (profile, signInImmediately) => {
    setEmail(profile.email);
    setPassword(profile.password);
    setFullName(profile.name || profile.note);
    setFormError('');
    setFieldErrors({});
    setMode('login');

    if (signInImmediately) {
      setSubmitting(true);
      loginDemoUser({ role: profile.role, email: profile.email, fullName: profile.name || profile.note })
        .catch((err) => setFormError(err.message || 'Demo sign-in failed.'))
        .finally(() => setSubmitting(false));
    }
  };

  const passwordHint =
    mode === 'register'
      ? password.length >= 8
        ? `${password.length} characters`
        : 'Minimum 8 characters'
      : null;

  return (
    <div className="auth">
      <div className="auth__panel card">
        <div className="auth__head">
          <span className="auth__mark">
            <Key size={15} aria-hidden="true" />
          </span>
          <div>
            <h1 className="auth__title">
              {mode === 'login' ? 'Sign in' : 'Create an account'}
            </h1>
            <p className="auth__sub">
              {mode === 'login'
                ? 'Access your credential workspace.'
                : 'New accounts are credential holders.'}
            </p>
          </div>
        </div>

        <div className="segmented" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`segmented__item${mode === 'login' ? ' is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`segmented__item${mode === 'register' ? ' is-active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        {formError && (
          <div className="alert alert--bad" role="alert">
            <AlertCircle size={17} className="alert__icon" aria-hidden="true" />
            <div className="alert__body">{formError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <Field
              id="fullName"
              label="Full name"
              error={fieldErrors.fullName}
              icon={User}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="Alex Mercer"
            />
          )}

          <Field
            id="email"
            label="Email address"
            type="email"
            error={fieldErrors.email}
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="name@organisation.com"
          />

          <Field
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            error={fieldErrors.password}
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="••••••••••"
            hint={passwordHint}
            trailing={
              <button
                type="button"
                className="field__trailing"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            }
          />

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                <span>Working</span>
              </>
            ) : mode === 'login' ? (
              <>
                <span>Sign in</span>
                <ArrowRight size={16} aria-hidden="true" />
              </>
            ) : (
              <>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>Create account</span>
              </>
            )}
          </button>
        </form>
      </div>

      <aside className="card auth__demo">
        <div className="card__header" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Pre-configured Sandbox Roles
            </h2>
            <span className="badge badge--ok" style={{ fontSize: '0.6875rem' }}>Instant Evaluation</span>
          </div>
          <p className="section-note" style={{ margin: 0, fontSize: '0.8125rem' }}>
            Fully populated demo roles ready for live testing. Click <strong>1-Click Sign In</strong> to explore the full dashboard.
          </p>
        </div>

        <div className="demo-list">
          {DEMO_PROFILES.map((profile) => {
            const Icon = profile.icon;
            return (
              <div key={profile.role} className="demo-list__item">
                <div className="demo-list__main">
                  <span className="demo-list__icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <div className="demo-list__details">
                    <div className="demo-list__header">
                      <span className="demo-list__name">{profile.name}</span>
                      <Badge status={profile.role} text={profile.roleBadge} />
                    </div>
                    <p className="demo-list__note">{profile.workspace}</p>
                    <div className="demo-list__creds">
                      <code>{profile.email}</code>
                    </div>
                  </div>
                </div>

                <div className="demo-list__actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyDemo(profile, true)}
                    disabled={submitting}
                  >
                    <span>1-Click Sign In</span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => applyDemo(profile, false)}
                    title="Populate sign-in credentials into the form"
                  >
                    Fill form
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="auth__demo-note">
          <p style={{ margin: 0 }}>
            <strong>Institutional Security Note:</strong> Issuing institutions and registry governors require cryptographic authorization and cannot be self-registered. Registration creates a holder account.
          </p>
        </div>
      </aside>
    </div>
  );
}

/* One field, wired for assistive tech: the error is announced and tied
   to the input via aria-describedby. */
function Field({
  id,
  label,
  type = 'text',
  icon: Icon,
  error,
  hint,
  trailing,
  ...rest
}) {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>

      <div className="field">
        {Icon && <Icon size={15} className="field__icon" aria-hidden="true" />}
        <input
          id={id}
          type={type}
          className="input-field field__input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {trailing}
      </div>

      {error && (
        <p className="form-error" id={errorId}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="form-helper" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}
