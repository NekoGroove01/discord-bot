// commands/ping.ts
import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types.js";

export const ping: Command = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Replies with Pong!"),
	execute: async (interaction: any) => {
		await interaction.reply("Pong!");
	},
};
