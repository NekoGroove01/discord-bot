// utils.ts
import { Client, NewsChannel, TextChannel } from "discord.js";
import { MessageBuffer, TypingConfig } from "./bot_types";

/*
메세지 관련 함수들
*/

/// OPENAI API에서 받은 응답을 자연스러운 라인으로 분리 - 메시지 전송에 사용
function splitIntoNaturalLines(response: string): string[] {
	return response
		.split(/(?<=[.!?])\s+/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/// 동적 타이핑 시간 계산을 위해 사용
function calculateDynamicTypingDuration(
	message: string,
	config: TypingConfig
): number {
	// 메시지 복잡도 계산
	const complexity = calculateMessageComplexity(message);

	// 기본 타이핑 시간 계산
	const baseTime = config.baseDelay;
	const charTime = message.length * config.charDelay;
	const complexityTime = complexity * config.complexityMultiplier;

	// 최종 타이핑 시간 계산
	return Math.min(baseTime + charTime + complexityTime, config.maxDelay);
}

/// 메시지 복잡도 계산 - 동적 타이핑 시간 계산에 사용
function calculateMessageComplexity(message: string): number {
	// 복잡도 요소들
	const hasCode = /```[\s\S]*?```/.test(message);
	const hasUrls = /https?:\/\/[^\s]+/.test(message);
	const specialChars = (message.match(/[^a-zA-Z0-9\s]/g) || []).length;
	const wordCount = message.split(/\s+/).length;

	let complexity = 1;
	if (hasCode) complexity *= 1.5;
	if (hasUrls) complexity *= 1.2;
	complexity += (specialChars / message.length) * 0.5;
	complexity += (wordCount / 10) * 0.3;

	return complexity;
}

/// 과거 채팅 히스토리 로드 - 사용자가 채팅을 시작할 때 - 메세지 처리에서 사용됨
async function loadChatHistory(
	userMessageBuffer: Map<string, MessageBuffer>,
	client: Client,
	channel: TextChannel | NewsChannel,
	userId: string,
	limits: number = 100
): Promise<MessageBuffer> {
	try {
		const messages = await channel.messages.fetch({ limit: limits });
		let buffer = userMessageBuffer.get(userId);
		if (!buffer) {
			debugLog("사용자 버퍼를 찾을 수 없습니다. 새로 생성합니다.");
			buffer = createNewBuffer(userMessageBuffer, userId);
		}

		// 시간순으로 정렬 (오래된 메시지부터)
		const sortedMessages = Array.from(messages.values()).reverse();

		for (const msg of sortedMessages) {
			if (msg.author.bot && msg.author.id === client.user?.id) {
				// 봇 메시지
				buffer.conversation.push({
					role: "assistant",
					content: msg.content,
				});
			} else if (!msg.author.bot) {
				// 사용자 메시지
				buffer.conversation.push({
					role: "user",
					content: msg.content,
				});
			}
		}

		userMessageBuffer.set(userId, buffer);
		return buffer;
	} catch (error) {
		debugLog("채팅 히스토리 로드 오류:", error);
		return createNewBuffer(userMessageBuffer, userId);
	}
}

function cleanBotResponse(response: string): string {
	// ##Approved로 시작하는 첫 줄 제거
	const lines = response.split("\n");
	if (lines[0]?.trim().startsWith("##Approved")) {
		lines.shift();
		// 첫 줄 제거 후 빈 줄이 있다면 그것도 제거
		while (lines.length > 0 && lines[0].trim() === "") {
			lines.shift();
		}
	}
	return lines.join("\n");
}

/*
버퍼 관련 함수들
*/

function refreshBuffer(buffer: MessageBuffer): void {
	buffer.messages = [];
	buffer.conversation = [];
	buffer.isProcessing = false;
	buffer.lastBotResponse = new Date();
}

function createNewBuffer(
	userMessageBuffer: Map<string, MessageBuffer>,
	userId: string
): MessageBuffer {
	userMessageBuffer.set(userId, {
		messages: [],
		conversation: [],
		isProcessing: false,
		lastBotResponse: new Date(0),
		lastUserInteraction: new Date(),
	});
	return userMessageBuffer.get(userId) as MessageBuffer;
}

/* 
디버깅 로그 함수 
*/

function debugLog(message: string, data?: any) {
	const timestamp = new Date().toISOString();
	console.log(`${timestamp} - ${message}`);
	if (data) console.log(data);
}

export {
	splitIntoNaturalLines,
	calculateDynamicTypingDuration,
	loadChatHistory,
	cleanBotResponse,
	refreshBuffer,
	createNewBuffer,
	debugLog,
};
