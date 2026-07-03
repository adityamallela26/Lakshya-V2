import React from 'react';
import { useLakshya } from '../context/LakshyaContext';
import { Goal, GoalChild } from '../types';
import { 
  Target, 
  Calendar, 
  TrendingUp,
  Award,
  Flame
} from 'lucide-react';

// EVALUATION LOGIC FOR PARALLEL CLASS ROOT NODES
const getLeafNodesOfTree = (nodes: GoalChild[]): GoalChild[] => {
  let leaves: GoalChild[] = [];
  nodes.forEach(n => {
    if (!n.children || n.children.length === 0) {
      leaves.push(n);
    } else {
      leaves = [...leaves, ...getLeafNodesOfTree(n.children)];
    }
  });
  return leaves;
};

const getNodeClassCoverage = (node: GoalChild): number => {
  if (!node.children || node.children.length === 0) {
    return node.classCompleted ? 100 : 0;
  }
  const leaves = getLeafNodesOfTree([node]);
  const totalLeaves = leaves.length;
  if (totalLeaves === 0) return 0;
  const classCompleted = leaves.filter(l => l.classCompleted).length;
  return Math.round((classCompleted / totalLeaves) * 100);
};

const getNodeIdealCompletion = (node: GoalChild, goal: Goal, todayDate: string, parentIdealDate?: string, parentDate?: string, depth: number = 0): number => {
  if (goal.type === 'Academic' && goal.classEnabled) {
    return getNodeClassCoverage(node);
  }

  let activeIdealDate = node.idealDate;
  let activeDate = node.date;
  let activeStartDate = node.startDate;

  if (parentIdealDate) {
    if (!activeIdealDate || activeIdealDate === goal.deadline || activeIdealDate === goal.idealDate) {
      activeIdealDate = parentIdealDate;
    }
  }
  if (parentDate) {
    if (!activeDate || activeDate === goal.deadline) {
      activeDate = parentDate;
    }
  }

  const finalIdealStr = activeIdealDate || goal.idealDate || goal.deadline;
  const finalDateStr = activeDate || goal.deadline;
  const finalStartDateStr = activeStartDate || goal.startDate || '';

  const isWeightageAtDepth = (d: number): boolean => {
    if (goal.weightageLevels && goal.weightageLevels.includes(d)) {
      return true;
    }
    if (goal.calculationMode === 'weightage' && d === 0) {
      return true;
    }
    return false;
  };

  const hasCustomPace = node.idealDate || node.startDate;
  if (!hasCustomPace && node.children && node.children.length > 0) {
    const useWeightage = isWeightageAtDepth(depth + 1);
    if (useWeightage) {
      let totalWeight = 0;
      let weightedSum = 0;
      node.children.forEach(c => {
        const w = c.weight !== undefined ? c.weight : 1;
        totalWeight += w;
        weightedSum += getNodeIdealCompletion(c, goal, todayDate, finalIdealStr, finalDateStr, depth + 1) * w;
      });
      return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    } else {
      const sum = node.children.reduce((acc, c) => acc + getNodeIdealCompletion(c, goal, todayDate, finalIdealStr, finalDateStr, depth + 1), 0);
      return Math.round(sum / node.children.length);
    }
  }
  
  try {
    const today = new Date(todayDate);
    const targetDateStr = finalIdealStr;
    const target = new Date(targetDateStr);
    if (isNaN(today.getTime()) || isNaN(target.getTime())) return 50;
    if (today >= target) return 100;

    let startMs: number;
    let totalTimeMs: number;

    if (finalStartDateStr) {
      const customStart = new Date(finalStartDateStr);
      if (!isNaN(customStart.getTime())) {
        startMs = customStart.getTime();
        totalTimeMs = target.getTime() - startMs;
        if (totalTimeMs <= 0) totalTimeMs = 1;
      } else {
        const defaultDurationDays = 120;
        totalTimeMs = defaultDurationDays * 24 * 60 * 60 * 1000;
        startMs = target.getTime() - totalTimeMs;
      }
    } else {
      const defaultDurationDays = 120;
      totalTimeMs = defaultDurationDays * 24 * 60 * 60 * 1000;
      startMs = target.getTime() - totalTimeMs;
    }

    const todayMs = today.getTime();
    const elapsedMs = todayMs - startMs;
    let percentage = Math.round((elapsedMs / totalTimeMs) * 100);
    percentage = Math.min(100, Math.max(0, percentage));
    return percentage;
  } catch (e) {
    return 50;
  }
};

