import { ClientInfo, MessageBuffer, PromptInfo } from "./types.js";
import {
	calculateDynamicTypingDuration,
	cleanBotResponse,
	debugLog,
	refreshBuffer,
	splitIntoNaturalLines,
} from "./utils.js";
import { generateCharacterResponse } from "./llm_client.js";

// nahida/process.ts
export async function processUserMessagesToCharacter(
	userMessageBuffer: Map<string, MessageBuffer>,
	clientInfo: ClientInfo,
	promptInfo: PromptInfo,
	charName: string,
	typingConfig: {
		baseDelay: number;
		charDelay: number;
		maxDelay: number;
		complexityMultiplier: number;
	} = {
		baseDelay: 300,
		charDelay: 25,
		maxDelay: 2500,
		complexityMultiplier: 75,
	}
) {
	const { client, userId, channelId } = clientInfo;
	const { prompt, characterPrompt, exampleConversation } = promptInfo;
	try {
		const buffer = userMessageBuffer.get(userId);
		if (!buffer || buffer.messages.length === 0 || buffer.isProcessing) {
			debugLog("버퍼가 없거나 메세지가 없음. 처리 중단:", { buffer, userId });
			return;
		}

		buffer.isProcessing = true;
		const currentMessages = [...buffer.messages]; // 현재 메시지들 복사
		buffer.messages = []; // 메시지 버퍼 비우기
		debugLog("메세지 처리 시작", { userId, messages: currentMessages });

		const channel = await client.channels.fetch(channelId);
		if (!channel?.isTextBased() || "send" in channel === false) {
			debugLog("유효하지 않은 채널:", channelId);
			return;
		}

		const combinedMessage = currentMessages.join("\n");
		buffer.conversation.push({
			role: "user",
			parts: [{ text: combinedMessage }],
		});

		// Add context about which bot is being responded to
		if (client.users.cache.get(userId)?.bot) {
			const botContext = `You are responding to ${
				client.users.cache.get(userId)?.username
			}. Keep the conversation natural and engaging.`;
			prompt.push({ role: "user", parts: [{ text: botContext }] });
		}

		// Ensure prompt and conversations are not empty
		if (!characterPrompt || characterPrompt.trim() === "") {
			throw new Error("Character prompt is empty.");
		}
		if (buffer.conversation.length === 0) {
			throw new Error("Conversations are empty.");
		}

		debugLog("API 호출 시작", { conversation: buffer.conversation.length });
		const response = await generateCharacterResponse(buffer.conversation, {
			charName,
			charPrompt: characterPrompt,
			exampleConversation,
		});

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
			await new Promise((resolve) => setTimeout(resolve, randomDelay));
		}

		// 각 라인 전송
		for (const line of responseLines) {
			const typingDuration = calculateDynamicTypingDuration(line, typingConfig);
			await channel.sendTyping();
			await new Promise((resolve) => setTimeout(resolve, typingDuration));
			await channel.send(line);
			buffer.conversation.push({ role: "model", parts: [{ text: line }] });
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
