// types.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export interface Command {
	data: SlashCommandBuilder;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface Conversation {
	role: "user" | "model";
	parts: { text: string }[];
}

export interface MessageBuffer {
	messages: string[]; // 현재 처리 대기중인 메시지들
	conversation: Conversation[]; // 대화 히스토리
	isProcessing: boolean; // 현재 메시지 처리 중인지 여부
}

export interface AIResponse {
	content: string;
	metadata?: {
		modelName: string;
		completionTokens?: number;
		totalTokens?: number;
	};
}

export interface AIRequestConfig {
	temperature?: number;
	topP?: number;
	maxTokens?: number;
	presencePenalty?: number;
	frequencyPenalty?: number;
}

export interface Message {
	role: "user" | "model";
	content: string;
}

export interface Prompt {
	role: "user" | "model";
	parts: { text: string }[];
}

export interface CharInfo {
	name: string;
	description: string;
	exampleConversation?: string;
}

export interface TimeInfo {
	hour: number;
	minute: number;
	isDay: boolean;
}
