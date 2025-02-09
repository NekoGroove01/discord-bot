/*
이 파일은 사용자 메시지를 캐릭터 응답으로 변환하는 핵심 처리 로직을 포함합니다.
주요 역할:
1. 메시지 버퍼에서 대화 기록을 업데이트
2. Gemini API를 호출해 응답 생성
3. 응답을 자연스럽게 분할하여 전송 및 버퍼 업데이트
*/

import { CharInfo, Prompt } from "../types.js";
import {
	calculateDynamicTypingDuration,
	cleanBotResponse,
	debugLog,
	splitIntoNaturalLines,
} from "../utils.js";
import { generateCharacterResponse } from "../ai/geminiClient.js";
import { Client } from "discord.js";
import ChatHistoryManager, { SetBufferFlags } from "../chatHistoryManager.js";

interface ClientInfo {
	client: Client;
	userId: string;
	channelId: string;
}

interface ProcessOptions {
	chatHistoryManager: ChatHistoryManager;
	clientInfo: ClientInfo;
	prompt: Prompt[];
	charInfo: CharInfo;
}

export async function processUserMessagesToCharacter(
	options: ProcessOptions
): Promise<void> {
	const { chatHistoryManager, clientInfo, prompt, charInfo } = options;
	const { client, userId, channelId } = clientInfo;

	const buffer = chatHistoryManager.getBuffer(userId);
	try {
		if (!buffer || buffer.messages.length === 0 || buffer.isProcessing) {
			debugLog("버퍼 없거나 처리 중:", { buffer, userId });
			return;
		}

		buffer.isProcessing = true;
		const currentMessages = [...buffer.messages];
		buffer.messages = []; // 버퍼 초기화

		debugLog("메시지 처리 시작", { messages: currentMessages });

		const channel = await client.channels.fetch(channelId);
		if (!channel?.isTextBased() || !("send" in channel)) {
			debugLog("유효하지 않은 채널:", channelId);
			return;
		}

		chatHistoryManager.setBuffer(userId, buffer); // 대화 이력 업데이트

		// 대화 이력이 없으면 처리하지 않음
		if (buffer.conversation.length === 0) {
			throw new Error("Conversation is empty.");
		}

		debugLog("API 호출 시작", {
			conversation: buffer.conversation.map((item) => ({
				role: item.role,
				text: item.parts[0].text,
			})),
		});
		// 현재 시간 정보를 추가하여 응답 생성
		const currentTime = new Date();
		const currentTimeInfo = {
			hour: currentTime.getHours(),
			minute: currentTime.getMinutes(),
			isDay: currentTime.getHours() >= 6 && currentTime.getHours() < 18,
		};
		const response = await generateCharacterResponse({
			conversations: prompt,
			charInfo,
			additionalPrompt: buffer.conversation,
			currentTimeInfo,
		});
		if (!response) {
			debugLog("API 응답 없음");
			await channel.send("미안. 응답 생성에 문제가 생겼어.");
			buffer.isProcessing = false;
			return;
		}

		const cleanedResponse = cleanBotResponse(response);
		debugLog("API 응답 수신", { response: cleanedResponse });

		// 응답을 메세지 버퍼에 넣기
		chatHistoryManager.addBotResponse(userId, cleanedResponse);

		// 응답을 자연스럽게 분할하여 전송
		const responseLines = splitIntoNaturalLines(cleanedResponse);

		// 각 줄을 개별 전송 (타이핑 효과 적용)
		for (const line of responseLines) {
			const typingDuration = calculateDynamicTypingDuration(line);
			await channel.sendTyping();
			await new Promise((resolve) => setTimeout(resolve, typingDuration));
			await channel.send(line);
		}

		debugLog("메시지 처리 완료");
	} catch (error) {
		console.error("processUserMessagesToCharacter 오류:", error);

		const channel = await client.channels.fetch(channelId);
		if (channel?.isTextBased() && "send" in channel) {
			await channel.send("Error: 메시지 처리 중 오류가 발생했습니다.");
		}
	} finally {
		chatHistoryManager.setBufferFlags(userId, SetBufferFlags.EndProcessing);
	}
}
