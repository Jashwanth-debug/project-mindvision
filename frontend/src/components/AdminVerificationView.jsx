import React, { useState, useEffect } from 'react';
import { DoctorAuthService } from '../services/doctorAuthService';

export default function AdminVerificationView({ onShowToast }) {
  const [doctors, setDoctors] = useState(() => DoctorAuthService.getDoctors());
  const [statusFilter, setStatusFilter] = useState('ALL');

  const refreshDoctors = () => {
    setDoctors(DoctorAuthService.getDoctors());
  };

  useEffect(() => {
    const unsubscribe = DoctorAuthService.subscribe(() => refreshDoctors());
    return () => unsubscribe();
  }, []);

  const handleApprove = (doc) => {
    DoctorAuthService.approveDoctor(doc.id);
    onShowToast(`Approved doctor registration for ${doc.fullName || doc.name}. Status set to VERIFIED.`);
    refreshDoctors();
  };

  const handleReject = (doc) => {
    DoctorAuthService.rejectDoctor(doc.id);
    onShowToast(`Rejected registration for ${doc.fullName || doc.name}. Status set to REJECTED.`);
    refreshDoctors();
  };

  const filteredDoctors = doctors.filter((doc) => {
    if (statusFilter === 'ALL') return true;
    return doc.verificationStatus === statusFilter;
  });

  const pendingCount = doctors.filter((d) => d.verificationStatus === 'PENDING').length;

  return (
    <div className="admin-wrapper" style={{ marginTop: '1.25rem' }}>
      {/* Command Bar Header */}
      <div className="command-bar" style={{ borderLeftColor: 'var(--status-severe-dot)' }}>
        <div className="command-left">
          <div className="command-title-row">
            <span className="command-kicker" style={{ color: 'var(--status-severe-text)', borderColor: 'var(--status-severe-border)' }}>
              Credentialing Audit
            </span>
            <h1 className="command-heading">Clinician Verification &amp; Account Governance</h1>
          </div>
          <p className="command-meta">
            Audit submitted medical registration numbers (NMC/MCI), evaluate clinical credentials, and grant verification status.
          </p>
        </div>

        <div className="command-actions">
          <span className={`clinical-status-pill ${pendingCount > 0 ? 'severe' : 'minimal'}`}>
            {pendingCount} PENDING AUDIT{pendingCount !== 1 ? 'S' : ''}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar" style={{ margin: '1.25rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn-secondary ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Accounts ({doctors.length})
          </button>
          <button
            className={`btn-secondary ${statusFilter === 'PENDING' ? 'active' : ''}`}
            style={{ color: statusFilter === 'PENDING' ? 'var(--status-severe-text)' : 'inherit' }}
            onClick={() => setStatusFilter('PENDING')}
          >
            Pending Audit ({pendingCount})
          </button>
          <button
            className={`btn-secondary ${statusFilter === 'VERIFIED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('VERIFIED')}
          >
            Verified ({doctors.filter((d) => d.verificationStatus === 'VERIFIED').length})
          </button>
          <button
            className={`btn-secondary ${statusFilter === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('REJECTED')}
          >
            Rejected ({doctors.filter((d) => d.verificationStatus === 'REJECTED').length})
          </button>
        </div>
      </div>

      {/* Doctor Applications Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {filteredDoctors.length === 0 ? (
          <div className="empty-registry-message" style={{ gridColumn: '1/-1', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            No practitioner applications matched the selected filter.
          </div>
        ) : (
          filteredDoctors.map((doc) => (
            <div className="workstation-panel" key={doc.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header" style={{ padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={doc.avatarUrl}
                    alt={doc.fullName || doc.name}
                    style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                  />
                  <div>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 650, color: 'var(--text-primary)' }}>{doc.fullName || doc.name}</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{doc.title || doc.qualification}</span>
                  </div>
                </div>

                <span className={`clinical-status-pill ${doc.verificationStatus === 'VERIFIED' ? 'minimal' : doc.verificationStatus === 'PENDING' ? 'elevated' : 'severe'}`}>
                  {doc.verificationStatus}
                </span>
              </div>

              <div className="panel-body" style={{ gap: '0.65rem', flex: 1, padding: '1rem' }}>
                <div className="narrative-inset" style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>
                  <div><strong>NMC / MCI Reg:</strong> {doc.medicalRegistrationNumber}</div>
                  <div><strong>Credential:</strong> {doc.qualification} ({doc.experienceYears} yrs experience)</div>
                  <div><strong>Affiliation:</strong> {doc.hospital || doc.institution}</div>
                  <div><strong>Contact:</strong> {doc.email}</div>
                  <div><strong>Consultation Fee:</strong> {doc.ratePerMinute === 0 ? 'FREE / Pro-Bono' : `₹${doc.consultationFee || 299} (₹${doc.ratePerMinute || 12}/min)`}</div>
                  <div><strong>Source:</strong> {doc.isDemo ? 'SYSTEM SEED PROFILE' : 'REGISTERED ACCOUNT'}</div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                  {doc.verificationStatus !== 'VERIFIED' && (
                    <button
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => handleApprove(doc)}
                    >
                      Approve &amp; Verify
                    </button>
                  )}
                  {doc.verificationStatus !== 'REJECTED' && (
                    <button
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', color: 'var(--status-severe-text)' }}
                      onClick={() => handleReject(doc)}
                    >
                      Decline Application
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
