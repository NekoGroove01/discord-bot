// services/ai/GeminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logError } from "../logger";
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

	async generateResponse(
		prompt: Prompt[],
		config?: GeminiServiceConfig
	): Promise<string | null> {
		const generationConfig = config ?? {
			temperature: 1.0,
			topP: 0.9,
			maxOutputTokens: 200,
		};
		try {
			const result = await this.model.generateContent({
				contents: prompt,
				generationConfig,
			});

			return result.response.text();
		} catch (error) {
			logError({
				error: error as Error,
				context: "Gemini API Call",
				metadata: {
					prompt,
				},
			});
			return null;
		}
	}
}
