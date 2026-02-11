import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { User, FacultyAssignment, AttendanceRecord, Batch } from '../types';
import { Button, Card, Modal, Input, Select } from '../components/UI';
import { Save, History, FileDown, Filter, ArrowLeft, CheckCircle2, ChevronDown, Check, X, CheckSquare, Square, XCircle, AlertCircle, AlertTriangle, Trash, Loader2, Calendar, RefreshCw, Layers } from 'lucide-react';
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Skeleton, SkeletonRow, SkeletonCard } from '../components/Skeleton';

interface FacultyProps { user: User; }

// Modern Toggle Switch Component
const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
   <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`w-16 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${checked ? 'bg-green-500' : 'bg-slate-200'
         } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
   >
      <div
         className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${checked ? 'translate-x-8' : 'translate-x-0'
            }`}
      >
         {checked ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
      </div>
   </button>
);

const CoordinatorView: React.FC<{ branchId: string; facultyUser: User; metaData: any }> = ({ branchId, facultyUser, metaData }) => {
   const [students, setStudents] = useState<User[]>([]);
   const [loading, setLoading] = useState(true);
   const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
   const [selectedSessions, setSelectedSessions] = useState<number[]>([]);
   const [status, setStatus] = useState<Record<string, boolean>>({});
   const [isSaving, setIsSaving] = useState(false);
   const [saveMessage, setSaveMessage] = useState('');
   const [history, setHistory] = useState<AttendanceRecord[]>([]);
   const [viewHistory, setViewHistory] = useState(false);

   useEffect(() => {
      const load = async () => {
         setLoading(true);
         try {
            const [stu, att] = await Promise.all([
               db.getStudents(branchId),
               db.getAttendance(branchId, 'ALL', 'sub_extra')
            ]);
            setStudents(stu.sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true })));
            setHistory(att);
         } finally {
            setLoading(false);
         }
      };
      load();
   }, [branchId]);

   const toggleSession = (idx: number) => {
      setSelectedSessions(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
   };

   useEffect(() => {
      if (selectedSessions.length === 1) {
         const slot = selectedSessions[0];
         const existing = history.filter(r => r.date === attendanceDate && r.lectureSlot === slot);
         const newStatus: Record<string, boolean> = {};
         existing.forEach(r => { if (r.isPresent) newStatus[r.studentId] = true; });
         setStatus(newStatus);
      }
   }, [attendanceDate, selectedSessions, history]);

   const toggleStudent = (uid: string) => {
      setStatus(prev => ({ ...prev, [uid]: !prev[uid] }));
   };

   const handleSave = async () => {
      if (selectedSessions.length === 0) { alert("Select at least one session."); return; }
      setIsSaving(true);
      try {
         const records: AttendanceRecord[] = [];
         const ts = Date.now();

         // Identify existing records to delete for the selected date and sessions
         const toDelete = history
            .filter(r => r.date === attendanceDate && selectedSessions.includes(r.lectureSlot || 0))
            .map(r => r.id);

         if (toDelete.length > 0) {
            await db.deleteAttendanceRecords(toDelete);
         }

         selectedSessions.forEach(slot => {
            students.forEach(s => {
               if (status[s.uid]) {
                  records.push({
                     id: `extra_${branchId}_${attendanceDate}_S${slot}_${s.uid}`,
                     date: attendanceDate, studentId: s.uid, subjectId: 'sub_extra',
                     branchId, batchId: s.studentData?.batchId || 'ALL',
                     isPresent: true, markedBy: facultyUser.uid, timestamp: ts, lectureSlot: slot
                  });
               }
            });
         });

         if (records.length > 0) {
            await db.saveAttendance(records);
         }

         setSaveMessage("Saved!");
         setHistory(await db.getAttendance(branchId, 'ALL', 'sub_extra'));
         setTimeout(() => setSaveMessage(''), 3000);
      } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
   };

   if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-indigo-500" /></div>;

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
         <div className="flex justify-between items-center bg-indigo-900 text-white p-4 rounded-xl shadow-lg">
            <div>
               <h2 className="text-xl font-bold">Class Co-ordinator Dashboard</h2>
               <p className="text-indigo-200 text-xs">Managing: {metaData.branches[branchId] || branchId}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setViewHistory(!viewHistory)}>
               {viewHistory ? <ArrowLeft className="h-4 w-4 mr-2" /> : <History className="h-4 w-4 mr-2" />}
               {viewHistory ? 'Back to Marking' : 'View Extra History'}
            </Button>
         </div>

         {!viewHistory ? (
            <Card>
               <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Date</label>
                        <Input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="mb-0" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Extra Sessions (Max 7)</label>
                        <div className="flex gap-2">
                           {[1, 2, 3, 4, 5, 6, 7].map(num => (
                              <button key={num} onClick={() => toggleSession(num)} className={`w-10 h-10 rounded-full font-bold transition-all ${selectedSessions.includes(num) ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-400 hover:border-indigo-300'}`}>
                                 {num}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-between items-center border-b pb-4">
                     <h3 className="font-bold text-slate-800 flex items-center">
                        <CheckSquare className="h-5 w-5 mr-2 text-indigo-600" />
                        Mark Present Students
                     </h3>
                     <div className="flex gap-2">
                        <button onClick={() => setStatus({})} className="text-xs text-slate-500 hover:text-red-500 underline">Clear All</button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                     {students.map(s => (
                        <div key={s.uid} onClick={() => toggleStudent(s.uid)} className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${status[s.uid] ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white hover:bg-slate-50'}`}>
                           <div className="min-w-0">
                              <div className="text-[10px] font-bold text-slate-400 font-mono">{s.studentData?.enrollmentId}</div>
                              <div className={`font-semibold text-sm truncate ${status[s.uid] ? 'text-indigo-900' : 'text-slate-700'}`}>{s.displayName}</div>
                           </div>
                           <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${status[s.uid] ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>
                              {status[s.uid] && <Check className="h-4 w-4" />}
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="flex justify-end pt-4 gap-4 items-center">
                     {saveMessage && <span className="text-green-600 font-bold animate-bounce text-sm">{saveMessage}</span>}
                     <Button onClick={handleSave} disabled={isSaving || selectedSessions.length === 0} className="px-10 h-12 text-md shadow-xl shadow-indigo-200">
                        {isSaving ? 'Processing...' : 'Save Extra Attendance'}
                     </Button>
                  </div>
               </div>
            </Card>
         ) : (
            <Card>
               <div className="space-y-4">
                  <h3 className="font-bold text-slate-800">Extra Lecture History</h3>
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                           <tr className="text-left font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                              <th className="p-3">Date</th>
                              <th className="p-3">Sessions</th>
                              <th className="p-3">Present Count</th>
                              <th className="p-3">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y">
                           {Array.from(new Set(history.map(r => r.date))).sort().reverse().map(date => {
                              const dayRecs = history.filter(r => r.date === date);
                              const slots = Array.from(new Set(dayRecs.map(r => r.lectureSlot))).sort();
                              return (
                                 <tr key={date} className="hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-900">{date}</td>
                                    <td className="p-3">
                                       <div className="flex gap-1">
                                          {slots.map(s => <span key={s} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">S{s}</span>)}
                                       </div>
                                    </td>
                                    <td className="p-3 font-bold text-indigo-600">
                                       {dayRecs.length} total entries
                                    </td>
                                    <td className="p-3 text-right">
                                       <button onClick={async () => {
                                          if (confirm(`Delete ALL ${dayRecs.length} extra lecture entries for ${date}?`)) {
                                             await db.deleteAttendanceRecords(dayRecs.map(r => r.id));
                                             setHistory(await db.getAttendance(branchId, 'ALL', 'sub_extra'));
                                          }
                                       }} className="text-red-500 hover:text-red-700">
                                          <Trash className="h-4 w-4" />
                                       </button>
                                    </td>
                                 </tr>
                              );
                           })}
                           {history.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">No history found.</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            </Card>
         )}
      </div>
   );
};

export const FacultyDashboard: React.FC<FacultyProps> = ({ user }) => {
   const navigate = useNavigate();
   const location = useLocation();
   const params = useParams();

   const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
   const [coordinatorBranchId, setCoordinatorBranchId] = useState<string | null>(null);
   const [metaData, setMetaData] = useState<{
      branches: Record<string, string>;
      batches: Record<string, string>;
      subjects: Record<string, { name: string, code: string }>;
      faculty: Record<string, string>;
      rawBatches: Batch[];
   }>({ branches: {}, batches: {}, subjects: {}, faculty: {}, rawBatches: [] });
   const [loadingInit, setLoadingInit] = useState(true);
   const [loadingStudents, setLoadingStudents] = useState(false);

   // Derived state from URL
   const activeTab = location.pathname.includes('/history') ? 'HISTORY' :
      location.pathname.includes('/coordinator') ? 'CO-ORDINATOR' : 'MARK';

   // URL Masking: We use indices to keep URLs short in the browser
   const { branchId: urlBranchId, subjectId: urlID2 } = params;

   // Assignments sorted by ID for stable indexing
   const sortedAssignments = useMemo(() => {
      return [...assignments].sort((a, b) => a.id.localeCompare(b.id));
   }, [assignments]);

   // Resolve Real IDs from URL (which might contain an index)
   const { selBranchId, selSubjectId } = useMemo(() => {
      if (!urlBranchId) return { selBranchId: '', selSubjectId: '' };

      const idx = parseInt(urlBranchId);
      if (!isNaN(idx) && idx >= 0 && idx < sortedAssignments.length) {
         return {
            selBranchId: sortedAssignments[idx].branchId,
            selSubjectId: sortedAssignments[idx].subjectId
         };
      }

      // Fallback: If it's not a valid index, assume it's a raw UID (backward compatibility)
      return { selBranchId: urlBranchId, selSubjectId: urlID2 || '' };
   }, [urlBranchId, urlID2, sortedAssignments]);

   const setSelection = (brid: string, sid: string) => {
      if (brid && sid) {
         const idx = sortedAssignments.findIndex(a => a.branchId === brid && a.subjectId === sid);
         if (idx !== -1) {
            navigate(`/faculty/${activeTab.toLowerCase()}/${idx}`);
         } else {
            // Fallback to raw IDs if not found in assignments list
            navigate(`/faculty/${activeTab.toLowerCase()}/${brid}/${sid}`);
         }
      } else if (brid) {
         navigate(`/faculty/${activeTab.toLowerCase()}/${brid}`);
      } else {
         navigate(`/faculty/${activeTab.toLowerCase()}`);
      }
   };

   const setActiveTab = (tab: 'MARK' | 'HISTORY' | 'CO-ORDINATOR') => {
      if (tab === 'CO-ORDINATOR') {
         navigate('/faculty/coordinator');
         return;
      }
      const idx = sortedAssignments.findIndex(a => a.branchId === selBranchId && a.subjectId === selSubjectId);
      const suffix = (idx !== -1) ? `/${idx}` : (selBranchId ? `/${selBranchId}` : '');
      navigate(`/faculty/${tab.toLowerCase()}${suffix}`);
   };

   // Marking State
   const [allBranchStudents, setAllBranchStudents] = useState<User[]>([]); // Cache all students in branch
   const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
   const [selectedSlots, setSelectedSlots] = useState<number[]>([1]);
   const [attendanceStatus, setAttendanceStatus] = useState<Record<string, boolean>>({});
   const [saveMessage, setSaveMessage] = useState('');
   const [allClassRecords, setAllClassRecords] = useState<AttendanceRecord[]>([]);
   const [isSaving, setIsSaving] = useState(false);
   const [isEditMode, setIsEditMode] = useState(false);
   const [showConfirmModal, setShowConfirmModal] = useState(false);

   // Conflict State
   const [conflictDetails, setConflictDetails] = useState<{
      markedBy: string;
      subjectName: string;
      slot: number;
      date: string;
      totalRecords: number;
      presentCount: number;
      timestamp: number;
   } | null>(null);
   const [idsToDelete, setIdsToDelete] = useState<string[]>([]);

   // Multi-Batch Selection State
   const [selectedMarkingBatches, setSelectedMarkingBatches] = useState<string[]>([]);
   const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);

   // History State
   const [viewHistoryStudent, setViewHistoryStudent] = useState<User | null>(null);
   const [historyFilterDate, setHistoryFilterDate] = useState('');
   const [historyStartDate, setHistoryStartDate] = useState('');
   const [historyTillDate, setHistoryTillDate] = useState('');
   const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'CUSTOM'>('ALL');
   const [attendanceThreshold, setAttendanceThreshold] = useState(75);
   const [attendanceOperator, setAttendanceOperator] = useState<'GE' | 'LE'>('LE'); // GE: >=, LE: <=
   const [showFilters, setShowFilters] = useState(false);
   const [showDeleteModal, setShowDeleteModal] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);

   // Export Flow State
   const [showExportModal, setShowExportModal] = useState(false);
   const [exportRange, setExportRange] = useState<'TILL_TODAY' | 'CUSTOM'>('TILL_TODAY');
   const [exportFormat, setExportFormat] = useState<'DETAILED' | 'COMPATIBLE'>('DETAILED');
   const [exportStartDate, setExportStartDate] = useState('');
   const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);

   // 1. Initialize Data
   useEffect(() => {
      const init = async () => {
         const [myAssignments, coordinator] = await Promise.all([
            db.getAssignments(user.uid),
            db.getCoordinatorByFaculty(user.uid)
         ]);
         const [allBranches, allSubjects, allFaculty] = await Promise.all([
            db.getBranches(),
            db.getSubjects(),
            db.getFaculty()
         ]);

         const branchMap: Record<string, string> = {};
         allBranches.forEach(b => branchMap[b.id] = b.name);
         const subjectMap: Record<string, { name: string, code: string }> = {};
         allSubjects.forEach(s => subjectMap[s.id] = { name: s.name, code: s.code });
         const facultyMap: Record<string, string> = {};
         allFaculty.forEach(f => facultyMap[f.uid] = f.displayName);

         // Fetch Batches for involved branches
         const branchIds = Array.from(new Set([
            ...myAssignments.map(a => a.branchId),
            ...(coordinator ? [coordinator.branchId] : [])
         ]));
         const batchMap: Record<string, string> = {};
         const allBatches: Batch[] = [];

         for (const bid of branchIds) {
            const bts = await db.getBatches(bid);
            bts.forEach(b => { batchMap[b.id] = b.name; allBatches.push(b); });
         }

         setMetaData({ branches: branchMap, batches: batchMap, subjects: subjectMap, faculty: facultyMap, rawBatches: allBatches });
         setAssignments(myAssignments);
         if (coordinator) setCoordinatorBranchId(coordinator.branchId);
         setLoadingInit(false);
      };
      init();
   }, [user.uid]);

   // 2. Load Branch Students & Attendance Data
   useEffect(() => {
      if (selBranchId && selSubjectId) {
         const load = async () => {
            setLoadingStudents(true);
            try {
               // Fetch ALL students for the branch, we filter in UI based on selectedMarkingBatches
               const data = await db.getStudents(selBranchId);

               // Deduplicate
               const unique = Array.from(new Map(data.map(s => [s.uid, s])).values());
               // Sort numerically by Roll No
               setAllBranchStudents(unique.sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true })));

               // Load Attendance
               // For 'ALL' batches context, we fetch everything for this subject/branch
               setAllClassRecords(await db.getAttendance(selBranchId, 'ALL', selSubjectId));
            } finally {
               setLoadingStudents(false);
            }
         };
         load();
      }
   }, [selBranchId, selSubjectId]);

   // 3. Initialize Batch Selection when Subject/Branch changes
   useEffect(() => {
      if (selBranchId && selSubjectId) {
         // Find all relevant batches for this subject assignment
         // Logic: If assigned 'ALL' -> Select all batches in branch.
         // If assigned specific -> Select specific.
         const rel = assignments.filter(a => a.branchId === selBranchId && a.subjectId === selSubjectId);
         let batchesToSelect: string[] = [];

         if (rel.some(a => a.batchId === 'ALL')) {
            batchesToSelect = metaData.rawBatches.filter(b => b.branchId === selBranchId).map(b => b.id);
         } else {
            batchesToSelect = Array.from(new Set(rel.map(a => a.batchId)));
         }
         setSelectedMarkingBatches(batchesToSelect);
      }
   }, [selBranchId, selSubjectId, assignments, metaData.rawBatches]);

   // 4. Initialize Status / Detect Edit Mode
   useEffect(() => {
      // Identify students currently visible
      const visible = allBranchStudents.filter(s => s.studentData?.batchId && selectedMarkingBatches.includes(s.studentData.batchId));

      // Check if we have existing records for the selected Date + Slots
      // Note: If multiple slots are selected, we look for *any* match to trigger edit mode.
      // If conflicts exist (e.g. Present in Slot 1, Absent in Slot 2), we prioritize the record found first.
      const existingRecords = allClassRecords.filter(r =>
         r.date === attendanceDate &&
         r.branchId === selBranchId &&
         r.subjectId === selSubjectId &&
         selectedSlots.includes(r.lectureSlot || 1)
      );

      const newStatus: Record<string, boolean> = {};
      let foundExisting = false;

      if (existingRecords.length > 0) {
         foundExisting = true;
         visible.forEach(s => {
            const rec = existingRecords.find(r => r.studentId === s.uid);
            if (rec) {
               newStatus[s.uid] = rec.isPresent;
            } else {
               // No record for this specific student in this slot? Default to Present (or keep previous state if complex merging needed, but simple is better)
               newStatus[s.uid] = true;
            }
         });
      } else {
         foundExisting = false;
         // Default to Present
         visible.forEach(s => newStatus[s.uid] = true);
      }

      setIsEditMode(foundExisting);
      setAttendanceStatus(newStatus);
   }, [selectedMarkingBatches, attendanceDate, selectedSlots, allClassRecords, selBranchId, selSubjectId, allBranchStudents]);


   // --- Selection Logic ---
   const availableBranches = useMemo(() => {
      const ids = Array.from(new Set(assignments.map(a => a.branchId))).filter(id => typeof id === 'string' && id.trim() !== '');
      return ids
         .map(id => ({ id, name: metaData.branches[id] || id }))
         .filter(b => typeof b.name === 'string' && b.name.toLowerCase() !== 'select branch');
   }, [assignments, metaData.branches]);

   const availableSubjects = useMemo(() => {
      if (!selBranchId) return [];
      // Show all subjects assigned to this faculty in this branch
      const rel = assignments.filter(a => a.branchId === selBranchId);
      const uniqueIds = Array.from(new Set(rel.map(a => a.subjectId)));
      return uniqueIds.map(sid => ({ id: sid, ...metaData.subjects[sid] }));
   }, [selBranchId, assignments, metaData.subjects]);

   // "Batches" Options for Multi-Select in Toolbar
   const sameSubjectBatches = useMemo(() => {
      if (!selBranchId || !selSubjectId) return [];

      const rel = assignments.filter(a => a.branchId === selBranchId && a.subjectId === selSubjectId);
      // If we have an 'ALL' assignment, allow selecting from ALL batches in branch
      if (rel.some(a => a.batchId === 'ALL')) return metaData.rawBatches.filter(b => b.branchId === selBranchId);

      const bids = Array.from(new Set(rel.map(a => a.batchId)));
      return bids.map(bid => ({ id: bid, name: metaData.batches[bid] || bid }));
   }, [assignments, selBranchId, selSubjectId, metaData.batches, metaData.rawBatches]);

   // Derived Students List (Visual)
   const visibleStudents = useMemo(() => {
      return allBranchStudents.filter(s => s.studentData?.batchId && selectedMarkingBatches.includes(s.studentData.batchId));
   }, [allBranchStudents, selectedMarkingBatches]);


   // --- Handlers ---
   const handleMark = (uid: string) => {
      setAttendanceStatus(prev => ({ ...prev, [uid]: !prev[uid] }));
   };

   const handleMarkAll = (status: boolean) => {
      const newStatus: Record<string, boolean> = {};
      visibleStudents.forEach(s => newStatus[s.uid] = status);
      setAttendanceStatus(prev => ({ ...prev, ...newStatus }));
   };

   const toggleSlot = (slot: number) => {
      setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot].sort());
   };

   const toggleBatchSelection = (batchId: string) => {
      setSelectedMarkingBatches(prev => {
         if (prev.includes(batchId)) return prev.filter(id => id !== batchId);
         return [...prev, batchId];
      });
   };

   const handleSaveClick = async () => {
      if (selectedSlots.length === 0) { alert("Please select at least one lecture slot."); return; }
      if (visibleStudents.length === 0) { alert("No students selected."); return; }

      setIsSaving(true);
      setConflictDetails(null);
      setIdsToDelete([]);

      try {
         // Fetch ALL attendance records for this branch/date to detect cross-subject conflicts
         const branchRecords = await db.getBranchAttendance(selBranchId, attendanceDate);

         let detectedConflict = null;
         let conflictIds: string[] = [];
         const visibleIds = new Set(visibleStudents.map(s => s.uid));

         // Iterate through selected slots and visible students
         for (const slot of selectedSlots) {
            const overlappingRecords = branchRecords.filter(r =>
               r.lectureSlot === slot && visibleIds.has(r.studentId)
            );

            if (overlappingRecords.length > 0) {
               conflictIds = [...conflictIds, ...overlappingRecords.map(r => r.id)];

               // Look for a record that is NOT from the current session context (Conflict)
               // A conflict is when someone else marked it, OR when I marked it for a DIFFERENT subject
               const conflictRec = overlappingRecords.find(r =>
                  r.subjectId !== selSubjectId || r.markedBy !== user.uid
               );

               if (conflictRec) {
                  // We found a meaningful conflict!
                  const conflictStats = {
                     present: overlappingRecords.filter(r => r.isPresent).length,
                     total: overlappingRecords.length
                  };

                  detectedConflict = {
                     markedBy: metaData.faculty[conflictRec.markedBy] || conflictRec.markedBy,
                     subjectName: metaData.subjects[conflictRec.subjectId]?.name || 'Unknown Subject',
                     slot: slot,
                     date: attendanceDate,
                     totalRecords: conflictStats.total,
                     presentCount: conflictStats.present,
                     timestamp: conflictRec.timestamp
                  };
                  break; // Show the first significant conflict found
               }
            }
         }

         setIdsToDelete(conflictIds);
         setConflictDetails(detectedConflict);
         setShowConfirmModal(true);
      } catch (e: any) {
         console.error(e);
         alert("Error verifying records: " + e.message);
      } finally {
         setIsSaving(false);
      }
   };

   const generateRecords = (): AttendanceRecord[] => {
      const records: AttendanceRecord[] = [];
      const timestamp = Date.now();

      selectedSlots.forEach(slot => {
         visibleStudents.forEach(s => {
            records.push({
               id: `${attendanceDate}_${s.uid}_L${slot}`,
               date: attendanceDate,
               studentId: s.uid,
               subjectId: selSubjectId,
               branchId: selBranchId,
               batchId: s.studentData!.batchId!,
               isPresent: attendanceStatus[s.uid] ?? true,
               markedBy: user.uid,
               timestamp: timestamp,
               lectureSlot: slot
            });
         });
      });
      return records;
   };

   const handleRequestOverwrite = async () => {
      if (!conflictDetails) return;
      setIsSaving(true);
      try {
         const allFaculty = await db.getFaculty();
         const targetUser = allFaculty.find(u => u.displayName === conflictDetails.markedBy || u.uid === conflictDetails.markedBy);

         if (!targetUser) {
            alert(`Could not find faculty user '${conflictDetails.markedBy}' to send request.`);
            return;
         }

         const pendingRecords = generateRecords();
         // Filter records only for the conflicting slot to stay precise? 
         // Or just send all selected slots? 
         // The conflict is likely one slot, but user might have selected multiple.
         // Let's send all generated records for the current selection.

         await db.createNotification({
            toUserId: targetUser.uid,
            fromUserId: user.uid,
            fromUserName: user.displayName,
            type: 'OVERWRITE_REQUEST',
            status: 'PENDING',
            data: {
               date: conflictDetails.date,
               slot: conflictDetails.slot,
               subjectName: metaData.subjects[selSubjectId]?.name || 'Unknown',
               branchId: selBranchId,
               reason: `Conflict in ${metaData.subjects[selSubjectId]?.code}`,
               payload: pendingRecords
            },
            timestamp: Date.now()
         });

         setSaveMessage(`Request sent to ${targetUser.displayName}`);
         setTimeout(() => setSaveMessage(''), 4000);
         setShowConfirmModal(false);
      } catch (e: any) {
         alert("Error sending request: " + e.message);
      } finally {
         setIsSaving(false);
      }
   };

   const executeSave = async () => {
      setIsSaving(true);
      setSaveMessage('');

      const records = generateRecords();

      try {
         // 1. Try to delete old records (Cleanup duplicates if any)
         // This is crucial for migrating from old non-canonical IDs.
         if (idsToDelete.length > 0) {
            try {
               await db.deleteAttendanceRecords(idsToDelete);
            } catch (delError: any) {
               if (delError.code === 'permission-denied') {
                  // IMPORTANT: If delete fails, we proceed. 
                  // The new record will be saved. The old duplicate will remain (Ghost Record).
                  // This is why users must update DB rules for full cleanup.
                  console.warn("Permission denied while cleaning up old records. Please update Firestore Rules.");
               } else {
                  console.warn("Could not delete old records", delError);
               }
            }
         }
         // 2. Direct Overwrite (Upsert)
         await db.saveAttendance(records);

         setSaveMessage('Attendance Saved & Synced!');

         // Refresh History
         setAllClassRecords(await db.getAttendance(selBranchId, 'ALL', selSubjectId));
         setTimeout(() => setSaveMessage(''), 3000);
         setShowConfirmModal(false);
      } catch (e: any) {
         if (e.code === 'permission-denied') {
            alert("PERMISSION DENIED: You cannot overwrite existing attendance. Please update Firestore Rules to 'allow write' for the attendance collection.");
         } else {
            alert("Error saving: " + e.message);
         }
      } finally {
         setIsSaving(false);
         setConflictDetails(null);
         setIdsToDelete([]);
      }
   };

   const handleExportCSV = () => {
      if (allClassRecords.length === 0) {
         alert("No attendance records to export.");
         return;
      }
      setShowExportModal(true);
   };

   const executeExport = () => {
      let recordsToExport = allClassRecords;

      const start = exportRange === 'CUSTOM' ? exportStartDate : '';
      const end = exportEndDate; // User said 'till today', we always bound by today if custom or till today

      recordsToExport = allClassRecords.filter(r => {
         const inStart = !start || r.date >= start;
         const inEnd = !end || r.date <= end;
         return inStart && inEnd;
      });

      if (recordsToExport.length === 0) {
         alert("No records found in the selected range.");
         return;
      }

      if (exportFormat === 'COMPATIBLE') {
         // FORMAT: Name, Enrollment, Total Sessions, Present, Percentage
         const csvRows = [['Student Name', 'Enrollment', 'Total Sessions', 'Present', 'Percentage (%)']];

         const sortedStudents = [...visibleStudents].sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true }));

         sortedStudents.forEach(s => {
            const myRecs = recordsToExport.filter(r => r.studentId === s.uid);
            const total = myRecs.length;
            const present = myRecs.filter(r => r.isPresent).length;
            const pct = total === 0 ? 0 : Math.round((present / total) * 100);
            csvRows.push([
               `"${s.displayName}"`,
               `="${s.studentData?.enrollmentId || ''}"`,
               total.toString(),
               present.toString(),
               pct.toString()
            ]);
         });

         downloadCSV(csvRows, `Attendance_Summary_${metaData.subjects[selSubjectId]?.name || 'Log'}.csv`);
      } else {
         // FORMAT: Detailed (Physical Register Style)
         // 1. Identify all unique (date, slot) pairs and sort them
         const slotsMap = new Map<string, { date: string, slot: number }>();
         recordsToExport.forEach(r => {
            const slot = r.lectureSlot || 1;
            const key = `${r.date}_L${slot}`;
            if (!slotsMap.has(key)) {
               slotsMap.set(key, { date: r.date, slot });
            }
         });

         const sortedSlots = Array.from(slotsMap.values()).sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.slot - b.slot;
         });

         // 2. Build Headers
         const headers = ['Student Name', 'Enrollment', 'Total Sessions', 'Present Count', 'Attendance %', ...sortedSlots.map(s => `${s.date} (L${s.slot})`)];
         const csvRows = [headers];

         // 3. Build Rows
         const sortedStudents = [...visibleStudents].sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true }));

         sortedStudents.forEach(s => {
            const myRecs = recordsToExport.filter(r => r.studentId === s.uid);
            const total = myRecs.length;
            const present = myRecs.filter(r => r.isPresent).length;
            const pct = total === 0 ? 0 : Math.round((present / total) * 100);

            const row = [
               `"${s.displayName}"`,
               `="${s.studentData?.enrollmentId || ''}"`,
               total.toString(),
               present.toString(),
               `${pct}%`
            ];

            sortedSlots.forEach(slotInfo => {
               const rec = myRecs.find(r => r.date === slotInfo.date && (r.lectureSlot || 1) === slotInfo.slot);
               if (rec) {
                  row.push(rec.isPresent ? 'P' : 'A');
               } else {
                  row.push('-'); // No record for this specific student in this slot
               }
            });
            csvRows.push(row);
         });

         downloadCSV(csvRows, `Attendance_Detailed_${metaData.subjects[selSubjectId]?.name || 'Log'}.csv`);
      }
      setShowExportModal(false);
   };

   const downloadCSV = (rows: string[][], filename: string) => {
      const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   // --- Delete Handler ---
   const confirmDelete = async () => {
      if (!historyFilterDate) return;
      setIsDeleting(true);
      try {
         // Identify records to delete
         const recordsToDelete = allClassRecords.filter(r => r.date === historyFilterDate);
         const ids = recordsToDelete.map(r => r.id);

         if (ids.length > 0) {
            await db.deleteAttendanceRecords(ids);

            // Local Update
            setAllClassRecords(prev => prev.filter(r => r.date !== historyFilterDate));
            setSaveMessage('Records Deleted Successfully');
            setTimeout(() => setSaveMessage(''), 3000);
         }
         setShowDeleteModal(false);
         setHistoryFilterDate(''); // Reset filter after delete
      } catch (e: any) {
         alert("Error deleting records: " + e.message);
      } finally {
         setIsDeleting(false);
      }
   };

   // --- Render Helpers ---
   const SelectionPrompt = () => (
      <div className="text-center py-20 bg-white rounded-lg border border-dashed border-slate-300">
         <Filter className="h-12 w-12 text-slate-300 mx-auto mb-3" />
         <h3 className="text-lg font-medium text-slate-600">Select Class & Subject</h3>
         <p className="text-slate-400">Choose Class and Subject to continue.</p>
      </div>
   );

   // Drill Down View
   if (viewHistoryStudent) {
      const studentRecords = allClassRecords.filter(r => r.studentId === viewHistoryStudent.uid).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const total = studentRecords.length;
      const present = studentRecords.filter(r => r.isPresent).length;
      const pct = total === 0 ? 0 : Math.round((present / total) * 100);


      return (
         <Card>
            <div className="flex items-center gap-4 mb-6">
               <button onClick={() => setViewHistoryStudent(null)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft /></button>
               <div>
                  <h3 className="text-xl font-bold text-slate-900">{viewHistoryStudent.displayName}</h3>
                  <div className="flex gap-4 text-sm text-slate-500 mt-1">
                     <span>Attendance: <strong className={pct < 75 ? 'text-red-600' : 'text-green-600'}>{pct}%</strong></span>
                     <span>({present}/{total})</span>
                  </div>
               </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
               {studentRecords.map(r => (
                  <div key={r.id} className={`p-3 rounded-lg border text-center ${r.isPresent ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                     <div className="text-xs font-semibold text-slate-500 mb-1">{r.date}</div>
                     <div className={`text-lg font-bold ${r.isPresent ? 'text-green-700' : 'text-red-700'}`}>
                        {r.isPresent ? 'P' : 'A'}
                     </div>
                     <div className="text-[10px] text-slate-400">L{r.lectureSlot || 1}</div>
                  </div>
               ))}
            </div>
         </Card>
      );
   }

   if (loadingInit) {
      return (
         <div className="space-y-6 pb-20 p-4">
            {/* Skeleton Command Center */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Skeleton width="20%" height={16} />
                     <Skeleton width="100%" height={40} />
                  </div>
                  <div className="space-y-2">
                     <Skeleton width="20%" height={16} />
                     <Skeleton width="100%" height={40} />
                  </div>
               </div>
            </div>

            {/* Skeleton Tabs */}
            <div className="flex gap-4 border-b border-slate-200 py-2">
               <Skeleton width={120} height={40} />
               <Skeleton width={120} height={40} />
            </div>

            {/* Skeleton Content */}
            <div className="space-y-4">
               <Skeleton width="100%" height={60} />
               <Skeleton width="100%" height={200} />
            </div>
         </div>
      );
   }

   const showDashboard = selBranchId && selSubjectId;

   return (
      <div className="space-y-6 pb-20">
         {/* 1. Command Center / Top Bar */}
         <Card className="bg-indigo-900 text-white border-none shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs text-indigo-200 mb-1 uppercase font-semibold">Class</label>
                  <select
                     value={selBranchId}
                     onChange={e => { setSelection(e.target.value, ''); }}
                     className="w-full bg-indigo-800 border-indigo-700 text-white rounded p-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  >
                     <option value="">Select Class</option>
                     {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs text-indigo-200 mb-1 uppercase font-semibold">Subject</label>
                  <select
                     value={selSubjectId}
                     onChange={e => setSelection(selBranchId, e.target.value)}
                     disabled={!selBranchId}
                     className="w-full bg-indigo-800 border-indigo-700 text-white rounded p-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none disabled:opacity-50"
                  >
                     <option value="">Select Subject</option>
                     {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
               </div>
            </div>
         </Card>

         <>
            {/* 2. Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
               <button
                  onClick={() => setActiveTab('MARK')}
                  className={`px-6 py-3 font-medium text-sm transition-colors flex items-center whitespace-nowrap ${activeTab === 'MARK' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Attendance
               </button>
               <button
                  onClick={() => setActiveTab('HISTORY')}
                  className={`px-6 py-3 font-medium text-sm transition-colors flex items-center whitespace-nowrap ${activeTab === 'HISTORY' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  <History className="w-4 h-4 mr-2" /> View History
               </button>
               {coordinatorBranchId && (
                  <button
                     onClick={() => setActiveTab('CO-ORDINATOR')}
                     className={`px-6 py-3 font-medium text-sm transition-colors flex items-center whitespace-nowrap ${activeTab === 'CO-ORDINATOR' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     <Layers className="w-4 h-4 mr-2" /> Class Co-ordinator
                  </button>
               )}
            </div>

            {activeTab === 'MARK' && (
               !showDashboard ? <SelectionPrompt /> : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 bg-white p-4 rounded-lg border shadow-sm ${isEditMode ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>

                        <div className="flex flex-col gap-4 flex-grow">
                           {isEditMode && (
                              <div className="flex items-center text-orange-700 font-bold text-sm mb-1">
                                 <AlertCircle className="h-4 w-4 mr-2" />
                                 Editing Existing Attendance
                              </div>
                           )}
                           <div className="flex flex-col sm:flex-row gap-4">
                              <div className="w-full sm:w-48">
                                 <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
                                 <input
                                    type="date"
                                    value={attendanceDate}
                                    onChange={e => setAttendanceDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                 />
                              </div>

                              {/* Multi Batch Selector */}
                              <div className="w-full sm:w-64 relative">
                                 <label className="block text-xs font-semibold text-slate-500 mb-1">Batches</label>
                                 <button
                                    onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 flex justify-between items-center focus:ring-2 focus:ring-indigo-500"
                                 >
                                    <span className="truncate">{selectedMarkingBatches.length > 0 ? `${selectedMarkingBatches.length} Selected` : 'Select Batches'}</span>
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                 </button>

                                 {isBatchDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 shadow-lg rounded-md z-10 max-h-60 overflow-y-auto">
                                       {sameSubjectBatches.map(b => {
                                          const isSelected = selectedMarkingBatches.includes(b.id);
                                          return (
                                             <div
                                                key={b.id}
                                                onClick={() => toggleBatchSelection(b.id)}
                                                className="px-3 py-2 hover:bg-indigo-50 cursor-pointer flex items-center text-sm"
                                             >
                                                {isSelected ? <CheckSquare className="h-4 w-4 text-indigo-600 mr-2" /> : <Square className="h-4 w-4 text-slate-300 mr-2" />}
                                                <span className={isSelected ? 'text-indigo-900 font-medium' : 'text-slate-600'}>{b.name}</span>
                                             </div>
                                          );
                                       })}
                                       {sameSubjectBatches.length === 0 && <div className="p-2 text-xs text-slate-400 text-center">No batches found</div>}
                                    </div>
                                 )}
                                 {isBatchDropdownOpen && (
                                    <div className="fixed inset-0 z-0" onClick={() => setIsBatchDropdownOpen(false)}></div>
                                 )}
                              </div>
                           </div>

                           <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Lecture Slots</label>
                              <div className="flex gap-1 flex-wrap">
                                 {[1, 2, 3, 4, 5, 6, 7].map(slot => (
                                    <button
                                       key={slot}
                                       onClick={() => toggleSlot(slot)}
                                       className={`w-8 h-9 rounded text-sm font-medium transition-colors ${selectedSlots.includes(slot) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                       {slot}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleMarkAll(true)} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200">All Present</button>
                           <button onClick={() => handleMarkAll(false)} className="text-xs px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200">All Absent</button>
                        </div>
                     </div>

                     {/* Mobile Student List (Cards) */}
                     <div className="md:hidden space-y-3 pb-20">
                        {loadingStudents ? (
                           // Mobile Skeletons
                           Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-3">
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 w-full">
                                       <Skeleton variant="circular" width={32} height={32} />
                                       <div className="space-y-1 w-full max-w-[150px]">
                                          <Skeleton width="80%" height={16} />
                                          <Skeleton width="40%" height={12} />
                                       </div>
                                    </div>
                                    <Skeleton width={48} height={24} className="rounded-full" />
                                 </div>
                              </div>
                           ))
                        ) : (
                           <>
                              {visibleStudents.map((s) => (
                                 <div key={s.uid} className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between ${!attendanceStatus[s.uid] ? 'bg-red-50/50 border-red-200' : ''}`}>
                                    <div className="flex-1 min-w-0 mr-4">
                                       <div className="flex items-center gap-2 mb-1">
                                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                             {s.studentData?.rollNo || '#'}
                                          </span>
                                          <span className="text-xs text-slate-400 font-mono truncate">{s.studentData?.enrollmentId}</span>
                                       </div>
                                       <h4 className="font-semibold text-slate-900 truncate">{s.displayName}</h4>
                                    </div>
                                    <ToggleSwitch
                                       checked={attendanceStatus[s.uid] ?? true}
                                       onChange={() => handleMark(s.uid)}
                                    />
                                 </div>
                              ))}
                              {visibleStudents.length === 0 && (
                                 <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    No students found.
                                 </div>
                              )}
                           </>
                        )}
                     </div>

                     {/* Desktop Student List (Table) */}
                     <div className="hidden md:block bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                           <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                 <th className="py-3 px-4 text-xs font-bold text-slate-900 uppercase tracking-wider w-20">Roll</th>
                                 <th className="py-3 px-4 text-xs font-bold text-slate-900 uppercase tracking-wider">Student Details</th>
                                 <th className="py-3 px-4 text-xs font-bold text-slate-900 uppercase tracking-wider text-center w-32">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {loadingStudents ? (
                                 // Table Skeletons
                                 Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                       <td className="py-3 px-4"><Skeleton width={30} height={16} /></td>
                                       <td className="py-3 px-4">
                                          <div className="space-y-1">
                                             <Skeleton width={120} height={16} />
                                             <Skeleton width={80} height={12} />
                                          </div>
                                       </td>
                                       <td className="py-3 px-4 flex justify-center"><Skeleton width={48} height={24} className="rounded-full" /></td>
                                    </tr>
                                 ))
                              ) : (
                                 <>
                                    {visibleStudents.map((s) => (
                                       <tr key={s.uid} className={`hover:bg-slate-50 transition-colors ${!attendanceStatus[s.uid] ? 'bg-red-50/30' : ''}`}>
                                          <td className="py-3 px-4 text-slate-900 font-mono text-sm">{s.studentData?.rollNo || '-'}</td>
                                          <td className="py-3 px-4">
                                             <div className="font-semibold text-slate-900 text-sm">{s.displayName}</div>
                                             <div className="text-xs text-slate-500 font-mono">{s.studentData?.enrollmentId}</div>
                                          </td>
                                          <td className="py-3 px-4 text-center">
                                             <div className="flex justify-center">
                                                <ToggleSwitch
                                                   checked={attendanceStatus[s.uid] ?? true}
                                                   onChange={() => handleMark(s.uid)}
                                                />
                                             </div>
                                          </td>
                                       </tr>
                                    ))}
                                    {visibleStudents.length === 0 && (
                                       <tr><td colSpan={3} className="p-8 text-center text-slate-400">No students found in selected batches.</td></tr>
                                    )}
                                 </>
                              )}
                           </tbody>
                        </table>
                     </div>

                     {/* Sticky Footer */}
                     <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-indigo-100 p-3 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center md:pl-8 md:pr-8 safe-area-pb">
                        <div className="text-xs sm:text-sm font-medium text-slate-600">
                           <span className="hidden xs:inline text-slate-400 font-bold">Marking: </span><span className="text-indigo-600 font-bold">{visibleStudents.filter(s => attendanceStatus[s.uid]).length}</span><span className="text-slate-400 font-bold">/</span><span className="text-slate-900 font-bold">{visibleStudents.length}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                           {saveMessage && <span className="text-green-600 text-[10px] sm:text-sm font-medium animate-pulse">{saveMessage}</span>}
                           <Button onClick={handleSaveClick} disabled={isSaving} className="shadow-lg shadow-indigo-200 text-xs sm:text-sm py-2 px-4 h-auto">
                              {isSaving ? '...' : isEditMode ? 'Update' : `Save Attendance`}
                           </Button>
                        </div>
                     </div>
                  </div>
               )
            )}

            {activeTab === 'HISTORY' && (
               !showDashboard ? <SelectionPrompt /> : (
                  <Card>
                     <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 gap-4">
                        <h3 className="font-bold text-lg text-slate-800">Class Attendance Log</h3>
                        <div className="flex gap-3 items-center">

                           {/* Filter Toggle */}
                           {!historyFilterDate && (
                              <div className="relative">
                                 <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                    title="Filter Options"
                                 >
                                    <Filter className="h-5 w-5" />
                                 </button>

                                 {showFilters && (
                                    <div className="fixed md:absolute inset-x-4 md:inset-auto top-1/2 md:top-full right-auto md:right-0 -translate-y-1/2 md:translate-y-0 mt-3 w-auto md:w-96 bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] border border-slate-200 p-5 sm:p-7 z-50 animate-in fade-in fill-mode-both zoom-in-95 duration-200 origin-center md:origin-top-right">
                                       <div className="flex flex-col gap-6">
                                          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                                             <div className="p-1.5 bg-indigo-50 rounded-lg">
                                                <Filter className="h-4 w-4 text-indigo-600" />
                                             </div>
                                             <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Attendance Filters</span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-4">
                                             <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">From Date</label>
                                                <div className="relative group">
                                                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                                                   <input
                                                      type="date"
                                                      value={historyStartDate}
                                                      onChange={e => setHistoryStartDate(e.target.value)}
                                                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                                                   />
                                                </div>
                                             </div>
                                             <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">To Date</label>
                                                <div className="relative group">
                                                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                                                   <input
                                                      type="date"
                                                      value={historyTillDate}
                                                      onChange={e => setHistoryTillDate(e.target.value)}
                                                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                                                   />
                                                </div>
                                             </div>
                                          </div>

                                          <div className="space-y-2">
                                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Threshold</label>
                                             <div className="flex flex-col gap-3">
                                                <div className="relative">
                                                   <select
                                                      value={attendanceFilter}
                                                      onChange={e => setAttendanceFilter(e.target.value as any)}
                                                      className="w-full appearance-none px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                   >
                                                      <option value="ALL">Show All Percentage</option>
                                                      <option value="CUSTOM">Custom Percentage Range</option>
                                                   </select>
                                                   <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                                </div>

                                                {attendanceFilter === 'CUSTOM' && (
                                                   <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                                                      <select
                                                         value={attendanceOperator}
                                                         onChange={e => setAttendanceOperator(e.target.value as any)}
                                                         className="w-16 px-2 py-2.5 text-xs bg-indigo-50 border border-indigo-100 rounded-xl font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                      >
                                                         <option value="GE">≥</option>
                                                         <option value="LE">≤</option>
                                                      </select>
                                                      <div className="relative flex-grow group">
                                                         <input
                                                            type="number"
                                                            value={attendanceThreshold}
                                                            onChange={e => setAttendanceThreshold(Number(e.target.value))}
                                                            className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                                         />
                                                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 group-focus-within:text-indigo-500">%</span>
                                                      </div>
                                                   </div>
                                                )}
                                             </div>
                                          </div>

                                          <div className="pt-6 border-t border-slate-100 flex gap-4 items-center">
                                             <button
                                                onClick={() => { setHistoryStartDate(''); setHistoryTillDate(''); setAttendanceFilter('ALL'); setAttendanceThreshold(75); }}
                                                className="flex-1 px-4 py-2.5 text-[10px] text-slate-500 bg-slate-50 hover:bg-red-50 hover:text-red-500 border border-slate-200 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                             >
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                Reset
                                             </button>
                                             <button
                                                onClick={() => setShowFilters(false)}
                                                className="flex-1 px-4 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                                             >
                                                Apply
                                             </button>
                                          </div>
                                       </div>
                                    </div>
                                 )}
                                 {showFilters && <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)}></div>}
                              </div>
                           )}

                           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">{historyFilterDate ? 'On Date:' : 'Inspect Date:'}</label>
                              <div className="flex items-center gap-2">
                                 <input
                                    type="date"
                                    value={historyFilterDate}
                                    onChange={e => { setHistoryFilterDate(e.target.value); setHistoryTillDate(''); }}
                                    className="w-full sm:w-auto px-2 py-1.5 text-sm bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                 />
                                 {historyFilterDate && <button onClick={() => setHistoryFilterDate('')} className="text-slate-400 hover:text-slate-600"><XCircle className="h-4 w-4" /></button>}
                              </div>
                           </div>
                           {historyFilterDate && (
                              <button
                                 onClick={() => setShowDeleteModal(true)}
                                 disabled={allClassRecords.filter(r => r.date === historyFilterDate).length === 0}
                                 className="w-full sm:w-auto p-2 rounded-lg transition-colors bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                 title="Delete all attendance records for this date"
                              >
                                 <Trash className="h-5 w-5 sm:h-4 sm:w-4" />
                                 <span className="sm:hidden ml-2 text-xs font-bold uppercase">Delete Record</span>
                              </button>
                           )}
                           <Button variant="secondary" onClick={handleExportCSV} disabled={allClassRecords.length === 0} className="w-full sm:w-auto justify-center">
                              <FileDown className="h-4 w-4 mr-2" /> Export CSV
                           </Button>
                        </div >
                     </div >

                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-900">
                           <thead className="bg-slate-50 border-b">
                              <tr>
                                 <th className="p-3 text-slate-900 font-bold">Roll</th>
                                 <th className="p-3 text-slate-900 font-bold">Name</th>
                                 {historyFilterDate ? (
                                    <>
                                       <th className="p-3 text-slate-900 font-bold text-center">Batch</th>
                                       <th className="p-3 text-slate-900 font-bold text-center">Date Status ({historyFilterDate})</th>
                                    </>
                                 ) : (
                                    <>
                                       <th className="p-3 text-slate-900 font-bold text-center">Total Sessions</th>
                                       <th className="p-3 text-slate-900 font-bold text-center">Present</th>
                                       <th className="p-3 text-slate-900 font-bold text-center">%</th>
                                       <th className="p-3 text-slate-900 font-bold text-right">Action</th>
                                    </>
                                 )}
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {visibleStudents.filter(s => {
                                 if (historyFilterDate) return true;

                                 // Filter records based on date range
                                 const myRecs = allClassRecords.filter(r => r.studentId === s.uid);
                                 const filteredRecs = myRecs.filter(r => {
                                    const inStart = !historyStartDate || r.date >= historyStartDate;
                                    const inEnd = !historyTillDate || r.date <= historyTillDate;
                                    return inStart && inEnd;
                                 });

                                 if (attendanceFilter === 'CUSTOM') {
                                    const total = filteredRecs.length;
                                    const present = filteredRecs.filter(r => r.isPresent).length;
                                    const pct = total === 0 ? 0 : Math.round((present / total) * 100);

                                    if (attendanceOperator === 'GE') return pct >= attendanceThreshold;
                                    if (attendanceOperator === 'LE') return pct <= attendanceThreshold;
                                 }
                                 return true;
                              }).map(s => {
                                 // Calculate correct stats for the row display based on range
                                 const myRecs = allClassRecords.filter(r => r.studentId === s.uid);
                                 const filteredRecs = myRecs.filter(r => {
                                    const inStart = !historyStartDate || r.date >= historyStartDate;
                                    const inEnd = !historyTillDate || r.date <= historyTillDate;
                                    return inStart && inEnd;
                                 });

                                 if (historyFilterDate) {
                                    // DATE VIEW
                                    const dateRecs = myRecs.filter(r => r.date === historyFilterDate);

                                    return (
                                       <tr key={s.uid} className="hover:bg-indigo-50 transition-colors">
                                          <td className="p-3 font-mono text-slate-600">{s.studentData?.rollNo}</td>
                                          <td className="p-3 font-medium text-slate-900">{s.displayName}</td>
                                          <td className="p-3 text-center text-slate-500">{metaData.batches[s.studentData?.batchId || ''] || s.studentData?.batchId}</td>
                                          <td className="p-3 text-center">
                                             {dateRecs.length > 0 ? (
                                                <div className="flex gap-2 justify-center flex-wrap">
                                                   {dateRecs.map(r => (
                                                      <span key={r.id} className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${r.isPresent ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                         L{r.lectureSlot || 1}: {r.isPresent ? 'P' : 'A'}
                                                      </span>
                                                   ))}
                                                </div>
                                             ) : (
                                                <span className="text-slate-400 italic">No Data</span>
                                             )}
                                          </td>
                                       </tr>
                                    )
                                 } else {
                                    // AGGREGATE VIEW
                                    const total = filteredRecs.length;
                                    const present = filteredRecs.filter(r => r.isPresent).length;
                                    const pct = total === 0 ? 0 : Math.round((present / total) * 100);

                                    return (
                                       <tr key={s.uid} onClick={() => setViewHistoryStudent(s)} className="hover:bg-indigo-50 cursor-pointer transition-colors group">
                                          <td className="p-3 font-mono text-slate-600">{s.studentData?.rollNo}</td>
                                          <td className="p-3 font-medium text-slate-900">{s.displayName}</td>
                                          <td className="p-3 text-center text-slate-600">{total}</td>
                                          <td className="p-3 text-center text-green-700 font-medium">{present}</td>
                                          <td className="p-3 text-center">
                                             <span className={`px-2 py-0.5 rounded text-xs font-bold ${pct < 75 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{pct}%</span>
                                          </td>
                                          <td className="p-3 text-right text-slate-400 group-hover:text-indigo-600">
                                             <ChevronDown className="h-4 w-4 inline transform -rotate-90" />
                                          </td>
                                       </tr>
                                    );
                                 }
                              })
                              }
                           </tbody >
                        </table >
                     </div >
                  </Card >
               )
            )}

            {activeTab === 'CO-ORDINATOR' && coordinatorBranchId && (
               <CoordinatorView
                  branchId={coordinatorBranchId}
                  facultyUser={user}
                  metaData={metaData}
               />
            )}


            {/* Confirmation / Conflict Modal */}
            <Modal
               isOpen={showConfirmModal}
               onClose={() => setShowConfirmModal(false)}
               title={conflictDetails ? "⚠️ ATTENTION: CONFLICT" : (isEditMode ? "Confirm Update" : "Confirm Submission")}
            >
               {conflictDetails ? (
                  <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                     <div className="bg-red-50 border-l-4 border-red-600 p-5 rounded-r-md">
                        <div className="flex items-start gap-4">
                           <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
                           <div>
                              <h4 className="font-extrabold text-red-900 text-base uppercase tracking-wide">Record Already Exists</h4>
                              <p className="text-red-900 text-sm mt-1">
                                 Attendance for <span className="font-bold underline">Slot {conflictDetails.slot}</span> on <span className="font-bold">{conflictDetails.date}</span> was previously marked.
                              </p>

                              <div className="mt-4 bg-white p-4 rounded border border-red-200 shadow-sm">
                                 <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Previous Entry By</div>
                                 <div className="font-bold text-lg text-slate-800">{conflictDetails.markedBy}</div>
                                 <div className="text-sm font-medium text-indigo-700 mb-1">{conflictDetails.subjectName}</div>
                                 <div className="text-xs text-slate-500 border-t border-slate-100 pt-2 mt-2">
                                    Last Updated: {new Date(conflictDetails.timestamp).toLocaleString()}
                                 </div>
                                 <div className="flex gap-4 mt-3 text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded">
                                    <span className="flex items-center"><CheckCircle2 className="h-4 w-4 mr-1 text-green-600" /> {conflictDetails.presentCount} Present</span>
                                    <span className="flex items-center"><XCircle className="h-4 w-4 mr-1 text-red-600" /> {conflictDetails.totalRecords - conflictDetails.presentCount} Absent</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="px-2">
                        <p className="font-semibold text-slate-800 text-sm">Action Required:</p>
                        <p className="text-sm text-slate-600 mt-1">
                           {conflictDetails.markedBy === user.displayName
                              ? <>You are about to <span className="font-bold text-red-600">OVERWRITE</span> the existing attendance record with your current selection.</>
                              : <>This record belongs to another faculty member ({conflictDetails.markedBy}). You cannot overwrite it directly.</>
                           }
                        </p>
                     </div >

                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                        <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                        {conflictDetails.markedBy === user.displayName ? (
                           <Button variant="danger" onClick={executeSave} disabled={isSaving}>YES, OVERWRITE</Button>
                        ) : (
                           <Button onClick={handleRequestOverwrite} disabled={isSaving} className="bg-indigo-600 text-white hover:bg-indigo-700">
                              Request Permission
                           </Button>
                        )}
                     </div >
                  </div >
               ) : (
                  <div className="space-y-4">
                     <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-2">
                        <div className="flex justify-between"><span className="text-slate-500">Subject:</span> <span className="font-semibold text-slate-900">{metaData.subjects[selSubjectId]?.name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-900">{attendanceDate}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Slots:</span> <span className="font-semibold text-slate-900">L{selectedSlots.join(', L')}</span></div>
                        <div className="flex justify-between items-start"><span className="text-slate-500">Batches:</span> <div className="text-right font-semibold text-slate-900">{selectedMarkingBatches.map(b => metaData.batches[b]).join(', ')}</div></div>
                     </div>

                     <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-green-50 text-green-800 rounded-lg border border-green-100">
                           <div className="text-2xl font-bold">{visibleStudents.filter(s => attendanceStatus[s.uid]).length}</div>
                           <div className="text-xs uppercase font-semibold opacity-70">Present</div>

                        </div>
                        <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-100">
                           <div className="text-2xl font-bold">{visibleStudents.filter(s => !attendanceStatus[s.uid]).length}</div>
                           <div className="text-xs uppercase font-semibold opacity-70">Absent</div>
                        </div>
                     </div >

                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                        <Button onClick={executeSave} disabled={isSaving}>
                           {isSaving ? 'Processing...' : 'Confirm & Save'}
                        </Button>
                     </div>


                  </div >
               )}
            </Modal >
            {/* Delete Confirmation Modal */}
            <Modal
               isOpen={showDeleteModal}
               onClose={() => setShowDeleteModal(false)}
               title="⚠️ Delete Attendance Record"
            >
               <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                     <p className="text-red-800 text-sm font-medium">
                        Are you sure you want to delete all attendance records for this date?
                     </p>
                     <div className="mt-3 text-sm text-red-900 space-y-1">
                        <p><strong>Subject:</strong> {metaData.subjects[selSubjectId]?.name}</p>
                        <p><strong>Date:</strong> {historyFilterDate}</p>
                        <p><strong>Records Found:</strong> {allClassRecords.filter(r => r.date === historyFilterDate).length}</p>
                     </div>
                  </div>
                  <p className="text-xs text-slate-500">This action cannot be undone. All student statuses for this date will be removed.</p>

                  <div className="flex justify-end gap-3 pt-2">
                     <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                     <Button variant="danger" onClick={confirmDelete} disabled={isDeleting} className="min-w-[120px] justify-center flex">
                        {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...</> : 'Confirm Delete'}
                     </Button>
                  </div>
               </div>
            </Modal>

            {/* Export Modal */}
            <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Export Attendance">
               <div className="space-y-6">
                  {/* Date Range Selection */}
                  <div className="space-y-3">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Date Range</label>
                     <div className="grid grid-cols-2 gap-3">
                        <button
                           onClick={() => setExportRange('TILL_TODAY')}
                           className={`p-3 rounded-xl border-2 text-left transition-all ${exportRange === 'TILL_TODAY' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                        >
                           <div className="text-sm">Till Today</div>
                           <div className="text-[10px] opacity-70 font-normal">All records up to now</div>
                        </button>
                        <button
                           onClick={() => setExportRange('CUSTOM')}
                           className={`p-3 rounded-xl border-2 text-left transition-all ${exportRange === 'CUSTOM' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                        >
                           <div className="text-sm">Custom Range</div>
                           <div className="text-[10px] opacity-70 font-normal">Specific date range</div>
                        </button>
                     </div>

                     {exportRange === 'CUSTOM' && (
                        <div className="grid grid-cols-2 gap-3 pt-2 animate-in slide-in-from-top-2 duration-200">
                           <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                              <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">End Date</label>
                              <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Format Selection */}
                  <div className="space-y-3">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Export Format</label>
                     <div className="space-y-3">
                        <button
                           onClick={() => setExportFormat('DETAILED')}
                           className={`w-full p-4 rounded-xl border-2 text-left transition-all group ${exportFormat === 'DETAILED' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                        >
                           <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${exportFormat === 'DETAILED' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-500'}`}>
                                 <Calendar className="h-5 w-5" />
                              </div>
                              <div>
                                 <div className={`font-black text-sm uppercase tracking-tight ${exportFormat === 'DETAILED' ? 'text-indigo-900' : 'text-slate-700'}`}>Detailed Attendance</div>
                                 <p className="text-xs text-slate-500 mt-0.5">Physical Register style (Date columns, P/A markings)</p>
                              </div>
                           </div>
                        </button>

                        <button
                           onClick={() => setExportFormat('COMPATIBLE')}
                           className={`w-full p-4 rounded-xl border-2 text-left transition-all group ${exportFormat === 'COMPATIBLE' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                        >
                           <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${exportFormat === 'COMPATIBLE' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-500'}`}>
                                 <FileDown className="h-5 w-5" />
                              </div>
                              <div>
                                 <div className={`font-black text-sm uppercase tracking-tight ${exportFormat === 'COMPATIBLE' ? 'text-indigo-900' : 'text-slate-700'}`}>Compatible Attendance</div>
                                 <p className="text-xs text-slate-500 mt-0.5">Summary view (Name, Enrollment, Total, %, etc.)</p>
                              </div>
                           </div>
                        </button>
                     </div>
                  </div>

                  <div className="pt-6 flex gap-3 border-t border-slate-100">
                     <Button variant="secondary" onClick={() => setShowExportModal(false)} className="flex-1 px-6">Cancel</Button>
                     <Button onClick={executeExport} className="flex-[2] bg-indigo-600 text-white px-8 h-12 text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                        <FileDown className="h-4 w-4 mr-2" /> Download Report
                     </Button>
                  </div>
               </div>
            </Modal>
         </>
      </div>
   );
};

