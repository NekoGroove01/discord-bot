// llm_client.ts - Gemini API를 사용하여 캐릭터 응답 생성하기
import * as dotenv from "dotenv";
import { logError } from "../logger.js";
import {
	systemPrompt,
	prefillPrompt,
	memoryPrompt,
	algorithmPrompt,
	finalFilledPrompt,
} from "./prompt.js";
import { CharInfo, Prompt, TimeInfo } from "../types.js";
import { GeminiModel, GeminiService } from "./geminiService.js";
import {
	BasicHelpInstruction,
	farewellInstruction,
	helpPrompt,
} from "./instruction.js";

dotenv.config();

interface GenerateCharacterResponseOptions {
	conversations: Prompt[];
	charInfo: CharInfo;
	additionalPrompt?: Prompt[];
	currentTimeInfo: TimeInfo;
}

async function generateCharacterResponse(
	options: GenerateCharacterResponseOptions
): Promise<string | null> {
	try {
		const { conversations, charInfo, additionalPrompt, currentTimeInfo } =
			options;
		const { name, description, exampleConversation } = charInfo;
		// Add time context to your prompt
		const timeContext = currentTimeInfo
			? `Current time is ${currentTimeInfo.hour}:${
					currentTimeInfo.minute
			  }, it is ${currentTimeInfo.isDay ? "daytime" : "nighttime"}.`
			: "";

		const geminiService = new GeminiService(process.env.GEMINI_API_KEY!);

		const response = await geminiService.generateResponse([
			{
				role: "user",
				parts: [
					{
						text: `${systemPrompt} (${name})\n${description}\n\n###Example Speech Patterns/Styles of ${name} (NPC)\n${exampleConversation}`,
					},
				],
			},
			{
				role: "user",
				parts: [{ text: `${memoryPrompt}\n` }],
			},
			...(conversations.length > 0 ? conversations : []),
			{
				role: "user",
				parts: [
					{
						text: `## Time Information\n${timeContext}\n\n${algorithmPrompt}`,
					},
				],
			},
			...(additionalPrompt ?? []),
			{
				role: "user",
				parts: [{ text: finalFilledPrompt }],
			},
			{
				role: "model",
				parts: [{ text: `${prefillPrompt} ${name} (NPC):` }],
			},
		]);

		return response;
	} catch (error) {
		logError({
			error: error as Error,
			context: "Gemini Character Response Generation",
			metadata: {
				characterName: options.charInfo.name,
				conversationLength: options.conversations.length,
				hasAdditionalPrompt: !!options.additionalPrompt,
			},
		});
		if (error instanceof Error) {
			throw new Error(`Gemini API 오류: ${error.message}`);
		}
		return null;
	}
}

async function analyzeMessageCompletion(messages: string[]): Promise<number> {
	const latestMessages = messages.join("\n");

	const prompt = `
    다음 주어지는 텍스트는 사용자의 채팅 내역입니다. 내역을 분석하여 응답을 해야 할지 결정하는 점수를 반환하세요.
	각 줄은 사용자의 개별 입력이며, 사용자가 여러 줄에 걸쳐 모두 입력했을 가능성을 0에서 100 사이의 점수로 제공하세요. 50점 이상이면, 응답을 생성합니다.

	**분석할 메시지:**
	"${latestMessages}"

	**응답 형식:** 점수만 숫자(0-100)로 제공하세요. 추가적인 설명이나 코멘트는 포함하지 마세요.
    `;

	try {
		const geminiService = new GeminiService(
			process.env.GEMINI_API_KEY!,
			GeminiModel.Flash
		);
		const response = await geminiService.generateResponse(
			[
				{
					role: "user",
					parts: [{ text: prompt }],
				},
			],
			{
				temperature: 0.5,
				topP: 1.0,
				maxOutputTokens: 3,
			}
		);
		const score = parseInt(response ?? "0");
		return Math.min(100, Math.max(0, score));
	} catch (error) {
		logError({
			error: error as Error,
			context: "Gemini Message Completion Analysis",
			metadata: {
				messages: latestMessages,
			},
		});
		return 0;
	}
}

async function generateHelpResponse(charInfo: CharInfo): Promise<string> {
	const geminiService = new GeminiService(
		process.env.GEMINI_API_KEY!,
		GeminiModel.Flash // Use Flash model for faster response
	);

	try {
		const { name, description, exampleConversation } = charInfo;
		const response = await geminiService.generateResponse(
			[
				{
					role: "user",
					parts: [
						{
							// Generate help instruction
							// {{Char}} - Character name
							// {{Base}} - Basic information
							// {{Conversation}} - Example conversation
							// {{Text}} - Help prompt
							text: BasicHelpInstruction.replace("{{Char}}", name)
								.replace("{{Base}}", description)
								.replace("{{Conversation}}", exampleConversation ?? "")
								.replace("{{Text}}", helpPrompt.replace("{{char}}", name)),
						},
					],
				},
			],
			{
				temperature: 1.0,
				topP: 0.9,
				maxOutputTokens: 1000, // Increase max tokens to allow for longer responses
			}
		);

		if (!response) {
			throw new Error("도움말 생성에 실패했습니다.");
		}
		return response;
	} catch (error) {
		logError({
			error: error as Error,
			context: "Gemini Help Response Generation",
			metadata: {
				CharacterName: charInfo.name,
				CharacterDescription: charInfo.description,
				ExampleConversation: charInfo.exampleConversation,
			},
		});
		return helpPrompt;
	}
}

async function generateFarewellResponse(charInfo: CharInfo): Promise<string> {
	const geminiService = new GeminiService(
		process.env.GEMINI_API_KEY!,
		GeminiModel.Flash // Use Flash model for faster response
	);

	try {
		const { name, description, exampleConversation } = charInfo;
		const response = await geminiService.generateResponse([
			{
				role: "user",
				parts: [
					{
						// Generate help instruction
						// {{Char}} - Character name
						// {{Base}} - Basic information
						// {{Conversation}} - Example conversation
						// {{Text}} - Help prompt
						text: farewellInstruction
							.replace("{{Char}}", name)
							.replace("{{Base}}", description)
							.replace("{{Conversation}}", exampleConversation ?? ""),
					},
				],
			},
		]);

		if (!response) {
			throw new Error("퇴장 응답 생성에 실패했습니다.");
		}
		return response;
	} catch (error) {
		logError({
			error: error as Error,
			context: "Gemini Farewell Response Generation",
			metadata: {
				CharacterName: charInfo.name,
				CharacterDescription: charInfo.description,
				ExampleConversation: charInfo.exampleConversation,
			},
		});
		return "대화에서 나갑니다다!";
	}
}

export {
	analyzeMessageCompletion,
	generateCharacterResponse,
	generateHelpResponse,
	generateFarewellResponse,
};
