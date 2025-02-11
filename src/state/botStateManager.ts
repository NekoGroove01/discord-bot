// state/botStateManager.ts
import { Client } from "discord.js";
import BotState from "./botState.js";
import { debugLog } from "../utils.js";

class BotStateManager {
	private readonly states: Map<string, BotState> = new Map();

	getBotState(client: Client): BotState {
		if (!client.user) {
			throw new Error("Client user is not initialized");
		}

		let state = this.states.get(client.user.id);
		if (!state) {
			state = new BotState();
			this.states.set(client.user.id, state);
			debugLog("New bot state created", { botId: client.user.id });
		}
		return state;
	}

	removeBotState(client: Client): void {
		if (client.user) {
			this.states.delete(client.user.id);
			debugLog("Bot state removed", { botId: client.user.id });
		}
	}
}

// 싱글톤 인스턴스 생성
export const botStateManager = new BotStateManager();

// 유틸리티 함수로 내보내기
export function getBotState(client: Client): BotState {
	return botStateManager.getBotState(client);
}
