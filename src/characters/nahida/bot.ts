// nahida/bot.ts

import generateBotClient from "../botGenerate.js";
import * as dotenv from "dotenv";
import { nahidaExampleConversationPrompt, nahidaPrompt } from "./prompt.js";

dotenv.config();

const nahidaClient = generateBotClient({
	name: "나히다",
	description: nahidaPrompt,
	exampleConversation: nahidaExampleConversationPrompt,
	prompt: [],
});

export default nahidaClient;
