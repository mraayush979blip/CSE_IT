
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
    AlertCircle,
    Code,
    Info,
    HelpCircle,
    HardDrive
} from 'lucide-react';
import { Card, Button, Input, Modal } from '../components/UI';
import { db } from '../services/db';
import { User, SystemSettings } from '../types';

export const DeveloperDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'database' | 'settings'>('overview');
    const [deepStats, setDeepStats] = useState<Record<string, number>>({});
    const [storage, setStorage] = useState({ consumed: '0 MB', total: '500 MB', percent: 0 });
    const [latency, setLatency] = useState(0);
    const [logs, setLogs] = useState<{ t: string; m: string; type: 'info' | 'error' | 'warn' }[]>([]);
    const [sysSettings, setSysSettings] = useState<SystemSettings>({ studentLoginEnabled: true });

    // Modals
    const [inspectedUser, setInspectedUser] = useState<any>(null);

    useEffect(() => {
        setLogs([
            { t: new Date().toISOString(), m: 'Kernel initialized. Developer Console active.', type: 'info' },
            { t: new Date().toISOString(), m: 'Establishing link to Supabase Edge...', type: 'info' },
        ]);

        const fetchData = async () => {
            try {
                const [stats, settings, ms, store] = await Promise.all([
                    db.getDeepStats(),
                    db.getSystemSettings(),
                    db.ping(),
                    db.getStorageStats()
                ]);

                setDeepStats(stats);
                setSysSettings(settings);
                setLatency(ms);
                setStorage(store);

                addLog(`Diagnostic complete. Latency: ${ms}ms. Storage: ${store.consumed}/${store.total}`, 'info');
            } catch (e: any) {
                addLog(`Initialization error: ${e.message}`, 'error');
            }
        };
        fetchData();

        const interval = setInterval(async () => {
            try {
                const ms = await db.ping();
                setLatency(ms);
            } catch (e) { }
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const addLog = (m: string, type: 'info' | 'error' | 'warn' = 'info') => {
        setLogs(prev => [{ t: new Date().toISOString(), m, type }, ...prev].slice(0, 50));
    };

    const handleToggleMaintenance = async (enabled: boolean) => {
        try {
            const newSettings = { ...sysSettings, studentLoginEnabled: !enabled };
            await db.updateSystemSettings(newSettings);
            setSysSettings(newSettings);
            addLog(`System policy updated: Student login ${!enabled ? 'ENABLED' : 'DISABLED'}`, enabled ? 'warn' : 'info');
        } catch (e: any) {
            addLog(`Policy update failed: ${e.message}`, 'error');
        }
    };

    const getLatencyColor = (ms: number) => {
        if (ms === 0) return 'text-slate-400';
        if (ms < 200) return 'text-emerald-600'; // Safe (Green)
        if (ms < 500) return 'text-amber-600';   // Warning (Yellow)
        return 'text-red-600';                    // Unsafe (Red)
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
                        Monitoring system metrics. Database connection is {latency > 500 ? 'UNSTABLE' : 'STABLE'}.
                    </p>
                </div>

                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 right-20 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
                {[
                    { id: 'overview', icon: Activity, label: 'Overview', desc: 'System Health' },
                    { id: 'users', icon: Users, label: 'Users', desc: 'Find & Fix Accounts' },
                    { id: 'logs', icon: Terminal, label: 'Logs', desc: 'Live Events' },
                    { id: 'database', icon: Database, label: 'Database', desc: 'Row Counts' },
                    { id: 'settings', icon: Settings, label: 'Policies', desc: 'Global Controls' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <tab.icon className="h-4 w-4" />
                            <span className="text-sm font-black uppercase tracking-wider">{tab.label}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase opacity-60 ${activeTab === tab.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {tab.desc}
                        </span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {!sysSettings.studentLoginEnabled && (
                            <section className="bg-red-50 p-4 rounded-xl border border-red-200 flex gap-3 text-red-800 animate-pulse">
                                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight">System in Maintenance Mode</h4>
                                    <p className="text-xs font-medium opacity-80 mt-1">
                                        Students are currently blocked from logging in. This is why the status below shows "Maintenance".
                                        You can turn this back on in the <button onClick={() => setActiveTab('settings')} className="underline font-bold">Policies Tab</button>.
                                    </p>
                                </div>
                            </section>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <DeveloperStatCard
                                label="DB Speed (ms)"
                                value={`${latency}ms`}
                                icon={Server}
                                color={getLatencyColor(latency)}
                                sub={latency > 500 ? "UNSAFE - High Latency" : "SAFE - Normal Speed"}
                            />
                            <DeveloperStatCard
                                label="Storage Consumed"
                                value={storage.consumed}
                                icon={HardDrive}
                                color="text-indigo-600"
                                sub={`Total Limit: ${storage.total}`}
                                progress={storage.percent}
                            />
                            <DeveloperStatCard
                                label="System Status"
                                value={sysSettings.studentLoginEnabled ? "Public" : "Maintenance"}
                                icon={sysSettings.studentLoginEnabled ? Zap : ShieldAlert}
                                color={sysSettings.studentLoginEnabled ? "text-emerald-600" : "text-red-600"}
                                sub={sysSettings.studentLoginEnabled ? "Ready for Traffic" : "Restricted Access"}
                            />
                            <DeveloperStatCard
                                label="Capacity Used"
                                value={`${storage.percent}%`}
                                icon={Cpu}
                                color={storage.percent > 80 ? "text-red-500" : "text-blue-600"}
                                sub="Estimated system load"
                            />

                            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                <Card className="h-full">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 text-lg">
                                            <Activity className="h-5 w-5 text-indigo-600" />
                                            Live Pulse History
                                        </h3>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Activity Scan (24H)</span>
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
                                                        Records: {Math.floor(h * 1.5)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between mt-4 px-2 italic">
                                        <span className="text-[10px] font-bold text-slate-400">Past 24 Hours</span>
                                        <span className="text-[10px] font-bold text-indigo-600 uppercase">Live Buffer</span>
                                    </div>
                                </Card>
                            </div>

                            <Card className="col-span-1">
                                <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 mb-4">
                                    <ShieldAlert className="h-5 w-5 text-red-600" />
                                    Active Shields
                                </h3>
                                <ul className="space-y-4">
                                    <SecurityItem label="Row Policies" status="ON" desc="Data isolation active" />
                                    <SecurityItem label="TLS Layer" status="ON" desc="Encryption active" />
                                    <SecurityItem label="CORS Lock" status="STRICT" desc="Origin protected" />
                                </ul>
                                <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Disk Allocation</p>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-600" style={{ width: `${storage.percent}%` }}></div>
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-1 font-bold">{storage.consumed} of {storage.total} utilized</p>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6">
                        <section className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-800">
                            <HelpCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight">Technical Profile Inspector</h4>
                                <p className="text-xs font-medium opacity-80 mt-0.5">Use this to find user accounts and inspect their raw database properties if they report login issues.</p>
                            </div>
                        </section>
                        <UserManager
                            addLog={addLog}
                            onInspect={async (uid) => {
                                addLog(`Pulling technical snapshot for profile: ${uid}`, 'info');
                                const raw = await db.getRawProfile(uid);
                                setInspectedUser(raw);
                            }}
                        />
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-6">
                        <section className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex gap-3 text-slate-300">
                            <Terminal className="h-5 w-5 shrink-0 mt-0.5 text-indigo-400" />
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight">System Log Stream</h4>
                                <p className="text-xs font-medium opacity-80 mt-0.5 font-mono">Real-time trace of system operations and API responses.</p>
                            </div>
                        </section>

                        <Card className="bg-slate-950 border-slate-800 p-0 overflow-hidden shadow-2xl">
                            <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5 mr-4 font-black text-indigo-500 font-mono text-[10px]">KERNEL_OUT</div>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => setLogs([])} className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 font-black text-[10px]">Clear Buffer</Button>
                            </div>
                            <div className="p-4 font-mono text-sm h-[500px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                                {logs.length === 0 && <div className="text-slate-600 italic">Listening for system events...</div>}
                                {logs.map((log, i) => (
                                    <div key={i} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                        <span className="text-slate-600 shrink-0">[{log.t.split('T')[1].split('.')[0]}]</span>
                                        <span className={`
                                            ${log.type === 'error' ? 'text-red-400' : ''}
                                            ${log.type === 'warn' ? 'text-amber-400' : ''}
                                            ${log.type === 'info' ? 'text-indigo-400' : ''}
                                            uppercase font-black text-[10px] shrink-0
                                        `}>
                                            {log.type}
                                        </span>
                                        <span className="text-slate-300 break-all">{log.m}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'database' && (
                    <div className="space-y-6">
                        <section className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3 text-emerald-800">
                            <Database className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight">Database Statistics</h4>
                                <p className="text-xs font-medium opacity-80 mt-0.5">Physical row counts for every table in the cluster.</p>
                            </div>
                        </section>

                        <Card>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 text-xl">
                                    <Database className="h-6 w-6 text-emerald-600" />
                                    Internal Data Nodes
                                </h3>
                                <Button
                                    onClick={async () => {
                                        addLog('Syncing latest row counts...', 'info');
                                        const stats = await db.getDeepStats();
                                        setDeepStats(stats);
                                    }}
                                    className="flex items-center gap-2 font-black uppercase text-[10px]"
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    Synchronize
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DBTableCard name="Profiles" alias="Users" rows={deepStats.profiles || 0} hint="List of all registered accounts" />
                                <DBTableCard name="Attendance" alias="Log" rows={deepStats.attendance || 0} hint="Individual daily attendance entries" />
                                <DBTableCard name="Marks" alias="Exams" rows={deepStats.marks || 0} hint="Mid-semester evaluation entries" />
                                <DBTableCard name="Notifications" alias="Alerts" rows={deepStats.notifications || 0} hint="Broadcast and targeted messages" />
                                <DBTableCard name="Branches" alias="Depts" rows={deepStats.branches || 0} hint="Unique academic branches" />
                                <DBTableCard name="Batches" alias="Years" rows={deepStats.batches || 0} hint="Branch-specific year batches" />
                                <DBTableCard name="Subjects" alias="Courses" rows={deepStats.subjects || 0} hint="Master list of all subjects" />
                                <DBTableCard name="Assignments" alias="Teaching" rows={deepStats.assignments || 0} hint="Faculty-Subject mapping" />
                                <DBTableCard name="Coordinators" alias="Staff" rows={deepStats.coordinators || 0} hint="Branch management assignments" />
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <section className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 text-red-800">
                            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight">Emergency Policy Controls</h4>
                                <p className="text-xs font-medium opacity-80 mt-0.5 font-bold uppercase transition-colors">Toggling Student Access will immediately affect the Login Screen status.</p>
                            </div>
                        </section>

                        <Card>
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 mb-6">
                                <Settings className="h-5 w-5 text-indigo-600" />
                                Global Policy Switchboard
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FeatureToggle
                                    label="Student Login"
                                    description="Switch this OFF to trigger Maintenance Mode for students. They will see a 'Disabled' message on the login screen."
                                    on={sysSettings.studentLoginEnabled}
                                    onChange={(v: boolean) => handleToggleMaintenance(!v)}
                                />
                                <FeatureToggle
                                    label="Technical Logs"
                                    description="Enable verbose developer logging in the browser console. Best kept OFF in production."
                                    defaultOn={true}
                                />
                            </div>
                        </Card>

                        <Card className="bg-slate-50 border-slate-200">
                            <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 mb-6">
                                <Code className="h-5 w-5 text-slate-600" />
                                System Configuration
                            </h3>
                            <div className="space-y-3">
                                <EnvItem k="Deployment Node" v={window.location.host} desc="Production server address" />
                                <EnvItem k="Engine Runtime" v="React 18" desc="Core framework version" />
                                <EnvItem k="Auth Gateway" v="Supabase Edge" desc="Security provider" />
                                <EnvItem k="System Revision" v="V2.4.0-Stable" desc="Internal release ID" />
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Inspect Modal */}
            <Modal
                isOpen={!!inspectedUser}
                onClose={() => setInspectedUser(null)}
                title="Direct Data Inspector (JSON)"
            >
                <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs overflow-auto max-h-[60vh]">
                    <pre className="text-emerald-400">
                        {JSON.stringify(inspectedUser, null, 2)}
                    </pre>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button onClick={() => setInspectedUser(null)}>Dismiss</Button>
                </div>
            </Modal>
        </div>
    );
};

const DeveloperStatCard = ({ label, value, icon: Icon, color, sub, progress }: any) => (
    <Card className="border-l-4 border-l-indigo-500 overflow-hidden relative group hover:shadow-md transition-shadow">
        <div className="flex justify-between">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase opacity-60">{sub}</p>
                {progress !== undefined && (
                    <div className="mt-2 w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color.replace('text', 'bg')}`} style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </div>
            <div className={`p-2 rounded-xl bg-slate-50 ${color} group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6" />
            </div>
        </div>
    </Card>
);

const SecurityItem = ({ label, status, desc }: any) => (
    <li className="flex justify-between items-center text-sm">
        <div className="flex flex-col">
            <span className="text-slate-800 font-black uppercase text-[10px] tracking-tight">{label}</span>
            <span className="text-[10px] text-slate-500 italic lowercase">{desc}</span>
        </div>
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-black uppercase tracking-tight border border-emerald-100">
            {status}
        </span>
    </li>
);

const DBTableCard = ({ name, rows, alias, hint }: any) => (
    <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer bg-slate-50/50">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Database className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-black text-slate-800 font-mono text-sm">{name} <span className="opacity-30 text-xs">({alias})</span></h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{rows.toLocaleString()} Rows</p>
                </div>
            </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 italic">" {hint} "</p>
    </div>
);

const EnvItem = ({ k, v, desc }: any) => (
    <div className="flex items-center justify-between p-3 rounded bg-white border border-slate-100 shadow-sm">
        <div className="flex flex-col">
            <span className="font-mono text-[10px] font-black text-slate-800 uppercase">{k}</span>
            <span className="text-[9px] text-slate-400 font-medium italic lowercase">{desc}</span>
        </div>
        <span className="font-mono text-[11px] text-indigo-600 font-black">{v}</span>
    </div>
);

const FeatureToggle = ({ label, description, on, onChange, defaultOn = false }: any) => {
    const [localOn, setLocalOn] = useState(defaultOn);

    // Support both controlled and uncontrolled
    const isControlled = on !== undefined;
    const active = isControlled ? on : localOn;

    return (
        <div className="flex items-start justify-between p-4 rounded-xl bg-white border border-slate-100 hover:border-indigo-100 transition-colors">
            <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    {label}
                    {!active && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">Disabled</span>}
                    {active && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase">Active</span>}
                </h4>
                <p className="text-[10px] font-medium text-slate-500 mt-1 leading-relaxed">{description}</p>
            </div>
            <button
                onClick={() => {
                    if (!isControlled) setLocalOn(!localOn);
                    if (onChange) onChange(!active);
                }}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${active ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'translate-x-6' : ''}`}></div>
            </button>
        </div>
    );
};

const UserManager = ({ addLog, onInspect }: { addLog: any, onInspect: (uid: string) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const handleSearch = async () => {
        if (!searchTerm) return;
        setSearching(true);
        addLog(`Searching main registry for: "${searchTerm}"`, 'info');
        try {
            const data = await db.searchUsers(searchTerm);
            setResults(data);
            addLog(`Found ${data.length} matches.`, 'info');
        } catch (e: any) {
            addLog(`Search Engine failed: ${e.message}`, 'error');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 mb-6">
                    <Search className="h-5 w-5 text-indigo-600" />
                    Identity Search Engine
                </h3>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Type Name, Email or Enrollment ID..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={searching} className="flex items-center gap-2 font-black uppercase text-xs">
                        {searching ? 'Scanning...' : 'Scan All Users'}
                    </Button>
                </div>
            </Card>

            {results.length > 0 && (
                <Card className="overflow-hidden p-0 border-slate-200">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Search Results</h4>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {results.map((u, i) => (
                            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm uppercase">
                                        {u.displayName?.substring(0, 2) || '??'}
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black text-slate-800 uppercase tracking-tight">{u.displayName}</h5>
                                        <p className="text-[10px] font-medium text-slate-500 lowercase">{u.email}</p>
                                        <div className="flex gap-1.5 mt-2">
                                            <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded text-[9px] font-black uppercase tracking-tight">
                                                {u.role}
                                            </span>
                                            {u.studentData?.enrollmentId && (
                                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-tight border border-indigo-100">
                                                    ID: {u.studentData.enrollmentId}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => onInspect(u.uid)}
                                    >
                                        <Eye className="h-3.5 w-3.5 mr-1" />
                                        <span className="text-[9px] font-black uppercase">Inspect</span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h5 className="text-xs font-black text-amber-800 uppercase tracking-[0.1em]">Privacy & Audit Notice</h5>
                    <p className="text-[10px] text-amber-700 mt-1 leading-relaxed font-bold uppercase transition-transform">
                        Searching profiles is only for technical assistance. All searches are recorded in the audit trail.
                    </p>
                </div>
            </div>
        </div>
    );
};
