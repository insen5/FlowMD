
import React, { useState, useEffect, useRef } from 'react';
import { Patient, Medication, ClinicalContext, VisitSOAP, SOAPSegment } from '../types';
import { COMMON_SYMPTOMS } from '../constants';
import { getPredictionsForPatient, processAmbientNotes, getClinicalContext } from '../geminiService';
import { 
  Mic, Check, X, ChevronLeft, Plus, Save, Activity, Sparkles, AlertCircle, 
  History, Zap, CheckCircle2, ShieldCheck, Layers, Calendar, ArrowRight, 
  Clock, UserCheck, MessageSquare, Copy, TrendingUp, Bold, Italic, List, AlignLeft 
} from 'lucide-react';

interface Props {
  patient: Patient;
  onBack: () => void;
}

const ClinicalInterface: React.FC<Props> = ({ patient, onBack }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [predictions, setPredictions] = useState<string[]>([]);
  const [clinicalContext, setClinicalContext] = useState<ClinicalContext | null>(null);
  const [soapDraft, setSoapDraft] = useState<VisitSOAP | null>(() => {
    const saved = localStorage.getItem(`soap_draft_${patient.id}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [manualNotes, setManualNotes] = useState<string>(() => {
    return localStorage.getItem(`manual_notes_${patient.id}`) || '';
  });
  const [transcriptSegments, setTranscriptSegments] = useState<{ role: 'Doctor' | 'Patient', text: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'symptoms' | 'notes' | 'assessment' | 'plan' | 'history'>('symptoms');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      const pred = await getPredictionsForPatient(patient.name, patient.history);
      setPredictions(pred);
    };
    fetchPredictions();
  }, [patient]);

  useEffect(() => {
    if (soapDraft) localStorage.setItem(`soap_draft_${patient.id}`, JSON.stringify(soapDraft));
  }, [soapDraft, patient.id]);

  useEffect(() => {
    localStorage.setItem(`manual_notes_${patient.id}`, manualNotes);
  }, [manualNotes, patient.id]);

  useEffect(() => {
    const updateContext = async () => {
      if (selectedSymptoms.length > 0) {
        const context = await getClinicalContext(selectedSymptoms);
        setClinicalContext(context);
      } else {
        setClinicalContext(null);
      }
    };
    const timer = setTimeout(updateContext, 1000);
    return () => clearTimeout(timer);
  }, [selectedSymptoms]);

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported.");
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    
    let speakerToggle = false;
    recognitionRef.current.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      if (result.length > 30) speakerToggle = !speakerToggle;
      setTranscriptSegments(prev => [...prev, { role: speakerToggle ? 'Doctor' : 'Patient', text: result }]);
    };
    
    recognitionRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setIsProcessing(true);
    
    const fullTranscript = transcriptSegments.map(s => `${s.role}: ${s.text}`).join(' ');
    const result = await processAmbientNotes(fullTranscript);
    
    if (result) {
      const wrap = (seg: any): SOAPSegment => ({
        content: seg.content,
        confidence: seg.confidence as any,
        approved: false
      });

      setSoapDraft({
        subjective: wrap(result.subjective),
        objective: wrap(result.objective),
        assessment: wrap(result.assessment),
        plan: wrap(result.plan),
        medications: result.medications || []
      });
    }
    setIsProcessing(false);
  };

  const toggleSymptom = (label: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  const approveSegment = (key: keyof Omit<VisitSOAP, 'medications'>) => {
    if (!soapDraft) return;
    setSoapDraft({
      ...soapDraft,
      [key]: { ...soapDraft[key], approved: true }
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Dynamic Header */}
      <div className="p-4 bg-white border-b border-slate-200 z-20 shrink-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h2 className="font-black text-slate-900 leading-tight flex items-center gap-2">
                        {patient.name}
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consulting • Room 402 • {patient.gender}</p>
                </div>
            </div>
            <button 
                onClick={() => setIsPreviewOpen(true)}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-95 transition-all"
            >
                <Save size={16} className="inline mr-2" /> Finalize
            </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white px-4 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
        {(['symptoms', 'notes', 'assessment', 'plan', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all whitespace-nowrap ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {activeTab === 'symptoms' && (
          <div className="p-6 space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-widest">
                    <Sparkles size={16} className="text-blue-600" /> Intake Prediction
                </div>
                <button 
                    onClick={toggleRecording} 
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-slate-900 border border-slate-200 shadow-sm'}`}
                >
                    <Mic size={14} /> {isRecording ? 'Ambient Active' : 'Enable Ambient'}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {predictions.map(p => {
                    const active = selectedSymptoms.includes(p);
                    return (
                        <button
                            key={p}
                            onClick={() => toggleSymptom(p)}
                            className={`p-6 rounded-[2.5rem] border-2 text-left transition-all ${active ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                        >
                            <div className={`text-[8px] font-black uppercase tracking-widest mb-2 ${active ? 'text-white/60' : 'text-slate-400'}`}>Recommended</div>
                            <div className="font-black text-sm leading-tight">{p}</div>
                        </button>
                    );
                })}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2"><Layers size={14} /> Full Taxonomy</h3>
              <div className="flex flex-wrap gap-2">
                {COMMON_SYMPTOMS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleSymptom(s.label)}
                    className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tight border ${selectedSymptoms.includes(s.label) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="p-6 space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-widest">
                <AlignLeft size={16} className="text-blue-600" /> Detailed Clinical Notes
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-blue-600"><Bold size={14} /></button>
                <button className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-blue-600"><Italic size={14} /></button>
                <button className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-blue-600"><List size={14} /></button>
              </div>
            </div>
            
            <div className="flex-1 min-h-[400px] relative group">
              <textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Start typing detailed clinical findings, patient nuances, or specific observations here..."
                className="w-full h-full p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:outline-none transition-all font-serif text-lg leading-relaxed text-slate-700 resize-none no-scrollbar"
              />
              <div className="absolute bottom-6 right-8 text-[10px] font-black uppercase tracking-widest text-slate-300 group-focus-within:text-blue-400 transition-colors">
                {manualNotes.length} Characters • Auto-saving
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-3">
              <Zap size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-blue-700 leading-normal uppercase tracking-tight">
                Manual notes are saved locally and synced to the graph. These bypass the ambient processor to ensure 100% doctor-defined accuracy.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'assessment' && (
            <div className="p-6 space-y-6">
                {soapDraft ? (
                    <div className="space-y-4">
                        {(['subjective', 'objective', 'assessment'] as const).map(key => (
                             <div key={key} className={`p-6 rounded-[2.5rem] border-2 bg-white transition-all ${soapDraft[key].approved ? 'border-green-500 bg-green-50/50' : 'border-slate-100'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="text-[10px] font-black uppercase text-slate-900 tracking-widest">{key}</div>
                                        <div className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase">{soapDraft[key].confidence} Match</div>
                                    </div>
                                    {!soapDraft[key].approved && (
                                        <button onClick={() => approveSegment(key)} className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">Confirm</button>
                                    )}
                                </div>
                                <p className={`text-sm font-bold leading-relaxed ${soapDraft[key].approved ? 'text-slate-900' : 'text-slate-400 italic'}`}>{soapDraft[key].content}</p>
                             </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-slate-400">
                        <Zap size={30} className="mx-auto mb-4 opacity-30" />
                        <p className="text-[11px] font-black uppercase tracking-widest">Drafting Assessment via Ambient Ear...</p>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'plan' && (
          <div className="p-6 space-y-6">
            <div className="p-12 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-slate-400">
                <List size={30} className="mx-auto mb-4 opacity-30" />
                <p className="text-[11px] font-black uppercase tracking-widest">Therapeutic Plan Section Under Construction</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
            <div className="p-6 space-y-8 animate-in slide-in-from-right-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-widest">
                        <TrendingUp size={16} className="text-blue-600" /> Clinical Twins (Graph Recall)
                    </div>
                    {clinicalContext?.similarCases?.map((c: any, i: number) => (
                        <div key={i} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm space-y-3 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                <Copy size={16} className="text-blue-600" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-widest">{(c.similarity * 100).toFixed(0)}% Clinical Twin</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 leading-tight">"{c.summary}"</p>
                            <div className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest">
                                <CheckCircle2 size={12} /> Resolved: {c.outcome}
                            </div>
                        </div>
                    ))}
                    {(!clinicalContext?.similarCases) && (
                        <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-[2rem] text-slate-300 text-xs font-bold uppercase tracking-widest">
                            Populate symptoms to scan twins...
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-200">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Patient Longitudinal History</h4>
                    <div className="space-y-2">
                        {patient.history.map(h => (
                            <div key={h} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3">
                                <ShieldCheck size={16} className="text-blue-500" />
                                <span className="text-sm font-bold text-slate-700">{h}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Floating Record Control */}
      {isRecording && (
          <div className="fixed bottom-32 left-8 right-8 bg-slate-900/90 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-3xl animate-in slide-in-from-bottom-20 z-50 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-white/60 tracking-[0.3em]">Ambient Transcription</span>
              </div>
              <div className="h-20 overflow-hidden text-sm font-bold text-white/80 italic leading-relaxed">
                  {transcriptSegments.length > 0 
                    ? `...${transcriptSegments[transcriptSegments.length-1].text}` 
                    : "Listening to consultation context..."}
              </div>
              <button onClick={toggleRecording} className="w-full mt-4 bg-white text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">End Capture</button>
          </div>
      )}

      {/* Final Preview Modal */}
      {isPreviewOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-8 flex items-center justify-between border-b bg-slate-50/50">
                      <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Final Approval</h3>
                          <p className="text-xl font-black text-slate-900">Clinical Summary</p>
                      </div>
                      <button onClick={() => setIsPreviewOpen(false)} className="p-3 bg-white border rounded-2xl text-slate-400"><X size={20}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto no-scrollbar space-y-6">
                      <div className="p-8 bg-white border shadow-inner rounded-3xl space-y-6 font-serif">
                          <div className="border-b pb-4 mb-4">
                              <h2 className="text-lg font-black italic">Flow<span className="text-blue-600">MD</span> Record</h2>
                              <p className="text-[10px] font-sans font-black uppercase text-slate-400 mt-1">{new Date().toLocaleDateString()} • {patient.name}</p>
                          </div>
                          <div className="space-y-4">
                              <div>
                                  <div className="text-[9px] font-sans font-black uppercase text-blue-600 mb-1">Manual Observations</div>
                                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{manualNotes || "No manual observations recorded."}</p>
                              </div>
                              <div>
                                  <div className="text-[9px] font-sans font-black uppercase text-blue-600 mb-1">Subjective (Ambient)</div>
                                  <p className="text-sm leading-relaxed">{soapDraft?.subjective.content || "N/A"}</p>
                              </div>
                          </div>
                      </div>
                      <button className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-slate-200">Submit Record & Sync</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ClinicalInterface;
