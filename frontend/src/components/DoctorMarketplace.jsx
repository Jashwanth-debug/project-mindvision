import React, { useState, useEffect, useRef } from 'react';
import { DoctorAuthService } from '../services/doctorAuthService';
import { ClinicalAuditService } from '../services/clinicalAuditService';
import {
  IconUsers,
  IconGift,
  IconBuilding,
  IconStar,
  IconThumbsUp,
  IconCheck,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconShieldCheck
} from './Icons';
import { Drawer, InteractiveButton, IconButton } from './primitives';

const getVerifiedClinicians = () => DoctorAuthService.getDoctors().filter((d) => d.verificationStatus === 'VERIFIED');
const createConsultSessionId = () => `consult_${Math.random().toString(36).substring(2, 9)}`;

export default function DoctorMarketplace({
  onConnectDoctor,
  onShowToast,
  currentTelemetrySnapshot
}) {
  const [clinicians, setClinicians] = useState(getVerifiedClinicians);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [priceFilter, setPriceFilter] = useState('ALL'); // ALL, FREE, UNDER_250, UNDER_350
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('RECOMMENDED'); // RECOMMENDED, PRICE_ASC, RATING, EXPERIENCE
  const [selectedDoctorForModal, setSelectedDoctorForModal] = useState(null);
  const [isPreAuthorizing, setIsPreAuthorizing] = useState(false);

  const loadClinicians = () => {
    setClinicians(getVerifiedClinicians());
  };

  useEffect(() => {
    const unsubscribe = DoctorAuthService.subscribe(() => loadClinicians());
    return () => unsubscribe();
  }, []);

  // Filter clinicians
  const filteredClinicians = clinicians.filter((doc) => {
    const docName = doc.fullName || doc.name || '';
    const docTitle = doc.title || doc.qualification || '';
    const docHosp = doc.hospital || doc.institution || '';
    const docSpecs = doc.specialties || [doc.specialization || 'General'];
    const fee = doc.consultationFee !== undefined ? doc.consultationFee : (doc.ratePerMinute || 0);

    const matchesQuery =
      docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docHosp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docSpecs.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSpecialty =
      selectedSpecialty === 'ALL' ||
      docSpecs.some((s) => s.toLowerCase().includes(selectedSpecialty.toLowerCase())) ||
      (doc.specialization && doc.specialization.toLowerCase().includes(selectedSpecialty.toLowerCase()));

    const isOnline = doc.availabilityStatus === 'ONLINE' || doc.isAvailable;
    const matchesAvailability = !availableOnly || isOnline;

    let matchesPrice = true;
    if (priceFilter === 'FREE') matchesPrice = fee === 0 || doc.ratePerMinute === 0;
    else if (priceFilter === 'UNDER_250') matchesPrice = fee <= 250;
    else if (priceFilter === 'UNDER_350') matchesPrice = fee <= 350;

    return matchesQuery && matchesSpecialty && matchesAvailability && matchesPrice;
  });

  // Sort clinicians
  const sortedClinicians = [...filteredClinicians].sort((a, b) => {
    const feeA = a.consultationFee !== undefined ? a.consultationFee : (a.ratePerMinute || 0);
    const feeB = b.consultationFee !== undefined ? b.consultationFee : (b.ratePerMinute || 0);
    const expA = a.experienceYears || 5;
    const expB = b.experienceYears || 5;
    const rateA = a.rating || 4.8;
    const rateB = b.rating || 4.8;

    if (sortBy === 'PRICE_ASC') return feeA - feeB;
    if (sortBy === 'RATING') return rateB - rateA;
    if (sortBy === 'EXPERIENCE') return expB - expA;

    // Default RECOMMENDED: Online first, then rating
    const onlineA = a.availabilityStatus === 'ONLINE' || a.isAvailable ? 1 : 0;
    const onlineB = b.availabilityStatus === 'ONLINE' || b.isAvailable ? 1 : 0;
    if (onlineA !== onlineB) return onlineB - onlineA;
    return rateB - rateA;
  });

  const handleConfirmPreAuth = (doctor) => {
    setIsPreAuthorizing(true);
    const consultFee = doctor.consultationFee !== undefined ? doctor.consultationFee : 299;
    const isFree = consultFee === 0 || doctor.ratePerMinute === 0;
    const holdAmount = isFree ? 0 : consultFee;

    ClinicalAuditService.logEvent({
      eventType: 'CONSULTATION_REQUESTED',
      label: `Teletherapy Consult Requested with ${doctor.fullName || doctor.name}`,
      actor: 'PATIENT',
      actorId: 'MV-PATIENT-8821',
      sessionId: createConsultSessionId(),
      status: 'PENDING',
      details: `Hold: ₹${holdAmount}. Rate: ₹${doctor.ratePerMinute || 12}/min. Speciality: ${doctor.specialization || 'Psychiatry'}.`
    });

    DoctorAuthService.createConsultationRequest(
      { id: 'PATIENT-8821', name: 'Patient' },
      doctor,
      currentTelemetrySnapshot
    );

    setTimeout(() => {
      setIsPreAuthorizing(false);
      setSelectedDoctorForModal(null);
      onConnectDoctor(doctor, currentTelemetrySnapshot);
      onShowToast(
        isFree
          ? `Free Pro-Bono tele-consultation connected with ${doctor.fullName || doctor.name}!`
          : `Razorpay / UPI ₹${holdAmount} pre-auth authorized. Video session connected with ${doctor.fullName || doctor.name}!`
      );
    }, 1000);
  };

  const calculateDoctorMatch = (doc) => {
    const isOnline = doc.availabilityStatus === 'ONLINE' || doc.isAvailable;
    let matchScore = 84;
    const specs = doc.specialties || [doc.specialization || ''];
    const hasSpecialtyMatch = specs.some(s =>
      s.toLowerCase().includes('somatic') ||
      s.toLowerCase().includes('affective') ||
      s.toLowerCase().includes('crisis') ||
      s.toLowerCase().includes('prosody') ||
      s.toLowerCase().includes('anxiety')
    );

    if (hasSpecialtyMatch) matchScore += 12;
    if (isOnline) matchScore += 3;

    return {
      score: Math.min(99, matchScore),
      isOnline
    };
  };

  return (
    <div className="marketplace-wrapper">
      {/* Compact Specialist Footer/Header Strip (Subordinate, Accessible, No Bios/Ratings/Big CTAs) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <SpecialistStrip
          onSelectDoctor={(doc) => setSelectedDoctorForModal(doc)}
          onConnectDoctor={onConnectDoctor}
        />
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {/* Search Row */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="search-field-wrapper" style={{ flex: '1 1 320px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by doctor name, hospital (NIMHANS, AIIMS), or condition (Anxiety, Depression, Sleep)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-field"
            />
          </div>

          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="select-field"
            style={{ minWidth: '180px' }}
          >
            <option value="ALL">All Clinical Specialties</option>
            <option value="Affective">Affective / Mood Disorders</option>
            <option value="Anxiety">Anxiety &amp; Panic Triage</option>
            <option value="Somatic">Somatic Suppression</option>
            <option value="Crisis">Crisis Intervention</option>
            <option value="Sleep">Sleep &amp; Insomnia</option>
            <option value="ADHD">Adult ADHD &amp; Executive Function</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select-field"
            style={{ minWidth: '160px' }}
          >
            <option value="RECOMMENDED">Sort: Recommended</option>
            <option value="PRICE_ASC">Sort: Fee (Low to High)</option>
            <option value="RATING">Sort: Highest Rated</option>
            <option value="EXPERIENCE">Sort: Experience (Years)</option>
          </select>
        </div>

        {/* Quick Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>QUICK FILTERS:</span>

          <button
            type="button"
            className={`btn-secondary ${priceFilter === 'ALL' && !availableOnly ? 'active' : ''}`}
            onClick={() => { setPriceFilter('ALL'); setAvailableOnly(false); }}
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.72rem' }}
          >
            All Doctors ({clinicians.length})
          </button>

          <button
            type="button"
            className={`btn-secondary ${availableOnly ? 'active' : ''}`}
            onClick={() => setAvailableOnly(!availableOnly)}
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.72rem' }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', marginRight: '4px' }}></span>
            Instant Video Call (Online Now)
          </button>

          <button
            type="button"
            className={`btn-secondary ${priceFilter === 'FREE' ? 'active' : ''}`}
            onClick={() => setPriceFilter(priceFilter === 'FREE' ? 'ALL' : 'FREE')}
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.72rem', borderColor: priceFilter === 'FREE' ? '#10b981' : undefined, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <IconGift size={13} />
            <span>Free / Pro-Bono (₹0)</span>
          </button>

          <button
            type="button"
            className={`btn-secondary ${priceFilter === 'UNDER_250' ? 'active' : ''}`}
            onClick={() => setPriceFilter(priceFilter === 'UNDER_250' ? 'ALL' : 'UNDER_250')}
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.72rem' }}
          >
            Under ₹250
          </button>

          <button
            type="button"
            className={`btn-secondary ${priceFilter === 'UNDER_350' ? 'active' : ''}`}
            onClick={() => setPriceFilter(priceFilter === 'UNDER_350' ? 'ALL' : 'UNDER_350')}
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.72rem' }}
          >
            Under ₹350
          </button>

          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Showing <strong>{sortedClinicians.length}</strong> verified practitioners
          </span>
        </div>
      </div>

      {/* Doctor Cards Grid (Practo / Apollo 24/7 Aesthetic) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {sortedClinicians.map((doc) => {
          const isOnline = doc.availabilityStatus === 'ONLINE' || doc.isAvailable;
          const displayName = doc.fullName || doc.name;
          const displayDegrees = doc.degrees || doc.qualification || 'MBBS, MD Psychiatry';
          const regNo = doc.medicalRegistrationNumber || doc.registrationNo;
          const inst = doc.hospital || doc.institution;
          const consultFee = doc.consultationFee !== undefined ? doc.consultationFee : 299;
          const isFree = consultFee === 0 || doc.ratePerMinute === 0;
          const rateMin = doc.ratePerMinute || 12;
          const match = calculateDoctorMatch(doc);

          return (
            <div
              className="workstation-panel"
              key={doc.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border: isOnline ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-color)',
                boxShadow: isOnline ? '0 4px 20px rgba(16, 185, 129, 0.08)' : 'none',
                position: 'relative'
              }}
            >
              {/* Doctor Header: Photo + Core Credentials */}
              <div style={{ padding: '1.1rem 1.1rem 0.75rem', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                {/* Doctor Avatar with Real Verified Ring */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={doc.avatarUrl}
                    alt={displayName}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  />
                  {isOnline && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-3px',
                        right: '-3px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        border: '2px solid #0f172a',
                        display: 'block'
                      }}
                      title="Online for Instant Video Call"
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + Verified Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.25 }}>
                      {displayName}
                    </h3>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.15)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <IconCheck size={10} />
                      <span>VERIFIED</span>
                    </span>
                  </div>

                  {/* Degrees */}
                  <div style={{ fontSize: '0.74rem', color: 'var(--accent-teal)', marginTop: '2px', fontWeight: 600 }}>
                    {displayDegrees}
                  </div>

                  {/* Title & Experience & Registration */}
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {doc.title} • <strong>{doc.experienceYears || 10} yrs exp</strong>
                    {regNo && <span style={{ color: 'var(--text-muted)' }}> • Reg: {regNo}</span>}
                  </div>

                  {/* Hospital */}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <IconBuilding size={12} />
                    <span>{inst}</span>
                  </div>
                </div>
              </div>

              {/* Patient Trust Row (Rating + Recommendation + Stories) */}
              <div
                style={{
                  margin: '0 1.1rem',
                  padding: '0.45rem 0.65rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontWeight: 700 }}>
                    <IconStar size={12} style={{ fill: '#f59e0b' }} />
                    <span>{doc.rating || 4.9}</span>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>({doc.patientStories || 240} stories)</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontWeight: 600 }}>
                  <IconThumbsUp size={12} />
                  <span>{doc.recommendationRate || '98%'} Recommended</span>
                </div>
              </div>

              {/* Bio snippet */}
              <div style={{ padding: '0.65rem 1.1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {doc.bio}
              </div>

              {/* Specialty Tags */}
              <div style={{ padding: '0 1.1rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                {doc.specialties.slice(0, 3).map((spec, i) => (
                  <span className="metric-tag" key={i} style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                    {spec}
                  </span>
                ))}
              </div>

              {/* Match & Slot Ribbon */}
              <div
                style={{
                  margin: '0 1.1rem 0.75rem',
                  padding: '0.35rem 0.65rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <span>AI MATCH: <strong style={{ color: 'var(--accent-teal)' }}>{match.score}%</strong></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: isOnline ? '#10b981' : 'var(--text-muted)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isOnline ? '#10b981' : 'var(--text-muted)', display: 'inline-block' }} />
                  <span>{isOnline ? 'Available in 5 mins' : 'Next Slot Today'}</span>
                </span>
                <span>LANG: <strong>{doc.languages ? doc.languages.slice(0, 2).join('/') : 'EN/HI'}</strong></span>
              </div>

              {/* Pricing Box & Action Footer */}
              <div
                style={{
                  marginTop: 'auto',
                  padding: '0.9rem 1.1rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}
              >
                {/* Price Display */}
                <div>
                  {isFree ? (
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                        FREE
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pro-Bono / Tele-MANAS</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          ₹{consultFee.toFixed(0)}
                        </span>
                        {doc.originalFee && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            ₹{doc.originalFee}
                          </span>
                        )}
                        <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>
                          {doc.discount || '50% OFF'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                        Full Video Consult • (or ₹{rateMin}/min)
                      </div>
                    </div>
                  )}
                </div>

                {/* Connect Action Button */}
                <button
                  className="btn-primary"
                  style={{
                    padding: '0.55rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    background: isFree ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                    whiteSpace: 'nowrap'
                  }}
                  disabled={!isOnline}
                  onClick={() => setSelectedDoctorForModal(doc)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  <span>
                    {isOnline
                      ? (isFree ? 'Connect Free Call' : `Book Video Call (₹${consultFee})`)
                      : 'Next Slot 2:30 PM'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transparent Pre-Authorization Modal (Practo / Apollo Style) */}
      {selectedDoctorForModal && (() => {
        const doc = selectedDoctorForModal;
        const consultFee = doc.consultationFee !== undefined ? doc.consultationFee : 299;
        const isFree = consultFee === 0 || doc.ratePerMinute === 0;
        const holdAmount = isFree ? 0 : consultFee;
        const rateMin = doc.ratePerMinute || 12;

        return (
          <div className="modal-overlay" onClick={() => setSelectedDoctorForModal(null)}>
            <div className="modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-group">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-teal)' }}>
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <h3 className="modal-title">Confirm Telehealth Consultation</h3>
                </div>
                <button className="modal-close-btn" onClick={() => setSelectedDoctorForModal(null)} aria-label="Close modal">
                  <IconX size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ gap: '1rem' }}>
                {/* Doctor Summary Card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <img
                    src={doc.avatarUrl}
                    alt={doc.name}
                    style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0 }}>{doc.name}</h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.degrees || doc.qualification}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{doc.hospital}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isFree ? '#10b981' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {isFree ? 'FREE' : `₹${consultFee}`}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {isFree ? 'Pro-Bono' : `₹${rateMin}/min`}
                    </div>
                  </div>
                </div>

                {/* Transparent Billing Breakdown */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                    TRANSPARENT BILLING ESTIMATE
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <span>Standard Consultation Fee:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{isFree ? '₹0.00' : `₹${consultFee}.00`}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <span>Pay-as-you-go Rate:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{isFree ? 'FREE' : `₹${rateMin}.00 / min`}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span>Platform Convenience Fee:</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>₹0 (Waived)</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span>Total Authorization Hold:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: isFree ? '#10b981' : 'var(--accent-teal)' }}>
                      {isFree ? '₹0.00 (Pro-Bono)' : `₹${holdAmount}.00`}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0, lineHeight: 1.4 }}>
                    {isFree
                      ? 'This consultation is 100% free under National Tele-MANAS & NGO grants. No payment information or security deposit is required.'
                      : `A temporary ₹${holdAmount} UPI / Card hold is reserved. At call conclusion, you are billed exclusively for actual connected minutes (e.g., a 10-minute session is only ₹${rateMin * 10}). Unused hold amount is released instantly.`}
                  </p>
                </div>

                {/* Biometric Data Disclosure */}
                <div className="medical-disclaimer-box" style={{ padding: '0.75rem', fontSize: '0.72rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <div>
                    <strong>Private &amp; Secure Consultation:</strong> A summary of your recent wellness reflections will be securely shared with {doc.name} to help guide your session.
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="modal-actions-footer">
                  <button className="btn-secondary" onClick={() => setSelectedDoctorForModal(null)} disabled={isPreAuthorizing}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => handleConfirmPreAuth(doc)}
                    disabled={isPreAuthorizing}
                    style={{
                      background: isFree ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined
                    }}
                  >
                    {isPreAuthorizing
                      ? 'Connecting Secure Channel...'
                      : (isFree ? 'Connect Free Call Now' : `Authorize ₹${holdAmount} & Connect Video`)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const AVATAR_PALETTES = [
  'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
  'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
  'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
  'linear-gradient(135deg, #059669 0%, #047857 100%)'
];

function SpecialistAvatar({ doc }) {
  const [imgError, setImgError] = useState(false);
  const name = doc.name || doc.fullName || '';
  const isOnline = doc.availabilityStatus === 'ONLINE' || doc.isAvailable;
  const initials = name
    ? name
        .replace(/^Dr\.\s*/i, '')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
    : 'DR';

  // Deterministic gradient selection based on name
  const charSum = name ? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : 0;
  const backgroundGradient = AVATAR_PALETTES[Math.abs(charSum) % AVATAR_PALETTES.length];

  return (
    <div className="specialist-avatar-wrap">
      <div
        className="specialist-avatar-fallback"
        style={{
          background: backgroundGradient,
          color: '#ffffff',
          fontWeight: 700,
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)'
        }}
      >
        {initials}
      </div>
      {doc.avatarUrl && !imgError && (
        <img
          src={doc.avatarUrl}
          alt={name}
          className="specialist-avatar-img"
          style={{ position: 'absolute', top: 0, left: 0 }}
          onError={() => setImgError(true)}
        />
      )}
      <span
        className={`specialist-avail-dot ${isOnline ? 'online' : 'offline'}`}
        aria-label={isOnline ? 'Online' : 'Offline'}
      />
    </div>
  );
}

/**
 * SpecialistStrip - Compact, horizontally-scrollable strip for patient comfort
 *
 * Features:
 * - Visually secondary to the AI Check-in
 * - CSS scroll snapping and momentum scrolling
 * - Desktop prev/next navigation controls
 * - Dynamic edge fade indicators for horizontal overflow
 * - Interactive Drawer with specialist bio, verified badge, real availability
 * - Safe request consultation action preventing duplicate submissions
 * - Focus restoration to the selected specialist card on drawer close
 */
export function SpecialistStrip({ onSelectDoctor, onConnectDoctor, setActiveTab, onShowToast }) {
  const [specialists, setSpecialists] = useState(getVerifiedClinicians);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef(null);
  const lastActiveButtonRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const unsub = DoctorAuthService.subscribe(() => {
      const updated = DoctorAuthService.getDoctors().filter((d) => d.verificationStatus === 'VERIFIED');
      setSpecialists(updated);
    });
    return () => unsub();
  }, []);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    Promise.resolve().then(checkScroll);
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [specialists]);

  const scrollBy = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleCardClick = (doc, e) => {
    lastActiveButtonRef.current = e?.currentTarget || document.activeElement;
    setSelectedDoc(doc);
    onSelectDoctor?.(doc);
  };

  const handleCloseDrawer = () => {
    setSelectedDoc(null);
    if (lastActiveButtonRef.current && typeof lastActiveButtonRef.current.focus === 'function') {
      setTimeout(() => {
        lastActiveButtonRef.current?.focus();
      }, 50);
    }
  };

  const handleRequestSession = (doc) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    ClinicalAuditService.logEvent({
      eventType: 'CONSULTATION_REQUESTED',
      label: `Consultation Requested with ${doc.name || doc.fullName}`,
      actor: 'PATIENT',
      actorId: 'MV-PATIENT-8821',
      sessionId: `req_${Math.random().toString(36).substring(2, 9)}`,
      status: 'PENDING',
      details: `Specialist requested: ${doc.name || doc.fullName} (${doc.specialization || 'Mental Health'})`
    });

    DoctorAuthService.createConsultationRequest(
      { id: 'PATIENT-8821', name: 'Patient' },
      doc
    );

    setTimeout(() => {
      setIsSubmitting(false);
      handleCloseDrawer();
      if (onShowToast) {
        onShowToast(`Consultation request sent to ${doc.name || doc.fullName}. We'll notify you when ready.`);
      }
      if (onConnectDoctor) {
        onConnectDoctor(doc);
      }
    }, 900);
  };

  return (
    <section className="specialist-strip-container" aria-label="Available Healthcare Specialists">
      <div className="specialist-strip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 className="specialist-strip-title">
            <IconUsers size={17} style={{ color: 'var(--color-primary)' }} />
            <span>Connect with a Specialist</span>
          </h3>
          <p className="specialist-strip-sub">
            Verified, confidential care available whenever you'd like a human listening ear
          </p>
        </div>

        {/* Desktop Prev / Next Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {setActiveTab && (
            <InteractiveButton
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('doctors')}
              style={{ fontSize: '0.82rem', padding: '0.3rem 0.65rem' }}
            >
              <span>View All Directory</span>
              <span>›</span>
            </InteractiveButton>
          )}
          <IconButton
            icon={<IconChevronLeft size={16} />}
            label="Scroll specialists left"
            size="sm"
            variant="ghost"
            disabled={!canScrollLeft}
            onClick={() => scrollBy(-240)}
          />
          <IconButton
            icon={<IconChevronRight size={16} />}
            label="Scroll specialists right"
            size="sm"
            variant="ghost"
            disabled={!canScrollRight}
            onClick={() => scrollBy(240)}
          />
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Subtle Horizontal Edge Fades */}
        {canScrollLeft && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '24px',
              background: 'linear-gradient(to right, var(--card-bg), transparent)',
              pointerEvents: 'none',
              zIndex: 2
            }}
            aria-hidden="true"
          />
        )}
        {canScrollRight && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '24px',
              background: 'linear-gradient(to left, var(--card-bg), transparent)',
              pointerEvents: 'none',
              zIndex: 2
            }}
            aria-hidden="true"
          />
        )}

        <div
          ref={scrollRef}
          className="specialist-scroll-track"
          role="region"
          aria-label="Specialists List"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {specialists.map((doc) => {
            const isOnline = doc.availabilityStatus === 'ONLINE' || doc.isAvailable;
            const name = doc.name || doc.fullName;
            const specialty = doc.specialization || doc.specialties?.[0] || 'Mental Health';

            return (
              <button
                key={doc.id}
                type="button"
                className="specialist-mini-card"
                onClick={(e) => handleCardClick(doc, e)}
                style={{ scrollSnapAlign: 'start' }}
                title={`${name} • ${specialty} (${isOnline ? 'Online now' : 'Available'})`}
                aria-label={`View profile for ${name}, ${specialty}`}
              >
                <SpecialistAvatar doc={doc} />

                <div className="specialist-mini-info">
                  <span className="specialist-mini-name">{name}</span>
                  <span className="specialist-mini-spec">{specialty}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Specialist Detail Drawer with Patient-Friendly Info */}
      <Drawer
        isOpen={Boolean(selectedDoc)}
        onClose={handleCloseDrawer}
        title={selectedDoc ? (selectedDoc.name || selectedDoc.fullName) : 'Specialist Profile'}
        width="440px"
      >
        {selectedDoc && (() => {
          const isOnline = selectedDoc.availabilityStatus === 'ONLINE' || selectedDoc.isAvailable;
          const name = selectedDoc.name || selectedDoc.fullName;
          const specialty = selectedDoc.specialization || selectedDoc.specialties?.[0] || 'Mental Health';
          const isVerified = selectedDoc.verificationStatus === 'VERIFIED';
          const bio = selectedDoc.bio || "Dedicated healthcare professional providing calm, confidential telehealth consultations.";
          const consultFee = selectedDoc.consultationFee !== undefined ? selectedDoc.consultationFee : 299;
          const isFree = consultFee === 0 || selectedDoc.ratePerMinute === 0;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <SpecialistAvatar doc={selectedDoc} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {name}
                    </h3>
                    {isVerified && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--accent-teal-subtle)',
                          color: 'var(--accent-teal)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-pill)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <IconCheck size={10} />
                        <span>VERIFIED</span>
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    {specialty}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedDoc.hospital || selectedDoc.institution || 'MindVision Network Specialist'}
                  </div>
                </div>
              </div>

              {/* Availability Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isOnline ? '#10b981' : 'var(--text-muted)',
                    display: 'inline-block'
                  }}
                />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isOnline ? 'Online and ready to connect' : 'Available by appointment request'}
                </span>
              </div>

              {/* Patient-Friendly Description */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  About
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  {bio}
                </p>
              </div>

              {/* Consultation details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.85rem', backgroundColor: 'var(--card-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Languages</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedDoc.languages ? selectedDoc.languages.join(', ') : 'English, Hindi'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Experience</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedDoc.experienceYears || 10}+ Years Clinical
                  </strong>
                </div>
              </div>

              {/* Privacy Notice */}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', lineHeight: 1.4 }}>
                <IconShieldCheck size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>Private &amp; confidential. Your check-in history is never shared without your explicit consent.</span>
              </div>

              {/* Request Action Button */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <InteractiveButton
                  variant="primary"
                  onClick={() => handleRequestSession(selectedDoc)}
                  loading={isSubmitting}
                  style={{ width: '100%', justifyContent: 'center' }}
                  aria-label={`Request consultation with ${name}`}
                >
                  {isSubmitting
                    ? 'Submitting request...'
                    : isOnline
                    ? (isFree ? 'Connect Free Call Now' : `Request Video Call (₹${consultFee})`)
                    : 'Request Availability'}
                </InteractiveButton>
              </div>
            </div>
          );
        })()}
      </Drawer>
    </section>
  );
}


