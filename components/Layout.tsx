import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu, X, ChevronDown, Settings, Bell, Check, ExternalLink, Trash2, Smartphone, Download, Zap, ShieldCheck, Heart, Sparkles, AlertCircle } from 'lucide-react';
import { User, UserRole, Notification } from '../types';
import { db } from '../services/db';
import { AcropolisLogo, Modal, Button } from './UI';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onOpenSettings: () => void;
  title: string;
}

const InstallAppModal: React.FC<{ isOpen: boolean; onClose: () => void; onInstall: () => void; canInstall: boolean }> = ({ isOpen, onClose, onInstall, canInstall }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Install Acropolis AMS">
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="bg-indigo-100 p-4 rounded-full">
            <Sparkles className="h-12 w-12 text-indigo-600 animate-pulse" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-slate-600 text-sm leading-relaxed">
            Experience the full power of <span className="font-bold text-indigo-600">Acropolis AMS</span> by installing it as a native application on your device.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <Smartphone className="h-5 w-5 text-indigo-500 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Home Screen Access</h4>
              <p className="text-[10px] text-slate-500">Launch directly from your home screen like any other app.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Lightning Fast</h4>
              <p className="text-[10px] text-slate-500">Instant loading and smooth performance optimized for your device.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Offline Reliable</h4>
              <p className="text-[10px] text-slate-500">Access your attendance records even without an active connection.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <Download className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Auto Updates</h4>
              <p className="text-[10px] text-slate-500">Always stay up-to-date with the latest features automatically.</p>
            </div>
          </div>
        </div>

        {canInstall ? (
          <div className="flex flex-col gap-3">
            <Button onClick={onInstall} className="w-full flex items-center justify-center gap-2 py-3">
              <Download className="h-5 w-5" />
              Install App Now
            </Button>
            <button onClick={onClose} className="text-slate-400 text-xs hover:text-slate-600 transition">
              Maybe later
            </button>
          </div>
        ) : (
          <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 space-y-3">
            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> How to Install Manually
            </h4>
            <div className="space-y-2 text-xs text-indigo-700 leading-relaxed">
              <p><span className="font-bold">1.</span> Ensure you are <span className="underline">not</span> in Incognito mode.</p>
              <p><span className="font-bold">2. Android/Chrome:</span> Tap the three dots (⋮) and select <span className="font-bold">"Add to Home Screen"</span> or <span className="font-bold">"Install App"</span>.</p>
              <p><span className="font-bold">3. iPhone/Safari:</span> Tap the <span className="font-bold">Share</span> icon (box with arrow) and then <span className="font-bold">"Add to Home Screen"</span>.</p>
            </div>
            <Button onClick={onClose} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 mt-2">I Understand</Button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest text-center">
            Developed with <Heart className="h-2.5 w-2.5 inline text-red-500 fill-red-500 mb-0.5" /> by <span className="text-slate-600 font-bold">Aayush Sharma</span>
          </p>
        </div>
      </div>
    </Modal>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onOpenSettings, title }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actionedStatuses, setActionedStatuses] = useState<Record<string, 'APPROVED' | 'DENIED'>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [canInstall, setCanInstall] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const getRolePath = () => {
    const intent = sessionStorage.getItem('login_intent');
    if (intent === 'COORDINATOR' && user.role === UserRole.FACULTY) return '/coordinator';
    if (user.role === UserRole.ADMIN) return '/admin';
    if (user.role === UserRole.FACULTY) return '/faculty';
    return '/student';
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [user.uid]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const fetchNotifications = async () => {
    const data = await db.getNotifications(user.uid);
    const filtered = data
      .filter(n => n.status !== 'READ' && !deletedIds.has(n.id))
      .map(n => ({
        ...n,
        status: actionedStatuses[n.id] || n.status
      }));
    setNotifications(filtered);
  };

  const handleNotificationAction = async (notif: Notification, action: 'APPROVE' | 'DENY') => {
    if (actionedStatuses[notif.id] || notif.status !== 'PENDING') return;
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'DENIED';
    setActionedStatuses(prev => ({ ...prev, [notif.id]: newStatus }));
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: newStatus } : n));
    try {
      if (action === 'APPROVE') {
        await db.deleteAttendanceForOverwrite(notif.data.date, notif.data.branchId, notif.data.slot);
        let savedMsg = "";
        if (notif.data.payload && notif.data.payload.length > 0) {
          const now = Date.now();
          const recordsToSave = notif.data.payload.map(r => ({ ...r, timestamp: now }));
          await db.saveAttendance(recordsToSave);
          savedMsg = " and saved your attendance";
        }
        await db.createNotification({
          toUserId: notif.fromUserId,
          fromUserId: user.uid,
          fromUserName: user.displayName,
          type: 'REQUEST_APPROVED',
          status: 'PENDING',
          data: { ...notif.data, reason: `Request approved${savedMsg}.` },
          timestamp: Date.now()
        });
      } else {
        await db.createNotification({
          toUserId: notif.fromUserId,
          fromUserId: user.uid,
          fromUserName: user.displayName,
          type: 'REQUEST_DENIED',
          status: 'PENDING',
          data: notif.data,
          timestamp: Date.now()
        });
      }
      await db.updateNotificationStatus(notif.id, newStatus);
      await new Promise(r => setTimeout(r, 2500));
      fetchNotifications();
    } catch (e) {
      console.error(e);
      alert("Error processing request");
    }
  };

  const deleteNotification = async (id: string) => {
    setDeletedIds(prev => new Set(prev).add(id));
    setNotifications(prev => prev.filter(n => n.id !== id));
    await db.deleteNotification(id);
    await new Promise(r => setTimeout(r, 2500));
    fetchNotifications();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    (window as any).deferredPrompt = null;
    setCanInstall(false);
    setIsInstallModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-indigo-900 text-white shadow-md relative z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-white rounded-md p-1 flex items-center justify-center flex-shrink-0">
              <AcropolisLogo className="h-full w-full" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Acropolis AMS</h1>
              <p className="text-xs text-indigo-200 hidden sm:block">Attendance Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => navigate(`${getRolePath()}/notifications`)}
                className="p-2 rounded-full hover:bg-indigo-800 transition-colors relative"
                onMouseEnter={() => setIsNotifOpen(true)}
              >
                <Bell className="h-5 w-5 text-indigo-100" />
                {notifications.filter(n => n.status === 'PENDING').length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-indigo-900 shadow-lg animate-bounce">
                    {notifications.filter(n => n.status === 'PENDING').length}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
                  onMouseLeave={() => setIsNotifOpen(false)}
                >
                  <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
                    <div className="flex gap-3">
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            if (confirm("Clear all notifications?")) {
                              db.deleteAllNotifications(user.uid);
                              setNotifications([]);
                              fetchNotifications();
                            }
                          }}
                          className="text-[10px] text-red-500 hover:underline font-bold"
                        >Clear All</button>
                      )}
                      <button onClick={() => fetchNotifications()} className="text-[10px] text-indigo-600 hover:underline">Refresh</button>
                    </div>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-100 last:border-0 ${n.status === 'PENDING' ? 'bg-indigo-50/50' : 'bg-white'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.status === 'PENDING' ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                            <div className="flex-grow">
                              <p className="text-xs text-slate-700 flex items-center gap-2">
                                <span className="font-bold">{n.fromUserName}</span>: {n.type === 'OVERWRITE_REQUEST' ? 'Overwrite Request' : 'Approved'}
                                {n.status === 'APPROVED' && <span className="ml-auto text-[9px] bg-green-100 text-green-700 px-1 rounded font-bold uppercase">Approved</span>}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded border border-indigo-100">L{n.data.slot}</span>
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded border border-slate-200">{n.data.subjectName}</span>
                                <span className="px-1.5 py-0.5 bg-white text-slate-400 text-[10px] font-medium rounded border border-slate-100">{n.data.date}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400">{new Date(n.timestamp).toLocaleString()}</span>
                                {n.type === 'OVERWRITE_REQUEST' && n.status === 'PENDING' && (
                                  <button
                                    onClick={() => handleNotificationAction(n, 'APPROVE')}
                                    className="px-2 py-1 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-sm transition-colors"
                                  >Approve Overwrite</button>
                                )}
                                <button
                                  onClick={() => deleteNotification(n.id)}
                                  className="p-1 px-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                ><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => { navigate(`${getRolePath()}/notifications`); setIsNotifOpen(false); }}
                      className="w-full py-2 bg-slate-50 text-indigo-600 text-xs font-bold border-t border-slate-100 hover:bg-indigo-50 flex items-center justify-center gap-1"
                    >See All Notifications <ExternalLink className="h-3 w-3" /></button>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center space-x-3 p-2 hover:bg-indigo-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-semibold leading-none">{user.displayName}</span>
                  <span className="text-xs text-indigo-300 uppercase tracking-wider mt-0.5">{user.role}</span>
                </div>
                <div className="h-8 w-8 bg-indigo-700 rounded-full flex items-center justify-center border border-indigo-600"><Menu className="h-5 w-5" /></div>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                  <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">{user.displayName.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{user.displayName}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-tighter">
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">{user.role}</span>
                      {user.studentData?.enrollmentId && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">{user.studentData.enrollmentId}</span>}
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    {/* Primary Install Option - Stylized as requested */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsInstallModalOpen(true);
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-md transition-all shadow-sm"
                    >
                      <Download className="h-4 w-4 mr-3" />
                      Install Application
                    </button>

                    {user.role !== UserRole.STUDENT && (
                      <button
                        onClick={() => { setIsMenuOpen(false); onOpenSettings(); }}
                        className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                      ><Settings className="h-4 w-4 mr-3" />Change Password</button>
                    )}
                    <button
                      onClick={() => { setIsMenuOpen(false); onLogout(); }}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    ><LogOut className="h-4 w-4 mr-3" />Sign Out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6"><h2 className="text-2xl font-bold text-slate-800">{title}</h2></div>
        {children}
      </main>

      <footer className="bg-slate-200 text-slate-600 py-4 text-center text-sm border-t border-slate-300">
        <div className="flex flex-col items-center gap-1">
          <p>&copy; {new Date().getFullYear()} Acropolis Institute. All rights reserved.</p>
          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            Made with <Heart className="h-2.5 w-2.5 text-red-400 fill-red-400" /> by <span className="font-bold text-slate-500 uppercase tracking-tighter">Aayush Sharma</span>
          </p>
        </div>
      </footer>

      <InstallAppModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} onInstall={handleInstallClick} canInstall={canInstall} />
    </div>
  );
};
