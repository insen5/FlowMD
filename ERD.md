# FlowMD: PostgreSQL Schema & Entity Relationship Diagram (ERD)

This document defines the production-ready data model for FlowMD. It is designed for PostgreSQL to handle complex clinical relationships, AI-powered billing audits, and longitudinal patient tracking.

## 1. Core Schema Overview

```mermaid
erDiagram
    PATIENTS ||--o{ CLINICAL_JOURNEY : "has history"
    PATIENTS ||--o{ APPOINTMENTS : "schedules"
    APPOINTMENTS ||--|| SOAP_NOTES : "generates"
    SOAP_NOTES ||--o{ MEDICATIONS : "prescribes"
    SOAP_NOTES ||--|| CLAIMS : "triggers"
    CLAIMS ||--o{ CLAIM_CODES : "contains"
    BEDS |o--o| PATIENTS : "occupies"
    BEDS ||--o{ BED_CHECKLIST : "monitors"

    PATIENTS {
        uuid id PK
        string name
        int age
        string gender
        date last_visit
        enum trend "improving, stable, worsening"
        enum eligibility "Verified, Pending, Denied"
        timestamp created_at
    }

    CLINICAL_JOURNEY {
        uuid id PK
        uuid patient_id FK
        string condition
        date diagnosed_at
        enum severity "Mild, Moderate, Severe, Chronic"
    }

    APPOINTMENTS {
        uuid id PK
        uuid patient_id FK
        timestamp start_time
        timestamp end_time
        string reason
        enum type "Routine, Urgent, Follow-up, Procedure"
        enum status "Scheduled, Arrived, In-Progress, Cancelled"
        enum no_show_risk "Low, Medium, High"
        text risk_reasoning
    }

    SOAP_NOTES {
        uuid id PK
        uuid appointment_id FK
        uuid patient_id FK
        text subjective_content
        text objective_content
        text assessment_content
        text plan_content
        text manual_narrative "The raw clinician narrative"
        string content_hash "Used for AI response caching"
        float ai_confidence
        timestamp finalized_at
    }

    MEDICATIONS {
        uuid id PK
        uuid soap_note_id FK
        string name
        string dosage
        string frequency
        text clinical_rationale
    }

    CLAIMS {
        uuid id PK
        uuid soap_note_id FK
        string payer
        decimal estimated_reimbursement
        enum complexity "Low, Moderate, High"
        enum status "Draft, Submitted, Paid, Denied"
        timestamp audited_at
    }

    CLAIM_CODES {
        uuid id PK
        uuid claim_id FK
        string code "ICD-10 or CPT"
        string description
        text evidence_quote "Verbatim text from note"
        enum source_section "Subjective, Objective, Assessment, Plan"
    }

    BEDS {
        string id PK "e.g., B1, B2"
        string label
        enum status "Available, Pre-op, Procedure, Post-op, Discharge"
        uuid current_patient_id FK
        timestamp status_updated_at
    }

    BED_CHECKLIST {
        uuid id PK
        string bed_id FK
        string label
        boolean is_completed
    }
```

## 2. Intelligence Logic Details

### Content-Based Caching (`SOAP_NOTES.content_hash`)
The `content_hash` column stores a hash of the `manual_narrative` and `assessment_content`. When a request is made to generate a **Revenue Audit** or a **Patient Handout**, the backend checks if a result already exists for that specific hash. This minimizes LLM costs and latency if a doctor toggles tabs without changing the note.

### Verbatim Justification (`CLAIM_CODES.evidence_quote`)
To survive insurance audits, the `evidence_quote` stores the exact substring returned by the Gemini AI that justified the code. This prevents the "Black Box" problem in AI billing.

### Longitudinal Joins
By separating `CLINICAL_JOURNEY` from `SOAP_NOTES`, the AI engine can perform a RAG (Retrieval-Augmented Generation) query across the history table to provide the "Clinical Twins" and "Safety Alerts" features seen in the UI.

## 3. Recommended Node.js Stack
- **ORM**: Prisma (for type-safe clinical schemas).
- **Database**: PostgreSQL (with JSONB support for unstructured ROS/PE findings).
- **Migrations**: Automated through Prisma Migrate to handle evolving clinical fields.
