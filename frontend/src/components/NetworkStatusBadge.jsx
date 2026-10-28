import React, { useState, useEffect } from 'react';
import { isDesktopEnvironment } from '../services/desktopBridge';

/**
 * MindVision Clinical AI - Professional Network & Offline Status Indicator
 *
 * Displays transparent real-time connectivity status adhering to design tokens.
 * Distinguishes Online (Cloud Sync Ready), Offline (Encrypted Local Vault Active),
 * and Desktop Workstation mode.
 */
export default function NetworkStatusBadge() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const isDesktop = isDesktopEnvironment();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className="network-status-badge"
      title={
        isOnline
          ? `MindVision Connected. ${isDesktop ? 'Desktop Workstation Active' : 'Web App'}. Biometrics & assessments execute 100% locally on-device.`
          : 'Offline Mode Active. No internet required. All assessments, biometric math, and reports continue operating securely on this device.'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0 0.75rem',
        height: '32px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '0.74rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        backgroundColor: isOnline
          ? 'rgba(23, 74, 58, 0.08)'
          : 'rgba(197, 139, 101, 0.12)',
        color: isOnline
          ? 'var(--color-primary, #174A3A)'
          : 'var(--color-accent, #C58B65)',
        border: `1px solid ${isOnline ? 'rgba(23, 74, 58, 0.2)' : 'rgba(197, 139, 101, 0.3)'}`,
        cursor: 'default',
        userSelect: 'none',
        transition: 'all var(--motion-fast) var(--motion-ease-out)'
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: isOnline ? '#10B981' : '#F59E0B',
          boxShadow: isOnline
            ? '0 0 6px rgba(16, 185, 129, 0.4)'
            : '0 0 6px rgba(245, 158, 11, 0.4)'
        }}
      />
      <span>
        {isDesktop
          ? (isOnline ? 'Desktop Workstation' : 'Offline Desktop')
          : (isOnline ? 'Online (Local AI)' : 'Offline (Local Safe)')}
      </span>
    </div>
  );
}
