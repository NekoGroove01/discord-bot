// state/bot_queue.ts
import { Client } from "discord.js";

class BotQueue {
	private readonly queue: { bot: Client; priority: number }[];

	constructor() {
		this.queue = [];
	}

	addBot(bot: Client, priority: number): void {
		this.queue.push({ bot, priority });
		this.queue.sort((a, b) => b.priority - a.priority);
	}

	getBots(): { bot: Client; priority: number }[] {
		return this.queue;
	}

	removeBot(bot: Client): void {
		const index = this.queue.findIndex((item) => item.bot === bot);
		if (index !== -1) {
			this.queue.splice(index, 1);
		}
	}
}

const botQueue = new BotQueue();
export default botQueue;
