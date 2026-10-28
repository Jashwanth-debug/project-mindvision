import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LiveTelemetrySandbox from './components/LiveTelemetrySandbox';
import ClinicianPortal from './components/ClinicianPortal';
import DoctorMarketplace from './components/DoctorMarketplace';
import DoctorDirectoryModal from './components/DoctorDirectoryModal';
import TeletherapySessionModal from './components/TeletherapySessionModal';
import HomeOverview from './components/HomeOverview';
import ScreeningAssessment from './components/ScreeningAssessment';
import DocumentationView from './components/DocumentationView';
import LiveSensorModal from './components/LiveSensorModal';
import AdminVerificationView from './components/AdminVerificationView';
import DoctorAuthModal from './components/DoctorAuthModal';
import LongitudinalComparisonView from './components/LongitudinalComparisonView';
import PatientHistoryView from './components/PatientHistoryView';
import CrisisSupport from './components/CrisisSupport';
import ErrorBoundary from './components/ErrorBoundary';
import WellnessHubView from './components/wellness/WellnessHubView';
import AssessmentCentreView from './components/AssessmentCentreView';
import Footer from './components/Footer';
import Toast from './components/Toast';
import { PageTransition } from './components/primitives';
import { createTeletherapySession } from './data/clinicians';
import { DoctorAuthService } from './services/doctorAuthService';
import { DesktopBridge } from './services/desktopBridge';

// Pre-populated clinical evaluation records as specified in requirements
const INITIAL_RECORDS = [
  {
    id: 'eefd6570a2',
    timestamp: '9/23/2026, 10:25:09 PM',
    dateIso: '2026-09-23T22:25:09.000Z',
    au4: 0.07,
    au15: 0.04,
    prosody: 0,
    sentiment: 0.15,
    compositeRisk: 1.2,
    incongruence: 0.11,
    riskLevel: 'MINIMAL',
    isDemo: true,
    summary: 'Steady & calm pattern reported',
    explanation: 'Your self-reported answers and estimated signals reflect a steady, calm pattern today.',
    text: "Patient states: 'Routine bi-weekly check-in. Work load is manageable and sleep is restful.'",
    cues: {
      words: 'Routine bi-weekly check-in. Work load is manageable and sleep is restful.',
      speakingRhythm: 'Natural pauses, warmth, and steadiness in your voice tone.',
      gentleExpressions: 'Subtle signs of brow concentration and relaxed facial muscles.'
    }
  },
  {
    id: '7d2b8cd2f4',
    timestamp: '9/23/2026, 10:15:51 PM',
    dateIso: '2026-09-23T22:15:51.000Z',
    au4: 0,
    au15: 0.02,
    prosody: 0,
    sentiment: 0.10,
    compositeRisk: 0.8,
    incongruence: 0.09,
    riskLevel: 'MINIMAL',
    isDemo: true,
    summary: 'Steady & calm pattern reported',
    explanation: 'Your self-reported answers and estimated signals reflect a steady, calm pattern today.',
    text: "Patient states: 'No acute stressors or physical complaints reported.'",
    cues: {
      words: 'No acute stressors or physical complaints reported.',
      speakingRhythm: 'Calm cadence and smooth phrasing with no vocal tremors.',
      gentleExpressions: 'Comfortable, unstrained facial expression.'
    }
  },
  {
    id: 'a931f804c8',
    timestamp: '9/23/2026, 09:44:12 PM',
    dateIso: '2026-09-23T21:44:12.000Z',
    au4: 0.62,
    au15: 0.48,
    prosody: 0.45,
    sentiment: 0.35,
    compositeRisk: 5.6,
    incongruence: 0.17,
    riskLevel: 'ELEVATED',
    isDemo: true,
    summary: 'It might help to talk with someone',
    explanation: 'We noticed subtle signs of stress in your responses today. Remember that carrying a lot is hard, and gentle support is always available.',
    text: "Patient states: 'Work deadlines have been accumulating; struggling slightly with mid-day fatigue.'",
    cues: {
      words: 'Work deadlines have been accumulating; struggling slightly with mid-day fatigue.',
      speakingRhythm: 'Slightly hesitant pacing with pauses during response formulation.',
      gentleExpressions: 'Mild furrowing of the brow detected during questions.'
    }
  },
  {
    id: 'c4b1209ae1',
    timestamp: '9/23/2026, 08:30:19 PM',
    dateIso: '2026-09-23T20:30:19.000Z',
    au4: 0.88,
    au15: 0.74,
    prosody: 0.72,
    sentiment: 0.20,
    compositeRisk: 7.8,
    incongruence: 0.58,
    riskLevel: 'SEVERE',
    isDemo: true,
    summary: 'It might help to talk with someone',
    explanation: 'We noticed signs of tension in your responses. Gentle, confidential support from a caring listener is available.',
    text: "Patient states: 'Everything is fine. Really, I can handle it.'",
    cues: {
      words: 'Everything is fine. Really, I can handle it.',
      speakingRhythm: 'Compressed pitch variations and rapid pauses.',
      gentleExpressions: 'Elevated brow tension with lowered lip corners.'
    }
  }
];

