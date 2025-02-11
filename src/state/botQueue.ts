// state/bot_queue.ts
import { Client } from "discord.js";
import { debugLog } from "../utils";
import { getBotState } from "./botStateManager";

class BotQueue {
	private readonly queue: { bot: Client; priority: number }[] = [];
	private readonly timeoutCheckInterval = 1000 * 60; // Check every minute

	constructor() {
		// Start timeout checker
		setInterval(() => this.checkTimeouts(), this.timeoutCheckInterval);
	}

	addBot(bot: Client, priority: number): void {
		this.queue.push({ bot, priority });
		this.sortQueue();
		const botState = getBotState(bot);
		botState.setJoinedState(true);
		debugLog("Bot added to queue: ", {
			botId: bot.user?.id,
			queueLength: this.queue.length,
		});
	}

	getBots() {
		return this.queue.map(({ bot }) => ({ bot: bot }));
	}

	removeBot(bot: Client): void {
		const index = this.queue.findIndex((item) => item.bot === bot);
		if (index !== -1) {
			this.queue.splice(index, 1);
			const botState = getBotState(bot);
			botState.setJoinedState(false);
			debugLog("Bot removed from queue", {
				botId: bot.user?.id,
				queueLength: this.queue.length,
			});
		}
	}

	private sortQueue(): void {
		this.queue.sort((a, b) => b.priority - a.priority);
	}

	private async checkTimeouts(): Promise<void> {
		const botsToRemove: Client[] = [];

		for (const { bot } of this.queue) {
			const botState = getBotState(bot);

			if (botState.hasTimedOut()) {
				botsToRemove.push(bot);
			}
		}

		botsToRemove.forEach((bot) => this.removeBot(bot));
	}
}

export default new BotQueue();
