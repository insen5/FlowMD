
import React, { useState, useEffect } from 'react';
import { Appointment, Patient } from '../types';
import { MOCK_APPOINTMENTS, MOCK_PATIENTS } from '../constants';
import { parseSchedulingCommand, predictNoShowRisk, getPatientBriefSummary } from '../geminiService';
import { 
  Calendar, Clock, User, Plus, Search, Sparkles, AlertTriangle, 
  CheckCircle2, ChevronRight, Filter, Command, Mic, Loader2,
  CalendarDays, TrendingDown, TrendingUp, Info, Activity,
  UserCheck, Timer, ArrowRight, Zap, Target, X
} from 'lucide-react';

interface Props {
  onSelectPatient: (p: Patient) => void;
}

const ClinicDashboard: React.FC<Props> = ({ onSelectPatient }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('flowmd_appointments');
    return saved ? JSON.parse(saved) : MOCK_APPOINTMENTS;
  });
  const [command, setCommand] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detailed patient view for the "Queue" side
  const [selectedPatientInfo, setSelectedPatientInfo] = useState<Patient | null>(null);
  const [patientBrief, setPatientBrief] = useState<string | null>(null);
  const [isBriefing, setIsBriefing] = useState(false);

  useEffect(() => {
    localStorage.setItem('flowmd_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    if (selectedPatientInfo) {
      const fetchBrief = async () => {
        setIsBriefing(true);
        const brief = await getPatientBriefSummary(selectedPatientInfo);
        setPatientBrief(brief);
        setIsBriefing(false);
      };
      fetchBrief();
    } else {
      setPatientBrief(null);
    }
  }, [selectedPatientInfo]);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsParsing(true);
    try {
      const data = await parseSchedulingCommand(command);
      setParsedData(data);
      
      const patient = MOCK_PATIENTS.find(p => p.name.toLowerCase().includes(data.patientName.toLowerCase()));
      if (patient) {
        const risk = await predictNoShowRisk(patient.name, patient.history);
        setParsedData((prev: any) => ({ ...prev, noShowRisk: risk.riskLevel, riskReasoning: risk.reasoning }));
      }
    } catch (error) {
      console.error("Parsing failed", error);
    } finally {
      setIsParsing(false);
    }
  };

  const confirmBooking = () => {
    if (!parsedData) return;
    
    const newAppt: Appointment = {
      id: Math.random().toString(36).substring(7),
      patientId: 'new',
      patientName: parsedData.patientName,
      startTime: new Date(`${parsedData.date}T${parsedData.time}`).getTime().toString(),
      endTime: new Date(`${parsedData.date}T${parsedData.time}`).getTime() + (parsedData.duration || 30) * 60000 + '',
      reason: parsedData.reason,
      type: parsedData.type || 'Routine',
      noShowRisk: parsedData.noShowRisk || 'Low',
      status: 'Scheduled'
    };

    setAppointments(prev => [...prev, newAppt]);
    setParsedData(null);
    setCommand('');
  };

  const handleCheckIn = (apptId: string) => {
    setAppointments(prev => prev.map(a => 
      a.id === apptId ? { ...a, status: 'Arrived' } : a
    ));
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'text-red-600 bg-red-50 border-red-100';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-green-600 bg-green-50 border-green-100';
    }
  };

  const activeQueue = appointments.filter(a => a.status === 'Arrived' || a.status === 'In-Progress');
  const upcomingSchedule = appointments.filter(a => a.status === 'Scheduled');
  const sortedUpcoming = [...upcomingSchedule].sort((a, b) => parseInt(a.startTime) - parseInt(b.startTime));

  return (
    <div className="p-6 pb-32 space-y-8 animate-in fade-in duration-500">
      {/* Header Deck */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Clinic Mission Control</h2>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Daily Flow</h1>
        </div>
        <div className="flex items-center gap-3">
            <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm text-center min-w-[90px]">
                <div className="text-xl font-black text-slate-900">{activeQueue.length}</div>
                <div className="text-[8px] font-black uppercase text-slate-400">Arrived</div>
            </div>
            <div className="p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-100 text-center min-w-[90px] text-white">
                <div className="text-xl font-black italic">8.5<span className="text-[10px] ml-0.5">m</span></div>
                <div className="text-[8px] font-black uppercase text-blue-100">Avg Wait</div>
            </div>
        </div>
      </div>

      {/* Unified AI Command Bar */}
      <div className="relative group">
        <form onSubmit={handleCommandSubmit} className="relative z-10">
            <div className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${isParsing ? 'text-blue-500' : 'text-slate-400'}`}>
                {isParsing ? <Loader2 size={24} className="animate-spin" /> : <Command size={24} />}
            </div>
            <input 
              type="text" 
              placeholder="Schedule Jane Smith... or Check-in John..."
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={isParsing}
              className="w-full pl-16 pr-36 py-7 bg-white border-2 border-slate-100 rounded-[2.5rem] font-bold text-slate-800 placeholder:text-slate-300 focus:border-blue-500 focus:ring-8 focus:ring-blue-50 transition-all shadow-xl shadow-slate-200/50 outline-none"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button type="button" className="p-3 text-slate-300 hover:text-blue-500 transition-colors"><Mic size={20} /></button>
                <button 
                  type="submit"
                  disabled={isParsing || !command.trim()}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  Action
                </button>
            </div>
        </form>
        
        {parsedData && (
          <div className="absolute top-full left-0 right-0 mt-4 z-40 animate-in zoom-in-95 duration-200">
             <div className="bg-white p-8 rounded-[3rem] border-2 border-blue-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest">
                        <Sparkles size={14} className="animate-pulse" /> AI Logic Confidence: 94%
                    </div>
                    <button onClick={() => setParsedData(null)} className="text-slate-300 hover:text-red-500"><X size={18}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Detected Patient</div>
                        <div className="text-xl font-black text-slate-900 tracking-tight">{parsedData.patientName}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Proposed Time</div>
                        <div className="text-xl font-black text-slate-900 tracking-tight">{parsedData.time} • {parsedData.date}</div>
                    </div>
                </div>

                {parsedData.noShowRisk && (
                    <div className={`p-5 rounded-3xl border flex items-start gap-4 ${getRiskColor(parsedData.noShowRisk)}`}>
                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                        <div>
                            <div className="text-[11px] font-black uppercase">Predictive Risk: {parsedData.noShowRisk}</div>
                            <p className="text-[12px] font-bold opacity-80 mt-1 leading-relaxed">{parsedData.riskReasoning}</p>
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <button onClick={() => setParsedData(null)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-[11px] tracking-widest transition-all hover:bg-slate-200">Dismiss</button>
                    <button onClick={confirmBooking} className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all">Confirm Plan</button>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Section 1: Active Queue */}
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                    <Activity size={16} className="text-emerald-500" /> Active Queue ({activeQueue.length})
                </h3>
                <div className="h-1 flex-1 mx-4 bg-slate-100 rounded-full"></div>
            </div>

            <div className="space-y-4">
                {activeQueue.length === 0 ? (
                    <div className="p-16 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-300">
                        <UserCheck size={40} className="mx-auto mb-4 opacity-20" />
                        <p className="text-[11px] font-black uppercase tracking-widest">No patients in lobby</p>
                    </div>
                ) : activeQueue.map(appt => {
                    const patientObj = MOCK_PATIENTS.find(p => p.name === appt.patientName);
                    return (
                        <div key={appt.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-5">
                                <button 
                                  onClick={() => patientObj && setSelectedPatientInfo(patientObj)}
                                  className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl hover:bg-blue-600 transition-all"
                                >
                                    {appt.patientName.charAt(0)}
                                </button>
                                <div>
                                    <div className="text-lg font-black text-slate-900 tracking-tighter">{appt.patientName}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase tracking-widest">Arrived</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            <Timer size={10} /> Wait: 12m
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button 
                              onClick={() => patientObj && onSelectPatient(patientObj)}
                              className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-3"
                            >
                                Start Visit <ArrowRight size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Section 2: Upcoming Flow */}
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <CalendarDays size={16} className="text-blue-500" /> Upcoming Flow ({sortedUpcoming.length})
                </h3>
                <div className="h-1 flex-1 mx-4 bg-slate-100 rounded-full"></div>
            </div>

            <div className="space-y-4">
                {sortedUpcoming.map(appt => {
                    const time = new Date(parseInt(appt.startTime)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                        <div key={appt.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-5">
                                <div className="text-center min-w-[60px]">
                                    <div className="text-sm font-black text-blue-600">{time}</div>
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">EST</div>
                                </div>
                                <div>
                                    <div className="text-lg font-black text-slate-900 tracking-tighter">{appt.patientName}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${getRiskColor(appt.noShowRisk)}`}>
                                            {appt.noShowRisk} Engagement Risk
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button 
                              onClick={() => handleCheckIn(appt.id)}
                              className="px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                            >
                                Check In
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Predictive Insight Toast */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-transform group-hover:scale-110"></div>
          <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yield Intelligence</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <p className="text-xl font-bold leading-tight max-w-md">
                Clinic utility is at <span className="text-blue-400">88%</span>. 
                One gap at 3 PM. Suggest <span className="text-emerald-400">Backfilling</span> with high-acuity follow-up?
              </p>
              <div className="flex gap-3">
                <button className="flex-1 px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">Ignore</button>
                <button className="flex-1 px-8 py-3 bg-blue-600 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Find Patient</button>
              </div>
          </div>
      </div>

      {/* Patient Profile Quick-View Modal */}
      {selectedPatientInfo && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white font-black text-2xl">
                        {selectedPatientInfo.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{selectedPatientInfo.name}</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">ID: CF-00{selectedPatientInfo.id}</p>
                    </div>
                </div>
                <button onClick={() => setSelectedPatientInfo(null)} className="p-3 text-slate-300 hover:text-red-500 transition-colors">
                    <X size={24} />
                </button>
             </div>
             
             <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase text-blue-600 tracking-widest">
                        <Sparkles size={14} className="animate-pulse" /> Clinical Handoff Brief
                    </div>
                    <div className="p-6 bg-blue-50/50 border-2 border-blue-100 rounded-3xl italic text-slate-700 text-[13px] font-bold leading-relaxed">
                        {isBriefing ? <Loader2 size={16} className="animate-spin text-blue-600" /> : `"${patientBrief}"`}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 rounded-3xl space-y-1">
                        <div className="text-[8px] font-black text-slate-400 uppercase">Trend</div>
                        <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                           {selectedPatientInfo.trend === 'improving' ? <TrendingUp size={14} className="text-green-500"/> : <TrendingDown size={14} className="text-red-500"/>}
                           {selectedPatientInfo.trend || 'Stable'}
                        </div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-3xl space-y-1">
                        <div className="text-[8px] font-black text-slate-400 uppercase">Coverage</div>
                        <div className="text-sm font-black text-slate-900">{selectedPatientInfo.eligibilityStatus}</div>
                    </div>
                </div>
             </div>

             <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button className="flex-1 py-5 bg-white border border-slate-200 text-slate-400 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:text-slate-900 transition-all">Archive</button>
                <button 
                  onClick={() => {
                      onSelectPatient(selectedPatientInfo);
                      setSelectedPatientInfo(null);
                  }}
                  className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    Confirm & Enter Visit
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicDashboard;
