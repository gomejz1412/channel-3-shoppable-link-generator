

import { GoogleGenAI, Type } from "@google/genai";
import type { Product } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a mock service.");
}

const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

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

// FIX: Corrected the return type to match what the function actually returns (an object with title and description).
export const generateProductDetails = async (productUrl: string): Promise<Pick<Product, 'title' | 'description'>> => {
    if (!ai) {
      // Mock implementation for environments without an API key
      return new Promise(resolve => setTimeout(() => {
        resolve({
          title: "Starlight Shimmer Sneaker",
          description: "Walk on clouds and shine like a star. Ultimate comfort meets cosmic style.",
        });
      }, 1500));
    }

    try {
        const prompt = `Analyze this fictitious product link: "${productUrl}". Based on the URL, generate a JSON object with a catchy product title and a compelling, brief description for a social media post.`;

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
        console.error("Error generating product details:", error);
        throw new Error("Failed to generate product details from the URL. Please try again.");
    }
};