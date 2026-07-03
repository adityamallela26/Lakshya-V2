import React, { useState } from 'react';
import { useLakshya } from '../context/LakshyaContext';
import {
  Compass,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  BookOpen,
  Info,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Trophy,
  Sparkles,
  ArrowLeft,
  Clock,
  X,
  Folder,
  HardDrive,
  FileSpreadsheet,
  Upload,
  Download,
  Grid
} from 'lucide-react';
import { Goal, GoalChild, GoalType } from '../types';

// DATE VALIDATION HELPER
// A parent node's date must be later than or equal to its children's dates, and level 1 must be on or before goal deadline
const validateNodeDate = (
  nodeDate: string,
  parentDate?: string,
  children?: GoalChild[]
): string | null => {
  if (!nodeDate) return null;

  if (parentDate && nodeDate > parentDate) {
    return `Warning: Must be on or before parent level target (${parentDate})`;
  }

  if (children && children.length > 0) {
    const invalidChild = children.find(c => {
      return c.date && c.date > nodeDate;
    });
    if (invalidChild && invalidChild.date) {
      return `Warning: Must be on or after children level target (${invalidChild.name}: ${invalidChild.date})`;
    }
  }

  return null;
};

const getMinDateLimitForNode = (node: GoalChild, goalStartDate?: string): string => {
  if (node.children && node.children.length > 0) {
    let maxChildDate = '';
    node.children.forEach(c => {
      if (c.date) {
        if (!maxChildDate || c.date > maxChildDate) {
          maxChildDate = c.date;
        }
      }
    });
    if (maxChildDate) return maxChildDate;
  }
  return goalStartDate || '';
};

