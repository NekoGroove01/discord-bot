/*
  ChatHistoryManager 클래스는 각 사용자별 대화 기록(버퍼)을 관리합니다.
  - loadHistory: 버퍼를 불러오거나(없으면 새로 생성) 반환
  - resetBuffer: 특정 사용자의 대화 기록을 초기화 (예: /join, /leave, !reset 명령어 후)
  - addUserMessage, addBotResponse: 메시지 추가를 통해 버퍼 업데이트
*/
// 먼저 types.ts에 정의된 MessageBuffer 타입을 사용합니다.
import { Client, NewsChannel, TextChannel } from "discord.js";
import { BotEmotion, MessageBuffer, Conversation } from "./types.js";
import { filterMessagesFromCommand } from "./utils.js";

export interface ChatHistoryOptions {
	client: Client;
	channel: TextChannel | NewsChannel;
	userId: string;
	nickname: string;
	limit?: number; // 필요시, 채널 메시지 fetch 용
}

export enum SetBufferFlags {
	Processing = 1,
	EndProcessing = 2,
	ClearMessages = 3,
	ClearConversation = 4,
}

export class ChatHistoryManager {
	private readonly userBuffers: Map<string, MessageBuffer> = new Map();
	private readonly EMOTION_RESET_TIME = 1000 * 60 * 30; // 30 minutes

	/**
	 * getBuffer
	 * → 지정된 사용자의 대화 버퍼를 반환합니다.
	 */

	getBuffer(userId: string): MessageBuffer | undefined {
		return this.userBuffers.get(userId);
	}

	/**
	 * createBuffer
	 * → 새로운 사용자의 대화 버퍼를 생성합니다.
	 * (예: 사용자가 채널에 처음 입장 시 호출, 어떤 이유로 버퍼가 없을 때 호출)
	 */
	createBuffer(userId: string): MessageBuffer {
		const buffer: MessageBuffer = {
			messages: [],
			conversation: [],
			isProcessing: false,
			currentEmotion: BotEmotion.NEUTRAL,
			emotionTimestamp: new Date(),
		};
		this.userBuffers.set(userId, buffer);
		return buffer;
	}

	setBuffer(userId: string, buffer: MessageBuffer): void {
		this.userBuffers.set(userId, buffer);
	}

	setBufferFlags(userId: string, flag: SetBufferFlags): void {
		const oldBuffer = this.userBuffers.get(userId);
		if (!oldBuffer) return;

		if (flag === SetBufferFlags.Processing) {
			oldBuffer.isProcessing = true;
		} else if (flag === SetBufferFlags.EndProcessing) {
			oldBuffer.isProcessing = false;
		} else if (flag === SetBufferFlags.ClearMessages) {
			oldBuffer.messages = [];
		} else if (flag === SetBufferFlags.ClearConversation) {
			oldBuffer.conversation = [];
		}

		this.setBuffer(userId, oldBuffer);
	}

	/**
	 * resetBuffer
	 * → 지정된 사용자의 대화 버퍼를 초기화합니다.
	 * (예: /join, /leave 명령어 또는 사용자가 "!reset" 입력 시 호출)
	 */
	resetBuffer(userId: string): void {
		console.log(`User ${userId} 의 대화 히스토리를 초기화합니다.`);
		this.userBuffers.set(userId, this.createBuffer(userId));
	}

	/**
	 * loadHistory
	 * → 지정된 옵션(채널, client, userId)을 바탕으로 대화 버퍼를 불러옵니다.
	 *    버퍼가 없으면 새로 생성합니다.
	 */
	async loadHistory(options: ChatHistoryOptions): Promise<Conversation[]> {
		const { client, channel, userId, nickname, limit = 50 } = options;
		try {
			const history = await channel.messages.fetch({ limit });
			// 명령어 이전의 메시지는 필터링
			const clearedHistory = filterMessagesFromCommand(
				Array.from(history.values())
			);
			// 시간순으로 정렬 (오래된 메시지부터)
			const sortedMessages = Array.from(clearedHistory.values()).reverse();

			const conversation: Conversation[] = [];

			for (const msg of sortedMessages) {
				const timestamp = msg.createdAt;

				if (msg.author.bot && msg.author.id === client.user?.id) {
					const formattedMessage = `${
						msg.author.bot.nickname
					} | ${timestamp.toISOString()} - ${msg.content}`;
					// 봇 메시지
					conversation.push({
						role: "model",
						parts: [{ text: formattedMessage }],
					});
				} else if (!msg.author.bot) {
					const formattedMessage = `${nickname} | ${timestamp.toISOString()} - ${
						msg.content
					}`;
					// 사용자 메시지
					conversation.push({
						role: "user",
						parts: [{ text: formattedMessage }],
					});
				}
			}

			return conversation;
		} catch (error) {
			console.log(`User ${userId} 의 버퍼가 없으므로 새로 생성합니다.`);
			return [];
		}
	}

	/**
	 * addUserMessage
	 * → 대화 버퍼에 사용자 메시지를 추가합니다.
	 */
	addUserMessage(userId: string, message: string, nickname: string): void {
		let buffer = this.userBuffers.get(userId);
		if (!buffer) {
			// 버퍼가 없다면 새로 생성
			buffer = this.createBuffer(userId);
			this.userBuffers.set(userId, buffer);
		}

		const timestamp = new Date();
		const formattedMessage = `${nickname} | ${timestamp.toISOString()} - ${message}`;

		buffer.messages.push(message);
		buffer.conversation.push({
			role: "user",
			parts: [{ text: formattedMessage }],
		});
	}

	/**
	 * addBotResponse
	 * → 대화 버퍼에 봇의 응답 메시지를 추가합니다.
	 */
	addBotResponse(userId: string, response: string): void {
		let buffer = this.userBuffers.get(userId);
		if (!buffer) {
			// 버퍼가 없다면 새로 생성
			buffer = this.createBuffer(userId);
			this.userBuffers.set(userId, buffer);
		}

		buffer.conversation.push({
			role: "model",
			parts: [{ text: response }],
		});

		// Check and reset emotion if needed
		this.checkAndResetEmotion(buffer);
	}

	setEmotion(userId: string, emotion: BotEmotion): void {
		const buffer = this.userBuffers.get(userId);
		if (buffer) {
			buffer.currentEmotion = emotion;
			buffer.emotionTimestamp = new Date();
		}
	}

	private checkAndResetEmotion(buffer: MessageBuffer): void {
		const now = new Date();
		if (
			buffer.emotionTimestamp &&
			now.getTime() - buffer.emotionTimestamp.getTime() >
				this.EMOTION_RESET_TIME
		) {
			buffer.currentEmotion = BotEmotion.NEUTRAL;
			buffer.emotionTimestamp = now;
		}
	}
}

export default ChatHistoryManager;
