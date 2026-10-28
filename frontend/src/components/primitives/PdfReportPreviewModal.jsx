import React, { useState, useEffect, useRef } from 'react';
import {
  createPdfPreviewUrl,
  downloadPdfBlob
} from '../../utils/pdfReportGenerator';
import {
  IconDownload,
  IconRefreshCw,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconEye
} from '../Icons';
import { InteractiveButton, IconButton } from './index';
import useFocusTrap from './useFocusTrap';

/**
 * PdfReportPreviewModal - True Binary PDF In-App Document Viewer
 *
 * Complies with Medical Workstation Preview Mandates:
 * 1. Generates authentic application/pdf binary Blob via jsPDF pipeline.
 * 2. Manages browser Blob URL lifecycle cleanly (no memory leaks or dangling URLs).
 * 3. Renders native PDF engine inside an accessible modal viewport.
 * 4. Dual download & open-in-window actions with immediate user feedback.
 * 5. Full keyboard accessibility (Escape to close, focus trap).
 */
export default function PdfReportPreviewModal({
  isOpen,
  onClose,
  record,
  report, // backward-compatible alias for record
  reportType = 'checkin', // 'checkin' | 'assessment' | 'history'
  onDownload
}) {
  const modalRef = useRef(null);
  useFocusTrap(isOpen, modalRef, onClose);

  const activeRecord = record || report;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [currentBlob, setCurrentBlob] = useState(null);
  const [currentFilename, setCurrentFilename] = useState('MindVision_Report.pdf');
  const [fileSize, setFileSize] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Generate and manage PDF Blob URL lifecycle
  useEffect(() => {
    let activeUrl = null;
    let isSubscribed = true;

    if (isOpen && activeRecord) {
      Promise.resolve().then(() => {
        if (!isSubscribed) return;
        setIsLoading(true);
        setError(null);
        setDownloadSuccess(false);
      });

      createPdfPreviewUrl(activeRecord, reportType)
        .then((result) => {
          if (!isSubscribed) {
            // Cancelled before completion; immediately clean up URL
            if (result.objectUrl) URL.revokeObjectURL(result.objectUrl);
            return;
          }
          activeUrl = result.objectUrl;
          setBlobUrl(result.objectUrl);
          setCurrentBlob(result.blob);
          setCurrentFilename(result.filename);
          setFileSize(result.size);
          setIsLoading(false);
        })
        .catch((err) => {
          if (!isSubscribed) return;
          console.error('[MindVision PDF Preview] Failed to generate preview document:', err);
          setError(err.message || 'Failed to render PDF document.');
          setIsLoading(false);
        });
    } else {
      Promise.resolve().then(() => {
        if (!isSubscribed) return;
        setBlobUrl(null);
        setCurrentBlob(null);
        setIsLoading(false);
        setError(null);
      });
    }

    return () => {
      isSubscribed = false;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [isOpen, activeRecord, reportType]);

  if (!isOpen || !activeRecord) return null;

  // Handle Download action
  const handleDownload = () => {
    if (onDownload) {
      onDownload(activeRecord);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
      return;
    }

    if (currentBlob) {
      try {
        downloadPdfBlob(currentBlob, currentFilename);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } catch (err) {
        console.error('[MindVision PDF Preview] Download error:', err);
        setError("Download failed: " + err.message);
      }
    }
  };

  // Handle Open in New Tab action
  const handleOpenExternal = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const formattedDate = activeRecord?.timestamp || activeRecord?.dateIso
    ? new Date(activeRecord.timestamp || activeRecord.dateIso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Recent Session';

  const modalTitle = reportType === 'assessment'
    ? (activeRecord.title || 'Clinical Assessment Report')
    : reportType === 'history'
      ? 'Patient Check-in History Archive'
      : 'Wellness Check-in Report';

  return (
    <div className="mv-modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className="mv-modal-dialog"
        style={{
          width: '92vw',
          maxWidth: '920px',
          height: '88vh',
          maxHeight: '920px',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-elevated)'
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${modalTitle} Document Preview`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Modal Action Header */}
        <header
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            backgroundColor: 'var(--card-header-bg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-teal-subtle)',
                color: 'var(--accent-teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <IconEye size={18} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}
              >
                {modalTitle}
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.15rem'
                }}
              >
                <span>{formattedDate}</span>
                <span>•</span>
                <span>ID: {activeRecord.id || 'MV-RECORD'}</span>
                {fileSize && (
                  <>
                    <span>•</span>
                    <span>{(fileSize / 1024).toFixed(1)} KB</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {blobUrl && (
              <InteractiveButton
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                aria-label="Open PDF in new window"
                style={{
                  fontSize: '0.82rem',
                  padding: '0.45rem 0.85rem',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <span>Open in Tab</span>
                <span>↗</span>
              </InteractiveButton>
            )}

            <InteractiveButton
              id="btn-modal-download-pdf"
              variant="primary"
              size="sm"
              onClick={handleDownload}
              disabled={isLoading || !currentBlob}
              aria-label="Download validated PDF report"
              style={{
                gap: '0.45rem',
                fontSize: '0.82rem',
                padding: '0.45rem 0.95rem'
              }}
            >
              {downloadSuccess ? (
                <>
                  <IconCheck size={14} />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <IconDownload size={14} />
                  <span>Download PDF</span>
                </>
              )}
            </InteractiveButton>

            <IconButton
              icon={<IconX size={18} />}
              label="Close PDF report preview"
              onClick={onClose}
            />
          </div>
        </header>

        {/* Modal Main Viewport: Document Viewer */}
        <main
          style={{
            flex: '1 1 auto',
            width: '100%',
            height: 'calc(100% - 120px)',
            position: 'relative',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {isLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--text-secondary)'
              }}
            >
              <IconRefreshCw size={26} className="spinning" style={{ color: 'var(--accent-teal)' }} />
              <p style={{ fontSize: '0.92rem', margin: 0, fontWeight: 500 }}>
                Compiling clinical PDF document...
              </p>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Validating Type-1 ASCII fonts and binary headers locally on device
              </span>
            </div>
          )}

          {!isLoading && error && (
            <div
              style={{
                maxWidth: '460px',
                padding: '2rem',
                backgroundColor: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--status-elevated-border)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-card)'
              }}
            >
              <IconAlertCircle size={32} style={{ color: 'var(--status-severe-dot)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                Unable to render PDF preview
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {error}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <InteractiveButton
                  variant="primary"
                  size="sm"
                  onClick={handleDownload}
                >
                  <IconDownload size={14} />
                  <span>Download Direct</span>
                </InteractiveButton>
                <InteractiveButton
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  Close
                </InteractiveButton>
              </div>
            </div>
          )}

          {!isLoading && !error && blobUrl && (
            <iframe
              src={blobUrl}
              title={`${modalTitle} Viewer`}
              className="pdf-preview-iframe"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#525659' // Standard neutral PDF canvas backdrop
              }}
            >
              <object
                data={blobUrl}
                type="application/pdf"
                style={{ width: '100%', height: '100%' }}
              >
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                  <p>Your browser doesn't have an inline PDF viewer.</p>
                  <a href={blobUrl} download={currentFilename} style={{ color: 'var(--accent-teal)' }}>
                    Download the PDF to view it
                  </a>
                </div>
              </object>
            </iframe>
          )}
        </main>

        {/* Modal Footer Note */}
        <footer
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--card-bg)'
          }}
        >
          <span>
            MindVision Confidential Reflection Record • Generated 100% on-device
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-teal)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)'
            }}
          >
            Close Preview
          </button>
        </footer>
      </div>
    </div>
  );
}
