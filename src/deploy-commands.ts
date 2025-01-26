import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { debugLog } from "./utils";

function registerCommands(
	token: string,
	clientId: string,
	guildId: string,
	isGlobal: boolean = false
) {
	const commands = [
		new SlashCommandBuilder()
			.setName("ping")
			.setDescription("Replies with pong!"),
	].map((command) => command.toJSON());

	const rest = new REST({ version: "10" }).setToken(token);

	(async () => {
		try {
			await rest.put(
				isGlobal
					? Routes.applicationCommands(clientId)
					: Routes.applicationGuildCommands(clientId, guildId),
				{
					body: commands,
				}
			);

			debugLog("명령어 등록을 성공적으로 완료했습니다.");
		} catch (error) {
			debugLog("명령어 등록 중 오류 발생:", error);
		}
	})();
}

export default registerCommands;
