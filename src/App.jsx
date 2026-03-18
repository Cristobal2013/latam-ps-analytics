import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import {
  LayoutDashboard, Upload, Users, FileText, Loader2, TrendingUp, Clock, AlertCircle, CheckCircle2, Search, ChevronRight, FileSpreadsheet, Database
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

const App = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hoursData, setHoursData] = useState([]);
  
  // Default filters
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [filterManager, setFilterManager] = useState('All');
  const [filterEmployee, setFilterEmployee] = useState('All');

  useEffect(() => {
    signInAnonymously(auth).catch((error) => console.warn("Auth Note:", error.message));
  }, []);

  // DIRECT FIREBASE READ
  useEffect(() => {
    const hoursCollection = collection(db, 'artifacts', appId, 'public', 'data', 'ps_entries_v2');
    
    const unsubscribe = onSnapshot(hoursCollection, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHoursData(data);
      setLoading(false); 
    }, (error) => {
      console.error("❌ Firestore read error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Dynamic lists for filters
  const availableMonths = useMemo(() => {
    const months = [...new Set(hoursData.map(d => d.month))].filter(Boolean).sort().reverse();
    return ['All', ...months];
  }, [hoursData]);

  const managers = useMemo(() => ['All', ...new Set(hoursData.map(d => d.manager))].sort(), [hoursData]);
  
  const employees = useMemo(() => {
    const filtered = filterManager === 'All' ? hoursData : hoursData.filter(d => d.manager === filterManager);
    return ['All', ...new Set(filtered.map(d => d.employee))].sort();
  }, [hoursData, filterManager]);

  const filteredData = useMemo(() => {
    return hoursData.filter(d => {
      const matchMonth = selectedMonth === 'All' || d.month === selectedMonth;
      const matchManager = filterManager === 'All' || d.manager === filterManager;
      const matchEmployee = filterEmployee === 'All' || d.employee === filterEmployee;
      return matchMonth && matchManager && matchEmployee;
    });
  }, [hoursData, selectedMonth, filterManager, filterEmployee]);

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
      {/* Sidebar - Modern Design */}
      <aside className="w-72 bg-[#0F172A] text-white flex flex-col shrink-0 shadow-2xl overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center gap-3 text-blue-400 mb-1">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <span className="font-black text-2xl tracking-tight text-white">PS Analytics</span>
          </div>
          <div className="h-1 w-12 bg-blue-500 rounded-full mt-2 ml-1"></div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Upload size={20} />} label="Upload Report" active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
          <SidebarItem icon={<Users size={20} />} label="Managers" active={activeTab === 'managers'} onClick={() => setActiveTab('managers')} />
          <SidebarItem icon={<FileText size={20} />} label="Individual Detail" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Database</p>
            <p className="text-[11px] text-blue-400 font-mono text-center truncate">latamproyect-51db8</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-10 py-5 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Control Panel</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-400 font-medium">LATAM Utilization Overview</p>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Database size={12} />
                <span>{hoursData.length} records in DB</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-end">
            <FilterControl label="Report Month" value={selectedMonth} options={availableMonths} onChange={setSelectedMonth} />
            <FilterControl label="Manager" value={filterManager} options={managers} onChange={(v) => {setFilterManager(v); setFilterEmployee('All');}} />
            <FilterControl label="Employee" value={filterEmployee} options={employees} onChange={setFilterEmployee} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView data={filteredData} />}
            {activeTab === 'upload' && <UploadView setActiveTab={setActiveTab} />}
            {activeTab === 'managers' && <GroupedView data={filteredData} groupKey="manager" />}
            {activeTab === 'employees' && <GroupedView data={filteredData} groupKey="employee" />}
          </div>
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
    }`}
  >
    <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>{icon}</span>
    <span className="text-sm font-bold tracking-wide">{label}</span>
    {active && <ChevronRight size={16} className="ml-auto opacity-50" />}
  </button>
);

const FilterControl = ({ label, value, options, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="text-xs font-bold bg-slate-100 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all outline-none cursor-pointer min-w-[140px]"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const DashboardView = ({ data }) => {
  // State to control what the main bar chart shows
  const [chartView, setChartView] = useState('employee'); // 'employee' | 'month'

  const stats = useMemo(() => {
    const total = data.reduce((sum, d) => sum + (d.hours || 0), 0);
    const available = data.reduce((sum, d) => sum + (d.availableHours || d.hours || 0), 0);
    const billable = data.reduce((sum, d) => sum + (d.billableHours || 0), 0);
    const nonBill = data.reduce((sum, d) => sum + (d.nonBillableHours || 0), 0);
    return { 
      total, 
      available,
      billable, 
      nonBill, 
      util: available > 0 ? (billable / available) * 100 : 0,
      count: data.length
    };
  }, [data]);

  // DYNAMIC DATA FOR MAIN BAR CHART
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const map = {};
    
    data.forEach(d => {
      const k = chartView === 'month' ? (d.month || 'N/A') : (d.employee || 'N/A');
      if (!map[k]) map[k] = { name: k, billableHours: 0, availableHours: 0 };
      map[k].billableHours += (d.billableHours || 0);
      map[k].availableHours += (d.availableHours || d.hours || 0);
    });

    let results = Object.values(map).map(item => ({
      name: item.name,
      utilPercent: item.availableHours > 0 ? Number(((item.billableHours / item.availableHours) * 100).toFixed(1)) : 0
    }));

    if (chartView === 'month') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      results.sort((a, b) => b.utilPercent - a.utilPercent);
      results = results.slice(0, 15); // Show only Top 15 to keep the chart clean
    }
    return results;
  }, [data, chartView]);

  const percentFormatter = (value) => [`${value}%`, 'Utilization'];

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 animate-in fade-in">
        <AlertCircle size={64} className="mb-6 opacity-20" />
        <h3 className="text-2xl font-bold text-slate-600 mb-2">No data to display</h3>
        <p className="text-sm max-w-md text-center">
          There are currently no records in the database matching the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Logged Hours" value={stats.total.toFixed(1)} icon={<Clock size={22}/>} color="blue" />
        <StatCard title="Actual Utilization" value={`${stats.util.toFixed(1)}%`} icon={<TrendingUp size={22}/>} color="emerald" />
        <StatCard title="Billable" value={stats.billable.toFixed(1)} icon={<CheckCircle2 size={22}/>} color="indigo" />
        <StatCard title="Non-Billable" value={stats.nonBill.toFixed(1)} icon={<AlertCircle size={22}/>} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAIN CHART: UTILIZATION DISTRIBUTION (WITH TOGGLE) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-slate-800 text-lg leading-tight">Utilization Distribution</h3>
              <p className="text-xs text-slate-400 font-medium">Performance analysis by percentage</p>
            </div>
            
            {/* TOGGLE BUTTONS */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
              <button 
                onClick={() => setChartView('employee')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${chartView === 'employee' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                By Personnel
              </button>
              <button 
                onClick={() => setChartView('month')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${chartView === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                By Month
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: chartView === 'employee' ? 60 : 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  angle={chartView === 'employee' ? -45 : 0}
                  textAnchor={chartView === 'employee' ? 'end' : 'middle'}
                />
                <YAxis 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8' }} 
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'}}
                  formatter={percentFormatter}
                />
                <Bar 
                  dataKey="utilPercent" 
                  name="% Utilization" 
                  fill={chartView === 'employee' ? '#10b981' : '#3b82f6'} 
                  radius={[4, 4, 0, 0]} 
                  barSize={chartView === 'employee' ? 25 : 45} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART: HOURS MIX */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-black text-slate-800 text-lg mb-8 text-center">Hours Mix</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={[
                      { name: 'Billable', value: stats.billable },
                      { name: 'Non-Billable', value: stats.nonBill }
                    ]} 
                    innerRadius={55} 
                    outerRadius={80} 
                    paddingAngle={8} 
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" stroke="none" />
                    <Cell fill="#e2e8f0" stroke="none" />
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-6 space-y-3">
              <LegendItem label="Billable" value={stats.billable} color="bg-blue-500" />
              <LegendItem label="Non-Billable" value={stats.nonBill} color="bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const statColorMap = {
  blue:    { bg: 'bg-blue-500/10',   text: 'text-blue-600'   },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  indigo:  { bg: 'bg-indigo-500/10', text: 'text-indigo-600'  },
  amber:   { bg: 'bg-amber-500/10',  text: 'text-amber-600'   },
};

const StatCard = ({ title, value, icon, color }) => {
  const c = statColorMap[color] || statColorMap.blue;
  return (
  <div className="bg-white p-7 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
    <div className={`w-12 h-12 rounded-2xl ${c.bg} ${c.text} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{title}</p>
      <h4 className="text-3xl font-black text-slate-800 leading-none">{value}</h4>
    </div>
  </div>
  );
};

