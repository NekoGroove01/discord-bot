// services/ai/GeminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { debugLog } from "../utils";
import { Prompt } from "../types";

export class GeminiService {
	private readonly genAI: GoogleGenerativeAI;
	private readonly model: any;

	constructor(apiKey: string) {
		this.genAI = new GoogleGenerativeAI(apiKey);
		this.model = this.genAI.getGenerativeModel({
			model: "gemini-2.0-flash-exp",
		});
	}

	async generateResponse(prompt: Prompt[]): Promise<string | null> {
		try {
			const result = await this.model.generateContent({
				contents: prompt,
				generationConfig: {
					temperature: 1,
					topK: 0,
					topP: 0.9,
					maxOutputTokens: 500,
				},
				safetySettings: [
					{ category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
					{ category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
					{ category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
					{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
					{ category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "OFF" },
				],
			});

			return result.response.text();
		} catch (error) {
			debugLog("Gemini API Error:", error);
			return null;
		}
	}
}
