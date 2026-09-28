import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

const TONE = {
  success: { Icon: CheckCircle2, tone: 'ok', label: 'Pass' },
  error: { Icon: XCircle, tone: 'bad', label: 'Fail' },
  warning: { Icon: AlertTriangle, tone: 'warn', label: 'Warning' },
  info: { Icon: Info, tone: 'info', label: 'Info' },
};

/**
 * One line of a verification breakdown: what was checked, and whether it
 * passed. The mono variant is for hashes and addresses, which need to be
 * selectable and compared character by character.
 */
export function StatusRow({
  status = 'success',
  label,
  detail,
  monoDetail,
  extra,
}) {
  const { Icon, tone, label: toneLabel } = TONE[status] ?? TONE.info;

  return (
    <div className={`alert alert--${tone}`}>
      <Icon size={17} className="alert__icon" aria-hidden="true" />

      <div className="alert__body">
        <div className="status-row__head">
          <span className="status-row__label">{label}</span>
          <span className="status-row__tone">
            {toneLabel}
            {extra}
          </span>
        </div>

        {detail && <p className="status-row__detail">{detail}</p>}

        {monoDetail && (
          <div className="status-row__mono font-mono">{monoDetail}</div>
        )}
      </div>
    </div>
  );
}
