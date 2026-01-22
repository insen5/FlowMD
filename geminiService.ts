import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Simple in-memory cache to prevent redundant calls
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes for clinical sessions

/**
 * Utility to wrap AI calls with caching and basic retry logic.
 */
const callWithRetryAndCache = async (cacheKey: string | null, fn: () => Promise<any>, retries = 2) => {
  if (cacheKey && cache.has(cacheKey)) {
    const entry = cache.get(cacheKey)!;
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
  }

  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await fn();
      if (cacheKey) {
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
      return result;
    } catch (error: any) {
      lastError = error;
      if (error?.message?.includes('429') || error?.status === 429) {
        const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

// Generates a simple hash to detect if content has changed enough to warrant a new AI call
const generateContentHash = (content: string) => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
};

export const getRegimenSuggestions = async (context: string, history: string[], confirmedDiagnoses: string[]) => {
  if (confirmedDiagnoses.length === 0) return [];
  
  const stateString = `${context}_${confirmedDiagnoses.join(',')}`;
  const cacheKey = `regimen_sugg_${generateContentHash(stateString)}`;
  
  return callWithRetryAndCache(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest a precise medical regimen based on confirmed diagnoses: ${confirmedDiagnoses.join(", ")}.
      Clinical Narrative: "${context}"
      Patient History: ${history.join(", ")}
      
      Provide 3-4 specific medication options. For each, include:
      - Medication Name
      - Dosage
      - Frequency
      - Rationale (Why this is indicated based on current presentation and history).
      
      Ensure suggestions are standard-of-care and avoid historical contraindications.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["name", "dosage", "frequency", "reason"]
              }
            }
          }
        }
      }
    });
    const data = JSON.parse(response.text || '{"medications": []}');
    return data.medications;
  }).catch(() => []);
};

export const extractClaimData = async (clinicalNotes: string) => {
  const cacheKey = `claim_audit_${generateContentHash(clinicalNotes)}`;
  
  return callWithRetryAndCache(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a Certified Medical Auditor. Review these clinical notes for billing:
      "${clinicalNotes}"
      
      Extract:
      1. ICD-10 diagnosis codes justified by the text.
      2. CPT procedure/visit codes justified by the text.
      3. Verbatim 'evidence' quotes for every code.
      4. Estimated reimbursement yield.
      5. MDM Complexity level.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosisCodes: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  description: { type: Type.STRING },
                  evidence: { type: Type.STRING },
                  sourceSection: { type: Type.STRING }
                }
              } 
            },
            procedureCodes: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  description: { type: Type.STRING },
                  evidence: { type: Type.STRING },
                  sourceSection: { type: Type.STRING }
                }
              } 
            },
            estimatedReimbursement: { type: Type.NUMBER },
            payer: { type: Type.STRING },
            billingComplexity: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }).catch(() => null);
};

export const getClinicalContext = async (
  selectedSymptoms: string[], 
  history: string[], 
  rosFindings?: string[], 
  examFindings?: string[],
  narrative?: string,
  confirmedDiagnoses?: string[]
) => {
  if (selectedSymptoms.length === 0 && (!narrative || narrative.length < 10)) return null;
  
  const content = `${selectedSymptoms.join(',')}_${history.join(',')}_${confirmedDiagnoses?.join(',')}_${narrative}`;
  const cacheKey = `clinical_context_${generateContentHash(content)}`;
  
  return callWithRetryAndCache(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Senior Clinician Reasoning Engine.
      Symptoms: ${selectedSymptoms.join(", ")}
      History: ${history.join(", ")}
      Narrative: "${narrative || ''}"
      
      Provide: Differential diagnoses, Recommended investigations, and Clinical Insights.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            differentialDiagnoses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  probability: { type: Type.NUMBER },
                  icd10: { type: Type.STRING },
                  reasoning: { type: Type.STRING }
                }
              }
            },
            recommendedLabs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  urgency: { type: Type.STRING }
                }
              }
            },
            safetyAlerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  message: { type: Type.STRING },
                  severity: { type: Type.STRING }
                }
              }
            },
            insight: { type: Type.STRING },
            similarCases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  outcome: { type: Type.STRING },
                  similarity: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }).catch(() => null);
};

export const processAmbientNotes = async (transcript: string) => {
  return callWithRetryAndCache(null, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Process this transcript: "${transcript}" into a SOAP note.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            subjective: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, confidence: { type: Type.STRING } } },
            objective: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, confidence: { type: Type.STRING } } },
            assessment: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, confidence: { type: Type.STRING } } },
            plan: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, confidence: { type: Type.STRING } } },
            medications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  frequency: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  });
};

export const parseSchedulingCommand = async (command: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse: "${command}" into a schedule object.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          patientName: { type: Type.STRING },
          reason: { type: Type.STRING },
          date: { type: Type.STRING },
          time: { type: Type.STRING },
          duration: { type: Type.NUMBER },
          type: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const predictNoShowRisk = async (name: string, history: string[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Assess no-show risk for ${name}. History: ${history.join(",")}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskLevel: { type: Type.STRING },
          reasoning: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const getRelatedSymptoms = async (symptoms: string[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Related symptoms for: ${symptoms.join(",")}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          relatedSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  const d = JSON.parse(response.text || '{"relatedSymptoms":[]}');
  return d.relatedSymptoms;
};

export const getPlanSuggestions = async (context: string, diagnoses: string[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Management steps for ${diagnoses.join(",")} given ${context}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  const d = JSON.parse(response.text || '{"suggestions":[]}');
  return d.suggestions;
};

/**
 * Predicts recommended management steps for a patient based on their name and history.
 */
export const getPredictionsForPatient = async (name: string, history: string[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Predict recommended management steps for patient ${name} based on history: ${history.join(", ")}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predictions: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  const d = JSON.parse(response.text || '{"predictions":[]}');
  return d.predictions;
};

export const getPatientBriefSummary = async (p: any) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Brief summary for patient ${p.name}.`,
  });
  return response.text;
};

export const generatePatientFriendlySummary = async (data: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Patient summary for: ${data}`,
  });
  return response.text;
};

export const generateDischargeSummary = async (name: string, bed: string, check: any[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Discharge summary for ${name} at ${bed}.`,
  });
  return response.text;
};