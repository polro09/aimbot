// web/index.js 개선 버전

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const session = require('express-session');
const config = require('../config.json');

// Express 애플리케이션 생성
const app = express();

// 세션 설정
app.use(session({
  secret: config.sessionSecret || 'aimbot-ad-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// JSON 및 URL 인코딩 파서 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 - 경로 수정
app.use(express.static(path.join(__dirname, 'public')));

// 로그인 라우트
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // 설정 파일의 관리자 계정과 비교
  if (username === config.adminUsername && password === config.adminPassword) {
    req.session.isAuthenticated = true;
    req.session.username = username;
    res.redirect('/dashboard');
  } else {
    res.redirect('/login?error=1');
  }
});

// 로그아웃 라우트
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// 인증 미들웨어
const requireAuth = (req, res, next) => {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.redirect('/login');
  }
};

// 대시보드 라우트 (인증 필요)
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 대시보드 하위 경로
app.get('/dashboard/*', requireAuth, (req, res) => {
  // 경로별 대시보드 페이지 라우팅 추가 가능
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 메인 페이지 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 기타 경로들
app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'features.html'));
});

app.get('/modules', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'modules.html'));
});

// API 엔드포인트
app.get('/api/stats', (req, res) => {
  const statsData = {
    servers: 0,
    users: 0,
    modules: 0,
    commands: 0
  };
  
  res.json(statsData);
});

// 404 처리
app.use((req, res) => {
  console.log('404 페이지 요청: ' + req.url);
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// 서버 시작
const PORT = config.webPort || 3000;
const server = http.createServer(app);

// 웹소켓 서버
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
  console.log('웹 클라이언트가 연결되었습니다.');
  
  // 봇 웹소켓 클라이언트 설정
  let botWsClient = null;
  
  function connectToBotWs() {
    // 봇 웹소켓 서버에 연결
    botWsClient = new WebSocket(`ws://localhost:${config.wsPort}`);
    
    botWsClient.on('open', function() {
      console.log('봇 웹소켓 서버에 연결됨');
      
      // 초기 상태 요청
      botWsClient.send(JSON.stringify({
        type: 'getStatus'
      }));
    });
    
    botWsClient.on('message', function(data) {
      // 봇으로부터 받은 메시지를 웹 클라이언트에 전달
      ws.send(data.toString());
    });
    
    botWsClient.on('close', function() {
      console.log('봇 웹소켓 서버와 연결 종료');
      setTimeout(connectToBotWs, 5000); // 5초 후 재연결 시도
    });
    
    botWsClient.on('error', function(error) {
      console.error('봇 웹소켓 오류:', error.message);
    });
  }
  
  // 봇 웹소켓 서버에 연결
  connectToBotWs();
  
  // 웹 클라이언트로부터 메시지 수신
  ws.on('message', function(message) {
    try {
      const data = JSON.parse(message.toString());
      console.log('웹 클라이언트로부터 메시지 수신:', data);
      
      // 봇 웹소켓 서버가 연결되어 있으면 메시지 전달
      if (botWsClient && botWsClient.readyState === WebSocket.OPEN) {
        botWsClient.send(message.toString());
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: '봇과의 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.'
        }));
      }
    } catch (error) {
      console.error('메시지 처리 오류:', error);
    }
  });
  
  // 웹 클라이언트 연결 종료
  ws.on('close', function() {
    console.log('웹 클라이언트 연결 종료');
    if (botWsClient) {
      botWsClient.close();
    }
  });
  
  // 초기 연결 확인 메시지
  ws.send(JSON.stringify({
    type: 'connected',
    message: '웹소켓 서버에 연결되었습니다.'
  }));
});

// 명시적으로 모든 인터페이스(0.0.0.0)에 바인딩
server.listen(PORT, '0.0.0.0', () => {
  // 서버의 IP 주소들 출력
  console.log(`======================================`);
  console.log(`웹 서버가 포트 ${PORT}에서 시작되었습니다`);
  console.log(`접속 URL 목록:`);
  console.log(`- http://localhost:${PORT}`);
  
  // 시스템의 모든 네트워크 인터페이스 출력
  const networkInterfaces = require('os').networkInterfaces();
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const addresses = networkInterfaces[interfaceName];
    addresses.forEach(addr => {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`- http://${addr.address}:${PORT}`);
      }
    });
  });
  console.log(`======================================`);
});

module.exports = server;