export const GoalsTab: React.FC = () => {
  const {
    goals,
    tasks,
    addGoal,
    updateGoal,
    deleteGoal,
    addChildGoal,
    bulkAddChildren,
    deleteChildGoal,
    toggleChildGoal,
    renameChildGoal,
    moveChildGoal,
    updateChildGoalFields,
    updateChildrenWeights,
    isStudent,
    largeText,
    highContrast,
    goalTypes,
    todayDate
  } = useLakshya();

  // Excel Bulk Entry Modal states
  const [skuImporterOpen, setSkuImporterOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [importRowsCount, setImportRowsCount] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Selected Active goal in Hierarchy view mode
  const [selectedGoalId, setSelectedGoalId] = useState<string>(() => {
    return goals[0]?.id || '';
  });



  // Track if a Goal workspace has been entered (Drilled-in detail view)
  const [enteredGoalId, setEnteredGoalId] = useState<string | null>(null);

  // Track the navigation path of drilled nodes: e.g. [{ id: 'subject1', name: 'Physics' }]
  const [navPath, setNavPath] = useState<{ id: string; name: string }[]>([]);

  const getNodeDepth = (rootChildren: GoalChild[], targetId: string, currentDepth = 0): number | null => {
    for (const node of rootChildren) {
      if (node.id === targetId) return currentDepth;
      if (node.children && node.children.length > 0) {
        const d = getNodeDepth(node.children, targetId, currentDepth + 1);
        if (d !== null) return d;
      }
    }
    return null;
  };

  const isWeightageEnabledForNode = (goal: Goal, targetId: string): boolean => {
    if (!goal.children) return false;
    const depth = getNodeDepth(goal.children, targetId, 0);
    if (depth === null) return false;

    if (goal.weightageLevels) {
      return goal.weightageLevels.includes(depth);
    }
    return goal.calculationMode === 'weightage' && depth === 0;
  };

  const getNodeParentAndSiblings = (goal: Goal, targetId: string): { parentName: string; siblings: GoalChild[] } | null => {
    if (!goal.children || goal.children.length === 0) return null;

    const search = (children: GoalChild[], parentName: string): { parentName: string; siblings: GoalChild[] } | null => {
      if (children.some(c => c.id === targetId)) {
        return { parentName, siblings: children };
      }
      for (const node of children) {
        if (node.children && node.children.length > 0) {
          const found = search(node.children, node.name);
          if (found) return found;
        }
      }
      return null;
    };

    return search(goal.children, goal.name);
  };

  const getNodeWeightInfo = (goal: Goal, targetId: string): { weight: number; percentage: number; parentName: string } | null => {
    const res = getNodeParentAndSiblings(goal, targetId);
    if (!res) return null;
    const { parentName, siblings } = res;
    
    const targetNode = siblings.find(s => s.id === targetId);
    if (!targetNode) return null;
    
    const totalWeight = siblings.reduce((acc, s) => acc + (s.weight !== undefined ? s.weight : 1), 0);
    const weight = targetNode.weight !== undefined ? targetNode.weight : 1;
    const percentage = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;
    
    return { weight, percentage, parentName };
  };

  // Local collapsible IDs/deleting controls
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  // Goal Tab filtering state: all | current | completed
  const [goalFilter, setGoalFilter] = useState<'all' | 'current' | 'completed'>('all');

  // Form setups
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<GoalType>('Competitive');
  const [deadline, setDeadline] = useState('2026-10-15');
  const [startDate, setStartDate] = useState(todayDate || '2026-06-07');
  const [idealDate, setIdealDate] = useState('2026-09-15');
  const [classTracking, setClassTracking] = useState('');
  
  // Custom Discretion Levels
  const [levelCount, setLevelCount] = useState(3);
  const [levelLabels, setLevelLabels] = useState<string[]>(['Subject', 'Chapter', 'Topic']);
  const [formClassEnabled, setFormClassEnabled] = useState(true);
  const [calculationMode, setCalculationMode] = useState<'equal' | 'weightage'>('equal');
  const [levelWeightages, setLevelWeightages] = useState<boolean[]>([false, false, false, false, false]);

  // Editing Goal setups
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<GoalType>('Competitive');
  const [editDeadline, setEditDeadline] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editIdealDate, setEditIdealDate] = useState('');
  const [editClassTracking, setEditClassTracking] = useState('');
  const [editLevelCount, setEditLevelCount] = useState(3);
  const [editLevelLabels, setEditLevelLabels] = useState<string[]>(['Subject', 'Chapter', 'Topic']);
  const [editClassEnabled, setEditClassEnabled] = useState(true);
  const [editCalculationMode, setEditCalculationMode] = useState<'equal' | 'weightage'>('equal');
  const [editLevelWeightages, setEditLevelWeightages] = useState<boolean[]>([false, false, false, false, false]);

  const handleLevelWeightageChange = (index: number, val: boolean) => {
    setLevelWeightages(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleEditLevelWeightageChange = (index: number, val: boolean) => {
    setEditLevelWeightages(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  // Inline next-level node add state
  const [inlineAddName, setInlineAddName] = useState('');

  // Custom modal dialog states to replace native window.prompt (which fails inside sandboxed iframes)
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    type: 'add' | 'rename';
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    type: 'add',
    title: '',
    defaultValue: '',
    onConfirm: () => {}
  });
  const [promptInputValue, setPromptInputValue] = useState('');

  // Edit child node custom dialog with pacing parameter override fields
  const [editNodeModal, setEditNodeModal] = useState<{
    isOpen: boolean;
    nodeId: string;
    nodeName: string;
    startDate: string;
    idealDate: string;
    date: string;
    weight?: number;
  } | null>(null);

  const [editNodeWeights, setEditNodeWeights] = useState<{ id: string; name: string; pct: number }[]>([]);

  const [weightageModal, setWeightageModal] = useState<{
    isOpen: boolean;
    siblings: { id: string; name: string; pct: number }[];
    parentName: string;
  } | null>(null);

  const getInitialPercentages = (siblings: GoalChild[]): { id: string; name: string; pct: number }[] => {
    if (siblings.length === 0) return [];
    const totalWeight = siblings.reduce((acc, s) => acc + (s.weight !== undefined ? s.weight : 1), 0);
    
    let pcts = siblings.map(s => {
      const weight = s.weight !== undefined ? s.weight : 1;
      const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : Math.round(100 / siblings.length);
      return { id: s.id, name: s.name, pct };
    });

    let sum = pcts.reduce((acc, p) => acc + p.pct, 0);
    if (sum !== 100 && pcts.length > 0) {
      const diff = 100 - sum;
      let maxIdx = 0;
      for (let i = 1; i < pcts.length; i++) {
        if (pcts[i].pct > pcts[maxIdx].pct) {
          maxIdx = i;
        }
      }
      pcts[maxIdx].pct = Math.max(0, pcts[maxIdx].pct + diff);
    }
    return pcts;
  };

  const handleEditChildNode = (goalId: string, node: GoalChild) => {
    setEditNodeModal({
      isOpen: true,
      nodeId: node.id,
      nodeName: node.name,
      startDate: node.startDate || activeGoal?.startDate || '',
      idealDate: node.idealDate || node.date || activeGoal?.idealDate || activeGoal?.deadline || '',
      date: node.date || activeGoal?.deadline || '',
      weight: node.weight !== undefined ? node.weight : 1
    });

    const res = getNodeParentAndSiblings(activeGoal, node.id);
    if (res) {
      setEditNodeWeights(getInitialPercentages(res.siblings));
    } else {
      setEditNodeWeights([]);
    }
  };

  const filteredGoals = goals.filter(g => {
    if (goalFilter === 'current') return g.completion < 100;
    if (goalFilter === 'completed') return g.completion === 100;
    return true;
  });

  const activeGoal = goals.find(g => g.id === (enteredGoalId || selectedGoalId)) || filteredGoals[0] || goals[0];

  const handleLevelCountChange = (count: number) => {
    setLevelCount(count);
    setLevelLabels(prev => {
      const next = [...prev];
      const defaultOptions = ['Subject', 'Chapter', 'Topic', 'Concept', 'Practice Task'];
      while (next.length < count) {
        next.push(defaultOptions[next.length] || `Level ${next.length + 1}`);
      }
      return next.slice(0, count);
    });
  };

  const handleLevelLabelChange = (index: number, val: string) => {
    setLevelLabels(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Create goal with customized levels and class toggle
    const isAcademic = type === 'Academic';
    const selectedWeightageLevels: number[] = [];
    levelWeightages.slice(0, levelCount).forEach((val, idx) => {
      if (val) {
        selectedWeightageLevels.push(idx);
      }
    });

    const finalCalcMode = selectedWeightageLevels.length > 0 ? 'weightage' : 'equal';

    addGoal(
      name,
      type,
      deadline,
      isAcademic ? (classTracking || 'Class Syllabus tracking index') : '',
      levelLabels.slice(0, levelCount),
      isStudent && isAcademic && formClassEnabled,
      startDate,
      idealDate,
      finalCalcMode,
      selectedWeightageLevels
    );

    setName('');
    setClassTracking('');
    setFormClassEnabled(true);
    setStartDate(todayDate || '2026-06-07');
    setIdealDate('2026-09-15');
    setCalculationMode('equal');
    setLevelWeightages([false, false, false, false, false]);
    setShowForm(false);
  };

  const startEditingGoal = (g: Goal) => {
    setEditingGoal(g);
    setEditName(g.name);
    setEditType(g.type);
    setEditDeadline(g.deadline);
    setEditStartDate(g.startDate || todayDate || '2026-06-07');
    setEditIdealDate(g.idealDate || g.deadline);
    setEditClassTracking(g.classTracking || '');
    setEditLevelCount(g.levelNames?.length || 3);
    setEditLevelLabels(g.levelNames || ['Subject', 'Chapter', 'Topic']);
    setEditClassEnabled(g.classEnabled ?? true);
    setEditCalculationMode(g.calculationMode || 'equal');

    const initialEditWeightages = Array.from({ length: 5 }).map((_, idx) => {
      if (g.weightageLevels) {
        return g.weightageLevels.includes(idx);
      }
      return g.calculationMode === 'weightage' && idx === 0;
    });
    setEditLevelWeightages(initialEditWeightages);
  };

  const handleEditLevelCountChange = (count: number) => {
    setEditLevelCount(count);
    setEditLevelLabels(prev => {
      const next = [...prev];
      const defaultOptions = ['Subject', 'Chapter', 'Topic', 'Concept', 'Practice Task'];
      while (next.length < count) {
        next.push(defaultOptions[next.length] || `Level ${next.length + 1}`);
      }
      return next.slice(0, count);
    });
  };

  const handleEditLevelLabelChange = (index: number, val: string) => {
    setEditLevelLabels(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleUpdateGoalFields = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !editName.trim()) return;

    const isAcademic = editType === 'Academic';
    const selectedWeightageLevels: number[] = [];
    editLevelWeightages.slice(0, editLevelCount).forEach((val, idx) => {
      if (val) {
        selectedWeightageLevels.push(idx);
      }
    });

    const finalCalcMode = selectedWeightageLevels.length > 0 ? 'weightage' : 'equal';

    updateGoal(editingGoal.id, {
      name: editName.trim(),
      type: editType,
      deadline: editDeadline,
      startDate: editStartDate,
      idealDate: editIdealDate,
      classTracking: isAcademic ? editClassTracking : '',
      levelNames: editLevelLabels.slice(0, editLevelCount),
      classEnabled: isAcademic ? editClassEnabled : false,
      calculationMode: finalCalcMode,
      weightageLevels: selectedWeightageLevels
    });

    setEditingGoal(null);
  };

  // Helper to find a node recursively in children tree
  const findNodeInTree = (nodes: GoalChild[], targetId: string): GoalChild | null => {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeInTree(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Setup navigation variables based on the current drill path
  let currentLevelNodes: GoalChild[] = [];
  let currentDepth = 0;
  let parentDate = activeGoal?.deadline;
  let parentIdealDate = activeGoal?.idealDate || activeGoal?.deadline;

  if (activeGoal) {
    if (navPath.length === 0) {
      currentLevelNodes = activeGoal.children || [];
      currentDepth = 0;
      parentDate = activeGoal.deadline;
      parentIdealDate = activeGoal.idealDate || activeGoal.deadline;
    } else {
      const currentParentNode = findNodeInTree(activeGoal.children, navPath[navPath.length - 1].id);
      currentLevelNodes = currentParentNode?.children || [];
      currentDepth = navPath.length;
      parentDate = currentParentNode?.date || activeGoal.deadline;
      parentIdealDate = currentParentNode?.idealDate || parentDate || activeGoal.idealDate || activeGoal.deadline;
    }
  }

  const handleAddInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineAddName.trim() || !activeGoal) return;
    const parentId = navPath.length === 0 ? null : navPath[navPath.length - 1].id;
    addChildGoal(activeGoal.id, parentId, inlineAddName.trim());
    setInlineAddName('');
  };

  const downloadTemplate = (tierCount: number) => {
    let headers = [];
    let sample = [];
    if (tierCount === 1) {
      headers = ["Topic Name"];
      sample = [
        ["Calculus Practice Set 1"],
        ["Organic Chemistry Lab 1"],
        ["Mock Test Analysis"]
      ];
    } else if (tierCount === 2) {
      headers = ["Subject Name", "Chapter Name"];
      sample = [
        ["Physics", "Electromagnetism"],
        ["Physics", "Rotational Mechanics"],
        ["Mathematics", "Differential Equations"]
      ];
    } else if (tierCount === 3) {
      headers = ["Subject Name", "Chapter Name", "Topic Name"];
      sample = [
        ["Physics", "Electromagnetism", "Gauss's Law"],
        ["Physics", "Electromagnetism", "Coulomb's Law"],
        ["Chemistry", "Organic Chemistry", "Alcohols and Phenols"],
        ["Mathematics", "Calculus", "Integration by Parts"]
      ];
    } else if (tierCount === 4) {
      headers = ["Subject Name", "Chapter Name", "Topic Name", "Subtopic Name"];
      sample = [
        ["Physics", "Electromagnetism", "Gauss's Law", "Flux Calculations"],
        ["Physics", "Electromagnetism", "Coulomb's Law", "Point Charges"],
        ["Chemistry", "Organic Chemistry", "Alcohols", "Phenol Synthesis"],
        ["Mathematics", "Calculus", "Integration", "Integration by Parts"]
      ];
    } else {
      headers = ["Subject Name", "Chapter Name", "Topic Name", "Subtopic Name", "Keypoint/Fact"];
      sample = [
        ["Physics", "Electromagnetism", "Gauss's Law", "Flux Calculations", "Spherical Symmetry Formula"],
        ["Physics", "Electromagnetism", "Coulomb's Law", "Point Charges", "Superposition Principle"],
        ["Chemistry", "Organic Chemistry", "Alcohols", "Phenol Synthesis", "Acidic Strength of Phenols"],
        ["Mathematics", "Calculus", "Integration", "Integration by Parts", "ILATE Rule Preference"]
      ];
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...sample.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lakshya_Study_Template_${tierCount}Node.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPasteData(text);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!pasteData.trim() || !activeGoal) return;
    const lines = pasteData.split(/\r?\n/);
    const parsedRows: string[][] = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;
      const separator = line.includes('\t') ? '\t' : ',';
      const r = line.split(separator).map(v => {
        let clean = v.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
          clean = clean.substring(1, clean.length - 1);
        }
        return clean;
      });

      if (r.some(col => col.length > 0)) {
        parsedRows.push(r);
      }
    });

    if (parsedRows.length === 0) {
      setImportError("No valid rows discovered in input.");
      return;
    }

    const firstRow = parsedRows[0];
    const isHeader = firstRow.some(col => 
      col.toLowerCase().includes('name') || 
      col.toLowerCase().includes('chapter') || 
      col.toLowerCase().includes('subject') || 
      col.toLowerCase().includes('topic')
    );
    const rowsToImport = isHeader ? parsedRows.slice(1) : parsedRows;

    bulkAddChildren(activeGoal.id, rowsToImport);
    setImportRowsCount(rowsToImport.length);
    setPasteData('');
    setImportError(null);
    
    setTimeout(() => {
      setSkuImporterOpen(false);
      setImportRowsCount(null);
    }, 1800);
  };

  const handleRenameChild = (goalId: string, childId: string, currentName: string) => {
    setPromptInputValue(currentName);
    setPromptModal({
      isOpen: true,
      type: 'rename',
      title: 'Rename Objective Item',
      description: 'Update the label of this objective node in your study curriculum tree.',
      placeholder: 'Enter new name...',
      defaultValue: currentName,
      onConfirm: (val) => {
        renameChildGoal(goalId, childId, val.trim());
      }
    });
  };



  // EVALUATION LOGIC FOR PARALLEL CLASS
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

  const getNodeCompletionPercent = (node: GoalChild): number => {
    if (!node.children || node.children.length === 0) {
      return node.completed ? 100 : 0;
    }
    const sum = node.children.reduce((acc, c) => acc + getNodeCompletionPercent(c), 0);
    return Math.round(sum / node.children.length);
  };

  const leafNodes = activeGoal?.children ? getLeafNodesOfTree(activeGoal.children) : [];
  const totalLeafCount = leafNodes.length;
  const studentCompletedCount = leafNodes.filter(l => l.completed).length;
  const classCompletedCount = leafNodes.filter(l => l.classCompleted).length;

  const studentPercentage = totalLeafCount ? Math.round((studentCompletedCount / totalLeafCount) * 100) : 0;
  const classPercentage = totalLeafCount ? Math.round((classCompletedCount / totalLeafCount) * 100) : 0;

  // Find topics covered by class but NOT by student (Syllabus Lag)
  const lagNodes = leafNodes.filter(l => l.classCompleted && !l.completed);

  // Active Level labels list safely formatted
  const activeLevelNames = activeGoal?.levelNames || ['Subject', 'Chapter', 'Topic'];

  // Accessibility flags mapping
  const textTitleClass = highContrast ? 'text-slate-950 font-extrabold' : 'text-slate-800 font-semibold';
  const textBodyClass = largeText ? 'text-base' : 'text-sm';

  // Helper to compute ideal progress percentage
  const getIdealCompletion = (g: Goal): number => {
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
          : getNodeIdealCompletion(c, g, undefined, undefined, 0);
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

  const getNodeClassCoverage = (node: GoalChild): number => {
    if (!node.children || node.children.length === 0) {
      return node.classCompleted ? 100 : 0;
    }
    const sum = node.children.reduce((acc, c) => acc + getNodeClassCoverage(c), 0);
    return Math.round(sum / node.children.length);
  };

  // Helper to compute node level ideal progress rollups
  const getNodeIdealCompletion = (node: GoalChild, goal: Goal, parentIdealDate?: string, parentDate?: string, depth: number = 0): number => {
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

    // If the node has custom pacing bounds, compute it directly.
    // If not and has children, rollup their pace with potential depth-based weights.
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
          weightedSum += getNodeIdealCompletion(c, goal, finalIdealStr, finalDateStr, depth + 1) * w;
        });
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
      } else {
        const sum = node.children.reduce((acc, c) => acc + getNodeIdealCompletion(c, goal, finalIdealStr, finalDateStr, depth + 1), 0);
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

  // Helper to identify if overall goal is On Track vs Behind Pace.
  // Pacing status implies: ALL subjects must be on track for overall goal to be on track.
  const getGoalStatus = (goal: Goal): 'On Track' | 'Behind Pace' => {
    if (goal.completion === 100) return 'On Track';
    if (!goal.children || goal.children.length === 0) {
      const idealPercent = getIdealCompletion(goal);
      return goal.completion >= idealPercent ? 'On Track' : 'Behind Pace';
    }
    
    // Check if each and every child of the first layer (subjects) is on track
    const allChildrenOnTrack = goal.children.every(subj => {
      const act = getNodeCompletionPercent(subj);
      const idl = getNodeIdealCompletion(subj, goal, goal.idealDate, goal.deadline);
      return act >= idl;
    });
    
    return allChildrenOnTrack ? 'On Track' : 'Behind Pace';
  };

  return (
    <div className="space-y-8 animate-fade-in" id="goals-tab-root">
      
      {/* Conditionally render dashboard vs drilled-in detailed view */}
      {enteredGoalId === null ? (
        <>
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">High-Stakes Goal Hub</h1>
              <p className="text-sm text-slate-500">Track and manage your major goals and enter them to configure target nodes</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-2.5 px-4 rounded-lg text-sm cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition-all self-start md:self-auto"
            >
              <Plus className="w-4 h-4" /> Add Goal
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateGoal} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 animate-fade-in text-slate-700">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-150 pb-2 flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                <span>Launch High-Fidelity Mission Target</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className={type === 'Academic' ? "md:col-span-3" : "md:col-span-5"}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Goal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., UPSC Syllabus Prep / Science Finals"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                  />
                </div>

                <div className={type === 'Academic' ? "md:col-span-2" : "md:col-span-3"}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Classification Type</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                  >
                    {goalTypes.map(gt => (
                      <option key={gt} value={gt}>{gt}</option>
                    ))}
                    {!goalTypes.includes(type) && (
                      <option value={type}>{type}</option>
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Target Gate / Deadline</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-emerald-750 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span>Ideal Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={idealDate}
                    onChange={(e) => setIdealDate(e.target.value)}
                    className="w-full border border-emerald-300 focus:border-emerald-500 rounded-lg px-3 py-1.8 text-sm text-emerald-800 outline-none bg-emerald-50/20"
                    title="An earlier target date to motivate ideal completion progress"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Progress & Pace Calculation Basis
                  </label>
                  <select
                    value={calculationMode}
                    onChange={(e: any) => setCalculationMode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                  >
                    <option value="equal">Equal Splitting basis</option>
                    <option value="weightage">Chapter Weightage basis</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    Choose whether progress and recommended pace are calculated evenly, or based on custom weights entered for each chapter.
                  </p>
                </div>

                {type === 'Academic' && (
                  <div className="md:col-span-12">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Classroom / School Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Physics Section III, College Core"
                      value={classTracking}
                      onChange={(e) => setClassTracking(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Student Discretion for Levels & Names */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Syllabus Breakdown Level Configuration</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Define how many nested levels of detail you want to map, and give custom labels to each level.</p>
                  </div>

                  {/* level count adjuster button */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Levels:</span>
                    <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden p-0.5">
                      <button
                        type="button"
                        disabled={levelCount <= 1}
                        onClick={() => handleLevelCountChange(levelCount - 1)}
                        className="px-2 py-1 text-xs font-black disabled:opacity-30 text-slate-600 hover:bg-slate-100 rounded"
                      >
                        -
                      </button>
                      <span className="px-3 font-mono font-bold text-xs text-indigo-700">{levelCount}</span>
                      <button
                        type="button"
                        disabled={levelCount >= 5}
                        onClick={() => handleLevelCountChange(levelCount + 1)}
                        className="px-2 py-1 text-xs font-black disabled:opacity-30 text-slate-600 hover:bg-slate-100 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Level Label Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Array.from({ length: levelCount }).map((_, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Hierarchy Level {idx + 1}</span>
                      <input
                        type="text"
                        required
                        placeholder={`e.g. ${idx === 0 ? 'Subject' : idx === 1 ? 'Chapter' : 'Topic'}`}
                        value={levelLabels[idx] || ''}
                        onChange={(e) => handleLevelLabelChange(idx, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-600 font-medium"
                      />
                      <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 mt-1">
                        <span className="text-[9px] font-extrabold text-slate-500 uppercase">Calc Mode:</span>
                        <select
                          value={levelWeightages[idx] ? 'weightage' : 'equal'}
                          onChange={(e) => handleLevelWeightageChange(idx, e.target.value === 'weightage')}
                          className="text-[9.5px] font-bold text-indigo-750 bg-indigo-50 border border-indigo-200/50 rounded px-1 cursor-pointer outline-none"
                        >
                          <option value="equal">⚖️ Equal</option>
                          <option value="weightage">⚖️ Weight</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parallel Class Toggle */}
              {isStudent && type === 'Academic' && (
                <div className="p-4 bg-emerald-50/15 border border-dashed border-emerald-200 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-4.5 h-4.5 text-emerald-600" />
                      <span>🎓 PARALLEL CLASSROOM SYLLABUS ALIGNER</span>
                    </span>
                    <p className="text-xs text-slate-500">Track class/school covering dates alongside your review targets. Compares school metrics dynamically!</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formClassEnabled}
                      onChange={(e) => setFormClassEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-1.8 border border-slate-250 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-sm font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.8 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors"
                >
                  Initialize Goal Track
                </button>
              </div>
            </form>
          )}

          {/* Filters for Goal Hub */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5" id="goal-filters-container">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
              <button
                type="button"
                onClick={() => setGoalFilter('all')}
                className={`px-3.5 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  goalFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Goals ({goals.length})
              </button>
              <button
                type="button"
                onClick={() => setGoalFilter('current')}
                className={`px-3.5 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  goalFilter === 'current'
                    ? 'bg-indigo-600 text-white shadow-3xs'
                    : 'text-slate-500 hover:text-indigo-605'
                }`}
              >
                Current Goals ({goals.filter(g => g.completion < 100).length})
              </button>
              <button
                type="button"
                onClick={() => setGoalFilter('completed')}
                className={`px-3.5 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  goalFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-3xs'
                    : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                Completed Goals ({goals.filter(g => g.completion === 100).length})
              </button>
            </div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Interactive Goal Filter
            </div>
          </div>

          {/* Goal Cards Grid List */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="goal-cards-section">
            {goals.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-500 hover:border-slate-300 transition-colors">
                <h3 className="font-bold text-base mb-1">Empty State: No Goals Registered</h3>
                <p className="text-sm text-slate-400 mb-4 font-normal">Create your first goal to begin tracking progress recursively.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm cursor-pointer"
                >
                  Create first goal to begin
                </button>
              </div>
            ) : filteredGoals.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-500 hover:border-slate-300 transition-colors">
                <h3 className="font-bold text-base mb-1">No matches found</h3>
                <p className="text-sm text-slate-400 mb-4 font-normal">There are no goals matching the "{goalFilter}" filter criteria.</p>
                <button
                  onClick={() => setGoalFilter('all')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs cursor-pointer border"
                >
                  Clear Goal Filter
                </button>
              </div>
            ) : (
              filteredGoals.map(g => {
                const isSelected = selectedGoalId === g.id;
                const projectTasks = tasks.filter(t => t.goalId === g.id);
                const finishedTasksCount = projectTasks.filter(t => t.status === 'Completed').length;

                return (
                  <div
                    key={g.id}
                    onClick={() => {
                      setSelectedGoalId(g.id);
                      setEnteredGoalId(g.id);
                      setNavPath([]);
                    }}
                    className={`p-5 rounded-xl border cursor-pointer hover:scale-[1.01] hover:shadow-xs transition-all flex flex-col justify-between gap-4 border-slate-200 bg-white`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] bg-indigo-50 text-indigo-605 font-semibold px-2 py-0.5 rounded uppercase">
                          {g.type}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {g.classEnabled && isStudent && (
                            <span className="text-[9.5px] bg-emerald-100 text-emerald-850 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Parallel class alignment active">
                              <GraduationCap className="w-3 h-3 text-emerald-600" />
                              <span>Class Align</span>
                            </span>
                          )}
                          {(() => {
                            const dynamicStatus = getGoalStatus(g);
                            return (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border select-none ${
                                dynamicStatus === 'On Track'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-red-50 text-red-850 border-red-200 animate-pulse-subtle'
                              }`}>
                                {dynamicStatus}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      <h3 className={`${textTitleClass} text-base mb-1 text-slate-800 hover:text-indigo-650 transition-colors`}>
                        {g.name}
                      </h3>
                      
                      <div className="text-xs text-slate-400 mt-1 mb-2">
                        Click to configure subparts ({g.children?.length || 0} {g.levelNames?.[0] || 'Items'})
                      </div>

                      {/* Class Tracking status text */}
                      {g.classTracking && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-150 flex items-start gap-1 mb-2">
                          <Info className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-700">Class:</span> {g.classTracking}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress elements */}
                    <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                      <div className="flex justify-between font-mono font-bold text-slate-700 text-[11px]">
                        <span className="uppercase text-indigo-650 font-black flex items-center gap-1">👦 My Progress</span>
                        <span className="text-indigo-600 font-extrabold">{g.completion}%</span>
                      </div>

                      <div className="w-full bg-slate-200 h-2 rounded-full relative">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${g.completion}%` }}
                        />
                        {/* Green marker at the exact ideal percentage point (Class or Date ticking) */}
                        <div 
                          className="absolute -top-1 w-[4.5px] h-4 bg-emerald-500 rounded-full cursor-help hover:scale-125 transition-all z-10 shadow-3xs"
                          style={{ left: `calc(${getIdealCompletion(g)}% - 2.25px)` }}
                          title={`Ideal completion pace: ${getIdealCompletion(g)}%`}
                        />
                      </div>

                      {/* Ideal Completion Bar */}
                      {(() => {
                        const idealPercent = getIdealCompletion(g);
                        const isClassComp = g.type === 'Academic' && g.classEnabled && isStudent;
                        return (
                          <div className="space-y-1 pt-1.5 border-t border-slate-50">
                            <div className="flex justify-between font-mono font-bold text-[11px]">
                              <span className="uppercase text-emerald-650 flex items-center gap-1 font-extrabold">
                                {isClassComp ? (
                                  <>
                                    <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>🏫 Ideal (Class Pace)</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>📆 Ideal (Timeline)</span>
                                  </>
                                )}
                              </span>
                              <span className="text-emerald-600 font-extrabold">{idealPercent}%</span>
                            </div>

                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${idealPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex flex-col gap-1.5 border-t border-slate-50 pt-2 text-[11px] text-slate-500 font-medium">
                        <div className="flex justify-between items-center text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Started:</span>
                            <span className="font-semibold text-slate-600">{g.startDate || 'N/A'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Target:</span>
                            <span className="font-semibold text-slate-600">{g.deadline}</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-0.5 text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Timeline Track</span>
                          </div>
                          <span className={`font-mono font-bold ${g.daysRemaining <= 15 ? 'text-red-655' : 'text-slate-600'}`}>
                            {g.daysRemaining} days left
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs mt-1">
                      <span className="text-slate-500 font-medium">
                        Linked Tasks: <span className="font-bold text-slate-700">{finishedTasksCount}/{projectTasks.length}</span>
                      </span>
                      
                      {deletingGoalId === g.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded border border-red-200" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-red-800 font-bold">Delete?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGoal(g.id);
                              setDeletingGoalId(null);
                            }}
                            className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] hover:bg-red-700"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingGoalId(null);
                            }}
                            className="bg-white border text-slate-600 px-1.5 py-0.5 rounded text-[10px]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingGoal(g);
                            }}
                            className="text-slate-400 hover:text-indigo-650 p-1 rounded transition-colors"
                            title="Edit Goal"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingGoalId(g.id);
                            }}
                            className="text-slate-400 hover:text-red-650 p-1 rounded transition-colors"
                            title="Delete Goal Track"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </>
      ) : (
        /* Workspace Detail View with Drill Down Navigation */
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Breadcrumb Workspace Header */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEnteredGoalId(null);
                  setNavPath([]);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-lg cursor-pointer transition-colors"
                title="Back to Goals Overview"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-650 capitalize">
                  <span>Goal Workspace</span>
                  <span className="text-slate-300">•</span>
                  <span className="bg-indigo-50 text-indigo-650 px-2 py-0.25 rounded text-[10px] font-black">{activeGoal?.type}</span>
                </div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight mt-0.5">{activeGoal?.name}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => startEditingGoal(activeGoal)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-750 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-indigo-100 cursor-pointer"
                title="Edit Goal"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Goal Attributes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPasteData('');
                  setImportError(null);
                  setImportRowsCount(null);
                  setSkuImporterOpen(true);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-850 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-emerald-150 cursor-pointer shadow-4xs"
                title="Excel / Spreadsheet Bulk Entry"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel Bulk Entry</span>
              </button>
              
              <button
                onClick={() => {
                  setEnteredGoalId(null);
                  setNavPath([]);
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
                title="Close Workspace"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Windows-style Folder Directory Pathway & Status Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-4xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Windows Folder Address Bar */}
              <div className="flex-1 flex items-center gap-1 bg-slate-50 border border-slate-201 p-2 rounded-lg text-xs font-mono select-none overflow-x-auto shadow-4xs">
                <Folder className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />
                
                <button
                  onClick={() => setNavPath([])}
                  className={`hover:bg-slate-200/60 px-1.5 py-0.5 rounded shrink-0 transition ${
                    navPath.length === 0 ? 'text-indigo-650 font-black bg-indigo-50 border border-indigo-100' : 'text-slate-550 font-bold'
                  }`}
                >
                  {activeGoal?.name}
                </button>

                {navPath.map((node, idx) => {
                  const isLast = idx === navPath.length - 1;
                  return (
                    <React.Fragment key={node.id}>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                      <button
                        disabled={isLast}
                        onClick={() => setNavPath(prev => prev.slice(0, idx + 1))}
                        className={`hover:bg-slate-200/60 px-1.5 py-0.5 rounded shrink-0 transition-all ${
                          isLast ? 'text-indigo-650 font-black bg-indigo-50 border border-indigo-100 cursor-default' : 'text-slate-550 font-bold'
                        }`}
                      >
                        {node.name}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Integrated Status Progress Bar */}
              <div className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg flex items-center gap-3 shrink-0 self-start md:self-auto">
                <div className="text-right">
                  <span className="block text-[8.5px] uppercase font-bold text-slate-400 font-mono tracking-wider leading-none">Goal Progress</span>
                  <span className="text-xs font-extrabold text-slate-700 font-mono">{activeGoal?.completion}%</span>
                </div>
                <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden relative shadow-4xs">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${activeGoal?.completion}%` }} />
                </div>
              </div>
            </div>

            {/* Goal details, dates, and simple pace status (directly below pathway) */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-md text-slate-600 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Started: <strong className="text-slate-700 font-mono">{activeGoal?.startDate || 'N/A'}</strong></span>
              </span>

              <span className="flex items-center gap-1 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-md text-slate-600 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Target: <strong className="text-slate-700 font-mono">{activeGoal?.deadline}</strong></span>
              </span>

              {activeGoal?.idealDate && (
                <span className="flex items-center gap-1 bg-emerald-50/50 border border-emerald-250 px-2.5 py-1 rounded-md text-emerald-800 text-xs font-semibold animate-fade-in" title="The user-configured ideal pacing target date">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Ideal: <strong className="text-emerald-750 font-mono">{activeGoal.idealDate}</strong></span>
                </span>
              )}

              <span className={`px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${
                activeGoal && activeGoal?.daysRemaining <= 15
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-slate-50 border-slate-150 text-slate-600'
              }`}>
                ⏳ {activeGoal?.daysRemaining} days remaining
              </span>

              {(() => {
                if (!activeGoal) return null;
                const idealPercent = getIdealCompletion(activeGoal);
                const isOnTrack = activeGoal.completion >= idealPercent;
                return (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${
                    isOnTrack
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 animate-fade-in'
                      : 'bg-red-50 border-red-200 text-red-800 animate-fade-in'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isOnTrack ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span>Pacing Status: {isOnTrack ? 'On Track' : 'Behind Pace'}</span>
                    <span className="text-[10px] font-mono opacity-75">({activeGoal.completion}% vs Recommended {idealPercent}%)</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Main workspace listing content - Single column, full-width */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-150 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-605 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                  Tier Level Name: {activeLevelNames[currentDepth] || `Level ${currentDepth + 1}`}
                </span>
                <h2 className="text-base font-bold text-slate-800 mt-1">
                  {navPath.length === 0 ? `Primary ${activeLevelNames[0] || 'Subjects'}` : `List of ${activeLevelNames[currentDepth] || 'subparts'}`}
                </h2>
              </div>

              <div className="flex items-center gap-3 ml-auto sm:ml-0">
                {(() => {
                  const isWeightageEnabledAtCurrentDepth = activeGoal && (
                    activeGoal.weightageLevels 
                      ? activeGoal.weightageLevels.includes(currentDepth)
                      : (activeGoal.calculationMode === 'weightage' && currentDepth === 0)
                  );
                  if (isWeightageEnabledAtCurrentDepth && currentLevelNodes.length > 0) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const pcts = getInitialPercentages(currentLevelNodes);
                          setWeightageModal({
                            isOpen: true,
                            siblings: pcts,
                            parentName: navPath.length > 0 ? navPath[navPath.length - 1].name : activeGoal.name
                          });
                        }}
                        className="bg-amber-100 hover:bg-amber-150 text-amber-900 font-extrabold px-3 py-1.8 rounded-lg text-xs cursor-pointer border border-amber-250/50 transition flex items-center gap-1.5 shadow-4xs shrink-0"
                        title="Adjust weightages of all elements at this level"
                      >
                        <span>⚖️ Adjust Weightages</span>
                      </button>
                    );
                  }
                  return null;
                })()}

                <button
                  type="button"
                  onClick={() => {
                    const nodeLabel = activeLevelNames[currentDepth] || 'Objective Node';
                    setPromptInputValue('');
                    setPromptModal({
                      isOpen: true,
                      type: 'add',
                      title: `Add New ${nodeLabel}`,
                      description: `Enter a name for the new ${nodeLabel.toLowerCase()} within the selected hierarchy tier.`,
                      placeholder: `e.g. ${nodeLabel}`,
                      defaultValue: '',
                      onConfirm: (val) => {
                        const parentId = navPath.length > 0 ? navPath[navPath.length - 1].id : null;
                        addChildGoal(activeGoal.id, parentId, val.trim());
                      }
                    });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-1.8 rounded-lg text-xs cursor-pointer transition flex items-center gap-1.5 shadow-4xs shrink-0"
                  title={`Add a new ${activeLevelNames[currentDepth] || 'Node'}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {activeLevelNames[currentDepth] || 'Item'}</span>
                </button>
                
                <span className="text-xs text-slate-450 font-bold font-mono">
                  {currentLevelNodes.length} Elements Registered
                </span>
              </div>
            </div>

            {/* Empty view state check */}
            {currentLevelNodes.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-500">
                <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No folders or objective nodes defined yet.</p>
                <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">Use the quick add entry form below to build your study hierarchy nodes immediately.</p>
              </div>
            ) : (() => {
              const isLeafNode = currentDepth === activeLevelNames.length - 1;

              // 🌟 Intermediate level Nodes: RENDER AS BOX CARDS (similar to goal cards)
              if (!isLeafNode) {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentLevelNodes.map(item => {
                      const itemMinDate = getMinDateLimitForNode(item, activeGoal?.startDate);
                      const itemMaxDate = parentDate || activeGoal?.deadline || '';
                      const completionPercent = getNodeCompletionPercent(item);
                      const nodeIdealPercent = getNodeIdealCompletion(item, activeGoal, parentIdealDate, parentDate, currentDepth);
                      const isNodeOnTrack = completionPercent >= nodeIdealPercent;

                      const itemLeaves = item.children ? getLeafNodesOfTree(item.children) : [];
                      const totalItemLeaves = itemLeaves.length;
                      const itemClassCompletedCount = itemLeaves.filter(l => l.classCompleted).length;
                      const isAllClassCompleted = totalItemLeaves > 0 && itemClassCompletedCount === totalItemLeaves;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setNavPath(prev => [...prev, { id: item.id, name: item.name }]);
                          }}
                          className={`group p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between gap-4 relative hover:scale-[1.015] hover:shadow-sm ${
                            item.completed
                              ? 'bg-emerald-50/10 border-emerald-250 hover:border-emerald-400 shadow-4xs'
                              : 'bg-white border-slate-201 hover:border-indigo-300 hover:bg-slate-50/10 shadow-4xs'
                          }`}
                        >
                          <div>
                            {/* Card badge / Completion percent */}
                            <div className="flex justify-between items-start mb-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`p-1.5 rounded-lg transition-colors ${
                                  item.completed 
                                    ? 'bg-emerald-50 text-emerald-705' 
                                    : 'bg-indigo-50 text-indigo-650 group-hover:bg-indigo-100'
                                }`}>
                                  <Folder className="w-4 h-4" />
                                </span>
                                <span className="text-[10px] font-bold text-slate-405 uppercase tracking-wide font-mono">
                                  {activeLevelNames[currentDepth]}
                                </span>
                              </div>

                              <div className="text-[10.5px] font-mono font-black text-emerald-750 bg-emerald-50 border border-emerald-200/50 rounded-full px-2.5 py-0.5 select-none shadow-4xs">
                                {completionPercent}% Done
                              </div>
                            </div>

                            {/* Card Name */}
                            <h4 className="text-sm font-extrabold text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-900 transition-colors flex items-center flex-wrap gap-1.5">
                              <span>{item.name}</span>
                              {activeGoal && isWeightageEnabledForNode(activeGoal, item.id) && (() => {
                                const info = getNodeWeightInfo(activeGoal, item.id);
                                if (!info) return null;
                                return (
                                  <span className="text-[10px] font-mono font-black text-amber-700 bg-amber-50 border border-amber-200/50 rounded-md px-1.5 py-0.5" title={`Contributes ${info.percentage}% to ${info.parentName} progress`}>
                                    ⚖️ Weight: {info.percentage}% ({info.weight})
                                  </span>
                                );
                              })()}
                            </h4>

                            {/* Progress bar inside the box card */}
                            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-3.5 relative overflow-visible shadow-4xs">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${completionPercent}%` }}
                              />
                              {/* Green marker at the exact ideal percentage point */}
                              <div 
                                className="absolute -top-[1.5px] w-[3.5px] h-3.5 bg-emerald-500 rounded-full cursor-help hover:scale-125 transition-all z-10 shadow-4xs animate-fade-in"
                                style={{ left: `calc(${nodeIdealPercent}% - 1.75px)` }}
                                title={`Ideal completion pace: ${nodeIdealPercent}%`}
                              />
                            </div>

                            {/* Ideal Comparison Row */}
                            <div className="flex justify-between items-center mt-2.5 text-[10px] font-mono font-bold">
                              <span className={isNodeOnTrack ? "text-emerald-600 flex items-center gap-0.5" : "text-amber-600 flex items-center gap-0.5 animate-pulse"}>
                                {isNodeOnTrack ? "● On Pace" : "▲ Behind Pace"}
                              </span>
                              <span className="text-slate-455">
                                Rec Pace: <strong className="text-slate-705 font-extrabold">{nodeIdealPercent}%</strong>
                              </span>
                            </div>

                            {/* Static Info Badges for Custom Date/Pacing metrics */}
                            <div className="mt-3.5 flex flex-wrap gap-1.5 text-[10px]">
                              {item.startDate && (
                                <span className="text-[9px] font-semibold text-slate-500 bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5">
                                  🏁 Onset: {item.startDate}
                                </span>
                              )}
                              {item.idealDate && (
                                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50/50 border border-emerald-150/55 rounded px-1.5 py-0.5" title="Ideal pacing target benchmark">
                                  ⚡ Pace: {item.idealDate}
                                </span>
                              )}
                              {item.date && (
                                <span className="text-[9px] font-semibold text-slate-500 bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5">
                                  📅 Target: {item.date}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Controls Footer */}
                          <div
                            className="border-t border-slate-100 pt-3 flex flex-col gap-2.5 mt-1 text-[11px]"
                            onClick={e => e.stopPropagation()}
                          >
                            {activeGoal.classEnabled && isStudent && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateChildGoalFields(activeGoal.id, item.id, { classCompleted: !isAllClassCompleted });
                                }}
                                className={`flex items-center justify-between px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isAllClassCompleted
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-3xs hover:bg-emerald-600'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                                title={isAllClassCompleted ? "All classes in this chapter covered" : "Mark all classes in this chapter covered"}
                              >
                                <span className="flex items-center gap-1.5">
                                  <GraduationCap className="w-4 h-4" />
                                  <span>Class Coverage</span>
                                </span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                  isAllClassCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-150 text-slate-600'
                                }`}>
                                  {itemClassCompletedCount}/{totalItemLeaves} Covered
                                </span>
                              </button>
                            )}

                            {/* Folder actions */}
                            <div className="flex items-center justify-between w-full pt-1.5 border-t border-slate-100">
                              <span className="text-[9.5px] font-mono text-slate-400 font-bold uppercase">Actions</span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditChildNode(activeGoal.id, item)}
                                  className="p-1 text-slate-400 hover:text-indigo-655 hover:bg-slate-100 rounded transition"
                                  title="Configure pacing parameters"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                              <button
                                type="button"
                                onClick={() => moveChildGoal(activeGoal.id, item.id, 'up')}
                                className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => moveChildGoal(activeGoal.id, item.id, 'down')}
                                className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteChildGoal(activeGoal.id, item.id)}
                                className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded"
                                title="Delete folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                );
              }

              // 🌟 Leaf Level Nodes: RENDER AS LIST OF ACTIONABLE TASKS Checklists
              return (
                <div className="space-y-2.5">
                  {currentLevelNodes.map(item => {
                    const itemMinDate = getMinDateLimitForNode(item, activeGoal?.startDate);
                    const itemMaxDate = parentDate || activeGoal?.deadline || '';

                    let itemIdealDate = item.idealDate;
                    if (parentIdealDate) {
                      if (!itemIdealDate || itemIdealDate === activeGoal?.deadline || itemIdealDate === activeGoal?.idealDate) {
                        itemIdealDate = parentIdealDate;
                      }
                    }
                    const isPastIdeal = itemIdealDate && !item.completed && itemIdealDate < todayDate;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          item.completed
                            ? 'bg-emerald-50/15 border-emerald-200'
                            : isPastIdeal
                            ? 'bg-amber-50/5 border-amber-300 shadow-4xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-4xs'
                        }`}
                      >
                        {/* Done status indicator checkbox & node label */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleChildGoal(activeGoal.id, item.id)}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0"
                            title="Mark Completed"
                          >
                            {item.completed ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-y-1">
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase mr-2 tracking-wider select-none shrink-0 border border-indigo-200/50">
                              {activeLevelNames[currentDepth]}
                            </span>
                            <span className={`text-sm font-bold break-words mr-2.5 ${item.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-800'}`}>
                              {item.name}
                            </span>
                            {activeGoal && isWeightageEnabledForNode(activeGoal, item.id) && (() => {
                              const info = getNodeWeightInfo(activeGoal, item.id);
                              if (!info) return null;
                              return (
                                <span className="text-[10px] font-mono font-black text-amber-700 bg-amber-50 border border-amber-200/50 rounded-md px-1.5 py-0.5 mr-2 shrink-0" title={`Contributes ${info.percentage}% to ${info.parentName} progress`}>
                                  ⚖️ Weight: {info.percentage}% ({info.weight})
                                </span>
                              );
                            })()}
                            {isPastIdeal && (
                              <span className="text-[9.5px] font-mono font-black text-amber-700 bg-amber-100/70 border border-amber-300 rounded-md px-2 py-0.5 flex items-center gap-1 animate-pulse" title="Behind Ideal Timeline">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Ideal Past ({itemIdealDate || item.idealDate})</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Date & Controls */}
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pl-8 sm:pl-0">
                          {/* Static dates displays for feedback */}
                          <div className="flex flex-wrap gap-1.5 text-[9.5px] font-mono font-bold">
                            {item.startDate && (
                              <span className="text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                                🏁 Onset: {item.startDate}
                              </span>
                            )}
                            {item.idealDate && (
                              <span className="text-emerald-700 bg-emerald-50/50 border border-emerald-200/55 rounded px-1.5 py-0.5">
                                ⚡ Pace: {item.idealDate}
                              </span>
                            )}
                            {item.date && (
                              <span className="text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                                📅 Target: {item.date}
                              </span>
                            )}
                          </div>

                          {/* Parallel classroom coverage (Student profiles inside leaf nodes) */}
                          {activeGoal.classEnabled && isStudent && (
                            <button
                              type="button"
                              onClick={() => updateChildGoalFields(activeGoal.id, item.id, { classCompleted: !item.classCompleted })}
                              className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                item.classCompleted
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-3xs'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>{item.classCompleted ? 'Class Covered' : 'Class Untracked'}</span>
                            </button>
                          )}

                          {/* Node Actions Menu */}
                          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                            <button
                              type="button"
                              onClick={() => handleEditChildNode(activeGoal.id, item)}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                              title="Configure pacing parameters"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => moveChildGoal(activeGoal.id, item.id, 'up')}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => moveChildGoal(activeGoal.id, item.id, 'down')}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteChildGoal(activeGoal.id, item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Inline Quick Add Form inside the workspace container */}
            {activeGoal && (
              <form onSubmit={handleAddInline} className="flex gap-2 pt-4 border-t border-slate-200/80 mt-4">
                <input
                  type="text"
                  value={inlineAddName}
                  onChange={(e) => setInlineAddName(e.target.value)}
                  placeholder={`➕ Fast Add ${activeLevelNames[currentDepth] || 'Objective Item'}...`}
                  className="flex-1 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-medium placeholder-slate-400 transition"
                />
                <button
                  type="submit"
                  disabled={!inlineAddName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold px-4.5 py-2 rounded-xl text-xs cursor-pointer hover:shadow-3xs transition-all flex items-center gap-1 shadow-4xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add {activeLevelNames[currentDepth] || 'Item'}</span>
                </button>
              </form>
            )}



            {/* Compact Classroom Lag indicator at page bottom if gaps are present */}
            {activeGoal?.classEnabled && isStudent && totalLeafCount > 0 && lagNodes.length > 0 && (
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2.5 animate-fade-in">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900 uppercase font-mono">
                    Classroom Timetable Synchronization Gaps ({lagNodes.length})
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-600 leading-normal">
                  The classroom syllabus has advanced. These topics have been taught in lectures but are not checked off on your timeline. Fast-track completion to align:
                </p>

                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {lagNodes.map(node => (
                    <div
                      key={node.id}
                      className="bg-white border border-amber-200 rounded-lg p-2 flex items-center justify-between text-xs gap-3 shadow-4xs"
                    >
                      <span className="text-slate-700 font-bold truncate max-w-[200px]" title={node.name}>
                        {node.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleChildGoal(activeGoal.id, node.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] px-2 py-0.5 rounded-md cursor-pointer transition font-bold"
                      >
                        Done
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editingGoal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto relative animate-fade-in text-slate-705">
            <button
              onClick={() => setEditingGoal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-150 pb-2 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-600 animate-pulse" />
              <span>Configure Target Goal Attributes</span>
            </h2>

            <form onSubmit={handleUpdateGoalFields} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className={editType === 'Academic' ? "md:col-span-3" : "md:col-span-5"}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Goal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., UPSC Syllabus Prep / Science Finals"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white font-medium animate-fade-in"
                  />
                </div>

                <div className={editType === 'Academic' ? "md:col-span-2" : "md:col-span-3"}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Classification Type</label>
                  <select
                    value={editType}
                    onChange={(e: any) => setEditType(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white font-medium"
                  >
                    {goalTypes.map(gt => (
                      <option key={gt} value={gt}>{gt}</option>
                    ))}
                    {!goalTypes.includes(editType) && (
                      <option value={editType}>{editType}</option>
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Target Gate / Deadline</label>
                  <input
                    type="date"
                    required
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white font-medium animate-fade-in"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-emerald-750 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span>Ideal Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editIdealDate}
                    onChange={(e) => setEditIdealDate(e.target.value)}
                    className="w-full border border-emerald-300 focus:border-emerald-500 rounded-lg px-3 py-1.8 text-sm text-emerald-800 outline-none bg-emerald-50/20 font-medium animate-fade-in"
                    title="An earlier target date to motivate ideal completion progress"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Progress & Pace Calculation Basis
                  </label>
                  <select
                    value={editCalculationMode}
                    onChange={(e: any) => setEditCalculationMode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white font-medium"
                  >
                    <option value="equal">Equal Splitting basis</option>
                    <option value="weightage">Chapter Weightage basis</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium font-mono">
                    Choose whether progress and recommended pace are calculated evenly, or based on custom weights entered for each chapter.
                  </p>
                </div>

                {editType === 'Academic' && (
                  <div className="md:col-span-12">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Classroom / School Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Physics Section III, College Core"
                      value={editClassTracking}
                      onChange={(e) => setEditClassTracking(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.8 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white font-medium animate-fade-in"
                    />
                  </div>
                )}
              </div>

              {/* Syllabus Breakdown Configuration */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Syllabus Breakdown Level Configuration</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Configure nested detail paths and customize level names directly.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-550 uppercase">Levels:</span>
                    <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden p-0.5">
                      <button
                        type="button"
                        disabled={editLevelCount <= 1}
                        onClick={() => handleEditLevelCountChange(editLevelCount - 1)}
                        className="px-2 py-1 text-xs font-black disabled:opacity-30 text-slate-600 hover:bg-slate-100 rounded"
                      >
                        -
                      </button>
                      <span className="px-3 font-mono font-bold text-xs text-indigo-700">{editLevelCount}</span>
                      <button
                        type="button"
                        disabled={editLevelCount >= 5}
                        onClick={() => handleEditLevelCountChange(editLevelCount + 1)}
                        className="px-2 py-1 text-xs font-black disabled:opacity-30 text-slate-600 hover:bg-slate-100 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editable labels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Array.from({ length: editLevelCount }).map((_, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Hierarchy Level {idx + 1}</span>
                      <input
                        type="text"
                        required
                        placeholder={`e.g. ${idx === 0 ? 'Subject' : idx === 1 ? 'Chapter' : 'Topic'}`}
                        value={editLevelLabels[idx] || ''}
                        onChange={(e) => handleEditLevelLabelChange(idx, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-600 font-medium"
                      />
                      <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 mt-1">
                        <span className="text-[9px] font-extrabold text-slate-500 uppercase">Calc Mode:</span>
                        <select
                          value={editLevelWeightages[idx] ? 'weightage' : 'equal'}
                          onChange={(e) => handleEditLevelWeightageChange(idx, e.target.value === 'weightage')}
                          className="text-[9.5px] font-bold text-indigo-750 bg-indigo-50 border border-indigo-200/50 rounded px-1 cursor-pointer outline-none"
                        >
                          <option value="equal">⚖️ Equal</option>
                          <option value="weightage">⚖️ Weight</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Classroom Toggle */}
              {isStudent && editType === 'Academic' && (
                <div className="p-4 bg-emerald-50/15 border border-dashed border-emerald-250 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-4.5 h-4.5 text-emerald-600" />
                      <span>🎓 PARALLEL CLASSROOM SYLLABUS ALIGNER</span>
                    </span>
                    <p className="text-xs text-slate-500">Enable school syllabus pacing checks to compare coverage metrics.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editClassEnabled}
                      onChange={(e) => setEditClassEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-4 py-1.8 border border-slate-250 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-sm font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.8 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {skuImporterOpen && activeGoal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto relative animate-fade-in text-slate-705">
            <button
              onClick={() => setSkuImporterOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors hover:bg-slate-50"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 border-b border-slate-150 pb-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-800">Excel/CSV Bulk Syllabus Entry</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-normal">
                Easily upload subjects, chapters, and topic breakdowns directly into <strong>{activeGoal.name}</strong> from your Excel spreadsheet.
              </p>
            </div>

            {/* Template Downloader section */}
            <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-xl space-y-3">
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block font-mono">1. Download Template Layouts</span>
              <p className="text-xs text-slate-600 leading-normal">
                Prepare your academic data in Excel with the correct column configuration. Download a pre-formatted starter CSV below:
              </p>
              
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => downloadTemplate(1)}
                  className="bg-white hover:bg-slate-100 border border-slate-201 text-slate-705 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-4xs"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>1-Tier (1 col)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadTemplate(2)}
                  className="bg-white hover:bg-slate-100 border border-slate-201 text-slate-705 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-4xs"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>2-Tier (2 cols)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadTemplate(3)}
                  className="bg-white hover:bg-slate-100 border border-slate-201 text-slate-705 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-4xs"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>3-Tier (3 cols)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadTemplate(4)}
                  className="bg-white hover:bg-slate-100 border border-slate-201 text-slate-705 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-4xs"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>4-Tier (4 cols)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadTemplate(5)}
                  className="bg-white hover:bg-slate-100 border border-slate-201 text-slate-705 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-4xs"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>5-Tier (5 cols)</span>
                </button>
              </div>

              <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100/60 text-[11px] text-slate-600 leading-relaxed font-mono mt-2">
                <strong>Current Goal Setup:</strong> Runs a <span className="text-indigo-650 font-bold">{activeGoal.levelNames?.length || 3}-Tier</span> structure: {activeGoal.levelNames?.join(" ➔ ") || "Level 1 ➔ Level 2 ➔ Level 3"}
              </div>
            </div>

            {/* Custom Input Data / File drop option */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block font-mono">2. Upload custom file or Paste Excel rows</span>
                
                <label className="text-[11px] text-indigo-650 hover:underline cursor-pointer font-bold flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload CSV file instead</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={6}
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                placeholder={"Paste your copied Excel cells or CSV lines here directly.\nFor Example:\nPhysics, Electromagnetism, Gauss's Law\nPhysics, Electromagnetism, Coulomb's Law\nChemistry, Alcohols, Synthesis"}
                className="w-full border border-slate-300 rounded-lg p-3 text-xs text-slate-800 font-mono focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 bg-white outline-none resize-y leading-relaxed"
              />
            </div>

            {/* Error notifications */}
            {importError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importRowsCount !== null && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Import Succeeded! Propagated {importRowsCount} curriculum elements into hierarchy.</span>
              </div>
            )}

            {/* Submit / Cancel Footer Action controls */}
            <div className="flex justify-end gap-3 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSkuImporterOpen(false)}
                className="px-4 py-1.8 border border-slate-250 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-sm font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!pasteData.trim() || importRowsCount !== null}
                className="px-4 py-1.8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-450 text-white rounded-lg text-sm font-bold cursor-pointer transition flex items-center gap-1.5 shadow-4xs"
              >
                <Plus className="w-4 h-4" />
                <span>Process Import</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom highly polished Modal prompt dialog to replace native window.prompt */}
      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-slate-705 relative animate-scale-up">
            <button
              onClick={() => {
                setPromptModal(prev => ({ ...prev, isOpen: false }));
                setPromptInputValue('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {promptModal.type === 'add' ? (
                  <Plus className="w-5 h-5 text-indigo-600 bg-indigo-50 p-1 rounded-md" />
                ) : (
                  <Edit2 className="w-5 h-5 text-indigo-600 bg-indigo-50 p-1 rounded-md" />
                )}
                <span>{promptModal.title}</span>
              </h3>
              {promptModal.description && (
                <p className="text-xs text-slate-450 mt-1 font-medium">{promptModal.description}</p>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (promptInputValue.trim()) {
                  promptModal.onConfirm(promptInputValue.trim());
                  setPromptModal(prev => ({ ...prev, isOpen: false }));
                  setPromptInputValue('');
                }
              }}
              className="space-y-4"
            >
              <input
                type="text"
                autoFocus
                required
                value={promptInputValue}
                onChange={(e) => setPromptInputValue(e.target.value)}
                placeholder={promptModal.placeholder || 'Enter label...'}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-600 font-medium placeholder-slate-400 shadow-3xs"
              />

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setPromptModal(prev => ({ ...prev, isOpen: false }));
                    setPromptInputValue('');
                  }}
                  className="px-3.5 py-1.8 text-slate-500 hover:text-slate-705 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!promptInputValue.trim()}
                  className="px-4 py-1.8 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-3xs hover:shadow-2xs transition-all active:scale-95"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Pacing Parameters modal */}
      {editNodeModal && editNodeModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-705 relative animate-scale-up flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 pb-3 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 bg-indigo-50 p-1 rounded-md text-slate-900" />
                  <span>Configure Pacing & Parameters</span>
                </h3>
                <p className="text-[11px] text-slate-450 mt-1 font-medium leading-relaxed">
                  Set custom timeline parameters for this section. If left blank, values are dynamically derived from parent tiers or the overall goal milestone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditNodeModal(null)}
                className="text-slate-400 hover:text-slate-605 p-1 rounded-lg cursor-pointer shrink-0 ml-4"
                title="Close Dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 py-3 overflow-y-auto space-y-4 flex-1">
              {/* Node Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-405 uppercase tracking-wider">Node Name / Label</label>
                <input
                  type="text"
                  required
                  value={editNodeModal.nodeName}
                  onChange={(e) => setEditNodeModal(prev => prev ? { ...prev, nodeName: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold placeholder-slate-400 shadow-3xs"
                />
              </div>

              {/* Onset date field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-405 uppercase tracking-wider flex items-center gap-1">
                  <span>🏁 Onset Date (Start)</span>
                </label>
                <input
                  type="date"
                  value={editNodeModal.startDate}
                  onChange={(e) => setEditNodeModal(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold cursor-pointer shadow-3xs"
                />
              </div>

              {/* Ideal Finish date field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                  <span>⚡ Ideal Finish Date (Target Pace)</span>
                </label>
                <input
                  type="date"
                  value={editNodeModal.idealDate}
                  onChange={(e) => setEditNodeModal(prev => prev ? { ...prev, idealDate: e.target.value } : null)}
                  className="w-full bg-emerald-50/50 border border-emerald-150 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-emerald-950 outline-none focus:border-emerald-600 font-semibold cursor-pointer shadow-3xs"
                />
              </div>

              {/* Hard Target Date field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-405 uppercase tracking-wider flex items-center gap-1">
                  <span>📅 Hard Target Date (Deadline)</span>
                </label>
                <input
                  type="date"
                  value={editNodeModal.date}
                  onChange={(e) => setEditNodeModal(prev => prev ? { ...prev, date: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold cursor-pointer shadow-3xs"
                />
              </div>

              {/* Relative Sibling Weightage Table */}
              {activeGoal && isWeightageEnabledForNode(activeGoal, editNodeModal.nodeId) && (
                <div className="space-y-3 bg-amber-50/20 border border-amber-200/60 p-4 rounded-xl animate-fade-in mt-1">
                  <div className="flex justify-between items-center border-b border-amber-100 pb-2">
                    <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚖️ Sibling Weightage Table (100% Total)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const count = editNodeWeights.length;
                        if (count > 0) {
                          const base = Math.floor(100 / count);
                          const remainder = 100 - base * count;
                          const balanced = editNodeWeights.map((item, idx) => ({
                            ...item,
                            pct: base + (idx < remainder ? 1 : 0)
                          }));
                          setEditNodeWeights(balanced);
                        }
                      }}
                      className="text-[10px] font-extrabold text-amber-700 bg-amber-100 hover:bg-amber-150 border border-amber-250/50 rounded-md px-2 py-1 cursor-pointer transition active:scale-95"
                    >
                      ⚖️ Distribute Evenly
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto border border-amber-200/40 rounded-lg bg-white/85 p-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-amber-100 bg-amber-50/30">
                          <th className="py-2 px-3 font-semibold text-amber-800">Element Name</th>
                          <th className="py-2 px-3 font-semibold text-amber-800 w-28 text-right">Weight (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100/40">
                        {editNodeWeights.map((sib, sIdx) => {
                          const isCurrentNode = sib.id === editNodeModal.nodeId;
                          return (
                            <tr key={sib.id} className={`hover:bg-amber-50/30 ${isCurrentNode ? 'bg-amber-50/60 font-semibold' : ''}`}>
                              <td className="py-2 px-3 text-slate-750 truncate max-w-[180px]">
                                {sib.name} {isCurrentNode && <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded ml-1">Current</span>}
                              </td>
                              <td className="py-1.5 px-3">
                                <div className="relative flex items-center justify-end">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    required
                                    value={sib.pct}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      const pct = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
                                      setEditNodeWeights(prev => prev.map((item, idx) => idx === sIdx ? { ...item, pct } : item));
                                    }}
                                    className="w-16 bg-white border border-amber-200 focus:border-amber-500 rounded px-1.5 py-0.5 font-mono font-bold text-right text-slate-800 outline-none pr-5 text-xs"
                                  />
                                  <span className="absolute right-1.5 text-[10px] font-bold text-amber-400 pointer-events-none">%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {(() => {
                    const totalSum = editNodeWeights.reduce((acc, w) => acc + w.pct, 0);
                    const isValid = totalSum === 100;
                    return (
                      <div className="flex justify-between items-center p-2.5 rounded-lg mt-2 bg-white/75 border border-amber-200/40">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total Sum:</span>
                        <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md ${
                          isValid 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                        }`}>
                          {totalSum}% {isValid ? '✅ Sum is 100%' : '❌ Must sum to 100%'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="p-5 py-3.5 bg-slate-50 border-t border-slate-150 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditNodeModal(null)}
                className="px-3.5 py-2 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeGoal && editNodeModal.nodeName.trim()) {
                    const isWeightageActive = isWeightageEnabledForNode(activeGoal, editNodeModal.nodeId);
                    let isWeightsSaveSuccessful = true;

                    if (isWeightageActive) {
                      const totalSum = editNodeWeights.reduce((acc, w) => acc + w.pct, 0);
                      if (totalSum === 100) {
                        const weightsMap: Record<string, number> = {};
                        editNodeWeights.forEach(item => {
                          weightsMap[item.id] = item.pct;
                        });
                        updateChildrenWeights(activeGoal.id, weightsMap);
                      } else {
                        isWeightsSaveSuccessful = false;
                      }
                    }

                    if (isWeightsSaveSuccessful) {
                      updateChildGoalFields(activeGoal.id, editNodeModal.nodeId, {
                        name: editNodeModal.nodeName.trim(),
                        startDate: editNodeModal.startDate || undefined,
                        idealDate: editNodeModal.idealDate || undefined,
                        date: editNodeModal.date || undefined
                      });
                      setEditNodeModal(null);
                    }
                  }
                }}
                disabled={(() => {
                  if (!editNodeModal.nodeName.trim()) return true;
                  if (activeGoal && isWeightageEnabledForNode(activeGoal, editNodeModal.nodeId)) {
                    const totalSum = editNodeWeights.reduce((acc, w) => acc + w.pct, 0);
                    return totalSum !== 100;
                  }
                  return false;
                })()}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-3xs hover:shadow-2xs transition-all active:scale-95"
              >
                Apply Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Sibling Weightages Adjustment Modal */}
      {weightageModal && weightageModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 bg-amber-50/40 border-b border-amber-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-amber-900 flex items-center gap-1.5">
                  <span>⚖️ Adjust Level Weightages</span>
                </h3>
                <p className="text-[10px] text-amber-700/80 mt-0.5">
                  Define progress weights for siblings under <strong className="text-amber-900">{weightageModal.parentName}</strong>. Sum must equal exactly 100%.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWeightageModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Table Area */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const count = weightageModal.siblings.length;
                    if (count > 0) {
                      const base = Math.floor(100 / count);
                      const remainder = 100 - base * count;
                      const balanced = weightageModal.siblings.map((item, idx) => ({
                        ...item,
                        pct: base + (idx < remainder ? 1 : 0)
                      }));
                      setWeightageModal(prev => prev ? { ...prev, siblings: balanced } : null);
                    }
                  }}
                  className="text-[10px] font-extrabold text-amber-700 bg-amber-100 hover:bg-amber-150 border border-amber-200/50 rounded-md px-2.5 py-1 cursor-pointer transition active:scale-95"
                >
                  ⚖️ Distribute Evenly
                </button>
              </div>

              <div className="border border-slate-150 rounded-xl overflow-hidden bg-slate-50/30">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/75">
                      <th className="py-2.5 px-3.5 font-bold text-slate-550">Sibling Name</th>
                      <th className="py-2.5 px-3.5 font-bold text-slate-550 w-28 text-right">Weight (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {weightageModal.siblings.map((sib, sIdx) => (
                      <tr key={sib.id} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3.5 text-slate-700 font-medium truncate max-w-[190px]">
                          {sib.name}
                        </td>
                        <td className="py-2 px-3.5">
                          <div className="relative flex items-center justify-end">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              required
                              value={sib.pct}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                const pct = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
                                setWeightageModal(prev => {
                                  if (!prev) return null;
                                  const updated = prev.siblings.map((item, idx) => idx === sIdx ? { ...item, pct } : item);
                                  return { ...prev, siblings: updated };
                                });
                              }}
                              className="w-16 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg px-2 py-0.5 font-mono font-black text-right text-slate-800 outline-none pr-5 text-xs shadow-3xs"
                            />
                            <span className="absolute right-1.5 text-[10px] font-bold text-slate-400 pointer-events-none">%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const totalSum = weightageModal.siblings.reduce((acc, w) => acc + w.pct, 0);
                const isValid = totalSum === 100;
                return (
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-3xs">
                    <span className="text-xs font-bold text-slate-600">Total Weightage Sum:</span>
                    <span className={`text-xs font-black font-mono px-3 py-1 rounded-lg border ${
                      isValid 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                    }`}>
                      {totalSum}% {isValid ? '✅ Valid' : '❌ Must equal 100%'}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWeightageModal(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={weightageModal.siblings.reduce((acc, w) => acc + w.pct, 0) !== 100}
                onClick={() => {
                  const totalSum = weightageModal.siblings.reduce((acc, w) => acc + w.pct, 0);
                  if (totalSum === 100 && activeGoal) {
                    const weightsMap: Record<string, number> = {};
                    weightageModal.siblings.forEach(item => {
                      weightsMap[item.id] = item.pct;
                    });
                    updateChildrenWeights(activeGoal.id, weightsMap);
                    setWeightageModal(null);
                  }
                }}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-3xs hover:shadow-2xs transition-all active:scale-95"
              >
                Save Weightages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
