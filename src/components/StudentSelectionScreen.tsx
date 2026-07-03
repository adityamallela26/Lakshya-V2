import React, { useState, useRef } from 'react';
import { useLakshya } from '../context/LakshyaContext';
import { StudentProfile } from '../types';
import {
  User,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Edit2,
  AlertCircle,
  Sparkles,
  Trash,
  ChevronRight
} from 'lucide-react';

export function StudentSelectionScreen() {
  const {
    students,
    switchStudent,
    createStudent,
    updateStudentRole,
    renameStudent,
    deleteStudent,
    restoreStudent,
    permanentlyDeleteStudent,
    importStudent,
    exportStudent,
  } = useLakshya();

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRole, setNewStudentRole] = useState<'Student' | 'Professional' | 'Other'>('Student');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [permanentlyDeletingId, setPermanentlyDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeStudents = students.filter(s => !s.deletedAt);
  const recycledStudents = students.filter(s => !!s.deletedAt);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    createStudent(newStudentName.trim(), newStudentRole);
    setNewStudentName('');
  };

  const handleStartRename = (e: React.MouseEvent, student: StudentProfile) => {
    e.stopPropagation();
    setEditingStudentId(student.id);
    setEditedName(student.name);
  };

  const handleSaveRename = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (!editedName.trim()) return;
    renameStudent(id, editedName.trim());
    setEditingStudentId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStudentId(null);
  };

  const handleExportClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    exportStudent(id);
  };

  const handleDeleteClick = (e: React.MouseEvent, student: StudentProfile) => {
    e.stopPropagation();
    e.preventDefault();
    setDeletingStudentId(student.id);
  };

  return (
    <div className="w-full max-w-xl mx-auto py-6 sm:py-10 px-4 min-h-screen flex flex-col justify-between" id="student-selector-layout">
      <div className="space-y-6 sm:space-y-10">
        
        {/* Simple & Minimal Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-sans">
            Lakshya
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm max-w-sm mx-auto">
            Select a child's profile to manage notes, study guides, and daily streaks.
          </p>
        </div>

        {/* Profiles Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Profiles ({activeStudents.length})
            </h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer py-1 px-2 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Upload className="w-3 h-3" /> Import JSON
            </button>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportError(null);
                setImportSuccess(false);
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const json = JSON.parse(event.target?.result as string);
                    const res = importStudent(json);
                    if (res.success) {
                      setImportSuccess(true);
                      setTimeout(() => setImportSuccess(false), 3000);
                    } else {
                      setImportError(res.error || 'Invalid file structure');
                    }
                  } catch (err) {
                    setImportError('Invalid JSON backup file format');
                  }
                };
                reader.readAsText(file);
                if (e.target) e.target.value = '';
              }}
              className="hidden"
            />
          </div>

          {importError && (
            <div className="text-rose-600 text-xs bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-2 max-w-full">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="text-emerald-700 text-xs bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Profile imported successfully!</span>
            </div>
          )}

          {activeStudents.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">No student profiles found.</p>
              <p className="text-[11px] mt-0.5">Use the input below to register your child's profile.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeStudents.map(student => {
                const isEditing = editingStudentId === student.id;
                const initial = student.name ? student.name.charAt(0).toUpperCase() : '?';

                return (
                  <div
                    key={student.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs transition-all duration-200 overflow-hidden"
                    id={`student-card-${student.id}`}
                  >
                    {/* Upper click zone for entering workspace */}
                    <div
                      className="p-4 sm:p-5 flex items-center gap-3.5 cursor-pointer select-none active:bg-slate-50 hover:bg-slate-50/50 transition-colors"
                      onClick={() => {
                        if (!isEditing) {
                          switchStudent(student.id);
                        }
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 self-center">
                        {initial}
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div
                            className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              className="border border-indigo-600 rounded-lg px-2.5 py-1 text-sm bg-white font-bold text-slate-800 outline-none w-full max-w-[185px] h-9"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(e, student.id);
                                if (e.key === 'Escape') setEditingStudentId(null);
                              }}
                            />
                            
                            <select
                              value={student.role || 'Student'}
                              onChange={(e) => updateStudentRole(student.id, e.target.value as any)}
                              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-white font-semibold text-slate-700 outline-none h-9 cursor-pointer"
                            >
                              <option value="Student">🎓 Student</option>
                              <option value="Professional">💼 Professional</option>
                              <option value="Other">👤 Other</option>
                            </select>

                            <div className="flex gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleSaveRename(e, student.id)}
                                className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer h-9 shrink-0"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelRename}
                                className="text-slate-405 hover:text-slate-650 text-xs font-semibold px-1.5 h-9 flex items-center shrink-0"
                              >
                                Exit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 tracking-tight text-base block truncate">
                                {student.name}
                              </span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                student.role === 'Professional'
                                  ? 'bg-teal-50 border-teal-100 text-teal-700'
                                  : student.role === 'Other'
                                  ? 'bg-slate-50 border-slate-200 text-slate-600'
                                  : 'bg-indigo-50 border-indigo-100 text-indigo-755'
                              }`}>
                                {student.role === 'Professional' ? '💼 Professional' : student.role === 'Other' ? '👤 Other' : '🎓 Student'}
                              </span>
                            </div>
                            <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                              Open workspace <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom toolbar for separate actions (100% isolated to prevent misclicks) */}
                    <div 
                      className={`px-4 py-2 flex items-center justify-between gap-2 transition-colors border-t duration-150 ${
                        deletingStudentId === student.id 
                          ? 'bg-rose-50/80 border-rose-100' 
                          : 'bg-slate-50/70 border-slate-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      {deletingStudentId === student.id ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-rose-700 font-bold shrink-0 flex items-center gap-1">
                            Move to Recycle Bin?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteStudent(student.id);
                                setDeletingStudentId(null);
                              }}
                              className="px-2.5 py-1 bg-rose-650 hover:bg-rose-700 text-white font-extrabold rounded-lg text-[11px] cursor-pointer shadow-xs"
                            >
                              Yes, Delete
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingStudentId(null);
                              }}
                              className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg text-[11px] hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span
                            className="text-[11px] text-indigo-905 bg-indigo-50/80 border border-indigo-100/80 px-2.5 py-0.5 rounded-lg font-mono select-all flex items-center gap-1 cursor-pointer hover:bg-indigo-100 transition-colors shadow-3xs"
                            title="Click to double click and copy full student profile ID"
                          >
                            <span className="text-indigo-500 font-extrabold text-[9px] uppercase tracking-wider">ID:</span>
                            <span className="font-semibold">{student.id}</span>
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(e, student)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all cursor-pointer inline-flex items-center justify-center text-xs gap-1 font-semibold"
                              title="Rename profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Rename</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleExportClick(e, student.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-white rounded-lg transition-all cursor-pointer inline-flex items-center justify-center text-xs gap-1 font-semibold"
                              title="Download backup file"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Export</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(e, student)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center text-xs gap-1 font-semibold"
                              title="Delete child profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Child Input */}
        <div className="pt-2" id="create-profile-block-wrapper">
          <form onSubmit={handleCreateSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              placeholder="Profile name (e.g. Aryan)"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="flex-grow bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-600 shadow-xs h-10 min-w-0"
            />
            <div className="flex gap-2">
              <select
                value={newStudentRole}
                onChange={(e) => setNewStudentRole(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs font-semibold text-slate-705 outline-none focus:border-indigo-600 cursor-pointer h-10 shadow-xs"
              >
                <option value="Student">🎓 Student</option>
                <option value="Professional">💼 Professional</option>
                <option value="Other">👤 Other</option>
              </select>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-indigo-600 text-white font-bold h-10 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </form>
        </div>

        {/* Recycle Bin Section */}
        {recycledStudents.length > 0 && (
          <div className="border-t border-slate-150 pt-6 mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                <Trash className="w-3.5 h-3.5 shrink-0" /> Recycle Bin • 30 Day Auto-Purge
              </h3>
            </div>
            
            <div className="space-y-2">
              {recycledStudents.map(student => (
                <div
                  key={student.id}
                  className={`border rounded-xl p-3 flex sm:items-center justify-between gap-3 text-xs transition-colors duration-150 ${
                    permanentlyDeletingId === student.id
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-slate-50 border-slate-250/65'
                  }`}
                >
                  <span className="font-bold text-slate-600 truncate line-through max-w-[140px] sm:max-w-[280px]">
                    {student.name}
                  </span>
                  
                  {permanentlyDeletingId === student.id ? (
                    <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-lg border border-rose-100 shadow-2xs">
                      <span className="text-[10px] text-rose-700 font-bold px-1.5 shrink-0">Erase forever?</span>
                      <button
                        type="button"
                        onClick={() => {
                          permanentlyDeleteStudent(student.id);
                          setPermanentlyDeletingId(null);
                        }}
                        className="px-2.5 py-1 bg-rose-650 hover:bg-rose-700 text-white font-extrabold rounded text-[10px] cursor-pointer shadow-3xs"
                      >
                        Erase
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermanentlyDeletingId(null)}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 font-bold rounded text-[10px] hover:bg-slate-50 cursor-pointer"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => restoreStudent(student.id)}
                        className="p-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-650 font-bold rounded-lg cursor-pointer inline-flex items-center gap-1 transition-colors"
                        title="Restore profile"
                      >
                        <RotateCcw className="w-3 h-3 text-indigo-500" />
                        <span>Retrieve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermanentlyDeletingId(student.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        title="Permanently erase database file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="text-center font-mono text-[9px] text-slate-400 pt-16 uppercase tracking-widest leading-relaxed">
        Lakshya Private Client • SECURE LOCAL WORKSPACE
      </div>
    </div>
  );
}

