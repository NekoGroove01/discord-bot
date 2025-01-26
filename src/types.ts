// bot_types.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

interface Command {
	data: SlashCommandBuilder;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

interface MessageBuffer {
	messages: string[]; // 현재 처리 대기중인 메시지들
	conversation: { role: "user" | "assistant"; content: string }[]; // 대화 히스토리
	isProcessing: boolean; // 현재 메시지 처리 중인지 여부
	lastBotResponse: Date; // 마지막 봇 응답 시간
	lastUserInteraction: Date; // 마지막 사용자 상호작용 시간
}

interface TypingConfig {
	baseDelay: number;
	charDelay: number;
	maxDelay: number;
	complexityMultiplier: number;
}

export { Command, MessageBuffer, TypingConfig };
