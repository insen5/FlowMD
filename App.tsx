
import React, { useState, useEffect } from 'react';
import { ViewState, Patient, Bed } from './types';
import { MOCK_PATIENTS, INITIAL_BEDS } from './constants';
import PatientList from './components/PatientList';
import ClinicalInterface from './components/ClinicalInterface';
import BedManagement from './components/BedManagement';
import { User, Activity, LayoutGrid, ShieldCheck, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(() => {
    return (localStorage.getItem('flowmd_view') as ViewState) || ViewState.PATIENTS;
  });
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(() => {
    const saved = localStorage.getItem('flowmd_active_patient');
    return saved ? JSON.parse(saved) : null;
  });

  const [beds, setBeds] = useState<Bed[]>(() => {
    const saved = localStorage.getItem('flowmd_beds');
    return saved ? JSON.parse(saved) : INITIAL_BEDS;
  });
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => localStorage.setItem('flowmd_view', activeView), [activeView]);
  useEffect(() => localStorage.setItem('flowmd_beds', JSON.stringify(beds)), [beds]);
  useEffect(() => {
    if (selectedPatient) localStorage.setItem('flowmd_active_patient', JSON.stringify(selectedPatient));
    else localStorage.removeItem('flowmd_active_patient');
  }, [selectedPatient]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveView(ViewState.VISIT);
  };

  const NavItem = ({ icon: Icon, label, view }: { icon: any, label: string, view: ViewState }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex-1 flex flex-col items-center justify-center py-4 transition-all ${
        activeView === view ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <div className={`p-2 rounded-2xl transition-all ${activeView === view ? 'bg-blue-50' : 'bg-transparent'}`}>
        <Icon size={22} strokeWidth={activeView === view ? 2.5 : 2} />
      </div>
      <span className="text-[9px] font-black mt-1 uppercase tracking-[0.1em]">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden select-none">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-200">F</div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">Flow<span className="text-blue-600">MD</span></h1>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Clinical Engine • PWA</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${isOnline ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            {isOnline ? 'Cloud Sync' : 'Local Vault'}
          </div>
          <div className="w-10 h-10 rounded-2xl border-2 border-slate-50 bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shadow-inner">DR</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative no-scrollbar bg-slate-50">
        {activeView === ViewState.PATIENTS && (
          <PatientList patients={MOCK_PATIENTS} onSelect={handlePatientSelect} />
        )}
        {activeView === ViewState.VISIT && selectedPatient && (
          <ClinicalInterface 
            patient={selectedPatient} 
            onBack={() => {
                setSelectedPatient(null);
                setActiveView(ViewState.PATIENTS);
            }} 
          />
        )}
        {activeView === ViewState.VISIT && !selectedPatient && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-300">
                    <Activity size={40} />
                </div>
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">No Active Consult</h3>
                <button onClick={() => setActiveView(ViewState.PATIENTS)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200">View Queue</button>
            </div>
        )}
        {activeView === ViewState.BEDS && (
          <BedManagement beds={beds} setBeds={setBeds} />
        )}
      </main>

      <nav className="bg-white border-t border-slate-200 flex justify-around pb-safe shrink-0 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
        <NavItem icon={User} label="Queue" view={ViewState.PATIENTS} />
        <NavItem icon={Activity} label="Visit" view={ViewState.VISIT} />
        <NavItem icon={LayoutGrid} label="Beds" view={ViewState.BEDS} />
      </nav>
    </div>
  );
};

export default App;
