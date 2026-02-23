import { supabase } from './supabaseClient';
import { Patient, Appointment, VisitSOAP } from './types';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS } from './constants';

export const dataService = {
  // --- Patients ---
  async getPatients(): Promise<Patient[]> {
    if (!supabase) return MOCK_PATIENTS;

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*, clinical_journey(*)');
      
      if (error || !data || data.length === 0) {
        return MOCK_PATIENTS;
      }
      
      return data.map(p => ({
        ...p,
        lastVisit: p.last_visit,
        eligibilityStatus: p.eligibility,
        clinicalJourney: p.clinical_journey
      }));
    } catch (e) {
      console.error("Supabase patient fetch error", e);
      return MOCK_PATIENTS;
    }
  },

  // --- Appointments ---
  async getAppointments(): Promise<Appointment[]> {
    if (!supabase) return MOCK_APPOINTMENTS;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: true });
      
      if (error || !data || data.length === 0) {
        return MOCK_APPOINTMENTS;
      }

      return data.map(a => ({
        id: a.id,
        patientId: a.patient_id,
        patientName: a.patient_name || 'Unknown',
        startTime: a.start_time,
        endTime: a.end_time,
        reason: a.reason,
        type: a.type,
        noShowRisk: a.no_show_risk,
        status: a.status
      }));
    } catch (e) {
      console.error("Supabase appointment fetch error", e);
      return MOCK_APPOINTMENTS;
    }
  },

  async upsertAppointment(appt: Appointment) {
    if (!supabase) {
      console.log("Mock: Appointment upserted", appt);
      return true;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .upsert({
          id: appt.id,
          patient_id: appt.patientId,
          patient_name: appt.patientName,
          start_time: appt.startTime,
          end_time: appt.endTime,
          reason: appt.reason,
          type: appt.type,
          no_show_risk: appt.noShowRisk,
          status: appt.status
        });
      return !error;
    } catch (e) {
      console.error("Supabase upsert failed", e);
      return false;
    }
  },

  // --- SOAP Notes ---
  async getSOAPNote(apptId: string): Promise<any | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('soap_notes')
        .select('*')
        .eq('appointment_id', apptId)
        .maybeSingle();
      
      if (error || !data) return null;
      return data;
    } catch (e) {
      console.error("Supabase SOAP fetch failed", e);
      return null;
    }
  },

  async saveSOAPNote(apptId: string, patientId: string, soap: VisitSOAP, manualNotes: string) {
    if (!supabase) {
        console.log("Mock: SOAP saved locally");
        return true;
    }

    try {
      const { error } = await supabase
        .from('soap_notes')
        .upsert({
          appointment_id: apptId,
          patient_id: patientId,
          subjective_content: soap.subjective.content,
          objective_content: soap.objective.content,
          assessment_content: soap.assessment.content,
          plan_content: soap.plan.content,
          manual_narrative: manualNotes,
          finalized_at: soap.plan.approved ? new Date().toISOString() : null
        }, { onConflict: 'appointment_id' });
      
      return !error;
    } catch (e) {
      console.error("Supabase SOAP save failed", e);
      return false;
    }
  }
};
