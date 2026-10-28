import React, { useState, useEffect, useRef, useId } from 'react';
import {
  IconCheck,
  IconX,
  IconRefreshCw,
  IconChevronDown,
  IconAlertCircle
} from '../Icons';

import useFocusTrap from './useFocusTrap';

/**
 * 1. InteractiveButton
 * Purposeful, accessible button with loading, active tactile state, and variant support.
 */
export function InteractiveButton({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  isLoading = false,
  loadingText,
  isSuccess = false,
  icon,
  iconPosition = 'left',
  disabled = false,
  type = 'button',
  className = '',
  onClick,
  ...props
}) {
  const handleClick = (e) => {
    if (isLoading || disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) onClick(e);
  };

  const variantClass = `mv-btn-${variant}`;
  const sizeClass = size === 'sm' ? 'mv-btn-sm' : size === 'lg' ? 'mv-btn-lg' : '';

  return (
    <button
      type={type}
      className={`mv-btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? (
        <>
          <IconRefreshCw size={size === 'sm' ? 14 : 16} className="spinning" />
          <span>{loadingText || children}</span>
        </>
      ) : isSuccess ? (
        <>
          <IconCheck size={size === 'sm' ? 14 : 16} />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="mv-btn-icon-left">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="mv-btn-icon-right">{icon}</span>}
        </>
      )}
    </button>
  );
}

/**
 * 2. IconButton
 * Accessible icon-only button with mandatory aria-label and min 44x44px touch target.
 */
export function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  isLoading = false,
  onClick,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`mv-icon-btn mv-btn-${variant} mv-btn-${size} ${className}`}
      aria-label={label}
      title={label}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? <IconRefreshCw size={16} className="spinning" /> : icon}
    </button>
  );
}

/**
 * 3. Tooltip
 * Non-disruptive, accessible tooltip with keyboard focus support and escape dismiss.
 */
export function Tooltip({ content, children, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="mv-tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setIsVisible(false);
      }}
      aria-describedby={isVisible ? tooltipId : undefined}
    >
      {children}
      {isVisible && content && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`mv-tooltip-content mv-tooltip-${position}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/**
 * 4. Toast
 * Accessible toast alert with aria-live and dismiss action.
 */
export function Toast({ message, onDismiss, type = 'info', isAssertive = false }) {
  if (!message) return null;

  return (
    <div className={`mv-toast-region mv-toast-${type}`} aria-live={isAssertive ? 'assertive' : 'polite'}>
      <div className="mv-toast" role="status">
        <span style={{ color: 'var(--accent-teal)', fontSize: '1.1rem' }}>✓</span>
        <span style={{ flex: 1 }}>{message}</span>
        {onDismiss && (
          <button
            type="button"
            className="mv-icon-btn"
            style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
            onClick={onDismiss}
            aria-label="Dismiss notification"
          >
            <IconX size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 5. Drawer / Sheet
 * Slide-in sheet with focus trapping, ESC dismiss, and backdrop overlay.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '460px'
}) {
  const panelRef = useRef(null);
  useFocusTrap(isOpen, panelRef, onClose);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mv-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className="mv-drawer-panel"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Drawer Panel'}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card-bg)'
        }}>
          <div>
            {title && (
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          <IconButton
            icon={<IconX size={18} />}
            label="Close drawer"
            onClick={onClose}
          />
        </div>

        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * 6. Modal / Dialog
 * Accessible dialog with focus trapping and ESC dismiss.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '540px'
}) {
  const dialogRef = useRef(null);
  useFocusTrap(isOpen, dialogRef, onClose);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mv-modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="mv-modal-dialog"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card-bg)'
        }}>
          <div>
            {title && (
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          <IconButton
            icon={<IconX size={18} />}
            label="Close modal"
            onClick={onClose}
          />
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * 7. Accordion & AccordionItem
 * Accessible disclosure pattern with keyboard navigation.
 */
export function Accordion({ children, className = '' }) {
  return <div className={`mv-accordion ${className}`}>{children}</div>;
}

export function AccordionItem({ title, children, defaultOpen = false, id }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const generatedId = useId();
  const contentId = id || `accordion-content-${generatedId}`;

  return (
    <div className="mv-accordion-item">
      <button
        type="button"
        className="mv-accordion-header"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{title}</span>
        <IconChevronDown
          size={16}
          className="mv-accordion-chevron"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      <div
        id={contentId}
        role="region"
        className="mv-accordion-content"
        style={{
          maxHeight: isOpen ? '1000px' : '0',
          opacity: isOpen ? 1 : 0,
          paddingBottom: isOpen ? '1rem' : '0'
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * 8. Skeleton
 * Layout-matched shimmering placeholder without harsh flashing.
 */
export function Skeleton({
  variant = 'rect', // 'rect' | 'circle' | 'text'
  width = '100%',
  height = '1rem',
  className = '',
  style = {}
}) {
  const isCircle = variant === 'circle';
  return (
    <span
      className={`mv-skeleton ${isCircle ? 'mv-skeleton-circle' : ''} ${className}`}
      style={{
        width,
        height: isCircle ? width : height,
        ...style
      }}
      aria-hidden="true"
    />
  );
}

/**
 * 9. EmptyState
 * Calm, encouraging empty state with meaningful next action.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}) {
  return (
    <div className="mv-empty-state" role="status">
      {icon && <div className="mv-empty-icon">{icon}</div>}
      <h3 className="mv-state-title">{title}</h3>
      {description && <p className="mv-state-desc">{description}</p>}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionLabel && onAction && (
          <InteractiveButton variant="primary" onClick={onAction}>
            {actionLabel}
          </InteractiveButton>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <InteractiveButton variant="secondary" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </InteractiveButton>
        )}
      </div>
    </div>
  );
}

/**
 * 10. ErrorState
 * Non-alarming clinical error fallback with preserved state & retry.
 */
export function ErrorState({
  title = "Something didn't load smoothly",
  message = "Your answers and data are safe. Please take a quiet pause and try again.",
  onRetry,
  onReturnHome
}) {
  return (
    <div className="mv-error-state" role="alert">
      <div className="mv-error-icon">
        <IconAlertCircle size={24} />
      </div>
      <h3 className="mv-state-title">{title}</h3>
      <p className="mv-state-desc">{message}</p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <InteractiveButton variant="primary" onClick={onRetry}>
            Try again
          </InteractiveButton>
        )}
        {onReturnHome && (
          <InteractiveButton variant="secondary" onClick={onReturnHome}>
            Return to Home
          </InteractiveButton>
        )}
      </div>
    </div>
  );
}

/**
 * 11. ProgressIndicator
 * Honest, subtle progress bar without gamified streaks or rigid "Question X of Y".
 */
export function ProgressIndicator({
  value = 0,
  max = 100,
  label,
  showLabel = true,
  className = ''
}) {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={`mv-progress-wrapper ${className}`} style={{ width: '100%' }}>
      {showLabel && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.76rem',
          color: 'var(--text-muted)',
          marginBottom: '0.35rem',
          fontWeight: 600
        }}>
          <span>{label || 'Check-in pacing'}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div
        className="mv-progress-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div className="mv-progress-bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/**
 * 12. PageTransition
 * Subtle route entrance container with short fade and 8px translate.
 */
export function PageTransition({ children, className = '' }) {
  return <div className={`mv-page-transition ${className}`}>{children}</div>;
}

/**
 * 13. ConfirmDialog
 * Accessible confirmation modal replacement for window.confirm.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  isLoading = false
}) {
  const dialogRef = useRef(null);
  useFocusTrap(isOpen, dialogRef, onClose);

  if (!isOpen) return null;

  return (
    <div className="mv-modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="mv-modal-dialog"
        style={{ maxWidth: '420px' }}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: variant === 'danger' ? 'var(--status-severe-bg)' : 'var(--status-elevated-bg)',
            color: variant === 'danger' ? 'var(--status-severe-dot)' : 'var(--status-elevated-dot)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <IconAlertCircle size={24} />
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
            {message}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <InteractiveButton
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              data-autofocus
            >
              {cancelLabel}
            </InteractiveButton>
            <InteractiveButton
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </InteractiveButton>
          </div>
        </div>
      </div>
    </div>
  );
}

import PdfReportPreviewModal from './PdfReportPreviewModal';
export { PdfReportPreviewModal, PdfReportPreviewModal as ReportPreview };
