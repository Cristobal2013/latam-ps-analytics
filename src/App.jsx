import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, writeBatch, getDocs } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';
import {
  LayoutDashboard, Upload, Users, FileText, Loader2, TrendingUp, Clock,
  AlertCircle, CheckCircle2, Search, ChevronRight, FileSpreadsheet, Database,
  Globe2, UserCheck, Target, Briefcase, Activity, BarChart2, FolderKanban,
  CalendarDays, Building2
} from 'lucide-react';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const appId = 'ps-utilization-v2';

const REGION_COLORS = {
  'LATAM':          '#00D4A8',
  'EMEA':           '#FFB800',
  'COE':            '#A78BFA',
  'SUT':            '#FB923C',
  'Trust Services': '#F472B6',
  'UP Consulting':  '#38BDF8',
  'N/A':            '#6B7280',
};

const NB_COLORS = ['#00D4A8','#FFB800','#A78BFA','#FB923C','#F472B6','#38BDF8','#4ADE80','#F87171','#FBBF24','#818CF8','#6B7280'];

const semaphore = (pct) =>
  pct >= 75 ? '#00D4A8' : pct >= 50 ? '#FFB800' : '#F87171';

// ─── APP ──────────────────────────────────────────────────────────────────────
const App = () => {
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('dashboard');
  const [hoursData, setHoursData]       = useState([]);
  const [mode, setMode]                 = useState('utilization'); // 'utilization' | 'projects'
  const [activeProjectTab, setActiveProjectTab] = useState('overview');
  const [projectsData, setProjectsData] = useState([]);

  const [selectedMonth,  setSelectedMonth]  = useState('All');
  const [filterRegion,   setFilterRegion]   = useState('All');
  const [filterManager,  setFilterManager]  = useState('All');
  const [filterEmployee, setFilterEmployee] = useState('All');

  useEffect(() => {
    signInAnonymously(auth).catch(e => console.warn('Auth:', e.message));
  }, []);

  useEffect(() => {
    const col = collection(db, 'artifacts', appId, 'public', 'data', 'ps_entries_v2');
    const unsub = onSnapshot(col,
      snap => { setHoursData(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      err  => { console.error(err); setLoading(false); }
    );
    const col2 = collection(db, 'artifacts', appId, 'public', 'data', 'ps_projects_v1');
    const unsub2 = onSnapshot(col2,
      snap => setProjectsData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => { unsub(); unsub2(); };
  }, []);

  const availableMonths = useMemo(() => {
    const m = [...new Set(hoursData.map(d => d.month))].filter(Boolean).sort().reverse();
    return ['All', ...m];
  }, [hoursData]);

  const regions = useMemo(() => {
    const base = selectedMonth === 'All' ? hoursData : hoursData.filter(d => d.month === selectedMonth);
    return ['All', ...new Set(base.map(d => d.region || 'N/A'))].sort();
  }, [hoursData, selectedMonth]);

  const managers = useMemo(() => {
    const base = hoursData
      .filter(d => selectedMonth === 'All' || d.month  === selectedMonth)
      .filter(d => filterRegion  === 'All' || d.region === filterRegion);
    return ['All', ...new Set(base.map(d => d.manager))].sort();
  }, [hoursData, selectedMonth, filterRegion]);

  const employees = useMemo(() => {
    const base = hoursData
      .filter(d => selectedMonth  === 'All' || d.month   === selectedMonth)
      .filter(d => filterRegion   === 'All' || d.region  === filterRegion)
      .filter(d => filterManager  === 'All' || d.manager === filterManager);
    return ['All', ...new Set(base.map(d => d.employee))].sort();
  }, [hoursData, selectedMonth, filterRegion, filterManager]);

  const filteredData = useMemo(() => hoursData.filter(d => {
    if (selectedMonth  !== 'All' && d.month    !== selectedMonth)  return false;
    if (filterRegion   !== 'All' && d.region   !== filterRegion)   return false;
    if (filterManager  !== 'All' && d.manager  !== filterManager)  return false;
    if (filterEmployee !== 'All' && d.employee !== filterEmployee) return false;
    return true;
  }), [hoursData, selectedMonth, filterRegion, filterManager, filterEmployee]);

if (loading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: '#000' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#00D4A8' }} />
          <div className="absolute inset-0 blur-md" style={{ background: '#00D4A8', opacity: 0.3 }} />
        </div>
        <p className="font-data text-xs tracking-widest uppercase" style={{ color: '#6B7280' }}>
          Connecting to database
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-app)', fontFamily: 'Syne, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside className="flex flex-col shrink-0 overflow-y-auto" style={{ width: 220, background: 'var(--bg-sidebar)' }}>
        {/* Logo */}
        <div style={{ padding: '28px 20px 20px' }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={15} color="#000" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: '#fff' }}>PS Analytics</span>
          </div>
          <div style={{ marginTop: 16, height: '1px', background: 'var(--border-dark)' }} />
        </div>

        {/* Mode toggle */}
        <div style={{ padding: '0 12px 16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, display: 'flex', gap: 2 }}>
            {[
              { key: 'utilization', icon: <BarChart2 size={12} />, label: 'Utilization' },
              { key: 'projects',    icon: <FolderKanban size={12} />, label: 'Projects' },
            ].map(m => (
              <button key={m.key} onClick={() => setMode(m.key)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
                background: mode === m.key ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: mode === m.key ? '#fff' : '#4B5563',
                transition: 'all 0.15s',
              }}>
                <span style={{ color: mode === m.key ? 'var(--accent)' : '#4B5563' }}>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mode === 'utilization' ? (
            [
              { key: 'dashboard', icon: <LayoutDashboard size={15} />, label: 'Dashboard' },
              { key: 'upload',    icon: <Upload size={15} />,          label: 'Upload Report' },
              { key: 'regions',   icon: <Globe2 size={15} />,          label: 'By Region' },
              { key: 'managers',  icon: <Users size={15} />,           label: 'By Manager' },
              { key: 'employees', icon: <FileText size={15} />,        label: 'By Employee' },
            ].map(item => (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  width: '100%', textAlign: 'left', fontSize: 13, fontWeight: activeTab === item.key ? 700 : 500,
                  fontFamily: 'Syne, sans-serif',
                  background: activeTab === item.key ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: activeTab === item.key ? '#fff' : '#6B7280',
                  transition: 'all 0.15s',
                }}>
                <span style={{ color: activeTab === item.key ? 'var(--accent)' : '#4B5563' }}>{item.icon}</span>
                {item.label}
              </button>
            ))
          ) : (
            [
              { key: 'overview',   icon: <LayoutDashboard size={15} />, label: 'Overview' },
              { key: 'bymanager', icon: <Users size={15} />,          label: 'By Manager' },
              { key: 'upload',    icon: <Upload size={15} />,         label: 'Upload Projects' },
            ].map(item => (
              <button key={item.key} onClick={() => setActiveProjectTab(item.key)}
                className={`nav-item ${activeProjectTab === item.key ? 'active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  width: '100%', textAlign: 'left', fontSize: 13, fontWeight: activeProjectTab === item.key ? 700 : 500,
                  fontFamily: 'Syne, sans-serif',
                  background: activeProjectTab === item.key ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: activeProjectTab === item.key ? '#fff' : '#6B7280',
                  transition: 'all 0.15s',
                }}>
                <span style={{ color: activeProjectTab === item.key ? 'var(--accent)' : '#4B5563' }}>{item.icon}</span>
                {item.label}
              </button>
            ))
          )}
        </nav>

      </aside>

      {/* ── Main ── */}
      <main className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <header style={{
          background: 'rgba(245,244,240,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 32px', position: 'sticky', top: 0, zIndex: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {mode === 'utilization' ? (
            <>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-1)', margin: 0 }}>Control Panel</h2>
                  {filteredData.length !== hoursData.length && (
                    <span className="font-data" style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: 20 }}>
                      {filteredData.length} filtered
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, margin: '2px 0 0', letterSpacing: '0.02em' }}>PS Utilization · LATAM Overview</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <FilterControl label="Month"    value={selectedMonth}  options={availableMonths} onChange={v => { setSelectedMonth(v); setFilterRegion('All'); setFilterManager('All'); setFilterEmployee('All'); }} />
                <FilterControl label="Region"   value={filterRegion}   options={regions}         onChange={v => { setFilterRegion(v); setFilterManager('All'); setFilterEmployee('All'); }} />
                <FilterControl label="Manager"  value={filterManager}  options={managers}        onChange={v => { setFilterManager(v); setFilterEmployee('All'); }} />
                <FilterControl label="Employee" value={filterEmployee} options={employees}       onChange={setFilterEmployee} />
              </div>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-1)', margin: 0 }}>Project Status</h2>
                <span className="font-data" style={{ fontSize: 10, fontWeight: 600, color: '#A78BFA', background: 'rgba(167,139,250,0.12)', padding: '2px 8px', borderRadius: 20 }}>
                  {projectsData.length} projects
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, margin: '2px 0 0', letterSpacing: '0.02em' }}>PS Projects · Portfolio Overview</p>
            </div>
          )}
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {mode === 'utilization' ? (
              <>
                {activeTab === 'dashboard' && <DashboardView data={filteredData} />}
                {activeTab === 'upload'    && <UploadView setActiveTab={setActiveTab} />}
                {activeTab === 'regions'   && <RegionView data={filteredData} />}
                {activeTab === 'managers'  && <GroupedView data={filteredData} groupKey="manager" />}
                {activeTab === 'employees' && <GroupedView data={filteredData} groupKey="employee" showDetail />}
              </>
            ) : (
              <>
                {activeProjectTab === 'overview'   && <ProjectsOverview data={projectsData} />}
                {activeProjectTab === 'bymanager' && <ProjectsByManagerView data={projectsData} />}
                {activeProjectTab === 'upload'    && <UploadProjectsView setActiveTab={setActiveProjectTab} />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// ─── FILTER CONTROL ───────────────────────────────────────────────────────────
const FilterControl = ({ label, value, options, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: 2 }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 600,
        color: 'var(--text-1)', background: '#fff',
        border: '1px solid var(--border)', borderRadius: 8,
        padding: '7px 28px 7px 10px', outline: 'none', cursor: 'pointer',
        minWidth: 120, appearance: 'none',
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronRight size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'var(--text-3)', pointerEvents: 'none' }} />
    </div>
  </div>
);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const DashboardView = ({ data }) => {
  const [chartView, setChartView] = useState('employee');

  const stats = useMemo(() => {
    const total     = data.reduce((s, d) => s + (d.hours          || 0), 0);
    const available = data.reduce((s, d) => s + (d.availableHours || 0), 0);
    const billable  = data.reduce((s, d) => s + (d.billableHours  || 0), 0);
    const nonBill   = data.reduce((s, d) => s + (d.nonBillableHours || 0), 0);
    const target    = data.reduce((s, d) => s + (d.targetHours    || 0), 0);
    const headcount = new Set(data.map(d => d.employee)).size;
    return {
      total, available, billable, nonBill, target, headcount,
      util:       available > 0 ? (billable / available) * 100 : 0,
      attainment: target    > 0 ? (billable / target)    * 100 : 0,
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data.length) return [];
    const map = {};
    data.forEach(d => {
      const k = chartView === 'month'  ? (d.month   || 'N/A')
              : chartView === 'region' ? (d.region  || 'N/A')
              :                          (d.employee || 'N/A');
      if (!map[k]) map[k] = { name: k, billable: 0, available: 0 };
      map[k].billable  += (d.billableHours  || 0);
      map[k].available += (d.availableHours || 0);
    });
    let r = Object.values(map).map(item => ({
      name: item.name,
      utilPercent: item.available > 0 ? Number(((item.billable / item.available) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.utilPercent - a.utilPercent);
    if (chartView === 'employee') r = r.slice(0, 15);
    return r;
  }, [data, chartView]);

  const nbBreakdown = useMemo(() => {
    const cats = [
      { key: 'nbSovosInternal',      label: 'Sovos Internal' },
      { key: 'nbTimeOff',            label: 'Time-Off' },
      { key: 'nbCustomerSupport',    label: 'Customer Support' },
      { key: 'nbTraining',           label: 'Training' },
      { key: 'nbSalesScoping',       label: 'Sales & Scoping' },
      { key: 'nbProductDev',         label: 'Product & Dev' },
      { key: 'nbProductIssues',      label: 'Product Issues' },
      { key: 'nbMigration',          label: 'Migration' },
      { key: 'nbMarketing',          label: 'Marketing' },
      { key: 'nbTrainerOnboarding',  label: 'Trainer' },
      { key: 'nbLeave',              label: 'Leave' },
    ];
    return cats
      .map((c, i) => ({ ...c, value: data.reduce((s, d) => s + (d[c.key] || 0), 0), color: NB_COLORS[i] }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  if (!data.length) return <EmptyState />;

  const kpis = [
    { label: 'Headcount',    value: stats.headcount,                     unit: '',  icon: <UserCheck size={16} />, accent: '#00D4A8' },
    { label: 'Logged Hours', value: stats.total.toFixed(0),              unit: 'h', icon: <Clock size={16} />,     accent: '#6B7280' },
    { label: 'Utilization',  value: stats.util.toFixed(1),               unit: '%', icon: <Activity size={16} />,  accent: semaphore(stats.util) },
    { label: 'Attainment',   value: stats.attainment.toFixed(1),         unit: '%', icon: <Target size={16} />,    accent: semaphore(stats.attainment) },
    { label: 'Billable',     value: stats.billable.toFixed(0),           unit: 'h', icon: <CheckCircle2 size={16} />, accent: '#00D4A8' },
    { label: 'Non-Billable', value: stats.nonBill.toFixed(0),            unit: 'h', icon: <AlertCircle size={16} />,  accent: '#FFB800' },
  ];

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPI Row */}
      <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="stat-card" style={{
            background: 'var(--bg-card)', borderRadius: 12,
            border: '1px solid var(--border)', padding: '18px 18px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{kpi.label}</span>
              <span style={{ color: kpi.accent, opacity: 0.8 }}>{kpi.icon}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span className="font-data" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                {kpi.value}
              </span>
              <span className="font-data" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-3)' }}>{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Utilization Bar Chart */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-1)', margin: 0 }}>Utilization Distribution</h3>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '3px 0 0' }}>Billable ÷ Available hours</p>
            </div>
            <div style={{ display: 'flex', background: '#F5F4F0', borderRadius: 8, padding: 3, gap: 2 }}>
              {[['employee','Personnel'],['region','Region'],['month','Month']].map(([v, lbl]) => (
                <button key={v} onClick={() => setChartView(v)} style={{
                  padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  fontFamily: 'Syne, sans-serif',
                  background: chartView === v ? '#fff' : 'transparent',
                  color: chartView === v ? 'var(--text-1)' : 'var(--text-3)',
                  boxShadow: chartView === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: chartView === 'employee' ? 52 : 4 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#F0EEE9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}
                  angle={chartView === 'employee' ? -38 : 0}
                  textAnchor={chartView === 'employee' ? 'end' : 'middle'} />
                <YAxis fontSize={10} axisLine={false} tickLine={false}
                  tick={{ fill: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}
                  tickFormatter={v => `${v}%`} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 6 }}
                  contentStyle={{ fontFamily: 'Syne, sans-serif', borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                  formatter={v => [`${v}%`, 'Utilization']} />
                <Bar dataKey="utilPercent" radius={[4,4,0,0]} barSize={chartView === 'employee' ? 18 : 36}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={
                      chartView === 'region' ? (REGION_COLORS[entry.name] || '#6B7280') : semaphore(entry.utilPercent)
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hours Mix */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-1)', margin: '0 0 4px', textAlign: 'center' }}>Hours Mix</h3>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 16px', textAlign: 'center' }}>Billable vs Non-Billable</p>

          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[
                  { name: 'Billable',     value: stats.billable },
                  { name: 'Non-Billable', value: stats.nonBill  },
                ]} innerRadius={48} outerRadius={68} paddingAngle={5} dataKey="value" startAngle={90} endAngle={-270}>
                  <Cell fill="#00D4A8" stroke="none" />
                  <Cell fill="#F0EEE9" stroke="none" />
                </Pie>
                <Tooltip contentStyle={{ fontFamily: 'Syne, sans-serif', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {[
              { label: 'Billable',     value: stats.billable,  color: '#00D4A8' },
              { label: 'Non-Billable', value: stats.nonBill,   color: '#E5E3DC' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{row.label}</span>
                </div>
                <span className="font-data" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{row.value.toFixed(0)}h</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Target',     value: `${stats.target.toFixed(0)}h` },
              { label: 'Attainment', value: `${stats.attainment.toFixed(1)}%`, color: semaphore(stats.attainment) },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{row.label}</span>
                <span className="font-data" style={{ fontSize: 12, fontWeight: 700, color: row.color || 'var(--text-1)' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Non-Billable Breakdown */}
      {nbBreakdown.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '24px' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-1)', margin: 0 }}>Non-Billable Breakdown</h3>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '3px 0 0' }}>Hours by category</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nbBreakdown} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#F0EEE9" />
                  <XAxis type="number" fontSize={10} axisLine={false} tickLine={false}
                    tick={{ fill: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }} />
                  <YAxis type="category" dataKey="label" width={120} fontSize={11} axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--text-2)', fontFamily: 'Syne, sans-serif', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ fontFamily: 'Syne, sans-serif', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}
                    formatter={v => [`${v.toFixed(1)}h`, 'Hours']} />
                  <Bar dataKey="value" radius={[0,4,4,0]} barSize={14}>
                    {nbBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignContent: 'start' }}>
              {nbBreakdown.map((cat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F7F4', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>{cat.label}</span>
                  </div>
                  <span className="font-data" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', marginLeft: 6 }}>{cat.value.toFixed(0)}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── REGION VIEW ──────────────────────────────────────────────────────────────
const RegionView = ({ data }) => {
  const regionList = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const k = d.region || 'N/A';
      if (!map[k]) map[k] = { name: k, billable: 0, available: 0, target: 0, total: 0, empSet: new Set() };
      map[k].billable  += (d.billableHours  || 0);
      map[k].available += (d.availableHours || 0);
      map[k].target    += (d.targetHours    || 0);
      map[k].total     += (d.hours          || 0);
      map[k].empSet.add(d.employee);
    });
    return Object.values(map).map(r => ({
      name:       r.name,
      billable:   r.billable,
      available:  r.available,
      target:     r.target,
      total:      r.total,
      headcount:  r.empSet.size,
      util:       r.available > 0 ? (r.billable / r.available) * 100 : 0,
      attainment: r.target    > 0 ? (r.billable / r.target)    * 100 : 0,
    })).sort((a, b) => b.util - a.util);
  }, [data]);

  const noRegionData = regionList.length === 1 && regionList[0].name === 'N/A';

  if (!regionList.length) return <EmptyState />;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {noRegionData && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px' }}>
          <AlertCircle size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <p style={{ fontSize: 12, fontWeight: 600, color: '#92400E', margin: 0 }}>
            Los datos no tienen región asignada. Ve a <strong>Upload Report</strong> y vuelve a subir el Excel.
          </p>
        </div>
      )}
      <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {regionList.map((region, i) => {
          const color  = REGION_COLORS[region.name] || '#6B7280';
          const pct    = region.util;
          return (
            <div key={i} className="stat-card" style={{
              background: 'var(--bg-card)', borderRadius: 16,
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${color}`,
              padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe2 size={16} style={{ color }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.01em' }}>{region.name}</h4>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontWeight: 500 }}>{region.headcount} employees</p>
                  </div>
                </div>
                <span className="font-data" style={{ fontSize: 26, fontWeight: 700, color: semaphore(pct), letterSpacing: '-0.03em' }}>
                  {pct.toFixed(1)}%
                </span>
              </div>

              <div style={{ height: 4, background: '#F0EEE9', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
                <div className={pct >= 75 ? 'bar-glow' : ''} style={{
                  height: '100%', width: `${Math.min(pct, 100)}%`,
                  background: semaphore(pct), borderRadius: 4,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Billable',   value: region.billable.toFixed(0) + 'h' },
                  { label: 'Non-Bill',   value: (Math.max(0, region.total - region.billable)).toFixed(0) + 'h' },
                  { label: 'Attainment', value: region.attainment.toFixed(1) + '%' },
                ].map((s, j) => (
                  <div key={j} style={{ background: '#F8F7F4', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>{s.label}</p>
                    <p className="font-data" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── GROUPED VIEW ─────────────────────────────────────────────────────────────
const GroupedView = ({ data, groupKey, showDetail = false }) => {
  const sorted = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const k = d[groupKey] || 'N/A';
      if (!map[k]) map[k] = {
        name: k, total: 0, billable: 0, available: 0, target: 0,
        region: d.region || 'N/A', workerCategory: d.workerCategory || '',
        orgLeader: d.orgLeader || '', department: d.department || '',
        nbSovosInternal: 0, nbTimeOff: 0, nbCustomerSupport: 0,
        nbTraining: 0, nbSalesScoping: 0, nbProductDev: 0,
        nbProductIssues: 0, nbMigration: 0, nbMarketing: 0,
        nbTrainerOnboarding: 0, nbLeave: 0,
      };
      map[k].total     += (d.hours          || 0);
      map[k].billable  += (d.billableHours  || 0);
      map[k].available += (d.availableHours || 0);
      map[k].target    += (d.targetHours    || 0);
      map[k].nbSovosInternal     += (d.nbSovosInternal     || 0);
      map[k].nbTimeOff           += (d.nbTimeOff           || 0);
      map[k].nbCustomerSupport   += (d.nbCustomerSupport   || 0);
      map[k].nbTraining          += (d.nbTraining          || 0);
      map[k].nbSalesScoping      += (d.nbSalesScoping      || 0);
      map[k].nbProductDev        += (d.nbProductDev        || 0);
      map[k].nbProductIssues     += (d.nbProductIssues     || 0);
      map[k].nbMigration         += (d.nbMigration         || 0);
      map[k].nbMarketing         += (d.nbMarketing         || 0);
      map[k].nbTrainerOnboarding += (d.nbTrainerOnboarding || 0);
      map[k].nbLeave             += (d.nbLeave             || 0);
    });
    return Object.values(map).sort((a, b) => b.available - a.available);
  }, [data, groupKey]);

  if (!sorted.length) return <EmptyState />;

  return (
    <div className="animate-in card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
      {sorted.map((item, i) => {
        const util       = item.available > 0 ? (item.billable / item.available) * 100 : 0;
        const attainment = item.target    > 0 ? (item.billable / item.target)    * 100 : 0;
        const color      = REGION_COLORS[item.region] || '#6B7280';
        const barColor   = semaphore(util);

        const nbTop = [
          { label: 'Sovos Internal', value: item.nbSovosInternal },
          { label: 'Time-Off',       value: item.nbTimeOff },
          { label: 'Cust. Support',  value: item.nbCustomerSupport },
          { label: 'Training',       value: item.nbTraining },
          { label: 'Sales',          value: item.nbSalesScoping },
          { label: 'Product Dev',    value: item.nbProductDev },
          { label: 'Product Issues', value: item.nbProductIssues },
          { label: 'Migration',      value: item.nbMigration },
          { label: 'Marketing',      value: item.nbMarketing },
          { label: 'Leave',          value: item.nbLeave },
        ].filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);

        return (
          <div key={i} className="stat-card" style={{
            background: 'var(--bg-card)', borderRadius: 16,
            border: '1px solid var(--border)',
            borderTop: `3px solid ${barColor}`,
            padding: '18px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif',
                }}>
                  {item.name.charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </h4>
                  {item.department && (
                    <p style={{ fontSize: 10, color: 'var(--text-3)', margin: '1px 0 0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.department}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: color, padding: '2px 8px', borderRadius: 20 }}>{item.region}</span>
                {item.workerCategory && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', background: '#F0EEE9', padding: '2px 7px', borderRadius: 20 }}>{item.workerCategory}</span>
                )}
              </div>
            </div>

            {/* Utilization */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Attainment</p>
                  <p className="font-data" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{attainment.toFixed(1)}%</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Utilization</p>
                  <p className="font-data" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: barColor, margin: 0, letterSpacing: '-0.03em' }}>{util.toFixed(1)}%</p>
                </div>
              </div>
              <div style={{ height: 4, background: '#F0EEE9', borderRadius: 4, overflow: 'hidden' }}>
                <div className={util >= 75 ? 'bar-glow' : ''} style={{
                  height: '100%', width: `${Math.min(util, 100)}%`,
                  background: barColor, borderRadius: 4,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>

            {/* Hours Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { label: 'Billable',  value: item.billable.toFixed(0)  + 'h' },
                { label: 'Available', value: item.available.toFixed(0) + 'h' },
                { label: 'Target',    value: item.target.toFixed(0)    + 'h' },
              ].map((s, j) => (
                <div key={j} style={{ background: '#F8F7F4', borderRadius: 7, padding: '6px', textAlign: 'center' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>{s.label}</p>
                  <p className="font-data" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Non-Billable Top 3 */}
            {showDetail && nbTop.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Top Non-Billable</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {nbTop.map((cat, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: NB_COLORS[j], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>{cat.label}</span>
                      </div>
                      <span className="font-data" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>{cat.value.toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Org Leader */}
            {!showDetail && item.orgLeader && item.orgLeader !== 'N/A' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Briefcase size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.orgLeader}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
    <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F0EEE9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      <AlertCircle size={24} style={{ opacity: 0.4 }} />
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-2)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>No data to display</h3>
    <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>No records match the selected filters.</p>
  </div>
);

// ─── UPLOAD VIEW ──────────────────────────────────────────────────────────────
const UploadView = ({ setActiveTab }) => {
  const [file, setFile]             = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus]         = useState(null);
  const [uploadMonth, setUploadMonth] = useState(new Date().toISOString().slice(0, 7));

  const processFile = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setStatus({ type: 'info', text: 'Preparing the database...' });

    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(async () => {
        try {
          const data    = new Uint8Array(e.target.result);
          const wbInfo  = XLSX.read(data, { type: 'array', bookSheets: true });
          const targets = ['individualutilization', 'nonbillableteam'];
          const sheets  = wbInfo.SheetNames.filter(s => {
            const c = s.toLowerCase().replace(/[^a-z]/g, '');
            return targets.some(t => c.includes(t));
          });
          if (!sheets.length) throw new Error("Sheets 'Individual Utilization' or 'Non Billable Team' not found.");

          const workbook = XLSX.read(data, { type: 'array', sheets, sheetRows: 2500, cellFormula: false, cellHTML: false, cellText: false, cellStyles: false });
          let totalProcessed = 0, batchCount = 0;
          const batches = [];
          let currentBatch = writeBatch(db);

          for (const sheetName of sheets) {
            const aoa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, blankrows: false, defval: null });
            const hi  = aoa.findIndex(row => {
              if (!Array.isArray(row)) return false;
              const s = row.map(c => String(c || '').toLowerCase().replace(/[^a-z]/g, '')).join('||');
              return s.includes('employeename') && s.includes('managername');
            });
            if (hi === -1) continue;

            const hc   = aoa[hi].map(h => String(h || '').toLowerCase().replace(/[^a-z]/g, ''));
            const rows = aoa.slice(hi + 1);
            const idx  = (names) => { for (const n of names) { const i = hc.indexOf(n); if (i !== -1) return i; } return -1; };

            const iEmp    = idx(['employeename','ownername']);
            const iMan    = idx(['managername','ownermanager']);
            const iBill   = idx(['billablehours','billable']);
            const iNon    = idx(['totalnonbillhours','nonbillable','nonbill']);
            const iTotal  = idx(['totalhoursentered','hoursnumber','totalworkinghours']);
            const iAvail  = idx(['totalavailablehoursdenominator','totalavailablehours']);
            const iTgt    = idx(['targetbillablehours','target']);
            const iReg    = idx(['businessregion','region']);
            const iOrg    = idx(['psorganizationalleader','organizationalleader']);
            const iWCat   = idx(['workercategory','workercategorysubtype']);
            const iDept   = idx(['department']);
            const iUtilP  = idx(['utilizationtarget']);
            const iElig   = idx(['eligibleworkdays']);
            const iNbPI   = idx(['nonbillableproductissues']);
            const iNbMig  = idx(['nonbillablemigrationupgrade']);
            const iNbCS   = idx(['nonprojectcustomersupport']);
            const iNbPD   = idx(['productdevelopmentsupport']);
            const iNbSI   = idx(['sovosinternal']);
            const iNbSS   = idx(['salesscopingsupport','salesscoping']);
            const iNbMkt  = idx(['marketingevents','marketing']);
            const iNbTr   = idx(['traininginternal','training']);
            const iNbTO   = idx(['traineronboarding','trainer']);
            const iNbTOff = idx(['timeoff']);
            const iNbLv   = idx(['leave']);

            if (iEmp === -1 || iMan === -1) continue;

            setStatus({ type: 'info', text: `Removing previous data for ${uploadMonth}...` });
            const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'ps_entries_v2'));
            const toDel = snap.docs.filter(d => d.data().month === uploadMonth);
            if (toDel.length > 0) {
              let db2 = writeBatch(db), dc = 0;
              for (const d of toDel) { db2.delete(d.ref); if (++dc === 450) { await db2.commit(); db2 = writeBatch(db); dc = 0; } }
              if (dc > 0) await db2.commit();
            }

            setStatus({ type: 'info', text: 'Processing rows...' });
            const pn = (v) => { if (!v) return 0; let s = String(v).replace(/[^0-9.,-]/g,''); if (s.includes(',')) s = s.replace(',','.'); return parseFloat(s)||0; };

            for (const row of rows) {
              if (!Array.isArray(row)) continue;
              const emp = String(row[iEmp]||'').trim();
              if (!emp || emp.toLowerCase().includes('employee name') || emp === 'N/A') continue;
              const bill = pn(row[iBill]), nonb = pn(row[iNon]);
              let total  = pn(row[iTotal]), avail = iAvail !== -1 ? pn(row[iAvail]) : 0;
              if (total === 0) total = bill + nonb;
              if (avail === 0) avail = total > 0 ? total : 160;
              if (total === 0 && avail === 0) continue;

              const entry = {
                employee:        emp,
                manager:         String(row[iMan]||'').trim()||'N/A',
                region:          iReg  !== -1 ? String(row[iReg] ||'').trim()||'N/A' : 'N/A',
                orgLeader:       iOrg  !== -1 ? String(row[iOrg] ||'').trim()||'N/A' : 'N/A',
                workerCategory:  iWCat !== -1 ? String(row[iWCat]||'').trim()||''    : '',
                department:      iDept !== -1 ? String(row[iDept]||'').trim()||''    : '',
                utilizationTargetPct: iUtilP !== -1 ? pn(row[iUtilP]) : 0,
                eligibleWorkDays:     iElig  !== -1 ? pn(row[iElig])  : 0,
                billableHours:   bill, nonBillableHours: nonb, hours: total, availableHours: avail,
                targetHours:     iTgt !== -1 ? pn(row[iTgt]) : 0,
                nbProductIssues:     iNbPI  !== -1 ? pn(row[iNbPI])  : 0,
                nbMigration:         iNbMig !== -1 ? pn(row[iNbMig]) : 0,
                nbCustomerSupport:   iNbCS  !== -1 ? pn(row[iNbCS])  : 0,
                nbProductDev:        iNbPD  !== -1 ? pn(row[iNbPD])  : 0,
                nbSovosInternal:     iNbSI  !== -1 ? pn(row[iNbSI])  : 0,
                nbSalesScoping:      iNbSS  !== -1 ? pn(row[iNbSS])  : 0,
                nbMarketing:         iNbMkt !== -1 ? pn(row[iNbMkt]) : 0,
                nbTraining:          iNbTr  !== -1 ? pn(row[iNbTr])  : 0,
                nbTrainerOnboarding: iNbTO  !== -1 ? pn(row[iNbTO])  : 0,
                nbTimeOff:           iNbTOff!== -1 ? pn(row[iNbTOff]): 0,
                nbLeave:             iNbLv  !== -1 ? pn(row[iNbLv])  : 0,
                month: uploadMonth, timestamp: Date.now(),
              };

              const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ps_entries_v2',
                `${uploadMonth}_${emp.replace(/[^a-zA-Z0-9]/g,'').toLowerCase()}`);
              currentBatch.set(docRef, entry);
              totalProcessed++;
              if (++batchCount === 450) { batches.push(currentBatch.commit()); currentBatch = writeBatch(db); batchCount = 0; }
              if (totalProcessed >= 2500) break;
            }
          }

          if (totalProcessed === 0) throw new Error('No valid records found. Check the Excel file.');
          if (batchCount > 0) batches.push(currentBatch.commit());
          setStatus({ type: 'info', text: 'Uploading to Firebase...' });
          await Promise.all(batches);
          setStatus({ type: 'success', text: `Done! ${totalProcessed} records uploaded.` });
          setFile(null);
          setTimeout(() => setActiveTab('dashboard'), 1500);

        } catch (err) {
          console.error(err);
          setStatus({ type: 'error', text: err.message });
        } finally {
          setIsUploading(false);
        }
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="animate-in" style={{ maxWidth: 480, margin: '40px auto' }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 24,
        border: '1px solid var(--border)',
        padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.04 }}>
          <FileSpreadsheet size={160} />
        </div>

        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Upload size={26} style={{ color: 'var(--accent)' }} />
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-1)', margin: '0 0 24px', textAlign: 'center' }}>Update Data</h3>

        <div style={{ width: '100%', background: '#F8F7F4', borderRadius: 12, padding: '16px', marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Report Month</label>
          <input type="month" value={uploadMonth} onChange={e => setUploadMonth(e.target.value)} style={{
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            color: 'var(--text-1)', background: '#fff',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '8px 14px', outline: 'none', width: '100%', maxWidth: 200, textAlign: 'center',
          }} />
        </div>

        <input type="file" accept=".xlsx,.xls,.csv" id="excel-file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
        <label htmlFor="excel-file" style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '16px', background: '#fff',
          border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13,
          color: file ? 'var(--accent)' : 'var(--text-3)',
          transition: 'all 0.2s', fontFamily: 'Syne, sans-serif',
        }}>
          {file ? <CheckCircle2 size={18} /> : <Search size={18} />}
          {file ? file.name : 'Select Excel File (.xlsx)'}
        </label>

        {file && (
          <button onClick={processFile} disabled={isUploading} style={{
            marginTop: 16, width: '100%', padding: '14px',
            background: isUploading ? '#F0EEE9' : '#0A0A0A',
            color: isUploading ? 'var(--text-3)' : '#fff',
            borderRadius: 12, border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
          }}>
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
            {isUploading ? 'Processing...' : 'Process and Synchronize'}
          </button>
        )}

        {status && (
          <div className="animate-in" style={{
            marginTop: 16, width: '100%', padding: '12px 14px',
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
            background: status.type === 'success' ? '#ECFDF5' : status.type === 'error' ? '#FEF2F2' : '#EFF6FF',
            border: `1px solid ${status.type === 'success' ? '#A7F3D0' : status.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
          }}>
            <AlertCircle size={14} style={{ color: status.type === 'success' ? '#059669' : status.type === 'error' ? '#DC2626' : '#2563EB', flexShrink: 0 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: status.type === 'success' ? '#065F46' : status.type === 'error' ? '#991B1B' : '#1E40AF', margin: 0 }}>{status.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── HEALTH COLORS ────────────────────────────────────────────────────────────
const HEALTH_COLOR = { Green: '#00D4A8', Yellow: '#FFB800', Red: '#F87171' };
const PHASE_COLOR  = {
  Initiation: '#38BDF8', Design: '#A78BFA', Build: '#FFB800',
  Test: '#FB923C', Cutover: '#F472B6', 'Partially Live': '#4ADE80',
  'Post-Production': '#00D4A8', Consulting: '#818CF8',
  'Pending Support Transition': '#6B7280',
};
const excelDateToStr = (n) => {
  if (!n || typeof n !== 'number') return null;
  return new Date(Math.round((n - 25569) * 86400 * 1000)).toISOString().split('T')[0];
};

// ─── PROJECTS OVERVIEW ────────────────────────────────────────────────────────
const ProjectsOverview = ({ data }) => {
  const [filterHealth,    setFilterHealth]    = useState('All');
  const [filterState,     setFilterState]     = useState('All');
  const [filterPhase,     setFilterPhase]     = useState('All');
  const [filterProduct,   setFilterProduct]   = useState('All');
  const [filterManager,   setFilterManager]   = useState('All');
  const [filterEscalated, setFilterEscalated] = useState(false);
  const [search,          setSearch]          = useState('');

  const filtered = useMemo(() => data.filter(p => {
    if (filterEscalated && !p.isEscalated)                               return false;
    if (filterHealth  !== 'All' && p.health              !== filterHealth)  return false;
    if (filterState   !== 'All' && p.projectState        !== filterState)   return false;
    if (filterPhase   !== 'All' && p.currentPhase        !== filterPhase)   return false;
    if (filterProduct !== 'All' && p.productFamily       !== filterProduct) return false;
    if (filterManager !== 'All' && p.projectOwnerManager !== filterManager) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.accountName?.toLowerCase().includes(q) &&
          !p.projectName?.toLowerCase().includes(q)  &&
          !p.projectId?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [data, filterHealth, filterState, filterPhase, filterProduct, filterManager, filterEscalated, search]);

  const total          = filtered.length;
  const active         = filtered.filter(p => p.projectState === 'Active').length;
  const onHold         = filtered.filter(p => p.projectState === 'On Hold').length;
  const redCount       = filtered.filter(p => p.health === 'Red').length;
  const yellowCount    = filtered.filter(p => p.health === 'Yellow').length;
  const greenCount     = filtered.filter(p => p.health === 'Green').length;
  const escalated      = filtered.filter(p => p.isEscalated).length;
  const totalValue     = filtered.reduce((s, p) => s + (p.bookingValue    || 0), 0);
  const totalBudgeted  = data.reduce((s, p) => s + (p.budgetedHours   || 0), 0);
  const totalRemaining = data.reduce((s, p) => s + (p.contractedHoursRem || 0), 0);
  const pctRemaining   = totalBudgeted > 0 ? (totalRemaining / totalBudgeted) * 100 : 0;

  const resetKpiFilters = () => { setFilterHealth('All'); setFilterState('All'); setFilterEscalated(false); };
  const kpiCards = [
    { key: 'total',     label: 'Total',     value: total,      color: '#6B7280', icon: <FolderKanban size={15} />, active: filterHealth === 'All' && filterState === 'All' && !filterEscalated, onClick: resetKpiFilters },
    { key: 'active',    label: 'Active',    value: active,     color: '#00D4A8', icon: <CheckCircle2 size={15} />, active: filterState === 'Active',   onClick: () => { setFilterState('Active');  setFilterHealth('All'); setFilterEscalated(false); } },
    { key: 'onhold',    label: 'On Hold',   value: onHold,     color: '#FFB800', icon: <Clock size={15} />,        active: filterState === 'On Hold',  onClick: () => { setFilterState('On Hold'); setFilterHealth('All'); setFilterEscalated(false); } },
    { key: 'red',       label: 'Red',       value: redCount,   color: '#F87171', icon: <AlertCircle size={15} />,  active: filterHealth === 'Red',     onClick: () => { setFilterHealth('Red');   setFilterState('All'); setFilterEscalated(false); } },
    { key: 'yellow',    label: 'Yellow',    value: yellowCount, color: '#FFB800', icon: <AlertCircle size={15} />, active: filterHealth === 'Yellow',   onClick: () => { setFilterHealth('Yellow'); setFilterState('All'); setFilterEscalated(false); } },
    { key: 'escalated', label: 'Escalated', value: escalated,  color: '#F472B6', icon: <TrendingUp size={15} />,  active: filterEscalated,            onClick: () => { setFilterEscalated(true); setFilterState('All'); setFilterHealth('All'); } },
  ];

  const allPhases    = useMemo(() => [...new Set(data.map(p => p.currentPhase).filter(Boolean))].sort(), [data]);
  const allProducts  = useMemo(() => [...new Set(data.map(p => p.productFamily).filter(Boolean))].sort(), [data]);
  const allStates    = useMemo(() => [...new Set(data.map(p => p.projectState).filter(Boolean))].sort(), [data]);
  const allManagers  = useMemo(() => [...new Set(data.map(p => p.projectOwnerManager).filter(Boolean))].sort(), [data]);

  const phaseChartData = allPhases.map(ph => ({
    name: ph.length > 12 ? ph.slice(0, 12) + '…' : ph,
    fullName: ph,
    Green:  filtered.filter(p => p.currentPhase === ph && p.health === 'Green').length,
    Yellow: filtered.filter(p => p.currentPhase === ph && p.health === 'Yellow').length,
    Red:    filtered.filter(p => p.currentPhase === ph && p.health === 'Red').length,
  }));

  const healthPieData = [
    { name: 'Green',  value: greenCount,  color: '#00D4A8' },
    { name: 'Yellow', value: yellowCount, color: '#FFB800' },
    { name: 'Red',    value: redCount,    color: '#F87171' },
  ].filter(d => d.value > 0);

  if (data.length === 0) return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <FolderKanban size={40} style={{ color: 'var(--text-3)' }} />
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)', margin: 0 }}>No projects loaded</p>
      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Upload a project report to get started</p>
    </div>
  );

  return (
    <div className="animate-in">
      {/* KPI cards — clickable */}
      <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 28 }}>
        {kpiCards.map(kpi => (
          <button key={kpi.key} onClick={kpi.onClick} className="stat-card" style={{
            background: kpi.active ? `${kpi.color}10` : 'var(--bg-card)',
            borderRadius: 16, padding: '18px 20px',
            border: kpi.active ? `1.5px solid ${kpi.color}60` : '1px solid var(--border)',
            position: 'relative', overflow: 'hidden',
            cursor: 'pointer', textAlign: 'left', width: '100%',
            fontFamily: 'Syne, sans-serif', transition: 'all 0.18s',
            boxShadow: kpi.active ? `0 4px 20px -4px ${kpi.color}30` : 'none',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${kpi.color}${kpi.active ? '80' : '40'}, ${kpi.color}10)` }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: kpi.active ? kpi.color : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{kpi.label}</span>
              <span style={{ color: kpi.color, opacity: kpi.active ? 1 : 0.7 }}>{kpi.icon}</span>
            </div>
            <div className="font-data" style={{ fontSize: 28, fontWeight: 700, color: kpi.active ? kpi.color : 'var(--text-1)', lineHeight: 1 }}>{kpi.value}</div>
            {kpi.active && (
              <div style={{ marginTop: 8, fontSize: 8, fontWeight: 700, color: kpi.color, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>Filtered ↓</div>
            )}
          </button>
        ))}
      </div>

      {/* Stats banner */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {/* Portfolio value */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 20px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Target size={13} style={{ color: '#A78BFA' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Portfolio Value</span>
          </div>
          <span className="font-data" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
            ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
        {/* Budgeted hours */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 20px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Clock size={13} style={{ color: '#38BDF8' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Budgeted Hours</span>
          </div>
          <span className="font-data" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
            {totalBudgeted.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>
        </div>
        {/* Contracted hours remaining */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 20px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <UserCheck size={13} style={{ color: '#4ADE80' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hours Remaining</span>
            </div>
            <span className="font-data" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
              {totalRemaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(pctRemaining, 100)}%`, background: pctRemaining > 60 ? '#4ADE80' : pctRemaining > 30 ? '#FFB800' : '#F87171', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 9, color: 'var(--text-3)', fontWeight: 600 }}>
            {pctRemaining.toFixed(1)}% of budgeted hours remaining
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FilterControl label="Health"   value={filterHealth}  options={['All','Green','Yellow','Red']} onChange={setFilterHealth} />
        <FilterControl label="State"    value={filterState}   options={['All', ...allStates]}          onChange={setFilterState} />
        <FilterControl label="Phase"    value={filterPhase}   options={['All', ...allPhases]}          onChange={setFilterPhase} />
        <FilterControl label="Product"  value={filterProduct} options={['All', ...allProducts]}        onChange={setFilterProduct} />
        <FilterControl label="Manager"  value={filterManager} options={['All', ...allManagers]}        onChange={setFilterManager} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: 2 }}>Search</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Account / Project ID…"
            style={{
              fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 500, color: 'var(--text-1)',
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '7px 12px', outline: 'none', width: 200,
            }} />
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, marginBottom: 28 }}>
        {/* Phase breakdown */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '22px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Projects by Phase &amp; Health</div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={phaseChartData} barSize={12} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'Syne' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} width={24} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'Syne', fontSize: 11 }}
                formatter={(v, name) => [v, name]}
              />
              <Bar dataKey="Green"  stackId="a" fill="#00D4A8" />
              <Bar dataKey="Yellow" stackId="a" fill="#FFB800" />
              <Bar dataKey="Red"    stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Health pie */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '22px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Health Mix</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={healthPieData} cx="50%" cy="50%" innerRadius={38} outerRadius={56} dataKey="value" paddingAngle={3}>
                {healthPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'Syne', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {healthPieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{d.name}</span>
                </div>
                <span className="font-data" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>Projects</span>
          <span className="font-data" style={{ fontSize: 10, color: 'var(--text-3)' }}>{filtered.length} shown</span>
        </div>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '20px 80px minmax(0,1fr) 130px 100px minmax(0,1fr) 90px 90px',
          gap: 12, padding: '8px 20px',
          background: '#F8F7F4', borderBottom: '1px solid var(--border)',
        }}>
          {['', 'ID', 'Account / Project', 'Phase', 'State', 'Owner', 'Go Live', 'Value (USD)'].map(h => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
          ))}
        </div>
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13, fontWeight: 600 }}>No projects match the filters</div>
          ) : filtered.slice(0, 250).map((p, i) => (
            <div key={p.id} style={{
              display: 'grid',
              gridTemplateColumns: '20px 80px minmax(0,1fr) 130px 100px minmax(0,1fr) 90px 90px',
              gap: 12, padding: '10px 20px', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8F7F4'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Health dot */}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: HEALTH_COLOR[p.health] || '#9CA3AF', boxShadow: `0 0 5px ${HEALTH_COLOR[p.health] || '#9CA3AF'}60` }} />
              {/* Project ID */}
              <span className="font-data" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{p.projectId}</span>
              {/* Account / Project name */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.accountName}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.projectName}</div>
              </div>
              {/* Phase */}
              <div>
                {p.currentPhase ? (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: `${PHASE_COLOR[p.currentPhase] || '#6B7280'}18`,
                    color: PHASE_COLOR[p.currentPhase] || '#6B7280',
                    letterSpacing: '0.04em',
                  }}>{p.currentPhase}</span>
                ) : <span style={{ fontSize: 10, color: 'var(--text-3)' }}>—</span>}
              </div>
              {/* State */}
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: p.projectState === 'Active' ? 'rgba(0,212,168,0.1)' : 'rgba(251,146,60,0.12)',
                color: p.projectState === 'Active' ? '#00D4A8' : '#FB923C',
              }}>{p.projectState || '—'}</span>
              {/* Owner */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.projectOwner || '—'}</div>
                <div style={{ fontSize: 9, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.projectOwnerManager || ''}</div>
              </div>
              {/* Target Go Live */}
              <span className="font-data" style={{ fontSize: 10, color: 'var(--text-3)' }}>{p.targetGoLiveDate || '—'}</span>
              {/* Booking Value */}
              <span className="font-data" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>
                {p.bookingValue ? `$${p.bookingValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── PROJECTS BY MANAGER VIEW ────────────────────────────────────────────────
const ProjectsByManagerView = ({ data }) => {
  const [filterHealth,  setFilterHealth]  = useState('All');
  const [filterState,   setFilterState]   = useState('All');
  const [filterPhase,   setFilterPhase]   = useState('All');
  const [search,        setSearch]        = useState('');
  const [expanded,      setExpanded]      = useState({});

  const allPhases = useMemo(() => [...new Set(data.map(p => p.currentPhase).filter(Boolean))].sort(), [data]);
  const allStates = useMemo(() => [...new Set(data.map(p => p.projectState).filter(Boolean))].sort(), [data]);

  const filtered = useMemo(() => data.filter(p => {
    if (filterHealth !== 'All' && p.health       !== filterHealth) return false;
    if (filterState  !== 'All' && p.projectState !== filterState)  return false;
    if (filterPhase  !== 'All' && p.currentPhase !== filterPhase)  return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.accountName?.toLowerCase().includes(q) &&
          !p.projectName?.toLowerCase().includes(q)  &&
          !p.projectId?.toLowerCase().includes(q)    &&
          !p.projectOwnerManager?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [data, filterHealth, filterState, filterPhase, search]);

  // Group by manager
  const groups = useMemo(() => {
    const map = {};
    for (const p of filtered) {
      const mgr = p.projectOwnerManager || 'Unassigned';
      if (!map[mgr]) map[mgr] = [];
      map[mgr].push(p);
    }
    return Object.entries(map)
      .map(([mgr, projects]) => ({
        manager: mgr,
        projects,
        total:  projects.length,
        active: projects.filter(p => p.projectState === 'Active').length,
        red:    projects.filter(p => p.health === 'Red').length,
        yellow: projects.filter(p => p.health === 'Yellow').length,
        green:  projects.filter(p => p.health === 'Green').length,
        value:  projects.reduce((s, p) => s + (p.bookingValue || 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const toggleAll = (open) => {
    const next = {};
    groups.forEach(g => { next[g.manager] = open; });
    setExpanded(next);
  };

  if (data.length === 0) return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <Users size={40} style={{ color: 'var(--text-3)' }} />
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)', margin: 0 }}>No projects loaded</p>
      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Upload a project report first</p>
    </div>
  );

  return (
    <div className="animate-in">
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FilterControl label="Health" value={filterHealth} options={['All','Green','Yellow','Red']} onChange={setFilterHealth} />
          <FilterControl label="State"  value={filterState}  options={['All', ...allStates]}          onChange={setFilterState} />
          <FilterControl label="Phase"  value={filterPhase}  options={['All', ...allPhases]}          onChange={setFilterPhase} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: 2 }}>Search</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Account / Manager…"
              style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', outline: 'none', width: 180 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="font-data" style={{ fontSize: 10, color: 'var(--text-3)' }}>{groups.length} managers · {filtered.length} projects</span>
          <button onClick={() => toggleAll(true)} style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--accent)', background: 'var(--accent-dim)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Expand all</button>
          <button onClick={() => toggleAll(false)} style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--text-3)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Collapse all</button>
        </div>
      </div>

      {/* Manager groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map(g => {
          const isOpen = !!expanded[g.manager];
          return (
            <div key={g.manager} style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {/* Manager header */}
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [g.manager]: !prev[g.manager] }))}
                style={{
                  width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8F7F4'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {/* Expand icon */}
                <ChevronRight size={14} style={{ color: 'var(--text-3)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />

                {/* Manager name */}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.manager}
                </span>

                {/* Health dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {g.red > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F87171' }} />
                      <span className="font-data" style={{ fontSize: 11, fontWeight: 700, color: '#F87171' }}>{g.red}</span>
                    </div>
                  )}
                  {g.yellow > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFB800' }} />
                      <span className="font-data" style={{ fontSize: 11, fontWeight: 700, color: '#FFB800' }}>{g.yellow}</span>
                    </div>
                  )}
                  {g.green > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00D4A8' }} />
                      <span className="font-data" style={{ fontSize: 11, fontWeight: 700, color: '#00D4A8' }}>{g.green}</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />

                {/* Summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-data" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{g.total}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>projects</div>
                  </div>
                  {g.value > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-data" style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA' }}>
                        ${g.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>value</div>
                    </div>
                  )}
                </div>
              </button>

              {/* Projects list */}
              {isOpen && (
                <div>
                  {/* Sub-header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '20px 80px minmax(0,1fr) 130px 100px minmax(0,1fr) 90px 90px',
                    gap: 12, padding: '7px 20px', background: '#FAFAF8',
                  }}>
                    {['', 'ID', 'Account / Project', 'Phase', 'State', 'Owner', 'Go Live', 'Value'].map(h => (
                      <span key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
                    ))}
                  </div>
                  {g.projects.map((p, i) => (
                    <div key={p.id} style={{
                      display: 'grid', gridTemplateColumns: '20px 80px minmax(0,1fr) 130px 100px minmax(0,1fr) 90px 90px',
                      gap: 12, padding: '9px 20px', alignItems: 'center',
                      borderTop: '1px solid var(--border)', transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8F7F4'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: HEALTH_COLOR[p.health] || '#9CA3AF', boxShadow: `0 0 4px ${HEALTH_COLOR[p.health] || '#9CA3AF'}60` }} />
                      <span className="font-data" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{p.projectId}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.accountName}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.projectName}</div>
                      </div>
                      <div>
                        {p.currentPhase ? (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${PHASE_COLOR[p.currentPhase] || '#6B7280'}18`, color: PHASE_COLOR[p.currentPhase] || '#6B7280', letterSpacing: '0.04em' }}>{p.currentPhase}</span>
                        ) : <span style={{ fontSize: 10, color: 'var(--text-3)' }}>—</span>}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: p.projectState === 'Active' ? 'rgba(0,212,168,0.1)' : 'rgba(251,146,60,0.12)', color: p.projectState === 'Active' ? '#00D4A8' : '#FB923C' }}>{p.projectState || '—'}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.projectOwner || '—'}</div>
                      </div>
                      <span className="font-data" style={{ fontSize: 10, color: 'var(--text-3)' }}>{p.targetGoLiveDate || '—'}</span>
                      <span className="font-data" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>
                        {p.bookingValue ? `$${p.bookingValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── UPLOAD PROJECTS VIEW ─────────────────────────────────────────────────────
const UploadProjectsView = ({ setActiveTab }) => {
  const [file, setFile]               = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus]           = useState(null);

  const processFile = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setStatus({ type: 'info', text: 'Reading file…' });

    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(async () => {
        try {
          const data     = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', sheetRows: 3000, cellFormula: false, cellHTML: false });
          const ws       = workbook.Sheets[workbook.SheetNames[0]];
          if (!ws) throw new Error('No sheet found in file.');
          const aoa  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
          const rows = aoa.slice(1).filter(r => Array.isArray(r) && r[0]);
          if (!rows.length) throw new Error('No data rows found.');

          setStatus({ type: 'info', text: `Processing ${rows.length} projects…` });

          // Delete existing
          const col  = collection(db, 'artifacts', appId, 'public', 'data', 'ps_projects_v1');
          const snap = await getDocs(col);
          if (!snap.empty) {
            let bDel = writeBatch(db), dc = 0;
            for (const d of snap.docs) {
              bDel.delete(d.ref);
              if (++dc === 450) { await bDel.commit(); bDel = writeBatch(db); dc = 0; }
            }
            if (dc > 0) await bDel.commit();
          }

          // Write new
          let batch = writeBatch(db), bc = 0, total = 0;
          for (const row of rows) {
            const pid = String(row[0] || '').trim();
            if (!pid) continue;
            const entry = {
              projectId:           pid,
              accountName:         String(row[1]  || '').trim(),
              accountSegment:      String(row[2]  || '').trim(),
              projectName:         String(row[3]  || '').trim(),
              deliveryRegion:      String(row[4]  || '').trim(),
              region:              String(row[5]  || '').trim(),
              country:             String(row[6]  || '').trim(),
              productFamily:       String(row[7]  || '').trim(),
              solution:            String(row[8]  || '').trim(),
              integrationType:     String(row[9]  || '').trim(),
              projectState:        String(row[12] || '').trim(),
              onHoldReason:        String(row[13] || '').trim(),
              startDate:           excelDateToStr(row[14]),
              endDate:             excelDateToStr(row[15]),
              targetGoLiveDate:    excelDateToStr(row[16]),
              finalGoLiveDate:     excelDateToStr(row[17]),
              bookingValue:        typeof row[19] === 'number' ? row[19] : 0,
              budgetedHours:       typeof row[22] === 'number' ? row[22] : 0,
              contractedHoursRem:  typeof row[23] === 'number' ? row[23] : 0,
              billingType:         String(row[24] || '').trim(),
              psOrderType:         String(row[25] || '').trim(),
              isEscalated:         row[27] === 1 || row[27] === true,
              businessMarket:      String(row[28] || '').trim(),
              solutionsConsultant: String(row[29] || '').trim(),
              technicalResource:   String(row[30] || '').trim(),
              health:              String(row[33] || '').trim(),
              healthIssue:         String(row[34] || '').trim(),
              utilizationCategory: String(row[35] || '').trim(),
              projectOwnerManager: String(row[41] || '').trim(),
              projectOwner:        String(row[42] || '').trim(),
              currentPhase:        String(row[43] || '').trim() || null,
              uploadedAt:          Date.now(),
            };
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ps_projects_v1', pid);
            batch.set(docRef, entry);
            total++;
            if (++bc === 450) { await batch.commit(); batch = writeBatch(db); bc = 0; }
          }
          if (bc > 0) await batch.commit();
          setStatus({ type: 'success', text: `Done! ${total} projects uploaded.` });
          setFile(null);
          setTimeout(() => setActiveTab('overview'), 1500);
        } catch (err) {
          console.error(err);
          setStatus({ type: 'error', text: err.message });
        } finally {
          setIsUploading(false);
        }
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="animate-in" style={{ maxWidth: 480, margin: '40px auto' }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 24,
        border: '1px solid var(--border)', padding: '40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.04 }}>
          <FolderKanban size={160} />
        </div>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <FolderKanban size={26} style={{ color: '#A78BFA' }} />
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-1)', margin: '0 0 8px', textAlign: 'center' }}>Upload Project Report</h3>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 24px', textAlign: 'center' }}>Salesforce project export (.xls / .xlsx)</p>

        <input type="file" accept=".xlsx,.xls,.csv" id="proj-file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
        <label htmlFor="proj-file" style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '16px', background: '#fff',
          border: `2px dashed ${file ? '#A78BFA' : 'var(--border)'}`,
          borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13,
          color: file ? '#A78BFA' : 'var(--text-3)',
          transition: 'all 0.2s', fontFamily: 'Syne, sans-serif',
        }}>
          {file ? <CheckCircle2 size={18} /> : <Search size={18} />}
          {file ? file.name : 'Select Project Report (.xls)'}
        </label>

        {file && (
          <button onClick={processFile} disabled={isUploading} style={{
            marginTop: 16, width: '100%', padding: '14px',
            background: isUploading ? '#F0EEE9' : '#0A0A0A',
            color: isUploading ? 'var(--text-3)' : '#fff',
            borderRadius: 12, border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
          }}>
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FolderKanban size={16} />}
            {isUploading ? 'Processing…' : 'Upload Projects'}
          </button>
        )}

        {status && (
          <div className="animate-in" style={{
            marginTop: 16, width: '100%', padding: '12px 14px',
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
            background: status.type === 'success' ? '#ECFDF5' : status.type === 'error' ? '#FEF2F2' : '#EFF6FF',
            border: `1px solid ${status.type === 'success' ? '#A7F3D0' : status.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
          }}>
            <AlertCircle size={14} style={{ color: status.type === 'success' ? '#059669' : status.type === 'error' ? '#DC2626' : '#2563EB', flexShrink: 0 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: status.type === 'success' ? '#065F46' : status.type === 'error' ? '#991B1B' : '#1E40AF', margin: 0 }}>{status.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
