// llm_client.ts - Gemini API를 사용하여 캐릭터 응답 생성하기
import * as dotenv from "dotenv";
import { debugLog } from "./utils.js";
import { systemPrompt, prefillPrompt } from "./prompt.js";
import { Prompt } from "./types.js";
import { GeminiService } from "./ai/gemini_service.js";

dotenv.config();

interface CharInfo {
	charName: string;
	charPrompt: string;
	exampleConversation?: string;
}

async function generateCharacterResponse(
	conversations: Prompt[],
	charInfo: CharInfo,
	prompt: Prompt[] = []
): Promise<string | null> {
	try {
		const { charName, charPrompt, exampleConversation } = charInfo;
		const geminiService = new GeminiService(process.env.GEMINI_API_KEY!);

		// Ensure prompt and conversations are not empty
		if (!charPrompt || charPrompt.trim() === "") {
			throw new Error("Character prompt is empty.");
		}
		if (conversations.length === 0) {
			throw new Error("Conversations are empty.");
		}

		const response = await geminiService.generateResponse([
			{
				role: "user",
				parts: [
					{
						text:
							systemPrompt +
							`\n### ${charName} (NPC/Narrator)\n\n${charPrompt}\n\n### Example Conversation\nAct as a roleplaying character who responds in a way that vividly mimics the tone, speech patterns, and personality of the character. Reference the provided dialogue or conversation to accurately replicate the character's unique mannerisms and style of speaking. Your responses should feel natural and immersive, as if the character themselves is speaking. Avoid deviating from the character's established traits or tone.\n\n**Provided dialogue of conversation:\n${exampleConversation}`,
					},
				],
			},
			...prompt,
			...conversations,
			{
				role: "model",
				parts: [{ text: prefillPrompt }],
			},
		]);

		return response;
	} catch (error) {
		debugLog("Error in llm_client.ts:", error);
		if (error instanceof Error) {
			throw new Error(`Gemini API 오류: ${error.message}`);
		}
		return null;
	}
}

async function analyzeMessageCompletion(messages: string[]): Promise<number> {
	const latestMessages = messages.join("\n");

	const prompt = `
    다음 메시지들이 문장의 끝을 나타내는지 판단하세요. 
	메세지는 사용자가 여러 줄을 입력받는다고 가정합니다. 사용자가 여러 줄에 걸쳐 문장을 모두 입력했을 가능성을 0에서 100 사이의 점수로 제공하세요.

	**점수 기준:**  
	- **0-24:** 문장이 더 이어질 가능성이 높음.
	- **25-49:** 메시지가 애매하며, 문장이 계속될지 끝날지 판단하기 어려움.
	- **50-74:** 문장이 끝날 가능성이 높지만 확실하지는 않음.
	- **75-100:** 메시지가 문장의 끝을 강하게 나타냄.

	**분석할 메시지:**
	"${latestMessages}"

	**응답 형식:** 점수만 숫자(0-100)로 제공하세요. 추가적인 설명이나 코멘트는 포함하지 마세요.
    `;

	try {
		const geminiService = new GeminiService(process.env.GEMINI_API_KEY!);
		const response = await geminiService.generateResponse([
			{
				role: "user",
				parts: [{ text: prompt }],
			},
		]);
		const score = parseInt(response ?? "0");
		return Math.min(100, Math.max(0, score));
	} catch (error) {
		console.error("Message analysis error:", error);
		return 0;
	}
}

export { analyzeMessageCompletion, generateCharacterResponse };
