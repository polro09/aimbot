const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// 슬래시 명령어 등록 스크립트
console.log('슬래시 명령어 등록 프로세스 시작...');

const commands = [];
const commandsPath = path.join(__dirname, 'modules', 'commands');

// 명령어 디렉토리 확인
if (!fs.existsSync(commandsPath)) {
  console.error(`오류: 명령어 디렉토리를 찾을 수 없습니다. (${commandsPath})`);
  process.exit(1);
}

// 명령어 파일 로드
try {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  if (commandFiles.length === 0) {
    console.warn('경고: 명령어 파일을 찾을 수 없습니다.');
  }
  
  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));
      if ('data' in command) {
        commands.push(command.data.toJSON());
        console.log(`명령어 로드됨: ${command.data.name}`);
      } else {
        console.log(`[경고] ${file} 파일에 "data" 속성이 누락되었습니다.`);
      }
    } catch (error) {
      console.error(`[오류] ${file} 파일 로드 중 오류 발생:`, error);
    }
  }
} catch (error) {
  console.error('명령어 로드 중 오류 발생:', error);
  process.exit(1);
}

// 필수 설정 확인
if (!config.token) {
  console.error('오류: 봇 토큰이 설정되지 않았습니다.');
  process.exit(1);
}

if (!config.clientId) {
  console.error('오류: 클라이언트 ID가 설정되지 않았습니다.');
  process.exit(1);
}

// REST API 클라이언트 설정
const rest = new REST({ version: '10' }).setToken(config.token);

// 명령어 등록 함수
(async () => {
  try {
    console.log(`${commands.length}개의 애플리케이션 명령어를 등록 중...`);
    
    if (commands.length === 0) {
      console.warn('경고: 등록할 명령어가 없습니다.');
      return;
    }
    
    // 전역 명령어 등록 (모든 서버에서 사용 가능)
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );
    
    console.log(`${data.length}개의 애플리케이션 명령어를 성공적으로 등록했습니다.`);
    
    // 등록된 명령어 목록 출력
    console.log('등록된 명령어:');
    data.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd.name} - ${cmd.description}`);
    });
    
  } catch (error) {
    console.error('명령어 등록 실패:', error);
    
    // 오류 세부정보 출력
    if (error.code) {
      console.error(`오류 코드: ${error.code}`);
    }
    
    if (error.status) {
      console.error(`HTTP 상태 코드: ${error.status}`);
    }
    
    if (error.message) {
      console.error(`오류 메시지: ${error.message}`);
    }
    
    process.exit(1);
  }
})();