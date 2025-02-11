// state/bot_queue.ts
import { Client } from "discord.js";
import { debugLog } from "../utils";

class BotQueue {
	private readonly queue: { bot: Client; priority: number }[];
	private readonly timeoutCheckInterval = 1000 * 60; // Check every minute

	constructor() {
		this.queue = [];
	}

	addBot(bot: Client, priority: number): void {
		this.queue.push({ bot, priority });
		this.queue.sort((a, b) => b.priority - a.priority);
		debugLog("Bot added to queue", { 
            botId: bot.user?.id,
            queueLength: this.queue.length 
        });
	}

	getBots(): { bot: Client; priority: number }[] {
		return this.queue;
	}

	removeBot(bot: Client): void {
		const index = this.queue.findIndex((item) => item.bot === bot);
		if (index !== -1) {
			this.queue.splice(index, 1);
		}
		debugLog("Bot removed from queue", { 
			botId: bot.user?.id,
			queueLength: this.queue.length 
		});
	}

	private sortQueue(): void {
        this.queue.sort((a, b) => b.priority - a.priority);
    }
}

const botQueue = new BotQueue();
export default botQueue;
