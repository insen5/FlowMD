
import React, { useState } from 'react';
import { Bed, ChecklistItem } from '../types';
import { Clock, User, CheckCircle2, ListChecks, Plus, X, Sparkles, FileText, Download } from 'lucide-react';
import { generateDischargeSummary } from '../geminiService';

interface Props {
  beds: Bed[];
  setBeds: React.Dispatch<React.SetStateAction<Bed[]>>;
}

const BedManagement: React.FC<Props> = ({ beds, setBeds }) => {
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const statusColors = {
    'Available': 'bg-slate-100 text-slate-500 border-slate-200',
    'Pre-op': 'bg-amber-50 text-amber-700 border-amber-200',
    'Procedure': 'bg-blue-50 text-blue-700 border-blue-200',
    'Post-op': 'bg-purple-50 text-purple-700 border-purple-200',
    'Discharge': 'bg-green-50 text-green-700 border-green-200',
  };

  const getChecklistForStatus = (status: Bed['status']): ChecklistItem[] => {
    switch (status) {
      case 'Pre-op':
        return [
          { id: '1', label: 'Consent Signed', completed: false },
          { id: '2', label: 'Vitals Recorded', completed: false },
          { id: '3', label: 'Fast Check (NPO)', completed: false },
        ];
      case 'Post-op':
        return [
          { id: '1', label: 'Recovered from Anesthesia', completed: false },
          { id: '2', label: 'Pain Managed', completed: false },
          { id: '3', label: 'Post-op Vitals Stable', completed: false },
        ];
      default:
        return [];
    }
  };

  const cycleStatus = async (bedId: string) => {
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return;

    const statusOrder: Bed['status'][] = ['Available', 'Pre-op', 'Procedure', 'Post-op', 'Discharge'];
    const currentIndex = statusOrder.indexOf(bed.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    
    let summary = bed.summary;
    if (nextStatus === 'Discharge' && bed.checklist) {
      setIsGenerating(true);
      summary = await generateDischargeSummary(bed.patientName || 'Patient', bed.id, bed.checklist);
      setIsGenerating(false);
    }

    setBeds(prev => prev.map(b => {
      if (b.id !== bedId) return b;
      return { 
        ...b, 
        status: nextStatus,
        patientName: nextStatus === 'Available' ? undefined : (b.patientName || 'Emergency Patient'),
        timeStarted: nextStatus === 'Available' ? undefined : (b.timeStarted || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
        checklist: nextStatus === 'Available' ? undefined : (b.checklist || getChecklistForStatus(nextStatus)),
        summary: nextStatus === 'Available' ? undefined : summary
      };
    }));
  };

  const toggleChecklistItem = (bedId: string, itemId: string) => {
    setBeds(prev => prev.map(b => {
      if (b.id !== bedId || !b.checklist) return b;
      return {
        ...b,
        checklist: b.checklist.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item)
      };
    }));
  };

  const selectedBed = beds.find(b => b.id === selectedBedId);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between py-2">
        <h2 className="font-black text-slate-700 text-sm uppercase tracking-widest">Slot Management ({beds.filter(b => b.status !== 'Available').length}/8)</h2>
        <div className="flex items-center gap-2">
           {isGenerating && <div className="text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-widest">Synthesizing Summary...</div>}
           <button className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 shadow-sm">
             <Plus size={20} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {beds.map((bed) => (
          <div
            key={bed.id}
            className={`relative p-4 rounded-[2.5rem] border-2 transition-all text-left shadow-sm flex flex-col justify-between h-44 ${
              bed.status === 'Available' ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-blue-500 ring-4 ring-blue-50'
            }`}
          >
            <button onClick={() => cycleStatus(bed.id)} className="w-full text-left">
              <div className="flex justify-between items-start mb-2">
                <span className="font-black text-xl text-slate-200">{bed.id}</span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-sm ${statusColors[bed.status]}`}>
                  {bed.status}
                </span>
              </div>
              
              {bed.patientName ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm truncate">
                    <User size={14} className="text-blue-500" /> {bed.patientName}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <Clock size={12} /> {bed.timeStarted}
                  </div>
                </div>
              ) : (
                <div className="h-10 flex items-center text-slate-300 font-black text-sm uppercase tracking-widest opacity-40">
                  Ready
                </div>
              )}
            </button>

            {bed.checklist && bed.checklist.length > 0 && (
              <button 
                onClick={() => setSelectedBedId(bed.id)}
                className={`mt-2 w-full py-2 border rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                    bed.status === 'Discharge' ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                {bed.status === 'Discharge' ? <FileText size={14} /> : <ListChecks size={14} />}
                {bed.status === 'Discharge' ? 'View Summary' : `Checklist (${bed.checklist.filter(i => i.completed).length}/${bed.checklist.length})`}
              </button>
            )}

            {bed.status === 'Discharge' && (
              <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 shadow-lg ring-4 ring-white animate-bounce">
                <CheckCircle2 size={16} />
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedBed && selectedBedId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm mb-1">
                    {selectedBed.status === 'Discharge' ? 'Discharge Records' : `${selectedBed.status} Steps`}
                </h3>
                <p className="text-xs text-slate-400 font-bold">{selectedBed.id} • {selectedBed.patientName}</p>
              </div>
              <button onClick={() => setSelectedBedId(null)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {selectedBed.status === 'Discharge' && selectedBed.summary ? (
                  <div className="space-y-4">
                      <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 text-slate-700 text-sm leading-relaxed italic">
                        {selectedBed.summary}
                      </div>
                      <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-100">
                        <Download size={18} /> Finalize & Print
                      </button>
                  </div>
              ) : (
                  <>
                    <div className="space-y-3">
                        {selectedBed.checklist?.map(item => (
                            <button
                            key={item.id}
                            onClick={() => toggleChecklistItem(selectedBedId, item.id)}
                            className={`w-full p-5 rounded-3xl border-2 flex items-center justify-between transition-all ${
                                item.completed ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-slate-50'
                            }`}
                            >
                            <span className={`font-bold text-sm ${item.completed ? 'text-green-700' : 'text-slate-600'}`}>
                                {item.label}
                            </span>
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                                {item.completed && <CheckCircle2 size={16} className="text-white" />}
                            </div>
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setSelectedBedId(null)}
                        className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
                    >
                        Confirm Progress
                    </button>
                  </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-8 bg-blue-600 rounded-[3rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
        <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-blue-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Flow Analytics</span>
        </div>
        <p className="text-xl font-bold leading-tight mb-4">
          Day-care slots are cycling <span className="text-blue-200">22% faster</span> this week.
        </p>
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white w-2/3"></div>
        </div>
      </div>
    </div>
  );
};

export default BedManagement;
