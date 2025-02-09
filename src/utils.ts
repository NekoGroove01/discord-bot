/*
메세지 관련 함수들
*/

/**
 * API에서 받은 응답을 자연스럽게 타이핑할 수 있도록 줄로 나눕니다.
 * @param response string
 * @returns string Array ([Line1, Line2, ...])
 */
function splitIntoNaturalLines(response: string): string[] {
	return response
		.split(/(?<=[.!?])\s+/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/**
 * 봇의 응답을 자연스럽게 타이핑하는 데 필요한 시간을 계산합니다.
 * 복잡도에 따라 기본 시간과 문자 수에 따라 추가 시간이 적용됩니다.
 * 최대 시간은 2.5초로 제한됩니다.
 * @param message string
 * @returns number
 */
function calculateDynamicTypingDuration(message: string): number {
	// 타이핑 설정
	const config = {
		baseDelay: 100,
		charDelay: 25,
		complexityMultiplier: 50,
		maxDelay: 2500,
	};
	// 메시지 복잡도 계산
	const complexity = calculateMessageComplexity(message);

	// 기본 타이핑 시간 계산
	const baseTime = config.baseDelay;
	const charTime = message.length * config.charDelay;
	const complexityTime = complexity * config.complexityMultiplier;

	// 최종 타이핑 시간 계산
	return Math.min(baseTime + charTime + complexityTime, config.maxDelay);
}

/**
 * 메시지의 복잡도를 계산합니다.
 * 복잡도 요소:
 * - 코드 블록 포함 여부
 * - URL 포함 여부
 * - 특수 문자 비율
 * - 단어 수
 * @param message string
 * @returns int
 */
function calculateMessageComplexity(message: string): number {
	// 복잡도 요소들
	const hasCode = /```[\s\S]*?```/.test(message);
	const hasUrls = /https?:\/\/[^\s]+/.test(message);
	const specialChars = (message.match(/[^a-zA-Z0-9\s]/g) || []).length;
	const wordCount = message.split(/\s+/).length;

	let complexity = 1;
	if (hasCode) complexity *= 1.5;
	if (hasUrls) complexity *= 1.2;
	complexity += (specialChars / message.length) * 0.5;
	complexity += (wordCount / 10) * 0.3;

	return complexity;
}

/**
 * 봇의 응답을 불필요한 텍스트나 기호를 제거한 후 반환합니다.
 * 반환 목록:
 * - ##Approved, ###Response (공백 포함 여부 상관없이)
 * - 코드 블록 (```...```)
 * - 단일 코드 틱 (`)
 * - 수평선 (---)
 * - 빈 줄
 * @param response string
 * @returns string text
 */

function cleanBotResponse(response: string): string {
	// Handle empty or undefined response
	if (!response) return "";

	return (
		response
			// Remove all variations of ##Approved and ###Response (with or without spaces)
			.replace(/##\s*Approved/gi, "")
			.replace(/###\s*Response/gi, "")
			.replace(/Response/gi, "")
			// Remove markdown code blocks
			.replace(/```[\s\S]*?```/g, "")
			// Remove single line code ticks
			.replace(/`/g, "")
			// Remove horizontal rules
			.replace(/---+/g, "")
			// Remove empty lines and trim
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.join("\n")
			// Final trim to remove any remaining whitespace at the start or end
			.trim()
	);
}

/**
 * 디버깅 메시지를 출력합니다.
 * 포맷: [timestamp] - message
 * @param message string
 * @param data any
 */

function debugLog(message: string, data?: any) {
	const timestamp = new Date().toISOString();
	console.log(`${timestamp} - ${message}`);
	if (data) console.log(data);
}

/**
 * 채팅 기록에서 명령어를 찾습니다.
 * 해당 명령어부터 채팅 기록이 시작되어 사용자의 입력까지만 반환합니다.
 */

function isCommand(content: string): boolean {
	// Assuming commands start with '!' or '/'
	return content.startsWith("!") || content.startsWith("/");
}

function findFirstCommandIndex(messages: any[]): number {
	return messages.findIndex((msg) => isCommand(msg.content));
}

function filterMessagesFromCommand(messages: any[]): any[] {
	const commandIndex = findFirstCommandIndex(messages);
	return commandIndex === -1 ? messages : messages.slice(commandIndex);
}

export {
	splitIntoNaturalLines,
	calculateDynamicTypingDuration,
	cleanBotResponse,
	debugLog,
	filterMessagesFromCommand,
};
