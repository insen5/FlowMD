
import { Patient, Symptom, Bed } from './types';

export const MOCK_PATIENTS: Patient[] = [
  { 
    id: '1', 
    name: 'John Doe', 
    age: 45, 
    gender: 'Male', 
    lastVisit: '2023-10-12', 
    history: ['Hypertension', 'Type 2 Diabetes'],
    trend: 'improving',
    eligibilityStatus: 'Verified',
    claimStatus: 'Paid'
  },
  { 
    id: '2', 
    name: 'Jane Smith', 
    age: 32, 
    gender: 'Female', 
    lastVisit: '2023-11-05', 
    history: ['Seasonal Allergies', 'Asthma'],
    trend: 'stable',
    eligibilityStatus: 'Verified',
    claimStatus: 'Draft'
  },
  { 
    id: '3', 
    name: 'Robert Wilson', 
    age: 68, 
    gender: 'Male', 
    lastVisit: '2023-09-20', 
    history: ['COPD', 'Gout', 'CKD Stage 2'],
    trend: 'worsening',
    eligibilityStatus: 'Denied',
    claimStatus: 'None'
  },
  { 
    id: '4', 
    name: 'Sarah Parker', 
    age: 29, 
    gender: 'Female', 
    lastVisit: '2023-11-20', 
    history: ['Anxiety', 'Insomnia'],
    trend: 'stable',
    eligibilityStatus: 'Pending',
    claimStatus: 'None'
  },
];

export const COMMON_SYMPTOMS: Symptom[] = [
  { id: 's1', label: 'Cough', category: 'Respiratory' },
  { id: 's2', label: 'Fever', category: 'General' },
  { id: 's3', label: 'Fatigue', category: 'General' },
  { id: 's4', label: 'Nausea', category: 'GI' },
  { id: 's5', label: 'Shortness of Breath', category: 'Respiratory' },
  { id: 's6', label: 'Headache', category: 'Neurological' },
  { id: 's7', label: 'Body Ache', category: 'General' },
  { id: 's8', label: 'Chest Pain', category: 'Cardiac' },
];

export const INITIAL_BEDS: Bed[] = Array.from({ length: 8 }, (_, i) => ({
  id: `B${i + 1}`,
  label: `Bed ${i + 1}`,
  status: i === 1 ? 'Post-op' : i === 4 ? 'Pre-op' : 'Available',
  patientName: i === 1 ? 'Jane Smith' : i === 4 ? 'Robert Wilson' : undefined,
  timeStarted: i === 1 ? '10:30 AM' : i === 4 ? '02:15 PM' : undefined,
}));
