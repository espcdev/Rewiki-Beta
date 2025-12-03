import { GoogleGenAI, Type } from "@google/genai";
import { RewikiArticle, RevisionResult, Language } from "../types";

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    let apiKey = '';
    try {
      // Very strict safe access to process.env.API_KEY
      // This prevents "Illegal constructor" or ReferenceError in environments where process is not defined
      if (typeof process !== 'undefined' && typeof process.env !== 'undefined') {
        apiKey = process.env.API_KEY || '';
      }
    } catch (e) {
      console.warn("Could not access process.env.API_KEY", e);
    }
    
    // Fallback or empty string is better than crashing on constructor if key is missing during init
    aiClient = new GoogleGenAI({ apiKey: apiKey });
  }
  return aiClient;
};

// Helper to generate an image based on a prompt
const generateTopicImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await getAiClient().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Generate a high-quality, educational, photorealistic or diagrammatic image for an encyclopedia about: ${prompt}. Aspect ratio 16:9. No text overlay. Minimalist style.` }
        ]
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (e) {
    console.warn("Image generation failed", e);
    return undefined;
  }
};

export const generateRewikiArticle = async (topic: string, lang: Language): Promise<RewikiArticle> => {
  const modelId = "gemini-2.5-flash"; 

  const langInstruction = lang === 'es' 
    ? "Generate EVERYTHING in Spanish (Español)." 
    : "Generate EVERYTHING in English.";

  const prompt = `You are Rewiki AI, a specialized editor that writes concise, modern encyclopedia articles.
  
  Topic: "${topic}"
  Language: ${langInstruction}

  Generate a JSON response:
  1. "summary": A very clear, concise summary (TL;DR).
  2. "sections": 3-4 key sections. give each section a unique "id".
  3. "imagePrompts": A list of 1 very descriptive prompt to generate an educational image about this topic.
  4. "originalSnippet": A simulated complex/boring Wikipedia paragraph about this topic for comparison.
  5. "changeLog": What you simplified (in ${lang}).
  6. "didYouKnow": A fun/surprising fact about the topic.
  7. "homeworkHelp": An array of 3 key bullet points useful for a student's homework.
  8. "relatedTopics": An array of 3 related topics (strings) to explore next.
  9. "quiz": An array of 3 multiple choice questions to test understanding. { question, options, correctAnswer (index) }.
  10. "lastUpdated": Current date.
  
  The tone should be educational, objective, and modern.`;

  try {
    const response = await getAiClient().models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            summary: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  heading: { type: Type.STRING },
                  content: { type: Type.STRING },
                }
              }
            },
            imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
            originalSnippet: { type: Type.STRING },
            changeLog: { type: Type.STRING },
            didYouKnow: { type: Type.STRING },
            homeworkHelp: { type: Type.ARRAY, items: { type: Type.STRING } },
            relatedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            quiz: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.INTEGER }
                    }
                }
            },
            lastUpdated: { type: Type.STRING },
          },
          required: ["topic", "summary", "sections", "imagePrompts", "originalSnippet", "changeLog", "didYouKnow", "homeworkHelp", "relatedTopics", "quiz"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as RewikiArticle;
      
      // Assign ID and Language
      data.id = Date.now().toString();
      data.language = lang;

      if (!data.lastUpdated) {
        data.lastUpdated = new Date().toLocaleDateString();
      }

      // 2. Generate Image in parallel
      if (data.imagePrompts && data.imagePrompts.length > 0) {
         const image = await generateTopicImage(data.imagePrompts[0]);
         if (image) {
            data.generatedImage = image;
         }
      }

      return data;
    } else {
      throw new Error("No content generated");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeRevision = async (
  currentText: string, 
  userSelection: string, 
  userRequest: string,
  lang: Language
): Promise<RevisionResult> => {
  const modelId = "gemini-2.5-flash";
  
  const prompt = `You are the Rewiki Quality Control AI. A user wants to edit an article.
  Language Context: ${lang === 'es' ? 'Spanish' : 'English'}.
  
  Current Text Context: "${currentText.substring(0, 500)}..."
  User Selected Text (if any): "${userSelection}"
  User's Requested Change: "${userRequest}"

  Analyze:
  1. Is it factually correct?
  2. Is it objective?
  
  If YES: Return accepted: true, and "newContent" (the rewritten text).
  If NO: Return accepted: false, "reasoning" (why).
  `;

  try {
    const response = await getAiClient().models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            accepted: { type: Type.BOOLEAN },
            newContent: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["accepted", "reasoning"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as RevisionResult;
    }
    throw new Error("Analysis failed");
  } catch (e) {
    return { accepted: false, reasoning: "AI Service unavailable." };
  }
};