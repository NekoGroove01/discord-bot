/*
이 파일은 캐릭터 봇 클라이언트를 생성하는 팩토리 함수입니다.
단일 책임 원칙에 따라 이벤트 핸들러를 개별 함수로 분리했습니다.
*/

import {
	Client,
	Events,
	GatewayIntentBits,
	Message,
	Interaction,
	ChannelType,
	Partials,
} from "discord.js";
import { logCommand, logDebug, logError } from "../logger.js";
import { MessageBuffer, Prompt } from "../types.js";
import { botStateManager, getBotState } from "../state/botStateManager.js";
import botQueue from "../state/botQueue.js";
import { processUserMessagesToCharacter } from "./process.js";
import {
	analyzeMessageCompletion,
	generateFarewellResponse,
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
			GatewayIntentBits.DirectMessages, // DM 수신용
			GatewayIntentBits.DirectMessageTyping, // DM 타이핑 표시용
		],
		partials: [Partials.Channel],
	});

	// 상태 및 메시지 버퍼 초기화
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
			logError({
				error: error as Error,
				context: "Error in MessageCreate Event Handler",
				metadata: {
					message,
				},
			});
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
		logError({
			error,
			context: "Unknown Discord Client Error",
		});
	});
	process.on("unhandledRejection", (error) =>
		logError({
			error: error as Error,
			context: "Unhandled Promise Rejection from Discord Client",
		})
	);

	// 클라이언트 준비 시
	client.once(Events.ClientReady, () => {
		logDebug(`${name} 준비 완료!`, {
			clientId: client.user?.id,
			clientUsername: client.user?.username,
		});
	});

	///////////////////////////
	// 내부 핸들러 함수들
	///////////////////////////

	/**
	 * handleMessage
	 * -> 봇 메시지와 사용자 메시지를 구분하여 각각 처리합니다.
	 * @param message Message
	 * @returns void
	 */
	async function handleMessage(message: Message): Promise<void> {
		const botState = botStateManager.getBotState(client);

		// 봇이 보낸 메시지인 경우 무시
		if (message.author.bot) return;

		const userId = message.author.id;
		const nickname = message.member?.nickname ?? message.author.username;

		let buffer = chatHistoryManager.getBuffer(userId);
		if (buffer?.isProcessing) return;

		// DM 체크
		const isDM = message.channel.type === ChannelType.DM;
		if (isDM) {
			// DM 채널인 경우, 큐와 상관없이 메세지 처리
			if (!buffer) {
				buffer = chatHistoryManager.createBuffer(message.author.id);
			}

			// 메시지 버퍼에 사용자 메시지 추가
			chatHistoryManager.addUserMessage(userId, message.content, nickname);

			await handleDirectMessage(buffer, message, message.author.id);
			return;
		}

		// 봇이 보낸 메시지인 경우 무시 - 이건 뭐지?
		// if (message.author.id === client.user?.id) {
		// 	botQueue.removeBot(client);
		// 	botState.setJoinedState(false);
		// }

		// DM이 아닌 경우 무시
		if (!botState.getJoinedState()) return;

		logDebug("메시지 수신: ", message.content);

		chatHistoryManager.addUserMessage(userId, message.content, nickname);

		if (!buffer || buffer.conversation.length === 0) {
			buffer = chatHistoryManager.createBuffer(userId);
		}

		await handleUserMessage(buffer, message, userId);
	}

	/**
	 * handleUserMessage
	 * → 사용자의 메시지를 버퍼에 추가한 후, API 호출 조건에 맞으면 응답 처리합니다.
	 * @param buffer MessageBuffer
	 * @param message Message
	 * @param userId string
	 */

	// FIXME: 쿨다운 타이머 관련 코드 추가
	const cooldownTimers = new Map<string, NodeJS.Timeout>();

	async function handleUserMessage(
		buffer: MessageBuffer,
		message: Message,
		userId: string
	): Promise<void> {
		// 버퍼에 메시지를 추가
		chatHistoryManager.addUserMessage(
			userId,
			message.content,
			message.author.username
		);

		// 버퍼 상태 디버그
		logDebug("메시지 버퍼 상태:", {
			userId,
			messageCount: buffer.messages.length,
			messages: buffer.messages,
		});

		// 마지막 메시지 확인
		const lastMessage = buffer.messages[buffer.messages.length - 1] ?? "";

		// 1) 마지막 메시지가 '.'이면 → 분석 없이 곧바로 응답 생성
		if (lastMessage.trimEnd().endsWith(".")) {
			console.log("'.'으로 끝나는 메시지 → 분석 없이 바로 응답합니다.");
			await handleUserMessage(buffer, message, userId);
			return;
		}

		// 2) 현재 쿨다운 상태인지 확인
		if (cooldownTimers.has(userId)) {
			// 쿨다운 적용 중이면 새 메시지는 버퍼에만 쌓고, 분석은 진행 안 함
			console.log(
				"쿨다운 중이므로 메시지만 버퍼에 추가하고 분석은 건너뜁니다."
			);
			return;
		}

		// 3) 점수 분석
		const analysis = await analyzeMessageCompletion(buffer.messages);
		logDebug("대화 분석 점수:", analysis);

		// 4) 분석 점수가 50 미만이면 → 쿨다운 시작
		if (analysis < 50) {
			console.log("응답 필요 점수(50) 미만 → 1.5초 쿨다운 진입");
			const timer = setTimeout(async () => {
				// 쿨다운 종료 시점에 다시 분석 수행
				cooldownTimers.delete(userId); // 쿨다운 해제

				// 쿨다운 중에 새로 들어온 메시지 포함해서 다시 점수 재분석
				const finalAnalysis = await analyzeMessageCompletion(buffer.messages);
				console.log("쿨다운 종료 후 재분석 점수:", finalAnalysis);

				// 점수 50 이상이면 그제서야 응답 생성
				if (finalAnalysis >= 50) {
					await handleUserMessage(buffer, message, userId);
				} else {
					console.log("재분석 점수 여전히 50 미만 → 응답하지 않음");
				}
			}, 1500);

			// userId별로 쿨다운 타이머를 등록
			cooldownTimers.set(userId, timer);
		} else {
			// 5) 점수가 50 이상이면 즉시 응답 생성
			await handleUserMessage(buffer, message, userId);
		}
	}

	/**
	 * handleDirectMessage
	 * -> DM 채널에서 사용자 메시지를 처리합니다.
	 * -> 이때 봇 큐를 사용하지 않으므로 별도로 처리합니다.
	 * @param buffer MessageBuffer
	 * @param message Message
	 * @param userId string
	 * @returns void
	 */

	async function handleDirectMessage(
		buffer: MessageBuffer,
		message: Message,
		userId: string
	): Promise<void> {
		logDebug("DM 메시지 수신: ", message.content);

		// 메시지 완성도 평가 (Gemini API 호출 전 조건 판별)
		const analysis: number = await analyzeMessageCompletion(buffer.messages);
		logDebug("대화 분석 점수:", analysis);
		// 마지막 메시지가 "."이면 응답 무조건 호출 OR 점수가 50 이상이면 응답 호출
		const lastMessage = buffer.messages[buffer.messages.length - 1] || "";
		if (!lastMessage.trimEnd().endsWith(".") && analysis < 50) {
			console.log("응답 불필요");
			return;
		}

		// 대화 버퍼 초기화
		const currentBuffer = chatHistoryManager.getBuffer(userId);
		if (!currentBuffer?.messages?.length) {
			return;
		}

		await processUserMessagesToCharacter({
			chatHistoryManager,
			clientInfo: {
				client,
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
		const botState = botStateManager.getBotState(client);

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

			// 작별 인사 생성 (대화 상대에게 reply)
			const response = await generateFarewellResponse({
				name,
				description,
				exampleConversation,
			});
			await message.reply(response);
		} else {
			// 그냥 응답하기
			await handleMessage(message);
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
				logCommand({
					userId: interaction.user.id,
					username: interaction.user.username,
					command: "ping",
				});
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

	//////////////////////////
	// 상시 실행 코드 (타임아웃 체크)
	//////////////////////////
	setInterval(() => {
		const botState = getBotState(client);
		if (botState.hasTimedOut() && botState.getJoinedState()) {
			botState.setJoinedState(false);
			botQueue.removeBot(client);
			// Remove chat history
			if (client.user?.id) {
				chatHistoryManager.resetBuffer(client.user?.id);
			}
			logDebug("Bot timed out and removed from queue", client.user?.username);
		}
	}, 60000); // Check every minute

	return client;
}

export default generateBotClient;
