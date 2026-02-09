
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { User, Notification } from '../types';
import { Card, Button } from '../components/UI';
import { Bell, Check, X, Clock, Trash2, RefreshCw, ArrowLeft } from 'lucide-react';

interface NotificationsProps {
    user: User;
}

export const NotificationsPage: React.FC<NotificationsProps> = ({ user }) => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    // Track local changes to handle DB lag/flicker
    const [actionedStatuses, setActionedStatuses] = useState<Record<string, 'APPROVED' | 'DENIED'>>({});
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

    const fetchNotifs = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await db.getNotifications(user.uid);
            // Apply local overrides and filter out deleted/read
            const filtered = data
                .filter(n => n.status !== 'READ' && !deletedIds.has(n.id))
                .map(n => ({
                    ...n,
                    status: actionedStatuses[n.id] || n.status
                }));
            setNotifications(filtered);
        } catch (e) {
            console.error("Fetch failed", e);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifs();
    }, [user.uid]);

    const handleAction = async (notif: Notification, action: 'APPROVE' | 'DENY') => {
        if (actionedStatuses[notif.id] || notif.status !== 'PENDING') return;

        const newStatus = action === 'APPROVE' ? 'APPROVED' : 'DENIED';

        // 1. Authoritative Local Update
        setActionedStatuses(prev => ({ ...prev, [notif.id]: newStatus }));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: newStatus } : n));

        try {
            if (action === 'APPROVE') {
                await db.deleteAttendanceForOverwrite(notif.data.date, notif.data.branchId, notif.data.slot);
                if (notif.data.payload && notif.data.payload.length > 0) {
                    const now = Date.now();
                    const recordsToSave = notif.data.payload.map((r: any) => ({ ...r, timestamp: now }));
                    await db.saveAttendance(recordsToSave);
                }
                await db.createNotification({
                    toUserId: notif.fromUserId,
                    fromUserId: user.uid,
                    fromUserName: user.displayName,
                    type: 'REQUEST_APPROVED',
                    status: 'PENDING',
                    data: { ...notif.data, reason: 'Request approved and attendance synced.' },
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

            // 3. Mark in DB
            await db.updateNotificationStatus(notif.id, newStatus);

            // 4. Wait for DB to settle fully before background refresh
            await new Promise(r => setTimeout(r, 2500));
            await fetchNotifs(true);
        } catch (e) {
            console.error(e);
            alert("Action failed. Please try again.");
            // Revert state on error? Or just refresh
            fetchNotifs();
        }
    };

    const markRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));

        await db.updateNotificationStatus(id, 'READ');

        // Wait for DB to settle
        await new Promise(r => setTimeout(r, 800));
        fetchNotifs(true);
    };

    const deleteNotif = async (id: string) => {
        // 1. Permanent local removal
        setDeletedIds(prev => new Set(prev).add(id));
        setNotifications(prev => prev.filter(n => n.id !== id));

        try {
            await db.deleteNotification(id);
            await new Promise(r => setTimeout(r, 2000));
            await fetchNotifs(true);
        } catch (e) {
            console.error(e);
        }
    };

    const clearAll = async () => {
        if (notifications.length === 0) return;
        if (!confirm("Are you sure you want to clear all notifications?")) return;

        // Optimistic UI update
        const originalNotifs = [...notifications];
        const ids = new Set(notifications.map(n => n.id));
        setDeletedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.add(id));
            return next;
        });
        setNotifications([]);

        try {
            await db.deleteAllNotifications(user.uid);
            await new Promise(r => setTimeout(r, 2000));
            await fetchNotifs(true);
        } catch (e) {
            console.error("Clear all failed", e);
            setNotifications(originalNotifs); // Revert on error
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
                        title="Go Back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="h-6 w-6 text-indigo-600" />
                        General Notifications
                    </h3>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => clearAll()} className="flex items-center gap-2 text-red-600 hover:bg-red-50 border-red-100">
                        <Trash2 className="h-4 w-4" />
                        Clear All
                    </Button>
                    <Button variant="secondary" onClick={() => fetchNotifs()} className="flex items-center gap-2">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12 text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
                <Card className="text-center p-12 text-slate-500">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                    <p>You're all caught up! No notifications here.</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {notifications.map(n => (
                        <Card key={n.id} className={`p-0 overflow-hidden border-l-4 ${n.status === 'PENDING' ? 'border-l-indigo-500 bg-indigo-50/20' : 'border-l-slate-200'}`}>
                            <div className="p-5">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className={`mt-1 p-2 rounded-full ${n.status === 'PENDING' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <Bell className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                                {n.type === 'OVERWRITE_REQUEST' ? 'Overwrite Request' : 'Request Approved'}
                                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">{n.fromUserName}</span>
                                                {n.status === 'APPROVED' && <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700 font-bold uppercase tracking-wider ml-auto flex items-center gap-1"><Check className="h-3 w-3" /> Approved</span>}
                                            </h4>

                                            <div className="mt-2 bg-white border border-slate-100 rounded-lg p-2 text-xs flex flex-wrap gap-x-4 gap-y-1 shadow-sm">
                                                <div className="flex gap-1.5"><span className="text-slate-400 font-medium">Date:</span> <span className="text-slate-700 font-semibold">{n.data.date}</span></div>
                                                <div className="flex gap-1.5"><span className="text-slate-400 font-medium">Slot:</span> <span className="bg-indigo-50 text-indigo-700 px-1.5 rounded font-black">L{n.data.slot}</span></div>
                                                <div className="flex gap-1.5"><span className="text-slate-400 font-medium">Subject:</span> <span className="text-indigo-600 font-bold">{n.data.subjectName}</span></div>
                                            </div>

                                            <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-400 font-medium lowercase">
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(n.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4 self-start items-center">
                                        {n.status === 'PENDING' && (
                                            <div className="p-1 px-2 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-tighter">New</div>
                                        )}
                                        <button
                                            onClick={() => deleteNotif(n.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all flex items-center gap-1 group"
                                            title="Delete notification"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="text-[10px] font-bold uppercase hidden group-hover:inline">Delete</span>
                                        </button>
                                    </div>
                                </div>

                                {n.status === 'PENDING' && (
                                    <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-100/50">
                                        {n.type === 'OVERWRITE_REQUEST' ? (
                                            <Button size="sm" onClick={() => handleAction(n, 'APPROVE')} className="bg-indigo-600">Approve Overwrite</Button>
                                        ) : (
                                            <Button variant="secondary" size="sm" onClick={() => deleteNotif(n.id)} className="text-red-600 hover:bg-red-50 border-red-100">Delete</Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
