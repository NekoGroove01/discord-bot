import registerCommands from "./deployCommands";
import * as dotenv from "dotenv";

dotenv.config();
registerCommands(
	process.env.DISCORD_ASUNA_TOKEN!,
	process.env.ASUNA_CLIENT_ID!,
	process.env.GUILD_ID!
);
registerCommands(
	process.env.DISCORD_NAHIDA_TOKEN!,
	process.env.NAHIDA_CLIENT_ID!,
	process.env.GUILD_ID!
);
registerCommands(
	process.env.DISCORD_ARIS_TOKEN!,
	process.env.ARIS_CLIENT_ID!,
	process.env.GUILD_ID!
);
