import React from 'react';
import { Compass } from 'lucide-react';

/**
 * Unknown hash routes previously rendered an empty page between the
 * header and the footer. Say what happened and offer the way out.
 */
export function NotFound({ route }) {
  return (
    <div className="card">
      <div className="state">
        <div className="state__icon">
          <Compass size={20} aria-hidden="true" />
        </div>
        <h1 className="state__title">Page not found</h1>
        <p className="state__text">
          Nothing is routed at <code className="font-mono">{route}</code>.
        </p>
        <a className="btn btn-primary" href="#/">
          <span>Back to overview</span>
        </a>
      </div>
    </div>
  );
}
