
import { GoogleGenAI, Type } from "@google/genai";

// Strictly adhering to initialization guidelines: { apiKey: process.env.API_KEY }
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getPredictionsForPatient = async (patientName: string, history: string[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on patient history: ${history.join(", ")}, suggest the 5 most likely symptoms or follow-up concerns for their next visit.`,
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
  } catch (error) {
    console.error("Prediction error:", error);
    return [];
  }
};

export const getClinicalContext = async (selectedSymptoms: string[]) => {
  if (selectedSymptoms.length === 0) return null;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The patient has these symptoms: ${selectedSymptoms.join(", ")}. 
      Act as a clinical context engine. Provide likely diagnoses, related symptoms to check for, 
      a brief smart insight, and 2 hypothetical "similar cases" from a historical graph.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relatedSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
            likelyDiagnoses: { type: Type.ARRAY, items: { type: Type.STRING } },
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
            },
            suggestedMedications: {
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
  } catch (error) {
    console.error("Context engine error:", error);
    return null;
  }
};

export const processAmbientNotes = async (transcript: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Transform this doctor-patient conversation transcript into a structured clinical SOAP note.
      For each segment, estimate your confidence (high/medium/low).
      Transcript: "${transcript}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
  } catch (error) {
    console.error("SOAP error:", error);
    return null;
  }
};

export const generateDischargeSummary = async (patientName: string, bedId: string, checklist: any[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a professional, concise discharge summary for patient ${patientName} from bed ${bedId}.
      Checklist completed: ${checklist.filter(i => i.completed).map(i => i.label).join(", ")}.
      Make it sound clinical and ready for a primary care doctor.`,
    });
    return response.text;
  } catch (error) {
    console.error("Discharge summary error:", error);
    return "Error generating summary.";
  }
};
