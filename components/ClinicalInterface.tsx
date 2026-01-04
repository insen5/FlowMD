
import React, { useState, useEffect, useRef } from 'react';
import { Patient, Medication, ClinicalContext, VisitSOAP, SOAPSegment, ClaimData, DifferentialDiagnosis, JustifiedCode } from '../types';
import { COMMON_SYMPTOMS } from '../constants';
import { getPredictionsForPatient, processAmbientNotes, getClinicalContext, extractClaimData, generatePatientFriendlySummary, getRelatedSymptoms, getPlanSuggestions } from '../geminiService';
import { 
  Mic, Check, X, ChevronLeft, Plus, Save, Activity, Sparkles, AlertCircle, 
  History, Zap, CheckCircle2, ShieldCheck, Layers, Calendar, ArrowRight, 
  Clock, UserCheck, MessageSquare, Copy, TrendingUp, Bold, Italic, List, AlignLeft,
  DollarSign, FileCheck, Loader2, ShieldAlert, ClipboardCheck, Edit3, Stethoscope,
  Info, FlaskConical, Target, ShieldX, UserPlus, HeartHandshake, Search, ListTodo, Brain,
  Trash2, Filter, Command, Eye, Thermometer, HeartPulse, ClipboardList, Pill, Users,
  Quote
} from 'lucide-react';

interface Props {
  patient: Patient;
  onBack: () => void;
}

const ROS_CATEGORIES = [
  { id: 'gen', label: 'General ROS', systems: ['Fatigue', 'Fever', 'Weight Change', 'Chills'] },
  { id: 'resp', label: 'Respiratory ROS', systems: ['Cough', 'Wheezing', 'SOB', 'Sputum'] },
  { id: 'card', label: 'Cardiac ROS', systems: ['Chest Pain', 'Palpitations', 'Edema', 'Orthopnea'] },
];

const EXAM_SIGNS = [
  { id: 'gen_ex', label: 'General / Constitutional', findings: ['Well-appearing', 'NAD (No Acute Distress)', 'Alert & Oriented x3', 'Cachectic'] },
  { id: 'heent_ex', label: 'HEENT', findings: ['PERRLA', 'EOMI', 'TMs Clear', 'Pharyngeal Erythema', 'Scleral Icterus'] },
  { id: 'resp_ex', label: 'Respiratory Signs', findings: ['Clear Lungs B/L', 'Crackles', 'Wheezing', 'Diminished Breath Sounds', 'Accessory Muscle Use'] },
  { id: 'card_ex', label: 'Cardiac Signs', findings: ['RRR (Reg Rhythm/Rate)', 'Murmur', 'S3/S4 Gallop', 'JVD', 'Pitting Edema'] },
  { id: 'gi_ex', label: 'Abdominal Signs', findings: ['Soft/Non-tender', 'Guarding', 'Rebound', 'Bowel sounds present', 'Organomegaly'] },
  { id: 'neuro_ex', label: 'Neurological', findings: ['CN II-XII Intact', 'Normal Gait', 'Focal Deficits', 'Pronator Drift', 'Normal Strength 5/5'] },
  { id: 'msk_ex', label: 'Musculoskeletal', findings: ['Normal ROM', 'Joint Tenderness', 'Joint Swelling', 'Erythema over joint', 'Crepitus'] },
  { id: 'skin_ex', label: 'Dermatological', findings: ['Warm/Dry', 'Rash present', 'Cyanosis', 'Petechiae', 'Skin Turgor Normal'] },
];

