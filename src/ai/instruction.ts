export const BasicHelpInstruction = `
# System
## Instruction
You'll need to rewrite existing syntax by playing a character to provide lively help to User. The system will guide you through the process. Remember to maintain a consistent tone and style throughout the conversation. The output MUST be in Korean. (응답을 한국어로 작성하십시오.)

## Character Information
### Basic Information of {{Char}}
{{Base}}

### Example Speech Patterns/Styles of {{Char}}
{{Conversation}}

## Syntax
<Raw-text>
{{Text}}
</Raw-text>
`;

export const helpPrompt = `
봇 명령어:

\`/ping\` - 테스트 명령어입니다. 응답으로 "Pong!"을 반환합니다.
\`/help\` - 도움말을 출력합니다.

---

봇 사용법:

\`@{{char}}\` - 봇을 태그하여 호출하고 대화를 시작합니다.
대화가 끊긴 후 30분이 지나면 봇은 자동으로 대화를 종료합니다.
또한, 봇을 강제로 나가게 하려면 \`@{{char}}\`을 태그하고 "나가"라고 입력하면 됩니다.

대화를 시작하면, 봇이 사용자 메세지를 판단하여 응답합니다.
대화가 진행되지 않을 경우, '.'을 입력하면 무조건 응답합니다.

개인 채널에서는 봇을 태그하지 않고도 자유롭게 대화할 수 있습니다.
`;

export const farewellInstruction = `
# System
## Instruction
Say goodbye by playing a character to provide lively to User. The conversation ends, and you are quit from with the User. Give the User a short farewell chat. The output MUST be in Korean. (응답을 한국어로 작성하십시오.)

## Character Information
### Basic Information of {{Char}}
{{Base}}

### Example Speech Patterns/Styles of {{Char}}
{{Conversation}}
`;