// Helper to compute ideal progress percentage
const getIdealCompletion = (g: Goal, todayDate: string): number => {
  const isWeightageAtDepth = (d: number): boolean => {
    if (g.weightageLevels && g.weightageLevels.includes(d)) {
      return true;
    }
    if (g.calculationMode === 'weightage' && d === 0) {
      return true;
    }
    return false;
  };

  if (isWeightageAtDepth(0) && g.children && g.children.length > 0) {
    let totalWeight = 0;
    let weightedSum = 0;
    g.children.forEach(c => {
      const weight = c.weight !== undefined ? c.weight : 1;
      totalWeight += weight;
      const chapterIdeal = (g.type === 'Academic' && g.classEnabled)
        ? getNodeClassCoverage(c)
        : getNodeIdealCompletion(c, g, todayDate, undefined, undefined, 0);
      weightedSum += chapterIdeal * weight;
    });
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  if (g.type === 'Academic' && g.classEnabled) {
    const leaves = g.children ? getLeafNodesOfTree(g.children) : [];
    const totalLeaves = leaves.length;
    if (totalLeaves === 0) return 0;
    const classCompleted = leaves.filter(l => l.classCompleted).length;
    return Math.round((classCompleted / totalLeaves) * 100);
  }

  try {
    const today = new Date(todayDate);
    const targetDateStr = g.idealDate || g.deadline;
    const target = new Date(targetDateStr);
    if (isNaN(today.getTime()) || isNaN(target.getTime())) return 50;
    if (today >= target) return 100;

    // Calculate based on custom startDate if available, else fallback to 120 days default duration
    let startMs: number;
    let totalTimeMs: number;

    if (g.startDate) {
      const customStart = new Date(g.startDate);
      if (!isNaN(customStart.getTime())) {
        startMs = customStart.getTime();
        totalTimeMs = target.getTime() - startMs;
        if (totalTimeMs <= 0) totalTimeMs = 1; // Prevent division by zero
      } else {
        const defaultDurationDays = 120;
        totalTimeMs = defaultDurationDays * 24 * 60 * 60 * 1000;
        startMs = target.getTime() - totalTimeMs;
      }
    } else {
      const defaultDurationDays = 120;
      totalTimeMs = defaultDurationDays * 24 * 60 * 60 * 1000;
      startMs = target.getTime() - totalTimeMs;
    }

    const todayMs = today.getTime();
    const elapsedMs = todayMs - startMs;
    let percentage = Math.round((elapsedMs / totalTimeMs) * 100);
    percentage = Math.min(100, Math.max(0, percentage));
    return percentage;
  } catch (e) {
    return 50;
  }
};

export const AnalyticsTab: React.FC = () => {
  const { goals, habits, todayDate, largeText } = useLakshya();

  const hasGoals = goals && goals.length > 0;
  const hasHabits = habits && habits.length > 0;

  return (
    <div className={`space-y-4 ${largeText ? 'text-base' : 'text-xs'} animate-fade-in`} id="analytics-tab-root">
      
      {/* Elegantly Polished Compact Layout Header Area */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-2" id="analytics-header">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase font-mono">
              Analytical Pacing Center
            </h1>
          </div>
          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
            Monitor real-time progress of scheduled goals mapped against automated calendar milestones.
          </p>
        </div>
      </div>

      {/* Primary Goal Pacing Box Requested */}
      <div 
        className="bg-white rounded-xl border border-slate-200 shadow-3xs p-4 space-y-4"
        id="goals-pacing-tracker-box"
      >
        {/* Header inside the Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-xs sm:text-sm font-black text-slate-850 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Goals Pacing & Completion Register
            </h2>
            <p className="text-[10px] text-slate-450 font-bold">
              Comparative analysis contrasting current completion against temporal targets.
            </p>
          </div>

          {/* Legend displaying markers */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[9px] font-mono font-black" id="pacing-legend">
            <span className="text-slate-400 uppercase">Legend:</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-indigo-600"></span>
              <span className="text-slate-600">Actual</span>
            </span>
            <span className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 border border-white shadow-3xs"></span>
              <span className="text-slate-650">Ideal Target</span>
            </span>
          </div>
        </div>

        {!hasGoals ? (
          <div className="flex flex-col items-center justify-center text-center py-8 space-y-2 text-slate-400">
            <Target className="w-6 h-6 text-slate-300" />
            <p className="font-extrabold text-slate-700 text-[10px] uppercase font-mono">No Active Goals Logged</p>
            <p className="text-[9px] text-slate-450 max-w-xs mx-auto font-semibold">
              Please register your study path, habits, or milestones in the **Goals** tab to populate progress indicators.
            </p>
          </div>
        ) : (
          <div className="space-y-3" id="goals-progress-list">
            {goals.map(g => {
              const actualPercent = Math.round(g.completion);
              const idealPercent = getIdealCompletion(g, todayDate);
              
              const isAheadOrOnTrack = actualPercent >= idealPercent;
              let statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-150';
              let statusText = 'On Track';
              if (!isAheadOrOnTrack) {
                statusBadge = 'bg-amber-50 text-amber-850 border-amber-150';
                statusText = 'Behind Pace';
              }

              return (
                <div 
                  key={g.id} 
                  className="p-3 rounded-lg border border-slate-150 bg-white hover:bg-slate-50/30 transition duration-150 space-y-2"
                  id={`goal-progress-card-${g.id}`}
                >
                  
                  {/* Top Header Row for Individual Goal details */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 tracking-tight font-sans">
                          {g.name}
                        </span>
                        <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[8px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">
                          {g.type}
                        </span>
                        <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider border ${statusBadge}`}>
                          {statusText}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[8.5px] text-slate-400 font-bold">
                        <Calendar className="w-2.5 h-2.5 text-slate-400" />
                        <span>Deadline: <strong className="text-slate-500 font-mono font-semibold">{g.deadline}</strong></span>
                        {g.idealDate && (
                          <>
                            <span className="text-slate-250">•</span>
                            <span>Milestone: <strong className="text-slate-500 font-mono font-semibold">{g.idealDate}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline Stats numbers */}
                    <div className="flex items-center gap-2.5 shrink-0 text-[9px] font-mono font-black pt-0.5 sm:pt-0">
                      <div className="text-right">
                        <div className="text-slate-400 uppercase text-[7px]">Actual</div>
                        <div className="text-indigo-650">{actualPercent}%</div>
                      </div>
                      <div className="border-l border-slate-200 h-4"></div>
                      <div>
                        <div className="text-slate-400 uppercase text-[7px]">Ideal</div>
                        <div className="text-emerald-600">{idealPercent}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Progressive track beside numerical display with dynamic absolute green mark */}
                  <div className="flex items-center gap-3">
                    
                    {/* Track */}
                    <div className="relative w-full h-2.5 bg-slate-100 border border-slate-200 shadow-inner rounded-full overflow-visible">
                      
                      {/* Actual Filled Percentage */}
                      <div 
                        className="bg-indigo-600 rounded-full h-full transition-all duration-300 relative overflow-hidden"
                        style={{ width: `${actualPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      </div>

                      {/* Green ideal pacing marker representing ideal target pacing coordinates */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 -ml-1 transition-all duration-300 z-20 group"
                        style={{ left: `${idealPercent}%` }}
                        title={`Ideal: ${idealPercent}%`}
                      >
                        {/* Vibrant green bullet */}
                        <div className="relative flex items-center justify-center">
                          <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-405/40 animate-ping"></span>
                          <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-3xs cursor-pointer hover:scale-110 transition"></span>
                          
                          <span className="hidden group-hover:block absolute bottom-5 bg-slate-900 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                            Ideal Target: {idealPercent}%
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Right-aligned direct completion number */}
                    <span className="text-[10px] font-mono font-black text-slate-800 tracking-tight shrink-0 w-8 text-right">
                      {actualPercent}%
                    </span>

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Habits Streak Box */}
      <div 
        className="bg-white rounded-xl border border-slate-200 shadow-3xs p-4 space-y-4"
        id="habits-streak-tracker-box"
      >
        {/* Header inside the Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-xs sm:text-sm font-black text-slate-850 flex items-center gap-1.5 uppercase tracking-wide">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              Habits Streak & Consistency Register
            </h2>
            <p className="text-[10px] text-slate-450 font-bold">
              Current daily streaks and completion consistency rates across all tracked behavioral modules.
            </p>
          </div>
        </div>

        {!hasHabits ? (
          <div className="flex flex-col items-center justify-center text-center py-8 space-y-2 text-slate-400">
            <Flame className="w-6 h-6 text-slate-350" />
            <p className="font-extrabold text-slate-705 text-[10px] uppercase font-mono">No Active Habits Tracked</p>
            <p className="text-[9px] text-slate-450 max-w-xs mx-auto font-semibold">
              Please register habit loops or behavioral targets in the **Habits** tab to begin streak tracking.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="habits-streak-grid">
            {habits.map(h => {
              const currentStreak = h.currentStreak || 0;
              const longestStreak = h.longestStreak || 0;
              const completionPercent = Math.round(h.completionPercent || 0);
              const isActiveStreak = currentStreak > 0;

              return (
                <div 
                  key={h.id}
                  className="p-3 rounded-lg border border-slate-150 bg-slate-50/20 hover:bg-slate-50/50 transition duration-150 flex items-center justify-between gap-4"
                  id={`habit-streak-card-${h.id}`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 tracking-tight font-sans truncate" title={h.name}>
                        {h.name}
                      </span>
                      <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[8px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">
                        {h.frequency}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[9px] text-slate-450 font-bold">
                      <span>Consistency: <strong className="text-slate-650">{completionPercent}%</strong></span>
                      <span className="text-slate-200">|</span>
                      <span>Best Streak: <strong className="text-slate-650">{longestStreak}d</strong></span>
                    </div>
                  </div>

                  {/* Flame Badge representing Current Streak */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono text-xs font-black shadow-5xs ${
                      isActiveStreak 
                        ? 'bg-amber-50 text-amber-850 border-amber-200/90' 
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      <Flame className={`w-3.5 h-3.5 ${
                        isActiveStreak ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-350'
                      }`} />
                      <span>{currentStreak}d</span>
                    </div>
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
