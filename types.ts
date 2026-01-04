
export interface ClinicalHistory {
  condition: string;
  date: string; // YYYY-MM-DD
  severity?: 'Mild' | 'Moderate' | 'Severe' | 'Chronic';
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  history: string[]; // Keep for legacy/simple display
  clinicalJourney?: ClinicalHistory[]; // Structured history for timeline
  trend?: 'improving' | 'stable' | 'worsening';
  eligibilityStatus?: 'Verified' | 'Pending' | 'Denied';
  claimStatus?: 'Draft' | 'Submitted' | 'Paid' | 'None';
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

export interface SafetyAlert {
  type: 'Contraindication' | 'Caution' | 'Interaction';
  message: string;
  severity: 'High' | 'Medium' | 'Low';
}

export interface DifferentialDiagnosis {
  name: string;
  probability: number;
  icd10: string;
  reasoning: string;
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
  differentialDiagnoses: DifferentialDiagnosis[];
  recommendedLabs: Array<{ name: string; urgency: string }>;
  safetyAlerts: SafetyAlert[];
  insight: string;
  similarCases: SimilarCase[];
}

export interface JustifiedCode {
  code: string;
  description: string;
  evidence: string; // Verbatim snippet from the notes
  sourceSection: 'Subjective' | 'Objective' | 'Assessment' | 'Plan' | 'Exam' | 'History'; // Audit trail source
}

export interface ClaimData {
  diagnosisCodes: JustifiedCode[];
  procedureCodes: JustifiedCode[];
  estimatedReimbursement: number;
  payer: string;
  billingComplexity: 'Low' | 'Moderate' | 'High';
}
