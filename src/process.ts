import { Client } from "discord.js";
import { MessageBuffer } from "./types.js";
import {
	calculateDynamicTypingDuration,
	cleanBotResponse,
	debugLog,
	refreshBuffer,
	splitIntoNaturalLines,
} from "./utils.js";
import { generateCharacterResponse } from "./openai.js";

// nahida/process.ts
export async function processUserMessagesToCharacter(
	userMessageBuffer: Map<string, MessageBuffer>,
	client: Client,
	userId: string,
	channelId: string,
	prompt: { role: "system" | "assistant" | "user"; content: string }[],
	typingConfig: {
		baseDelay: number;
		charDelay: number;
		maxDelay: number;
		complexityMultiplier: number;
	}
) {
	try {
		const buffer = userMessageBuffer.get(userId);
		if (!buffer || buffer.messages.length === 0 || buffer.isProcessing) {
			debugLog("버퍼가 없거나 메세지가 없음. 처리 중단:", { buffer, userId });
			return;
		}

		buffer.isProcessing = true;
		const currentMessages = [...buffer.messages]; // 현재 메시지들 복사
		buffer.messages = []; // 메시지 버퍼 비우기
		debugLog("메시지 처리 시작", { userId, messages: buffer.messages });

		const channel = await client.channels.fetch(channelId);
		if (!channel?.isTextBased() || "send" in channel === false) {
			debugLog("유효하지 않은 채널:", channelId);
			return;
		}

		const combinedMessage = currentMessages.join("\n");
		buffer.conversation.push({ role: "user", content: combinedMessage });

		// Add context about which bot is being responded to
		if (client.users.cache.get(userId)?.bot) {
			const botContext = `You are responding to ${client.users.cache.get(userId)?.username}. Keep the conversation natural and engaging.`;
			prompt.push({ role: "system", content: botContext });
		}

		debugLog("API 호출 시작", { conversation: buffer.conversation.length });
		const response = await generateCharacterResponse(
			prompt,
			buffer.conversation
		);

		if (!response) {
			debugLog("API 응답 없음");
			await channel.send("죄송합니다. 응답을 생성하는 데 문제가 발생했습니다.");
			buffer.isProcessing = false;
			return;
		}

		const cleanedResponse = cleanBotResponse(response);

		debugLog("API 응답 수신", { response });
		const responseLines = splitIntoNaturalLines(cleanedResponse);

		// 버퍼 업데이트
		buffer.isProcessing = false;
		userMessageBuffer.set(userId, buffer);

		 // Add slight random delay for more natural bot-to-bot interactions
		if (client.users.cache.get(userId)?.bot) {
			const randomDelay = Math.random() * 1000 + 500; // 0.5 to 1.5 seconds
			await new Promise(resolve => setTimeout(resolve, randomDelay));
		}

		// 각 라인 전송
		for (const line of responseLines) {
			const typingDuration = calculateDynamicTypingDuration(line, typingConfig);
			await channel.sendTyping();
			await new Promise((resolve) => setTimeout(resolve, typingDuration));
			await channel.send(line);
			buffer.conversation.push({ role: "assistant", content: line });
		}

		refreshBuffer(buffer);

		debugLog("메시지 처리 완료", { userId });
	} catch (error) {
		console.error("processUserMessages 오류:", error);
		const channel = await client.channels.fetch(channelId);
		if (channel?.isTextBased() && "send" in channel) {
			await channel.send("메시지 처리 중 오류가 발생했습니다.");
		}

		const buffer = userMessageBuffer.get(userId);
		if (buffer) {
			buffer.isProcessing = false;
			buffer.messages = []; // 에러 발생 시에도 버퍼 비우기
			userMessageBuffer.set(userId, buffer);
		}
	}
}
