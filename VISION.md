# FlowMD Technical Philosophy: Revenue Intelligence & Audit Trail

This document details the low-level logic governing FlowMD's financial and clinical safety engines, as requested in the implementation specifications.

## 1. The Capture-Bundle-Infer Architecture
Revenue Intelligence in FlowMD is implemented as a non-linear data pipeline:
1. **Capture**: Ambient listening + Provider narrative notes are gathered.
2. **Bundle**: Narrative data is structured into Subjective, Objective, Assessment, and Plan (SOAP) segments via `geminiService.ts`.
3. **Infer**: The `extractClaimData` function uses the Gemini 3 engine to map the clinical summary to the most accurate ICD-10 and CPT codes.

## 2. The "Perfect" Audit Trail Implementation
To ensure audit-proof billing, the system adheres to the **Principle of Verbatim Justification**:
- **Structured Justification**: Every entry in the `ClaimData` object must contain an `evidence` property.
- **Verbatim Standard**: The AI is instructed to return only verbatim substrings from the clinician's notes to justify a code.
- **Section Traceability**: Every justified code identifies its `sourceSection` (e.g., "Assessment" or "Plan") to provide context for medical necessity during manual review.

## 3. Logic-as-Documentation
The core clinical logic of FlowMD is documented within the code itself to ensure it is always up-to-date:
- **`types.ts`**: Defines the rigorous schema for clinical and financial data.
- **`geminiService.ts`**: Contains the system prompts that act as the "Medical Auditor" guidelines.
- **`ClinicalInterface.tsx`**: Implements the visual "Evidence-Based" UI that allows providers to audit the AI's logic before final submission.
