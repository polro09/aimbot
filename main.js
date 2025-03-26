const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { WebSocketServer } = require('ws');
const http = require('http');

// 봇 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// 모듈 컬렉션 초기화
client.commands = new Collection();
client.events = new Collection();
client.webModules = new Collection();

// 시작 시간 기록 (업타임 계산용)
client.startTime = Date.now();

// 모듈 로드 함수
async function loadModules() {
  console.log('모듈을 로드하는 중...');
  
  try {
    // 명령어 모듈 로드
    const commandsPath = path.join(__dirname, 'modules', 'commands');
    if (fs.existsSync(commandsPath)) {
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      for (const file of commandFiles) {
        try {
          const command = require(path.join(commandsPath, file));
          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`명령어 로드됨: ${command.data.name}`);
          } else {
            console.warn(`[경고] ${file} 파일에 올바른 명령어 구조가 없습니다.`);
          }
        } catch (error) {
          console.error(`[오류] ${file} 명령어 로드 실패:`, error);
        }
      }
    } else {
      console.warn('[경고] modules/commands 디렉토리가 존재하지 않습니다.');
    }
    
    // 이벤트 모듈 로드
    const eventsPath = path.join(__dirname, 'modules', 'events');
    if (fs.existsSync(eventsPath)) {
      const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
      for (const file of eventFiles) {
        try {
          const event = require(path.join(eventsPath, file));
          if (event.name && (event.execute || event.run)) {
            const executeFunction = event.execute || event.run;
            
            if (event.once) {
              client.once(event.name, (...args) => executeFunction(...args, client));
            } else {
              client.on(event.name, (...args) => executeFunction(...args, client));
            }
            console.log(`이벤트 로드됨: ${event.name}`);
          } else {
            console.warn(`[경고] ${file} 파일에 올바른 이벤트 구조가 없습니다.`);
          }
        } catch (error) {
          console.error(`[오류] ${file} 이벤트 로드 실패:`, error);
        }
      }
    } else {
      console.warn('[경고] modules/events 디렉토리가 존재하지 않습니다.');
    }
    
    // 웹 모듈 로드
    const webModulesPath = path.join(__dirname, 'web', 'webmodules');
    if (fs.existsSync(webModulesPath)) {
      const webModuleFiles = fs.readdirSync(webModulesPath).filter(file => file.endsWith('.js'));
      for (const file of webModuleFiles) {
        try {
          const webModule = require(path.join(webModulesPath, file));
          if ('name' in webModule && ('init' in webModule || 'handleRequest' in webModule)) {
            client.webModules.set(webModule.name, webModule);
            console.log(`웹 모듈 로드됨: ${webModule.name}`);
          } else {
            console.warn(`[경고] ${file} 파일에 올바른 웹 모듈 구조가 없습니다.`);
          }
        } catch (error) {
          console.error(`[오류] ${file} 웹 모듈 로드 실패:`, error);
        }
      }
    } else {
      console.warn('[경고] web/webmodules 디렉토리가 존재하지 않습니다.');
    }
    
    console.log('모든 모듈이 성공적으로 로드되었습니다.');
    console.log(`- 명령어: ${client.commands.size}개`);
    console.log(`- 웹 모듈: ${client.webModules.size}개`);
    
  } catch (error) {
    console.error('[치명적 오류] 모듈 로드 중 예상치 못한 오류 발생:', error);
  }
}

// 웹소켓 서버 설정
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AIMBOT.AD 웹소켓 서버');
});

const wss = new WebSocketServer({ server });

// 웹소켓 연결 관리
const connections = new Set();

wss.on('connection', (ws) => {
  connections.add(ws);
  console.log('웹소켓 클라이언트 연결됨');
  
  // 웹소켓 메시지 수신 처리
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('웹소켓 메시지 수신:', data);
      
      // 메시지 타입에 따른 처리
      if (data.type === 'getStatus') {
        // 봇 상태 요청
        sendBotStatus(ws);
      } else if (data.type === 'command') {
        // 웹에서 봇 명령어 실행
        await handleCommandExecution(ws, data);
      } else if (data.type === 'webModule') {
        // 웹 모듈 명령 처리
        await handleWebModuleRequest(ws, data);
      }
    } catch (error) {
      console.error('웹소켓 메시지 처리 오류:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '메시지 처리 중 오류가 발생했습니다.'
      }));
    }
  });
  
  // 웹소켓 연결 종료 처리
  ws.on('close', () => {
    connections.delete(ws);
    console.log('웹소켓 클라이언트 연결 종료');
  });
  
  // 연결 성공 메시지 전송
  ws.send(JSON.stringify({
    type: 'connected',
    message: '웹소켓 서버에 연결되었습니다.'
  }));
  
  // 초기 상태 전송
  sendBotStatus(ws);
});

// 봇 상태 전송 함수
function sendBotStatus(ws) {
  const uptime = Math.floor((Date.now() - client.startTime) / 1000); // 초 단위로 변환
  
  ws.send(JSON.stringify({
    type: 'botStatus',
    status: client.isReady() ? 'online' : 'offline',
    guilds: client.guilds.cache.size,
    users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
    uptime: uptime,
    memoryUsage: process.memoryUsage().heapUsed,
    modules: {
      commands: Array.from(client.commands.keys()),
      webModules: Array.from(client.webModules.keys())
    },
    lastUpdated: new Date().toISOString()
  }));
}

// 명령어 실행 처리 함수
async function handleCommandExecution(ws, data) {
  const command = client.commands.get(data.command);
  if (command) {
    try {
      const result = await command.executeFromWeb(data.params, client);
      ws.send(JSON.stringify({
        type: 'commandResponse',
        command: data.command,
        status: 'success',
        message: '명령이 실행되었습니다.',
        result
      }));
      
      // 명령어 실행 이벤트 브로드캐스트
      broadcastToWeb('commandExecuted', {
        command: data.command,
        user: 'web-admin',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('명령어 실행 오류:', error);
      ws.send(JSON.stringify({
        type: 'commandResponse',
        command: data.command,
        status: 'error',
        message: error.message || '명령어 실행 중 오류가 발생했습니다.'
      }));
    }
  } else {
    ws.send(JSON.stringify({
      type: 'commandResponse',
      command: data.command,
      status: 'error',
      message: '존재하지 않는 명령어입니다.'
    }));
  }
}