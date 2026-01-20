
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
  Quote, Milestone
} from 'lucide-react';

interface Props {
  patient: Patient;
  onBack: void;
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

const getTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) return `${diffDays}d ago`;
  
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  
  if (years > 0) {
    return `${years}y ${months > 0 ? months + 'm ' : ''}ago`;
  }
  return `${months}m ago`;
};

const ClinicalInterface: React.FC<Props> = ({ patient, onBack }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [planPredictions, setPlanPredictions] = useState<string[]>([]);
  const [isRefiningPlan, setIsRefiningPlan] = useState(false);
  const [relatedSymptoms, setRelatedSymptoms] = useState<string[]>([]);
  const [clinicalContext, setClinicalContext] = useState<any>(null);
  const [rosStatus, setRosStatus] = useState<Record<string, 'Normal' | 'Finding' | null>>({});
  const [examStatus, setExamStatus] = useState<Record<string, 'Normal' | 'Finding' | null>>({});
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<string[]>([]);
  const [selectedPlanItems, setSelectedPlanItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'symptoms' | 'assessment' | 'plan' | 'similarPatients'>('symptoms');
  const [symptomSearch, setSymptomSearch] = useState('');
  
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

  useEffect(() => {
    if (selectedSymptoms.length > 0) {
      const fetchRelated = async () => {
        const related = await getRelatedSymptoms(selectedSymptoms);
        const filteredRelated = (related || []).filter((r: string) => !selectedSymptoms.includes(r));
        setRelatedSymptoms(filteredRelated);
      };
      const timer = setTimeout(fetchRelated, 2500); 
      return () => clearTimeout(timer);
    } else {
      setRelatedSymptoms([]);
    }
  }, [selectedSymptoms]); 

  useEffect(() => {
    if (selectedDiagnoses.length > 0) {
      const refinePlan = async () => {
        setIsRefiningPlan(true);
        const cleanNotes = manualNotes.replace(/<[^>]*>?/gm, '');
        const suggestions = await getPlanSuggestions(cleanNotes || selectedSymptoms.join(", "), selectedDiagnoses);
        setPlanPredictions(suggestions);
        setIsRefiningPlan(false);
      };
      const timer = setTimeout(refinePlan, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedDiagnoses]);

  useEffect(() => {
    localStorage.setItem(`soap_draft_${patient.id}`, JSON.stringify(soapDraft));
  }, [soapDraft, patient.id]);

  useEffect(() => {
    localStorage.setItem(`manual_notes_${patient.id}`, manualNotes);
  }, [manualNotes, patient.id]);

  useEffect(() => {
    const updateContext = async () => {
      const rosFindings = Object.entries(rosStatus)
        .filter(([_, status]) => status === 'Finding')
        .map(([sys, _]) => sys);
      
      const examFindings = Object.entries(examStatus)
        .filter(([_, status]) => status === 'Finding')
        .map(([finding, _]) => finding);

      const hasSufficientData = selectedSymptoms.length > 0 || manualNotes.length > 20 || rosFindings.length > 0 || examFindings.length > 0;

      if (hasSufficientData) {
        const cleanNotes = manualNotes.replace(/<[^>]*>?/gm, '');
        const context = await getClinicalContext(
            selectedSymptoms, 
            patient.history, 
            rosFindings, 
            examFindings, 
            cleanNotes,
            selectedDiagnoses 
        );
        setClinicalContext(context);
      } else {
        setClinicalContext(null);
      }
    };
    const timer = setTimeout(updateContext, 3000); 
    return () => clearTimeout(timer);
  }, [selectedSymptoms, patient.history, rosStatus, examStatus, manualNotes, selectedDiagnoses]);

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

  const handleFinalize = async () => {
    if (window.