const LegendItem = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className="text-xs font-bold text-slate-500">{label}</span>
    </div>
    <span className="text-xs font-black text-slate-800">{value.toFixed(1)}h</span>
  </div>
);

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
            const cleanName = s.toLowerCase().replace(/[^a-z]/g, '');
            return targetSheets.some(target => cleanName.includes(target));
          });

          if (sheetsToScan.length === 0) {
            throw new Error("The sheets 'Individual Utilization' or 'Non Billable Team' were not found in the Excel file.");
          }

          const workbook = XLSX.read(data, {
            type: 'array',
            sheets: sheetsToScan,
            sheetRows: 2500,
            cellFormula: false,
            cellHTML: false,
            cellText: false,
            cellStyles: false
          });

          let totalRecordsProcessed = 0;
          let batchCount = 0;
          const batches = [];
          let currentBatch = writeBatch(db);

          for (const sheetName of sheetsToScan) {
            const jsonAoa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                header: 1, 
                blankrows: false, 
                defval: null
            });
            
            const headerRowIndex = jsonAoa.findIndex(row => {
              if (!Array.isArray(row)) return false;
              const rowString = row.map(c => String(c || '').toLowerCase().replace(/[^a-z]/g, '')).join('||');
              return rowString.includes('employeename') && rowString.includes('managername');
            });
            
            if (headerRowIndex !== -1) {
              const headersClean = jsonAoa[headerRowIndex].map(h => String(h || '').toLowerCase().replace(/[^a-z]/g, ''));
              const rows = jsonAoa.slice(headerRowIndex + 1);

              const getExactIdx = (validNames) => {
                for (const name of validNames) {
                  const idx = headersClean.indexOf(name);
                  if (idx !== -1) return idx;
                }
                return -1;
              };
              
              const idxEmp = getExactIdx(['employeename', 'ownername']);
              const idxMan = getExactIdx(['managername', 'ownermanager']);
              const idxBill = getExactIdx(['billablehours', 'billable']);
              const idxNon = getExactIdx(['totalnonbillhours', 'nonbillable', 'nonbill']);
              const idxTotal = getExactIdx(['totalhoursentered', 'hoursnumber', 'totalworkinghours']);
              const idxAvailable = getExactIdx(['totalavailablehoursdenominator', 'totalavailablehours']);
              const idxTarget = getExactIdx(['targetbillablehours', 'target']); // NEW: Extract target hours
              
              if (idxEmp !== -1 && idxMan !== -1) {
                  setStatus({ type: 'info', text: `Removing previous duplicates for ${uploadMonth}...` });
                  const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'ps_entries_v2'));
                  const docsToDelete = snapshot.docs.filter(d => d.data().month === uploadMonth);
                  
                  if (docsToDelete.length > 0) {
                    let delBatch = writeBatch(db);
                    let delCounter = 0;
                    for (const d of docsToDelete) {
                      delBatch.delete(d.ref);
                      delCounter++;
                      if (delCounter === 450) {
                        await delBatch.commit();
                        delBatch = writeBatch(db);
                        delCounter = 0;
                      }
                    }
                    if (delCounter > 0) await delBatch.commit();
                  }

                  setStatus({ type: 'info', text: 'Analyzing rows and calculating exact percentages...' });

                  for (let row of rows) {
                    if (!Array.isArray(row)) continue;

                    const empName = String(row[idxEmp] || '').trim();
                    if (!empName || empName === '' || empName.toLowerCase().includes('employee name') || empName === 'N/A') continue;

                    const manName = String(row[idxMan] || '').trim();
                    
                    const parseNum = (val) => {
                       if(!val) return 0;
                       let cleanVal = String(val).replace(/[^0-9.,-]/g, '');
                       if (cleanVal.includes(',')) cleanVal = cleanVal.replace(',', '.');
                       return parseFloat(cleanVal) || 0;
                    };

                    const billable = parseNum(row[idxBill]);
                    const nonBillable = parseNum(row[idxNon]);
                    let total = parseNum(row[idxTotal]);
                    let available = idxAvailable !== -1 ? parseNum(row[idxAvailable]) : 0;
                    let target = idxTarget !== -1 ? parseNum(row[idxTarget]) : 0; // NEW: Save Target
                    
                    if (total === 0) total = billable + nonBillable;
                    if (available === 0) available = total > 0 ? total : 160; 

                    if (total > 0 || available > 0) {
                      const entry = {
                        employee: empName,
                        manager: manName || 'N/A',
                        billableHours: billable,
                        nonBillableHours: nonBillable,
                        hours: total,
                        availableHours: available,
                        targetHours: target, // NEW: Inject into Firebase
                        month: uploadMonth, 
                        timestamp: Date.now()
                      };
                      
                      const cleanEmpId = empName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                      const docId = `${uploadMonth}_${cleanEmpId}`;
                      
                      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ps_entries_v2', docId);
                      currentBatch.set(docRef, entry);
                      
                      totalRecordsProcessed++;
                      batchCount++;

                      if (batchCount === 450) {
                        batches.push(currentBatch.commit());
                        currentBatch = writeBatch(db);
                        batchCount = 0;
                      }

                      if (totalRecordsProcessed >= 2500) {
                          break;
                      }
                    }
                  }
              }
            }
          }

          if (totalRecordsProcessed === 0) {
              throw new Error("No valid records found. Please check the Excel file.");
          }

          if (batchCount > 0) {
            batches.push(currentBatch.commit());
          }

          setStatus({ type: 'info', text: 'Uploading clean data to Firebase...' });
          await Promise.all(batches);

          setStatus({ type: 'success', text: `Success! ${totalRecordsProcessed} calculations precisely corrected. Redirecting...` });
          setFile(null);
          
          setTimeout(() => {
             setActiveTab('dashboard');
          }, 1500);

        } catch (err) {
          console.error("Error processing Excel:", err);
          setStatus({ type: 'error', text: err.message });
        } finally {
          setIsUploading(false);
        }
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="max-w-xl mx-auto py-16 animate-in fade-in">
      <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-600 rotate-12"><FileSpreadsheet size={120} /></div>
        
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
          <Upload size={40} />
        </div>
        
        <h3 className="text-2xl font-black text-slate-800 text-center mb-6">Update Data</h3>
        
        <div className="w-full flex flex-col items-center bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Which month does this file correspond to?</label>
           <input 
             type="month" 
             value={uploadMonth} 
             onChange={e => setUploadMonth(e.target.value)} 
             className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none w-full max-w-[200px] text-center shadow-sm"
           />
        </div>
        
        <input type="file" accept=".xlsx, .xls, .csv" id="excel-file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
        <label htmlFor="excel-file" className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white border-2 border-dashed border-slate-300 rounded-[1.5rem] cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all font-bold text-slate-600 group">
          {file ? <CheckCircle2 className="text-emerald-500"/> : <Search size={20} className="text-slate-300 group-hover:text-blue-500" />}
          {file ? file.name : "Select Excel File"}
        </label>

        {file && (
          <button 
            onClick={processFile} 
            disabled={isUploading}
            className="mt-8 w-full py-5 bg-[#0F172A] text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : <TrendingUp size={20} />}
            {isUploading ? "Cleaning duplicates and processing..." : "Process and Synchronize"}
          </button>
        )}

        {status && (
          <div className={`mt-8 w-full p-5 rounded-2xl flex items-center gap-4 animate-in fade-in ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 
            status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
          }`}>
            <div className="p-2 bg-white/50 rounded-lg shadow-sm">
              <AlertCircle size={18} />
            </div>
            <p className="text-xs font-black uppercase tracking-wide">{status.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const GroupedView = ({ data, groupKey }) => {
  const sorted = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const k = d[groupKey] || 'N/A';
      if (!map[k]) map[k] = { name: k, total: 0, billable: 0, available: 0, target: 0 };
      map[k].total += (d.hours || 0);
      map[k].billable += (d.billableHours || 0);
      map[k].available += (d.availableHours || d.hours || 0); 
      map[k].target += (d.targetHours || 0); // NEW: Add target in filters
    });
    return Object.values(map).sort((a, b) => b.available - a.available);
  }, [data, groupKey]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 animate-in fade-in">
        <Users size={64} className="mb-6 opacity-20" />
        <h3 className="text-2xl font-bold text-slate-600 mb-2">No records</h3>
        <p className="text-sm max-w-md text-center">No personnel found to display. Check your filters at the top.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {sorted.map((item, i) => {
        const utilPercent = item.available > 0 ? (item.billable / item.available) * 100 : 0;
        const attainmentPercent = item.target > 0 ? (item.billable / item.target) * 100 : 0; // NEW: Calculate Attainment
        
        // Color traffic light based on performance
        const getStatusColor = (percent) => {
          if (percent >= 75) return { text: 'text-emerald-600', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50', border: 'border-l-emerald-500' };
          if (percent >= 50) return { text: 'text-amber-500', bg: 'bg-amber-400', lightBg: 'bg-amber-50', border: 'border-l-amber-400' };
          return { text: 'text-red-500', bg: 'bg-red-500', lightBg: 'bg-red-50', border: 'border-l-red-500' };
        };

        const colors = getStatusColor(utilPercent);
        
        return (
          <div key={i} className={`bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all border-l-[6px] ${colors.border} group`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0">
                  {item.name.charAt(0)}
                </div>
                <h4 className="font-black text-slate-800 tracking-tight leading-tight line-clamp-2">{item.name}</h4>
              </div>
              <div className={`p-2 rounded-xl ${colors.lightBg} ${colors.text} shrink-0`}>
                <TrendingUp size={18} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attainment</p>
                  <p className="text-xl font-black text-slate-800">{attainmentPercent.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilization</p>
                  <p className={`text-4xl font-black leading-none tracking-tighter ${colors.text}`}>
                    {utilPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${colors.bg}`} style={{width: `${Math.min(utilPercent, 100)}%`}}></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default App;