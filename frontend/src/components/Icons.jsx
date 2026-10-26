import React from 'react';

/**
 * MindVision Clinical AI - Cohesive SVG Icon System
 * 
 * Production-grade SVG icons stroke-matched to 2.0px strokeWidth,
 * currentColor inheritance, 24x24 viewBox, and accessible semantics.
 */

const defaultProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  style: { flexShrink: 0 }
};

export function IconSparkles({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

export function IconShieldCheck({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconLock({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function IconMic({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

export function IconVideo({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="m22 8-6 4 6 4V8Z" />
      <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
  );
}

export function IconEar({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" />
      <path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 0 4 0" />
    </svg>
  );
}

export function IconClock({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconMessageSquare({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function IconCalendar({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </svg>
  );
}

export function IconBookOpen({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export function IconUsers({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconLifeBuoy({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="4.93" x2="9.17" y1="4.93" y2="9.17" />
      <line x1="14.83" x2="19.07" y1="14.83" y2="19.07" />
      <line x1="14.83" x2="19.07" y1="9.17" y2="4.93" />
      <line x1="14.83" x2="9.17" y1="9.17" y2="14.83" />
      <line x1="4.93" x2="9.17" y1="19.07" y2="14.83" />
    </svg>
  );
}

export function IconArrowRight({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <line x1="5" x2="19" y1="12" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function IconChevronRight({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function IconChevronLeft({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function IconActivity({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function IconHeartPulse({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  );
}

export function IconSun({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function IconMoon({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function IconUserCheck({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

export function IconStethoscope({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  );
}

export function IconCheck({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconCheckCircle2({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconTrendingUp({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

export function IconRefreshCw({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

export function IconSliders({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="1" x2="7" y1="14" y2="14" />
      <line x1="9" x2="15" y1="8" y2="8" />
      <line x1="17" x2="23" y1="16" y2="16" />
    </svg>
  );
}

export function IconLeaf({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

export function IconBrain({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function IconStar({ size = 16, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function IconBuilding({ size = 16, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

export function IconThumbsUp({ size = 16, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

export function IconGift({ size = 16, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 4.8 0 0 1 12 8a4.8 4.8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

export function IconPhone({ size = 16, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function IconEdit({ size = 16, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function IconVolume2({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function IconX({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconDownload({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

export function IconFileText({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}

export function IconArrowLeft({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export function IconAlertTriangle({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

export function IconAlertCircle({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

export function IconMenu({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

export function IconChevronDown({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconPrinter({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

export function IconTrash({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

export function IconEye({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconSmile({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" x2="9.01" y1="9" y2="9" />
      <line x1="15" x2="15.01" y1="9" y2="9" />
    </svg>
  );
}

export function IconTrash2({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

export function IconPlus({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  );
}

export function IconHand({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M18 11V6a2 2 0 0 0-4 0v4" />
      <path d="M14 10V4a2 2 0 0 0-4 0v7" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}

export function IconCoffee({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" x2="6" y1="1" y2="4" />
      <line x1="10" x2="10" y1="1" y2="4" />
      <line x1="14" x2="14" y1="1" y2="4" />
    </svg>
  );
}

export function IconPlay({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export function IconPause({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

export function IconSquare({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

export function IconVolumeX({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" x2="16" y1="9" y2="15" />
      <line x1="16" x2="22" y1="9" y2="15" />
    </svg>
  );
}

export function IconSunMedium({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1" />
      <path d="M12 20v1" />
      <path d="M3 12h1" />
      <path d="M20 12h1" />
      <path d="m18.36 5.64-.7.7" />
      <path d="m6.34 17.66-.7.7" />
      <path d="m5.64 5.64.7.7" />
      <path d="m17.66 17.66.7.7" />
    </svg>
  );
}

export function IconMoonStar({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      <path d="M19 3v4" />
      <path d="M21 5h-4" />
    </svg>
  );
}

export function IconBarChart2({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

export function IconSearch({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
  );
}

export function IconBell({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function IconBellOff({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
      <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <line x1="1" x2="23" y1="1" y2="23" />
    </svg>
  );
}

export function IconTarget({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function IconWind({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

export function IconCompass({ size = 18, className = '', style = {} }) {
  return (
    <svg {...defaultProps} width={size} height={size} className={className} style={{ ...defaultProps.style, ...style }}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}



