import React, { useState, useEffect } from 'react';
import { useLakshya } from '../context/LakshyaContext';
import {
  Send,
  Copy,
  CheckCircle2,
  Sliders,
  Sparkles,
  RefreshCw,
  Share2,
  FileText,
  ChevronLeft
} from 'lucide-react';

export const WhatsAppTab: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const {
    goals,
    tasks,
    revisions,
    habits,
    todayDate,
    largeText,
    highContrast,
    isStudent,
    logActivity,
    recalculateAllData
  } = useLakshya();

  // Selected template header format style
  const [templateHeader, setTemplateHeader] = useState<string>('⭐ LAKSHYA OPERATIONS DAILY AUDIT report ⭐');
  const [signature, setSignature] = useState<string>('Sent from Lakshya Personal Mission Control');

  // Generated compiled draft text
  const [compiledText, setCompiledText] = useState<string>('');
  
  // Quick status copy feedback animations
  const [copied, setCopied] = useState(false);

  // Filter today's tasks & reps
  const todayTasks = tasks.filter(t => t.deadline === todayDate);
  const completedTasks = todayTasks.filter(t => t.status === 'Completed');
  const pendingTasks = todayTasks.filter(t => t.status !== 'Completed');

  const todayRevs = revisions.filter(r => r.scheduledDate === todayDate);
  const completedRevs = todayRevs.filter(r => r.status === 'Completed');

  const completedHabits = habits.filter(h => h.history[todayDate] === 'Done');

  // Math study hours spent today
  const hoursToday = todayTasks.reduce((sum, current) => sum + (current.actualHours || 0), 0);

  // Dynamic locale-formatted date representation
  const formattedToday = (() => {
    try {
      const d = new Date(todayDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return todayDate;
    }
  })();

  // Generate dynamic textual message based on states
  const generateWhatsAppMessage = () => {
    let msg = `${templateHeader}\n\n`;
    msg += `📅 *DateCoordinates:* ${formattedToday}\n`;
    msg += `⏱️ *Total Study Log Hours spent today:* ${hoursToday} hours\n\n`;

    msg += `🏁 *TARGET ASSIGNMENT TASKS:*\n`;
    if (todayTasks.length === 0) {
      msg += `  No tasks scheduled today.\n`;
    } else {
      msg += `  • Completed: ${completedTasks.length} / ${todayTasks.length}\n`;
      completedTasks.forEach(t => {
        msg += `   [✓] *${t.name}* (Est: ${t.estimatedHours}h)\n`;
      });
      pendingTasks.forEach(t => {
        msg += `   [ ] ${t.name} (Est: ${t.estimatedHours}h - Status: ${t.status})\n`;
      });
    }
    msg += `\n`;

    if (isStudent) {
      msg += `🔁 *SPACED REPETITIONS PROGRESS:*\n`;
      if (todayRevs.length === 0) {
        msg += `  No revisions scheduled today.\n`;
      } else {
        msg += `  • Audited Reps: ${completedRevs.length} / ${todayRevs.length}\n`;
        completedRevs.forEach(r => {
          msg += `   [✓] *REVISION #${r.revisionNumber}:* ${r.taskName}\n`;
        });
        todayRevs.filter(r => r.status !== 'Completed').forEach(r => {
          msg += `   [ ] REVISION #${r.revisionNumber}: ${r.taskName}\n`;
        });
      }
      msg += `\n`;
    }

    msg += `🔥 *ATOMICAL ACCOUNTABILITY HABITS:*\n`;
    if (habits.length === 0) {
      msg += `  No habits tracked.\n`;
    } else {
      msg += `  • Completed checking: ${completedHabits.length} / ${habits.length}\n`;
      habits.forEach(h => {
        const statusToday = h.history[todayDate] || 'Pending';
        const check = statusToday === 'Done' ? '✓' : ' ';
        msg += `   [${check}] *${h.name}* (${h.currentStreak}d Streak)\n`;
      });
    }
    msg += `\n`;

    msg += `🚀 *CURRENT CO-ORDINATE MILESTONE STREAKS:*\n`;
    goals.slice(0, 3).forEach(g => {
      msg += `  • *${g.name}:* ${g.completion}% Completeness rate (${g.daysRemaining} days remaining till gate deadline)\n`;
    });

    msg += `\n---\n`;
    msg += `📱 _${signature}_`;

    setCompiledText(msg);
  };

  // Compile on first load, or when dependencies change
  useEffect(() => {
    generateWhatsAppMessage();
  }, [goals, tasks, revisions, habits, templateHeader, signature, isStudent, todayDate]);

  const handleRecalculate = () => {
    recalculateAllData();
    generateWhatsAppMessage();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledText);
    setCopied(true);
    logActivity(`Copied daily progress WhatsApp audit message to clipboard`, 'general');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    // Standard whatsapp share endpoint text query
    const encoded = encodeURIComponent(compiledText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
    logActivity(`Launched WhatsApp share prompt popup`, 'general');
  };

  return (
    <div className="space-y-8 animate-fade-in" id="whatsapp-tab-root">
      
      {/* Title blocks */}
      <div>
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-1 p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer border border-slate-200 bg-white shadow-4xs"
              title="Back to menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">WhatsApp Audit Sync</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">Draft beautiful progress reports automatically to share with study groups, guardians, or accountability buddies</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* EDITABLE COMPILATION TEMPLATES (Left Column) */}
        <section className="lg:col-span-5 bg-white rounded-xl p-6 border border-slate-200 shadow-3xs space-y-6" id="whatsapp-template-panel">
          
          <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Customize Audit template</h2>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-600">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Report Header Customizer</label>
              <input
                type="text"
                required
                value={templateHeader}
                onChange={(e) => setTemplateHeader(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">Closing Signature</label>
              <input
                type="text"
                required
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-600"
              />
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-150 space-y-2 text-slate-500">
              <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Auto-Extraction Specs</span>
              </h3>
              <p className="font-normal text-xs leading-relaxed">
                The generator extracts completed targets for <span className="font-extrabold text-indigo-900">today</span>, logs cumulative actual studying hours, registers streak lengths, and audits pending targets automatically.
              </p>
            </div>

            <button
              onClick={handleRecalculate}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-705 border border-indigo-150 font-extrabold py-2 px-4 rounded-lg text-xs cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Recalculate & Recompile report
            </button>
          </div>

        </section>

        {/* MONOSPACE PREVIEW ENGINE PANEL (Right Column) */}
        <section className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-3xs space-y-4" id="whatsapp-preview-panel">
          
          <div className="flex items-center justify-between border-b border-slate-150 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-800">Monospace WhatsApp feed preview</h2>
                <p className="text-[11px] text-slate-400 font-normal">Accurate markup representations</p>
              </div>
            </div>
          </div>

          {/* Styled preview output matches WhatsApp monospace view */}
          <div className="relative">
            <textarea
              readOnly
              value={compiledText}
              className="w-full h-[360px] bg-emerald-50/10 border border-slate-250 p-4 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner resize-none"
            />
            
            <span className="absolute bottom-3 right-4 select-none bg-emerald-50 text-emerald-800 text-[10px] font-bold py-1 px-2.5 rounded-md uppercase border border-emerald-150">
              WhatsApp Mode Checked
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleCopy}
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors border ${
                copied
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy report Message'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex-1 py-2 px-4 bg-emerald-650 hover:bg-emerald-550 border border-emerald-700 text-white font-black rounded-lg text-xs cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Share directly on WhatsApp</span>
            </button>
          </div>

        </section>

      </div>

    </div>
  );
};
