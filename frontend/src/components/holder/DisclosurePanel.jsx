import React, { useState } from 'react';
import { Eye, SlidersHorizontal } from 'lucide-react';
import { holderService } from '../../services/holderService';
import { Button } from '../common/Button';

/**
 * A claim value is whatever JSON the issuer attached, so an object or an
 * array has to be printed. String({}) is "[object Object]", which the
 * holder can neither read nor judge before deciding to share it.
 */
const renderValue = (value) =>
  value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value);

/**
 * The holder decides what a verifier is shown. This is presentation
 * control, not secrecy: the downloaded file always contains every
 * claim, and the copy here says so rather than implying otherwise.
 *
 * Errors are owned here rather than pushed up to the page, so a failed
 * save cannot replace the whole wallet with an error banner, and so the
 * failure is still visible when the panel has nothing loaded to show it
 * next to.
 *
 * `panelId` is the id the wallet view points its Sharing button at with
 * aria-controls, so the two agree on one element.
 */
export default function DisclosurePanel({ credentialId, token, panelId }) {
  const [claims, setClaims] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState(null);

  const open = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await holderService.getDisclosure(credentialId, token);
      const loaded = data?.claims;
      /*
       * handleResponse falls back to text() for a non-JSON content type,
       * so a malformed 200 arrives with no claims in it. That is a
       * broken response, not an empty credential: rendering it as "no
       * claims" would tell the holder something false with no way to
       * tell. A genuine claims: {} passes this and stays empty.
       */
      if (!loaded || typeof loaded !== 'object' || !Array.isArray(data?.hiddenClaims)) {
        throw new Error(
          'Your sharing settings could not be read: the server sent an unexpected response.'
        );
      }
      setClaims(loaded);
      // No policy row means nothing is hidden, so a first open shows
      // every claim shared.
      setHidden(new Set(data.hiddenClaims));
    } catch (err) {
      setError(err.message || 'Your sharing settings could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * One save path for both the tick boxes and the share/hide-everything
   * buttons, so both roll back the same way: to the selection that was
   * in force when the save started, which is the one the server still
   * holds. Rolling back to anything else would put the panel in a state
   * the holder never asked for and the server never accepted.
   */
  const save = async (next, previous) => {
    setSaving(true);
    setError(null);
    try {
      const data = await holderService.setDisclosure(credentialId, [...next], token);
      // The server's stored set is the one that counts.
      setHidden(new Set(data?.hiddenClaims ?? [...next]));
    } catch (err) {
      setHidden(previous);
      setError(err.message || 'Your choice was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key) => {
    const previous = hidden;
    const next = new Set(previous);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setHidden(next);
    save(next, previous);
  };

  const setAll = async (hideEverything) => {
    const previous = hidden;
    const next = hideEverything ? Object.keys(claims) : [];

    // Hiding everything is legitimate but drastic, and it is one
    // misclick away from feeling unrecoverable, so it is confirmed
    // rather than merely allowed.
    if (hideEverything && next.length > 0) {
      const ok = window.confirm(
        `Hide all ${next.length} claims? A verifier will see the title, ` +
          'issuer and dates, but none of the details.'
      );
      if (!ok) return;
    }

    setHidden(new Set(next));
    await save(next, previous);
  };

  if (claims === null) {
    return (
      <div id={panelId}>
        {error && (
          <p className="form-error" role="alert" style={{ marginBottom: 'var(--space-3)' }}>
            {error}
          </p>
        )}
        <Button variant="outline" size="sm" icon={Eye} onClick={open} loading={loading}>
          {error ? 'Try again' : 'What do verifiers see?'}
        </Button>
      </div>
    );
  }

  const entries = Object.entries(claims);
  const visible = entries.filter(([key]) => !hidden.has(key));

  return (
    <div id={panelId} style={{ display: 'grid', gap: 'var(--space-3)', width: '100%' }}>
      <div>
        <h3 className="section-title">What do verifiers see?</h3>
        <p className="form-helper" aria-live="polite">
          {entries.length === 0
            ? 'This credential has no claims to choose from.'
            : `${visible.length} of ${entries.length} claims are shared.`}
          {saving ? ' Saving…' : ''}
        </p>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {entries.length > 0 && (
        <>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {entries.map(([key, value]) => (
              <label key={key} className="choice">
                <input
                  type="checkbox"
                  checked={!hidden.has(key)}
                  onChange={() => toggle(key)}
                  disabled={saving}
                  aria-label={`Share the claim ${key} with verifiers`}
                />
                <span style={{ minWidth: 0 }}>
                  <span className="choice__title" style={{ display: 'block' }}>
                    {key}
                  </span>
                  <span
                    className="choice__note font-mono"
                    style={{ display: 'block', wordBreak: 'break-word' }}
                  >
                    {renderValue(value)}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAll(false)}
              disabled={saving || visible.length === entries.length}
            >
              Share everything
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAll(true)}
              disabled={saving || visible.length === 0}
            >
              Hide everything
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => setPreview((p) => !p)}
              aria-expanded={preview}
              aria-controls={`${panelId}-preview`}
            >
              {preview ? 'Back to your record' : 'Preview verifier view'}
            </Button>
          </div>

          {preview && (
            <div
              id={`${panelId}-preview`}
              style={{
                padding: 'var(--space-3)',
                background: 'var(--surface-sunken)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
              }}
            >
              <p className="form-helper" style={{ marginBottom: 'var(--space-2)' }}>
                A verifier sees exactly this:
              </p>
              {visible.length === 0 ? (
                <p className="form-helper">No claims — just the title, issuer and dates.</p>
              ) : (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 'var(--space-5)',
                    display: 'grid',
                    gap: 'var(--space-1)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {visible.map(([key, value]) => (
                    <li key={key}>
                      <span style={{ fontWeight: 500 }}>{key}</span>:{' '}
                      <span className="font-mono">{renderValue(value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {hidden.size > 0 && (
            <p className="form-helper" style={{ color: 'var(--warn)' }}>
              The downloaded file still contains every claim, including the {hidden.size} you hid.
              Sharing this file shares everything.
            </p>
          )}
        </>
      )}
    </div>
  );
}
