
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { db } from './services/db';
import { User, UserRole } from './types';
import { Login } from './views/Login';
import { Layout } from './components/Layout';
import { AdminDashboard } from './views/Admin';
import { FacultyDashboard } from './views/Faculty';
import { StudentDashboard } from './views/Student';
import { NotificationsPage } from './views/Notifications';
import { BugReport } from './views/BugReport';
import { Modal, Input, Button, AcropolisLogo } from './components/UI';
import { ProtectedRoute } from './components/ProtectedRoute';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings / Password Change State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    const handleChunkError = (e: any) => {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('chunkloaderror') || msg.toLowerCase().includes('loading chunk')) {
        const lastReload = localStorage.getItem('last_chunk_error_reload');
        const now = Date.now();

        // If we reloaded less than 10 seconds ago, don't loop, try a harder fix
        if (lastReload && now - parseInt(lastReload) < 10000) {
          console.error("Persistent chunk error. Attempting storage clear.");
          sessionStorage.clear();
          localStorage.removeItem('last_chunk_error_reload');
        } else {
          localStorage.setItem('last_chunk_error_reload', now.toString());
          // Force a hard reload from server
          window.location.href = window.location.origin + window.location.pathname + '?v=' + now;
        }
      }
    };
    window.addEventListener('error', handleChunkError);
    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const u = await db.getCurrentUser();
        setUser(u);
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await db.logout();
    sessionStorage.removeItem('login_intent');
    setUser(null);
  };

  const handleChangePassword = async () => {
    if (passForm.new !== passForm.confirm) {
      alert("New passwords do not match.");
      return;
    }
    if (passForm.new.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (!window.confirm("Are you sure you want to change your password?")) return;
    setSettingsLoading(true);
    try {
      await db.changePassword(passForm.current, passForm.new);
      alert("Password changed successfully.");
      setIsSettingsOpen(false);
      setPassForm({ current: '', new: '', confirm: '' });
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const getDashboardPath = (role: UserRole) => {
    const intent = sessionStorage.getItem('login_intent');
    if (intent === 'COORDINATOR' && role === UserRole.FACULTY) return '/coordinator';

    switch (role) {
      case UserRole.ADMIN: return '/admin';
      case UserRole.FACULTY: return '/faculty';
      case UserRole.STUDENT: return '/student';
      default: return '/login';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="animate-pulse mb-16">
          <AcropolisLogo className="h-32 w-32" />
        </div>
        <div className="h-1 w-48 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 animate-progress w-full"></div>
        </div>
        <style>{`
          @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-progress {
            animation: progress 1.5s infinite linear;
          }
        `}</style>
      </div>
    );
  }

  // Helper to wrap dashboards with Layout
  const DashboardLayout = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Layout
      user={user!}
      onLogout={handleLogout}
      onOpenSettings={() => setIsSettingsOpen(true)}
      title={title}
    >
      {children}
    </Layout>
  );

  return (
    <>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to={getDashboardPath(user.role)} replace /> : <Login onLogin={handleLogin} />
        } />

        <Route path="/admin/*" element={
          <ProtectedRoute user={user} allowedRoles={[UserRole.ADMIN]}>
            <DashboardLayout title="Administrator Portal">
              <Routes>
                <Route path="students/:branchId/:batchId/:studentId" element={<AdminDashboard />} />
                <Route path="students/:branchId/:batchId" element={<AdminDashboard />} />
                <Route path="students/:branchId" element={<AdminDashboard />} />
                <Route path="students" element={<AdminDashboard />} />
                <Route path="faculty/:subtab" element={<AdminDashboard />} />
                <Route path="faculty" element={<Navigate to="/admin/faculty/subjects" replace />} />
                <Route path="monitor" element={<AdminDashboard />} />
                <Route path="reports" element={<AdminDashboard />} />
                <Route path="system" element={<AdminDashboard />} />
                <Route path="notifications" element={<NotificationsPage user={user!} />} />
                <Route path="report" element={<BugReport />} />
                <Route path="*" element={<Navigate to="/admin/students" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/faculty/*" element={
          <ProtectedRoute user={user} allowedRoles={[UserRole.FACULTY]}>
            <DashboardLayout title="Faculty Dashboard">
              <Routes>
                <Route path="mark/:branchId/:subjectId" element={<FacultyDashboard user={user!} />} />
                <Route path="mark/:branchId" element={<FacultyDashboard user={user!} />} />
                <Route path="mark" element={<FacultyDashboard user={user!} />} />
                <Route path="history/:branchId/:subjectId" element={<FacultyDashboard user={user!} />} />
                <Route path="history/:branchId" element={<FacultyDashboard user={user!} />} />
                <Route path="history" element={<FacultyDashboard user={user!} />} />
                <Route path="marks/:branchId/:subjectId" element={<FacultyDashboard user={user!} />} />
                <Route path="marks/:branchId" element={<FacultyDashboard user={user!} />} />
                <Route path="marks" element={<FacultyDashboard user={user!} />} />
                <Route path="coordinator" element={<FacultyDashboard user={user!} />} />
                <Route path="notifications" element={<NotificationsPage user={user!} />} />
                <Route path="report" element={<BugReport />} />
                <Route path="*" element={<Navigate to="/faculty/mark" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/coordinator/*" element={
          <ProtectedRoute user={user} allowedRoles={[UserRole.FACULTY]}>
            <DashboardLayout title="Class Coordinator Dashboard">
              <Routes>
                <Route path="notifications" element={<NotificationsPage user={user!} />} />
                <Route path="report" element={<BugReport />} />
                <Route path="*" element={<FacultyDashboard user={user!} forceCoordinatorView={true} />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/student/*" element={
          <ProtectedRoute user={user} allowedRoles={[UserRole.STUDENT]}>
            <DashboardLayout title="Student Portal">
              <Routes>
                <Route path="dashboard" element={<StudentDashboard user={user!} />} />
                <Route path="notifications" element={<NotificationsPage user={user!} />} />
                <Route path="report" element={<BugReport />} />
                <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/report-bug" element={
          user ? (
            <DashboardLayout title="Feedback & Support">
              <BugReport />
            </DashboardLayout>
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/" element={<Navigate to={user ? getDashboardPath(user.role) : "/login"} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Settings Modal - Only render if not student and user is logged in */}
      {user && user.role !== UserRole.STUDENT && (
        <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Change Password">
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Change Password</h4>
            <Input
              label="Current Password"
              type="password"
              value={passForm.current}
              onChange={e => setPassForm({ ...passForm, current: e.target.value })}
            />
            <Input
              label="New Password"
              type="password"
              value={passForm.new}
              onChange={e => setPassForm({ ...passForm, new: e.target.value })}
              placeholder="Min 6 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passForm.confirm}
              onChange={e => setPassForm({ ...passForm, confirm: e.target.value })}
            />
            <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsSettingsOpen(false)} disabled={settingsLoading}>Cancel</Button>
              <Button onClick={handleChangePassword} disabled={!passForm.current || !passForm.new || settingsLoading}>
                {settingsLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default App;
