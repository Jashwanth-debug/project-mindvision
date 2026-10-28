import React, { useState, useMemo } from 'react';
import { getHumanStatus } from '../utils/terminology';
import {
  IconSparkles,
  IconCalendar,
  IconShieldCheck,
  IconDownload,
  IconRefreshCw,
  IconCheck,
  IconTrash,
  IconClock,
  IconEye,
  IconTrendingUp,
  IconAlertCircle,
  IconSmile,
  IconActivity,
  IconMic,
  IconVideo
} from './Icons';
import {
  InteractiveButton,
  ConfirmDialog,
  ReportPreview,
  EmptyState
} from './primitives';
import { generateCheckInPdf, generatePatientHistoryPdf } from '../utils/pdfReportGenerator';
import { MoodTrackerService, MOOD_DEFINITIONS } from '../services/wellnessStorageService';

/**
 * PatientHistoryView - Production-Grade Longitudinal Patient History & Telemetry Reporting
 *
 * Features:
 * - Multi-Metric Longitudinal Charting:
 *   1. Self-Reported Mood Trend (1 - 5 psychometric scale from authentic user logs)
 *   2. Algorithmic Composite Risk Indicator (0.0 - 10.0 multimodal telemetry estimate)
 *   3. Speech Rhythm & Acoustic Jitter (0.0 - 1.0 audio prosody tracking)
 *   4. Facial Expression Tension (0.0 - 1.0 AU04 brow furrow & AU15 lip depressor)
 * - Observation Scope Summary: Date range, total sessions, valid metric coverage, and missing observation notices
 * - Clear demarcation: Recorded facts vs. Algorithmic AI interpretations
 * - History Report Download & In-App Preview (comprehensive multi-session PDF with executive summary)
 * - Single-check-in preview & download pipeline
 * - Timeline View & Dense List View with accessible toggle
 * - Date range and status filter pills
 * - Chronological sorting (Newest first / Oldest first)
 * - Accessible detail panel with keyboard navigation (Up/Down / Prev/Next)
 * - Two-session comparison panel between consecutive check-ins
 * - Safe Delete with ConfirmDialog
 * - Local storage privacy transparency notice
 */
function isRecordWithinRange(rec, filterRange) {
  if (filterRange === 'all') return true;
  const now = Date.now();
  const cutoffDays = filterRange === '7days' ? 7 : 30;
  const cutoffMs = cutoffDays * 24 * 60 * 60 * 1000;
  const time = rec?.dateIso ? new Date(rec.dateIso).getTime() : new Date(rec?.timestamp).getTime();
  return !isNaN(time) && now - time >= -86400000 && now - time <= cutoffMs;
}

