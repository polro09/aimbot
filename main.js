const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
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

// 모듈 로드 함수
function loadModules() {
  console.log('모듈을 로드하는 중...');
  
  // 명령어 모듈 로드
  const commandsPath = path.join(__dirname, 'modules', 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`명령어 로드됨: ${command.data.name}`);
      }
    }
  }
  
  // 이벤트 모듈 로드
  const eventsPath = path.join(__dirname, 'modules', 'events');
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
      const event = require(path.join(eventsPath, file));
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      console.log(`이벤트 로드됨: ${event.name}`);
    }
  }
  
  // 웹 모듈 로드
  const webModulesPath = path.join(__dirname, 'web', 'webmodules');
  if (fs.existsSync(webModulesPath)) {
    const webModuleFiles = fs.readdirSync(webModulesPath).filter(file => file.endsWith('.js'));
    for (const file of webModuleFiles) {
      const webModule = require(path.join(webModulesPath, file));
      if ('name' in webModule && 'init' in webModule) {
        client.webModules.set(webModule.name, webModule);
        console.log(`웹 모듈 로드됨: ${webModule.name}`);
      }
    }
  }
}

// 웹소켓 서버 설정
const server = http.createServer();
const wss = new WebSocketServer({ server });

// 웹소켓 연결 관리
const connections = new Set();

wss.on('connection', (ws) => {
  connections.add(ws);
  console.log('웹소켓 클라이언트 연결됨');
  
  // 웹소켓 메시지 수신 처리
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('웹소켓 메시지 수신:', data);
      
      // 메시지 타입에 따른 처리
      if (data.type === 'command') {
        // 웹에서 봇 명령어 실행
        const command = client.commands.get(data.command);
        if (command) {
          try {
            await command.executeFromWeb(data.params, client);
            ws.send(JSON.stringify({
              type: 'commandResponse',
              command: data.command,
              status: 'success',
              message: '명령이 실행되었습니다.'
            }));
          } catch (error) {
            console.error('명령어 실행 오류:', error);
            ws.send(JSON.stringify({
              type: 'commandResponse',
              command: data.command,
              status: 'error',
              message: '명령어 실행 중 오류가 발생했습니다.'
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
      } else if (data.type === 'webModule') {
        // 웹 모듈 명령 처리
        const webModule = client.webModules.get(data.module);
        if (webModule && webModule.handleRequest) {
          try {
            const result = await webModule.handleRequest(data.action, data.params, client);
            ws.send(JSON.stringify({
              type: 'webModuleResponse',
              module: data.module,
              action: data.action,
              status: 'success',
              result
            }));
          } catch (error) {
            console.error('웹 모듈 요청 처리 오류:', error);
            ws.send(JSON.stringify({
              type: 'webModuleResponse',
              module: data.module,
              action: data.action,
              status: 'error',
              message: '웹 모듈 요청 처리 중 오류가 발생했습니다.'
            }));
          }
        } else {
          ws.send(JSON.stringify({
            type: 'webModuleResponse',
            module: data.module,
            action: data.action,
            status: 'error',
            message: '존재하지 않는 웹 모듈 또는 액션입니다.'
          }));
        }
      }
    } catch (error) {
      console.error('웹소켓 메시지 처리 오류:', error);
    }
  });
  
  // 웹소켓 연결 종료 처리
  ws.on('close', () => {
    connections.delete(ws);
    console.log('웹소켓 클라이언트 연결 종료');
  });
  
  // 초기 상태 전송
  ws.send(JSON.stringify({
    type: 'botStatus',
    status: 'online',
    guilds: client.guilds.cache.size,
    modules: {
      commands: Array.from(client.commands.keys()),
      webModules: Array.from(client.webModules.keys())
    }
  }));
});

// 봇 이벤트를 웹으로 브로드캐스트하는 함수
function broadcastToWeb(eventType, data) {
  const message = JSON.stringify({
    type: 'botEvent',
    eventType,
    data,
    timestamp: new Date().toISOString()
  });
  
  for (const connection of connections) {
    if (connection.readyState === 1) { // WebSocket.OPEN
      connection.send(message);
    }
  }
}

// 봇 이벤트 핸들러
client.once('ready', () => {
  console.log(`${client.user.tag}로 로그인 완료!`);
  broadcastToWeb('ready', { 
    botUsername: client.user.tag,
    guilds: client.guilds.cache.size
  });
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  
  // 접두사로 시작하는 명령어 처리
  if (message.content.startsWith(config.prefix)) {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);
    if (!command) return;
    
    try {
      command.execute(message, args, client);
      
      // 명령어 실행 정보를 웹으로 브로드캐스트
      broadcastToWeb('commandExecuted', {
        command: commandName,
        user: message.author.tag,
        guild: message.guild?.name || 'DM',
        channel: message.channel.name,
        args
      });
    } catch (error) {
      console.error('명령어 실행 오류:', error);
      message.reply('명령어 실행 중 오류가 발생했습니다.');
    }
  }
});

// 모듈 로드 및 봇 로그인
loadModules();
client.login(config.token).catch(error => {
  console.error('봇 로그인 실패:', error);
});

// 웹소켓 서버 시작
server.listen(config.wsPort, () => {
  console.log(`웹소켓 서버가 ${config.wsPort} 포트에서 실행 중입니다.`);
});

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('봇 종료 중...');
  for (const connection of connections) {
    connection.close();
  }
  server.close(() => {
    console.log('웹소켓 서버 종료됨');
    client.destroy();
    process.exit(0);
  });
});