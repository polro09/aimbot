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
    const wsProtocol = config.isProduction ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//localhost:${config.wsPort}`;
    botWsClient = new WebSocket(wsUrl);
    
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
      
      // 인증 확인 (향후 개선 가능)
      
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
      ws.send(JSON.stringify({
        type: 'error',
        message: '메시지 처리 중 오류가 발생했습니다.'
      }));
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

module.exports = server;const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config');

// Express 애플리케이션 생성
const app = express();

// 보안 미들웨어 추가
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      fontSrc: ["'self'", 'cdnjs.cloudflare.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  // 개발 환경에서는 HTTPS 강제를 비활성화
  // 프로덕션 환경에서는 활성화해야 함
  hsts: config.isProduction,
}));

// CORS 설정
app.use(cors({
  origin: config.isProduction ? [`https://${config.domain}`] : '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// 레이트 리미터 설정
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 최대 요청 수
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 세션 설정
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: config.isProduction, // 프로덕션에서는 HTTPS만 허용
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

// JSON 및 URL 인코딩 파서 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 로그인 페이지 관련 라우트
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // 설정 파일의 관리자 계정과 비교
  if (username === config.adminUsername && password === config.adminPassword) {
    req.session.isAuthenticated = true;
    req.session.username = username;
    req.session.role = 'admin';
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
    res.locals.username = req.session.username;
    res.locals.role = req.session.role;
    next();
  } else {
    res.redirect('/login');
  }
};

// 로그 함수
function logAccess(action, username, url) {
  const logMessage = `[${new Date().toISOString()}] ${action} - 사용자: ${username || 'anonymous'}, URL: ${url}`;
  console.log(logMessage);
  
  // 로그 파일에 기록 (옵션)
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  fs.appendFile(
    path.join(logsDir, 'access.log'), 
    logMessage + '\n', 
    err => {
      if (err) console.error('로그 파일 기록 중 오류:', err);
    }
  );
}

// 대시보드 라우트 (인증 필요)
app.get('/dashboard', requireAuth, (req, res) => {
  logAccess('대시보드 접속', req.session.username, req.url);
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 대시보드 하위 경로
app.get('/dashboard/*', requireAuth, (req, res) => {
  logAccess('대시보드 접속', req.session.username, req.url);
  
  // 요청 경로에 따라 다른 페이지 제공 (예: /dashboard/servers, /dashboard/modules 등)
  const requestedPage = req.url.split('/')[2];
  const pagePath = path.join(__dirname, 'public', 'dashboard', `${requestedPage}.html`);
  
  // 특정 페이지 파일이 존재하면 해당 파일 제공, 아니면 기본 대시보드 페이지 제공
  if (fs.existsSync(pagePath)) {
    res.sendFile(pagePath);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  }
});

// 웹 모듈 라우트 로드
function loadWebModuleRoutes() {
  const webModulesPath = path.join(__dirname, 'webmodules');
  if (fs.existsSync(webModulesPath)) {
    const webModuleFiles = fs.readdirSync(webModulesPath).filter(file => file.endsWith('.js'));
    
    for (const file of webModuleFiles) {
      try {
        const webModule = require(path.join(webModulesPath, file));
        if (webModule.routes) {
          // 웹 모듈의 라우트 등록
          app.use(`/module/${webModule.name}`, requireAuth, webModule.routes);
          console.log(`웹 모듈 라우트 등록됨: /module/${webModule.name}`);
        }
      } catch (error) {
        console.error(`웹 모듈 라우트 로드 실패: ${file}`, error);
      }
    }
  }
}

// 웹 모듈 라우트 로드
loadWebModuleRoutes();

// 메인 페이지 라우트
app.get('/', (req, res) => {
  logAccess('홈페이지 접속', req.session.username, req.url);
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
  // 이 엔드포인트는 인증 없이 접근 가능한 기본 통계 정보만 제공
  const statsData = {
    servers: 0,
    users: 0,
    modules: 0,
    commands: 0,
    lastUpdated: new Date().toISOString()
  };
  
  // 일부 통계 정보는 웹소켓 서버를 통해 업데이트됨
  res.json(statsData);
});

// 404 처리
app.use((req, res) => {
  console.log('404 페이지 요청: ' + req.url);
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
  console.error('애플리케이션 오류:', err);
  res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});