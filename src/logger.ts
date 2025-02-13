// logger/logger.ts
import winston from "winston";
import path from "path";

// 로그 레벨 정의
const levels = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
};

// 로그 색상 정의
const colors = {
	error: "red",
	warn: "yellow",
	info: "green",
	debug: "blue",
};

// 커스텀 로그 포맷 정의
const logFormat = winston.format.printf(
	({ level, message, timestamp, ...metadata }) => {
		let msg = `${timestamp} [${level.toUpperCase()}] : ${message}`;

		// 추가 메타데이터가 있으면 JSON 형식으로 추가
		if (Object.keys(metadata).length > 0) {
			msg += ` ${JSON.stringify(metadata, null, 2)}`;
		}

		return msg;
	}
);

// 로거 생성
const logger = winston.createLogger({
	levels,
	format: winston.format.combine(
		winston.format.timestamp({
			format: "YYYY-MM-DD HH:mm:ss",
		}),
		winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
		logFormat
	),
	transports: [
		// 콘솔 출력
		new winston.transports.Console({
			level: "debug", // Ensure all log levels are output to the console
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple()
			),
		}),
		// 일반 로그 파일
		new winston.transports.File({
			filename: path.join("logs", "combined.log"),
		}),
		// 에러 로그 파일
		new winston.transports.File({
			filename: path.join("logs", "error.log"),
			level: "error",
		}),
		// 채팅 전용 로그 파일
		new winston.transports.File({
			filename: path.join("logs", "chat.log"),
			level: "info",
		}),
		// ... 기존 transports ...
		new winston.transports.File({
			filename: path.join(
				"logs",
				`${new Date().toISOString().split("T")[0]}.log`
			),
			// 날짜별 로그 파일 생성
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json()
			),
			maxsize: 5242880, // 5MB
			maxFiles: 5,
			tailable: true,
		}),
	],
});

// 로그 타입 정의
export interface ChatLogData {
	userId: string;
	username: string;
	channelId: string;
	channelName?: string;
	messageId: string;
	content: string;
	isDM: boolean;
	options?: any;
}

export interface CommandLogData {
	userId: string;
	username: string;
	command: string;
	options?: any;
	guildId?: string;
}

export interface ErrorLogData {
	error: Error;
	context?: string;
	metadata?: any;
}

// 로깅 함수들
export const logChat = (data: ChatLogData) => {
	logger.info("Chat Message", {
		type: "chat",
		...data,
		timestamp: new Date().toISOString(),
	});
};

export const logCommand = (data: CommandLogData) => {
	logger.info("Command Executed", {
		type: "command",
		...data,
		timestamp: new Date().toISOString(),
	});
};

export const logError = (data: ErrorLogData) => {
	logger.error("Error Occurred", {
		type: "error",
		...data,
		errorStack: data.error.stack,
		timestamp: new Date().toISOString(),
	});
};

export const logDebug = (message: string, metadata?: any) => {
	logger.debug(message, {
		type: "debug",
		...metadata,
		timestamp: new Date().toISOString(),
	});
};

export default logger;
