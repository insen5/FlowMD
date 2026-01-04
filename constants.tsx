
import { Patient, Symptom, Bed, Appointment } from './types';

export const MOCK_PATIENTS: Patient[] = [
  { 
    id: '1', 
    name: 'John Doe', 
    age: 45, 
    gender: 'Male', 
    lastVisit: '2023-10-12', 
    history: ['Hypertension', 'Type 2 Diabetes'],
    clinicalJourney: [
      { condition: 'Hypertension', date: '2018-05-15', severity: 'Chronic' },
      { condition: 'Type 2 Diabetes', date: '2021-11-20', severity: 'Moderate' }
    ],
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
    clinicalJourney: [
      { condition: 'Asthma', date: '2010-02-10', severity: 'Chronic' },
      { condition: 'Seasonal Allergies', date: '2015-06-22', severity: 'Mild' }
    ],
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
    clinicalJourney: [
      { condition: 'COPD', date: '2012-10-14', severity: 'Severe' },
      { condition: 'CKD Stage 2', date: '2019-03-05', severity: 'Chronic' },
      { condition: 'Gout', date: '2022-08-11', severity: 'Moderate' }
    ],
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
    clinicalJourney: [
      { condition: 'Anxiety', date: '2020-04-30', severity: 'Moderate' },
      { condition: 'Insomnia', date: '2022-12-15', severity: 'Mild' }
    ],
    trend: 'stable',
    eligibilityStatus: 'Pending',
    claimStatus: 'None'
  },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    patientId: '1',
    patientName: 'John Doe',
    startTime: new Date().setHours(9, 0, 0, 0).toString(),
    endTime: new Date().setHours(9, 30, 0, 0).toString(),
    reason: 'Hypertension Follow-up',
    type: 'Follow-up',
    noShowRisk: 'Low',
    status: 'Arrived'
  },
  {
    id: 'a2',
    patientId: '2',
    patientName: 'Jane Smith',
    startTime: new Date().setHours(10, 0, 0, 0).toString(),
    endTime: new Date().setHours(10, 45, 0, 0).toString(),
    reason: 'Asthma Exacerbation',
    type: 'Urgent',
    noShowRisk: 'Medium',
    status: 'Scheduled'
  },
  {
    id: 'a3',
    patientId: '3',
    patientName: 'Robert Wilson',
    startTime: new Date().setHours(11, 0, 0, 0).toString(),
    endTime: new Date().setHours(12, 0, 0, 0).toString(),
    reason: 'Pre-op Clearance',
    type: 'Procedure',
    noShowRisk: 'High',
    status: 'Scheduled'
  }
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
  { id: 's9', label: 'Itching', category: 'Dermatological' },
  { id: 's10', label: 'Rash', category: 'Dermatological' },
  { id: 's11', label: 'Dizziness', category: 'Neurological' },
  { id: 's12', label: 'Abdominal Pain', category: 'GI' },
  { id: 's13', label: 'Vomiting', category: 'GI' },
  { id: 's14', label: 'Diarrhea', category: 'GI' },
  { id: 's15', label: 'Joint Pain', category: 'Musculoskeletal' },
  { id: 's16', label: 'Sore Throat', category: 'HEENT' },
  { id: 's17', label: 'Congestion', category: 'Respiratory' },
  { id: 's18', label: 'Heartburn', category: 'GI' },
  { id: 's19', label: 'Back Pain', category: 'Musculoskeletal' },
  { id: 's20', label: 'Insomnia', category: 'Neurological' },
];

export const INITIAL_BEDS: Bed[] = Array.from({ length: 8 }, (_, i) => ({
  id: `B${i + 1}`,
  label: `Bed ${i + 1}`,
  status: i === 1 ? 'Post-op' : i === 4 ? 'Pre-op' : 'Available',
  patientName: i === 1 ? 'Jane Smith' : i === 4 ? 'Robert Wilson' : undefined,
  timeStarted: i === 1 ? '10:30 AM' : i === 4 ? '02:15 PM' : undefined,
}));
