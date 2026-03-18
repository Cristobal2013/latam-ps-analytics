import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, writeBatch, getDocs } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  LayoutDashboard, Upload, Users, FileText, Loader2, TrendingUp, Clock,
  AlertCircle, CheckCircle2, Search, ChevronRight, FileSpreadsheet, Database,
  Globe2, UserCheck, Target, CalendarDays, Briefcase
} from 'lucide-react';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'ps-utilization-v2';

const REGION_COLORS = {
  'LATAM':          '#3b82f6',
  'EMEA':           '#10b981',
  'COE':            '#8b5cf6',
  'SUT':            '#f59e0b',
  'Trust Services': '#ec4899',
  'UP Consulting':  '#06b6d4',
  'N/A':            '#94a3b8',
};

const NB_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#a855f7','#64748b'];

const App = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hoursData, setHoursData] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState('All');
  const [filterRegion, setFilterRegion]   = useState('All');
  const [filterManager, setFilterManager] = useState('All');
  const [filterEmployee, setFilterEmployee] = useState('All');

  useEffect(() => {
    signInAnonymously(auth).catch((e) => console.warn('Auth:', e.message));
  }, []);

  useEffect(() => {
    const col = collection(db, 'artifacts', appId, 'public', 'data', 'ps_entries_v2');
    const unsub = onSnapshot(col, (snap) => {
      setHoursData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  const availableMonths = useMemo(() => {
    const m = [...new Set(hoursData.map(d => d.month))].filter(Boolean).sort().reverse();
    return ['All', ...m];
  }, [hoursData]);

  const regions = useMemo(() => {
    const base = filterMonth => filterMonth === 'All' ? hoursData : hoursData.filter(d => d.month === filterMonth);
    return ['All', ...new Set(base(selectedMonth).map(d => d.region || 'N/A'))].sort();
  }, [hoursData, selectedMonth]);

  const managers = useMemo(() => {
    const base = hoursData
      .filter(d => selectedMonth === 'All' || d.month === selectedMonth)
      .filter(d => filterRegion  === 'All' || d.region === filterRegion);
    return ['All', ...new Set(base.map(d => d.manager))].sort();
  }, [hoursData, selectedMonth, filterRegion]);

  const employees = useMemo(() => {
    const base = hoursData
      .filter(d => selectedMonth === 'All' || d.month === selectedMonth)
      .filter(d => filterRegion  === 'All' || d.region === filterRegion)
      .filter(d => filterManager === 'All' || d.manager === filterManager);
    return ['All', ...new Set(base.map(d => d.employee))].sort();
  }, [hoursData, selectedMonth, filterRegion, filterManager]);

  const filteredData = useMemo(() => hoursData.filter(d => {
    if (selectedMonth !== 'All' && d.month    !== selectedMonth)  return false;
    if (filterRegion  !== 'All' && d.region   !== filterRegion)   return false;
    if (filterManager !== 'All' && d.manager  !== filterManager)  return false;
    if (filterEmployee !== 'All' && d.employee !== filterEmployee) return false;
    return true;
  }), [hoursData, selectedMonth, filterRegion, filterManager, filterEmployee]);

  const resetFilters = (except = {}) => {
    if (!except.region)   setFilterRegion('All');
    if (!except.manager)  setFilterManager('All');
    if (!except.employee) setFilterEmployee('All');
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-400 font-medium animate-pulse text-sm">Downloading data from the server...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col shrink-0 shadow-2xl overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp size={22} className="text-blue-400" />
            </div>
            <span className="font-black text-xl tracking-tight text-white">PS Analytics</span>
          </div>
          <div className="h-1 w-12 bg-blue-500 rounded-full mt-2 ml-1"></div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard"        active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Upload size={18} />}          label="Upload Report"    active={activeTab === 'upload'}    onClick={() => setActiveTab('upload')} />
          <SidebarItem icon={<Globe2 size={18} />}          label="By Region"        active={activeTab === 'regions'}   onClick={() => setActiveTab('regions')} />
          <SidebarItem icon={<Users size={18} />}           label="By Manager"       active={activeTab === 'managers'}  onClick={() => setActiveTab('managers')} />
          <SidebarItem icon={<FileText size={18} />}        label="By Employee"      active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Database</p>
            <p className="text-[11px] text-blue-400 font-mono text-center truncate">latamproyect-51db8</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Control Panel</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-400 font-medium">PS Utilization Overview</p>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <Database size={11} />
                  <span>{hoursData.length} records</span>
                </div>
                {filteredData.length !== hoursData.length && (
                  <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <span>{filteredData.length} filtered</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 items-end flex-wrap justify-end">
              <FilterControl label="Month"    value={selectedMonth}  options={availableMonths} onChange={v => { setSelectedMonth(v); resetFilters(); }} />
              <FilterControl label="Region"   value={filterRegion}   options={regions}         onChange={v => { setFilterRegion(v); setFilterManager('All'); setFilterEmployee('All'); }} />
              <FilterControl label="Manager"  value={filterManager}  options={managers}        onChange={v => { setFilterManager(v); setFilterEmployee('All'); }} />
              <FilterControl label="Employee" value={filterEmployee} options={employees}       onChange={setFilterEmployee} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView data={filteredData} />}
            {activeTab === 'upload'    && <UploadView setActiveTab={setActiveTab} />}
            {activeTab === 'regions'   && <RegionView data={filteredData} />}
            {activeTab === 'managers'  && <GroupedView data={filteredData} groupKey="manager" />}
            {activeTab === 'employees' && <GroupedView data={filteredData} groupKey="employee" showDetail />}
          </div>
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
    }`}
  >
    <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>{icon}</span>
    <span className="text-sm font-bold tracking-wide">{label}</span>
    {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
  </button>
);

const FilterControl = ({ label, value, options, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs font-bold bg-slate-100 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer min-w-[120px]"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const DashboardView = ({ data }) => {
  const [chartView, setChartView] = useState('employee');

  const stats = useMemo(() => {
    const total     = data.reduce((s, d) => s + (d.hours || 0), 0);
    const available = data.reduce((s, d) => s + (d.availableHours || 0), 0);
    const billable  = data.reduce((s, d) => s + (d.billableHours || 0), 0);
    const nonBill   = data.reduce((s, d) => s + (d.nonBillableHours || 0), 0);
    const target    = data.reduce((s, d) => s + (d.targetHours || 0), 0);
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
    let results = Object.values(map).map(item => ({
      name: item.name,
      utilPercent: item.available > 0 ? Number(((item.billable / item.available) * 100).toFixed(1)) : 0
    }));
    if (chartView === 'month' || chartView === 'region') {
      results.sort((a, b) => b.utilPercent - a.utilPercent);
    } else {
      results.sort((a, b) => b.utilPercent - a.utilPercent);
      results = results.slice(0, 15);
    }
    return results;
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
      { key: 'nbTrainerOnboarding',  label: 'Trainer Onboarding' },
      { key: 'nbLeave',              label: 'Leave' },
    ];
    return cats
      .map((c, i) => ({ ...c, value: data.reduce((s, d) => s + (d[c.key] || 0), 0), color: NB_COLORS[i] }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  if (!data.length) return <EmptyState />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Headcount"       value={stats.headcount}              icon={<UserCheck size={20}/>}    color="blue" />
        <StatCard title="Logged Hours"    value={stats.total.toFixed(0)}       icon={<Clock size={20}/>}        color="slate" />
        <StatCard title="Utilization"     value={`${stats.util.toFixed(1)}%`}  icon={<TrendingUp size={20}/>}   color="emerald" />
        <StatCard title="Attainment"      value={`${stats.attainment.toFixed(1)}%`} icon={<Target size={20}/>} color="indigo" />
        <StatCard title="Billable"        value={stats.billable.toFixed(0)}    icon={<CheckCircle2 size={20}/>} color="cyan" />
        <StatCard title="Non-Billable"    value={stats.nonBill.toFixed(0)}     icon={<AlertCircle size={20}/>}  color="amber" />
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Utilization bar chart with 3-way toggle */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-800 text-base">Utilization Distribution</h3>
              <p className="text-xs text-slate-400 font-medium">% Billable / Available</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner gap-0.5">
              {[['employee','Personnel'],['region','Region'],['month','Month']].map(([v, label]) => (
                <button key={v} onClick={() => setChartView(v)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${chartView === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: chartView === 'employee' ? 55 : 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  angle={chartView === 'employee' ? -40 : 0}
                  textAnchor={chartView === 'employee' ? 'end' : 'middle'} />
                <YAxis fontSize={10} axisLine={false} tickLine={false}
                  tick={{ fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                <Tooltip cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={v => [`${v}%`, 'Utilization']} />
                <Bar dataKey="utilPercent" name="% Utilization" radius={[4,4,0,0]}
                  barSize={chartView === 'employee' ? 20 : 40}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={
                      chartView === 'region' ? (REGION_COLORS[entry.name] || '#94a3b8') :
                      entry.utilPercent >= 75 ? '#10b981' :
                      entry.utilPercent >= 50 ? '#f59e0b' : '#ef4444'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hours mix pie */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-black text-slate-800 text-base mb-4 text-center">Hours Mix</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: 'Billable', value: stats.billable },
                    { name: 'Non-Billable', value: stats.nonBill }
                  ]} innerRadius={50} outerRadius={72} paddingAngle={6} dataKey="value">
                    <Cell fill="#3b82f6" stroke="none" />
                    <Cell fill="#e2e8f0" stroke="none" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-4 space-y-2">
              <LegendItem label="Billable"     value={stats.billable} color="bg-blue-500" />
              <LegendItem label="Non-Billable" value={stats.nonBill}  color="bg-slate-200" />
            </div>
            <div className="w-full mt-4 pt-4 border-t border-slate-100 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Target Hours</span>
                <span className="font-black text-slate-700">{stats.target.toFixed(0)}h</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold">Attainment</span>
                <span className={`font-black ${stats.attainment >= 75 ? 'text-emerald-600' : stats.attainment >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {stats.attainment.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Non-billable breakdown */}
      {nbBreakdown.length > 0 && (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="mb-5">
            <h3 className="font-black text-slate-800 text-base">Non-Billable Breakdown</h3>
            <p className="text-xs text-slate-400 font-medium">Hours by category</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nbBreakdown} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="label" width={130} fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={v => [`${v.toFixed(1)}h`, 'Hours']} />
                  <Bar dataKey="value" radius={[0,4,4,0]} barSize={16}>
                    {nbBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 content-start">
              {nbBreakdown.map((cat, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-xs font-bold text-slate-600 truncate">{cat.label}</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 ml-2">{cat.value.toFixed(0)}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── REGION VIEW ─────────────────────────────────────────────────────────────
const RegionView = ({ data }) => {
  const regions = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const k = d.region || 'N/A';
      if (!map[k]) map[k] = { name: k, billable: 0, available: 0, target: 0, total: 0, employees: new Set() };
      map[k].billable  += (d.billableHours  || 0);
      map[k].available += (d.availableHours || 0);
      map[k].target    += (d.targetHours    || 0);
      map[k].total     += (d.hours          || 0);
      map[k].employees.add(d.employee);
    });
    return Object.values(map)
      .map(r => ({
        ...r,
        headcount:  r.employees.size,
        util:       r.available > 0 ? (r.billable / r.available) * 100 : 0,
        attainment: r.target    > 0 ? (r.billable / r.target)    * 100 : 0,
      }))
      .sort((a, b) => b.util - a.util);
  }, [data]);

  if (!regions.length) return <EmptyState />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {regions.map((region, i) => {
          const color = REGION_COLORS[region.name] || '#94a3b8';
          const status = region.util >= 75 ? 'emerald' : region.util >= 50 ? 'amber' : 'red';
          const statusColors = {
            emerald: { text: 'text-emerald-600', bar: 'bg-emerald-500', border: 'border-l-emerald-500' },
            amber:   { text: 'text-amber-500',   bar: 'bg-amber-400',   border: 'border-l-amber-400' },
            red:     { text: 'text-red-500',      bar: 'bg-red-500',     border: 'border-l-red-500' },
          }[status];

          return (
            <div key={i} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all border-l-[6px] ${statusColors.border}`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                    style={{ backgroundColor: color }}>
                    <Globe2 size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">{region.name}</h4>
                    <p className="text-xs text-slate-400 font-bold">{region.headcount} employees</p>
                  </div>
                </div>
                <p className={`text-3xl font-black ${statusColors.text}`}>{region.util.toFixed(1)}%</p>
              </div>

              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-5">
                <div className={`h-full rounded-full ${statusColors.bar}`} style={{ width: `${Math.min(region.util, 100)}%` }}></div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Billable',    value: region.billable.toFixed(0)  + 'h' },
                  { label: 'Non-Bill',    value: (region.total - region.billable > 0 ? region.total - region.billable : 0).toFixed(0) + 'h' },
                  { label: 'Attainment',  value: region.attainment.toFixed(1) + '%' },
                ].map((stat, j) => (
                  <div key={j} className="bg-slate-50 rounded-xl p-2 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-sm font-black text-slate-800">{stat.value}</p>
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

// ─── GROUPED VIEW (Managers / Employees) ─────────────────────────────────────
const GroupedView = ({ data, groupKey, showDetail = false }) => {
  const sorted = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const k = d[groupKey] || 'N/A';
      if (!map[k]) map[k] = {
        name: k, total: 0, billable: 0, available: 0, target: 0,
        region: d.region || 'N/A',
        workerCategory: d.workerCategory || '',
        orgLeader: d.orgLeader || '',
        department: d.department || '',
        nbSovosInternal: 0, nbTimeOff: 0, nbCustomerSupport: 0,
        nbTraining: 0, nbSalesScoping: 0, nbProductDev: 0,
        nbProductIssues: 0, nbMigration: 0, nbMarketing: 0,
        nbTrainerOnboarding: 0, nbLeave: 0,
        months: new Set(),
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
      if (d.month) map[k].months.add(d.month);
    });
    return Object.values(map).sort((a, b) => b.available - a.available);
  }, [data, groupKey]);

  if (!sorted.length) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {sorted.map((item, i) => {
        const utilPercent  = item.available > 0 ? (item.billable / item.available) * 100 : 0;
        const attainment   = item.target    > 0 ? (item.billable / item.target)    * 100 : 0;
        const regionColor  = REGION_COLORS[item.region] || '#94a3b8';

        const status = utilPercent >= 75 ? 'emerald' : utilPercent >= 50 ? 'amber' : 'red';
        const sc = {
          emerald: { text: 'text-emerald-600', bar: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-l-emerald-500' },
          amber:   { text: 'text-amber-500',   bar: 'bg-amber-400',   light: 'bg-amber-50',   border: 'border-l-amber-400' },
          red:     { text: 'text-red-500',      bar: 'bg-red-500',     light: 'bg-red-50',     border: 'border-l-red-500' },
        }[status];

        // Top 3 non-billable categories for this person/manager
        const nbCats = [
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
          <div key={i} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all border-l-[6px] ${sc.border} flex flex-col gap-4`}>
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0 text-sm">
                  {item.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-slate-800 tracking-tight leading-tight truncate">{item.name}</h4>
                  {item.department && <p className="text-[10px] text-slate-400 font-medium truncate">{item.department}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: regionColor }}>{item.region}</span>
                {item.workerCategory && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.workerCategory}</span>
                )}
              </div>
            </div>

            {/* Utilization + Attainment */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attainment</p>
                  <p className="text-lg font-black text-slate-700">{attainment.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilization</p>
                  <p className={`text-4xl font-black leading-none ${sc.text}`}>{utilPercent.toFixed(1)}%</p>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${sc.bar}`} style={{ width: `${Math.min(utilPercent, 100)}%` }}></div>
              </div>
            </div>

            {/* Hours summary */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Billable',  value: item.billable.toFixed(0)  + 'h' },
                { label: 'Available', value: item.available.toFixed(0) + 'h' },
                { label: 'Target',    value: item.target.toFixed(0)    + 'h' },
              ].map((s, j) => (
                <div key={j} className="bg-slate-50 rounded-xl p-2 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</p>
                  <p className="text-sm font-black text-slate-800">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Non-billable top 3 */}
            {showDetail && nbCats.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Top Non-Billable</p>
                <div className="space-y-1.5">
                  {nbCats.map((cat, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NB_COLORS[j] }}></div>
                        <span className="text-xs font-bold text-slate-500">{cat.label}</span>
                      </div>
                      <span className="text-xs font-black text-slate-700">{cat.value.toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Org leader (managers view) */}
            {!showDetail && item.orgLeader && item.orgLeader !== 'N/A' && (
              <div className="border-t border-slate-100 pt-3 flex items-center gap-2">
                <Briefcase size={12} className="text-slate-400 shrink-0" />
                <p className="text-xs text-slate-400 font-bold truncate">{item.orgLeader}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const statColorMap = {
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-600'    },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-600'  },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-600'   },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-600'    },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-600'   },
};

const StatCard = ({ title, value, icon, color }) => {
  const c = statColorMap[color] || statColorMap.blue;
  return (
    <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
      <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{title}</p>
        <h4 className="text-2xl font-black text-slate-800 leading-none">{value}</h4>
      </div>
    </div>
  );
};

const LegendItem = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
      <span className="text-xs font-bold text-slate-500">{label}</span>
    </div>
    <span className="text-xs font-black text-slate-800">{value.toFixed(1)}h</span>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-32 text-slate-400 animate-in fade-in">
    <AlertCircle size={56} className="mb-5 opacity-20" />
    <h3 className="text-xl font-bold text-slate-600 mb-2">No data to display</h3>
    <p className="text-sm max-w-md text-center">No records match the selected filters.</p>
  </div>
);

// ─── UPLOAD VIEW ──────────────────────────────────────────────────────────────
const UploadView = ({ setActiveTab }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [uploadMonth, setUploadMonth] = useState(new Date().toISOString().slice(0, 7));

  const processFile = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setStatus({ type: 'info', text: 'Preparing the database...' });

    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(async () => {
        try {
          const data = new Uint8Array(e.target.result);
          const wbInfo = XLSX.read(data, { type: 'array', bookSheets: true });

          const targetSheets = ['individualutilization', 'nonbillableteam'];
          const sheetsToScan = wbInfo.SheetNames.filter(s => {
            const clean = s.toLowerCase().replace(/[^a-z]/g, '');
            return targetSheets.some(t => clean.includes(t));
          });

          if (!sheetsToScan.length) throw new Error("Sheets 'Individual Utilization' or 'Non Billable Team' not found.");

          const workbook = XLSX.read(data, {
            type: 'array', sheets: sheetsToScan, sheetRows: 2500,
            cellFormula: false, cellHTML: false, cellText: false, cellStyles: false
          });

          let totalProcessed = 0, batchCount = 0;
          const batches = [];
          let currentBatch = writeBatch(db);

          for (const sheetName of sheetsToScan) {
            const jsonAoa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
              header: 1, blankrows: false, defval: null
            });

            const headerRowIndex = jsonAoa.findIndex(row => {
              if (!Array.isArray(row)) return false;
              const s = row.map(c => String(c || '').toLowerCase().replace(/[^a-z]/g, '')).join('||');
              return s.includes('employeename') && s.includes('managername');
            });

            if (headerRowIndex === -1) continue;

            const headersClean = jsonAoa[headerRowIndex].map(h => String(h || '').toLowerCase().replace(/[^a-z]/g, ''));
            const rows = jsonAoa.slice(headerRowIndex + 1);

            const getIdx = (names) => {
              for (const n of names) { const i = headersClean.indexOf(n); if (i !== -1) return i; }
              return -1;
            };

            // Core fields
            const idxEmp       = getIdx(['employeename', 'ownername']);
            const idxMan       = getIdx(['managername', 'ownermanager']);
            const idxBill      = getIdx(['billablehours', 'billable']);
            const idxNon       = getIdx(['totalnonbillhours', 'nonbillable', 'nonbill']);
            const idxTotal     = getIdx(['totalhoursentered', 'hoursnumber', 'totalworkinghours']);
            const idxAvail     = getIdx(['totalavailablehoursdenominator', 'totalavailablehours']);
            const idxTarget    = getIdx(['targetbillablehours', 'target']);
            // New fields
            const idxRegion    = getIdx(['businessregion', 'region']);
            const idxOrgLeader = getIdx(['psorganizationalleader', 'organizationalleader']);
            const idxWorkerCat = getIdx(['workercategory', 'workercategorysubtype']);
            const idxDept      = getIdx(['department']);
            const idxUtilPct   = getIdx(['utilizationtarget']);
            const idxEligible  = getIdx(['eligibleworkdays']);
            // Non-billable breakdown
            const idxNbProductIssues = getIdx(['nonbillableproductissues']);
            const idxNbMigration     = getIdx(['nonbillablemigrationupgrade']);
            const idxNbCustSupport   = getIdx(['nonprojectcustomersupport']);
            const idxNbProductDev    = getIdx(['productdevelopmentsupport']);
            const idxNbSovosInt      = getIdx(['sovosinternal']);
            const idxNbSales         = getIdx(['salesscopingsupport', 'salesscoping']);
            const idxNbMarketing     = getIdx(['marketingevents', 'marketing']);
            const idxNbTraining      = getIdx(['traininginternal', 'training']);
            const idxNbTrainer       = getIdx(['traineronboarding', 'trainer']);
            const idxNbTimeOff       = getIdx(['timeoff']);
            const idxNbLeave         = getIdx(['leave']);

            if (idxEmp === -1 || idxMan === -1) continue;

            setStatus({ type: 'info', text: `Removing previous data for ${uploadMonth}...` });
            const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'ps_entries_v2'));
            const toDelete = snapshot.docs.filter(d => d.data().month === uploadMonth);

            if (toDelete.length > 0) {
              let delBatch = writeBatch(db), delCount = 0;
              for (const d of toDelete) {
                delBatch.delete(d.ref);
                if (++delCount === 450) { await delBatch.commit(); delBatch = writeBatch(db); delCount = 0; }
              }
              if (delCount > 0) await delBatch.commit();
            }

            setStatus({ type: 'info', text: 'Processing rows...' });

            const parseNum = (val) => {
              if (!val) return 0;
              let v = String(val).replace(/[^0-9.,-]/g, '');
              if (v.includes(',')) v = v.replace(',', '.');
              return parseFloat(v) || 0;
            };

            for (const row of rows) {
              if (!Array.isArray(row)) continue;
              const empName = String(row[idxEmp] || '').trim();
              if (!empName || empName.toLowerCase().includes('employee name') || empName === 'N/A') continue;

              const billable    = parseNum(row[idxBill]);
              const nonBillable = parseNum(row[idxNon]);
              let total         = parseNum(row[idxTotal]);
              let available     = idxAvail   !== -1 ? parseNum(row[idxAvail])   : 0;
              const target      = idxTarget  !== -1 ? parseNum(row[idxTarget])  : 0;

              if (total === 0)     total     = billable + nonBillable;
              if (available === 0) available = total > 0 ? total : 160;

              if (total === 0 && available === 0) continue;

              const entry = {
                employee:        empName,
                manager:         String(row[idxMan]       || '').trim() || 'N/A',
                region:          idxRegion    !== -1 ? String(row[idxRegion]    || '').trim() || 'N/A' : 'N/A',
                orgLeader:       idxOrgLeader !== -1 ? String(row[idxOrgLeader] || '').trim() || 'N/A' : 'N/A',
                workerCategory:  idxWorkerCat !== -1 ? String(row[idxWorkerCat] || '').trim() || ''    : '',
                department:      idxDept      !== -1 ? String(row[idxDept]      || '').trim() || ''    : '',
                utilizationTargetPct: idxUtilPct  !== -1 ? parseNum(row[idxUtilPct])  : 0,
                eligibleWorkDays:     idxEligible !== -1 ? parseNum(row[idxEligible]) : 0,
                billableHours:   billable,
                nonBillableHours: nonBillable,
                hours:           total,
                availableHours:  available,
                targetHours:     target,
                // Non-billable breakdown
                nbProductIssues:     idxNbProductIssues !== -1 ? parseNum(row[idxNbProductIssues]) : 0,
                nbMigration:         idxNbMigration     !== -1 ? parseNum(row[idxNbMigration])     : 0,
                nbCustomerSupport:   idxNbCustSupport   !== -1 ? parseNum(row[idxNbCustSupport])   : 0,
                nbProductDev:        idxNbProductDev    !== -1 ? parseNum(row[idxNbProductDev])    : 0,
                nbSovosInternal:     idxNbSovosInt      !== -1 ? parseNum(row[idxNbSovosInt])      : 0,
                nbSalesScoping:      idxNbSales         !== -1 ? parseNum(row[idxNbSales])         : 0,
                nbMarketing:         idxNbMarketing     !== -1 ? parseNum(row[idxNbMarketing])     : 0,
                nbTraining:          idxNbTraining      !== -1 ? parseNum(row[idxNbTraining])      : 0,
                nbTrainerOnboarding: idxNbTrainer       !== -1 ? parseNum(row[idxNbTrainer])       : 0,
                nbTimeOff:           idxNbTimeOff       !== -1 ? parseNum(row[idxNbTimeOff])       : 0,
                nbLeave:             idxNbLeave         !== -1 ? parseNum(row[idxNbLeave])         : 0,
                month:     uploadMonth,
                timestamp: Date.now(),
              };

              const cleanId = empName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              const docRef  = doc(db, 'artifacts', appId, 'public', 'data', 'ps_entries_v2', `${uploadMonth}_${cleanId}`);
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

          setStatus({ type: 'success', text: `Done! ${totalProcessed} records uploaded. Redirecting...` });
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
    <div className="max-w-xl mx-auto py-12 animate-in fade-in">
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-600 rotate-12"><FileSpreadsheet size={100} /></div>

        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
          <Upload size={32} />
        </div>

        <h3 className="text-2xl font-black text-slate-800 text-center mb-5">Update Data</h3>

        <div className="w-full flex flex-col items-center bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Report Month</label>
          <input type="month" value={uploadMonth} onChange={e => setUploadMonth(e.target.value)}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none w-full max-w-[200px] text-center shadow-sm" />
        </div>

        <input type="file" accept=".xlsx,.xls,.csv" id="excel-file" className="hidden" onChange={e => setFile(e.target.files[0])} />
        <label htmlFor="excel-file" className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white border-2 border-dashed border-slate-300 rounded-[1.5rem] cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all font-bold text-slate-600 group">
          {file ? <CheckCircle2 className="text-emerald-500" /> : <Search size={20} className="text-slate-300 group-hover:text-blue-500" />}
          {file ? file.name : 'Select Excel File'}
        </label>

        {file && (
          <button onClick={processFile} disabled={isUploading}
            className="mt-6 w-full py-4 bg-[#0F172A] text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
            {isUploading ? <Loader2 className="animate-spin" /> : <TrendingUp size={20} />}
            {isUploading ? 'Processing...' : 'Process and Synchronize'}
          </button>
        )}

        {status && (
          <div className={`mt-6 w-full p-4 rounded-2xl flex items-center gap-3 animate-in fade-in ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
            status.type === 'error'   ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
          }`}>
            <AlertCircle size={16} className="shrink-0" />
            <p className="text-xs font-black uppercase tracking-wide">{status.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
