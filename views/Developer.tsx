
import React, { useState, useEffect } from 'react';
import {
    Terminal,
    Database,
    Activity,
    Users,
    Settings,
    ShieldAlert,
    Cpu,
    Server,
    Zap,
    RefreshCw,
    Search,
    Eye,
    Lock,
    Unlock,
    AlertCircle
} from 'lucide-react';
import { Card, Button, Input, Select } from '../components/UI';
import { db } from '../services/db';
import { User, UserRole } from '../types';

export const DeveloperDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'database' | 'settings'>('overview');
    const [stats, setStats] = useState({
        users: 0,
        attendance: 0,
        subjects: 0,
        notifications: 0,
        branches: 0,
        uptime: '99.9%'
    });
    const [logs, setLogs] = useState<{ t: string; m: string; type: 'info' | 'error' | 'warn' }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Simulate some logs
        setLogs([
            { t: new Date().toISOString(), m: 'Developer Console Initialized', type: 'info' },
            { t: new Date().toISOString(), m: 'Checking DB connectivity...', type: 'info' },
            { t: new Date().toISOString(), m: 'DB Connection Stable (latency: 12ms)', type: 'info' },
        ]);

        // Fetch some real counts if available
        const fetchData = async () => {
            try {
                const [uCount, aCount, nCount, sCount, bCount] = await Promise.all([
                    db.getUsersCount(),
                    db.getAttendanceCount(),
                    db.getNotificationsCount(),
                    db.getSubjects().then(s => s.length).catch(() => 0),
                    db.getBranches().then(b => b.length).catch(() => 0)
                ]);
                setStats(prev => ({
                    ...prev,
                    users: uCount,
                    attendance: aCount,
                    notifications: nCount,
                    subjects: sCount,
                    branches: bCount
                }));
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, []);

    const addLog = (m: string, type: 'info' | 'error' | 'warn' = 'info') => {
        setLogs(prev => [{ t: new Date().toISOString(), m, type }, ...prev].slice(0, 50));
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Welcome Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/20 backdrop-blur-md flex items-center justify-center border border-indigo-400/30">
                            <Terminal className="h-6 w-6 text-indigo-400" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-300">System Root Access</span>
                    </div>
                    <h2 className="text-3xl font-black mb-2 tracking-tight">Welcome, {user.displayName}</h2>
                    <p className="text-slate-400 text-sm max-w-md">
                        You are currently in the Developer Console. This environment allows for high-level system diagnostics and management.
                    </p>
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 uppercase"></div>
                <div className="absolute bottom-0 right-20 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
                {[
                    { id: 'overview', icon: Activity, label: 'System Overview' },
                    { id: 'users', icon: Users, label: 'User Management' },
                    { id: 'logs', icon: Terminal, label: 'Console Logs' },
                    { id: 'database', icon: Database, label: 'Database' },
                    { id: 'settings', icon: Settings, label: 'Deep Config' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DeveloperStatCard
                            label="Total System Users"
                            value={stats.users.toString()}
                            icon={Users}
                            color="text-blue-600"
                            sub="across all roles"
                        />
                        <DeveloperStatCard
                            label="API Uptime"
                            value={stats.uptime}
                            icon={Server}
                            color="text-emerald-600"
                            sub="last 30 days"
                        />
                        <DeveloperStatCard
                            label="System Load"
                            value="12%"
                            icon={Cpu}
                            color="text-amber-600"
                            sub="stable"
                        />
                        <DeveloperStatCard
                            label="DB Health"
                            value="Excellent"
                            icon={Zap}
                            color="text-indigo-600"
                            sub="0.4ms latency"
                        />

                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                            <Card className="h-full">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 text-lg">
                                        <Activity className="h-5 w-5 text-indigo-600" />
                                        System Heartbeat
                                    </h3>
                                    <div className="flex gap-2">
                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></div>
                                            Live
                                        </span>
                                    </div>
                                </div>

                                <div className="h-48 flex items-end gap-1.5 px-2">
                                    {[...Array(24)].map((_, i) => {
                                        const h = Math.floor(Math.random() * 80) + 10;
                                        return (
                                            <div key={i} className="flex-1 bg-indigo-100 rounded-t-sm relative group">
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-sm transition-all duration-1000"
                                                    style={{ height: `${h}%` }}
                                                ></div>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    Load: {h}%
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-4 px-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">24 Hours Ago</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Time</span>
                                </div>
                            </Card>
                        </div>

                        <Card className="col-span-1">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 mb-4">
                                <ShieldAlert className="h-5 w-5 text-red-600" />
                                Security
                            </h3>
                            <ul className="space-y-4">
                                <SecurityItem label="RLS Policies" status="Active" />
                                <SecurityItem label="Auth Tokens" status="Encrypted" />
                                <SecurityItem label="API Keys" status="Restricted" />
                                <SecurityItem label="Database" status="Firewalled" />
                            </ul>
                            <Button className="w-full mt-6" variant="danger">Panic Disable</Button>
                        </Card>
                    </div>
                )}

                {activeTab === 'users' && <UserManager addLog={addLog} />}

                {activeTab === 'logs' && (
                    <Card className="bg-slate-950 border-slate-800 p-0 overflow-hidden shadow-2xl">
                        <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5 mr-4">
                                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                                    <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                                </div>
                                <h3 className="text-slate-300 font-mono text-xs uppercase tracking-[0.2em] font-bold">System Log Explorer</h3>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => setLogs([])} className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700">Clear</Button>
                        </div>
                        <div className="p-4 font-mono text-sm h-[500px] overflow-y-auto space-y-1.5">
                            {logs.length === 0 && <div className="text-slate-600 italic">No logs in buffer... waiting for system events.</div>}
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                    <span className="text-slate-600 shrink-0">[{log.t.split('T')[1].split('.')[0]}]</span>
                                    <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'warn' ? 'text-amber-400' : ''}
                    ${log.type === 'info' ? 'text-indigo-400' : ''}
                    uppercase font-bold text-[10px] shrink-0
                  `}>
                                        {log.type}
                                    </span>
                                    <span className="text-slate-300 break-all">{log.m}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {activeTab === 'database' && (
                    <Card>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 text-xl">
                                <Database className="h-6 w-6 text-blue-600" />
                                Database Explorer
                            </h3>
                            <Button onClick={() => addLog('Refreshing database schema information...', 'info')} className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Refresh Schema
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DBTableCard name="profiles" rows={stats.users} size="124 KB" />
                            <DBTableCard name="attendance" rows={stats.attendance} size={`${(stats.attendance * 0.4).toFixed(1)} KB`} />
                            <DBTableCard name="subjects" rows={stats.subjects} size="18 KB" />
                            <DBTableCard name="branches" rows={stats.branches} size="4 KB" />
                            <DBTableCard name="notifications" rows={stats.notifications} size={`${(stats.notifications * 0.8).toFixed(1)} KB`} />
                            <DBTableCard name="system_settings" rows={1} size="1 KB" />
                        </div>
                    </Card>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <Card>
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 mb-6">
                                <Settings className="h-5 w-5 text-indigo-600" />
                                Environment Configuration
                            </h3>
                            <div className="space-y-4">
                                <EnvItem k="VITE_SUPABASE_URL" v="https://***.supabase.co" />
                                <EnvItem k="VITE_SUPABASE_ANON_KEY" v="*** (REDACTED)" />
                                <EnvItem k="NODE_ENV" v="production" />
                                <EnvItem k="DEPLOYMENT_ID" v="ams_v2_f89a2" />
                            </div>
                        </Card>

                        <Card className="border-indigo-100 bg-indigo-50/20">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 mb-6">
                                <Zap className="h-5 w-5 text-indigo-600" />
                                Experimental Feature Flags
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FeatureToggle label="Push Notifications" description="Enable experimental browser push notifications" defaultOn />
                                <FeatureToggle label="Auto Report Analytics" description="Send anonymous usage data to development team" />
                                <FeatureToggle label="Beta Attendance Layout" description="Try out the new mobile-optimized grid" defaultOn />
                                <FeatureToggle label="Direct SQL Editor" description="Enable raw SQL execution (CAUTION)" />
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

const DeveloperStatCard = ({ label, value, icon: Icon, color, sub }: any) => (
    <Card className="border-l-4 border-l-indigo-500 overflow-hidden relative">
        <div className="flex justify-between">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium italic">{sub}</p>
            </div>
            <div className={`p-2 rounded-xl bg-slate-50 ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
        </div>
        <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.03] pointer-events-none">
            <Icon className="h-full w-full rotate-12" />
        </div>
    </Card>
);

const SecurityItem = ({ label, status }: any) => (
    <li className="flex justify-between items-center text-sm">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-black uppercase tracking-tight">
            {status}
        </span>
    </li>
);

const DBTableCard = ({ name, rows, size }: any) => (
    <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer bg-slate-50/50">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Database className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-black text-slate-800 font-mono text-sm">{name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{rows.toLocaleString()} entries</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Storage</p>
                <p className="text-xs font-bold text-slate-700">{size}</p>
            </div>
        </div>
    </div>
);

const EnvItem = ({ k, v }: any) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
        <span className="font-mono text-xs font-black text-slate-500">{k}</span>
        <span className="font-mono text-xs text-indigo-600 mt-1 md:mt-0 px-2 py-1 bg-white rounded border border-slate-200 shadow-sm">{v}</span>
    </div>
);

const FeatureToggle = ({ label, description, defaultOn = false }: any) => {
    const [on, setOn] = useState(defaultOn);
    return (
        <div className="flex items-start justify-between p-4 rounded-xl bg-white border border-slate-100">
            <div>
                <h4 className="text-sm font-black text-slate-800">{label}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
            </div>
            <button
                onClick={() => setOn(!on)}
                className={`w-12 h-6 rounded-full transition-colors relative ${on ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${on ? 'translate-x-6' : ''}`}></div>
            </button>
        </div>
    );
};

// UserManager Sub-component
const UserManager = ({ addLog }: { addLog: any }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const handleSearch = async () => {
        if (!searchTerm) return;
        setSearching(true);
        addLog(`Searching for users matching: "${searchTerm}"`, 'info');
        try {
            const data = await db.searchUsers(searchTerm);
            setResults(data);
            addLog(`Found ${data.length} users.`, 'info');
        } catch (e: any) {
            addLog(`Search error: ${e.message}`, 'error');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 mb-6">
                    <Users className="h-5 w-5 text-indigo-600" />
                    Global User Search & Impersonation
                </h3>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by Email, Name, or Enrollment ID..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={searching}>
                        {searching ? '...' : 'Search Engine'}
                    </Button>
                </div>
            </Card>

            {results.length > 0 && (
                <Card className="overflow-hidden p-0 border-slate-200">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Query Results ({results.length})</h4>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {results.map((u, i) => (
                            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm uppercase">
                                        {u.displayName?.substring(0, 2) || '??'}
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black text-slate-800">{u.displayName}</h5>
                                        <p className="text-[10px] font-medium text-slate-500">{u.email}</p>
                                        <div className="flex gap-1.5 mt-1">
                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-tight border border-slate-200">
                                                {u.role}
                                            </span>
                                            {u.studentData?.enrollmentId && (
                                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-tight border border-blue-100">
                                                    {u.studentData.enrollmentId}
                                                </span>
                                            )}
                                            {u.lastLogin && (
                                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-tight border border-emerald-100">
                                                    Last Login: {new Date(u.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" title="View Profile Snapshot">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="secondary" title="Quick Role Change">
                                        <Lock className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-slate-900 hover:bg-black"
                                        title="Impersonate User Session"
                                        onClick={() => {
                                            if (window.confirm(`SUDO ALERT: You are about to impersonate ${u.displayName}. Your current session will be replaced. Continue?`)) {
                                                addLog(`INITIATING SUDO SESSION: ${u.email}`, 'warn');
                                                // In a real app, you'd set some session state here
                                                alert("Sudo sessions are limited in this environment for safety.");
                                            }
                                        }}
                                    >
                                        <Unlock className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                        <h5 className="text-xs font-black text-amber-800 uppercase tracking-[0.1em]">Developer Advisory</h5>
                        <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed font-medium">
                            Actions taken here bypass standard access controls. All modifications are logged with your developer ID.
                            Be cautious when using the Impersonate feature as it may impact data integrity.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
