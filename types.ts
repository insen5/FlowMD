
export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  history: string[];
  trend?: 'improving' | 'stable' | 'worsening';
}

export interface Symptom {
  id: string;
  label: string;
  category: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface Bed {
  id: string;
  label: string;
  status: 'Available' | 'Pre-op' | 'Procedure' | 'Post-op' | 'Discharge';
  patientName?: string;
  timeStarted?: string;
  checklist?: ChecklistItem[];
  summary?: string;
}

export enum ViewState {
  PATIENTS = 'patients',
  VISIT = 'visit',
  BEDS = 'beds'
}

export interface SimilarCase {
  summary: string;
  outcome: string;
  similarity: number;
}

export interface SOAPSegment {
  content: string;
  confidence: 'high' | 'medium' | 'low';
  approved: boolean;
}

export interface VisitSOAP {
  subjective: SOAPSegment;
  objective: SOAPSegment;
  assessment: SOAPSegment;
  plan: SOAPSegment;
  medications: Medication[];
}

export interface ClinicalContext {
  relatedSymptoms: string[];
  likelyDiagnoses: string[];
  suggestedMedications: Medication[];
  insight: string;
  similarCases: SimilarCase[];
}
