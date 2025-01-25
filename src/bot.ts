// asuna/bot.ts

import {
	Client,
	Events,
	GatewayIntentBits,
	Message,
	TextChannel,
} from "discord.js";
import * as dotenv from "dotenv";
import { debugLog, loadChatHistory } from "./utils.js";
import { MessageBuffer } from "./bot_types.js";
import { analyzeMessageCompletion } from "./openai.js";
import { processUserMessagesToCharacter } from "./process.js";

/*
환경 변수들 정의
*/

// 환경 변수 로드
dotenv.config();

function generateBotClient(
	characterName: string,
	channelId: string,
	prompt: { role: "system" | "assistant" | "user"; content: string }[],
	typingConfig: {
		baseDelay: number;
		charDelay: number;
		maxDelay: number;
		complexityMultiplier: number;
	}
): Client {
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});

	const userMessageBuffer = new Map<string, MessageBuffer>();

	client.on(Events.MessageCreate, async (message: Message) => {
		try {
			if (message.author.bot) return;

			if (!message.channelId.includes(channelId)) {
				return;
			}

			debugLog("Received message:", message.content);

			const userId = message.author.id;

			// 사용자 메시지 버퍼 로드
			let buffer = await loadChatHistory(
				userMessageBuffer,
				client,
				message.channel as TextChannel,
				userId
			);

			if (message.createdAt > buffer.lastBotResponse) {
				// 메시지 추가
				buffer.messages.push(message.content);
				userMessageBuffer.set(userId, buffer); // 버퍼 즉시 업데이트

				debugLog("메시지 버퍼 상태:", {
					userId,
					messageCount: buffer.messages.length,
					messages: buffer.messages,
				});

				// 메시지 완료도 분석
				const analysis: number = await analyzeMessageCompletion(
					buffer.messages
				);
				debugLog("대화를 이어나갈 메세지 분석 점수:", analysis);

				if (analysis >= 70) {
					const currentBuffer = userMessageBuffer.get(userId);
					if (currentBuffer && currentBuffer.messages.length > 0) {
						await processUserMessagesToCharacter(
							userMessageBuffer,
							client,
							userId,
							message.channel.id,
							prompt,
							typingConfig
						);
					}
				}
			}
		} catch (error) {
			debugLog("Error processing message:", error);
			if (message.channel.isTextBased() && "send" in message.channel) {
				await message.channel.send("미안, 메시지 처리 중 오류가 발생했어.");
			}
		}
	});

	client.on("error", (error) => {
		debugLog("Discord 클라이언트 에러:", error);
	});

	process.on("unhandledRejection", (error) => {
		debugLog("Unhandled promise rejection:", error);
	});

	client.once(Events.ClientReady, (_) => {
		debugLog(`${characterName} 준비 완료!`);
	});

	return client;
}

export default generateBotClient;
