import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateImage(prompt: string, baseImage?: string) {
  const parts: any[] = [];
  
  if (baseImage) {
    const [prefix, base64Data] = baseImage.split(',');
    const mimeType = prefix.split(':')[1].split(';')[0];
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    });
  }
  
  parts.push({
    text: prompt,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: parts,
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates returned");
  }

  for (const part of candidates[0].content.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image found in the response");
}
