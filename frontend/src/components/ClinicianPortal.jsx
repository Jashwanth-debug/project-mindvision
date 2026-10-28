import React, { useState, useEffect } from 'react';
import { DoctorAuthService } from '../services/doctorAuthService';
import LongitudinalComparisonView from './LongitudinalComparisonView';
import ClinicianCopilotView from './ClinicianCopilotView';
import ClinicalAuditTrailView from './ClinicalAuditTrailView';

export default function ClinicianPortal({
  records,
  activeEscalation,
  onAcceptEscalation,
  onDismissEscalation,
  onTriggerTestEscalation,
  onShowToast
}) {
  const [portalTab, setPortalTab] = useState('triage'); // triage, longitudinal, copilot, audit
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Active Doctor & Real-Time Requests State
  const getInitialDoctor = () => {
    const session = DoctorAuthService.getCurrentSession();
    let doc = session.user;
    if (!doc && session.role === 'DOCTOR') {
      doc = DoctorAuthService.getDoctors()[0];
    } else if (doc) {
      doc = DoctorAuthService.getDoctorById(doc.id) || doc;
    }
    return doc;
  };

  const getInitialPending = () => {
    const consultations = DoctorAuthService.getConsultations();
    return consultations.find((c) => c.sessionStatus === 'REQUESTED') || null;
  };

  const [activeDoctor, setActiveDoctor] = useState(getInitialDoctor);
  const [incomingRequest, setIncomingRequest] = useState(getInitialPending);

  const syncState = () => {
    setActiveDoctor(getInitialDoctor());
    setIncomingRequest(getInitialPending());
  };

  useEffect(() => {
    const unsubscribe = DoctorAuthService.subscribe((msg) => {
      syncState();
      if (msg.type === 'CONSULTATION_REQUESTED') {
        setIncomingRequest(msg.payload.consultation);
        if (onShowToast) onShowToast(`Consultation request received from ${msg.payload.consultation.patientName}!`);
      }
    });
    return () => unsubscribe();
  }, [onShowToast]);

  const isOnCall = activeDoctor ? (activeDoctor.availabilityStatus === 'ONLINE' || activeDoctor.isAvailable) : true;
  const customRate = activeDoctor ? (activeDoctor.ratePerMinute !== undefined ? activeDoctor.ratePerMinute : 12) : 12;

  const handleToggleOnline = () => {
    if (!activeDoctor) return;
    const nextStatus = isOnCall ? 'OFFLINE' : 'ONLINE';
    DoctorAuthService.setDoctorAvailability(activeDoctor.id, nextStatus);
    syncState();
    onShowToast(`Clinician status updated to ${nextStatus}. ${nextStatus === 'ONLINE' ? 'Now visible in Patient Marketplace.' : 'Offline mode activated.'}`);
  };

  const handleAcceptRealRequest = (req) => {
    DoctorAuthService.acceptConsultationRequest(req.sessionId);
    onAcceptEscalation({
      id: req.sessionId,
      compositeRisk: req.telemetrySnapshot?.compositeRisk || 7.8,
      incongruence: req.telemetrySnapshot?.incongruenceIndex || 0.58,
      riskLevel: req.telemetrySnapshot?.riskLevel || 'SEVERE',
      text: req.telemetrySnapshot?.soapNoteMarkdown || 'Patient consultation requested in real-time.'
    });
    setIncomingRequest(null);
    onShowToast(`Accepted consultation request from ${req.patientName || 'Patient'}. Teletherapy channel connected.`);
  };

  const handleRejectRealRequest = (req) => {
    DoctorAuthService.rejectConsultationRequest(req.sessionId);
    setIncomingRequest(null);
    onShowToast(`Rejected consultation request ${req.sessionId}.`);
  };

  // Filter records by query and risk level
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.text && rec.text.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRisk =
      riskFilter === 'ALL' || rec.riskLevel.toUpperCase() === riskFilter.toUpperCase();

    return matchesSearch && matchesRisk;
  });

  const displayEscalation = incomingRequest || activeEscalation;

  return (
    <div className="portal-wrapper">
      {/* Clinician Command Bar */}
      <div className="command-bar">
        <div className="command-left">
          <div className="command-title-row">
            <span className="command-kicker">Clinician Workstation</span>
            <h1 className="command-heading">Triage &amp; Teletherapy Registry</h1>
          </div>
          <div className="command-meta">
            <span>Practitioner: <strong>{activeDoctor ? (activeDoctor.fullName || activeDoctor.name) : 'Dr. Ananya Sharma'}</strong></span>
            <span className="meta-separator">•</span>
            <span className="status-indicator-tag">{activeDoctor?.verificationStatus || 'VERIFIED'}</span>
            <span className="meta-separator">•</span>
            <span className="mono-subtle">Reg: {activeDoctor?.medicalRegistrationNumber || 'NMC-IND-88492'}</span>
          </div>
        </div>

        {/* On-Call & Workstation Controls */}
        <div className="command-actions">
          <button
            className={`btn-toggle-availability ${isOnCall ? 'online' : 'offline'}`}
            onClick={handleToggleOnline}
            title={isOnCall ? 'Currently Online - Visible to Patients' : 'Currently Offline'}
          >
            <span className="status-micro-dot"></span>
            <span>{isOnCall ? 'On-Call (Online)' : 'Standby (Offline)'}</span>
          </button>

          <div className="fee-badge">
            <span className="fee-label">RATE</span>
            <span className="fee-value">₹{customRate}</span>
            <span className="fee-unit">/min</span>
          </div>

          <button
            className="btn-secondary"
            onClick={onTriggerTestEscalation}
            title="Simulate synthetic patient escalation event"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Simulate Queue Event</span>
          </button>
        </div>
      </div>

      {/* Architectural Sub-Tabs */}
      <div className="architectural-tab-bar" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`tab-btn ${portalTab === 'triage' ? 'active' : ''}`}
          onClick={() => setPortalTab('triage')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Active Triage &amp; Queue ({records.length})</span>
        </button>

        <button
          className={`tab-btn ${portalTab === 'longitudinal' ? 'active' : ''}`}
          onClick={() => setPortalTab('longitudinal')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Longitudinal Profile &amp; Comparison</span>
        </button>

        <button
          className={`tab-btn ${portalTab === 'copilot' ? 'active' : ''}`}
          onClick={() => setPortalTab('copilot')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="13" x2="15" y2="13" />
          </svg>
          <span>Clinician AI Copilot &amp; SOAP</span>
        </button>

        <button
          className={`tab-btn ${portalTab === 'audit' ? 'active' : ''}`}
          onClick={() => setPortalTab('audit')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Clinical Audit Trail</span>
        </button>
      </div>

      {portalTab === 'longitudinal' && (
        <LongitudinalComparisonView currentRecord={selectedRecord || records[0]} />
      )}

      {portalTab === 'copilot' && (
        <ClinicianCopilotView
          currentRecord={selectedRecord || records[0]}
          activeDoctor={activeDoctor}
          onShowToast={onShowToast}
        />
      )}

      {portalTab === 'audit' && (
        <ClinicalAuditTrailView onShowToast={onShowToast} />
      )}

      {/* Main Grid: Triage Escalation Queue vs Patient Registry (Only shown when portalTab === 'triage') */}
      {portalTab === 'triage' && (
        <div className="portal-grid">
          {/* Left Column: Triage Escalation Queue */}
          <div className="workstation-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="panel-title-icon">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h2 className="panel-title">Active Consultation Triage Queue</h2>
              </div>
              <span className={`queue-count-pill ${displayEscalation ? 'urgent' : ''}`}>
              {displayEscalation ? '1 PENDING' : '0 IN QUEUE'}
            </span>
          </div>

          <div className="panel-body">
            {displayEscalation ? (
              <div className="triage-escalation-card">
                <div className="triage-card-header">
                  <div className="triage-type">
                    <span className="urgent-pulse-indicator"></span>
                    <span>{incomingRequest ? 'Live Patient Teletherapy Request' : 'Biometric Incongruence Escalation'}</span>
                  </div>
                  <span className="clinical-status-pill severe">
                    {incomingRequest ? 'CONFIRMED REQUEST' : 'ACUTE DISTRESS'}
                  </span>
                </div>

                <div className="triage-vitals-grid">
                  <div className="vital-item">
                    <span className="vital-label">Session ID</span>
                    <span className="vital-value mono">{displayEscalation.sessionId || displayEscalation.id}</span>
                  </div>
                  <div className="vital-item">
                    <span className="vital-label">Composite Risk</span>
                    <span className="vital-value severe">
                      {displayEscalation.telemetrySnapshot?.compositeRisk || displayEscalation.compositeRisk || 7.8} / 10
                    </span>
                  </div>
                  <div className="vital-item">
                    <span className="vital-label">Incongruence Index</span>
                    <span className="vital-value mono">
                      {displayEscalation.telemetrySnapshot?.incongruenceIndex || displayEscalation.incongruence || 0.58}
                    </span>
                  </div>
                </div>

                <div className="triage-context-box">
                  <span className="context-label">Intake Narrative &amp; Clinical Context:</span>
                  <p className="context-text">
                    "{displayEscalation.telemetrySnapshot?.soapNoteMarkdown || displayEscalation.text || 'Patient exhibiting acute somatic-verbal divergence.'}"
                  </p>
                </div>

                <div className="triage-actions-row">
                  <button
                    className="btn-triage-accept"
                    onClick={() => {
                      if (incomingRequest) {
                        handleAcceptRealRequest(incomingRequest);
                      } else {
                        onAcceptEscalation(displayEscalation);
                        onShowToast(`Teleconsultation established with ${displayEscalation.id}`);
                      }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>Accept &amp; Connect Stream</span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      if (incomingRequest) {
                        handleRejectRealRequest(incomingRequest);
                      } else {
                        onDismissEscalation();
                        onShowToast('Escalation triaged to psychiatric review.');
                      }
                    }}
                  >
                    Decline / Triage Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-queue-slate">
                <div className="empty-icon-ring">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="empty-heading">Queue Clear — Ready for Escalations</span>
                <p className="empty-description">
                  All triaged patients have been serviced. Real-time patient marketplace requests and threshold escalations (&gt;7.0 Composite Risk) appear here automatically.
                </p>
              </div>
            )}

            {/* Protocol Checklist */}
            <div className="protocol-container">
              <span className="protocol-heading">Clinical Evaluation Checklist</span>
              <ul className="protocol-list">
                <li>Inspect visual action units (AU04 corrugator &amp; AU15 depressor) for micro-tremors.</li>
                <li>Evaluate vocal prosody jitter against established patient baseline.</li>
                <li>Verify somatic-verbal incongruence index before dispatching pharmacological notes.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Patient Evaluation Registry */}
        <div className="workstation-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="panel-title-icon">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <h2 className="panel-title">Patient Evaluation Registry</h2>
            </div>
            <span className="mono-counter">
              {filteredRecords.length} RECORD{filteredRecords.length !== 1 ? 'S' : ''}
            </span>
          </div>

          <div className="panel-body">
            {/* Filter controls */}
            <div className="filter-toolbar">
              <div className="search-field-wrapper">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter by Session ID or statement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-field"
                />
              </div>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="select-field"
              >
                <option value="ALL">All Risk Ratings</option>
                <option value="MINIMAL">Minimal</option>
                <option value="ELEVATED">Elevated</option>
                <option value="SEVERE">Severe</option>
              </select>
            </div>

            {/* Structured Medical Record Registry */}
            <div className="registry-table-container">
              {filteredRecords.length === 0 ? (
                <div className="empty-registry-message">
                  No matching clinical session records located.
                </div>
              ) : (
                <div className="registry-list">
                  {filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="registry-row"
                      onClick={() => setSelectedRecord(record)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="registry-primary-cell">
                        <div className="registry-id-line">
                          <span className="record-id-mono">{record.id.length > 14 ? `${record.id.substring(0, 12)}…` : record.id}</span>
                          <span className="record-timestamp-subtle">{record.timestamp}</span>
                        </div>
                        <div className="registry-metrics-line">
                          <span className="metric-tag">AU4: {record.au4 ?? 0}</span>
                          <span className="metric-tag">AU15: {record.au15 ?? 0}</span>
                          <span className="metric-tag">Prosody: {record.prosody ?? 0}</span>
                          {record.incongruence !== undefined && (
                            <span className="metric-tag highlight">Incongruence: {record.incongruence}</span>
                          )}
                        </div>
                      </div>

                      <div className="registry-status-cell">
                        <span className={`clinical-status-pill ${record.riskLevel.toLowerCase()}`}>
                          {record.riskLevel}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chevron-icon">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-teal)' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <h3 className="modal-title">Clinical Telemetry Record — {selectedRecord.id}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedRecord(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-vitals-strip">
                <div className="modal-vital-box">
                  <span className="vital-box-label">Risk Rating</span>
                  <div className={`vital-box-value ${selectedRecord.riskLevel.toLowerCase()}`}>
                    {selectedRecord.riskLevel}
                  </div>
                  <span className="vital-box-sub">Composite: {selectedRecord.compositeRisk ?? 'N/A'}/10</span>
                </div>
                <div className="modal-vital-box">
                  <span className="vital-box-label">Incongruence</span>
                  <div className="vital-box-value mono">
                    {selectedRecord.incongruence ?? '0.00'}
                  </div>
                  <span className="vital-box-sub">Divergence Index</span>
                </div>
                <div className="modal-vital-box">
                  <span className="vital-box-label">Recorded At</span>
                  <div className="vital-box-date">
                    {selectedRecord.timestamp}
                  </div>
                </div>
              </div>

              <div className="narrative-inset">
                <span className="inset-heading">Patient Spoken Statement</span>
                <p className="inset-body">
                  "{selectedRecord.text || 'Routine screening telemetry collected during automated intake.'}"
                </p>
              </div>

              <div className="modal-actions-footer">
                <button className="btn-secondary" onClick={() => setSelectedRecord(null)}>
                  Close
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    onShowToast(`Exported record ${selectedRecord.id} encrypted audit file.`);
                    setSelectedRecord(null);
                  }}
                >
                  Export Audit Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