const ClinicalInterface: React.FC<Props> = ({ patient, onBack }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [planPredictions, setPlanPredictions] = useState<string[]>([]);
  const [relatedSymptoms, setRelatedSymptoms] = useState<string[]>([]);
  const [clinicalContext, setClinicalContext] = useState<any>(null);
  const [rosStatus, setRosStatus] = useState<Record<string, 'Normal' | 'Finding' | null>>({});
  const [examStatus, setExamStatus] = useState<Record<string, 'Normal' | 'Finding' | null>>({});
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<string[]>([]);
  const [selectedPlanItems, setSelectedPlanItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'symptoms' | 'assessment' | 'plan' | 'similarPatients'>('symptoms');
  const [symptomSearch, setSymptomSearch] = useState('');
  
  // Rx Modal State
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '' });
  
  const [soapDraft, setSoapDraft] = useState<VisitSOAP>(() => {
    const saved = localStorage.getItem(`soap_draft_${patient.id}`);
    return saved ? JSON.parse(saved) : {
      subjective: { content: '', confidence: 'low', approved: false },
      objective: { content: '', confidence: 'low', approved: false },
      assessment: { content: '', confidence: 'low', approved: false },
      plan: { content: '', confidence: 'low', approved: false },
      medications: []
    };
  });

  const [manualNotes, setManualNotes] = useState<string>(() => {
    return localStorage.getItem(`manual_notes_${patient.id}`) || '';
  });
  const [transcriptSegments, setTranscriptSegments] = useState<{ role: 'Doctor' | 'Patient', text: string }[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [isExtractingClaim, setIsExtractingClaim] = useState(false);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [patientSummary, setPatientSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const recognitionRef = useRef<any>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInitialPlan = async () => {
      const pred = await getPredictionsForPatient(patient.name, patient.history);
      setPlanPredictions(pred);
    };
    fetchInitialPlan();
  }, [patient]);

  // Reduced call frequency with increased debounce
  useEffect(() => {
    if (selectedSymptoms.length > 0) {
      const fetchRelated = async () => {
        const related = await getRelatedSymptoms(selectedSymptoms);
        const filteredRelated = (related || []).filter((r: string) => !selectedSymptoms.includes(r));
        setRelatedSymptoms(filteredRelated);
      };
      const timer = setTimeout(fetchRelated, 2500); // Increased debounce to 2.5s
      return () => clearTimeout(timer);
    } else {
      setRelatedSymptoms([]);
    }
  }, [selectedSymptoms]); 

  useEffect(() => {
    localStorage.setItem(`soap_draft_${patient.id}`, JSON.stringify(soapDraft));
  }, [soapDraft, patient.id]);

  useEffect(() => {
    localStorage.setItem(`manual_notes_${patient.id}`, manualNotes);
  }, [manualNotes, patient.id]);

  useEffect(() => {
    const updateContext = async () => {
      if (selectedSymptoms.length > 0) {
        const context = await getClinicalContext(selectedSymptoms, patient.history);
        setClinicalContext(context);
      } else {
        setClinicalContext(null);
      }
    };
    const timer = setTimeout(updateContext, 3000); // Increased debounce to 3s
    return () => clearTimeout(timer);
  }, [selectedSymptoms, patient.history]);

  useEffect(() => {
    if (activeTab === 'symptoms' && editorRef.current) {
      editorRef.current.innerHTML = manualNotes;
    }
  }, [activeTab]);

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
      if (result.narrative) {
        const cleanNarrative = result.narrative.trim();
        const newManualNotes = manualNotes + (manualNotes ? "<br><br>" : "") + `<strong>Ambient Recall:</strong> ${cleanNarrative}`;
        setManualNotes(newManualNotes);
        if (editorRef.current) {
          editorRef.current.innerHTML = newManualNotes;
        }
      }

      const wrap = (seg: any): SOAPSegment => ({
        content: seg.content,
        confidence: (seg.confidence?.toLowerCase() || 'medium') as any,
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

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    const plainManualNotes = editorRef.current?.innerText || manualNotes;
    const clinicalSummary = `
      Manual Notes: ${plainManualNotes}
      Subjective: ${soapDraft.subjective.content}
      Assessment: ${soapDraft.assessment.content}
      Plan: ${soapDraft.plan.content}
    `;
    const summary = await generatePatientFriendlySummary(clinicalSummary);
    setPatientSummary(summary);
    setIsGeneratingSummary(false);
  };

  const handleFinalSubmit = async () => {
    setIsExtractingClaim(true);
    const plainManualNotes = editorRef.current?.innerText || manualNotes;
    const clinicalSummary = `
      Patient: ${patient.name}
      Manual Findings: ${plainManualNotes}
      Subjective: ${soapDraft.subjective.content}
      Assessment: ${soapDraft.assessment.content}
      Plan: ${soapDraft.plan.content}
      ROS findings: ${Object.entries(rosStatus).filter(([_,v]) => v === 'Finding').map(([k,_]) => k).join(', ')}
    `;

    const billingInfo = await extractClaimData(clinicalSummary);
    setClaimData(billingInfo);
    setIsExtractingClaim(false);

    window.dispatchEvent(new CustomEvent('flowmd:claim-ready', {
      detail: { patientId: patient.id, claimData: billingInfo, clinicalSummary }
    }));
  };

  const toggleSymptom = (label: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
    setSymptomSearch('');
  };

  const togglePlanSuggestion = (step: string) => {
    const isSelected = selectedPlanItems.includes(step);
    if (isSelected) {
      setSelectedPlanItems(prev => prev.filter(s => s !== step));
      setSoapDraft(prev => ({
        ...prev,
        plan: { ...prev.plan, content: prev.plan.content.replace(`Plan Item: ${step}.\n`, '') }
      }));
    } else {
      setSelectedPlanItems(prev => [...prev, step]);
      setSoapDraft(prev => ({
        ...prev,
        plan: { ...prev.plan, content: prev.plan.content + `Plan Item: ${step}.\n`, approved: true }
      }));
    }
  };

  const toggleOrder = (lab: any) => {
    const labKey = lab.name;
    const isOrdered = confirmedOrders.includes(labKey);
    if (isOrdered) {
      setConfirmedOrders(prev => prev.filter(l => l !== labKey));
      setSoapDraft(prev => ({
        ...prev,
        plan: { ...prev.plan, content: prev.plan.content.replace(`Order: ${lab.name} (${lab.urgency}).\n`, '') }
      }));
    } else {
      setConfirmedOrders(prev => [...prev, labKey]);
      setSoapDraft(prev => ({
        ...prev,
        plan: { ...prev.plan, content: prev.plan.content + `Order: ${lab.name} (${lab.urgency}).\n`, approved: true }
      }));
    }
  };

  const handleAddMedication = () => {
    if (!newMed.name || !newMed.dosage || !newMed.frequency) return;
    const med: Medication = { id: Math.random().toString(36).substr(2, 9), ...newMed };
    setSoapDraft(prev => ({
      ...prev,
      medications: [...prev.medications, med],
      plan: { ...prev.plan, content: prev.plan.content + `Prescribed: ${med.name} ${med.dosage} ${med.frequency}.\n`, approved: true }
    }));
    setNewMed({ name: '', dosage: '', frequency: '' });
    setIsAddingMed(false);
  };

  const handleRemoveMedication = (id: string) => {
    const medToRemove = soapDraft.medications.find(m => m.id === id);
    if (!medToRemove) return;
    setSoapDraft(prev => ({
      ...prev,
      medications: prev.medications.filter(m => m.id !== id),
      plan: { ...prev.plan, content: prev.plan.content.replace(`Prescribed: ${medToRemove.name} ${medToRemove.dosage} ${medToRemove.frequency}.\n`, '') }
    }));
  };

  const handleSelectDDx = (ddx: DifferentialDiagnosis) => {
    const ddxKey = ddx.icd10;
    const isAlreadySelected = selectedDiagnoses.includes(ddxKey);
    
    if (isAlreadySelected) {
      setSelectedDiagnoses(prev => prev.filter(k => k !== ddxKey));
    } else {
      setSelectedDiagnoses(prev => [...prev, ddxKey]);
      const diagnosisString = `Confirmed: ${ddx.name} (${ddx.icd10}).\n`;
      setSoapDraft(prev => ({
        ...prev,
        assessment: {
          ...prev.assessment,
          content: prev.assessment.content + (prev.assessment.content ? '\n' : '') + diagnosisString,
          approved: true
        }
      }));
    }
  };

  const toggleRos = (system: string) => {
    setRosStatus(prev => {
      const current = prev[system];
      const next = current === null || current === undefined ? 'Normal' : current === 'Normal' ? 'Finding' : null;
      return { ...prev, [system]: next };
    });
  };

  const toggleExam = (finding: string) => {
    setExamStatus(prev => {
      const current = prev[finding];
      const next = current === null || current === undefined ? 'Normal' : current === 'Normal' ? 'Finding' : null;
      return { ...prev, [finding]: next };
    });
  };

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) setManualNotes(editorRef.current.innerHTML);
  };

  const suggestedSearchResults = symptomSearch.length > 1 
    ? COMMON_SYMPTOMS.filter(s => s.label.toLowerCase().includes(symptomSearch.toLowerCase()) && !selectedSymptoms.includes(s.label))
    : [];

  const renderJustifiedCode = (jc: JustifiedCode) => (
    <div key={jc.code} className="p-4 bg-white border border-blue-100 rounded-2xl space-y-2 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-900">{jc.code}</span>
          <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">{jc.sourceSection}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{jc.description}</span>
      </div>
      <div className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
        <Quote size={12} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-600 leading-relaxed font-serif italic">
          "{jc.evidence}"
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 z-20 shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h2 className="font-black text-slate-900 leading-tight">
                        {patient.name}
                    </h2>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Consultation Active • {patient.gender}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={toggleRecording} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}
                >
                    <Mic size={14} /> {isRecording ? 'Capturing' : 'Ambient'}
                </button>
                <button 
                    onClick={() => setIsPreviewOpen(true)}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                >
                    Finalize
                </button>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white px-4 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
        {(['symptoms', 'assessment', 'plan', 'similarPatients'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all whitespace-nowrap ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-300'
            }`}
          >
            {tab === 'assessment' ? 'Examine' : tab === 'similarPatients' ? 'Similar Patients' : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 relative">
        {activeTab === 'symptoms' && (
          <div className="p-6 space-y-8 animate-in fade-in duration-300">
            {/* Predictive Search Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                <Search size={14} className="text-blue-600" /> Intake Search
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Identify clinical findings..."
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                />
                {suggestedSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {suggestedSearchResults.map(res => (
                      <button
                        key={res.id}
                        onClick={() => toggleSymptom(res.label)}
                        className="w-full px-6 py-4 text-left font-bold text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between group"
                      >
                        {res.label}
                        <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Captured Symptoms Section */}
            {selectedSymptoms.length > 0 && (
              <div className="space-y-4 animate-in zoom-in-95">
                <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                  <ClipboardCheck size={14} className="text-emerald-600" /> Active Profile
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedSymptoms.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSymptom(s)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95 hover:bg-red-600 group"
                    >
                      {s} <X size={12} className="opacity-60 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Clinical Associations */}
            {relatedSymptoms.length > 0 && (
              <div className="space-y-4 animate-in slide-in-from-right-10 overflow-hidden">
                <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                  <Brain size={14} className="text-blue-600 animate-pulse" /> Clinical Suggestions
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {relatedSymptoms.map(p => (
                    <button
                      key={p}
                      onClick={() => toggleSymptom(p)}
                      className="whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-blue-50 bg-white text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all shrink-0 shadow-sm active:scale-95"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Master List */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                <Filter size={14} className="text-slate-400" /> Master Reference
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_SYMPTOMS.map(s => {
                  const active = selectedSymptoms.includes(s.label);
                  if (active) return null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSymptom(s.label)}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-white text-slate-400 hover:border-blue-200 hover:text-blue-600 transition-all active:scale-95 shadow-sm"
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Narrative Intake Notes */}
            <div className="space-y-4 pt-8 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                  <Edit3 size={16} className="text-blue-600" /> Narrative Synthesis
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  <button onClick={() => execCommand('bold')} className="p-2 hover:bg-white rounded-lg text-slate-400"><Bold size={14} /></button>
                  <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-white rounded-lg text-slate-400"><List size={14} /></button>
                </div>
              </div>
              <div className="min-h-[350px] relative group">
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={(e) => setManualNotes((e.target as HTMLDivElement).innerHTML)}
                  className="w-full h-full p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm font-serif text-lg leading-relaxed text-slate-700 outline-none focus:border-blue-200 transition-colors"
                />
                {!manualNotes && <div className="absolute top-8 left-8 text-slate-300 pointer-events-none font-serif text-lg italic">Ambient intake will populate provider findings here automatically...</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessment' && (
          <div className="p-6 space-y-12 animate-in fade-in duration-500">
            {/* Review of Systems */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                <MessageSquare size={16} className="text-blue-600" /> Review of Systems (ROS)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ROS_CATEGORIES.map(cat => (
                  <div key={cat.id} className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-tighter px-2">{cat.label}</h4>
                    <div className="space-y-2">
                      {cat.systems.map(sys => {
                        const status = rosStatus[sys];
                        const isCC = selectedSymptoms.includes(sys);
                        return (
                          <button
                            key={sys}
                            onClick={() => toggleRos(sys)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                              status === 'Normal' ? 'bg-green-50 border-green-200' : 
                              (status === 'Finding' || isCC) ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <span className={`text-xs font-bold ${status || isCC ? 'text-slate-900' : 'text-slate-500'}`}>{sys} {isCC && '(CC)'}</span>
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${
                              status === 'Normal' ? 'bg-green-500 border-green-500' : 
                              (status === 'Finding' || isCC) ? 'bg-rose-500 border-rose-500' : 'border-slate-200'
                            }`}>
                              {(status === 'Normal') && <Check size={12} className="text-white" />}
                              {(status === 'Finding' || isCC) && <AlertCircle size={12} className="text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Physical Exam */}
            <div className="space-y-6 pt-12 border-t border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                <Eye size={16} className="text-blue-600" /> Physical Examination (PE)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {EXAM_SIGNS.map(cat => (
                  <div key={cat.id} className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-tighter px-2">{cat.label}</h4>
                    <div className="space-y-2">
                      {cat.findings.map(finding => {
                        const status = examStatus[finding];
                        return (
                          <button
                            key={finding}
                            onClick={() => toggleExam(finding)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                              status === 'Normal' ? 'bg-emerald-50 border-emerald-200' : 
                              status === 'Finding' ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <span className={`text-xs font-bold ${status ? 'text-slate-900' : 'text-slate-500'}`}>{finding}</span>
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${
                              status === 'Normal' ? 'bg-emerald-500 border-emerald-500' : 
                              status === 'Finding' ? 'bg-rose-500 border-rose-500' : 'border-slate-200'
                            }`}>
                              {status === 'Normal' && <Check size={12} className="text-white" />}
                              {status === 'Finding' && <AlertCircle size={12} className="text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Differential Diagnosis */}
            <div className="space-y-6 pt-12 border-t border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                <Target size={16} className="text-blue-600" /> Differential Diagnosis
              </div>
              <div className="space-y-4">
                {clinicalContext?.differentialDiagnoses?.map((ddx: any, i: number) => {
                  const isSelected = selectedDiagnoses.includes(ddx.icd10);
                  return (
                    <div key={i} className={`p-6 bg-white rounded-[2rem] border transition-all ${isSelected ? 'border-blue-500 shadow-md' : 'border-slate-100'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-300'}`}>{i+1}</div>
                           <div>
                             <h4 className="font-bold text-slate-900">{ddx.name} <span className="text-[10px] font-black text-slate-400 uppercase ml-1">({ddx.icd10})</span></h4>
                             <p className="text-[11px] text-slate-500 italic mt-1">{ddx.reasoning}</p>
                           </div>
                        </div>
                        <button onClick={() => handleSelectDDx(ddx)} className={`p-2 rounded-xl transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                          {isSelected ? <Check size={16}/> : <Plus size={16}/>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="p-6 space-y-12 animate-in slide-in-from-bottom-5">
            {/* Active Plan Summary */}
            {(selectedPlanItems.length > 0 || confirmedOrders.length > 0 || soapDraft.medications.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                  <ClipboardList size={16} className="text-emerald-600" /> Confirmed Plan Actions
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPlanItems.map(item => (
                    <div key={item} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Zap size={10} className="text-blue-400" /> {item}
                    </div>
                  ))}
                  {confirmedOrders.map(order => (
                    <div key={order} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <FlaskConical size={10} /> {order}
                    </div>
                  ))}
                  {soapDraft.medications.map(m => (
                    <div key={m.id} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Pill size={10} /> {m.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Suggested Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                <Brain size={16} className="text-blue-600" /> Predictive Plan Suggestions
              </div>
              <div className="grid grid-cols-1 gap-3">
                {planPredictions.map((p, idx) => {
                  const active = selectedPlanItems.includes(p);
                  return (
                    <div key={idx} className={`p-5 rounded-[2rem] border-2 bg-white transition-all flex items-center justify-between shadow-sm ${active ? 'border-blue-500 bg-blue-50/20' : 'border-slate-100 hover:border-blue-200'}`}>
                      <span className={`text-xs font-bold ${active ? 'text-blue-900' : 'text-slate-700'}`}>{p}</span>
                      <button 
                        onClick={() => togglePlanSuggestion(p)}
                        className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}
                      >
                        {active ? <Check size={14}/> : <Plus size={14}/>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Orders */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                <FlaskConical size={16} className="text-blue-600" /> Recommended Diagnostics
              </div>
              <div className="grid grid-cols-1 gap-3">
                {clinicalContext?.recommendedLabs?.map((lab: any, i: number) => {
                  const isOrdered = confirmedOrders.includes(lab.name);
                  return (
                    <div key={i} className={`p-6 bg-white border rounded-[2.5rem] shadow-sm flex items-center justify-between transition-all ${isOrdered ? 'border-emerald-500 bg-emerald-50/10 shadow-emerald-50' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isOrdered ? 'bg-emerald-600 text-white' : (lab.urgency === 'STAT' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600')}`}>
                          {isOrdered ? <Check size={18} /> : (lab.urgency === 'STAT' ? '!!' : 'In')}
                        </div>
                        <div>
                          <div className={`font-black text-sm ${isOrdered ? 'text-emerald-900' : 'text-slate-900'}`}>{lab.name}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lab.urgency}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleOrder(lab)}
                        className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all ${isOrdered ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}
                      >
                        {isOrdered ? 'Ordered' : 'Order'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prescriptions */}
            <div className="space-y-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                <List size={16} className="text-blue-600" /> Medical Regimen
              </div>
              <div className="space-y-3">
                {soapDraft.medications.map((m) => (
                  <div key={m.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">Rx</div>
                      <div>
                        <div className="font-black text-slate-900 text-sm">{m.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{m.dosage} • {m.frequency}</div>
                      </div>
                    </div>
                    <button 
                        onClick={() => handleRemoveMedication(m.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                  </div>
                ))}
                <button 
                    onClick={() => setIsAddingMed(true)}
                    className="w-full p-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-colors"
                >
                  New Rx Entry +
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'similarPatients' && (
          <div className="p-6 space-y-10 animate-in slide-in-from-right-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                <Users size={16} className="text-blue-600" /> Longitudinal Clinical Twins
              </div>
              {clinicalContext?.similarCases?.map((c: any, i: number) => (
                <div key={i} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm space-y-3 relative group">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-widest">{(c.similarity * 100).toFixed(0)}% Clinical Match</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">"{c.summary}"</p>
                  <div className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest">
                    <CheckCircle2 size={12} /> Outcome: {c.outcome}
                  </div>
                </div>
              ))}
              {!clinicalContext?.similarCases && (
                <div className="p-16 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-slate-400">
                    <History size={30} className="mx-auto mb-4 opacity-30 animate-pulse" />
                    <p className="text-[11px] font-black uppercase tracking-widest">Identifying clinically similar longitudinal twins...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rx Entry Modal */}
      {isAddingMed && (
        <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <h3 className="font-black text-slate-900 uppercase tracking-widest text-[11px]">Draft Prescription</h3>
               <button onClick={() => setIsAddingMed(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-5">
               <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Medication Name</label>
                 <input 
                    type="text" 
                    placeholder="e.g. Amoxicillin" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newMed.name}
                    onChange={(e) => setNewMed({...newMed, name: e.target.value})}
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Dosage</label>
                   <input 
                      type="text" 
                      placeholder="500mg" 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({...newMed, dosage: e.target.value})}
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Frequency</label>
                   <input 
                      type="text" 
                      placeholder="BID" 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newMed.frequency}
                      onChange={(e) => setNewMed({...newMed, frequency: e.target.value})}
                   />
                 </div>
               </div>
               <button 
                 onClick={handleAddMedication}
                 className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all mt-4"
               >
                 Confirm Prescription
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 flex items-center justify-between border-b bg-slate-50/50">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Visit Confirmation</h3>
                <p className="text-xl font-black text-slate-900">Clinical Review</p>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><X size={20}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto no-scrollbar space-y-6">
              <div className="flex gap-2">
                <button onClick={() => setClaimData(null)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!claimData && !patientSummary ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>Consult Record</button>
                <button onClick={() => !patientSummary && generateSummary()} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${patientSummary ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>Patient Handout</button>
                <button onClick={() => handleFinalSubmit()} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${claimData ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>Revenue Cycle</button>
              </div>

              {claimData ? (
                <div className="p-8 bg-blue-50 rounded-[3rem] border-2 border-blue-200 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest">MDM Complexity</div>
                      <div className="text-sm font-black text-blue-900">{claimData.billingComplexity || 'Moderate'}</div>
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-blue-100 text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Expected Yield</span>
                      <span className="text-lg font-black text-blue-600">${claimData.estimatedReimbursement}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                      <ShieldCheck size={14} className="text-blue-500" /> Diagnosis Codes (ICD-10)
                    </div>
                    <div className="space-y-2">
                      {claimData.diagnosisCodes.map((jc: any) => renderJustifiedCode(jc))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                      <Layers size={14} className="text-blue-500" /> Procedure Codes (CPT)
                    </div>
                    <div className="space-y-2">
                      {claimData.procedureCodes.map((jc: any) => renderJustifiedCode(jc))}
                    </div>
                  </div>

                  <button onClick={onBack} className="w-full mt-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all">Archive & Sync to Clearinghouse</button>
                </div>
              ) : patientSummary ? (
                <div className="p-8 bg-emerald-50 rounded-[3rem] border-2 border-emerald-100">
                  <div className="space-y-4 font-serif text-slate-700 leading-relaxed italic text-sm">
                    {patientSummary.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
                  </div>
                  <button className="mt-6 w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100">Portal Release</button>
                </div>
              ) : (
                <div className="p-8 bg-white border shadow-inner rounded-[2.5rem] space-y-6 font-serif">
                  <div className="border-b pb-4">
                    <h2 className="text-lg font-black italic">Flow<span className="text-blue-600">MD</span> Clinical Summary</h2>
                    <p className="text-[10px] font-sans font-black uppercase text-slate-400 mt-1">{new Date().toLocaleDateString()} • {patient.name}</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="text-[9px] font-sans font-black uppercase text-blue-600 mb-1">Provider Findings</div>
                      <div className="text-sm prose prose-slate leading-relaxed" dangerouslySetInnerHTML={{ __html: manualNotes }} />
                    </div>
                    <div>
                      <div className="text-[9px] font-sans font-black uppercase text-blue-600 mb-1">Plan Summary</div>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{soapDraft.plan.content || "Documentation pending finalization..."}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalInterface;
