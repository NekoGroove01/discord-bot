import { Client, GatewayIntentBits } from 'discord.js';
import OpenAI from 'openai';

// Discord 봇 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 봇이 준비되었을 때 실행될 코드
client.once('ready', () => {
  console.log(`봇이 준비되었습니다! 로그인: ${client.user?.tag}`);
});

// 메시지 이벤트 처리
client.on('messageCreate', (message) => {
  // 봇이 보낸 메시지는 무시
  if (message.author.bot) return;

  // 명령어 처리 예제
  if (message.content === '!ping') {
    message.channel.send('Pong!');
  }
});

// OpenAI API 설정
const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
  });
  

// 특정 사용자와 대화 상태 관리
const userConversations: Map<string, boolean> = new Map();

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;

  // 특정 명령어로 대화 시작
  if (message.content === '!start') {
    userConversations.set(userId, true);
    message.channel.send('대화를 시작합니다! 무엇이든 물어보세요.');
    return;
  }

  // 대화 종료 명령어
  if (message.content === '!stop') {
    userConversations.delete(userId);
    message.channel.send('대화를 종료합니다.');
    return;
  }

  // 대화 중인 사용자만 응답

});


// Discord 봇 토큰으로 로그인
client.login(process.env.BOT_TOKEN);
