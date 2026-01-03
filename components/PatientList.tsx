
import React, { useState } from 'react';
import { Patient } from '../types';
import { ChevronRight, Search, Clock, TrendingUp, TrendingDown, Minus, X, Activity, Calendar, History, ShieldCheck, ArrowRight, Zap, Target, ShieldAlert } from 'lucide-react';

interface Props {
  patients: Patient[];
  onSelect: (p: Patient) => void;
}

const PatientList: React.FC<Props> = ({ patients, onSelect }) => {
  const [detailedPatient, setDetailedPatient] = useState<Patient | null>(null);

  const getTrendStyles = (trend?: string) => {
    switch (trend) {
      case 'improving': return { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', label: 'Improving' };
      case 'worsening': return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label: 'Declining' };
      default: return { icon: Minus, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100', label: 'Stable' };
    }
  }

  const getEligibilityStyles = (status?: string) => {
    switch (status) {
      case 'Verified': return 'bg-green-50 text-green-600 border-green-100';
      case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Denied': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  return (
    <div className="p-4 pb-20 space-y-6">
      <div className="space-y-4">
        <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
            type="text" 
            placeholder="Search patient record..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:outline-none transition-all shadow-sm font-medium"
            />
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 rounded-[2rem] p-5 text-white shadow-xl shadow-slate-200">
                <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-blue-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Typing Efficiency</span>
                </div>
                <div className="text-2xl font-black italic">94<span className="text-blue-400 text-sm ml-1">%</span></div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-1">Predicative match rate</div>
            </div>
            <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Target size={14} className="text-green-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Avg Visit Time</span>
                </div>
                <div className="text-2xl font-black text-slate-900">4.2<span className="text-slate-300 text-sm ml-1 tracking-tighter">min</span></div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">↓ 1.2m vs last week</div>
            </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h2 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
            <Clock size={14} className="text-blue-600" /> Arrival Queue
        </h2>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{patients.length} Awaiting</span>
      </div>

      <div className="space-y-3">
        {patients.map((p) => {
          const trend = getTrendStyles(p.trend);
          const TrendIcon = trend.icon;

          return (
            <button
              key={p.id}
              onClick={() => setDetailedPatient(p)}
              className="w-full bg-white p-5 rounded-[2.5rem] border border-slate-100 flex items-center justify-between shadow-sm hover:border-blue-200 active:scale-[0.98] transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-slate-300 font-black text-lg border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {p.name.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-lg border-2 border-white shadow-sm ${trend.bg}`}>
                        <TrendIcon size={10} className={trend.color} />
                    </div>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-md leading-none mb-1 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{p.age}y • {p.gender}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${getEligibilityStyles(p.eligibilityStatus)}`}>
                        {p.eligibilityStatus || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-200 group-hover:text-blue-600" />
            </button>
          );
        })}
      </div>

      {detailedPatient && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xl flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white font-black text-2xl">
                  {detailedPatient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{detailedPatient.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{detailedPatient.age}y • {detailedPatient.gender} • ID: F-0{detailedPatient.id}</p>
                </div>
              </div>
              <button onClick={() => setDetailedPatient(null)} className="p-3 bg-white rounded-2xl text-slate-400 border border-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto no-scrollbar space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-6 rounded-[2rem] border-2 flex flex-col justify-center ${getTrendStyles(detailedPatient.trend).bg} ${getTrendStyles(detailedPatient.trend).border}`}>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Clinical Trend</div>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white shadow-sm ${getTrendStyles(detailedPatient.trend).color}`}>
                            {React.createElement(getTrendStyles(detailedPatient.trend).icon, { size: 18 })}
                        </div>
                        <div className={`font-black text-md ${getTrendStyles(detailedPatient.trend).color}`}>{getTrendStyles(detailedPatient.trend).label}</div>
                    </div>
                </div>
                <div className={`p-6 rounded-[2rem] border-2 flex flex-col justify-center ${getEligibilityStyles(detailedPatient.eligibilityStatus)}`}>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Payer Integrity</div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white shadow-sm">
                            <ShieldAlert size={18} />
                        </div>
                        <div className="font-black text-md">{detailedPatient.eligibilityStatus || 'Unknown'}</div>
                    </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><History size={14} /> Historical Graph</h4>
                <div className="flex flex-wrap gap-2">
                  {detailedPatient.history.map(h => (
                    <div key={h} className="px-5 py-3 bg-slate-50 border border-slate-100 text-slate-700 rounded-2xl font-bold text-sm flex items-center gap-2">
                      <ShieldCheck size={14} className="text-blue-500" /> {h}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Calendar size={14} /> Timeline</h4>
                <div className="relative pl-6 border-l-2 border-slate-100 ml-2 space-y-6">
                  <div className="relative">
                    <div className="absolute -left-[1.85rem] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Today</div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">Awaiting Intake Assessment</p>
                  </div>
                  <div className="relative opacity-50">
                    <div className="absolute -left-[1.85rem] top-1 w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-sm"></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{detailedPatient.lastVisit}</div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">Routine Consultation Closed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => {
                  onSelect(detailedPatient);
                  setDetailedPatient(null);
                }}
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.25em] text-[11px] shadow-2xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Activity size={18} /> Start Intelligence Session <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientList;
