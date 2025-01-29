// bot_types.ts
import {
	ChatInputCommandInteraction,
	Client,
	SlashCommandBuilder,
} from "discord.js";

interface Command {
	data: SlashCommandBuilder;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

interface MessageBuffer {
	messages: string[]; // 현재 처리 대기중인 메시지들
	conversation: { role: "user" | "model"; parts: { text: string }[] }[]; // 대화 히스토리
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

interface AIResponse {
	content: string;
	metadata?: {
		modelName: string;
		completionTokens?: number;
		totalTokens?: number;
	};
}

interface AIRequestConfig {
	temperature?: number;
	topP?: number;
	maxTokens?: number;
	presencePenalty?: number;
	frequencyPenalty?: number;
}

interface Message {
	role: "user" | "model";
	content: string;
}

interface Prompt {
	role: "user" | "model";
	parts: { text: string }[];
}

interface ClientInfo {
	client: Client;
	userId: string;
	channelId: string;
}

interface PromptInfo {
	prompt: Prompt[];
	characterPrompt: string;
	exampleConversation?: string;
}

export {
	Command,
	MessageBuffer,
	TypingConfig,
	AIResponse,
	AIRequestConfig,
	Message,
	Prompt,
	ClientInfo,
	PromptInfo,
};
