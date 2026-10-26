import React from 'react';
import { IconShieldCheck } from './Icons';

/**
 * Footer - Reassuring, Patient-Focused Healthcare Footer
 * Replaces technical inference & FACS badges with a simple trust statement.
 */
export default function Footer() {
  return (
    <footer style={{
      backgroundColor: 'var(--card-bg)',
      borderTop: '1px solid var(--border-color)',
      padding: '2rem 2.5rem',
      marginTop: 'auto',
      transition: 'all var(--transition-base)',
      width: '100%'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        textAlign: 'center'
      }}>
        {/* Simple Trust Reassurance */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.45rem',
          fontSize: '0.88rem',
          fontWeight: 600,
          color: 'var(--color-primary)'
        }}>
          <IconShieldCheck size={16} />
          <span>Private &amp; Secure • Your check-ins remain confidential</span>
        </div>

        {/* Gentle Wellness Disclaimer */}
        <p style={{
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          margin: 0,
          maxWidth: '680px',
          alignSelf: 'center'
        }}>
          MindVision is designed as a gentle self-reflection tool to help you stay in touch with your well-being. It does not replace medical advice, psychological therapy, or professional diagnosis. If you ever feel in crisis, caring support is available free 24/7 by calling or texting <strong>988</strong>.
        </p>

        {/* Bottom Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <span>© 2026 MindVision Health • Caring wellness companion</span>
          <span style={{ fontSize: '0.78rem' }}>Made with care for your peace of mind</span>
        </div>
      </div>
    </footer>
  );
}
