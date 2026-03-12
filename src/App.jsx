import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  writeBatch,
  query
} from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, Upload, Users, Briefcase, FileText, Loader2, TrendingUp, Clock, AlertCircle, CheckCircle2, Filter, Search
} from 'lucide-react';

// --- TUS CREDENCIALES REALES ---
const firebaseConfig = {
  apiKey: "AIzaSyCmaHhPh_rM-1oOn0Fb8Dw8Yha3VTZYJks",
  authDomain: "latamproyect-51db8.firebaseapp.com",
  projectId: "latamproyect-51db8",
  storageBucket: "latamproyect-51db8.firebasestorage.app",
  messagingSenderId: "353505022805",
  appId: "1:353505022805:web:79de48f2a2a3e7746955dc"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'ps-utilization-v1'; 

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hoursData, setHoursData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [filterManager, setFilterManager] = useState('All');
  const [filterEmployee, setFilterEmployee] = useState('All');

  // Autenticación Anónima
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Error Auth:", err));
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Escucha de datos en tiempo real desde Firestore
  useEffect(() => {
    if (!user) return;
    const hoursCollection = collection(db, 'artifacts', appId, 'public', 'data', 'ps_entries');
    const unsubscribe = onSnapshot(hoursCollection, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHoursData(data);
    }, (error) => console.error("Error Firestore:", error));
    return () => unsubscribe();
  }, [user]);

  // Listas para filtros
  const managers = useMemo(() => ['All', ...new Set(hoursData.map(d => d.manager))].sort(), [hoursData]);
  const employees = useMemo(() => {
    const filteredByManager = filterManager === 'All' ? hoursData : hoursData.filter(d => d.manager === filterManager);
    return ['All', ...new Set(filteredByManager.map(d => d.employee))].sort();
  }, [hoursData, filterManager]);

  // Datos filtrados finales
  const filteredData = useMemo(() => {
    return hoursData.filter(d => {
      const matchMonth = d.month === selectedMonth;
      const matchManager = filterManager === 'All' || d.manager === filterManager;
      const matchEmployee = filterEmployee === 'All' || d.employee === filterEmployee;
      return matchMonth && matchManager && matchEmployee;
    });
  }, [hoursData, selectedMonth, filterManager, filterEmployee]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="animate-spin text-blue-600 mx-auto mb-2" size={40} />
        <p className="text-slate-500 font-medium">Cargando PS Analytics...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <TrendingUp size={24} />
            <span className="font-bold text-xl">PS Analytics</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Utilización LATAM</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Upload size={18} />} label="Cargar Reporte" active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
          <SidebarItem icon={<Users size={18} />} label="Managers" active={activeTab === 'managers'} onClick={() => setActiveTab('managers')} />
          <SidebarItem icon={<Search size={18} />} label="Detalle Empleados" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
        </nav>
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 text-center">
          v2.0 - Conectado a Firebase
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm z-10">
          <h2 className="text-lg font-bold text-slate-800">Panel de Control</h2>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Mes de Reporte</span>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="text-xs bg-slate-100 border p-1.5 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col min-w-[150px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Manager</span>
              <select value={filterManager} onChange={(e) => { setFilterManager(e.target.value); setFilterEmployee('All'); }} className="text-xs bg-slate-100 border p-1.5 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500">
                {managers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col min-w-[150px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Empleado</span>
              <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="text-xs bg-slate-100 border p-1.5 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500">
                {employees.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && <DashboardView data={filteredData} />}
            {activeTab === 'upload' && <UploadView currentMonth={selectedMonth} />}
            {activeTab === 'managers' && <GroupedView data={filteredData} groupKey="manager" />}
            {activeTab === 'employees' && <GroupedView data={filteredData} groupKey="employee" />}
          </div>
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
    {icon} <span className="text-sm font-medium">{label}</span>
  </button>
);

const DashboardView = ({ data }) => {
  const stats = useMemo(() => {
    const total = data.reduce((sum, d) => sum + (d.hours || 0), 0);
    const billable = data.reduce((sum, d) => sum + (d.billableHours || 0), 0);
    const nonBill = data.reduce((sum, d) => sum + (d.nonBillableHours || 0), 0);
    return { total, billable, nonBill, util: total > 0 ? (billable / total) * 100 : 0 };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Horas" value={stats.total.toFixed(1)} icon={<Clock />} color="blue" />
        <StatCard title="Utilización %" value={`${stats.util.toFixed(1)}%`} icon={<TrendingUp />} color="emerald" />
        <StatCard title="Horas Billable" value={stats.billable.toFixed(1)} icon={<CheckCircle2 />} color="blue" />
        <StatCard title="Non-Billable" value={stats.nonBill.toFixed(1)} icon={<AlertCircle />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Carga de Horas por Empleado</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="employee" hide />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Mix de Utilización</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[
                  { name: 'Billable', value: stats.billable },
                  { name: 'Non-Billable', value: stats.nonBill }
                ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  <Cell fill="#3b82f6" />
                  <Cell fill="#cbd5e1" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h4 className="text-xl font-black text-slate-800 leading-none mt-1">{value}</h4>
    </div>
  </div>
);

const UploadView = ({ currentMonth }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rows = e.target.result.split('\n').filter(r => r.trim() !== '');
        const headers = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const batch = writeBatch(db);
        
        const getIdx = (keys) => headers.findIndex(h => keys.some(k => h.includes(k.toLowerCase())));
        
        // Mapeo inteligente para pestañas "Individual Utilization" y "Non Billable Team"
        const idxEmp = getIdx(['employee name', 'owner name', 'work: owner name']);
        const idxMan = getIdx(['manager name', 'ownermanager', 'direct manager name']);
        const idxBill = getIdx(['billable hours', 'billablehours']);
        const idxNon = getIdx(['total non-bill hours', 'total non bill hours', 'non-billable']);
        const idxTotal = getIdx(['total hours entered', 'hours (number)', 'hours']);

        if (idxEmp === -1 || idxMan === -1) throw new Error("No se detectaron columnas de Empleado o Manager.");

        let count = 0;
        rows.slice(1).forEach(row => {
          const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/"/g, ''));
          
          const billH = parseFloat(values[idxBill] || 0);
          const nonBillH = parseFloat(values[idxNon] || 0);
          const totalH = parseFloat(values[idxTotal] || billH + nonBillH);

          const entry = {
            employee: values[idxEmp] || 'N/A',
            manager: values[idxMan] || 'N/A',
            billableHours: billH,
            nonBillableHours: nonBillH,
            hours: totalH,
            month: currentMonth,
            timestamp: Date.now()
          };

          if (entry.employee !== 'N/A' && entry.hours > 0) {
            const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'ps_entries'));
            batch.set(docRef, entry);
            count++;
          }
        });

        await batch.commit();
        alert(`¡Éxito! Se cargaron ${count} registros para el periodo ${currentMonth}.`);
      } catch (err) {
        alert("Error procesando CSV: " + err.message);
      } finally {
        setUploading(false);
        setFile(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center shadow-sm">
        <div className="bg-blue-50 p-6 rounded-2xl text-blue-600 mb-6"><Upload size={48} /></div>
        <h3 className="text-xl font-bold text-slate-800">Actualizar Datos Maestros</h3>
        <p className="text-sm text-slate-400 text-center mt-2 mb-8">Sube el archivo CSV exportado desde Excel (Pestaña Individual Utilization).</p>
        
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className="hidden" id="file-upload" />
        <label htmlFor="file-upload" className="cursor-pointer px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all">
          {file ? file.name : "Seleccionar Archivo CSV"}
        </label>

        {file && (
          <button onClick={onUpload} disabled={uploading} className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2">
            {uploading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
            {uploading ? "Sincronizando con Firebase..." : "Confirmar y Subir"}
          </button>
        )}
      </div>
    </div>
  );
};

const GroupedView = ({ data, groupKey }) => {
  const grouped = useMemo(() => {
    const res = {};
    data.forEach(d => {
      const key = d[groupKey] || 'N/A';
      if (!res[key]) res[key] = { name: key, total: 0, billable: 0, nonBillable: 0 };
      res[key].total += d.hours;
      res[key].billable += d.billableHours;
      res[key].nonBillable += d.nonBillableHours;
    });
    return Object.values(res).sort((a, b) => b.total - a.total);
  }, [data, groupKey]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {grouped.map((item, idx) => (
        <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-bold text-slate-800 truncate pr-2">{item.name}</h4>
            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase">
              {((item.billable / item.total) * 100 || 0).toFixed(0)}% Util.
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Horas Billable</span>
              <span className="text-slate-700 font-bold">{item.billable.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Horas Non-Bill</span>
              <span className="text-slate-700 font-bold">{item.nonBillable.toFixed(1)}h</span>
            </div>
            <div className="pt-2 border-t border-slate-50 flex justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
              <span className="text-sm font-black text-slate-900">{item.total.toFixed(1)}h</span>
            </div>
          </div>
        </div>
      ))}
      {grouped.length === 0 && (
        <div className="col-span-full py-20 text-center text-slate-300">
          <Search size={48} className="mx-auto mb-2 opacity-20" />
          <p className="font-bold">No se encontraron registros</p>
        </div>
      )}
    </div>
  );
};

export default App;