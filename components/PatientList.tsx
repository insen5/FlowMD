
import React, { useState, useEffect } from 'react';
import { Patient, ClinicalHistory } from '../types';
import { getPatientBriefSummary } from '../geminiService';
import { 
  ChevronRight, Search, Clock, TrendingUp, TrendingDown, Minus, X, 
  Activity, Calendar, History, ShieldCheck, ArrowRight, Zap, Target, 
  ShieldAlert, Phone, Mail, CreditCard, Thermometer, Heart, Droplets,
  CalendarDays, Timer, MoreVertical, Loader2, Sparkles
} from 'lucide-react';

interface Props {
  patients: Patient[];
  onSelect: (p: Patient) => void;
}

const PatientList: React.FC<Props> = ({ patients, onSelect }) => {
  const [detailedPatient, setDetailedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientBrief, setPatientBrief] = useState<string | null>(null);
  const [isBriefing, setIsBriefing] = useState(false);

  useEffect(() => {
    if (detailedPatient) {
      const fetchBrief = async () => {
        setIsBriefing(true);
        const brief = await getPatientBriefSummary(detailedPatient);
        setPatientBrief(brief);
        setIsBriefing(false);
      };
      fetchBrief();
    } else {
      setPatientBrief(null);
    }
  }, [detailedPatient]);

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

  const calculateTimeDiff = (dateStr: string) => {
    const start = new Date(dateStr);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const parts = [];
    if (years > 0) parts.push(`${years}Y`);
    if (months > 0) parts.push(`${months}M`);
    return parts.length > 0 ? parts.join(' ') : '< 1M';
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Search & Stats Section */}
      <div className="space-y-4">
        <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search arrivals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:outline-none transition-all shadow-sm font-medium"
            />
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 rounded-[2rem] p-5 text-white shadow-xl shadow-slate-200">
                <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-blue-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">System Accuracy</span>
                </div>
                <div className="text-2xl font-black italic">94<span className="text-blue-400 text-sm ml-1">%</span></div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-1">Prediction Match</div>
            </div>
            <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Target size={14} className="text-green-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Queue Flow</span>
                </div>
                <div className="text-2xl font-black text-slate-900">4.2<span className="text-slate-300 text-sm ml-1 tracking-tighter">min</span></div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">Visit Average</div>
            </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
            <Clock size={14} className="text-blue-600" /> Daily Arrival Queue
        </h2>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{filteredPatients.length} Active</span>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredPatients.map((p) => {
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

      {/* Comprehensive Patient Profile Modal */}
      {detailedPatient && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xl flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            {/* Header Area */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white relative">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-slate-200">
                  {detailedPatient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{detailedPatient.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Patient Profile • ID: F-0{detailedPatient.id}</p>
                </div>
              </div>
              <button onClick={() => setDetailedPatient(null)} className="p-3 bg-white rounded-2xl text-slate-300 border border-slate-100 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-8 overflow-y-auto no-scrollbar space-y-8 bg-white">
              {/* AI Clinical Brief - The One Liner Context */}
              <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase text-blue-600 tracking-[0.2em]">
                      <Sparkles size={12} className="animate-pulse" /> Intake Clinical Brief
                  </div>
                  <div className="p-6 bg-blue-50/40 border-2 border-blue-100/50 rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    {isBriefing ? (
                        <div className="flex items-center gap-3 text-blue-600 py-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Synthesizing Patient Context...</span>
                        </div>
                    ) : (
                        <p className="text-[13px] font-bold text-slate-800 leading-relaxed italic pr-4">
                            "{patientBrief || `Patient presenting with stable metrics and a longitudinal history of ${detailedPatient.history.join(', ')}.`}"
                        </p>
                    )}
                  </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-white border border-slate-100 rounded-[2rem] space-y-1 shadow-sm">
                      <div className="text-[8px] font-black uppercase text-slate-400 flex items-center gap-1.5"><Calendar size={10}/> Demographics</div>
                      <div className="text-sm font-bold text-slate-900">{detailedPatient.age} Years • {detailedPatient.gender}</div>
                  </div>
                  <div className={`p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm ${getEligibilityStyles(detailedPatient.eligibilityStatus)}`}>
                      <div className="space-y-1">
                          <div className="text-[8px] font-black uppercase text-slate-400 opacity-60">Payer Status</div>
                          <div className="text-sm font-bold">{detailedPatient.eligibilityStatus}</div>
                      </div>
                      <CreditCard size={16} className="opacity-40" />
                  </div>
              </div>

              {/* Vitals Section */}
              <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Activity size={14} /> Intake Vitals (Automated)</h4>
                  <div className="grid grid-cols-3 gap-3">
                      <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 text-center">
                          <Thermometer size={14} className="mx-auto mb-2 text-amber-500" />
                          <div className="text-sm font-black text-slate-900">98.6°F</div>
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Temp</div>
                      </div>
                      <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 text-center">
                          <Heart size={14} className="mx-auto mb-2 text-red-500" />
                          <div className="text-sm font-black text-slate-900">72 bpm</div>
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Pulse</div>
                      </div>
                      <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 text-center">
                          <Droplets size={14} className="mx-auto mb-2 text-blue-500" />
                          <div className="text-sm font-black text-slate-900">99%</div>
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SpO2</div>
                      </div>
                  </div>
              </div>

              {/* Clinical Background / Journey Timeline */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><History size={14} /> Clinical Background</h4>
                </div>
                
                <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                  {detailedPatient.clinicalJourney ? detailedPatient.clinicalJourney.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[2.125rem] top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-white border-2 border-blue-600 z-10"></div>
                      
                      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <CalendarDays size={12} className="text-blue-600" />
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                          </div>
                          {item.severity === 'Chronic' && (
                            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                              Chronic
                            </div>
                          )}
                        </div>
                        
                        <h5 className="text-xl font-black text-slate-900 mb-4 tracking-tighter">{item.condition}</h5>
                        
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl">
                          <Timer size={12} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {calculateTimeDiff(item.date)} FROM PRESENT
                          </span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-wrap gap-2 pl-2">
                       {detailedPatient.history.map(h => (
                        <div key={h} className="px-6 py-4 bg-white border border-slate-100 text-slate-900 rounded-[1.5rem] font-black text-sm flex items-center gap-3 shadow-sm">
                          <ShieldCheck size={16} className="text-blue-500" /> {h}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Administrative Info */}
              <div className="space-y-4 pt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Phone size={14} /> Administrative Info</h4>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-5 shadow-inner bg-slate-50/20">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm font-black text-slate-900">
                              <Phone size={16} className="text-slate-300" /> +1 (555) 012-34{detailedPatient.id}
                          </div>
                          <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-600">Update</button>
                      </div>
                      <div className="flex items-center gap-4 text-sm font-black text-slate-900">
                          <Mail size={16} className="text-slate-300" /> {detailedPatient.name.split(' ')[0].toLowerCase()}@patient.clinic
                      </div>
                  </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-8 bg-white border-t border-slate-50 flex gap-3">
              <button 
                onClick={() => {
                  onSelect(detailedPatient);
                  setDetailedPatient(null);
                }}
                className="flex-1 bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-4 group"
              >
                <Activity size={18} className="group-hover:animate-pulse" /> Initiate Consult <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientList;
