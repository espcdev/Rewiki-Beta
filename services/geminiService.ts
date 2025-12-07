import { GoogleGenAI, Type } from "@google/genai";
import { RewikiArticle, RevisionResult, Language } from "../types";

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    let apiKey = '';
    try {
      if (typeof process !== 'undefined' && typeof process.env !== 'undefined') {
        apiKey = process.env.API_KEY || '';
      }
    } catch (e) {
      console.warn("Could not access process.env.API_KEY", e);
    }
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

// Helper to clean Markdown JSON code blocks
const cleanJson = (text: string): string => {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
};

export const generateRewikiArticle = async (topic: string, lang: Language): Promise<RewikiArticle> => {
  const modelId = "gemini-2.5-flash"; 

  const langInstruction = lang === 'es' 
    ? "Generate EVERYTHING in Spanish (Español)." 
    : "Generate EVERYTHING in English.";

  const prompt = `You are Rewiki AI, a specialized editor that writes concise, modern encyclopedia articles.
  
  Topic: "${topic}"
  Language: ${langInstruction}

  IMPORTANT: Return ONLY valid JSON. Do not use Markdown code blocks. The response must be a single valid JSON object.

  Structure:
  {
    "topic": "Title of the topic",
    "summary": "A very clear, concise summary (TL;DR)",
    "sections": [{ "id": "unique_id", "heading": "Section Title", "content": "Content..." }],
    "imagePrompts": ["A descriptive prompt for an educational image"],
    "realImageUrl": "Use the Google Search tool to find a direct URL to a high-quality, public domain image (preferably Wikimedia Commons) representing the topic. Must be a valid JPG/PNG URL.",
    "secondaryImageUrl": "Use Google Search to find a SECOND different image URL (diagram, detail, or contextual photo) from Wikimedia, Pexels, or Unsplash. Must be a valid image URL.",
    "originalSnippet": "A simulated complex/boring Wikipedia paragraph about this topic",
    "changeLog": "What you simplified",
    "didYouKnow": "A fun fact",
    "homeworkHelp": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
    "relatedTopics": ["Topic 1", "Topic 2", "Topic 3"],
    "quiz": [{ "question": "Question?", "options": ["A", "B", "C"], "correctAnswer": 0 }],
    "lastUpdated": "Current Date"
  }
  
  The tone should be educational, objective, and modern. Use the Google Search tool to ensure facts are up-to-date and to find the realImageUrl and secondaryImageUrl.`;

  try {
    const response = await getAiClient().models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Google Search Grounding
      }
    });

    if (response.text) {
      const cleanText = cleanJson(response.text);
      let data: RewikiArticle;
      
      try {
        data = JSON.parse(cleanText) as RewikiArticle;
      } catch (parseError) {
        console.error("Failed to parse JSON", cleanText);
        throw new Error("Invalid JSON response from AI");
      }
      
      data.id = Date.now().toString();
      data.language = lang;

      if (!data.lastUpdated) {
        data.lastUpdated = new Date().toLocaleDateString();
      }

      // 2. Generate Image in parallel (as backup)
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
  lang: Language,
  editType: 'fix' | 'add' = 'fix'
): Promise<RevisionResult> => {
  const modelId = "gemini-2.5-flash";
  
  const prompt = `You are the Rewiki Quality Control AI. A user wants to edit an article.
  Language Context: ${lang === 'es' ? 'Spanish' : 'English'}.
  Edit Type: ${editType === 'add' ? 'Add new section/content' : 'Fix/Correct existing information'}.
  
  Current Text Context: "${currentText.substring(0, 500)}..."
  User Selected Text (if any): "${userSelection}"
  User's Requested Change/Addition: "${userRequest}"

  Analyze:
  1. Is it factually correct?
  2. Is it objective?

  IMPORTANT: Return ONLY valid JSON. Do not use Markdown.
  Structure: { "accepted": boolean, "newContent": "string (optional)", "reasoning": "string" }
  
  If editType is 'add', generate the new section content in "newContent".
  If editType is 'fix', generate the corrected text replacement in "newContent".
  If rejected, explain why in "reasoning".
  `;

  try {
    const response = await getAiClient().models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Use search to verify user claims
      }
    });

    if (response.text) {
      const cleanText = cleanJson(response.text);
      return JSON.parse(cleanText) as RevisionResult;
    }
    throw new Error("Analysis failed");
  } catch (e) {
    console.error(e);
    return { accepted: false, reasoning: "AI Service unavailable or response invalid." };
  }
};