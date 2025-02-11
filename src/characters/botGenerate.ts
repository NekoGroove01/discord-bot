/*
이 파일은 캐릭터 봇 클라이언트를 생성하는 팩토리 함수입니다.
단일 책임 원칙에 따라 이벤트 핸들러를 개별 함수로 분리했습니다.
*/

import {
	Client,
	Events,
	GatewayIntentBits,
	Message,
	TextChannel,
	Interaction,
} from "discord.js";
import { debugLog } from "../utils.js";
import { MessageBuffer, Prompt } from "../types.js";
import BotState from "../state/botState.js";
import botQueue from "../state/botQueue.js";
import { processUserMessagesToCharacter } from "./process.js";
import {
	analyzeMessageCompletion,
	generateHelpResponse,
} from "../ai/geminiClient.js";
import ChatHistoryManager from "../chatHistoryManager.js";

interface BotClientConfig {
	name: string;
	description: string;
	prompt: Prompt[];
	exampleConversation?: string;
}

/**
 * generateBotClient 함수
 * → 전달된 설정값(config)을 바탕으로 Discord 봇 클라이언트를 생성하고 이벤트 핸들러를 등록합니다.
 */
function generateBotClient(config: BotClientConfig): Client {
	const { name, description, prompt, exampleConversation } = config;

	// Discord 클라이언트 생성 및 인텐트 설정
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});

	// 상태 및 메시지 버퍼 초기화
	const botState = new BotState();
	const chatHistoryManager = new ChatHistoryManager();
	let botPriority = 0;

	// 메시지 이벤트 핸들러 등록
	client.on(Events.MessageCreate, async (message: Message) => {
		try {
			if (client.user?.id && message.mentions.has(client.user?.id)) {
				await handleCommands(message);
				return;
			}
			await handleMessage(message);
		} catch (error) {
			debugLog("메시지 처리 중 오류 발생:", error);
			if (message.channel.isTextBased() && "send" in message.channel) {
				await message.channel.send("미안, 메시지 처리 중 오류가 발생했어.");
			}
		}
	});

	// 상호작용(커맨드) 이벤트 핸들러 등록
	client.on(Events.InteractionCreate, async (interaction: Interaction) => {
		if (!interaction.isCommand()) return;
		await handleInteraction(interaction);
	});

	// 에러 핸들러 등록
	client.on("error", (error) => {
		debugLog("Discord 클라이언트 에러:", error);
	});
	process.on("unhandledRejection", (error) =>
		debugLog("Unhandled promise rejection:", error)
	);

	// 클라이언트 준비 시
	client.once(Events.ClientReady, () => {
		debugLog(`${name} 준비 완료!`);
	});

	///////////////////////////
	// 내부 핸들러 함수들
	///////////////////////////

	/**
	 * handleMessage
	 * → 봇 메시지와 사용자 메시지를 구분하여 각각 처리합니다.
	 */
	async function handleMessage(message: Message): Promise<void> {
		if (!botState.getJoinedState()) return;

		debugLog("수신 메시지:", message.content);

		if (message.content.startsWith("!reset")) {
			chatHistoryManager.resetBuffer(message.author.id);
			return;
		}

		const userId = message.author.id;
		const nickname = message.member?.nickname ?? message.author.username;

		chatHistoryManager.addUserMessage(userId, message.content, nickname);

		let buffer = chatHistoryManager.getBuffer(userId);
		if (buffer?.isProcessing) return;

		if (!buffer || buffer.conversation.length === 0) {
			buffer = chatHistoryManager.createBuffer(userId);
			buffer.conversation = await chatHistoryManager.loadHistory({
				client,
				channel: message.channel as TextChannel,
				userId,
				nickname,
			});
		}

		await handleUserMessage(buffer, message, userId);
	}

	/**
	 * handleUserMessage
	 * → 사용자의 메시지를 버퍼에 추가한 후, API 호출 조건에 맞으면 응답 처리합니다.
	 */
	async function handleUserMessage(
		buffer: MessageBuffer,
		message: Message,
		userId: string
	): Promise<void> {
		debugLog("메시지 버퍼 상태:", {
			userId,
			messageCount: buffer.messages.length,
			messages: buffer.messages,
		});
		// 메시지 완성도 평가 (Gemini API 호출 전 조건 판별)
		const analysis: number = await analyzeMessageCompletion(buffer.messages);
		debugLog("대화 분석 점수:", analysis);
		// 마지막 메시지가 "."이면 응답 무조건 호출, 점수가 50 이상이면 응답 호출
		if (buffer.messages[buffer.messages.length] !== "." && analysis < 50)
			return;

		const currentBuffer = chatHistoryManager.getBuffer(userId);
		if (currentBuffer && currentBuffer.messages.length > 0) {
			const bots = botQueue.getBots();
			for (const { bot } of bots) {
				await processUserMessagesToCharacter({
					chatHistoryManager,
					clientInfo: {
						client: bot,
						userId,
						channelId: message.channel.id,
					},
					prompt,
					charInfo: {
						name,
						description,
						exampleConversation,
					},
				});
			}
		}
	}

	/**
	 * handleCommands
	 * -> slash command 외의 봇 명령어들을 처리
	 * @param message string
	 * @returns
	 */

	async function handleCommands(message: Message): Promise<void> {
		// 만약 봇이 큐에 없으면 삽입
		// 큐에 있으면 제거
		// 이외 커맨드는 추가 예정

		if (!botState.getJoinedState()) {
			// 봇이 큐에 없는 경우, 큐에 참여시키고 초기화
			botQueue.addBot(client, botPriority);
			botPriority++;
			botState.setJoinedState(true);
			chatHistoryManager.resetBuffer(message.author.id);
			// 이후 그대로 메세지 처리 (handleMessage)
			await handleMessage(message);
		} else if (
			botState.getJoinedState() &&
			message.cleanContent.includes("나가")
		) {
			// 봇을 큐에서 제거하고 초기화
			botQueue.removeBot(client);
			botState.setJoinedState(false);
			// 대화 히스토리 초기화
			chatHistoryManager.resetBuffer(message.author.id);
		}
	}

	/**
	 * handleInteraction
	 * → /ping, /join, /leave 등 명령어 처리
	 * @param interaction Interaction
	 * @returns
	 */
	async function handleInteraction(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return;
		const { commandName } = interaction;
		switch (commandName) {
			case "ping":
				await interaction.reply("pong!");
				break;
			case "help":
				await interaction.deferReply();
				{
					const reply = await generateHelpResponse({
						name,
						description,
						exampleConversation,
					});
					console.log("봇 응답: ", reply);
					await interaction.editReply(reply);
				}
				break;
			default:
				break;
		}
	}

	return client;
}

export default generateBotClient;