const STORAGE_KEY_PATIENT_RECORDS = 'mindvision_patient_records';

function loadStoredPatientRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATIENT_RECORDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[MindVision] Failed to read stored patient records from localStorage:', err);
  }
  return INITIAL_RECORDS;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('mindvision_theme') || 'light';
    } catch {
      return 'light';
    }
  });
  const [userRole, setUserRole] = useState(() => DoctorAuthService.getCurrentSession()?.role || 'PATIENT');
  const [isSensorOpen, setIsSensorOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState(DoctorAuthService.getCurrentSession());
  const [externalValues, setExternalValues] = useState(null);
  const [records, setRecords] = useState(loadStoredPatientRecords);
  const [activeEscalation, setActiveEscalation] = useState(null);

  // High-Risk Escalation Modal State
  const [isDoctorDirectoryOpen, setIsDoctorDirectoryOpen] = useState(false);
  const [highRiskTelemetry, setHighRiskTelemetry] = useState(null);

  // Active Teletherapy Session State
  const [activeTeletherapySession, setActiveTeletherapySession] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [activeWellnessActivity, setActiveWellnessActivity] = useState(null);

  // Handle Theme switching & html data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('mindvision_theme', theme);
    } catch {
      // Ignored
    }
  }, [theme]);

  // Initialize Desktop SQLite Persistence & Load On-Device Records
  useEffect(() => {
    DesktopBridge.initializeDesktopPersistence().then(() => {
      DesktopBridge.loadCheckInRecords(INITIAL_RECORDS).then((loaded) => {
        if (Array.isArray(loaded) && loaded.length > 0) {
          setRecords(loaded);
        }
      });
    });
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // Real-time signaling listener for cross-tab patient/doctor/admin sync
  useEffect(() => {
    const handleNav = (e) => {
      if (e.detail) {
        if (typeof e.detail === 'object') {
          if (e.detail.tab) setActiveTab(e.detail.tab);
          if (e.detail.activity) setActiveWellnessActivity(e.detail.activity);
        } else {
          setActiveTab(e.detail);
        }
      }
    };
    window.addEventListener('NAVIGATE_TAB', handleNav);

    const handleWellnessNav = (e) => {
      if (e.detail?.activity) {
        setActiveWellnessActivity(e.detail.activity);
      }
      setActiveTab('wellness');
    };
    window.addEventListener('NAVIGATE_WELLNESS_ACTIVITY', handleWellnessNav);

    const unsubscribe = DoctorAuthService.subscribe((msg) => {
      if (msg.type === 'SESSION_CHANGED') {
        setCurrentSession(DoctorAuthService.getCurrentSession());
      } else if (msg.type === 'CONSULTATION_ACCEPTED') {
        const consult = msg.payload.consultation;
        showToast(`🎉 Dr. ${consult.doctorName} accepted your consultation request! Entering live video room...`);
        const session = createTeletherapySession(consult.doctor, consult.telemetrySnapshot, consult.patientId);
        setActiveTeletherapySession(session);
      } else if (msg.type === 'CONSULTATION_REJECTED') {
        showToast(`Consultation request was declined by the clinician. Please choose another available doctor.`);
      }
    });

    return () => {
      window.removeEventListener('NAVIGATE_TAB', handleNav);
      window.removeEventListener('NAVIGATE_WELLNESS_ACTIVITY', handleWellnessNav);
      unsubscribe();
    };
  }, []);

  // Add a new patient record
  const handleSavePatientRecord = (newRecord) => {
    if (!newRecord || typeof newRecord !== 'object') return;
    const validatedRecord = {
      ...newRecord,
      id: newRecord.id || `scr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: newRecord.timestamp || new Date().toLocaleString(),
      dateIso: newRecord.dateIso || new Date().toISOString(),
      isDemo: false
    };

    DesktopBridge.saveCheckInRecord(validatedRecord);

    setRecords((prev) => {
      const updated = [validatedRecord, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_PATIENT_RECORDS, JSON.stringify(updated));
      } catch (err) {
        console.warn('[MindVision] Failed to save patient records to localStorage:', err);
      }
      return updated;
    });

    // If new record is severe, trigger active escalation queue
    if (validatedRecord.riskLevel === 'SEVERE') {
      setActiveEscalation(validatedRecord);
    }
  };

  const handleDeletePatientRecord = (recordId) => {
    DesktopBridge.deleteCheckInRecord(recordId);
    setRecords((prev) => {
      const updated = prev.filter((r) => (r.id || r.timestamp) !== recordId);
      try {
        localStorage.setItem(STORAGE_KEY_PATIENT_RECORDS, JSON.stringify(updated));
      } catch (err) {
        console.warn('[MindVision] Failed to update patient records in localStorage:', err);
      }
      return updated;
    });
    showToast('Check-in record removed from this device.');
  };

  // Connect a doctor and launch active teletherapy room
  const handleConnectDoctor = (doctor, telemetrySnapshot = null) => {
    const session = createTeletherapySession(doctor, telemetrySnapshot || highRiskTelemetry);
    setActiveTeletherapySession(session);
    setIsDoctorDirectoryOpen(false);
  };

  // Automated High-Risk Escalation Handler (Fires when Composite Risk >= 7.0 OR Incongruence >= 0.75)
  const handleTriggerHighRiskEscalation = (telemetryData) => {
    setHighRiskTelemetry(telemetryData);
    setIsDoctorDirectoryOpen(true);
    showToast('🚨 High-Risk Telemetry Detected! Opening On-Call Clinician Directory.');
  };

  // Simulated escalation triggers from portal
  const handleTriggerTestEscalation = () => {
    const testRecord = {
      id: `urg_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toLocaleString(),
      au4: 0.92,
      au15: 0.84,
      prosody: 0.78,
      sentiment: 0.18,
      compositeRisk: 8.6,
      incongruence: 0.67,
      riskLevel: 'SEVERE',
      text: "Patient reporting calm verbal state ('No issues at all') while micro-expression telemetry reveals acute emotional suppression."
    };
    setActiveEscalation(testRecord);
    showToast('🚨 Simulated P2P Incoming Teleconsultation Request triggered in Portal!');
  };

  const handleAcceptEscalation = (record) => {
    // Launch room with default clinician Dr. Ananya Sharma (NIMHANS)
    const defaultDoctor = {
      id: 'doc_ananya_sharma',
      name: 'Dr. Ananya Sharma',
      fullName: 'Dr. Ananya Sharma, MD (NIMHANS)',
      title: 'Senior Consultant Psychiatrist & Neurotherapist',
      consultationFee: 299.00,
      ratePerMinute: 12.00,
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400'
    };
    handleConnectDoctor(defaultDoctor, {
      compositeRisk: record.compositeRisk || 8.6,
      incongruenceIndex: record.incongruence || 0.67,
      riskLevel: record.riskLevel || 'SEVERE',
      shapSummary: [
        { name: 'AU04 Eyebrow Furrow', weight: 36 },
        { name: 'AU15 Lip Depressor', weight: 28 },
        { name: 'Acoustic Pitch Tremor', weight: 22 },
        { name: 'Verbal Sentiment Stress', weight: 14 }
      ],
      soapNoteMarkdown: record.text || 'Severe somatic-verbal divergence detected.'
    });
    setActiveEscalation(null);
  };

  const handleDismissEscalation = () => {
    setActiveEscalation(null);
  };

  const handleSyncTelemetryFromSensor = (au4, au15, jitter) => {
    setExternalValues({ au4, au15, jitter });
    showToast(`Synchronized live camera telemetry: AU4=${au4}, AU15=${au15}, Jitter=${jitter}`);
  };

  return (
    <div className="app-container">
      {/* Global Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
        currentSession={currentSession}
        userRole={userRole}
        setUserRole={setUserRole}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onEmergencyConnect={() => {
          setActiveTab('crisis');
        }}
      />

      {/* Main Module Content */}
      <main className="main-content">
        <ErrorBoundary
          fallbackTitle="Something didn't load smoothly"
          onReturn={() => setActiveTab('home')}
        >
          <PageTransition key={activeTab}>
            {activeTab === 'home' && (
              <HomeOverview
                setActiveTab={setActiveTab}
                records={records}
                userRole={userRole}
                setUserRole={setUserRole}
                onConnectDoctor={handleConnectDoctor}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'wellness' && (
              <WellnessHubView
                initialActivity={activeWellnessActivity}
                records={records}
                setActiveTab={setActiveTab}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'results' && (
              userRole === 'PATIENT' ? (
                <PatientHistoryView
                  records={records}
                  setActiveTab={setActiveTab}
                  onShowToast={showToast}
                  onDeleteRecord={handleDeletePatientRecord}
                />
              ) : (
                <LongitudinalComparisonView currentRecord={records[0]} />
              )
            )}

            {activeTab === 'demo' && (
              <LiveTelemetrySandbox
                onLaunchSensor={() => setIsSensorOpen(true)}
                onSavePatientRecord={handleSavePatientRecord}
                onShowToast={showToast}
                onTriggerHighRiskEscalation={handleTriggerHighRiskEscalation}
                externalValues={externalValues}
              />
            )}

            {activeTab === 'portal' && (
              <ClinicianPortal
                records={records}
                activeEscalation={activeEscalation}
                onAcceptEscalation={handleAcceptEscalation}
                onDismissEscalation={handleDismissEscalation}
                onTriggerTestEscalation={handleTriggerTestEscalation}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'doctors' && (
              <DoctorMarketplace
                onConnectDoctor={handleConnectDoctor}
                onShowToast={showToast}
                currentTelemetrySnapshot={{
                  compositeRisk: 6.5,
                  incongruenceIndex: 0.42,
                  riskLevel: 'ELEVATED',
                  shapSummary: [
                    { name: 'AU04 Eyebrow Furrow', weight: 32 },
                    { name: 'AU15 Lip Depressor', weight: 26 },
                    { name: 'Acoustic Pitch Tremor', weight: 24 },
                    { name: 'Verbal Sentiment Stress', weight: 18 }
                  ],
                  soapNoteMarkdown: 'Patient presenting with elevated non-verbal stress parameters.'
                }}
              />
            )}

            {activeTab === 'admin' && (
              <AdminVerificationView onShowToast={showToast} />
            )}

            {activeTab === 'assessments' && (
              <AssessmentCentreView
                onLaunchMultimodalCheckIn={() => setActiveTab('assessment')}
                setActiveTab={setActiveTab}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'assessment' && (
              <ScreeningAssessment
                onCompleteAssessment={handleSavePatientRecord}
                onShowToast={showToast}
              />
            )}

            {(activeTab === 'docs' || activeTab === 'help') && (
              <DocumentationView />
            )}

            {activeTab === 'crisis' && (
              <CrisisSupport
                onReturn={() => setActiveTab('home')}
                setActiveTab={setActiveTab}
              />
            )}
          </PageTransition>
        </ErrorBoundary>
      </main>

      {/* Doctor Registration & Role Login Modal */}
      <DoctorAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSessionUpdated={() => setCurrentSession(DoctorAuthService.getCurrentSession())}
        onShowToast={showToast}
      />

      {/* Live Camera & Waveform Sensor Modal */}
      <LiveSensorModal
        isOpen={isSensorOpen}
        onClose={() => setIsSensorOpen(false)}
        onSyncTelemetry={handleSyncTelemetryFromSensor}
      />

      {/* High-Risk Escalation Doctor Directory Modal */}
      <DoctorDirectoryModal
        isOpen={isDoctorDirectoryOpen}
        onClose={() => setIsDoctorDirectoryOpen(false)}
        onStartSession={(doc) => handleConnectDoctor(doc, highRiskTelemetry)}
        highRiskTelemetry={highRiskTelemetry}
      />

      {/* Live Teletherapy Session Viewport (Daily.co / WebRTC Video Call Modal with Doctor Floating HUD) */}
      <TeletherapySessionModal
        session={activeTeletherapySession}
        onClose={() => setActiveTeletherapySession(null)}
        onFinalizeSession={(invoice) => {
          if (activeTeletherapySession) {
            DoctorAuthService.finalizeConsultation(activeTeletherapySession.sessionId, invoice);
          }
          showToast(`Teletherapy Session Finalized. Invoice ${invoice.transactionRef} billed ₹${invoice.totalCharged}`);
        }}
        onShowToast={showToast}
      />

      {/* Toast Feedback */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage('')} />

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
