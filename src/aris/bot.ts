import generateBotClient from "../bot.js";
import { arisExampleConversation, arisPrompt } from "./prompt.js";
import * as dotenv from "dotenv";

dotenv.config();

const arisClient = generateBotClient(
	"아리스",
	arisPrompt,
	{
		baseDelay: 100,
		charDelay: 20,
		maxDelay: 2000,
		complexityMultiplier: 70,
	},
	arisExampleConversation
);

export default arisClient;
