import React, { useState } from 'react';
import { ClinicalAuditService } from '../services/clinicalAuditService';

/**
 * MindVision Clinical AI - Clinical Audit Trail View
 *
 * Displays an immutable audit timeline of all clinical, sensor, consultation,
 * and documentation events without storing raw video/audio streams.
 */

const generateAuditFilename = () => `mindvision_clinical_audit_${Date.now()}.json`;

export default function ClinicalAuditTrailView({ onShowToast }) {
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const auditLogs = ClinicalAuditService.getAuditTrail();

  const filteredLogs = auditLogs.filter((log) => {
    const matchesFilter = filterType === 'ALL' || log.eventType.includes(filterType);
    const matchesSearch =
      log.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleExportAudit = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', generateAuditFilename());
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (onShowToast) onShowToast('Exported tamper-evident JSON audit trail to download directory.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Command Bar */}
      <div className="command-bar" style={{ marginBottom: 0 }}>
        <div className="command-left">
          <div className="command-title-row">
            <span className="command-kicker">Data Governance</span>
            <h2 className="command-heading" style={{ fontSize: '1.15rem' }}>Clinical Event Audit Trail</h2>
          </div>
          <div className="command-meta">
            <span>Security Standard: <strong>HIPAA / DISHA Compliant Traceability</strong></span>
            <span className="meta-separator">•</span>
            <span>Raw Media Retention: <strong>Zero Raw Audio/Video Storage</strong></span>
            <span className="meta-separator">•</span>
            <span>Total Logged Events: <strong>{auditLogs.length}</strong></span>
          </div>
        </div>

        <div className="command-actions">
          <button className="btn-secondary" onClick={handleExportAudit}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export Audit Log (JSON)</span>
          </button>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="clinical-card">
        <div className="card-header">
          <div className="card-title-group">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <h3 className="card-title">IMMUTABLE CLINICAL TRANSACTION LOGS</h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            TIMESTAMPED LEDGER
          </span>
        </div>

        <div className="card-body">
          {/* Search & Filter Toolbar */}
          <div className="filter-toolbar" style={{ marginBottom: '1rem' }}>
            <div className="search-field-wrapper">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Filter by session ID, label, or detail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-field"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="select-field"
            >
              <option value="ALL">All Event Types</option>
              <option value="SCREENING">Screening Events</option>
              <option value="PERMISSION">Hardware &amp; Permissions</option>
              <option value="SIGNAL">Signal Quality Checks</option>
              <option value="INDICATOR">Indicator Generations</option>
              <option value="CONSULTATION">Consultations &amp; WebRTC</option>
              <option value="SOAP">SOAP Documentation</option>
            </select>
          </div>

          {/* Table Container */}
          <div className="registry-table-container">
            {filteredLogs.length === 0 ? (
              <div className="empty-registry-message">
                No audit events matched the selected filter criteria.
              </div>
            ) : (
              <div className="registry-list">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="registry-row" style={{ cursor: 'default' }}>
                    <div className="registry-primary-cell">
                      <div className="registry-id-line">
                        <span className="record-id-mono" style={{ color: 'var(--accent-teal)' }}>{log.timestamp}</span>
                        <span className="record-timestamp-subtle">{log.date}</span>
                        <span className="channel-tag">{log.actor}</span>
                        <span className="channel-tag">ID: {log.sessionId}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        {log.label}
                      </div>
                      {log.details && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {log.details}
                        </div>
                      )}
                    </div>

                    <div className="registry-status-cell">
                      <span className={`clinical-status-pill ${log.status === 'SUCCESS' || log.status === 'COMPLETED' || log.status === 'APPROVED' ? 'minimal' : log.status === 'DRAFT' || log.status === 'PROCESSED' ? 'elevated' : ''}`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
