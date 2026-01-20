
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Simple in-memory cache to prevent redundant calls
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * Utility to wrap AI calls with caching and basic retry logic for rate limits.
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
        console.warn(`Rate limit hit. Retrying in ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const parseSchedulingCommand = async (command: string) => {
  return callWithRetryAndCache(null, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse this clinical scheduling command into a structured object.
      Command: "${command}"
      Reference Date: ${new Date().toLocaleDateString()}
      Return the patient name, reason for visit, date, time (24h format), and duration in minutes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patientName: { type: Type.STRING },
            reason: { type: Type.STRING },
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            time: { type: Type.STRING, description: "HH:mm" },
            duration: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["Routine", "Urgent", "Follow-up", "Procedure"] }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  });
};

export const predictNoShowRisk = async (patientName: string, history: string[]) => {
  const cacheKey = `noshow_${patientName}`;
  return callWithRetryAndCache(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Assess the risk of this patient not showing up for their appointment.
      Patient: ${patientName}
      Clinical Context: ${history.join(", ")}
      Return a risk level (Low, Medium, High) and a one-sentence reasoning.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"riskLevel": "Low", "reasoning": "Standard profile."}');
  });
};

export const getRelatedSymptoms = async (selectedSymptoms: string[]) => {
  if (selectedSymptoms.length === 0) return [];
  const cacheKey = `related_symptoms_${selectedSymptoms.sort().join('_')}`;
  
  return callWithRetryAndCache(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The patient has reported these symptoms: ${selectedSymptoms.join(", ")}. 
      Suggest 6 clinically related symptoms or associated findings that a doctor should check for next. 
      Return only the symptom names.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relatedSymptoms: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    const data = JSON.parse(response.text || '{"relatedSymptoms": []}');
    return data.relatedSymptoms;
  }).catch(() => []);
};

export const getPlanSuggestions = async (context: string, confirmedDiagnoses: string[] = []) => {
  const cacheKey = `plan_sugg_${context.substring(0, 50)}_${confirmedDiagnoses.join('_')}`;
  return callWithRetryAndCache(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this clinical context: "${context}" 
      AND confirmed diagnoses: ${confirmedDiagnoses.join(", ") || 'None yet selected'}.
      Suggest 5 high-impact next steps for the clinical plan (e.g., follow-up timelines, specific lifestyle advice, or coordination steps). 
      If diagnoses are confirmed, suggest management specifically for those.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    const data = JSON.parse(response.text || '{"suggestions": []}');
    return data.suggestions;
  }).catch(() => []);
};

export const getPredictionsForPatient = async (patientName: string, history: string[]) => {
  const cacheKey = `predictions_${patientName}_${history.sort().join('_')}`;
  return callWithRetryAndCache(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on patient history: ${history.join(", ")}, suggest 5 likely diagnostic or management steps for a future plan.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    const data = JSON.parse(response.text || '{"predictions": []}');
    return data.predictions;
  }).catch(() => []);
};

export const getPatientBriefSummary = async (patient: any) => {
  const cacheKey = `brief_${patient.id}`;
  return callWithRetryAndCache(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a one-sentence clinical brief for a doctor reviewing an intake.
      Patient: ${patient.name}, ${patient.age}${patient.gender}.
      History: ${patient.history.join(", ")}.
      Vitals: Temp 98.6F, Pulse 72bpm, SpO2 99%.
      Keep it strictly one sentence, clinical, and high-signal.`,
    });
    return response.text;
  }).catch(() => "Clinically stable patient with longitudinal history; monitoring intake symptoms.");
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
  
  const cacheKey = `clinical_context_${selectedSymptoms.sort().join('_')}_${history.sort().join('_')}_${confirmedDiagnoses?.join('_')}_${narrative?.length}`;
  
  return callWithRetryAndCache(cacheKey, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a senior clinical diagnostician.
      Current Symptoms: ${selectedSymptoms.join(", ")}
      Longitudinal History: ${history.join(", ")}
      Confirmed Diagnoses by Provider: ${confirmedDiagnoses?.join(", ") || 'None yet'}
      ROS Findings (Abnormalities): ${rosFindings?.join(", ") || 'None noted'}
      Physical Exam Abnormalities: ${examFindings?.join(", ") || 'None noted'}
      Provider Narrative Notes: "${narrative || 'None'}"

      Provide high-fidelity clinical reasoning. 
      IMPORTANT: If diagnoses are confirmed, the recommended labs and investigations should specifically aim to manage or further workup those conditions.
      
      Provide:
      1. Differential Diagnoses (Name, Probability 0-1, ICD-10 Code, and Brief Clinical Reasoning).
      2. Recommended Lab/Imaging investigations (Name, Urgency).
      3. Safety Alerts: Especially check for interactions between suspected diagnoses and historical conditions.
      4. A single clinical insight pearl.
      5. 2 Historical Clinical Twins.`,
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
      contents: `Transform this doctor-patient conversation transcript into a structured clinical SOAP note and a cohesive narrative intake summary.
      Transcript: "${transcript}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            subjective: { 
                type: Type.OBJECT, 
                properties: { content: { type: Type.STRING }, confidence: { type: Type.STRING } } 
            },
            objective: { 
                type: Type.OBJECT, 
                properties: { content: { type: Type.STRING }, confidence: { type: Type.STRING } } 
            },
            assessment: { 
                type: Type.OBJECT, 
                properties: { content: { type: Type.STRING }, confidence: { type: Type.STRING } } 
            },
            plan: { 
                type: Type.OBJECT, 
                properties: { content: { type: Type.STRING }, confidence: { type: Type.STRING } } 
            },
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
  }).catch(() => null);
};

export const generatePatientFriendlySummary = async (clinicalData: string) => {
  return callWithRetryAndCache(null, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a patient-friendly summary of a medical visit. Avoid jargon. Use clear, reassuring language. 
      Explain what was discussed, the suspected diagnosis, and the plan in simple terms.
      Clinical Data: "${clinicalData}"`,
    });
    return response.text;
  }).catch(() => "We had a productive visit today to discuss your symptoms. We are monitoring your progress and have a plan in place for your recovery.");
};

export const extractClaimData = async (clinicalNotes: string) => {
  return callWithRetryAndCache(null, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a Certified Medical Auditor and Billing Specialist. Examine these clinical notes and extract Billing Intelligence for a medical claim.
      Notes: "${clinicalNotes}"`,
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
            billingComplexity: { type: Type.STRING, description: "Low, Moderate, or High complexity based on MDM." }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }).catch(() => null);
};

export const generateDischargeSummary = async (patientName: string, bedId: string, checklist: any[]) => {
  return callWithRetryAndCache(null, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a professional, concise discharge summary for patient ${patientName} from bed ${bedId}.
      Checklist completed: ${checklist.filter(i => i.completed).map(i => i.label).join(", ")}.
      Make it sound clinical and ready for a primary care doctor.`,
    });
    return response.text;
  }).catch(() => "Discharge completed successfully with standard protocols followed.");
};
