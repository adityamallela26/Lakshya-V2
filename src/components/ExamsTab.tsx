import React, { useState, useEffect, useMemo } from 'react';
import { useLakshya } from '../context/LakshyaContext';
import { AcademicTest, Goal, GoalChild } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Calendar,
  Trash2,
  Plus,
  Filter,
  SlidersHorizontal,
  X,
  AlertTriangle,
  BookOpen,
  ClipboardList,
  Award,
  CheckCircle,
  Sparkles,
  BarChart2,
  LineChart as LineIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatTestDateToMonthDay = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[month - 1]}`;
  } catch (e) {
    return dateStr;
  }
};

const getMonthFromDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const monthIndex = parseInt(parts[1], 10) - 1;
    return MONTH_NAMES[monthIndex] || '';
  }
  return '';
};

export const ExamsTab: React.FC = () => {
  const {
    goals,
    academicTests,
    addAcademicTest,
    deleteAcademicTest,
    todayDate,
    largeText
  } = useLakshya();

  // Filter Academic Goals (type === 'Academic')
  const academicGoals = useMemo(() => goals.filter(g => g.type === 'Academic'), [goals]);

  // UI state toggles
  const [showForm, setShowForm] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Form states
  const [examinationName, setExaminationName] = useState('');
  const [relatedGoalId, setRelatedGoalId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [examDate, setExamDate] = useState(todayDate || new Date().toISOString().split('T')[0]);
  const [marksObtained, setMarksObtained] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [formError, setFormError] = useState<string | null>(null);

  // Analytics filters corresponding to the entry fields:
  // - Examination Name
  // - Related Goal
  // - Subject
  // - Exam Date (Month filter)
  // - Marks Obtained (Score Category filter)
  const [filterExamName, setFilterExamName] = useState('all');
  const [filterGoalId, setFilterGoalId] = useState('all');
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterScoreRange, setFilterScoreRange] = useState('all'); // all | excellent(>=85%) | satisfactory(55-84%) | improvement(<55%)

  // Chart type logic
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Synchronise form related goal and subject selection dropdowns
  useEffect(() => {
    if (academicGoals.length > 0 && !relatedGoalId) {
      setRelatedGoalId(academicGoals[0].id);
    }
  }, [academicGoals, relatedGoalId]);

  useEffect(() => {
    if (relatedGoalId) {
      const activeGoalObj = academicGoals.find(g => g.id === relatedGoalId);
      const subjects = activeGoalObj?.children || [];
      if (subjects.length > 0) {
        setSelectedSubjectId(subjects[0].id);
      } else {
        setSelectedSubjectId('');
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [relatedGoalId, academicGoals]);

  // Extract unique recorded Examination Names for filters
  const uniqueRecordedExamNames = useMemo(() => {
    const names = (academicTests || []).map(t => t.examination || '').filter(name => name.trim() !== '');
    return Array.from(new Set(names));
  }, [academicTests]);

  // Extract unique subjects across academic goals for filter mapping
  const uniqueSubjectsList = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    academicGoals.forEach(g => {
      g.children?.forEach(sub => {
        if (!list.some(s => s.id === sub.id)) {
          list.push({ id: sub.id, name: sub.name });
        }
      });
    });
    return list;
  }, [academicGoals]);

  // Handle Recording New Mark Entry
  const handleRecordMark = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!examinationName.trim()) {
      setFormError('Please enter the examination name.');
      return;
    }

    if (!relatedGoalId) {
      setFormError('Please select a related Academic Goal.');
      return;
    }

    const goalObj = academicGoals.find(g => g.id === relatedGoalId);
    if (!goalObj) {
      setFormError('Target Academic Goal does not exist.');
      return;
    }

    const subObj = goalObj.children?.find(s => s.id === selectedSubjectId);
    if (!selectedSubjectId || !subObj) {
      setFormError('Please select a valid Subject under the related Goal.');
      return;
    }

    const obt = parseFloat(marksObtained);
    const max = parseFloat(maxMarks);

    if (isNaN(obt) || obt < 0) {
      setFormError('Please enter a valid non-negative marks obtained value.');
      return;
    }

    if (isNaN(max) || max <= 0) {
      setFormError('Please enter a valid positive total possible marks.');
      return;
    }

    if (obt > max) {
      setFormError('Marks obtained cannot exceed total potential marks.');
      return;
    }

    const examTitle = `${examinationName.trim()}: ${subObj.name}`;

    // Call context action
    addAcademicTest(
      relatedGoalId,
      examTitle,
      examDate,
      max,
      obt,
      [subObj.name], // covered chapters corresponds to the subject name for consistency
      examinationName.trim(),
      subObj.id,
      subObj.name,
      undefined,
      undefined
    );

    // Reset Form fields
    setExaminationName('');
    setMarksObtained('');
    setFormError(null);
    setShowForm(false);
  };

  // Filtered Exams matching the 5 filter selectors
  const filteredExams = useMemo(() => {
    return (academicTests || []).filter(test => {
      const matchExam = filterExamName === 'all' || (test.examination && test.examination.trim().toLowerCase() === filterExamName.trim().toLowerCase());
      const matchGoal = filterGoalId === 'all' || test.goalId === filterGoalId;
      const matchSub = filterSubjectId === 'all' || test.subjectId === filterSubjectId;
      
      const examMonth = getMonthFromDate(test.testDate);
      const matchMonth = filterMonth === 'all' || examMonth === filterMonth;

      const pct = test.maxMarks > 0 ? (test.marksObtained / test.maxMarks) * 100 : 0;
      let matchScore = true;
      if (filterScoreRange === 'excellent') {
        matchScore = pct >= 85;
      } else if (filterScoreRange === 'satisfactory') {
        matchScore = pct >= 55 && pct < 85;
      } else if (filterScoreRange === 'improvement') {
        matchScore = pct < 55;
      }

      return matchExam && matchGoal && matchSub && matchMonth && matchScore;
    }).sort((a, b) => a.testDate.localeCompare(b.testDate)); // sorted chronologically for trending line/bar chart
  }, [academicTests, filterExamName, filterGoalId, filterSubjectId, filterMonth, filterScoreRange]);

  // Aggregate Metrics over the filtered subset
  const analyticsMetrics = useMemo(() => {
    if (filteredExams.length === 0) return { avg: 0, count: 0, peak: 0 };
    
    let totalMax = 0;
    let totalObt = 0;
    let highestPct = 0;

    filteredExams.forEach(e => {
      totalMax += e.maxMarks;
      totalObt += e.marksObtained;
      const pct = e.maxMarks > 0 ? (e.marksObtained / e.maxMarks) * 100 : 0;
      if (pct > highestPct) highestPct = pct;
    });

    return {
      avg: totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0,
      count: filteredExams.length,
      peak: Math.round(highestPct)
    };
  }, [filteredExams]);

  // Data mapping for Recharts
  const rechartsData = useMemo(() => {
    return filteredExams.map(test => {
      const scorePct = test.maxMarks > 0 ? Math.round((test.marksObtained / test.maxMarks) * 100) : 0;
      return {
        name: formatTestDateToMonthDay(test.testDate),
        score: scorePct,
        exam: test.examination,
        subject: test.subjectName || 'Subject',
        marks: `${test.marksObtained}/${test.maxMarks}`,
        date: test.testDate
      };
    });
  }, [filteredExams]);

  return (
    <div className={`space-y-6 ${largeText ? 'text-lg' : 'text-sm'} relative`} id="exams-tab-root">
      
      {/* HEADER BAR & PROMINENT ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs" id="exams-tab-header">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-indigo-600 shrink-0" />
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Academic Exams & Marks Manager</h1>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Log examination grades and visualize structured performance indicators through multi-filter analytical widgets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowRegister(true);
              setShowForm(false);
            }}
            className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-extrabold py-2 px-4 rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-2xs border border-slate-200 transition-all hover:-translate-y-0.5"
            id="btn-marks-register"
          >
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            <span>Marks Register</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setFormError(null);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold py-2 px-4 rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-all hover:-translate-y-0.5 active:translate-y-0"
            id="btn-record-exam-marks"
          >
            <Plus className="w-4 h-4" />
            <span>Record Exam Marks</span>
          </button>
        </div>
      </div>

      {/* EXPANDABLE FORM TO ENTER EXAM MARKS */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            key="record-exam-form-container"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-705" id="record-test-form-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <h3 className="font-extrabold text-slate-800 text-sm">Enter Student Examination Score</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {academicGoals.length === 0 ? (
                <div className="p-5 border border-dashed border-amber-200 bg-amber-50/20 rounded-xl text-center space-y-2">
                  <AlertTriangle className="w-5 h-5 text-amber-505 mx-auto" />
                  <p className="text-xs text-amber-800 font-bold">No registered Academic Goals found!</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Please navigate to the **Goals** tab and create an Academic Goal structure containing curriculum subjects first.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRecordMark} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Examination Name Field */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Examination Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Midterm Test, Final Board Exam"
                        value={examinationName}
                        onChange={(e) => setExaminationName(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold"
                        id="form-exam-name"
                      />
                    </div>

                    {/* Which Goal related to */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Related Goal</label>
                      <select
                        value={relatedGoalId}
                        onChange={(e) => setRelatedGoalId(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-bold cursor-pointer"
                        id="form-related-goal"
                      >
                        {academicGoals.map(goal => (
                          <option key={goal.id} value={goal.id}>🎯 {goal.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Which Subject (Dropdown from goal's subjects) */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Which Subject</label>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-bold cursor-pointer"
                        id="form-related-subject"
                      >
                        {(() => {
                          const goalObj = academicGoals.find(g => g.id === relatedGoalId);
                          const subjects = goalObj?.children || [];
                          if (subjects.length === 0) {
                            return <option value="">⚠️ No subjects under this Goal</option>;
                          }
                          return subjects.map(sub => (
                            <option key={sub.id} value={sub.id}>📚 {sub.name}</option>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* Exam Date Field */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Exam Date</label>
                      <input
                        type="date"
                        required
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-mono font-bold"
                        id="form-exam-date"
                      />
                    </div>

                    {/* Marks Obtained & Potential Out-of score */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Marks Obtained</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.5"
                        placeholder="e.g. 85"
                        value={marksObtained}
                        onChange={(e) => setMarksObtained(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-mono font-bold"
                        id="form-marks-obtained"
                      />
                    </div>

                    {/* Out of Marks (Totalpossible) */}
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Possible Marks</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={maxMarks}
                        onChange={(e) => setMaxMarks(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-mono font-bold"
                        id="form-total-marks"
                      />
                    </div>

                  </div>

                  {formError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer bg-white text-slate-600 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black rounded-xl text-xs cursor-pointer shadow-sm transition"
                    >
                      Record Marks Entry
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER & PERFORMANCE ANALYTICS ENGINE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-6" id="exams-analytics-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2 uppercase font-mono tracking-wide">
              <BarChart2 className="w-5 h-5 text-indigo-650" />
              Exams Performance Analytics
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Apply target entity filters to diagnostic grade progression grids.</p>
          </div>

          {/* Toggle between Line and Bar Chart representation */}
          {rechartsData.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 self-start sm:self-center shadow-3xs">
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`py-1 px-3 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                  chartType === 'line'
                    ? 'bg-white text-indigo-950 shadow-2xs font-extrabold border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LineIcon className="w-3 h-3" />
                Line Trend
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`py-1 px-3 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white text-indigo-950 shadow-2xs font-extrabold border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                Bar Chart
              </button>
            </div>
          )}
        </div>

        {/* 5-Field Interactive Filters Panel aligning directly with the 5 form inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-150/60" id="analytics-filters-panel">
          
          {/* 1. Examination Name Filter */}
          <div className="space-y-1">
            <label className="block text-[9px] uppercase font-bold text-slate-450 tracking-wider">📝 Examination Name</label>
            <select
              value={filterExamName}
              onChange={(e) => setFilterExamName(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-705 outline-none focus:border-indigo-600 font-bold cursor-pointer transition"
              id="filter-exam-name"
            >
              <option value="all">📁 All Exams</option>
              {uniqueRecordedExamNames.map(name => (
                <option key={name} value={name}>📝 {name}</option>
              ))}
            </select>
          </div>

          {/* 2. Related Goal Filter */}
          <div className="space-y-1">
            <label className="block text-[9px] uppercase font-bold text-slate-450 tracking-wider">🎯 Related Goal</label>
            <select
              value={filterGoalId}
              onChange={(e) => {
                setFilterGoalId(e.target.value);
                setFilterSubjectId('all'); // reset subject for safety
              }}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-705 outline-none focus:border-indigo-600 font-bold cursor-pointer transition"
              id="filter-related-goal"
            >
              <option value="all">🎯 All Goals</option>
              {academicGoals.map(g => (
                <option key={g.id} value={g.id}>🎯 {g.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Which Subject Filter */}
          <div className="space-y-1">
            <label className="block text-[9px] uppercase font-bold text-slate-450 tracking-wider">📚 Subject</label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-705 outline-none focus:border-indigo-600 font-bold cursor-pointer transition"
              id="filter-related-subject"
            >
              <option value="all">📚 All Subjects</option>
              {(() => {
                const targetGoals = filterGoalId === 'all'
                  ? academicGoals
                  : academicGoals.filter(goal => goal.id === filterGoalId);

                const subjectsToFilter: { id: string; name: string }[] = [];
                targetGoals.forEach(g => {
                  g.children?.forEach(s => {
                    if (!subjectsToFilter.some(stored => stored.id === s.id)) {
                      subjectsToFilter.push({ id: s.id, name: s.name });
                    }
                  });
                });

                return subjectsToFilter.map(sub => (
                  <option key={sub.id} value={sub.id}>📚 {sub.name}</option>
                ));
              })()}
            </select>
          </div>

          {/* 4. Month Filter (mapping from Date) */}
          <div className="space-y-1">
            <label className="block text-[9px] uppercase font-bold text-slate-450 tracking-wider">📅 Exam Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-705 outline-none focus:border-indigo-600 font-bold cursor-pointer transition"
              id="filter-exam-month"
            >
              <option value="all">📅 All Months</option>
              {MONTH_NAMES.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          {/* 5. Marks Obtained (Score filter breakdown) */}
          <div className="space-y-1">
            <label className="block text-[9px] uppercase font-bold text-slate-450 tracking-wider">⭐ Score Grade</label>
            <select
              value={filterScoreRange}
              onChange={(e) => setFilterScoreRange(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-705 outline-none focus:border-indigo-600 font-bold cursor-pointer transition"
              id="filter-score-range"
            >
              <option value="all">⭐ All Scores</option>
              <option value="excellent">🟢 Outstanding (≥ 85%)</option>
              <option value="satisfactory">🟡 Satisfactory (55% - 84%)</option>
              <option value="improvement">🔴 Needs Practice (&lt; 55%)</option>
            </select>
          </div>

        </div>

        {/* ANALYTICS SUBSET KPI SUB-CARDS */}
        {filteredExams.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="analytics-filtered-kpis">
            <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-150 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Filtered Exams Count</span>
              <span className="text-xl font-mono font-black text-slate-800 mt-1">{analyticsMetrics.count}</span>
            </div>
            <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-150 flex flex-col justify-between">
              <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Filtered Average Score</span>
              <span className="text-xl font-mono font-black text-emerald-600 mt-1">{analyticsMetrics.avg}%</span>
            </div>
            <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-150 flex flex-col justify-between">
              <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">Peak Filtered Score</span>
              <span className="text-xl font-mono font-black text-indigo-700 mt-1">{analyticsMetrics.peak}%</span>
            </div>
          </div>
        )}

        {/* RENDERED GRAPHICAL VISUAL VIEWPORT */}
        <div className="w-full h-64" id="analytics-chart-viewport">
          {rechartsData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 md:py-16 space-y-2 text-slate-400">
              <AlertTriangle className="w-7 h-7 text-slate-300 animate-bounce" />
              <p className="font-extrabold text-slate-700 text-xs">No exams correspond to the active filters</p>
              <p className="text-[10px] text-slate-450 max-w-xs mx-auto">
                Modify your selections above, or clear filters to track student performance.
              </p>
              {(filterExamName !== 'all' || filterGoalId !== 'all' || filterSubjectId !== 'all' || filterMonth !== 'all' || filterScoreRange !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterExamName('all');
                    setFilterGoalId('all');
                    setFilterSubjectId('all');
                    setFilterMonth('all');
                    setFilterScoreRange('all');
                  }}
                  className="mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-800 cursor-pointer underline decoration-dotted"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={rechartsData} margin={{ top: 10, right: 15, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} fontWeight="bold" domain={[0, 100]} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl text-xs space-y-1 shadow-lg max-w-xs font-sans">
                            <p className="font-extrabold text-indigo-300">{data.exam}</p>
                            <p className="text-[10px] text-slate-350">Subject: <span className="text-emerald-300 font-bold">{data.subject}</span></p>
                            <p className="text-[10px] text-slate-405 font-mono">Date: {data.date}</p>
                            <p className="text-[11px] font-extrabold mt-1 text-emerald-400">Score: {data.score}% ({data.marks})</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4F46E5"
                    strokeWidth={3.5}
                    activeDot={{ r: 6 }}
                    dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }}
                  />
                </LineChart>
              ) : (
                <BarChart data={rechartsData} margin={{ top: 10, right: 15, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} fontWeight="bold" domain={[0, 100]} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl text-xs space-y-1 shadow-lg max-w-xs font-sans">
                            <p className="font-extrabold text-indigo-300">{data.exam}</p>
                            <p className="text-[10px] text-slate-350">Subject: <span className="text-emerald-300 font-bold">{data.subject}</span></p>
                            <p className="text-[10px] text-slate-405 font-mono">Date: {data.date}</p>
                            <p className="text-[11px] font-extrabold mt-1 text-emerald-400">Score: {data.score}% ({data.marks})</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="score" fill="#4F46E5" radius={[5, 5, 0, 0]} maxBarSize={45} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* INTERACTIVE MARKS REGISTER DRAWER */}
      <AnimatePresence>
        {showRegister && (
          <>
            {/* Dark Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegister(false)}
              className="fixed inset-0 bg-black z-40"
              key="register-backdrop"
            />

            {/* Slide-over Drawer Pane */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:max-w-xl md:max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-slate-250"
              key="register-drawer"
              id="marks-register-drawer"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h2 className="font-black text-slate-800 text-sm tracking-wide uppercase">Student Marks Register</h2>
                    <p className="text-[10px] text-slate-450 font-bold">Comprehensive historical record of all registered exam grades</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="p-1 px-2 text-xs font-black text-slate-450 hover:text-slate-800 rounded-lg hover:bg-slate-200/50 transition flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {academicTests.length === 0 ? (
                  <div className="text-center py-16 space-y-3 text-slate-400">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" strokeWidth={1.5} />
                    <p className="font-bold text-slate-700 text-xs">The Marks Register is currently empty</p>
                    <p className="text-[10px] text-slate-450 max-w-xs mx-auto leading-relaxed">
                      All examination score entries logged for the student will appear here systematically. Tap "+ Record Exam Marks" on the primary dashboard to log entries.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-450 font-bold px-1.5 uppercase font-mono">
                      <span>Records Listed: {academicTests.length}</span>
                      <span className="text-slate-350">Scroll down as more are registered</span>
                    </div>

                    <div className="border border-slate-250 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-150">
                      {academicTests.map((test) => {
                        const scorePct = test.maxMarks > 0 ? Math.round((test.marksObtained / test.maxMarks) * 100) : 0;
                        const goalInstance = goals.find(g => g.id === test.goalId);
                        
                        let badgeCol = "bg-indigo-50 text-indigo-750 border-indigo-150";
                        if (scorePct >= 85) badgeCol = "bg-emerald-50 text-emerald-800 border-emerald-150";
                        else if (scorePct < 55) badgeCol = "bg-rose-50 text-rose-800 border-rose-150_bold";

                        return (
                          <div
                            key={test.id}
                            className="p-3.5 hover:bg-slate-50/50 transition duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-extrabold text-slate-800 truncate" title={test.examination}>
                                  {test.examination || 'General Test'}
                                </h4>
                                {goalInstance && (
                                  <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                                    🎯 {goalInstance.name}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                <span className="font-extrabold text-indigo-650 bg-indigo-50/60 px-1.5 py-0.5 rounded">
                                  📚 {test.subjectName || 'Subject'}
                                </span>
                                <span className="text-slate-300 font-black">•</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {test.testDate}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              <span className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-black inline-block text-center ${badgeCol}`}>
                                {test.marksObtained} / {test.maxMarks} ({scorePct}%)
                              </span>
                              <button
                                type="button"
                                onClick={() => deleteAcademicTest(test.id)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                title="Delete score entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-black rounded-xl text-xs cursor-pointer shadow-3xs transition"
                >
                  Close Register
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
