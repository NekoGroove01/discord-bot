class BotState {
	private isJoined: boolean;

	constructor() {
		this.isJoined = false;
	}

	getJoinedState(): boolean {
		return this.isJoined;
	}

	setJoinedState(state: boolean): void {
		this.isJoined = state;
	}
}

export default BotState;
