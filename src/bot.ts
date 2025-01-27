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
import { MessageBuffer } from "./types.js";
import { analyzeMessageCompletion } from "./openai.js";
import { processUserMessagesToCharacter } from "./process.js";
import BotState from "./state/bot_state.js";
import botQueue from "./state/bot_queue.js";

/*
환경 변수들 정의
*/

// 환경 변수 로드
dotenv.config();

function generateBotClient(
	characterName: string,
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
			GatewayIntentBits.DirectMessagePolls,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.DirectMessageReactions,
		],
	});

	/*
	봇 관련 상태들 정의
	*/
	// 사용자 메시지 버퍼
	const userMessageBuffer = new Map<string, MessageBuffer>();
	// 봇 상태
	const botState = new BotState();
	// 다중 대화를 위한 봇 큐의 우선순위
	let botPriority = 0;

	// 메세지 받는 기능
	client.on(Events.MessageCreate, async (message: Message) => {
		try {
			await handleMessage(message);
		} catch (error) {
			debugLog("Error processing message:", error);
			if (message.channel.isTextBased() && "send" in message.channel) {
				await message.channel.send("미안, 메시지 처리 중 오류가 발생했어.");
			}
		}
	});

	async function handleMessage(message: Message) {
		if (message.author.bot) {
			await handleBotMessage(message);
			return;
		}

		if (botState.getJoinedState() === false) return;

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
			await handleUserMessage(buffer, message, userId);
		}
	}

	async function handleBotMessage(message: Message) {
		if (botState.getParticipants().has(message.author.id)) {
			const shouldRespond = Math.random() < 0.7; // 30% chance to respond
			if (shouldRespond) {
				await processUserMessagesToCharacter(
					userMessageBuffer,
					client,
					message.author.id,
					message.channel.id,
					prompt,
					typingConfig
				);
			}
		}
	}

	async function handleUserMessage(
		buffer: MessageBuffer,
		message: Message,
		userId: string
	) {
		// 메시지 추가
		buffer.messages.push(message.content);
		userMessageBuffer.set(userId, buffer); // 버퍼 즉시 업데이트

		debugLog("메시지 버퍼 상태:", {
			userId,
			messageCount: buffer.messages.length,
			messages: buffer.messages,
		});

		// 메시지 완료도 분석
		const analysis: number = await analyzeMessageCompletion(buffer.messages);
		debugLog("대화를 이어나갈 메세지 분석 점수:", analysis);

		if (analysis < 70) return;

		const currentBuffer = userMessageBuffer.get(userId);
		if (currentBuffer && currentBuffer.messages.length > 0) {
			// 봇 큐에서 봇 가져오기
			const bots = botQueue.getBots();
			// 봇을 큐의 순서대로 응답 처리
			for (const { bot } of bots) {
				await processUserMessagesToCharacter(
					userMessageBuffer,
					bot,
					userId,
					message.channel.id,
					prompt,
					typingConfig
				);
			}
		}
	}

	// 상호작용 받는 기능
	client.on("interactionCreate", async (interaction) => {
		if (!interaction.isCommand()) return;

		const { commandName } = interaction;

		switch (commandName) {
			case "ping":
				await interaction.reply("pong!");
				break;
			case "join":
				// 봇 큐에 봇 추가
				botQueue.addBot(client, botPriority);
				// 우선순위 증가
				botPriority++;
				// 봇 상태 변경
				botState.setJoinedState(true);
				await interaction.reply(`${characterName}가 대화에 참여합니다!`);
				break;
			case "leave":
				// 봇 큐에서 봇 제거
				botQueue.removeBot(client);
				// 봇 상태 변경
				botState.setJoinedState(false);
				await interaction.reply(`${characterName}가 대화에서 나갔어.`);
				break;
			default:
				break;
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
