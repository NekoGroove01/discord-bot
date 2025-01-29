// nahida/bot.ts

import generateBotClient from "../bot.js";
import * as dotenv from "dotenv";
import { nahidaExampleConversationPrompt, nahidaPrompt } from "./prompt.js";

dotenv.config();

const nahidaClient = generateBotClient(
	"나히다",
	nahidaPrompt,
	{
		baseDelay: 400,
		charDelay: 25,
		maxDelay: 3000,
		complexityMultiplier: 100,
	},
	nahidaExampleConversationPrompt
);

export default nahidaClient;
