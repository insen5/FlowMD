# Product Requirements Document (PRD): FlowMD

## 1. Project Overview
- **Project Codename**: FlowMD
- **Category**: AI-Native HMIS (Hospital Management Information System) / EMR (Electronic Medical Record)
- **Target Audience**: Modern clinicians, surgeons, and hospital administrators in high-throughput environments.
- **Core Value Proposition**: The first EMR that learns how a clinician practices medicine and quietly keeps up, rather than requiring the clinician to adapt to rigid data-entry forms.

## 2. Core Vision & Philosophy
FlowMD treats medical documentation as a side-effect of clinical interaction, not a separate task. 
- **Ambient First**: Everything starts with "Ambient Recall"—the AI's ability to listen to doctor-patient conversations and synthesize them into structured SOAP notes.
- **Cognitive Load Reduction**: The UI is designed to minimize clicks. Suggestions for labs, diagnoses, and plans are predicted in real-time based on history and current symptoms.
- **Revenue Intelligence**: Billing is automated through high-fidelity code extraction (ICD-10/CPT) with verbatim audit trails to eliminate "downcoding" and audit risk.

## 3. Key Functional Modules
### A. Clinical Interface (Visit Module)
- **Predictive Intake Search**: Smart symptom selection with AI-driven related findings.
- **Ambient Recall**: Real-time transcription and SOAP transformation.
- **SOAP Sections**: Automated Subjective, Objective, Assessment, and Plan segments with confidence scoring.
- **Differential Diagnosis (DDx)**: Probabilistic ranking of potential diagnoses based on clinical context and history.

### B. Bed & Slot Management
- **High-Throughput Tracking**: Real-time status for Pre-op, Procedure, Post-op, and Discharge.
- **Automated Checklists**: AI-generated requirements for status transitions.
- **Discharge Summarization**: Automated generation of clinical briefs for PCP handoff upon discharge.

### C. Revenue Cycle Intelligence
- **Evidence-Based Billing**: Extraction of billing codes (ICD-10/CPT) directly from documentation.
- **Audit Trail**: Every code is justified by a verbatim quote from the clinical note and linked to a specific SOAP section.
- **Financial Forecasting**: Real-time yield estimation based on the current 2024 Medicare/Payer fee schedules.

## 4. Technical Design Principles
- **Offline-First Resilience**: Local caching of drafts (IndexedDB/LocalStorage) to ensure work is never lost during connectivity drops.
- **Edge Intelligence**: Heavy utilization of client-side processing for high-speed UI interactions.
- **Structured Data Pipeline**: Uses Gemini 3's high-fidelity reasoning for extracting structured JSON from narrative text.

## 5. Security & Safety
- **Clinical "Twins"**: Privacy-safe comparison with similar historical cases to provide outcome-based reasoning.
- **Safety Interlock**: Automated checks for contraindications (e.g., NSAIDs vs. CKD) during the planning phase.
