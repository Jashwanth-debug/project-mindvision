/**
 * MindVision Clinical AI - Doctor Registry, Auth & Real-Time Signaling Service
 * Manages Persistent Accounts (localStorage) + Real-Time Cross-Tab Signaling (BroadcastChannel)
 */

const STORAGE_KEY_DOCTORS = 'mindvision_doctors_registry_v2';
const STORAGE_KEY_CURRENT_USER = 'mindvision_current_session_v1';
const STORAGE_KEY_CONSULTATIONS = 'mindvision_consultations_v1';
const CHANNEL_NAME = 'mindvision_p2p_channel';

import { INITIAL_CLINICIANS } from '../data/clinicians.js';

// Default Seed Clinicians derived from expanded clinician directory
const SEED_DOCTORS = INITIAL_CLINICIANS;

// BroadcastChannel instance for real-time multi-tab signaling
let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not available:', e);
}

// Helpers for localStorage with in-memory fallback for Node backend
const memoryStore = new Map();

function getStoredItem(key, defaultValue) {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    }
    return memoryStore.has(key) ? memoryStore.get(key) : defaultValue;
  } catch {
    return memoryStore.has(key) ? memoryStore.get(key) : defaultValue;
  }
}

function setStoredItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      memoryStore.set(key, value);
    }
  } catch {
    memoryStore.set(key, value);
  }
}

function broadcastEvent(type, payload = {}) {
  const message = { type, payload, timestamp: Date.now() };
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch {
      // Ignored
    }
  }
  try {
    localStorage.setItem('mindvision_last_event', JSON.stringify(message));
  } catch {
    // Ignored
  }
}

export class DoctorAuthService {
  // Initialize doctors registry
  static init() {
    const existing = getStoredItem(STORAGE_KEY_DOCTORS, null);
    if (!existing || existing.length === 0) {
      setStoredItem(STORAGE_KEY_DOCTORS, SEED_DOCTORS);
    } else {
      const userRegistered = existing.filter((d) => !d.isDemo);
      const seedIds = new Set(SEED_DOCTORS.map((d) => d.id));
      const filteredUser = userRegistered.filter((d) => !seedIds.has(d.id));
      setStoredItem(STORAGE_KEY_DOCTORS, [...SEED_DOCTORS, ...filteredUser]);
    }
  }

  // Get all doctors
  static getDoctors() {
    this.init();
    return getStoredItem(STORAGE_KEY_DOCTORS, SEED_DOCTORS);
  }

  // Get only Verified & Online doctors for Patient Marketplace
  static getAvailableVerifiedDoctors() {
    const doctors = this.getDoctors();
    return doctors.filter(
      (doc) => doc.verificationStatus === 'VERIFIED' && doc.availabilityStatus === 'ONLINE'
    );
  }

  // Get Doctor by ID
  static getDoctorById(id) {
    const doctors = this.getDoctors();
    return doctors.find((d) => d.id === id) || null;
  }

