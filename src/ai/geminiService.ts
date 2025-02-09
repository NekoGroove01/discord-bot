// services/ai/GeminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { debugLog } from "../utils";
import { Prompt } from "../types";

export enum GeminiModel {
	Pro = "gemini-2.0-pro-exp-02-05",
	Flash = "gemini-2.0-flash",
}

export interface GeminiServiceConfig {
	temperature?: number;
	topP?: number;
	maxOutputTokens?: number;
}


export class GeminiService {
	private readonly genAI: GoogleGenerativeAI;
	private readonly model: any;

	constructor(apiKey: string, model: GeminiModel = GeminiModel.Pro) {
		this.genAI = new GoogleGenerativeAI(apiKey);
		this.model = this.genAI.getGenerativeModel({
			model: model,
		});
	}

	async generateResponse(prompt: Prompt[], config?: GeminiServiceConfig): Promise<string | null> {
		const { temperature, topP, maxOutputTokens } = config || {};
		try {
			const result = await this.model.generateContent({
				contents: prompt,
				generationConfig: {
					temperature: temperature ?? 0.5,
					topP: topP ?? 0.9,
					maxOutputTokens: maxOutputTokens ?? 150,
				},
			});

			return result.response.text();
		} catch (error) {
			debugLog("Gemini API Error:", error);
			return null;
		}
	}
}
