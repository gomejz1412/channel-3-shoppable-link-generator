

import { GoogleGenAI, Type } from "@google/genai";
import type { Product } from '../types';

// Use Vite env in the browser bundle; avoid process.env which is undefined in production build.
const VITE_API_KEY = (import.meta as any)?.env?.VITE_API_KEY as string | undefined;
const IS_DEV = (import.meta as any)?.env?.DEV === true;

if (!VITE_API_KEY && IS_DEV) {
  // Only warn in development to avoid noisy console warnings in production/mobile.
  // console.warn("VITE_API_KEY not set. Using mock AI response.");
}

const ai = VITE_API_KEY ? new GoogleGenAI({ apiKey: VITE_API_KEY }) : null;

const productSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A catchy product title, under 10 words."
    },
    description: {
      type: Type.STRING,
      description: "A short, punchy, and enticing product description suitable for an Instagram-style post. Focus on the key benefit. Keep it under 30 words."
    },
  },
  required: ["title", "description"]
};


// Generate product details; falls back to a short mock when API key is not configured.
export const generateProductDetails = async (productUrl: string): Promise<Pick<Product, 'title' | 'description'>> => {
  if (!ai) {
    return new Promise(resolve => setTimeout(() => {
      resolve({
        title: "Curated Must‑Have",
        description: "A perfect pick for your look. Stylish, versatile, and ready to wear.",
      });
    }, 800));
  }

  try {
    const prompt = `Analyze this product link: "${productUrl}". Respond with a JSON object containing:
- "title": a catchy product title under 10 words
- "description": a short, enticing description under 30 words`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: productSchema
      }
    });

    const jsonText = response.text.trim();
    const productDetails = JSON.parse(jsonText);

    if (!productDetails.title || !productDetails.description) {
      throw new Error("Invalid response format from AI.");
    }

    return productDetails;

  } catch (error) {
    // Log in dev only to avoid noisy production console
    if (IS_DEV) {
      console.error("Error generating product details:", error);
    }
    // Provide a minimal graceful fallback
    return {
      title: "Curated Product",
      description: "A great addition to your look. Effortless style.",
    };
  }
};
