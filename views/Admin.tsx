import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { Branch, Batch, User, Subject, FacultyAssignment, AttendanceRecord } from '../types';
import { Card, Button, Input, Select, Modal, FileUploader } from '../components/UI';
import { Plus, Trash2, ChevronRight, Users, BookOpen, Database, Key, ArrowLeft, CheckCircle2, XCircle, Trash, Eye, Layers, Edit2, Calendar, Smartphone, Filter, AlertCircle, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [seeding, setSeeding] = useState(false);

  // Determine active tab from path (admin/students or admin/faculty or admin/monitor)
  const activeTab = location.pathname.includes('/admin/faculty') ? 'faculty' :
    location.pathname.includes('/admin/monitor') ? 'monitor' : 'students';

  const handleSeed = async () => {
    if (!window.confirm("This will reset/overwrite initial data. Continue?")) return;
    setSeeding(true);
    try {
      await db.seedDatabase();
      alert("Database initialized successfully!");
    } catch (e: any) {
      alert("Seeding failed: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-slate-300 pb-1">
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/admin/students')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'students' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Manage Students
          </button>
          <button
            onClick={() => navigate('/admin/faculty')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'faculty' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Manage Faculty & Subjects
          </button>
          <button
            onClick={() => navigate('/admin/monitor')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'monitor' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Today's Attendance
          </button>
        </div>
        <button onClick={handleSeed} disabled={seeding} className="mb-2 text-xs flex items-center px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded transition-colors">
          <Database className="h-3 w-3 mr-1.5" />
          {seeding ? 'Seeding...' : 'Initialize Database'}
        </button>
      </div>

      {activeTab === 'students' ? <StudentManagement /> :
        activeTab === 'faculty' ? <FacultyManagement /> : <AttendanceMonitor />}
    </div>
  );
};

// ... AdminStudentDetail component remains same ...
const AdminStudentDetail: React.FC<{ student: User; onBack: () => void }> = ({ student, onBack }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [att, subs] = await Promise.all([db.getStudentAttendance(student.uid), db.getSubjects()]);
        setAttendance(att);
        setSubjects(subs);
      } finally { setLoading(false); }
    };
    load();
  }, [student.uid]);

  const getSubjectStats = (subjectId: string) => {
    const relevant = attendance.filter(a => a.subjectId === subjectId);
    const total = relevant.length;
    const present = relevant.filter(a => a.isPresent).length;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
    return { total, present, percentage };
  };

  const subjectStats = subjects.map(s => {
    const stats = getSubjectStats(s.id);
    return { ...s, ...stats };
  }).filter(s => s.total > 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{student.displayName}</h3>
            <p className="text-sm text-slate-500 font-mono">{student.studentData?.enrollmentId} {student.studentData?.rollNo ? `| Roll: ${student.studentData.rollNo}` : ''}</p>
          </div>
        </div>
      </div>
      {loading ? <div className="p-12 text-center text-slate-500">Loading records...</div> : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectStats.map(stat => (
              <div key={stat.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2"><span className="font-semibold text-slate-800">{stat.name}</span><span className={`text-sm font-bold px-2 py-0.5 rounded ${stat.percentage < 75 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{stat.percentage}%</span></div>
                <div className="text-sm text-slate-500 flex justify-between"><span>Attended: {stat.present} / {stat.total}</span></div>
              </div>
            ))}
            {subjectStats.length === 0 && <div className="col-span-full p-4 text-center bg-slate-50 border border-dashed rounded text-slate-500">No attendance data.</div>}
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b"><tr><th className="px-4 py-2 text-slate-900">Date</th><th className="px-4 py-2 text-slate-900">Subject</th><th className="px-4 py-2 text-center text-slate-900">Slot</th><th className="px-4 py-2 text-right text-slate-900">Status</th></tr></thead>
              <tbody>
                {attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => (
                  <tr key={r.id} className="hover:bg-slate-50"><td className="px-4 py-2 text-slate-900 font-mono">{r.date}</td><td className="px-4 py-2 text-slate-900">{subjects.find(s => s.id === r.subjectId)?.name}</td><td className="px-4 py-2 text-center text-slate-900">L{r.lectureSlot || 1}</td><td className="px-4 py-2 text-right">{r.isPresent ? <span className="text-green-600 font-bold">Present</span> : <span className="text-red-600 font-bold">Absent</span>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

const StudentManagement: React.FC = () => {
  const { branchId, batchId, studentId } = useParams();
  const navigate = useNavigate();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  const [selBranch, setSelBranch] = useState<Branch | null>(null);
  const [selBatch, setSelBatch] = useState<Batch | null>(null);
  const [viewStudent, setViewStudent] = useState<User | null>(null);

  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(false);

  // Derived level
  const level = studentId ? 'detail' : batchId ? 'students' : branchId ? 'batches' : 'branches';

  useEffect(() => {
    loadInitialData();
  }, [branchId, batchId, studentId]);

  const loadInitialData = async () => {
    try {
      const allBranches = await db.getBranches();
      setBranches(allBranches);

      if (branchId) {
        const branch = allBranches.find(b => b.id === branchId);
        if (branch) {
          setSelBranch(branch);
          const bts = await db.getBatches(branchId);
          setBatches(bts);

          if (batchId) {
            const batch = bts.find(b => b.id === batchId);
            if (batch) {
              setSelBatch(batch);
              const stus = await db.getStudents(branchId, batchId);
              setStudents(stus);

              if (studentId) {
                const stu = stus.find(s => s.uid === studentId);
                if (stu) setViewStudent(stu);
              } else {
                setViewStudent(null);
              }
            }
          } else {
            setSelBatch(null);
            setStudents([]);
          }
        }
      } else {
        setSelBranch(null);
        setBatches([]);
      }
    } catch (err: any) {
      console.error("Failed to load student management data", err);
    }
  };

  const loadBranches = async () => {
    try {
      setBranches(await db.getBranches());
    } catch (err: any) {
      console.error("Load branches failed", err);
    }
  };

  const handleSelectBranch = (b: Branch) => { navigate(`/admin/students/${b.id}`); };
  const handleSelectBatch = (b: Batch) => { navigate(`/admin/students/${branchId}/${b.id}`); };
  const handleSelectStudent = (s: User) => { navigate(`/admin/students/${branchId}/${batchId}/${s.uid}`); };

  const handleAdd = async () => {
    if (!newItemName) return;
    try {
      if (level === 'branches') {
        await db.addBranch(newItemName);
        await loadBranches();
      } else if (level === 'batches' && branchId) {
        await db.addBatch(newItemName, branchId);
        const bts = await db.getBatches(branchId);
        setBatches(bts);
      }
      setNewItemName('');
    } catch (err: any) {
      alert("Error adding " + (level === 'branches' ? 'branch' : 'batch') + ": " + err.message);
    }
  };

  const handleCSVUpload = async (file: File) => {
    if (!branchId || !batchId) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newStudents: Partial<User>[] = [];
      const startIndex = lines[0].toLowerCase().includes('enrollment') ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',').map(s => s.trim());
        let enroll, roll, name, mobile;
        if (parts.length >= 4) { [enroll, roll, name, mobile] = parts; }
        else if (parts.length === 3) { [enroll, name, mobile] = parts; roll = ''; }
        if (enroll && name && mobile) {
          newStudents.push({
            displayName: name,
            studentData: { branchId, batchId, enrollmentId: enroll, rollNo: roll, mobileNo: mobile }
          });
        }
      }
      if (newStudents.length > 0) {
        try { await db.importStudents(newStudents); alert(`Imported ${newStudents.length} students.`); setStudents(await db.getStudents(branchId, batchId)); } catch (err: any) { alert("Import failed: " + err.message); }
      }
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const [newStudent, setNewStudent] = useState({ name: '', mobile: '', enroll: '', rollNo: '' });
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !batchId) return;
    setLoading(true);
    try {
      await db.createStudent({
        displayName: newStudent.name,
        studentData: { branchId, batchId, enrollmentId: newStudent.enroll, rollNo: newStudent.rollNo, mobileNo: newStudent.mobile }
      });
      setNewStudent({ name: '', mobile: '', enroll: '', rollNo: '' });
      setStudents(await db.getStudents(branchId, batchId));
      alert(`Student added.`);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete?")) return;
    try {
      if (level === 'branches') {
        await db.deleteBranch(id);
        await loadBranches();
      } else if (level === 'batches' && branchId) {
        await db.deleteBatch(id);
        const bts = await db.getBatches(branchId);
        setBatches(bts);
      } else if (level === 'students' && branchId && batchId) {
        await db.deleteUser(id);
        const stus = await db.getStudents(branchId, batchId);
        setStudents(stus);
      }
    } catch (err: any) {
      alert("Error deleting: " + err.message);
    }
  };

  if (level === 'detail' && viewStudent) return <AdminStudentDetail student={viewStudent} onBack={() => navigate(`/admin/students/${branchId}/${batchId}`)} />;

  let listItems: any[] = [];
  if (level === 'branches') listItems = branches;
  else if (level === 'batches') listItems = batches;

  return (
    <Card>
      <div className="flex items-center text-sm mb-6 text-slate-500 flex-wrap">
        <span className={`cursor-pointer hover:text-indigo-600 ${level === 'branches' ? 'font-bold text-indigo-600' : ''}`} onClick={() => navigate('/admin/students')}>Branches</span>
        {selBranch && <><ChevronRight className="h-4 w-4 mx-2" /><span className={`cursor-pointer hover:text-indigo-600 ${level === 'batches' ? 'font-bold text-indigo-600' : ''}`} onClick={() => navigate(`/admin/students/${branchId}`)}>{selBranch.name}</span></>}
        {selBatch && <><ChevronRight className="h-4 w-4 mx-2" /><span className="font-bold text-indigo-600">{selBatch.name}</span></>}
      </div>

      {level !== 'students' ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder={`New ${level === 'branches' ? 'Branch' : 'Batch'} Name`} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="flex-grow text-slate-900 bg-white" />
            <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1 inline" /> Add</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {listItems.map((item) => (
              <div key={item.id} onClick={() => { if (level === 'branches') handleSelectBranch(item); else handleSelectBatch(item); }} className="group border p-4 rounded-lg cursor-pointer bg-slate-50 hover:border-indigo-400 hover:shadow-md flex justify-between items-center">
                <div className="flex items-center"><span className="font-semibold text-slate-800">{item.name}</span></div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-slate-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded border">
            <form onSubmit={handleAddStudent} className="grid grid-cols-4 gap-4 mb-2">
              <Input label="Name" required value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} className="mb-0 text-slate-900 bg-white" />
              <Input label="Mobile No" required value={newStudent.mobile} onChange={e => setNewStudent({ ...newStudent, mobile: e.target.value })} className="mb-0 text-slate-900 bg-white" placeholder="Used as password" />
              <Input label="Enrollment" required value={newStudent.enroll} onChange={e => setNewStudent({ ...newStudent, enroll: e.target.value })} className="mb-0 text-slate-900 bg-white" />
              <Input label="Roll No" value={newStudent.rollNo} onChange={e => setNewStudent({ ...newStudent, rollNo: e.target.value })} className="mb-0 text-slate-900 bg-white" />
            </form>
            <div className="flex justify-end gap-2"><FileUploader onFileSelect={handleCSVUpload} label="Import CSV" /><Button onClick={handleAddStudent} disabled={loading}>{loading ? 'Adding...' : 'Add Student'}</Button></div>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b"><tr><th className="p-2 text-slate-900">Enrollment</th><th className="p-2 text-slate-900">Roll No</th><th className="p-2 text-slate-900">Name</th><th className="p-2 text-slate-900">Mobile No</th><th className="p-2 text-right text-slate-900">Actions</th></tr></thead>
            <tbody>{students.sort((a, b) => (a.studentData?.rollNo || '').localeCompare(b.studentData?.rollNo || '', undefined, { numeric: true })).map(s => (<tr key={s.uid} className="border-b group"><td className="p-2 font-mono text-slate-900">{s.studentData?.enrollmentId}</td><td className="p-2 font-mono text-slate-900">{s.studentData?.rollNo}</td><td className="p-2 text-slate-900">{s.displayName}</td><td className="p-2 text-slate-900 font-mono">{s.studentData?.mobileNo}</td><td className="p-2 text-right"><button onClick={() => handleSelectStudent(s)} className="text-indigo-500 mr-2 opacity-0 group-hover:opacity-100"><Eye className="h-4 w-4" /></button><button onClick={() => handleDelete(s.uid)} className="text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></td></tr>))}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

const FacultyManagement: React.FC = () => {
  const { subtab } = useParams();
  const navigate = useNavigate();

  const activeSubTab = (subtab as 'subjects' | 'faculty_list' | 'allocations') || 'subjects';
  const setActiveSubTab = (tab: string) => navigate(`/admin/faculty/${tab}`);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [newSub, setNewSub] = useState({ name: '', code: '' });
  const [newFac, setNewFac] = useState({ name: '', email: '', password: '' });

  // Assignment Form State
  const [assignForm, setAssignForm] = useState({ facultyId: '', subjectId: '', branchId: '', batchId: '' });
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<any>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedFacultyForReset, setSelectedFacultyForReset] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Maps for displaying names in table
  const [classMap, setClassMap] = useState<Record<string, string>>({}); // Actually class context names
  const [batchMap, setBatchMap] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, [activeSubTab]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [subs, facs, assigns, brs] = await Promise.all([
        db.getSubjects(),
        db.getFaculty(),
        db.getAssignments(),
        db.getBranches()
      ]);
      setSubjects(subs);
      setFaculty(facs);
      setAssignments(assigns);
      setBranches(brs);

      // Pre-fetch all batches for context efficiently
      const involvedBranchIds = Array.from(new Set(assigns.map(a => a.branchId)));
      const bMap: Record<string, string> = {};

      const batchPromises = involvedBranchIds.map(bid => db.getBatches(bid));
      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(bts => {
        bts.forEach(b => bMap[b.id] = b.name);
      });

      setBatchMap(bMap);
    } catch (err: any) {
      console.error("Failed to load faculty data", err);
      // Don't show alert here to avoid spamming, but we ensure loading is false
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadBatches = async (branchId: string) => {
    if (!branchId) return;
    try {
      setBatches(await db.getBatches(branchId));
    } catch (err: any) {
      console.error("Load batches failed", err);
    }
  };

  const handleAddSubject = async () => {
    if (newSub.name) {
      try {
        await db.addSubject(newSub.name, newSub.code);
        setNewSub({ name: '', code: '' });
        setSubjects(await db.getSubjects());
      } catch (err: any) {
        alert("Error adding subject: " + err.message);
      }
    }
  };
  const handleDeleteSubject = async (id: string) => {
    if (confirm("Delete?")) {
      try {
        await db.deleteSubject(id);
        setSubjects(await db.getSubjects());
      } catch (err: any) {
        alert("Error deleting subject: " + err.message);
      }
    }
  };
  const handleAddFaculty = async (e: React.FormEvent) => { e.preventDefault(); try { await db.createFaculty({ displayName: newFac.name, email: newFac.email }, newFac.password); setNewFac({ name: '', email: '', password: '' }); setFaculty(await db.getFaculty()); alert("Faculty added."); } catch (e: any) { alert(e.message); } };
  const handleDeleteFaculty = async (uid: string) => {
    if (confirm("Delete?")) {
      try {
        await db.deleteUser(uid);
        setFaculty(await db.getFaculty());
      } catch (err: any) {
        alert("Error deleting faculty: " + err.message);
      }
    }
  };
  const initiateResetPassword = (f: User) => { setSelectedFacultyForReset(f); setResetModalOpen(true); };
  const handleResetPassword = async () => { if (selectedFacultyForReset) { try { await db.resetFacultyPassword(selectedFacultyForReset.uid, newPasswordInput); alert("Done"); setResetModalOpen(false); setFaculty(await db.getFaculty()); } catch (e: any) { alert(e.message); } } };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignForm.facultyId && assignForm.branchId && assignForm.subjectId) {
      // Default batchId to 'ALL' if not selected
      const finalAssign = {
        ...assignForm,
        batchId: assignForm.batchId || 'ALL'
      };
      setPendingAssignment(finalAssign);
      setConfirmModalOpen(true);
    }
  };

  const confirmAssignment = async () => {
    if (pendingAssignment) {
      try {
        setIsLoadingData(true);
        if (isEditingAssignment && editingAssignmentId) {
          await db.removeAssignment(editingAssignmentId);
        }
        await db.assignFaculty(pendingAssignment);
        await loadData();
        setConfirmModalOpen(false);
        resetAssignForm();
      } catch (e: any) {
        console.error(e);
        alert("Error saving allocation: " + e.message);
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const resetAssignForm = () => {
    setAssignForm({ facultyId: '', subjectId: '', branchId: '', batchId: '' });
    setIsEditingAssignment(false);
    setEditingAssignmentId(null);
  }

  const handleDeleteAssignment = async (id: string) => { if (confirm("Remove?")) { await db.removeAssignment(id); loadData(); } };

  const handleEditAssignment = async (assignment: FacultyAssignment) => {
    setIsEditingAssignment(true);
    setEditingAssignmentId(assignment.id);
    await loadBatches(assignment.branchId);
    setAssignForm({
      facultyId: assignment.facultyId,
      branchId: assignment.branchId,
      batchId: assignment.batchId,
      subjectId: assignment.subjectId
    });
  };

  // Helper to format Context display
  const formatContext = (batchId: string) => {
    if (batchId === 'ALL') return 'All Batches';
    return batchMap[batchId] || batchId;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-200 p-1 rounded-lg inline-flex">
        <button onClick={() => setActiveSubTab('subjects')} className={`px-4 py-2 text-sm font-medium rounded ${activeSubTab === 'subjects' ? 'bg-white text-indigo-600' : 'text-slate-600'}`}>Subjects</button>
        <button onClick={() => setActiveSubTab('faculty_list')} className={`px-4 py-2 text-sm font-medium rounded ${activeSubTab === 'faculty_list' ? 'bg-white text-indigo-600' : 'text-slate-600'}`}>Faculty</button>
        <button onClick={() => setActiveSubTab('allocations')} className={`px-4 py-2 text-sm font-medium rounded ${activeSubTab === 'allocations' ? 'bg-white text-indigo-600' : 'text-slate-600'}`}>Allocations</button>
      </div>
      {isLoadingData ? <div>Loading...</div> : (
        <>
          {activeSubTab === 'subjects' && (
            <Card>
              <div className="flex gap-2 mb-4 bg-slate-50 p-4"><input placeholder="Name" className="border p-2 w-full text-slate-900 bg-white" value={newSub.name} onChange={e => setNewSub({ ...newSub, name: e.target.value })} /><input placeholder="Code" className="border p-2 w-32 text-slate-900 bg-white" value={newSub.code} onChange={e => setNewSub({ ...newSub, code: e.target.value })} /><Button onClick={handleAddSubject}>Add</Button></div>
              <table className="w-full text-sm text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-2 text-slate-900">Code</th><th className="p-2 text-slate-900">Name</th><th className="p-2 text-right text-slate-900">Action</th></tr></thead><tbody>{subjects.map(s => <tr key={s.id} className="border-b"><td className="p-2 text-slate-900">{s.code}</td><td className="p-2 text-slate-900">{s.name}</td><td className="p-2 text-right"><button onClick={() => handleDeleteSubject(s.id)}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table>
            </Card>
          )}
          {activeSubTab === 'faculty_list' && (
            <Card>
              <form onSubmit={handleAddFaculty} className="mb-4 grid grid-cols-4 gap-2 bg-slate-50 p-4"><Input label="Name" required value={newFac.name} onChange={e => setNewFac({ ...newFac, name: e.target.value })} className="mb-0 text-slate-900 bg-white" /><Input label="Email" required value={newFac.email} onChange={e => setNewFac({ ...newFac, email: e.target.value })} className="mb-0 text-slate-900 bg-white" /><Input label="Password" required value={newFac.password} onChange={e => setNewFac({ ...newFac, password: e.target.value })} className="mb-0 text-slate-900 bg-white" /><div className="flex items-end"><Button type="submit">Add</Button></div></form>
              <table className="w-full text-sm text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-2 text-slate-900">Name</th><th className="p-2 text-slate-900">Email</th><th className="p-2 text-right text-slate-900">Actions</th></tr></thead><tbody>{faculty.map(f => <tr key={f.uid} className="border-b"><td className="p-2 text-slate-900">{f.displayName}</td><td className="p-2 text-slate-900">{f.email}</td><td className="p-2 text-right flex justify-end gap-2"><button onClick={() => initiateResetPassword(f)}><Key className="h-4 w-4" /></button><button onClick={() => handleDeleteFaculty(f.uid)}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table>
            </Card>
          )}
          {activeSubTab === 'allocations' && (
            <Card>
              <div className="bg-indigo-50 p-4 rounded mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-indigo-900">{isEditingAssignment ? 'Edit Assignment' : 'New Assignment'}</h4>
                  {isEditingAssignment && <button onClick={resetAssignForm} className="text-xs text-red-600 underline">Cancel Edit</button>}
                </div>
                <form onSubmit={handleAssign} className="grid grid-cols-5 gap-2 items-end">
                  <Select label="Faculty" value={assignForm.facultyId} onChange={e => setAssignForm({ ...assignForm, facultyId: e.target.value })} className="mb-0 bg-white">{[<option key="def" value="">Select</option>, ...faculty.map(f => <option key={f.uid} value={f.uid}>{f.displayName}</option>)]}</Select>
                  <Select label="Branch" value={assignForm.branchId} onChange={e => { setAssignForm({ ...assignForm, branchId: e.target.value, batchId: '' }); loadBatches(e.target.value); }} className="mb-0 bg-white">{[<option key="def" value="">Select</option>, ...branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)]}</Select>
                  <Select label="Batch" value={assignForm.batchId} onChange={e => setAssignForm({ ...assignForm, batchId: e.target.value })} disabled={!assignForm.branchId} className="mb-0 bg-white">{[<option key="def" value="">All Batches (Default)</option>, ...batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)]}</Select>
                  <Select label="Subject" value={assignForm.subjectId} onChange={e => setAssignForm({ ...assignForm, subjectId: e.target.value })} className="mb-0 bg-white">{[<option key="def" value="">Select</option>, ...subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)]}</Select>
                  <Button type="submit" className="col-span-5 md:col-span-1">{isEditingAssignment ? 'Update' : 'Assign'}</Button>
                </form>
              </div>
              <table className="w-full text-sm text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-2 text-slate-900">Faculty</th><th className="p-2 text-slate-900">Subject</th><th className="p-2 text-slate-900">Context</th><th className="p-2 text-right text-slate-900">Action</th></tr></thead>
                <tbody>{assignments.map(a => {
                  const fac = faculty.find(f => f.uid === a.facultyId);
                  const sub = subjects.find(s => s.id === a.subjectId);
                  const br = branches.find(b => b.id === a.branchId)?.name;
                  return (<tr key={a.id} className="border-b"><td className="p-2 text-slate-900">{fac?.displayName}</td><td className="p-2 text-slate-900">{sub?.name}</td><td className="p-2 text-xs text-slate-600">
                    <div className="font-bold">{br}</div>
                    <div>{formatContext(a.batchId)}</div>
                  </td><td className="p-2 text-right flex justify-end gap-2">
                      <button onClick={() => handleEditAssignment(a)} className="text-blue-500 hover:text-blue-700"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteAssignment(a.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                    </td></tr>)
                })}</tbody></table>
            </Card>
          )}
        </>
      )}
      <Modal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="Confirm"><div className="p-4"><p>{isEditingAssignment ? 'Update this assignment?' : 'Confirm Assignment?'}</p><div className="flex justify-end gap-2 mt-4"><Button onClick={confirmAssignment}>Yes</Button></div></div></Modal>
      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title="Reset Password"><div className="p-4"><Input label="New Password" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} className="text-slate-900 bg-white" /><div className="flex justify-end gap-2 mt-4"><Button onClick={handleResetPassword}>Update</Button></div></div></Modal>
    </div>
  );
};

// Attendance Monitor View
function AttendanceMonitor() {
  const [students, setStudents] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectDate, setInspectDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [allStu, allBr, allAtt] = await Promise.all([
          db.getAllStudents(),
          db.getBranches(),
          db.getDateAttendance(inspectDate)
        ]);
        setStudents(allStu);
        setBranches(allBr);
        setAttendance(allAtt);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [inspectDate]);

  const stats = React.useMemo(() => {
    const sessionsMap = new Map<string, Set<string>>();
    attendance.forEach(a => {
      const key = `${a.branchId}_${a.batchId}`;
      if (!sessionsMap.has(key)) sessionsMap.set(key, new Set());
      sessionsMap.get(key)?.add(`${a.subjectId}_${a.lectureSlot}`);
    });

    const studentStats = students.map(s => {
      const bId = s.studentData?.branchId || '';
      const batId = s.studentData?.batchId || '';
      const sessionsForBatch = sessionsMap.get(`${bId}_${batId}`) || new Set();
      const sessionsForAll = sessionsMap.get(`${bId}_ALL`) || new Set();
      const totalSessions = new Set([...Array.from(sessionsForBatch), ...Array.from(sessionsForAll)]).size;
      const presentCount = attendance.filter(a => a.studentId === s.uid && a.isPresent).length;
      return {
        ...s,
        totalLectures: totalSessions,
        attendedLectures: presentCount,
        isIncomplete: presentCount < totalSessions
      };
    });
    return studentStats;
  }, [students, attendance]);

  const filteredStats = stats.filter(s => {
    const matchBranch = branchFilter === 'ALL' || s.studentData?.branchId === branchFilter;
    const matchStatus = !showIncompleteOnly || s.isIncomplete;
    return matchBranch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg"><Calendar className="h-5 w-5 text-indigo-600" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Daily Attendance Monitor</h3>
            <p className="text-xs text-slate-500">Track student engagement for {inspectDate === new Date().toISOString().split('T')[0] ? 'today' : inspectDate}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Date:</span>
            <input type="date" value={inspectDate} onChange={e => setInspectDate(e.target.value)} className="bg-transparent border-none text-sm font-semibold text-slate-900 focus:ring-0 appearance-none p-0 cursor-pointer" />
          </div>
          <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="mb-0 text-xs font-bold bg-white">
            <option value="ALL">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <button onClick={() => setShowIncompleteOnly(!showIncompleteOnly)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${showIncompleteOnly ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
            {showIncompleteOnly ? <AlertTriangle className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            {showIncompleteOnly ? 'Showing Incomplete' : 'Filter Incomplete'}
          </button>
        </div>
      </div>
      <Card className="p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Information</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Branch</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Mobile</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Engagement</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-500">Fetching records...</td></tr>
              ) : filteredStats.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400">No students found for this filter.</td></tr>
              ) : (
                filteredStats.map(s => (
                  <tr key={s.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{s.displayName}</div>
                      <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{s.studentData?.enrollmentId} | Roll: {s.studentData?.rollNo}</div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded uppercase">
                        {branches.find(b => b.id === s.studentData?.branchId)?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium"><Smartphone className="h-3 w-3 text-slate-400" />{s.studentData?.mobileNo || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-black text-slate-900">
                          <span className={s.attendedLectures === s.totalLectures ? 'text-green-600' : 'text-indigo-600'}>{s.attendedLectures}</span>
                          <span className="text-slate-300 mx-1">/</span>
                          <span className="text-slate-500">{s.totalLectures}</span>
                        </div>
                        <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full transition-all ${s.attendedLectures === s.totalLectures ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${s.totalLectures === 0 ? 0 : (s.attendedLectures / s.totalLectures) * 100}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {s.totalLectures === 0 ? (
                        <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">No Lectures</span>
                      ) : s.attendedLectures === s.totalLectures ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded"><CheckCircle2 className="h-3 w-3" /> COMPLETED</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded"><AlertCircle className="h-3 w-3" /> MISSING {s.totalLectures - s.attendedLectures}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
