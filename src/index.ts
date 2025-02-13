/*
앱 시작점: 모든 봇을 초기화하고 종료 이벤트 처리
환경 변수는 앱 시작 시 한 번 로드합니다.
*/

import * as dotenv from "dotenv";
import nahidaClient from "./characters/nahida/bot.js";
import asunaClient from "./characters/asuna/bot.js";
import arisClient from "./characters/aris/bot.js";
import { logDebug } from "./logger.js";

dotenv.config();

/**
 * BotManager 클래스
 * → 모든 봇의 시작과 종료를 중앙에서 관리합니다.
 */
class BotManager {
	private readonly bots = [
		{ client: nahidaClient, token: process.env.DISCORD_NAHIDA_TOKEN },
		{ client: asunaClient, token: process.env.DISCORD_ASUNA_TOKEN },
		{ client: arisClient, token: process.env.DISCORD_ARIS_TOKEN },
	];

	// 모든 봇 동시 시작
	async startBots(): Promise<void> {
		try {
			await Promise.all(
				this.bots.map(({ client, token }) => client.login(token))
			);
			logDebug("모든 봇이 성공적으로 시작되었습니다.");
		} catch (error) {
			console.error("봇 시작 중 오류 발생:", error);
		}
	}

	// 모든 봇 안전 종료
	async shutdownBots(): Promise<void> {
		try {
			await Promise.all(this.bots.map(({ client }) => client.destroy()));
			logDebug("모든 봇이 안전하게 종료되었습니다.");
		} catch (error) {
			console.error("봇 종료 중 오류 발생:", error);
		}
	}
}

async function bootstrap() {
	const manager = new BotManager();
	await manager.startBots();

	// SIGINT (Ctrl+C) 종료 시 모든 봇 종료
	process.on("SIGINT", async () => {
		console.log("봇들을 종료합니다...");
		await manager.shutdownBots();
		process.exit(0);
	});
}

bootstrap();
