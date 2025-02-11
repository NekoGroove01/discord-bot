// state/bot_state.ts
class BotState {
	private isJoined: boolean;
	private lastResponseTime: Date | null = null;
    private readonly TIMEOUT_DURATION = 1000 * 60 * 30; // 30 minutes timeout

	constructor(state: boolean = false) {
		this.isJoined = false;
		if (state) {
            this.updateLastResponseTime();
        } else {
            this.lastResponseTime = null;
        }
	}

	getJoinedState(): boolean {
		return this.isJoined;
	}

	setJoinedState(state: boolean): void {
		this.isJoined = state;
	}

	updateLastResponseTime(): void {
		this.lastResponseTime = new Date();
	}

	hasTimedOut(): boolean {
        if (!this.lastResponseTime || !this.isJoined) return false;
        
        const currentTime = new Date();
        const timeDiff = currentTime.getTime() - this.lastResponseTime.getTime();
        return timeDiff > this.TIMEOUT_DURATION;
    }
}

export default BotState;
