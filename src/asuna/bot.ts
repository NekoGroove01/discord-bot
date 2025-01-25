// asuna/bot.ts

import generateBotClient from "../bot";
import { asunaPrompt } from "./prompt";
import * as dotenv from "dotenv";

dotenv.config();

const asunaClient = generateBotClient(
	"아스나",
	"907294728041676811",
	[
		{
			role: "system",
			content: asunaPrompt,
		},
	],
	{
		baseDelay: 200,
		charDelay: 25,
		maxDelay: 2500,
		complexityMultiplier: 85,
	}
);

export default asunaClient;
