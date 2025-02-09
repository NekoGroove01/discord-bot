// asuna/bot.ts

import { Client } from "discord.js";
import generateBotClient from "../botGenerate.js";
import { asunaPrompt } from "./prompt.js";
import * as dotenv from "dotenv";

dotenv.config();

const asunaClient: Client = generateBotClient({
	name: "아스나",
	description: asunaPrompt,
	prompt: [],
});

export default asunaClient;
