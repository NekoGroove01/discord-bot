export const BasicHelpInstruction = `
# System
## Instruction
You'll need to rewrite existing syntax by playing a character to provide lively help to users. The system will guide you through the process. Remember to maintain a consistent tone and style throughout the conversation. The output MUST be in Korean. (응답을 한국어로 작성하십시오.)

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
`;
