const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const commands = [];
const commandsPath = path.join(__dirname, 'modules', 'commands');

// 명령어 파일 로드
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command) {
      commands.push(command.data.toJSON());
      console.log(`명령어 로드됨: ${command.data.name}`);
    } else {
      console.log(`[경고] ${file} 파일에 "data" 속성이 누락되었습니다.`);
    }
  }
}

// REST API 클라이언트 설정
const rest = new REST({ version: '10' }).setToken(config.token);

// 명령어 등록 함수
(async () => {
  try {
    console.log(`${commands.length}개의 애플리케이션 명령어를 등록 중...`);
    
    // 전역 명령어 등록 (모든 서버에서 사용 가능)
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );
    
    console.log(`${data.length}개의 애플리케이션 명령어를 성공적으로 등록했습니다.`);
  } catch (error) {
    console.error('명령어 등록 실패:', error);
  }
})();
