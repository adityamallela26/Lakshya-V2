import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position,
  Panel,
  Edge,
  Node,
  Connection
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useLakshya } from '../context/LakshyaContext';
import {
  ChevronLeft,
  Sparkles,
  Download,
  Share2,
  Plus,
  Trash2,
  Layout,
  Save,
  HelpCircle,
  FileText,
  Clock,
  ArrowRight,
  Settings,
  Edit3,
  X,
  Play,
  RotateCcw,
  Check,
  Square,
  AlertTriangle,
  BookOpen
} from 'lucide-react';

// --- Types ---
export type NodeType = "start" | "step" | "decision" | "end" | "formula" | "warning" | "note" | "document";

export interface FlowNode {
  id: string;
  label: string;
  type: NodeType;
  position?: { x: number; y: number };
  width?: number;
  fontSize?: number;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface SavedFlowchart {
  id: string;
  topic: string;
  subject?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
}

// --- Vanilla IndexedDB Helpers ---
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lakshya_flowcharts_db', 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('flowcharts')) {
        db.createObjectStore('flowcharts', { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

const saveFlowchartToDB = async (flow: SavedFlowchart): Promise<void> => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('flowcharts', 'readwrite');
    const store = tx.objectStore('flowcharts');
    const req = store.put(flow);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const loadFlowchartsFromDB = async (): Promise<SavedFlowchart[]> => {
  const db = await initDB();
  return new Promise<SavedFlowchart[]>((resolve, reject) => {
    const tx = db.transaction('flowcharts', 'readonly');
    const store = tx.objectStore('flowcharts');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

const deleteFlowchartFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('flowcharts', 'readwrite');
    const store = tx.objectStore('flowcharts');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- Custom Node Components for React Flow ---
const StartNodeComponent: React.FC<{ data: { label: string; fontSize?: number; width?: number } }> = ({ data }) => {
  const customStyle: React.CSSProperties = {
    fontSize: data.fontSize ? `${data.fontSize}px` : undefined,
    width: data.width ? `${data.width}px` : undefined,
    maxWidth: data.width ? 'none' : undefined,
  };
  return (
    <div 
      style={customStyle}
      className="px-4 py-2.5 rounded-full border border-emerald-200 bg-white hover:border-emerald-400 text-emerald-950 font-bold text-xs shadow-sm flex items-center gap-2 min-w-[130px] justify-center relative hover:scale-105 hover:shadow-md transition-all"
    >
      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shrink-0 font-sans shadow-xs">
        <Play className="w-2.5 h-2.5 fill-current ml-0.5 rotate-90" />
      </span>
      <span className="tracking-tight select-none">{data.label}</span>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-emerald-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
    </div>
  );
};

const EndNodeComponent: React.FC<{ data: { label: string; fontSize?: number; width?: number } }> = ({ data }) => {
  const customStyle: React.CSSProperties = {
    fontSize: data.fontSize ? `${data.fontSize}px` : undefined,
    width: data.width ? `${data.width}px` : undefined,
    maxWidth: data.width ? 'none' : undefined,
  };
  return (
    <div 
      style={customStyle}
      className="px-4 py-2.5 rounded-full border border-rose-200 bg-white hover:border-rose-400 text-rose-950 font-bold text-xs shadow-sm flex items-center gap-2 min-w-[130px] justify-center relative hover:scale-105 hover:shadow-md transition-all"
    >
      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] shrink-0 font-sans shadow-xs">
        <Check className="w-2.5 h-2.5 stroke-[3]" />
      </span>
      <span className="tracking-tight select-none">{data.label}</span>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-rose-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
    </div>
  );
};

const StepNodeComponent: React.FC<{ data: { label: string; fontSize?: number; width?: number } }> = ({ data }) => {
  const customStyle: React.CSSProperties = {
    fontSize: data.fontSize ? `${data.fontSize}px` : undefined,
    width: data.width ? `${data.width}px` : undefined,
    maxWidth: data.width ? 'none' : undefined,
  };
  return (
    <div 
      style={customStyle}
      className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-xs shadow-xs flex items-center gap-2.5 min-w-[160px] max-w-[220px] relative hover:border-indigo-400 hover:shadow-md transition-all"
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-slate-400 !shadow-sm hover:!scale-125 !transition-all" 
      />
      <div className="w-1.5 h-8 rounded bg-indigo-500 shrink-0" />
      <span className="leading-tight text-left select-none break-words flex-1 pr-1">{data.label}</span>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-slate-400 !shadow-sm hover:!scale-125 !transition-all" 
      />
    </div>
  );
};

const DecisionNodeComponent: React.FC<{ data: { label: string; fontSize?: number; width?: number } }> = ({ data }) => {
  const size = data.width || 144;
  const fSize = data.fontSize || 11;
  return (
    <div 
      style={{ width: `${size}px`, height: `${size}px` }}
      className="relative flex items-center justify-center hover:scale-105 transition-transform"
    >
      {/* Diamond background */}
      <div className="absolute inset-0 rotate-45 border-2 border-amber-400 bg-amber-50/70 rounded-2xl shadow-xs hover:border-amber-500 transition-colors" />
      {/* Un-rotated text container */}
      <div 
        style={{ fontSize: `${fSize}px`, maxWidth: `${size - 50}px`, maxHeight: `${size - 55}px` }}
        className="relative z-10 px-4 text-center text-amber-950 font-extrabold leading-tight select-none overflow-y-auto scrollbar-none break-words"
      >
        {data.label}
      </div>
      {/* Correctly placed handles on the diamond vertices */}
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !border-2 !border-white !bg-amber-500 !shadow-sm hover:!scale-125 !transition-all" style={{ top: '-4px' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2.5 !h-2.5 !border-2 !border-white !bg-amber-500 !shadow-sm hover:!scale-125 !transition-all" style={{ bottom: '-4px' }} />
      <Handle type="source" position={Position.Left} id="left" className="!w-2.5 !h-2.5 !border-2 !border-white !bg-amber-500 !shadow-sm hover:!scale-125 !transition-all" style={{ left: '-4px' }} />
      <Handle type="source" position={Position.Right} id="right" className="!w-2.5 !h-2.5 !border-2 !border-white !bg-amber-500 !shadow-sm hover:!scale-125 !transition-all" style={{ right: '-4px' }} />
    </div>
  );
};

const FormulaNodeComponent: React.FC<{ data: { label: string; fontSize?: number; width?: number } }> = ({ data }) => {
  const customStyle: React.CSSProperties = {
    fontSize: data.fontSize ? `${data.fontSize}px` : undefined,
    width: data.width ? `${data.width}px` : undefined,
    maxWidth: data.width ? 'none' : undefined,
  };
  return (
    <div 
      style={customStyle}
      className="px-4 py-3 rounded-xl border border-blue-200 bg-white text-blue-950 font-semibold text-xs shadow-xs flex items-center gap-2.5 min-w-[160px] max-w-[220px] relative hover:border-blue-400 hover:shadow-md transition-all"
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-blue-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
      <span className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-[11px] shrink-0 font-sans font-black shadow-xs">∑</span>
      <span className="leading-tight text-left select-none break-words flex-1 pr-1">{data.label}</span>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-blue-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
    </div>
  );
};

const WarningNodeComponent: React.FC<{ data: { label: string; fontSize?: number; width?: number } }> = ({ data }) => {
  const customStyle: React.CSSProperties = {
    fontSize: data.fontSize ? `${data.fontSize}px` : undefined,
    width: data.width ? `${data.width}px` : undefined,
    maxWidth: data.width ? 'none' : undefined,
  };
  return (
    <div 
      style={customStyle}
      className="px-4 py-3 rounded-xl border border-orange-200 bg-white text-orange-950 font-semibold text-xs shadow-xs flex items-center gap-2.5 min-w-[160px] max-w-[220px] relative hover:border-orange-400 hover:shadow-md transition-all"
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-orange-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
      <span className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center text-[11px] shrink-0 font-sans shadow-xs">
        <AlertTriangle className="w-3.5 h-3.5" />
      </span>
      <span className="leading-tight text-left select-none break-words flex-1 pr-1">{data.label}</span>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-orange-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
    </div>
  );
};

const NoteNodeComponent: React.FC<{ data: { label: string; fontSize?: number; width?: number } }> = ({ data }) => {
  const w = data.width || 165;
  const fSize = data.fontSize || 12;
  return (
    <div 
      style={{ width: `${w}px`, fontSize: `${fSize}px`, maxWidth: 'none' }}
      className="px-4 py-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-950 font-medium shadow-sm flex items-center justify-center min-h-[90px] relative hover:shadow-md transition-all text-center italic leading-relaxed"
    >
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-8 h-2 bg-yellow-200/60 rounded-xs" />
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-yellow-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
      <span className="select-none">{data.label}</span>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-yellow-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
    </div>
  );
};

const DocumentNodeComponent: React.FC<{ data: { label: string; fontSize?: number; width?: number } }> = ({ data }) => {
  const customStyle: React.CSSProperties = {
    fontSize: data.fontSize ? `${data.fontSize}px` : undefined,
    width: data.width ? `${data.width}px` : undefined,
    maxWidth: data.width ? 'none' : undefined,
  };
  return (
    <div 
      style={customStyle}
      className="px-4 py-3 rounded-xl border border-indigo-200 bg-white text-indigo-950 font-semibold text-xs shadow-xs flex items-center gap-2.5 min-w-[160px] max-w-[220px] relative hover:border-indigo-400 hover:shadow-md transition-all"
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-indigo-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
      <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[11px] shrink-0 shadow-xs">
        <BookOpen className="w-3.5 h-3.5" />
      </span>
      <span className="leading-tight text-left select-none break-words flex-1 pr-1">{data.label}</span>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-indigo-500 !shadow-sm hover:!scale-125 !transition-all" 
      />
    </div>
  );
};

const nodeTypes = {
  start: StartNodeComponent,
  end: EndNodeComponent,
  step: StepNodeComponent,
  decision: DecisionNodeComponent,
  formula: FormulaNodeComponent,
  warning: WarningNodeComponent,
  note: NoteNodeComponent,
  document: DocumentNodeComponent
};

// --- Dagre Layout Setup ---
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 60 });

  nodes.forEach((node) => {
    // Standard box dimensions for layout
    dagreGraph.setNode(node.id, { width: 180, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 30,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Funny Educational Loading Tips ---
const loadingTips = [
  "Structuring flowchart nodes for peak study compression...",
  "Running pedagogical sequence optimization algorithms...",
  "Translating complex logic conditions into simplified bento branches...",
  "Tracing TDP paths, TDS slabs, and compliance sections...",
  "Connecting decision rules to ensure exactly one starting node...",
  "Refactoring node descriptions to fit your mental storage...",
];

interface FlowchartTabProps {
  onBack: () => void;
}

export const FlowchartTab: React.FC<FlowchartTabProps> = ({ onBack }) => {
  const { goalTypes, logActivity } = useLakshya();

  // Navigation states
  const [activeView, setActiveView] = useState<'list' | 'editor'>('list');
  const [savedFlowcharts, setSavedFlowcharts] = useState<SavedFlowchart[]>([]);
  const [currentFlowchart, setCurrentFlowchart] = useState<SavedFlowchart | null>(null);

  // Search/Input states
  const [topicInput, setTopicInput] = useState('');
  const [subjectSelect, setSubjectSelect] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Creation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // React Flow editor states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [rfInstance, setRfInstance] = useState<any>(null);

  // Edit Modals
  const [editNodeModal, setEditNodeModal] = useState<{ id: string; label: string; type: NodeType; width?: number; fontSize?: number } | null>(null);
  const [editEdgeModal, setEditEdgeModal] = useState<{ id: string; label: string } | null>(null);

  // Custom iframe-safe confirmation states
  const [flowchartToDelete, setFlowchartToDelete] = useState<{ id: string; topic: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Tips interval for loading state
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingTipIndex((prev) => (prev + 1) % loadingTips.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load flowcharts from DB on mount
  const reloadFlowchartsList = useCallback(async () => {
    try {
      const list = await loadFlowchartsFromDB();
      // Sort by updatedAt descending
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSavedFlowcharts(list);
    } catch (err) {
      console.error("Failed to load saved flowcharts:", err);
    }
  }, []);

  useEffect(() => {
    reloadFlowchartsList();
  }, [reloadFlowchartsList]);

  // Handle auto-save back to DB with debounce
  const lastSaveRef = useRef<any>(null);
  const triggerAutoSave = useCallback((updatedNodes: Node[], updatedEdges: Edge[]) => {
    if (!currentFlowchart) return;
    setAutoSaveStatus('dirty');

    if (lastSaveRef.current) clearTimeout(lastSaveRef.current);

    lastSaveRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        const mappedNodes: FlowNode[] = updatedNodes.map((n) => ({
          id: n.id,
          label: n.data.label,
          type: n.type as NodeType,
          position: n.position,
          width: n.data.width,
          fontSize: n.data.fontSize
        }));

        const mappedEdges: FlowEdge[] = updatedEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label as string | undefined
        }));

        const updatedFlow: SavedFlowchart = {
          ...currentFlowchart,
          nodes: mappedNodes,
          edges: mappedEdges,
          updatedAt: new Date().toISOString()
        };

        await saveFlowchartToDB(updatedFlow);
        setCurrentFlowchart(updatedFlow);
        setAutoSaveStatus('saved');
        // Update list in background
        reloadFlowchartsList();
      } catch (err) {
        console.error("Auto-save failed:", err);
        setAutoSaveStatus('dirty');
      }
    }, 1000);
  }, [currentFlowchart, reloadFlowchartsList]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (lastSaveRef.current) clearTimeout(lastSaveRef.current);
    };
  }, []);

  // Sync state changes to auto-saver
  const onNodesChangeWithSave = useCallback((changes: any) => {
    onNodesChange(changes);
    // Use timeout to let the state update complete and capture the latest nodes/edges
    setTimeout(() => {
      setNodes((currentNodes) => {
        setEdges((currentEdges) => {
          triggerAutoSave(currentNodes, currentEdges);
          return currentEdges;
        });
        return currentNodes;
      });
    }, 0);
  }, [onNodesChange, setNodes, setEdges, triggerAutoSave]);

  const onEdgesChangeWithSave = useCallback((changes: any) => {
    onEdgesChange(changes);
    setTimeout(() => {
      setNodes((currentNodes) => {
        setEdges((currentEdges) => {
          triggerAutoSave(currentNodes, currentEdges);
          return currentEdges;
        });
        return currentNodes;
      });
    }, 0);
  }, [onEdgesChange, setNodes, setEdges, triggerAutoSave]);

  // Handle native connection between handles
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => {
      const updatedEdges = addEdge({
        ...params,
        id: `e-${Date.now()}`,
        type: 'smoothstep',
        pathOptions: { borderRadius: 20 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' },
        style: { strokeWidth: 2.5, stroke: '#6366f1' }
      }, eds);
      
      setNodes((currentNodes) => {
        triggerAutoSave(currentNodes, updatedEdges);
        return currentNodes;
      });
      return updatedEdges;
    });
  }, [setEdges, setNodes, triggerAutoSave]);

  // Create a manual flowchart template
  const handleCreateManualFlowchart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Create template nodes for manual editing
      const startNodeId = `node-start-${Date.now()}`;
      const stepNodeId = `node-step-${Date.now()}`;
      const endNodeId = `node-end-${Date.now()}`;

      const rawNodes: Node[] = [
        {
          id: startNodeId,
          type: 'start',
          data: { label: 'Start', fontSize: 12, width: 140 },
          position: { x: 250, y: 50 }
        },
        {
          id: stepNodeId,
          type: 'step',
          data: { label: 'Double-click to edit this step', fontSize: 12, width: 180 },
          position: { x: 230, y: 160 }
        },
        {
          id: endNodeId,
          type: 'end',
          data: { label: 'End Process', fontSize: 12, width: 140 },
          position: { x: 250, y: 280 }
        }
      ];

      const rawEdges: Edge[] = [
        {
          id: `e-${startNodeId}-${stepNodeId}`,
          source: startNodeId,
          target: stepNodeId,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' },
          style: { strokeWidth: 2, stroke: '#6366f1' }
        },
        {
          id: `e-${stepNodeId}-${endNodeId}`,
          source: stepNodeId,
          target: endNodeId,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' },
          style: { strokeWidth: 2, stroke: '#6366f1' }
        }
      ];

      // Save new flowchart to Database
      const newFlow: SavedFlowchart = {
        id: `flow-${Date.now()}`,
        topic: topicInput.trim(),
        subject: subjectSelect || undefined,
        nodes: rawNodes.map(n => ({ 
          id: n.id, 
          label: n.data.label, 
          type: n.type as NodeType, 
          position: n.position,
          width: n.data.width,
          fontSize: n.data.fontSize
        })),
        edges: rawEdges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label as string })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveFlowchartToDB(newFlow);
      logActivity(`Created Manual Flowchart for "${newFlow.topic}"`, 'goal');

      setCurrentFlowchart(newFlow);
      setNodes(rawNodes);
      setEdges(rawEdges);
      setAutoSaveStatus('saved');
      setActiveView('editor');

      // Clear input fields
      setTopicInput('');
      setSubjectSelect('');
      reloadFlowchartsList();
    } catch (err: any) {
      console.error("Flowchart creation failed:", err);
      setGenerationError(err.message || "An unexpected error occurred while creating flowchart.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Open existing flowchart
  const handleOpenFlowchart = (flow: SavedFlowchart) => {
    setCurrentFlowchart(flow);

    // Convert saved DB nodes back into React Flow elements
    const reactFlowNodes: Node[] = flow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      data: { 
        label: node.label,
        width: node.width,
        fontSize: node.fontSize
      },
      position: node.position || { x: 0, y: 0 }
    }));

    const reactFlowEdges: Edge[] = flow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' },
      style: { strokeWidth: 2, stroke: '#6366f1' }
    }));

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
    setAutoSaveStatus('saved');
    setActiveView('editor');
  };

  // Trigger flowchart delete confirmation modal
  const handleDeleteFlowchart = (e: React.MouseEvent, id: string, topic: string) => {
    e.stopPropagation();
    setFlowchartToDelete({ id, topic });
  };

  // Perform actual deletion after confirmation
  const executeDeleteFlowchart = async () => {
    if (!flowchartToDelete) return;
    const { id, topic } = flowchartToDelete;
    try {
      await deleteFlowchartFromDB(id);
      logActivity(`Deleted Flowchart for "${topic}"`, 'goal');
      reloadFlowchartsList();
      if (currentFlowchart?.id === id) {
        setCurrentFlowchart(null);
        setActiveView('list');
      }
    } catch (err) {
      console.error("Failed to delete flowchart:", err);
    } finally {
      setFlowchartToDelete(null);
    }
  };

  // Run auto-layout inside the workspace
  const handleRelayout = (direction: 'TB' | 'LR') => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    triggerAutoSave(layoutedNodes, layoutedEdges);
  };

  // Workspace Actions: Add Node
  const handleAddNode = (type: NodeType) => {
    const id = `node-${Date.now()}`;
    let label = 'New Step';
    if (type === 'start') label = 'Start';
    else if (type === 'end') label = 'End Process';
    else if (type === 'decision') label = 'New Question?';
    else if (type === 'formula') label = 'Formula: x = y';
    else if (type === 'warning') label = 'Important Exception';
    else if (type === 'note') label = 'Sticky revision note';
    else if (type === 'document') label = 'Reference Document';
    
    // Find approximate center of existing nodes or default coordinates
    let x = 100;
    let y = 100;
    if (nodes.length > 0) {
      const sumX = nodes.reduce((sum, n) => sum + n.position.x, 0);
      const sumY = nodes.reduce((sum, n) => sum + n.position.y, 0);
      x = sumX / nodes.length + 50;
      y = sumY / nodes.length + 50;
    }

    const newNode: Node = {
      id,
      type,
      data: { label },
      position: { x, y }
    };

    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    triggerAutoSave(updatedNodes, edges);
  };

  // Delete currently selected nodes/edges in React Flow
  const handleDeleteSelected = () => {
    const updatedNodes = nodes.filter((n) => !n.selected);
    const updatedEdges = edges.filter((e) => !e.selected);

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    triggerAutoSave(updatedNodes, updatedEdges);
  };

  // Double click handler for nodes
  const onNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setEditNodeModal({
      id: node.id,
      label: node.data.label,
      type: node.type as NodeType,
      width: node.data.width || 180,
      fontSize: node.data.fontSize || 12
    });
  };

  // Double click handler for edges
  const onEdgeDoubleClick = (event: React.MouseEvent, edge: Edge) => {
    setEditEdgeModal({
      id: edge.id,
      label: (edge.label as string) || ''
    });
  };

  // Save Node Edits
  const handleSaveNodeEdit = () => {
    if (!editNodeModal) return;

    const updatedNodes = nodes.map((n) => {
      if (n.id === editNodeModal.id) {
        return {
          ...n,
          type: editNodeModal.type,
          data: { 
            ...n.data, 
            label: editNodeModal.label,
            width: editNodeModal.width,
            fontSize: editNodeModal.fontSize
          }
        };
      }
      return n;
    });

    setNodes(updatedNodes);
    triggerAutoSave(updatedNodes, edges);
    setEditNodeModal(null);
  };

  // Save Edge Edits
  const handleSaveEdgeEdit = () => {
    if (!editEdgeModal) return;

    const updatedEdges = edges.map((e) => {
      if (e.id === editEdgeModal.id) {
        return {
          ...e,
          label: editEdgeModal.label || undefined
        };
      }
      return e;
    });

    setEdges(updatedEdges);
    triggerAutoSave(nodes, updatedEdges);
    setEditEdgeModal(null);
  };

  // --- Export and Share Logic ---
  const handleExportPDF = async () => {
    if (!currentFlowchart) return;
    setAutoSaveStatus('saving');
    try {
      const element = document.querySelector('.react-flow') as HTMLElement;
      if (!element) return;

      // Fit the entire flowchart diagram perfectly before taking the screenshot
      let currentViewport = null;
      if (rfInstance) {
        currentViewport = rfInstance.getViewport();
        rfInstance.fitView({ padding: 0.15 });
        // Give layout engine a tiny delay to update views
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Temporarily hide workspace control buttons for high contrast, clean screenshot
      const controls = document.querySelector('.react-flow__controls') as HTMLElement;
      const minimap = document.querySelector('.react-flow__minimap') as HTMLElement;
      const floatingToolbar = document.querySelector('#floating-canvas-toolbar') as HTMLElement;
      if (controls) controls.style.display = 'none';
      if (minimap) minimap.style.display = 'none';
      if (floatingToolbar) floatingToolbar.style.display = 'none';

      // Capture sharp image using native high DPI pixelRatio
      const dataUrl = await toPng(element, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2
      });

      if (controls) controls.style.display = 'flex';
      if (minimap) minimap.style.display = 'block';
      if (floatingToolbar) floatingToolbar.style.display = 'flex';

      // Restore original view scale and position
      if (rfInstance && currentViewport) {
        rfInstance.setViewport(currentViewport);
      }

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      // Header Title Card
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(`Lakshya Study Flowchart: ${currentFlowchart.topic}`, 15, 15);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Subject Area: ${currentFlowchart.subject || "General Study"} | Created on: ${new Date(currentFlowchart.createdAt).toLocaleDateString()}`, 15, 20);
      pdf.line(15, 22, width - 15, 22);

      // Dynamically calculate aspect ratio so the flowchart is never stretched or distorted
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgWidth = img.width;
      const imgHeight = img.height;
      const canvasRatio = imgWidth / imgHeight;

      const margin = 15;
      const pdfMaxW = width - (margin * 2);
      const pdfMaxH = height - 25 - margin; // 25mm reserved for header title & lines

      let renderW = pdfMaxW;
      let renderH = pdfMaxW / canvasRatio;

      if (renderH > pdfMaxH) {
        renderH = pdfMaxH;
        renderW = pdfMaxH * canvasRatio;
      }

      // Center the image in the remaining landscape space
      const xOffset = margin + (pdfMaxW - renderW) / 2;
      const yOffset = 25 + (pdfMaxH - renderH) / 2;

      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, renderW, renderH);
      pdf.save(`Lakshya_Flowchart_${currentFlowchart.topic.replace(/\s+/g, '_')}.pdf`);
      
      logActivity(`Exported "${currentFlowchart.topic}" flowchart as PDF`, 'goal');
      setAutoSaveStatus('saved');
      return pdf;
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export flowchart image to PDF.");
      setAutoSaveStatus('saved');
    }
  };

  const handleShareFlowchart = async () => {
    if (!currentFlowchart) return;
    const pdf = await handleExportPDF();
    if (!pdf) return;

    try {
      const isCapacitor = (window as any).Capacitor;
      if (isCapacitor && isCapacitor.Plugins && isCapacitor.Plugins.Share) {
        // Native android share sheet compilation
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        await isCapacitor.Plugins.Share.share({
          title: `Lakshya Flowchart — ${currentFlowchart.topic}`,
          text: `Check out this flowchart for revision on ${currentFlowchart.topic}!`,
          url: `data:application/pdf;base64,${pdfBase64}`,
          dialogTitle: 'Share Revision Flowchart'
        });
      } else {
        // Web share sheet API fallback
        const blob = pdf.output('blob');
        const file = new File([blob], `Lakshya_Flowchart_${currentFlowchart.topic.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Lakshya Flowchart — ${currentFlowchart.topic}`,
            text: `Take a look at this procedural study flowchart for ${currentFlowchart.topic}!`
          });
        } else {
          alert("Flowchart exported successfully! You can share the downloaded PDF file using any sharing app on your computer.");
        }
      }
    } catch (err) {
      console.error("Native share session failed:", err);
    }
  };

  // Filtered flowcharts list
  const filteredFlowcharts = savedFlowcharts.filter((flow) => {
    const query = searchQuery.toLowerCase();
    return (
      flow.topic.toLowerCase().includes(query) ||
      (flow.subject && flow.subject.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 h-full flex flex-col min-h-[75vh]" id="flowchart-tool-root">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={activeView === 'editor' ? () => setActiveView('list') : onBack}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer border border-slate-200 bg-white"
            title="Go Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Layout className="w-6 h-6 text-indigo-600 bg-indigo-50 p-1.5 rounded-lg" />
              <span>Revision Flowcharts</span>
            </h1>
            <p className="text-xs text-slate-500">
              {activeView === 'editor' && currentFlowchart
                ? `Editing flowchart for: "${currentFlowchart.topic}"`
                : "Create custom revision flowcharts for complex concepts, tax slabs, or legal compliance steps."}
            </p>
          </div>
        </div>

        {/* Editor Save/Export panel */}
        {activeView === 'editor' && currentFlowchart && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] uppercase font-bold tracking-wider mr-2 text-slate-400 font-mono flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                autoSaveStatus === 'saved' ? 'bg-emerald-500' : autoSaveStatus === 'saving' ? 'bg-indigo-500 animate-spin' : 'bg-amber-500 animate-pulse'
              }`} />
              {autoSaveStatus === 'saved' ? 'All Saved' : autoSaveStatus === 'saving' ? 'Saving...' : 'Unsaved edits'}
            </span>

            <button
              onClick={handleExportPDF}
              className="px-3 py-1.8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer shadow-3xs flex items-center gap-1.5 transition active:scale-95"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handleShareFlowchart}
              className="px-3.5 py-1.8 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs cursor-pointer shadow-3xs flex items-center gap-1.5 transition active:scale-95"
              title="Share PDF"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Main content area */}
      {activeView === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* Creation Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              <span>Create New Diagram</span>
            </h3>

            {isGenerating ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                </div>
                <div className="space-y-1.5 max-w-sm px-4">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Creating Flowchart...</h4>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateManualFlowchart} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Subject Presets</label>
                  <select
                    value={subjectSelect}
                    onChange={(e) => setSubjectSelect(e.target.value)}
                    className="w-full bg-slate-50/50 focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs outline-none text-slate-700 transition-all cursor-pointer font-semibold"
                  >
                    <option value="">No Preset (General Topic)</option>
                    {goalTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flowchart Study Topic</label>
                  <textarea
                    required
                    rows={4}
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Enter study topic (e.g., 'TDS rate under income tax sections', 'GST input tax credit rule sequence', 'Auditor appointment compliance checklist')"
                    className="w-full bg-slate-50/50 focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2.5 text-xs outline-none text-slate-800 transition-all placeholder:text-slate-400 leading-relaxed font-medium"
                  />
                </div>

                {generationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex gap-2 items-start leading-relaxed animate-fade-in">
                    <span className="font-extrabold text-red-800">⚠️ Error:</span>
                    <span>{generationError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!topicInput.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs cursor-pointer shadow-3xs flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Study Flowchart</span>
                </button>
              </form>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Tips for students
              </span>
              <ul className="text-[11px] text-slate-500 leading-relaxed list-disc list-inside space-y-1">
                <li>Best for <strong>procedural compliance checklists</strong> and <strong>decision-heavy branching laws</strong>.</li>
                <li>You can completely modify labels, add/rewire connections, and reposition nodes freely inside the drag canvas.</li>
                <li>Diagrams are securely saved to IndexedDB browser storage for offline editing.</li>
              </ul>
            </div>
          </div>

          {/* Saved Flowcharts History Grid */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>My Saved Flowcharts ({filteredFlowcharts.length})</span>
              </h3>
              <input
                type="text"
                placeholder="Search diagrams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500 max-w-[200px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredFlowcharts.map((flow) => (
                <div
                  key={flow.id}
                  onClick={() => handleOpenFlowchart(flow)}
                  className="group border border-slate-200 hover:border-indigo-300 rounded-xl p-3.5 bg-white shadow-4xs hover:shadow-3xs hover:bg-indigo-50/5 cursor-pointer transition flex flex-col justify-between gap-3 min-h-[110px]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {flow.subject && (
                        <span className="text-[9px] uppercase tracking-wider font-extrabold bg-indigo-50 text-indigo-700 px-1.8 py-0.6 rounded border border-indigo-100">
                          {flow.subject}
                        </span>
                      )}
                      <span className="text-[9px] uppercase tracking-wider font-extrabold bg-slate-50 text-slate-500 px-1.8 py-0.6 rounded border border-slate-100 flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        {new Date(flow.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-xs leading-snug group-hover:text-indigo-700 transition truncate-2-lines">
                      {flow.topic}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100/70 pt-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold group-hover:text-indigo-600 flex items-center gap-1 transition">
                      Open Canvas <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                    <button
                      onClick={(e) => handleDeleteFlowchart(e, flow.id, flow.topic)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition"
                      title="Delete diagram"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredFlowcharts.length === 0 && (
                <div className="col-span-2 py-16 text-center space-y-2">
                  <p className="text-xs text-slate-400 italic">No saved study flowcharts found.</p>
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Clear Search Filter
                    </button>
                  ) : (
                    <p className="text-[11px] text-slate-400">Type a topic and click Create on the left to activate!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* --- React Flow Editor Canvas Workspace --- */
        <div className="border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden flex flex-col flex-1 h-[75vh] min-h-[500px] relative shadow-3xs" id="react-flow-workspace-panel">
          
          {/* Flow Workspace controls panel */}
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10 shadow-3xs shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-lg">
                Topic: {currentFlowchart?.topic}
              </span>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">Layout direction:</span>
                <button
                  onClick={() => handleRelayout('TB')}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 transition shadow-3xs active:scale-95"
                  title="Rearrange Vertical Layout"
                >
                  <Layout className="w-3.5 h-3.5 text-slate-500 rotate-90" />
                  <span>Vertical flow</span>
                </button>

                <button
                  onClick={() => handleRelayout('LR')}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 transition shadow-3xs active:scale-95"
                  title="Rearrange Horizontal Layout"
                >
                  <Layout className="w-3.5 h-3.5 text-slate-500" />
                  <span>Horizontal flow</span>
                </button>
              </div>

              <div className="w-px h-5 bg-slate-200" />

              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-150 hover:border-red-300 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                title="Clear current flowchart canvas completely"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Canvas</span>
              </button>
            </div>
          </div>

          {/* Tips Instruction bar */}
          <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex items-center gap-1.5 select-none text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Double click a node to edit label/type. Double click any arrow/edge to add choice labels (e.g. "Yes", "No"). Drag from node handles to rewire connections.</span>
          </div>

          {/* Flow canvas */}
          <div className="w-full bg-slate-50 relative h-[550px] sm:h-[600px] lg:h-[65vh] flex flex-row" id="react-flow-canvas-container">
            
            {/* Left Shape Tool Drawer / Palette (Whimsical / Miro Style) */}
            <div className="h-full bg-white border-r border-slate-200 p-2 sm:p-2.5 flex flex-col gap-3 items-center w-14 sm:w-16 shrink-0 shadow-3xs z-10" id="floating-canvas-toolbar">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center select-none block pb-1 border-b border-slate-100 w-full">Shapes</span>
              
              <button
                onClick={() => handleAddNode('start')}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group relative shadow-4xs"
                title="Add Start Node (Emerald Capsule)"
              >
                <Play className="w-4 h-4 text-emerald-600 rotate-90" />
                <span className="text-[8px] font-bold text-emerald-800 mt-0.5">Start</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Add Start Point
                </span>
              </button>

              <button
                onClick={() => handleAddNode('step')}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group relative shadow-4xs"
                title="Add Revision Step (Slate Rounded Box)"
              >
                <Square className="w-4 h-4 text-slate-600" />
                <span className="text-[8px] font-bold text-slate-700 mt-0.5">Step</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Add Revision Step
                </span>
              </button>

              <button
                onClick={() => handleAddNode('decision')}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group relative shadow-4xs"
                title="Add Decision Node (Yellow Diamond)"
              >
                <div className="w-3.5 h-3.5 rotate-45 border border-amber-500 bg-amber-150/40 rounded-xs" />
                <span className="text-[8px] font-bold text-amber-800 mt-0.5">Decision</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Add Decision Point
                </span>
              </button>

              <button
                onClick={() => handleAddNode('formula')}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group relative shadow-4xs"
                title="Add Equation / Formula (Blue Sum Card)"
              >
                <span className="text-blue-600 font-extrabold text-sm leading-none h-4 font-sans">∑</span>
                <span className="text-[8px] font-bold text-blue-800 mt-0.5">Formula</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Add Equation / Rule Formula
                </span>
              </button>

              <button
                onClick={() => handleAddNode('warning')}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-orange-50 hover:bg-orange-100 border-2 border-orange-300 hover:border-orange-500 rounded-xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group relative shadow-4xs"
                title="Add Warning Note (Orange Warning Card)"
              >
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-[8px] font-bold text-orange-800 mt-0.5">Warning</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Add Warning / Exception Note
                </span>
              </button>

              <button
                onClick={() => handleAddNode('note')}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-yellow-50 hover:bg-yellow-100 border-2 border-yellow-300 hover:border-yellow-500 rounded-xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group relative shadow-4xs"
                title="Add Sticky Note (Yellow Paper Square)"
              >
                <FileText className="w-4 h-4 text-yellow-600" />
                <span className="text-[8px] font-bold text-yellow-800 mt-0.5">Sticky</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Add Sticky revision note
                </span>
              </button>

              <button
                onClick={() => handleAddNode('document')}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-350 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group relative shadow-4xs"
                title="Add Reference Document (Indigo Card)"
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span className="text-[8px] font-bold text-indigo-800 mt-0.5">Doc</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Add Reference Document
                </span>
              </button>

              <button
                onClick={() => handleAddNode('end')}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-rose-50 hover:bg-rose-100 border-2 border-rose-350 hover:border-rose-500 rounded-xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group relative shadow-4xs"
                title="Add End Point (Rose Capsule)"
              >
                <Check className="w-4 h-4 text-rose-600" />
                <span className="text-[8px] font-bold text-rose-800 mt-0.5">End</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Add End Terminal
                </span>
              </button>

              <div className="w-full h-px bg-slate-100 my-1" />

              <button
                onClick={handleDeleteSelected}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-red-50 hover:bg-red-100 border border-red-250 rounded-xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer group relative shadow-4xs"
                title="Delete highlighted elements"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span className="text-[8px] font-bold text-red-800 mt-0.5">Delete</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Delete Selected Shapes
                </span>
              </button>
            </div>

            <div className="flex-1 relative h-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChangeWithSave}
                onEdgesChange={onEdgesChangeWithSave}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onNodeDoubleClick={onNodeDoubleClick}
                onEdgeDoubleClick={onEdgeDoubleClick}
                onInit={setRfInstance}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                style={{ width: '100%', height: '100%' }}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  pathOptions: { borderRadius: 20 },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
                  style: { strokeWidth: 2.5, stroke: '#6366f1' }
                }}
              >
                <Background variant="dots" gap={20} size={1.2} color="#cbd5e1" />
                <Controls className="!bg-white !border-slate-200 !shadow-sm" />
                <MiniMap className="!bg-white !border-slate-200 !rounded-xl !shadow-sm" nodeStrokeWidth={3} zoomable pannable />
              </ReactFlow>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Dialogs */}
      {/* Node Editing Modal */}
      {editNodeModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-black text-slate-900">Configure Node Parameters</h3>
              <button
                onClick={() => setEditNodeModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer animate-fade-in"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Node / Step Label</label>
                <input
                  type="text"
                  value={editNodeModal.label}
                  onChange={(e) => setEditNodeModal({ ...editNodeModal, label: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                  placeholder="Enter custom node label"
                  maxLength={150}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Block Width</label>
                  <span className="text-[11px] font-mono font-bold text-indigo-600">{editNodeModal.width || 180}px</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="350"
                  step="10"
                  value={editNodeModal.width || 180}
                  onChange={(e) => setEditNodeModal({ ...editNodeModal, width: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
                
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 mt-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Font Size</label>
                  <span className="text-[11px] font-mono font-bold text-indigo-600">{editNodeModal.fontSize || 12}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="22"
                  step="1"
                  value={editNodeModal.fontSize || 12}
                  onChange={(e) => setEditNodeModal({ ...editNodeModal, fontSize: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step Type Pattern</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'start', label: 'Start Point', bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                    { id: 'step', label: 'Action Step', bg: 'bg-white border-slate-300 text-slate-700' },
                    { id: 'decision', label: 'Decision Logic', bg: 'bg-amber-50 border-amber-200 text-amber-800' },
                    { id: 'formula', label: 'Formula / Math', bg: 'bg-blue-50 border-blue-200 text-blue-800' },
                    { id: 'warning', label: 'Warning / Rule', bg: 'bg-orange-50 border-orange-200 text-orange-800' },
                    { id: 'note', label: 'Sticky Note', bg: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
                    { id: 'document', label: 'Reference Doc', bg: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
                    { id: 'end', label: 'End Terminal', bg: 'bg-rose-50 border-rose-200 text-rose-800' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEditNodeModal({ ...editNodeModal, type: t.id as NodeType })}
                      className={`p-2 border rounded-lg text-left text-[11px] font-bold cursor-pointer transition-all ${t.bg} ${
                        editNodeModal.type === t.id ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-450' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditNodeModal(null)}
                className="px-3.5 py-1.8 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNodeEdit}
                disabled={!editNodeModal.label.trim()}
                className="px-4 py-1.8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs cursor-pointer"
              >
                Save Step Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edge Editing Modal */}
      {editEdgeModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-black text-slate-900">Configure Flow Label</h3>
              <button
                onClick={() => setEditEdgeModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Condition (e.g. Yes / No)</label>
              <input
                type="text"
                value={editEdgeModal.label}
                onChange={(e) => setEditEdgeModal({ ...editEdgeModal, label: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none text-slate-800"
                placeholder="e.g., 'Yes', 'No', 'TDS applicable', 'Turnover > 10cr'"
                maxLength={80}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditEdgeModal(null)}
                className="px-3.5 py-1.8 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdgeEdit}
                className="px-4 py-1.8 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs cursor-pointer"
              >
                Apply Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Flowchart Delete Modal */}
      {flowchartToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 text-red-600 border-b border-slate-100 pb-2.5">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-black text-slate-900">Delete Flowchart</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the flowchart for <strong className="text-slate-900">"{flowchartToDelete.topic}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFlowchartToDelete(null)}
                className="px-3.5 py-1.8 text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteFlowchart}
                className="px-4 py-1.8 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg text-xs cursor-pointer transition shadow-3xs active:scale-95"
              >
                Delete Flowchart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Canvas Clear Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 text-amber-600 border-b border-slate-100 pb-2.5">
              <RotateCcw className="w-5 h-5 animate-spin-reverse" />
              <h3 className="text-sm font-black text-slate-900">Clear Canvas</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear all nodes and edges from this flowchart? All unsaved canvas changes will be removed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.8 text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setNodes([]);
                  setEdges([]);
                  triggerAutoSave([], []);
                  setShowClearConfirm(false);
                }}
                className="px-4 py-1.8 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg text-xs cursor-pointer transition shadow-3xs active:scale-95"
              >
                Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
