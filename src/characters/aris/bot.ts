import generateBotClient from "../botGenerate.js";
import { arisExampleConversation, arisPrompt } from "./prompt.js";
import * as dotenv from "dotenv";

dotenv.config();

const arisClient = generateBotClient({
	name: "아리스",
	description: arisPrompt,
	exampleConversation: arisExampleConversation,
	prompt: [],
});

export default arisClient;