export default function PatientHistoryView({
  records = [],
  setActiveTab,
  onShowToast,
  onDeleteRecord
}) {
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'list'
  const [filterRange, setFilterRange] = useState('all'); // 'all' | '7days' | '30days'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'MINIMAL' | 'MODERATE' | 'ELEVATED' | 'SEVERE'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

  // Selected entry for inline detail inspection
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Active chart metric tab: 'mood' | 'risk' | 'acoustic' | 'facial'
  const [activeChartMetric, setActiveChartMetric] = useState('risk');

  // PDF generation and preview state
  const [generatingId, setGeneratingId] = useState(null);
  const [downloadedId, setDownloadedId] = useState(null);
  const [previewReport, setPreviewReport] = useState(null);

  // Full history PDF export & preview state
  const [isExportingHistory, setIsExportingHistory] = useState(false);
  const [historyExportSuccess, setHistoryExportSuccess] = useState(false);
  const [previewHistoryModalOpen, setPreviewHistoryModalOpen] = useState(false);

  // Active hover/focus point in longitudinal trend chart
  const [activeChartIndex, setActiveChartIndex] = useState(null);

  // Deletion confirmation state
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Comparative view toggle
  const [showComparison, setShowComparison] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. FILTER & SORT RECORDS
  // ---------------------------------------------------------------------------
  const filteredRecords = useMemo(() => {
    let list = [...records];

    // Filter by date range
    if (filterRange !== 'all') {
      list = list.filter((rec) => isRecordWithinRange(rec, filterRange));
    }

    // Filter by wellness status
    if (filterStatus !== 'all') {
      list = list.filter((rec) => (rec?.riskLevel || '').toUpperCase() === filterStatus.toUpperCase());
    }

    // Sort order
    list.sort((a, b) => {
      const timeA = a?.dateIso ? new Date(a.dateIso).getTime() : new Date(a?.timestamp).getTime() || 0;
      const timeB = b?.dateIso ? new Date(b.dateIso).getTime() : new Date(b?.timestamp).getTime() || 0;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [records, filterRange, filterStatus, sortOrder]);

  // ---------------------------------------------------------------------------
  // 2. OBSERVATION SCOPE (Date Range & Observation Counts)
  // ---------------------------------------------------------------------------
  const observationScope = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        hasData: false,
        totalCount: 0,
        dateRangeStr: 'No records available',
        spanDays: 0
      };
    }

    const sortedByTime = [...filteredRecords].sort((a, b) => {
      const timeA = a?.dateIso ? new Date(a.dateIso).getTime() : new Date(a?.timestamp).getTime() || 0;
      const timeB = b?.dateIso ? new Date(b.dateIso).getTime() : new Date(b?.timestamp).getTime() || 0;
      return timeA - timeB;
    });

    const firstTime = sortedByTime[0]?.dateIso || sortedByTime[0]?.timestamp;
    const lastTime = sortedByTime[sortedByTime.length - 1]?.dateIso || sortedByTime[sortedByTime.length - 1]?.timestamp;

    const firstParsed = firstTime ? new Date(firstTime) : null;
    const lastParsed = lastTime ? new Date(lastTime) : null;

    let dateRangeStr = 'Single observation';
    let spanDays = 1;

    if (firstParsed && lastParsed && !isNaN(firstParsed.getTime()) && !isNaN(lastParsed.getTime())) {
      const opt = { month: 'short', day: 'numeric', year: 'numeric' };
      if (firstParsed.toDateString() === lastParsed.toDateString()) {
        dateRangeStr = firstParsed.toLocaleDateString(undefined, opt);
      } else {
        dateRangeStr = `${firstParsed.toLocaleDateString(undefined, opt)} – ${lastParsed.toLocaleDateString(undefined, opt)}`;
        const diffMs = Math.abs(lastParsed.getTime() - firstParsed.getTime());
        spanDays = Math.max(1, Math.round(diffMs / 86400000));
      }
    }

    return {
      hasData: true,
      totalCount: filteredRecords.length,
      allRecordsCount: records.length,
      dateRangeStr,
      spanDays
    };
  }, [filteredRecords, records]);

  // ---------------------------------------------------------------------------
  // 3. EXTRACT CHART DATA FOR ACTIVE METRIC (NO FABRICATED DATA)
  // ---------------------------------------------------------------------------
  const { chartPoints, missingCount, metricConfig } = useMemo(() => {
    // Sort chronological oldest-to-newest for trend flow
    const chronological = [...filteredRecords].sort((a, b) => {
      const timeA = a?.dateIso ? new Date(a.dateIso).getTime() : new Date(a?.timestamp).getTime() || 0;
      const timeB = b?.dateIso ? new Date(b.dateIso).getTime() : new Date(b?.timestamp).getTime() || 0;
      return timeA - timeB;
    });

    const parseLabels = (rawTime) => {
      let dateLabel = 'Check-in';
      let fullDateLabel = 'Check-in date';
      if (rawTime) {
        const parsed = new Date(rawTime);
        if (!isNaN(parsed.getTime())) {
          dateLabel = parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          fullDateLabel = parsed.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
        } else {
          dateLabel = String(rawTime).split(',')[0] || String(rawTime);
          fullDateLabel = String(rawTime);
        }
      }
      return { dateLabel, fullDateLabel };
    };

    // Metric Config definitions
    const configs = {
      mood: {
        title: 'Self-Reported Mood Trend',
        badge: 'Self-Reported (Scale: 1 – 5)',
        badgeColor: 'var(--accent-teal)',
        yAxisLabel: 'SELF-REPORTED MOOD (1 - 5)',
        minVal: 1,
        maxVal: 5,
        yTicks: [
          { val: 5, label: '5.0 (Great 🌸)' },
          { val: 4, label: '4.0 (Good 🌿)' },
          { val: 3, label: '3.0 (Okay 🌤️)' },
          { val: 2, label: '2.0 (Low/Stressed 🌧️)' },
          { val: 1, label: '1.0 (Overwhelmed 🌊)' }
        ],
        explanation: 'Track your authentic self-reported mood ratings recorded across check-ins and wellness logs. Self-reported scores reflect your own lived experience, distinct from algorithmic sensor predictions.',
        emptyPrompt: 'No self-reported mood ratings have been recorded in this date range. You can log your mood in the Wellness Hub or complete a check-in with a mood response.'
      },
      risk: {
        title: 'Algorithmic Composite Risk Indicator',
        badge: 'Multimodal Estimate (0.0 – 10.0)',
        badgeColor: 'var(--accent-copper)',
        yAxisLabel: 'COMPOSITE RISK (0 - 10)',
        minVal: 0,
        maxVal: 10,
        yTicks: [
          { val: 10.0, label: '10.0 (Severe)' },
          { val: 7.5, label: '7.5' },
          { val: 5.0, label: '5.0 (Elevated)' },
          { val: 2.5, label: '2.5 (Mild)' },
          { val: 0.0, label: '0.0 (Calm)' }
        ],
        explanation: 'Track how your mathematically estimated composite risk indicator has changed across check-ins. This indicator is an algorithmic model estimate derived from speech, facial, and lexical markers. It is NOT a self-reported mood score or medical diagnosis.',
        emptyPrompt: 'No numeric risk telemetry observations exist in this scope. Complete a check-in with active sensors to record composite risk estimates.'
      },
      acoustic: {
        title: 'Speech Rhythm & Vocal Acoustic Jitter',
        badge: 'Microphone Telemetry (0.0 – 1.0)',
        badgeColor: 'var(--color-primary)',
        yAxisLabel: 'ACOUSTIC JITTER (0 - 1.0)',
        minVal: 0,
        maxVal: 1.0,
        yTicks: [
          { val: 1.0, label: '1.00 (High tremor)' },
          { val: 0.75, label: '0.75' },
          { val: 0.50, label: '0.50' },
          { val: 0.25, label: '0.25' },
          { val: 0.0, label: '0.00 (Steady cadence)' }
        ],
        explanation: 'Tracks vocal micro-tremor and speech rhythm cadence during spoken reflections. Higher values indicate vocal pitch variability, while lower values reflect steady, relaxed speech.',
        emptyPrompt: 'No acoustic telemetry recorded in this scope. Check-ins completed without microphone permissions do not produce acoustic markers.'
      },
      facial: {
        title: 'Facial Expression Tension Markers (AU04 & AU15)',
        badge: 'Camera Telemetry (0.0 – 1.0)',
        badgeColor: '#C58B65',
        yAxisLabel: 'ACTION UNIT TENSION (0 - 1.0)',
        minVal: 0,
        maxVal: 1.0,
        yTicks: [
          { val: 1.0, label: '1.00 (Tension observed)' },
          { val: 0.75, label: '0.75' },
          { val: 0.50, label: '0.50' },
          { val: 0.25, label: '0.25' },
          { val: 0.0, label: '0.00 (Relaxed brow)' }
        ],
        explanation: 'Tracks brow concentration (Action Unit 04) and lip corner lowering (Action Unit 15) geometry extracted via client-side landmark tracking during check-ins.',
        emptyPrompt: 'No facial action unit telemetry recorded in this scope. Check-ins completed with camera disabled do not produce facial tension points.'
      }
    };

    const currentConfig = configs[activeChartMetric] || configs.risk;
    const points = [];
    let missing = 0;

    if (activeChartMetric === 'mood') {
      // 1. Gather self-reported mood entries from check-in records
      chronological.forEach((rec, idx) => {
        let score = null;
        let moodLabel = 'Self-reported';

        if (typeof rec?.moodScore === 'number' && Number.isFinite(rec.moodScore)) {
          score = rec.moodScore;
          moodLabel = rec.moodLabel || 'Logged Mood';
        } else if (typeof rec?.selfReportedMood === 'number' && Number.isFinite(rec.selfReportedMood)) {
          score = rec.selfReportedMood;
          moodLabel = rec.moodLabel || 'Self-Reported';
        } else if (typeof rec?.mood === 'string') {
          const match = MOOD_DEFINITIONS.find((m) => m.id === rec.mood);
          if (match) {
            score = match.score;
            moodLabel = match.label;
          }
        }

        if (score !== null && score >= 1 && score <= 5) {
          const { dateLabel, fullDateLabel } = parseLabels(rec.dateIso || rec.timestamp);
          points.push({
            id: rec.id || `mood_pt_${idx}`,
            record: rec,
            value: score,
            displayValue: `${score.toFixed(1)} (${moodLabel})`,
            dateLabel,
            fullDateLabel,
            tag: moodLabel,
            color: score >= 4 ? '#257C6F' : score >= 3 ? '#3B82A6' : '#D97706'
          });
        } else {
          missing += 1;
        }
      });

      // 2. Also check if user has logged daily moods via MoodTrackerService
      try {
        const storedMoods = MoodTrackerService.getEntries();
        if (Array.isArray(storedMoods)) {
          storedMoods.forEach((mEntry, mIdx) => {
            const alreadyIncluded = points.some((p) => p.dateLabel === mEntry.dateStr);
            if (!alreadyIncluded && typeof mEntry.score === 'number') {
              const { dateLabel, fullDateLabel } = parseLabels(mEntry.timestamp || mEntry.dateStr);
              points.push({
                id: mEntry.id || `wellness_mood_${mIdx}`,
                record: null,
                value: mEntry.score,
                displayValue: `${mEntry.score.toFixed(1)} (${mEntry.label || 'Wellness Mood'})`,
                dateLabel,
                fullDateLabel,
                tag: mEntry.label || 'Daily Mood Log',
                color: mEntry.score >= 4 ? '#257C6F' : mEntry.score >= 3 ? '#3B82A6' : '#D97706'
              });
            }
          });
        }
      } catch {
        // Safe disposal
      }

      // Re-sort chronologically after combining
      points.sort((a, b) => {
        const timeA = new Date(a.fullDateLabel).getTime() || 0;
        const timeB = new Date(b.fullDateLabel).getTime() || 0;
        return timeA - timeB;
      });

    } else if (activeChartMetric === 'risk') {
      chronological.forEach((rec, idx) => {
        const rawRisk = rec?.compositeRisk;
        if (typeof rawRisk !== 'number' || !Number.isFinite(rawRisk)) {
          missing += 1;
          return;
        }

        const { dateLabel, fullDateLabel } = parseLabels(rec.dateIso || rec.timestamp);
        const status = getHumanStatus(rec.riskLevel, rawRisk);
        const dotColor =
          rawRisk >= 6.5
            ? 'var(--status-severe-dot)'
            : rawRisk >= 3.5
            ? 'var(--status-elevated-dot)'
            : 'var(--accent-teal)';

        points.push({
          id: rec.id || `risk_pt_${idx}`,
          record: rec,
          value: rawRisk,
          displayValue: `${rawRisk.toFixed(2)} (${status.title})`,
          dateLabel,
          fullDateLabel,
          tag: status.title,
          color: dotColor
        });
      });

    } else if (activeChartMetric === 'acoustic') {
      chronological.forEach((rec, idx) => {
        const rawAcoustic = rec?.prosody;
        if (typeof rawAcoustic !== 'number' || !Number.isFinite(rawAcoustic)) {
          missing += 1;
          return;
        }

        const { dateLabel, fullDateLabel } = parseLabels(rec.dateIso || rec.timestamp);
        points.push({
          id: rec.id || `acoustic_pt_${idx}`,
          record: rec,
          value: rawAcoustic,
          displayValue: `${rawAcoustic.toFixed(2)} (${rawAcoustic > 0.45 ? 'Elevated micro-tremor' : 'Steady cadence'})`,
          dateLabel,
          fullDateLabel,
          tag: 'Acoustic Jitter',
          color: rawAcoustic > 0.45 ? 'var(--status-elevated-dot)' : 'var(--accent-teal)'
        });
      });

    } else if (activeChartMetric === 'facial') {
      chronological.forEach((rec, idx) => {
        const rawAu4 = typeof rec?.au4 === 'number' && Number.isFinite(rec.au4) ? rec.au4 : null;
        const rawAu15 = typeof rec?.au15 === 'number' && Number.isFinite(rec.au15) ? rec.au15 : null;

        if (rawAu4 === null && rawAu15 === null) {
          missing += 1;
          return;
        }

        const maxTension = Math.max(rawAu4 || 0, rawAu15 || 0);
        const { dateLabel, fullDateLabel } = parseLabels(rec.dateIso || rec.timestamp);
        points.push({
          id: rec.id || `facial_pt_${idx}`,
          record: rec,
          value: maxTension,
          displayValue: `${maxTension.toFixed(2)} (AU4: ${rawAu4 != null ? rawAu4.toFixed(2) : 'N/A'}, AU15: ${rawAu15 != null ? rawAu15.toFixed(2) : 'N/A'})`,
          dateLabel,
          fullDateLabel,
          tag: 'Facial Tension',
          color: maxTension > 0.50 ? 'var(--status-elevated-dot)' : '#C58B65'
        });
      });
    }

    return {
      chartPoints: points,
      missingCount: missing,
      metricConfig: currentConfig
    };
  }, [filteredRecords, activeChartMetric]);

  // ---------------------------------------------------------------------------
  // 4. SVG GEOMETRY CALCULATIONS
  // ---------------------------------------------------------------------------
  const svgMetrics = useMemo(() => {
    const width = 740;
    const height = 240;
    const paddingLeft = 72;
    const paddingRight = 32;
    const paddingTop = 26;
    const paddingBottom = 42;
    const innerW = width - paddingLeft - paddingRight;
    const innerH = height - paddingTop - paddingBottom;

    const minV = metricConfig.minVal;
    const maxV = metricConfig.maxVal;
    const range = Math.max(0.001, maxV - minV);

    const getY = (val) => {
      const clamped = Math.max(minV, Math.min(maxV, val));
      const normalized = (clamped - minV) / range;
      return paddingTop + innerH - normalized * innerH;
    };

    const count = chartPoints.length;
    const pointsWithCoords = chartPoints.map((p, idx) => {
      const x = count === 1
        ? paddingLeft + innerW / 2
        : paddingLeft + (idx / (count - 1)) * innerW;
      const y = getY(p.value);
      return {
        ...p,
        x,
        y
      };
    });

    let linePath = '';
    let areaPath = '';
    if (count > 1) {
      linePath = pointsWithCoords
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');
      const baselineY = paddingTop + innerH;
      areaPath = `${linePath} L ${pointsWithCoords[count - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${pointsWithCoords[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
    }

    const yTicks = metricConfig.yTicks.map((tick) => ({
      ...tick,
      y: getY(tick.val)
    }));

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      innerW,
      innerH,
      pointsWithCoords,
      linePath,
      areaPath,
      yTicks
    };
  }, [chartPoints, metricConfig]);

  const safeSelectedIndex = filteredRecords.length > 0 ? Math.min(selectedIndex, filteredRecords.length - 1) : 0;
  const activeRecord = filteredRecords[safeSelectedIndex] || null;
  const compareRecord = filteredRecords[safeSelectedIndex + 1] || null;

  // Keyboard navigation for active item
  const handleKeyDown = (e) => {
    if (!filteredRecords.length) return;
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(filteredRecords.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleDownloadReport = async (record, idx) => {
    const key = record.id || idx;
    if (generatingId === key) return;
    setGeneratingId(key);
    try {
      const result = await generateCheckInPdf(record, { save: true });
      setDownloadedId(key);
      onShowToast?.(`Wellness report downloaded: ${result.filename}`);
      setTimeout(() => {
        setDownloadedId(null);
      }, 3500);
    } catch (err) {
      console.error('[MindVision] Failed to generate PDF report from history:', err);
      onShowToast?.("We couldn't generate your report — please try again");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleExportFullHistory = async () => {
    if (isExportingHistory) return;
    const recordsToExport = filteredRecords.length > 0 ? filteredRecords : records;
    if (!Array.isArray(recordsToExport) || recordsToExport.length === 0) {
      onShowToast?.('There are no check-in records to export.');
      return;
    }

    setIsExportingHistory(true);
    try {
      const result = await generatePatientHistoryPdf(recordsToExport, { save: true });
      setHistoryExportSuccess(true);
      onShowToast?.(`Longitudinal wellness history exported: ${result.filename}`);
      setTimeout(() => {
        setHistoryExportSuccess(false);
      }, 3500);
    } catch (err) {
      console.error('[MindVision] Failed to export patient history PDF:', err);
      onShowToast?.("We couldn't export your full history — please try again");
    } finally {
      setIsExportingHistory(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!recordToDelete) return;
    onDeleteRecord?.(recordToDelete.id || recordToDelete.timestamp);
    setRecordToDelete(null);
    if (selectedIndex >= filteredRecords.length - 1) {
      setSelectedIndex(Math.max(0, filteredRecords.length - 2));
    }
  };

  return (
    <div className="patient-view-shell" onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: 'none' }}>

      {/* -------------------------------------------------------------
          1. TOP HEADER & HISTORY REPORT ACTIONS
          ------------------------------------------------------------- */}
      <div className="animate-enter-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ maxWidth: '680px' }}>
          <div className="patient-hero-kicker">
            <span className="badge-hero-primary">
              <IconSparkles size={14} />
              <span>Longitudinal Telemetry & History</span>
            </span>
          </div>
          <h1 className="patient-hero-title" style={{ fontSize: '1.9rem', marginBottom: '0.4rem' }}>
            My Check-in History
          </h1>
          <p style={{ fontSize: '1.02rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            Review your historical reflections, self-reported mood, and objective telemetry markers over time. Distinguishing your lived feelings from algorithmic estimates.
          </p>
        </div>

        {/* Action Group: Preview History PDF & Download History PDF */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem', alignSelf: 'flex-start', marginTop: '0.5rem' }}>
          <InteractiveButton
            id="btn-preview-full-history-pdf"
            variant="ghost"
            size="md"
            onClick={() => setPreviewHistoryModalOpen(true)}
            disabled={records.length === 0}
            aria-label="Preview complete patient history report as PDF"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              gap: '0.5rem'
            }}
          >
            <IconEye size={15} />
            <span>Preview History (PDF)</span>
          </InteractiveButton>

          <InteractiveButton
            id="btn-export-full-history-pdf"
            variant="outline"
            size="md"
            onClick={handleExportFullHistory}
            disabled={isExportingHistory || records.length === 0}
            aria-label="Export complete patient check-in history as PDF"
            style={{
              borderColor: 'var(--accent-teal-border)',
              color: 'var(--accent-teal)',
              gap: '0.5rem',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            {isExportingHistory ? (
              <>
                <IconRefreshCw size={15} className="spinning" />
                <span>Exporting History...</span>
              </>
            ) : historyExportSuccess ? (
              <>
                <IconCheck size={15} style={{ color: 'var(--accent-teal)' }} />
                <span>History Exported!</span>
              </>
            ) : (
              <>
                <IconDownload size={15} />
                <span>Download History (PDF)</span>
              </>
            )}
          </InteractiveButton>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. OBSERVATION SCOPE SUMMARY STRIP
          ------------------------------------------------------------- */}
      {observationScope.hasData && (
        <div className="wellness-scope-bar animate-enter-1">
          <div className="wellness-scope-item">
            <IconCalendar size={15} style={{ color: 'var(--color-primary)' }} />
            <span className="wellness-scope-label">Date Range:</span>
            <span className="wellness-scope-value">{observationScope.dateRangeStr}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({observationScope.spanDays} {observationScope.spanDays === 1 ? 'day' : 'days'})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div className="wellness-scope-item">
              <span className="wellness-scope-label">Observations:</span>
              <span className="wellness-scope-value">{observationScope.totalCount} {observationScope.totalCount === 1 ? 'session' : 'sessions'}</span>
              {observationScope.totalCount < observationScope.allRecordsCount && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>(filtered from {observationScope.allRecordsCount})</span>
              )}
            </div>

            <div className="wellness-scope-item">
              <span className="wellness-scope-label">Plotted for {metricConfig.title.split(' ')[0]}:</span>
              <span className="wellness-scope-value" style={{ color: chartPoints.length > 0 ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                {chartPoints.length} points
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Start New Check-in Callout Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--accent-teal-soft-bg) 100%)',
          border: '1px solid var(--accent-teal-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-subtle)'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.12rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Ready for today's wellness check-in?
          </h2>
          <p style={{ fontSize: '0.90rem', color: 'var(--text-secondary)', margin: 0 }}>
            Take 2 quiet minutes to pause and check in with your mind and body.
          </p>
        </div>
        <InteractiveButton
          variant="primary"
          onClick={() => setActiveTab('assessment')}
          aria-label="Start today's check-in"
        >
          <span>Take Check-in</span>
          <span>›</span>
        </InteractiveButton>
      </div>

      {/* -------------------------------------------------------------
          3. MULTI-METRIC LONGITUDINAL TREND CHART CARD
          ------------------------------------------------------------- */}
      <div className="wellness-trend-card animate-enter-2">
        <div className="wellness-trend-header">
          <div className="wellness-trend-title-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <IconTrendingUp size={20} style={{ color: 'var(--accent-teal)' }} />
              <h2 className="wellness-trend-title">{metricConfig.title}</h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-secondary)',
                  color: metricConfig.badgeColor,
                  border: '1px solid var(--border-color)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                {metricConfig.badge}
              </span>
            </div>
            <p className="wellness-trend-explanation">
              {metricConfig.explanation}
            </p>
          </div>

          {/* Missing data notification pill */}
          {missingCount > 0 && (
            <div className="wellness-trend-missing-notice" title="Omitted records lacking data for this specific metric">
              <IconAlertCircle size={14} style={{ color: 'var(--accent-warm)' }} />
              <span>
                <strong>{missingCount}</strong> {missingCount === 1 ? 'record lacks' : 'records lack'} this indicator and {missingCount === 1 ? 'is' : 'are'} omitted from chart
              </span>
            </div>
          )}
        </div>

        {/* Metric Selector Tabs */}
        <div className="wellness-chart-tabs" role="tablist" aria-label="Select wellness indicator chart">
          <button
            role="tab"
            aria-selected={activeChartMetric === 'mood'}
            className={`wellness-chart-tab-btn ${activeChartMetric === 'mood' ? 'active' : ''}`}
            onClick={() => {
              setActiveChartMetric('mood');
              setActiveChartIndex(null);
            }}
          >
            <IconSmile size={14} />
            <span>Self-Reported Mood</span>
          </button>

          <button
            role="tab"
            aria-selected={activeChartMetric === 'risk'}
            className={`wellness-chart-tab-btn ${activeChartMetric === 'risk' ? 'active' : ''}`}
            onClick={() => {
              setActiveChartMetric('risk');
              setActiveChartIndex(null);
            }}
          >
            <IconActivity size={14} />
            <span>Composite Risk Indicator</span>
          </button>

          <button
            role="tab"
            aria-selected={activeChartMetric === 'acoustic'}
            className={`wellness-chart-tab-btn ${activeChartMetric === 'acoustic' ? 'active' : ''}`}
            onClick={() => {
              setActiveChartMetric('acoustic');
              setActiveChartIndex(null);
            }}
          >
            <IconMic size={14} />
            <span>Speech Rhythm & Jitter</span>
          </button>

          <button
            role="tab"
            aria-selected={activeChartMetric === 'facial'}
            className={`wellness-chart-tab-btn ${activeChartMetric === 'facial' ? 'active' : ''}`}
            onClick={() => {
              setActiveChartMetric('facial');
              setActiveChartIndex(null);
            }}
          >
            <IconVideo size={14} />
            <span>Facial Tension (AU4/AU15)</span>
          </button>
        </div>

        {/* Empty Chart State vs Interactive Chart SVG */}
        {chartPoints.length === 0 ? (
          <div className="wellness-trend-empty-state">
            <IconCalendar size={32} style={{ color: 'var(--text-muted)' }} />
            <h3>Recorded data is not yet available for this indicator</h3>
            <p>{metricConfig.emptyPrompt}</p>
            {activeChartMetric === 'mood' && (
              <InteractiveButton
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab('wellness')}
                style={{ marginTop: '0.5rem' }}
              >
                Open Mood Tracker in Wellness Hub
              </InteractiveButton>
            )}
          </div>
        ) : (
          <>
            <div className="wellness-trend-svg-container" tabIndex={0} aria-label={`Interactive ${metricConfig.title} Chart`}>
              <svg
                viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`}
                className="wellness-trend-svg"
                role="img"
                aria-label={`${metricConfig.title} displaying ${chartPoints.length} observations`}
              >
                <defs>
                  {/* Area fill gradient */}
                  <linearGradient id="historyTrendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.25" />
                    <stop offset="60%" stopColor="var(--accent-teal)" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Reference steady zone gradient */}
                  <linearGradient id="historySteadyZoneGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--status-minimal-dot)" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="var(--status-minimal-dot)" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Reference Background Zone: Steady/Calm for Risk chart */}
                {activeChartMetric === 'risk' && (
                  <rect
                    x={svgMetrics.paddingLeft}
                    y={svgMetrics.yTicks[4].y - (svgMetrics.innerH * 0.35)}
                    width={svgMetrics.innerW}
                    height={svgMetrics.innerH * 0.35}
                    fill="url(#historySteadyZoneGradient)"
                    rx="3"
                  />
                )}

                {/* Y-Axis Grid Lines & Tick Labels */}
                {svgMetrics.yTicks.map((tick) => (
                  <g key={`ytick_${tick.val}`}>
                    <line
                      x1={svgMetrics.paddingLeft}
                      y1={tick.y}
                      x2={svgMetrics.width - svgMetrics.paddingRight}
                      y2={tick.y}
                      stroke="var(--border-color)"
                      strokeWidth={tick.val === 0 || tick.val === 1 ? '1.5' : '1'}
                      strokeDasharray={tick.val === 0 || tick.val === 1 ? 'none' : '3 3'}
                    />
                    <text
                      x={svgMetrics.paddingLeft - 8}
                      y={tick.y + 3.5}
                      textAnchor="end"
                      fontSize="9.5"
                      fill="var(--text-muted)"
                      fontFamily="var(--font-mono)"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}

                {/* Y-Axis Title */}
                <text
                  x={svgMetrics.paddingLeft - 38}
                  y={svgMetrics.paddingTop + svgMetrics.innerH / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 ${svgMetrics.paddingLeft - 38} ${svgMetrics.paddingTop + svgMetrics.innerH / 2})`}
                  fontSize="9"
                  fill="var(--text-muted)"
                  fontWeight="600"
                  letterSpacing="0.05em"
                >
                  {metricConfig.yAxisLabel}
                </text>

                {/* Area Fill under trend line (Only when 2+ points exist) */}
                {svgMetrics.areaPath && (
                  <path
                    d={svgMetrics.areaPath}
                    fill="url(#historyTrendAreaGradient)"
                  />
                )}

                {/* Trend Connecting Line (Only when 2+ points exist) */}
                {svgMetrics.linePath && (
                  <path
                    d={svgMetrics.linePath}
                    fill="none"
                    stroke="var(--accent-teal)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* X-Axis Date Labels and Data Points */}
                {svgMetrics.pointsWithCoords.map((point, idx) => {
                  const isActive = activeChartIndex === idx;
                  const isSingle = svgMetrics.pointsWithCoords.length === 1;

                  return (
                    <g
                      key={point.id}
                      className="wellness-trend-point-group"
                      tabIndex={0}
                      role="button"
                      aria-label={`${point.tag} on ${point.fullDateLabel}: ${point.displayValue}`}
                      onMouseEnter={() => setActiveChartIndex(idx)}
                      onMouseLeave={() => setActiveChartIndex(null)}
                      onFocus={() => setActiveChartIndex(idx)}
                      onBlur={() => setActiveChartIndex(null)}
                      onClick={() => {
                        if (point.record) {
                          const matchIdx = filteredRecords.findIndex(
                            (r) => (r.id || r.timestamp) === (point.record.id || point.record.timestamp)
                          );
                          if (matchIdx !== -1) {
                            setSelectedIndex(matchIdx);
                            onShowToast?.(`Inspecting check-in from ${point.dateLabel}`);
                          }
                        } else {
                          onShowToast?.(`Selected ${point.tag} from ${point.dateLabel}`);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (point.record) {
                            const matchIdx = filteredRecords.findIndex(
                              (r) => (r.id || r.timestamp) === (point.record.id || point.record.timestamp)
                            );
                            if (matchIdx !== -1) setSelectedIndex(matchIdx);
                          }
                        } else if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          setActiveChartIndex((prev) => (prev === null ? 0 : Math.min(svgMetrics.pointsWithCoords.length - 1, prev + 1)));
                        } else if (e.key === 'ArrowLeft') {
                          e.preventDefault();
                          setActiveChartIndex((prev) => (prev === null ? 0 : Math.max(0, prev - 1)));
                        }
                      }}
                    >
                      {/* Vertical line indicator for single point or active point */}
                      {(isSingle || isActive) && (
                        <line
                          x1={point.x}
                          y1={point.y}
                          x2={point.x}
                          y2={svgMetrics.paddingTop + svgMetrics.innerH}
                          stroke={isActive ? 'var(--accent-teal)' : 'var(--border-strong)'}
                          strokeWidth="1.2"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Halo ring when hovered or focused */}
                      {isActive && (
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={10}
                          fill="none"
                          stroke={point.color || 'var(--accent-teal)'}
                          strokeWidth="2.5"
                          opacity="0.4"
                        />
                      )}

                      {/* Point Circle */}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={isActive ? 6.5 : isSingle ? 6 : 4.5}
                        fill={point.color || 'var(--accent-teal)'}
                        stroke="var(--card-bg)"
                        strokeWidth={isActive ? 3 : 2}
                      />

                      {/* X-axis date label below point */}
                      {(isSingle || isActive || idx === 0 || idx === svgMetrics.pointsWithCoords.length - 1 || svgMetrics.pointsWithCoords.length <= 7 || idx % Math.ceil(svgMetrics.pointsWithCoords.length / 5) === 0) && (
                        <text
                          x={point.x}
                          y={svgMetrics.height - 12}
                          textAnchor="middle"
                          fontSize="9.5"
                          fill={isActive ? 'var(--text-primary)' : 'var(--text-muted)'}
                          fontWeight={isActive ? 700 : 400}
                        >
                          {point.dateLabel}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Single Point Indicator Label */}
                {svgMetrics.pointsWithCoords.length === 1 && (
                  <text
                    x={svgMetrics.pointsWithCoords[0].x}
                    y={svgMetrics.pointsWithCoords[0].y - 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--accent-teal)"
                    fontWeight="600"
                  >
                    Baseline observation ({svgMetrics.pointsWithCoords[0].displayValue})
                  </text>
                )}

                {/* Tooltip */}
                {activeChartIndex !== null && svgMetrics.pointsWithCoords[activeChartIndex] && (() => {
                  const p = svgMetrics.pointsWithCoords[activeChartIndex];
                  const tipW = 180;
                  const tipH = 48;
                  const tipX = Math.max(
                    svgMetrics.paddingLeft,
                    Math.min(svgMetrics.width - svgMetrics.paddingRight - tipW, p.x - tipW / 2)
                  );
                  const tipY = p.y - 56 < svgMetrics.paddingTop ? p.y + 14 : p.y - 54;

                  return (
                    <g pointerEvents="none">
                      <rect
                        x={tipX}
                        y={tipY}
                        width={tipW}
                        height={tipH}
                        rx="6"
                        ry="6"
                        fill="var(--card-bg)"
                        stroke="var(--border-strong)"
                        strokeWidth="1.2"
                        filter="drop-shadow(0 2px 6px rgba(0,0,0,0.12))"
                      />
                      <text
                        x={tipX + 8}
                        y={tipY + 16}
                        fontSize="9.5"
                        fill="var(--text-muted)"
                      >
                        {p.fullDateLabel}
                      </text>
                      <text
                        x={tipX + 8}
                        y={tipY + 33}
                        fontSize="11"
                        fontWeight="700"
                        fill="var(--text-primary)"
                      >
                        {p.tag}: {p.displayValue}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Bottom Inspection Bar */}
            <div className="wellness-trend-stat-row">
              {activeChartIndex !== null && svgMetrics.pointsWithCoords[activeChartIndex] ? (
                (() => {
                  const p = svgMetrics.pointsWithCoords[activeChartIndex];
                  return (
                    <>
                      <div>
                        <strong>Selected Point:</strong> {p.fullDateLabel} •{' '}
                        <span>
                          {p.tag}: <strong style={{ color: p.color }}>{p.displayValue}</strong>
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {p.record && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Click to inspect check-in
                          </span>
                        )}
                        <InteractiveButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveChartIndex(null)}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                        >
                          Reset highlight
                        </InteractiveButton>
                      </div>
                    </>
                  );
                })()
              ) : (
                <>
                  <div>
                    <strong>Longitudinal Scope:</strong> {chartPoints.length}{' '}
                    {chartPoints.length === 1 ? 'observation' : 'observations'} plotted
                    {chartPoints.length >= 2 && (
                      <span>
                        {' '}(Baseline: <strong>{chartPoints[0].value.toFixed(1)}</strong> on{' '}
                        {chartPoints[0].dateLabel} → Latest:{' '}
                        <strong>{chartPoints[chartPoints.length - 1].value.toFixed(1)}</strong>{' '}
                        on {chartPoints[chartPoints.length - 1].dateLabel})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Hover or use ← / → to inspect data points
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* -------------------------------------------------------------
          4. CONTROLS BAR: VIEW MODE, FILTERS & SORTING
          ------------------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '0.85rem 1rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-subtle)'
        }}
      >
        {/* Left: View Mode Toggle */}
        <div style={{ display: 'inline-flex', gap: '0.35rem', backgroundColor: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
          <InteractiveButton
            id="btn-view-mode-timeline"
            variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('timeline')}
            aria-pressed={viewMode === 'timeline'}
          >
            Timeline View
          </InteractiveButton>
          <InteractiveButton
            id="btn-view-mode-list"
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
          >
            List View
          </InteractiveButton>
        </div>

        {/* Right: Filters & Sorting */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          {/* Date Range Filter */}
          <select
            value={filterRange}
            onChange={(e) => setFilterRange(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
            aria-label="Filter check-ins by date range"
          >
            <option value="all">All Dates</option>
            <option value="7days">Past 7 Days</option>
            <option value="30days">Past 30 Days</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
            aria-label="Filter check-ins by status"
          >
            <option value="all">All Patterns</option>
            <option value="MINIMAL">Calm & Steady</option>
            <option value="MODERATE">Mild Stress</option>
            <option value="ELEVATED">Support Encouraged</option>
            <option value="SEVERE">Care Recommended</option>
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
            aria-label="Sort check-ins by date"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* -------------------------------------------------------------
          5. MAIN CONTENT AREA: MASTER LIST & DETAIL INSPECTION
          ------------------------------------------------------------- */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          icon={<IconCalendar size={32} />}
          title={records.length === 0 ? "No check-ins recorded yet" : "No matching check-ins"}
          description={
            records.length === 0
              ? "Your completed check-ins and reflection summaries will appear here."
              : "Try adjusting your filters above to view your reflections."
          }
          action={
            records.length === 0 ? (
              <InteractiveButton
                variant="primary"
                onClick={() => setActiveTab('assessment')}
              >
                Start First Check-in
              </InteractiveButton>
            ) : (
              <InteractiveButton
                variant="secondary"
                onClick={() => {
                  setFilterRange('all');
                  setFilterStatus('all');
                }}
              >
                Clear Filters
              </InteractiveButton>
            )
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>

          {/* Master View: Timeline or List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {filteredRecords.length} {filteredRecords.length === 1 ? 'Reflection' : 'Reflections'}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Use ↑ / ↓ keys to navigate
              </span>
            </div>

            {filteredRecords.map((rec, idx) => {
              const status = getHumanStatus(rec.riskLevel, rec.compositeRisk);
              const isSelected = selectedIndex === idx;
              const isLatest = idx === 0 && sortOrder === 'newest';

              if (viewMode === 'list') {
                return (
                  <div
                    key={rec.id || idx}
                    onClick={() => setSelectedIndex(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedIndex(idx);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1.1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      boxShadow: isSelected ? 'var(--shadow-card)' : 'var(--shadow-subtle)',
                      transition: 'all var(--motion-fast) var(--motion-ease-out)'
                    }}
                    aria-label={`Select check-in on ${rec.timestamp}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.3rem' }}>{status.icon}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                            {status.title}
                          </span>
                          {isLatest && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)', padding: '2px 6px', borderRadius: 'var(--radius-pill)' }}>
                              Latest
                            </span>
                          )}
                          {rec.isDemo && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, backgroundColor: 'var(--bg-tertiary, rgba(0,0,0,0.06))', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)' }}>
                              Sample
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {rec.timestamp}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: status.bgColor,
                        color: status.color
                      }}
                    >
                      {rec.riskLevel === 'MINIMAL' ? 'Calm' : rec.riskLevel === 'MODERATE' ? 'Mild Stress' : rec.riskLevel === 'SEVERE' ? 'Care Recommended' : 'Support Encouraged'}
                    </span>
                  </div>
                );
              }

              // Timeline view card
              return (
                <div
                  key={rec.id || idx}
                  onClick={() => setSelectedIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIndex(idx);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: isSelected
                      ? '2px solid var(--color-primary)'
                      : isLatest
                      ? `1.5px solid ${status.borderColor}`
                      : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem 1.35rem',
                    boxShadow: isSelected ? 'var(--shadow-card)' : 'var(--shadow-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all var(--motion-fast) var(--motion-ease-out)'
                  }}
                  aria-label={`Select check-in on ${rec.timestamp}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{status.icon}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: status.color }}>
                            {status.title}
                          </span>
                          {isLatest && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                              Latest Check-in
                            </span>
                          )}
                          {rec.isDemo && (
                            <span style={{ fontSize: '0.70rem', fontWeight: 600, backgroundColor: 'var(--bg-tertiary, rgba(0,0,0,0.06))', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)' }}>
                              Sample Data
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {rec.timestamp}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.65rem',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: status.bgColor,
                        color: status.color
                      }}
                    >
                      {rec.riskLevel === 'MINIMAL' ? 'Calm & Steady' : rec.riskLevel === 'MODERATE' ? 'Mild Stress' : rec.riskLevel === 'SEVERE' ? 'Care Recommended' : 'Support Encouraged'}
                    </span>
                  </div>

                  {/* Summary excerpt */}
                  <p style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {rec.text ? rec.text.replace(/\(High somatic.*?\)/g, '') : "Check-in completed calmly."}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detail Inspection Panel */}
          {activeRecord && (() => {
            const status = getHumanStatus(activeRecord.riskLevel, activeRecord.compositeRisk);
            const isLatest = selectedIndex === 0 && sortOrder === 'newest';

            return (
              <div
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.75rem',
                  boxShadow: 'var(--shadow-card)',
                  position: 'sticky',
                  top: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '1.6rem' }}>{status.icon}</span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {status.title}
                      </h3>
                      {isLatest && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                          Most Recent
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <IconClock size={13} />
                      <span>{activeRecord.timestamp}</span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.75rem',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: status.bgColor,
                      color: status.color
                    }}
                  >
                    {activeRecord.riskLevel === 'MINIMAL' ? 'Calm & Steady' : activeRecord.riskLevel === 'MODERATE' ? 'Mild Stress' : 'Support Encouraged'}
                  </span>
                </div>

                {/* Section A: Recorded Facts & What You Shared */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: 'var(--accent-teal-subtle)', color: 'var(--accent-teal)', padding: '1px 6px', borderRadius: 'var(--radius-pill)' }}>
                      RECORDED FACT
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      What You Shared
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem 1.15rem',
                      fontSize: '0.94rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.55,
                      fontStyle: 'italic'
                    }}
                  >
                    "{activeRecord.text ? activeRecord.text.replace(/\(High somatic.*?\)/g, '') : "Check-in completed calmly."}"
                  </div>
                </div>

                {/* Section B: Inferred Telemetry Cues */}
                {activeRecord.cues && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: 'var(--bg-secondary)', color: 'var(--accent-copper)', border: '1px solid var(--border-color)', padding: '1px 6px', borderRadius: 'var(--radius-pill)' }}>
                        ALGORITHMIC INFERENCES
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Observed Telemetry Cues
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {typeof activeRecord.compositeRisk === 'number' && Number.isFinite(activeRecord.compositeRisk) && (
                        <div><strong>Composite Risk Indicator:</strong> {activeRecord.compositeRisk.toFixed(2)} / 10.00 <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>(Algorithmic telemetry estimate)</span></div>
                      )}
                      {activeRecord.cues.speakingRhythm && (
                        <div><strong>Speaking rhythm cue:</strong> {activeRecord.cues.speakingRhythm}</div>
                      )}
                      {activeRecord.cues.gentleExpressions && (
                        <div><strong>Expression tone cue:</strong> {activeRecord.cues.gentleExpressions}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Optional Two-Session Comparison Toggle */}
                {compareRecord && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                    <InteractiveButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowComparison(!showComparison)}
                      style={{ fontSize: '0.84rem', padding: '0.4rem 0.6rem' }}
                    >
                      {showComparison ? 'Hide comparison with previous check-in' : 'Compare with previous check-in'}
                    </InteractiveButton>

                    {showComparison && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.85rem',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                          {sortOrder === 'oldest' ? 'Subsequent check-in' : 'Previous check-in'} ({compareRecord.timestamp}):
                        </div>
                        <div>
                          Pattern was <strong>{getHumanStatus(compareRecord.riskLevel, compareRecord.compositeRisk).title}</strong>.
                          {activeRecord.riskLevel === compareRecord.riskLevel
                            ? " Your self-reported reflections show a consistent pattern across these two check-ins."
                            : " Noticeable variations in daily rhythm and energy were reflected between these sessions."}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                          Note: Subtle day-to-day shifts are natural and do not indicate a medical diagnosis.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons: Preview Single, Download Single, Delete */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <InteractiveButton
                    id="btn-history-preview-report"
                    variant="primary"
                    size="sm"
                    onClick={() => setPreviewReport(activeRecord)}
                    aria-label="Preview Wellness Report"
                  >
                    <IconEye size={14} />
                    <span>Preview Report</span>
                  </InteractiveButton>

                  <InteractiveButton
                    id="btn-history-download-pdf"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadReport(activeRecord, selectedIndex)}
                    disabled={generatingId === (activeRecord.id || selectedIndex)}
                    aria-label="Download Wellness Report PDF"
                  >
                    {generatingId === (activeRecord.id || selectedIndex) ? (
                      <>
                        <IconRefreshCw size={13} className="spinning" />
                        <span>Generating...</span>
                      </>
                    ) : downloadedId === (activeRecord.id || selectedIndex) ? (
                      <>
                        <IconCheck size={13} style={{ color: 'var(--accent-teal)' }} />
                        <span>Downloaded!</span>
                      </>
                    ) : (
                      <>
                        <IconDownload size={13} />
                        <span>Download PDF</span>
                      </>
                    )}
                  </InteractiveButton>

                  <InteractiveButton
                    id="btn-history-delete-record"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecordToDelete(activeRecord)}
                    aria-label="Delete this check-in record"
                    style={{ color: '#ef4444', marginLeft: 'auto' }}
                  >
                    <IconTrash size={14} />
                    <span>Delete</span>
                  </InteractiveButton>
                </div>
              </div>
            );
          })()}

        </div>
      )}

      {/* -------------------------------------------------------------
          6. LOCAL STORAGE PRIVACY NOTICE
          ------------------------------------------------------------- */}
      <div
        style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--card-bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <IconShieldCheck size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <span>
          <strong>Private on this device:</strong> Your check-in history is stored in your browser's private local storage. Clearing your browser cookies or browsing data will remove this history. MindVision does not transmit raw biometrics or share your private notes with third parties.
        </span>
      </div>

      {/* -------------------------------------------------------------
          7. IN-APP REPORT PREVIEW MODALS
          ------------------------------------------------------------- */}
      {/* Single Check-in Report Preview Modal */}
      <ReportPreview
        isOpen={Boolean(previewReport)}
        record={previewReport}
        type="checkin"
        onClose={() => setPreviewReport(null)}
        onDownload={(rpt) => handleDownloadReport(rpt, selectedIndex)}
      />

      {/* Full Longitudinal History PDF Preview Modal */}
      <ReportPreview
        isOpen={previewHistoryModalOpen}
        record={filteredRecords.length > 0 ? filteredRecords : records}
        type="history"
        onClose={() => setPreviewHistoryModalOpen(false)}
        onDownload={() => handleExportFullHistory()}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        title="Remove this check-in?"
        description="This will permanently delete this check-in reflection from your device. This action cannot be reversed."
        confirmLabel="Delete Record"
        cancelLabel="Keep Record"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
}
