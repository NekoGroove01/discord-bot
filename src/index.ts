// index.ts
import * as dotenv from "dotenv";
import { debugLog } from "./utils.js";
import nahidaClient from "./\bnahida/bot.js";
import asunaClient from "./asuna/bot.js";
import arisClient from "./aris/bot.js";

dotenv.config();

// 봇 시작 함수
async function startBots() {
	try {
		// 두 봇을 동시에 시작
		await Promise.all([
			nahidaClient.login(process.env.DISCORD_NAHIDA_TOKEN),
			asunaClient.login(process.env.DISCORD_ASUNA_TOKEN),
			arisClient.login(process.env.DISCORD_ARIS_TOKEN),
		]);

		debugLog("모든 봇이 성공적으로 시작되었습니다.");
	} catch (error) {
		console.error("봇 시작 중 오류 발생:", error);
	}
}

startBots();

// 정상 종료 처리
process.on("SIGINT", async () => {
	console.log("봇들을 종료합니다...");

	try {
		await Promise.all([nahidaClient.destroy(), asunaClient.destroy()]);

		debugLog("모든 봇이 안전하게 종료되었습니다.");
		process.exit(0);
	} catch (error) {
		console.error("봇 종료 중 오류 발생:", error);
		process.exit(1);
	}
});
