class BotState {
	private isJoined: boolean;
	private readonly conversationParticipants: Set<string>;

	constructor() {
		this.isJoined = false;
		this.conversationParticipants = new Set();
	}

	getJoinedState(): boolean {
		return this.isJoined;
	}

	setJoinedState(state: boolean): void {
		this.isJoined = state;
	}

	addParticipant(botId: string): void {
		this.conversationParticipants.add(botId);
	}

	removeParticipant(botId: string): void {
		this.conversationParticipants.delete(botId);
	}

	getParticipants(): Set<string> {
		return this.conversationParticipants;
	}
}

export default BotState;
