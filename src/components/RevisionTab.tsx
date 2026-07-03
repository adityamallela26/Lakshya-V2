import React, { useState } from 'react';
import { useLakshya } from '../context/LakshyaContext';
import { RevisionCard } from '../types';
import {
  ArrowLeft,
  Brain,
  Timer,
  CheckCircle2,
  Circle,
  HelpCircle,
  Sparkles,
  Plus,
  Volume2,
  Trash2,
  Calendar,
  AlertCircle,
  BookOpen,
  BookmarkCheck,
  Cpu
} from 'lucide-react';

export const RevisionTab: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const {
    revisions,
    addRevision,
    updateRevision,
    deleteRevision,
    todayDate,
    highContrast,
    logActivity
  } = useLakshya();

  // Create new state parameters for adding custom items
  const [taskName, setTaskName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(todayDate);
  const [audioLink, setAudioLink] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Statistics
  const todayRevisions = revisions.filter(r => r.scheduledDate === todayDate);
  const overdueRevisions = revisions.filter(r => r.scheduledDate < todayDate && r.status !== 'Completed');
  const upcomingRevisions = revisions.filter(r => r.scheduledDate > todayDate);
  const completedCount = revisions.filter(r => r.status === 'Completed').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    // Use task id placeholder "custom-task-rev" to represent manual schedules
    addRevision('custom-task-rev-' + Date.now(), taskName.trim(), scheduledDate, audioLink.trim());
    setTaskName('');
    setAudioLink('');
    setShowAddForm(false);
    logActivity(`Created manually scheduled revision for: "${taskName.trim()}"`, 'revision');
  };

  const handleToggleStatus = (rev: RevisionCard) => {
    const nextStatus = rev.status === 'Completed' ? 'Pending' : 'Completed';
    updateRevision(rev.id, { status: nextStatus });
  };

  const textClass = highContrast ? 'text-slate-955' : 'text-slate-900';
  const borderClass = highContrast ? 'border-slate-900 border-2' : 'border-slate-200';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in" id="revision-tab-container">
      
      {/* HEADER SECTION WITH BACK BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-5" id="revision-header-section">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition flex items-center justify-center cursor-pointer active:scale-95 shadow-3xs"
            title="Go Back to Home"
            id="revision-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                ACTIVE RECALL FRAMEWORK
              </span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${textClass}`}>
              Revision & Memory Hub
            </h1>
            <p className="text-xs text-slate-500">
              Leverage cognitive intervals to secure long-term storage and prevent trace decay.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="sm:self-end inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-3xs hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Schedule Revision
        </button>
      </div>

      {/* REVISION CREATION FORM MODAL-LIKE DRAWER */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className={`bg-white p-5 rounded-2xl border ${borderClass} shadow-3xs space-y-4 animate-slide-up text-slate-800`}
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm tracking-tight flex items-center gap-1.5 text-slate-800">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Schedule Custom Memory Segment
            </h3>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-650 text-xs font-bold font-mono cursor-pointer"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Task Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450 block tracking-wider">Concept / Topic Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Dijkstra's Algorithm implementation"
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
                className="w-full border border-slate-205 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-650 bg-white"
              />
            </div>

            {/* Target Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450 block tracking-wider">Scheduled Recall Date</label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full border border-slate-205 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-650 bg-white"
              />
            </div>

            {/* Audio Link optional */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-450 block tracking-wider">Audio Explanation URL (Optional)</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={audioLink}
                onChange={e => setAudioLink(e.target.value)}
                className="w-full border border-slate-205 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-650 bg-white"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-705 text-white text-xs font-black rounded-lg cursor-pointer transition"
            >
              Confirm Schedule
            </button>
          </div>
        </form>
      )}

      {/* SPACED REPETITION TECHNIQUES INFOGRAPHIC (Bento style) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" id="spaced-rep-info-cards">
        <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 rounded-2xl border border-indigo-100 flex flex-col justify-between gap-3 shadow-5xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
              <Brain className="w-4 h-4 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-xs sm:text-sm text-indigo-900 tracking-tight">Active Recall</h3>
          </div>
          <p className="text-[11px] text-indigo-950/80 leading-relaxed font-semibold">
            Test yourself with flashcards or summaries before checking notes. Active retrieval builds robust synaptic pathways.
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50/50 to-purple-100/30 rounded-2xl border border-purple-100 flex flex-col justify-between gap-3 shadow-5xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
              <Timer className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-extrabold text-xs sm:text-sm text-purple-900 tracking-tight">Spaced Repetition</h3>
          </div>
          <p className="text-[11px] text-purple-950/80 leading-relaxed font-semibold">
            Review material on days 1, 3, 7, and 14. This resets the Ebbinghaus forgetting curve, shifting concepts to permanent memory.
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-amber-50/50 to-amber-100/30 rounded-2xl border border-amber-100 flex flex-col justify-between gap-3 shadow-5xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
              <Cpu className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-extrabold text-xs sm:text-sm text-amber-900 tracking-tight">Memory Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/80 p-1.5 rounded-lg border border-amber-150">
              <span className="block text-xs font-black text-indigo-750">{todayRevisions.length}</span>
              <span className="text-[9px] text-slate-450 uppercase font-bold tracking-wider">Due Today</span>
            </div>
            <div className="bg-white/80 p-1.5 rounded-lg border border-amber-150">
              <span className="block text-xs font-black text-emerald-700">{completedCount}</span>
              <span className="text-[9px] text-slate-450 uppercase font-bold tracking-wider">Revised</span>
            </div>
          </div>
        </div>
      </section>

      {/* OVERDUE ALERTS CONTAINER (if any exist) */}
      {overdueRevisions.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl flex items-start gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-xs text-rose-800 tracking-tight">Memory Trace Warning: Overdue Recalls Detected ({overdueRevisions.length})</h4>
            <p className="text-[10px] text-rose-700 mt-0.5 leading-relaxed">
              These items were scheduled for prior dates. Delayed retrieval accelerates trace decay. Complete them as soon as possible to restore trace strength!
            </p>
          </div>
        </div>
      )}

      {/* MAIN DIVISION OF TASK QUEUE */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-3xs text-slate-800 space-y-6">
        
        {/* TAB TYPE METRICS */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-indigo-600" />
            Adaptive Recall Queue
          </h2>
          <span className="text-[10px] uppercase font-mono font-bold tracking-wide text-slate-450">
            Total Queue Depth: {revisions.length}
          </span>
        </div>

        {revisions.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-450 bg-slate-50/20 max-w-lg mx-auto">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3 animate-bounce" />
            <p className="text-xs font-bold text-slate-700">No revisions currently scheduled.</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Revision cards are created automatically once you check off Syllabus Goals, or you can manually coordinate items using the "Schedule Revision" button.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-[10px] font-black text-indigo-650 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-lg border border-indigo-150 tracking-wide transition cursor-pointer"
            >
              Add First Revision
            </button>
          </div>
        ) : (
          <div className="space-y-3.5" id="revision-cards-queue">
            {revisions.map(rev => {
              const isToday = rev.scheduledDate === todayDate;
              const isOverdue = rev.scheduledDate < todayDate && rev.status !== 'Completed';
              const isCompleted = rev.status === 'Completed';

              return (
                <div
                  key={rev.id}
                  className={`p-4 rounded-xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCompleted
                      ? 'bg-emerald-50/20 border-emerald-150/80 text-slate-500'
                      : isOverdue
                      ? 'bg-rose-50/10 border-rose-150 text-slate-800 hover:border-rose-350 shadow-5xs'
                      : isToday
                      ? 'bg-indigo-50/20 border-indigo-150 text-slate-800'
                      : 'bg-slate-50/40 border-slate-150 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Checkbox item */}
                    <button
                      onClick={() => handleToggleStatus(rev)}
                      className="mt-0.5 transition hover:scale-115 cursor-pointer shrink-0"
                      title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50/20" />
                      ) : (
                        <Circle className={`w-5 h-5 ${isOverdue ? 'text-rose-400 hover:text-rose-600' : 'text-slate-350 hover:text-indigo-600'}`} />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-bold text-xs sm:text-sm tracking-tight ${isCompleted ? 'line-through text-slate-400' : 'text-slate-805'}`}>
                          {rev.taskName}
                        </span>

                        <span className="inline-flex items-center gap-0.5 text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                          Recalled #{rev.revisionNumber}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-450 font-medium">
                        {/* Due schedule */}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Scheduled: {rev.scheduledDate}</span>
                        </span>

                        {isOverdue && (
                          <span className="text-[9px] font-mono font-black text-rose-700 bg-rose-50 px-1.5 py-0.25 rounded border border-rose-100 animate-pulse">
                            🔥 OVERDUE PREVENT DECAY
                          </span>
                        )}
                        {isToday && !isCompleted && (
                          <span className="text-[9px] font-mono font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.25 rounded border border-indigo-100">
                            ⚡ DUE TODAY
                          </span>
                        )}

                        {/* Audio Link Trigger */}
                        {rev.audioLink && (
                          <a
                            href={rev.audioLink}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex items-center gap-1.5 text-indigo-650 hover:text-indigo-800 hover:underline font-black cursor-pointer bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded ml-2"
                          >
                            <Volume2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Play Explanation</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Delete revision item) */}
                  <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                    <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      isCompleted
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                        : isOverdue
                        ? 'text-rose-700 bg-rose-50 border-rose-100 animate-pulse'
                        : 'text-amber-700 bg-amber-50 border-amber-100'
                    }`}>
                      {rev.status}
                    </span>

                    <button
                      onClick={() => {
                        deleteRevision(rev.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 cursor-pointer transition"
                      title="Remove from memory queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