  // Register a new Doctor (Starts as PENDING and OFFLINE)
  static registerDoctor(formData) {
    const doctors = this.getDoctors();
    const newId = `doc_real_${Date.now().toString(36)}`;

    const newDoctor = {
      id: newId,
      fullName: formData.fullName || 'Dr. Registered Practitioner',
      name: formData.fullName || 'Dr. Registered Practitioner',
      email: formData.email || '',
      phone: formData.phone || '',
      specialization: formData.specialization || 'General Psychiatry',
      specialties: formData.specialization ? [formData.specialization] : ['General Psychiatry'],
      qualification: formData.qualification || 'MBBS, MD Psychiatry',
      medicalRegistrationNumber: formData.medicalRegistrationNumber || `NMC-REG-${Math.floor(10000 + Math.random() * 90000)}`,
      experienceYears: parseInt(formData.experienceYears) || 5,
      hospital: formData.hospital || 'Private Medical Clinic',
      institution: formData.hospital || 'Private Medical Clinic',
      consultationRate: parseFloat(formData.consultationRate) || 150.00,
      ratePerMinute: parseFloat(formData.consultationRate) || 150.00,
      title: `${formData.qualification || 'MD Psychiatry'} • ${formData.hospital || 'Consultant'}`,
      avatarUrl: formData.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
      verificationStatus: 'PENDING', // MUST START AS PENDING
      availabilityStatus: 'OFFLINE',
      isAvailable: false,
      isDemo: false, // REAL REGISTERED ACCOUNT
      rating: 5.00,
      totalConsults: 0,
      bio: formData.bio || 'Registered medical practitioner awaiting admin verification.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    doctors.unshift(newDoctor);
    setStoredItem(STORAGE_KEY_DOCTORS, doctors);
    broadcastEvent('DOCTOR_REGISTERED', { doctor: newDoctor });
    return newDoctor;
  }

  // Admin Action: Approve Doctor
  static approveDoctor(doctorId) {
    const doctors = this.getDoctors();
    const doctor = doctors.find((d) => d.id === doctorId);
    if (doctor) {
      doctor.verificationStatus = 'VERIFIED';
      doctor.updatedAt = new Date().toISOString();
      setStoredItem(STORAGE_KEY_DOCTORS, doctors);
      broadcastEvent('DOCTOR_VERIFIED', { doctorId, doctor });
      return doctor;
    }
    return null;
  }

  // Admin Action: Reject Doctor
  static rejectDoctor(doctorId) {
    const doctors = this.getDoctors();
    const doctor = doctors.find((d) => d.id === doctorId);
    if (doctor) {
      doctor.verificationStatus = 'REJECTED';
      doctor.availabilityStatus = 'OFFLINE';
      doctor.isAvailable = false;
      doctor.updatedAt = new Date().toISOString();
      setStoredItem(STORAGE_KEY_DOCTORS, doctors);
      broadcastEvent('DOCTOR_REJECTED', { doctorId, doctor });
      return doctor;
    }
    return null;
  }

  // Toggle Doctor Online / Offline Availability
  static setDoctorAvailability(doctorId, status) {
    const doctors = this.getDoctors();
    const doctor = doctors.find((d) => d.id === doctorId);
    if (doctor) {
      doctor.availabilityStatus = status; // ONLINE, OFFLINE, BUSY, IN_CONSULTATION
      doctor.isAvailable = status === 'ONLINE';
      doctor.updatedAt = new Date().toISOString();
      setStoredItem(STORAGE_KEY_DOCTORS, doctors);
      broadcastEvent('DOCTOR_AVAILABILITY_CHANGED', { doctorId, status, doctor });
      return doctor;
    }
    return null;
  }

  // Get Current Session Role
  static getCurrentSession() {
    return getStoredItem(STORAGE_KEY_CURRENT_USER, {
      role: 'PATIENT',
      user: null
    });
  }

  // Set Current Session Role (PATIENT, DOCTOR, ADMIN)
  static setCurrentSession(role, user = null) {
    const session = { role, user, timestamp: Date.now() };
    setStoredItem(STORAGE_KEY_CURRENT_USER, session);
    broadcastEvent('SESSION_CHANGED', session);
    return session;
  }

  // --- Real-Time Consultation Requests & Signaling ---

  static getConsultations() {
    return getStoredItem(STORAGE_KEY_CONSULTATIONS, []);
  }

  static createConsultationRequest(patientInfo, doctor, telemetrySnapshot = null) {
    const consultations = this.getConsultations();
    const sessionId = `consult_${Date.now().toString(36)}`;

    const newRequest = {
      sessionId,
      patientId: patientInfo?.id || `MV-PATIENT-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: patientInfo?.name || 'Anonymous Patient',
      doctorId: doctor.id,
      doctorName: doctor.fullName || doctor.name,
      doctorTitle: doctor.title,
      doctor,
      ratePerMinute: doctor.ratePerMinute !== undefined ? doctor.ratePerMinute : (doctor.consultationRate || 12.00),
      consultationFee: doctor.consultationFee !== undefined ? doctor.consultationFee : 299.00,
      razorpayPreAuthHold: (doctor.ratePerMinute === 0 || doctor.consultationFee === 0) ? 0.00 : (doctor.consultationFee || 299.00),
      sessionStatus: 'REQUESTED', // REQUESTED, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED
      createdAt: new Date().toISOString(),
      telemetrySnapshot: telemetrySnapshot || {
        compositeRisk: 7.2,
        incongruenceIndex: 0.52,
        riskLevel: 'SEVERE',
        shapSummary: [
          { name: 'AU04 Eyebrow Furrow', weight: 36 },
          { name: 'AU15 Lip Depressor', weight: 28 },
          { name: 'Acoustic Pitch Tremor', weight: 22 },
          { name: 'Verbal Sentiment Stress', weight: 14 }
        ],
        soapNoteMarkdown: 'Patient reporting severe somatic-verbal incongruence.'
      }
    };

    consultations.unshift(newRequest);
    setStoredItem(STORAGE_KEY_CONSULTATIONS, consultations);
    broadcastEvent('CONSULTATION_REQUESTED', { consultation: newRequest });
    return newRequest;
  }

  static acceptConsultationRequest(sessionId) {
    const consultations = this.getConsultations();
    const request = consultations.find((c) => c.sessionId === sessionId);
    if (request) {
      request.sessionStatus = 'ACCEPTED';
      request.acceptedAt = new Date().toISOString();
      setStoredItem(STORAGE_KEY_CONSULTATIONS, consultations);

      // Set doctor to IN_CONSULTATION
      this.setDoctorAvailability(request.doctorId, 'IN_CONSULTATION');
      broadcastEvent('CONSULTATION_ACCEPTED', { sessionId, consultation: request });
      return request;
    }
    return null;
  }

  static rejectConsultationRequest(sessionId) {
    const consultations = this.getConsultations();
    const request = consultations.find((c) => c.sessionId === sessionId);
    if (request) {
      request.sessionStatus = 'REJECTED';
      setStoredItem(STORAGE_KEY_CONSULTATIONS, consultations);
      broadcastEvent('CONSULTATION_REJECTED', { sessionId, consultation: request });
      return request;
    }
    return null;
  }

  static finalizeConsultation(sessionId, invoiceData = null) {
    const consultations = this.getConsultations();
    const request = consultations.find((c) => c.sessionId === sessionId);
    if (request) {
      request.sessionStatus = 'COMPLETED';
      request.invoice = invoiceData;
      request.completedAt = new Date().toISOString();
      setStoredItem(STORAGE_KEY_CONSULTATIONS, consultations);

      // Reset doctor availability to ONLINE
      this.setDoctorAvailability(request.doctorId, 'ONLINE');
      broadcastEvent('CONSULTATION_COMPLETED', { sessionId, consultation: request, invoice: invoiceData });
      return request;
    }
    return null;
  }

  // Subscribe to real-time cross-tab signaling events
  static subscribe(callback) {
    const handler = (event) => {
      if (event.data) {
        callback(event.data);
      }
    };

    const storageHandler = (e) => {
      if (e.key === 'mindvision_last_event' && e.newValue) {
        try {
          callback(JSON.parse(e.newValue));
        } catch {
          // Ignored
        }
      }
    };

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handler);
    }
    window.addEventListener('storage', storageHandler);

    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handler);
      }
      window.removeEventListener('storage', storageHandler);
    };
  }
}
