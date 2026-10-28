import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ASSESSMENT_INSTRUMENTS,
  calculateAssessmentScore
} from '../data/assessmentInstruments';
import { AssessmentStorageService } from '../services/assessmentStorageService';
import { generateStandardizedAssessmentPdf } from '../utils/pdfReportGenerator';
import {
  IconSparkles,
  IconShieldCheck,
  IconClock,
  IconCheck,
  IconChevronRight,
  IconArrowLeft,
  IconDownload,
  IconRefreshCw,
  IconAlertTriangle,
  IconLifeBuoy,
  IconFileText,
  IconCalendar,
  IconHeartPulse,
  IconSearch,
  IconEdit,
  IconArrowRight,
  IconX,
  IconEye
} from './Icons';
import PdfReportPreviewModal from './primitives/PdfReportPreviewModal';

// Assessment Centre Workflow Stages
const VIEW_STAGE = {
  CATALOGUE: 'CATALOGUE',
  DETAILS: 'DETAILS',
  QUESTIONNAIRE: 'QUESTIONNAIRE',
  REVIEW: 'REVIEW',
  RESULTS: 'RESULTS',
  HISTORY: 'HISTORY'
};

export default function AssessmentCentreView({
  onLaunchMultimodalCheckIn,
  setActiveTab,
  onShowToast
}) {
  const [currentStage, setCurrentStage] = useState(VIEW_STAGE.CATALOGUE);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState('phq-9');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Questionnaire Active State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Results State
  const [completedResult, setCompletedResult] = useState(null);

  // Historical Records State
  const [historicalRecords, setHistoricalRecords] = useState(() => AssessmentStorageService.getAssessmentRecords());
  const [historyInstrumentFilter, setHistoryInstrumentFilter] = useState('phq-9');

  // Preview Assessment PDF State
  const [previewAssessment, setPreviewAssessment] = useState(null);

  // Question container ref for focus management
  const questionContainerRef = useRef(null);

  // Active Instrument Definition
  const currentInstrument = useMemo(() => {
    return ASSESSMENT_INSTRUMENTS.find((inst) => inst.id === selectedInstrumentId) || ASSESSMENT_INSTRUMENTS[0];
  }, [selectedInstrumentId]);

  // Filtered Instruments in Catalogue
  const filteredInstruments = useMemo(() => {
    return ASSESSMENT_INSTRUMENTS.filter((inst) => {
      const matchesCategory = activeCategory === 'all' || inst.categoryKey === activeCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = !query ||
        inst.title.toLowerCase().includes(query) ||
        inst.shortTitle.toLowerCase().includes(query) ||
        inst.description.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  // Sync historical records when entering History stage
  useEffect(() => {
    if (currentStage === VIEW_STAGE.HISTORY || currentStage === VIEW_STAGE.CATALOGUE) {
      Promise.resolve().then(() => {
        setHistoricalRecords(AssessmentStorageService.getAssessmentRecords());
      });
    }
  }, [currentStage]);

  // Focus management when switching questions
  useEffect(() => {
    if (currentStage === VIEW_STAGE.QUESTIONNAIRE && questionContainerRef.current) {
      questionContainerRef.current.focus();
    }
  }, [currentStage, currentQuestionIndex]);

  // Handle Answer Selection
  const handleSelectAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  }, []);

  // Next Question / Proceed to Review
  const handleNextQuestion = useCallback(() => {
    const questions = currentInstrument?.questions || [];
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setCurrentStage(VIEW_STAGE.REVIEW);
    }
  }, [currentInstrument, currentQuestionIndex]);

  // Global Keyboard Navigation for Questionnaire
  useEffect(() => {
    if (currentStage !== VIEW_STAGE.QUESTIONNAIRE) return;

    const handleKeyDown = (e) => {
      // Ignore if user is in an input field
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const questions = currentInstrument?.questions || [];
      const currentQ = questions[currentQuestionIndex];
      const options = currentInstrument?.options || [];

      // Number keys 1-4 or 1-5 to select option
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const optionIndex = parseInt(e.key, 10) - 1;
        if (options[optionIndex]) {
          e.preventDefault();
          handleSelectAnswer(currentQ.id, options[optionIndex].value);
        }
      }

      // Enter to proceed if answered
      if (e.key === 'Enter') {
        if (answers[currentQ?.id] !== undefined) {
          e.preventDefault();
          handleNextQuestion();
        }
      }

      // Left arrow for previous question
      if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
        e.preventDefault();
        setCurrentQuestionIndex((prev) => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStage, currentQuestionIndex, currentInstrument, answers, handleNextQuestion, handleSelectAnswer]);

  // Launch questionnaire for an instrument
  const handleStartInstrument = (instrument) => {
    if (instrument.isMultimodalLive) {
      if (onLaunchMultimodalCheckIn) {
        onLaunchMultimodalCheckIn();
      } else if (setActiveTab) {
        setActiveTab('assessment');
      }
      return;
    }
    setSelectedInstrumentId(instrument.id);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setCurrentStage(VIEW_STAGE.QUESTIONNAIRE);
  };

  // Open Details view
  const handleViewDetails = (instrument) => {
    setSelectedInstrumentId(instrument.id);
    setCurrentStage(VIEW_STAGE.DETAILS);
  };

  // Previous Question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      setCurrentStage(VIEW_STAGE.CATALOGUE);
    }
  };

  // Submit Final Answers
  const handleSubmitAssessment = () => {
    setIsSubmitting(true);
    try {
      const result = calculateAssessmentScore(currentInstrument.id, answers);
      const savedRecord = AssessmentStorageService.saveAssessmentResult(result);
      setCompletedResult(savedRecord);
      setHistoricalRecords(AssessmentStorageService.getAssessmentRecords());
      setCurrentStage(VIEW_STAGE.RESULTS);
      if (onShowToast) {
        onShowToast(`Assessment completed: ${result.shortTitle} score ${result.totalScore}/${result.maxScore}`);
      }
    } catch (err) {
      console.error('[AssessmentCentre] Submission failed:', err);
      if (onShowToast) onShowToast('Failed to calculate assessment score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // PDF Export Trigger
  const handleDownloadPdf = async (recordToExport = null) => {
    const target = recordToExport || completedResult;
    if (!target) return;
    try {
      await generateStandardizedAssessmentPdf(target, { save: true });
      if (onShowToast) onShowToast(`Clinical PDF report downloaded for ${target.shortTitle}.`);
    } catch (err) {
      console.error('[AssessmentCentre] PDF download error:', err);
      if (onShowToast) onShowToast('Failed to generate PDF. Please try again.');
    }
  };

  // Historical Records filtered for the chart
  const chartRecords = useMemo(() => {
    const filtered = historicalRecords
      .filter((r) => r.instrumentId === historyInstrumentFilter)
      .sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
    return filtered;
  }, [historicalRecords, historyInstrumentFilter]);

  // Historical Chart Selected Instrument Definition
  const chartInstrument = useMemo(() => {
    return ASSESSMENT_INSTRUMENTS.find((inst) => inst.id === historyInstrumentFilter) || ASSESSMENT_INSTRUMENTS[0];
  }, [historyInstrumentFilter]);

  return (
    <div className="assessment-centre-shell" role="region" aria-label="MindVision Assessment Centre">

      {/* =========================================================================
          STAGE 1: ASSESSMENT CATALOGUE (Main Screen)
          ========================================================================= */}
      {currentStage === VIEW_STAGE.CATALOGUE && (
        <>
          {/* Hero Header */}
          <section className="assessment-hero-header">
            <div className="assessment-kicker-row">
              <span className="badge-assessment-clinical">
                <IconShieldCheck size={14} />
                <span>Validated Clinical Screening Batteries</span>
              </span>
              <span className="badge-assessment-time">
                <IconClock size={13} />
                <span>Self-Guided • 2–4 Minutes</span>
              </span>
            </div>

            <h1 className="assessment-hero-title">
              Assessment Centre
            </h1>
            <p className="assessment-hero-subtitle">
              Confidential, evidence-based psychometric screeners designed for self-awareness and structured clinical intake. Each questionnaire uses established medical scales and stores your results privately on your device.
            </p>
          </section>

          {/* Nav Controls & Tabs */}
          <div className="assessment-nav-row">
            <div className="assessment-segmented-tabs" role="tablist" aria-label="Assessment Navigation">
              <button
                type="button"
                role="tab"
                aria-selected={true}
                className="assessment-tab-btn active"
                onClick={() => setCurrentStage(VIEW_STAGE.CATALOGUE)}
              >
                <IconFileText size={16} />
                <span>Available Screeners</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={false}
                className="assessment-tab-btn"
                onClick={() => setCurrentStage(VIEW_STAGE.HISTORY)}
              >
                <IconCalendar size={16} />
                <span>Historical Charts &amp; Trends</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="assessment-search-box">
              <IconSearch size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="assessment-search-input"
                placeholder="Search screeners by symptom or scale..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search clinical assessments"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  aria-label="Clear search"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="assessment-filter-chips" role="group" aria-label="Filter by category">
            {[
              { id: 'all', label: 'All Screeners' },
              { id: 'mood', label: 'Mood & Depression' },
              { id: 'anxiety', label: 'Anxiety & Worry' },
              { id: 'stress', label: 'Stress & Burnout' },
              { id: 'sleep', label: 'Sleep & Fatigue' },
              { id: 'multimodal', label: 'Multimodal AI' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`filter-chip-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Assessment Cards Grid */}
          <section className="assessment-catalogue-grid" aria-label="Available assessments list">
            {filteredInstruments.map((instrument) => {
              const latestCompleted = historicalRecords.find((r) => r.instrumentId === instrument.id);
              return (
                <article key={instrument.id} className="assessment-catalogue-card">
                  <div className="assessment-card-header">
                    <div>
                      <span className="badge-assessment-clinical" style={{ marginBottom: '0.5rem' }}>
                        {instrument.clinicalStandard}
                      </span>
                      <h2 className="assessment-card-title">{instrument.title}</h2>
                      <div className="assessment-card-standard">{instrument.citation}</div>
                    </div>
                    <div className="assessment-card-icon-well" aria-hidden="true">
                      {instrument.isMultimodalLive ? <IconSparkles size={20} /> : <IconHeartPulse size={20} />}
                    </div>
                  </div>

                  <p className="assessment-card-desc">{instrument.description}</p>

                  <div className="assessment-card-meta-row">
                    <span className="assessment-card-meta-item">
                      <IconClock size={14} />
                      <span>{instrument.timeEstimate}</span>
                    </span>
                    <span className="assessment-card-meta-item">
                      <IconFileText size={14} />
                      <span>{instrument.questionCount} Questions</span>
                    </span>
                    {latestCompleted && (
                      <span className="assessment-card-meta-item" style={{ color: 'var(--mv-primary)', fontWeight: 600 }}>
                        <IconCheck size={14} />
                        <span>Last Score: {latestCompleted.totalScore}/{latestCompleted.maxScore}</span>
                      </span>
                    )}
                  </div>

                  <div className="assessment-card-actions">
                    <button
                      type="button"
                      className="btn-assessment-primary"
                      style={{ flex: 1 }}
                      onClick={() => handleStartInstrument(instrument)}
                    >
                      <span>{instrument.isMultimodalLive ? 'Start Live Check-in' : 'Start Assessment'}</span>
                      <IconArrowRight size={16} />
                    </button>
                    {!instrument.isMultimodalLive && (
                      <button
                        type="button"
                        className="btn-assessment-secondary"
                        onClick={() => handleViewDetails(instrument)}
                      >
                        <span>Details</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          {filteredInstruments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No assessments match your criteria.</p>
              <button
                type="button"
                className="btn-assessment-secondary"
                onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          STAGE 2: ASSESSMENT DETAILS VIEW
          ========================================================================= */}
      {currentStage === VIEW_STAGE.DETAILS && (
        <div className="assessment-details-container">
          <button
            type="button"
            className="btn-assessment-secondary"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setCurrentStage(VIEW_STAGE.CATALOGUE)}
          >
            <IconArrowLeft size={16} />
            <span>Back to Catalogue</span>
          </button>

          <section className="assessment-details-card">
            <div>
              <span className="badge-assessment-clinical" style={{ marginBottom: '0.75rem' }}>
                {currentInstrument.clinicalStandard}
              </span>
              <h1 className="assessment-hero-title">{currentInstrument.title}</h1>
              <p className="assessment-hero-subtitle">{currentInstrument.description}</p>
            </div>

            {/* Spec Grid */}
            <div className="details-spec-grid">
              <div className="details-spec-item">
                <span className="details-spec-label">Time to Complete</span>
                <span className="details-spec-value">{currentInstrument.timeEstimate}</span>
              </div>
              <div className="details-spec-item">
                <span className="details-spec-label">Number of Items</span>
                <span className="details-spec-value">{currentInstrument.questionCount} Questions</span>
              </div>
              <div className="details-spec-item">
                <span className="details-spec-label">Domain</span>
                <span className="details-spec-value">{currentInstrument.category}</span>
              </div>
              <div className="details-spec-item">
                <span className="details-spec-label">Privacy Standard</span>
                <span className="details-spec-value">100% On-Device</span>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Clinical Purpose
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {currentInstrument.purpose}
              </p>
            </div>

            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Who Is This For?
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {currentInstrument.whoIsItFor}
              </p>
            </div>

            {/* Non-Diagnostic Clinical Notice */}
            <div className="clinical-notice-card" role="note">
              <IconAlertTriangle size={22} className="clinical-notice-icon" />
              <div>
                <div className="clinical-notice-title">Non-Diagnostic Screening Disclaimer</div>
                <p className="clinical-notice-text">
                  This screening tool is provided for educational and clinical decision support purposes. It is not a clinical diagnosis or treatment recommendation. If your responses indicate significant distress, MindVision provides direct access to licensed clinicians and 24/7 crisis resources.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn-assessment-primary"
                style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                onClick={() => handleStartInstrument(currentInstrument)}
              >
                <span>Begin Assessment</span>
                <IconChevronRight size={18} />
              </button>
              <button
                type="button"
                className="btn-assessment-secondary"
                onClick={() => setCurrentStage(VIEW_STAGE.CATALOGUE)}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =========================================================================
          STAGE 3: GUIDED QUESTIONNAIRE VIEW
          ========================================================================= */}
      {currentStage === VIEW_STAGE.QUESTIONNAIRE && (
        <div className="questionnaire-shell">
          {/* Header & Progress Card */}
          <div className="questionnaire-header-card">
            <div className="questionnaire-top-meta">
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentInstrument.shortTitle}
              </span>
              <span>
                Question {currentQuestionIndex + 1} of {currentInstrument.questions.length} (
                {Math.round(((currentQuestionIndex + 1) / currentInstrument.questions.length) * 100)}%)
              </span>
            </div>

            {/* Smooth Progress Track */}
            <div
              className="questionnaire-progress-track"
              role="progressbar"
              aria-valuenow={Math.round(((currentQuestionIndex + 1) / currentInstrument.questions.length) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="questionnaire-progress-fill"
                style={{ width: `${((currentQuestionIndex + 1) / currentInstrument.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Active Question Card */}
          {(() => {
            const currentQ = currentInstrument.questions[currentQuestionIndex];
            const selectedVal = answers[currentQ?.id];

            return (
              <section
                ref={questionContainerRef}
                tabIndex={-1}
                className="questionnaire-card"
                aria-labelledby={`q_prompt_${currentQ?.id}`}
              >
                <div className="questionnaire-step-badge">
                  Item {currentQuestionIndex + 1} • {currentQ?.domain}
                </div>

                <h2 id={`q_prompt_${currentQ?.id}`} className="questionnaire-prompt">
                  {currentQ?.prompt}
                </h2>

                <p className="questionnaire-sub-instruction">
                  {currentInstrument.instructions}
                </p>

                {/* Option Cards */}
                <div className="options-list-grid" role="radiogroup" aria-label={currentQ?.prompt}>
                  {currentInstrument.options.map((opt, idx) => {
                    const isSelected = selectedVal === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`option-card-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectAnswer(currentQ.id, opt.value)}
                      >
                        <div className="option-left-content">
                          <div className="option-radio-ring" aria-hidden="true">
                            {isSelected && <div className="option-radio-dot" />}
                          </div>
                          <div className="option-text-stack">
                            <span className="option-label">{opt.label}</span>
                            <span className="option-desc">{opt.description}</span>
                          </div>
                        </div>
                        <span className="option-shortcut-key" aria-hidden="true">
                          Key {idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Nav Footer */}
                <div className="questionnaire-nav-footer">
                  <button
                    type="button"
                    className="btn-assessment-secondary"
                    onClick={handlePrevQuestion}
                  >
                    <IconArrowLeft size={16} />
                    <span>{currentQuestionIndex === 0 ? 'Exit' : 'Previous'}</span>
                  </button>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Press Enter to continue
                    </span>
                    <button
                      type="button"
                      className="btn-assessment-primary"
                      disabled={selectedVal === undefined}
                      onClick={handleNextQuestion}
                    >
                      <span>
                        {currentQuestionIndex === currentInstrument.questions.length - 1
                          ? 'Review Answers'
                          : 'Next Question'}
                      </span>
                      <IconArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </section>
            );
          })()}
        </div>
      )}

      {/* =========================================================================
          STAGE 4: REVIEW & SUBMISSION VIEW
          ========================================================================= */}
      {currentStage === VIEW_STAGE.REVIEW && (
        <div className="questionnaire-shell">
          <section className="assessment-details-card">
            <div>
              <span className="badge-assessment-clinical" style={{ marginBottom: '0.5rem' }}>
                Summary Verification
              </span>
              <h1 className="assessment-hero-title">Review Your Responses</h1>
              <p className="assessment-hero-subtitle">
                Please verify your answers for the {currentInstrument.title} before finalizing your assessment. You can edit any question by clicking "Edit".
              </p>
            </div>

            {/* Review Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="assessment-review-table" aria-label="Review responses table">
                <thead>
                  <tr>
                    <th style={{ width: '45px' }}>#</th>
                    <th>Question &amp; Domain</th>
                    <th>Your Response</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInstrument.questions.map((q, idx) => {
                    const ansVal = answers[q.id];
                    const matchedOpt = currentInstrument.options.find((opt) => opt.value === ansVal);
                    return (
                      <tr key={q.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{q.domain}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{q.prompt}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--mv-primary)' }}>
                            {matchedOpt ? matchedOpt.label : 'Unanswered'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-assessment-secondary"
                            style={{ padding: '0.35rem 0.65rem', minHeight: '32px', fontSize: '0.78rem' }}
                            onClick={() => {
                              setCurrentQuestionIndex(idx);
                              setCurrentStage(VIEW_STAGE.QUESTIONNAIRE);
                            }}
                          >
                            <IconEdit size={13} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Submission Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn-assessment-secondary"
                onClick={() => {
                  setCurrentQuestionIndex(currentInstrument.questions.length - 1);
                  setCurrentStage(VIEW_STAGE.QUESTIONNAIRE);
                }}
              >
                <IconArrowLeft size={16} />
                <span>Back to Questions</span>
              </button>

              <button
                type="button"
                className="btn-assessment-primary"
                style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                disabled={isSubmitting}
                onClick={handleSubmitAssessment}
              >
                {isSubmitting ? (
                  <>
                    <IconRefreshCw size={16} className="spin-slow" />
                    <span>Processing Results...</span>
                  </>
                ) : (
                  <>
                    <IconCheck size={18} />
                    <span>Submit &amp; View Clinical Results</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =========================================================================
          STAGE 5: RESULTS & INTERPRETATION VIEW
          ========================================================================= */}
      {currentStage === VIEW_STAGE.RESULTS && completedResult && (
        <div className="assessment-details-container">
          <section className="assessment-results-card">
            <div>
              <span className="badge-assessment-clinical" style={{ marginBottom: '0.5rem' }}>
                {completedResult.clinicalStandard}
              </span>
              <h1 className="assessment-hero-title">{completedResult.instrumentTitle}</h1>
              <p className="assessment-hero-subtitle">
                Completed: {completedResult.timestamp || completedResult.dateIso || 'Recently'}
              </p>
            </div>

            {/* Score Banner */}
            <div className="results-score-banner">
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Total Assessment Score
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  <span className="results-score-num">{completedResult.totalScore}</span>
                  <span className="results-score-denom">/ {completedResult.maxScore}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                <span className={`severity-pill-badge ${completedResult.badgeColor}`}>
                  {completedResult.tier} SEVERITY
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {completedResult.severityLabel}
                </span>
              </div>
            </div>

            {/* Crisis Ideation Alert Banner (if suicidal ideation question > 0 or Severe) */}
            {(completedResult.isCrisisFlagged || completedResult.tier === 'SEVERE') && (
              <div className="crisis-alert-banner" role="alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.98rem' }}>
                  <IconAlertTriangle size={20} />
                  <span>Confidential Support is Available 24/7</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55 }}>
                  Your answers indicate substantial emotional heaviness. You do not have to carry this alone. Please consider speaking with a trusted professional or reaching out to the 988 Suicide &amp; Crisis Lifeline (call or text 988, free and confidential).
                </p>
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-assessment-primary"
                    style={{ background: '#780611', color: '#FFFFFF' }}
                    onClick={() => setActiveTab && setActiveTab('crisis')}
                  >
                    <IconLifeBuoy size={16} />
                    <span>Open Crisis Support Resources</span>
                  </button>
                </div>
              </div>
            )}

            {/* Clinical Interpretation */}
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Clinical Interpretation
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {completedResult.description}
              </p>
            </div>

            {/* Recommended Next Steps */}
            {completedResult.clinicalAction && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--mv-primary)', marginBottom: '0.25rem' }}>
                  Recommended Action
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
                  {completedResult.clinicalAction}
                </p>
              </div>
            )}

            {/* Non-Diagnostic Regulatory Notice */}
            <div className="clinical-notice-card" role="note">
              <IconShieldCheck size={20} className="clinical-notice-icon" />
              <div>
                <div className="clinical-notice-title">Non-Diagnostic Screening Verification</div>
                <p className="clinical-notice-text">
                  This report is an evidence-based self-awareness summary, not a psychiatric diagnosis. Your results are stored securely on this device and can be shared with your healthcare provider.
                </p>
              </div>
            </div>

            {/* Result Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="btn-assessment-secondary"
                onClick={() => setPreviewAssessment(completedResult)}
                style={{ minHeight: '44px' }}
                aria-label="Preview Clinical PDF Report"
              >
                <IconEye size={16} />
                <span>Preview PDF Report</span>
              </button>

              <button
                type="button"
                className="btn-assessment-primary"
                onClick={() => handleDownloadPdf(completedResult)}
              >
                <IconDownload size={16} />
                <span>Download Clinical PDF</span>
              </button>

              <button
                type="button"
                className="btn-assessment-secondary"
                onClick={() => {
                  setHistoryInstrumentFilter(completedResult.instrumentId);
                  setCurrentStage(VIEW_STAGE.HISTORY);
                }}
              >
                <IconCalendar size={16} />
                <span>View Trend in History</span>
              </button>

              <button
                type="button"
                className="btn-assessment-secondary"
                onClick={() => setCurrentStage(VIEW_STAGE.CATALOGUE)}
              >
                <span>Return to Catalogue</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =========================================================================
          STAGE 6: HISTORICAL ASSESSMENT CHARTS & TRENDS
          ========================================================================= */}
      {currentStage === VIEW_STAGE.HISTORY && (
        <>
          {/* Header */}
          <div className="assessment-nav-row">
            <button
              type="button"
              className="btn-assessment-secondary"
              onClick={() => setCurrentStage(VIEW_STAGE.CATALOGUE)}
            >
              <IconArrowLeft size={16} />
              <span>Back to Catalogue</span>
            </button>

            {/* Instrument Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label htmlFor="inst_filter_select" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Instrument:
              </label>
              <select
                id="inst_filter_select"
                value={historyInstrumentFilter}
                onChange={(e) => setHistoryInstrumentFilter(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {ASSESSMENT_INSTRUMENTS.filter((i) => !i.isMultimodalLive).map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.title}</option>
                ))}
              </select>
            </div>
          </div>

          <section className="assessment-chart-card">
            <div className="assessment-chart-header">
              <div>
                <span className="badge-assessment-clinical" style={{ marginBottom: '0.35rem' }}>
                  Longitudinal Clinical Trajectory
                </span>
                <h1 className="assessment-hero-title">{chartInstrument.title}</h1>
                <p className="assessment-hero-subtitle">
                  Track symptom changes over time against standardized DSM-5 / APA severity thresholds.
                </p>
              </div>

              {chartRecords.length > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Latest Recorded Score
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--mv-primary)' }}>
                    {chartRecords[chartRecords.length - 1].totalScore} / {chartInstrument.maxScore}
                  </div>
                </div>
              )}
            </div>

            {/* SVG Longitudinal Trend Chart */}
            <div className="chart-svg-container" aria-label="Assessment score trend chart">
              {chartRecords.length > 0 ? (
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 600 240"
                  preserveAspectRatio="none"
                  style={{ overflow: 'visible', padding: '20px 40px' }}
                >
                  <defs>
                    <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--mv-primary)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--mv-primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Threshold Reference Lines */}
                  {/* Severe Line (70% max) */}
                  <line x1="0" y1={240 - (0.7 * 200)} x2="600" y2={240 - (0.7 * 200)} stroke="#ef4444" strokeDasharray="4 4" strokeWidth="1" opacity="0.4" />
                  <text x="595" y={240 - (0.7 * 200) - 4} fill="#ef4444" fontSize="10" textAnchor="end" opacity="0.7">Severe Cut-off</text>

                  {/* Moderate Line (40% max) */}
                  <line x1="0" y1={240 - (0.4 * 200)} x2="600" y2={240 - (0.4 * 200)} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth="1" opacity="0.4" />
                  <text x="595" y={240 - (0.4 * 200) - 4} fill="#f59e0b" fontSize="10" textAnchor="end" opacity="0.7">Moderate Cut-off</text>

                  {/* Baseline / Minimal Line */}
                  <line x1="0" y1={240 - (0.15 * 200)} x2="600" y2={240 - (0.15 * 200)} stroke="#10b981" strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
                  <text x="595" y={240 - (0.15 * 200) - 4} fill="#10b981" fontSize="10" textAnchor="end" opacity="0.6">Minimal Cut-off</text>

                  {/* Points and Line Coordinates */}
                  {(() => {
                    const count = chartRecords.length;
                    const maxScore = chartInstrument.maxScore || 27;
                    const points = chartRecords.map((r, i) => {
                      const x = count === 1 ? 300 : (i / (count - 1)) * 560 + 20;
                      const normVal = Math.min(1, Math.max(0, r.totalScore / maxScore));
                      const y = 220 - (normVal * 180);
                      return { x, y, record: r };
                    });

                    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
                    const areaPoints = `${points[0].x},230 ` + polylinePoints + ` ${points[points.length - 1].x},230`;

                    return (
                      <>
                        {/* Shaded Area */}
                        {points.length > 1 && (
                          <polygon points={areaPoints} fill="url(#chartAreaGrad)" />
                        )}

                        {/* Connected Line */}
                        {points.length > 1 && (
                          <polyline
                            points={polylinePoints}
                            fill="none"
                            stroke="var(--mv-primary)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Data Points */}
                        {points.map((p, idx) => (
                          <g key={idx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="6"
                              fill="var(--card-bg)"
                              stroke="var(--mv-primary)"
                              strokeWidth="3"
                            />
                            <text
                              x={p.x}
                              y={p.y - 12}
                              textAnchor="middle"
                              fill="var(--text-primary)"
                              fontSize="11"
                              fontWeight="700"
                            >
                              {p.record.totalScore}
                            </text>
                            <text
                              x={p.x}
                              y={235}
                              textAnchor="middle"
                              fill="var(--text-muted)"
                              fontSize="9.5"
                            >
                              {new Date(p.record.dateIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  No historical records found for this instrument. Take your first screener to see your trend!
                </div>
              )}
            </div>

            {/* Historical Table */}
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Session History Log
              </h2>

              <div className="historical-table-container">
                <table className="assessment-review-table" aria-label="Historical assessment logs">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Instrument</th>
                      <th>Score</th>
                      <th>Severity Tier</th>
                      <th>Clinical Recommendation</th>
                      <th style={{ textAlign: 'center' }}>PDF Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartRecords.map((r) => (
                      <tr key={r.id}>
                        <td>{r.timestamp || new Date(r.dateIso).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600 }}>{r.shortTitle || r.instrumentTitle}</td>
                        <td style={{ fontWeight: 700, color: 'var(--mv-primary)' }}>
                          {r.totalScore} / {r.maxScore}
                        </td>
                        <td>
                          <span className={`severity-pill-badge ${r.badgeColor || 'minimal'}`} style={{ fontSize: '0.76rem', padding: '0.2rem 0.6rem' }}>
                            {r.tier || 'MINIMAL'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {r.clinicalAction || r.description}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-assessment-secondary"
                            style={{ padding: '0.35rem 0.65rem', minHeight: '32px', fontSize: '0.78rem' }}
                            onClick={() => handleDownloadPdf(r)}
                            aria-label={`Download PDF report for ${r.shortTitle}`}
                          >
                            <IconDownload size={13} />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {chartRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No past sessions on record for {chartInstrument.title}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Standardized Assessment PDF Preview Modal */}
      <PdfReportPreviewModal
        isOpen={Boolean(previewAssessment)}
        record={previewAssessment}
        reportType="assessment"
        onClose={() => setPreviewAssessment(null)}
        onDownload={(rec) => handleDownloadPdf(rec)}
      />

    </div>
  );
}
