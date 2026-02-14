import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { User, Subject, AttendanceRecord, Mark } from '../types';
import { Card } from '../components/UI';
import { AlertCircle, CheckCircle2, Trophy } from 'lucide-react';

interface StudentProps { user: User; }

export const StudentDashboard: React.FC<StudentProps> = ({ user }) => {
   const [subjects, setSubjects] = useState<Subject[]>([]);
   const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
   const [marks, setMarks] = useState<Mark[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const loadData = async () => {
         const { branchId, batchId } = user.studentData || {};
         if (!branchId || !batchId) { setLoading(false); return; }

         const allAssignments = await db.getAssignments();
         const myClassAssignments = allAssignments.filter(a =>
            a.branchId === branchId &&
            (a.batchId === batchId || a.batchId === 'ALL')
         );
         const mySubjectIds = new Set(myClassAssignments.map(a => a.subjectId));

         const allSubs = await db.getSubjects();
         setSubjects(allSubs.filter(s => mySubjectIds.has(s.id)).sort((a, b) => a.name.localeCompare(b.name)));
         const [attData, marksData] = await Promise.all([
            db.getStudentAttendance(user.uid),
            db.getStudentMarks(user.uid)
         ]);
         setAttendance(attData);
         setMarks(marksData);
         setLoading(false);
      };
      loadData();
   }, [user.uid]);

   const extraLectures = attendance.filter(a => a.subjectId === 'sub_extra' && a.isPresent).length;

   const calc = (sid: string) => {
      const rel = attendance.filter(a => a.subjectId === sid);
      const tot = rel.length;
      const pres = rel.filter(a => a.isPresent).length;
      return { tot, pres, pct: tot === 0 ? 0 : Math.round((pres / tot) * 100) };
   };

   if (loading) return <div>Loading...</div>;

   return (
      <div className="space-y-6">
         <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold">Hello, {user.displayName}</h2>
            <p className="opacity-80 font-mono text-sm">Enrollment: {user.studentData?.enrollmentId}</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {extraLectures > 0 && (
               <Card className="border-indigo-200 bg-indigo-50/30">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="font-bold text-lg text-indigo-900">Extra Lectures</h3>
                        <p className="text-xs text-indigo-500">Co-ordinator marked sessions</p>
                     </div>
                     <div className="h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
                        <CheckCircle2 className="h-6 w-6" />
                     </div>
                  </div>
                  <div className="text-center border-t border-indigo-100 pt-3">
                     <p className="text-xs text-indigo-500 uppercase font-semibold">Total Present Count</p>
                     <p className="text-3xl font-black text-indigo-600">{extraLectures}</p>
                  </div>
               </Card>
            )}
            {subjects.length > 0 ? subjects.map(s => {
               const { tot, pres, pct } = calc(s.id);
               const isLow = pct < 75;
               const radius = 30;
               const circumference = 2 * Math.PI * radius;
               const strokeDashoffset = circumference - (pct / 100) * circumference;

               return (
                  <Card key={s.id} className="border border-slate-200">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <h3 className="font-bold text-lg text-slate-900">{s.name}</h3>
                           <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{s.code}</span>
                        </div>
                        <div className="relative flex items-center justify-center">
                           <svg className="transform -rotate-90 w-16 h-16">
                              <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" />
                              <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={isLow ? "text-red-500" : "text-green-500"} />
                           </svg>
                           <span className={`absolute text-sm font-bold ${isLow ? 'text-red-600' : 'text-indigo-600'}`}>{pct}%</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4 text-center border-t border-slate-100 pt-3">
                        <div>
                           <p className="text-xs text-slate-500 uppercase">Classes</p>
                           <p className="font-semibold text-slate-800">{pres} / {tot}</p>
                        </div>
                        <div>
                           <p className="text-xs text-slate-500 uppercase">Status</p>
                           {isLow ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Low Attendance</span>
                           ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">On Track</span>
                           )}
                        </div>
                     </div>
                  </Card>
               )
            }) : <div className="col-span-3 text-center p-10 text-slate-500 border border-dashed rounded">No subjects assigned.</div>}
         </div>

         {/* Marks Section */}
         <div className="space-y-4 pt-6">
            <div className="flex items-center gap-2">
               <Trophy className="h-5 w-5 text-indigo-600" />
               <h3 className="text-xl font-bold text-slate-900 border-b-2 border-indigo-500 pb-1">MST Marks</h3>
            </div>

            {marks.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {['MID_SEM_1', 'MID_SEM_2'].map(type => {
                     const typeMarks = marks.filter(m => m.midSemType === type);
                     if (typeMarks.length === 0) return null;

                     return (
                        <div key={type} className="space-y-3">
                           <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{type.replace('MID_SEM_', 'MST ')}</h4>
                           <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                              {typeMarks.map(m => {
                                 const sub = subjects.find(s => s.id === m.subjectId);
                                 const pct = Math.round((m.marksObtained / m.maxMarks) * 100);
                                 return (
                                    <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                       <div className="min-w-0 mr-4">
                                          <div className="font-bold text-slate-800 text-sm truncate uppercase">{sub?.name || 'Subject'}</div>
                                          <div className="text-[10px] font-bold text-slate-400">{sub?.code || m.subjectId}</div>
                                       </div>
                                       <div className="text-right flex flex-col items-end">
                                          <div className="flex items-baseline gap-1">
                                             <span className={`text-lg font-black ${pct < 40 ? 'text-rose-500' : 'text-indigo-600'}`}>{m.marksObtained}</span>
                                             <span className="text-[10px] font-bold text-slate-300">/ {m.maxMarks}</span>
                                          </div>
                                          <div className={`text-[9px] font-black uppercase ${pct < 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                             {pct}%
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     );
                  })}
               </div>
            ) : (
               <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="font-bold uppercase tracking-widest text-xs">No marks uploaded yet.</p>
               </div>
            )}
         </div>
      </div>
   );
};
