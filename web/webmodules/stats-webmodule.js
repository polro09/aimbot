// 웹 모듈 요청 처리 함수
async function handleRequest(action, params, client) {
  switch (action) {
    case 'getCommandStats':
      return {
        commandUsage: statsData.commandUsage,
        lastUpdated: statsData.lastUpdated
      };
      
    case 'getServerStats':
      if (!client) {
        throw new Error('봇 클라이언트를 사용할 수 없습니다.');
      }
      
      return {
        serverCount: client.guilds.cache.size,
        userCount: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        serverJoins: statsData.serverJoins.length,
        serverLeaves: statsData.serverLeaves.length,
        lastUpdated: statsData.lastUpdated
      };
      
    case 'resetStats':
      // 관리자 권한 확인
      if (!params.adminKey) {
        throw new Error('권한이 없습니다.');
      }
      
      // 요청의 adminKey와 실제 키 비교 (실제 환경에서는 더 안전한 인증 방식 사용 권장)
      const expectedKey = crypto.createHash('sha256')
        .update('admin-' + new Date().toISOString().split('T')[0])
        .digest('hex');
        
      if (params.adminKey !== 'admin-secret-key' && params.adminKey !== expectedKey) {
        throw new Error('유효하지 않은 관리자 키입니다.');
      }
      
      // 현재 데이터 백업
      backupStatsData();
      
      // 통계 초기화
      statsData = {
        commandUsage: {},
        dailyActiveUsers: [],
        serverJoins: [],
        serverLeaves: [],
        lastUpdated: new Date().toISOString()
      };
      
      // 데이터 저장
      saveStatsData();
      
      return {
        success: true,
        message: '통계가 초기화되었습니다.',
        timestamp: new Date().toISOString()
      };
    
    case 'getDailyStats':
      // 일별 통계 가져오기
      return {
        dailyActiveUsers: statsData.dailyActiveUsers,
        lastUpdated: statsData.lastUpdated
      };
      
    default:
      throw new Error(`알 수 없는 액션: ${action}`);
  }
}

module.exports = {
  name: 'stats',
  description: '봇 사용 통계 및 분석',
  routes: router,
  init,
  handleRequest
};const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 데이터 디렉토리 설정
const dataDir = path.join(__dirname, '..', 'data');
const statsFilePath = path.join(dataDir, 'stats.json');

// 통계 데이터 기본값
let statsData = {
  commandUsage: {},
  dailyActiveUsers: [],
  serverJoins: [],
  serverLeaves: [],
  lastUpdated: new Date().toISOString()
};

// 데이터 디렉토리 확인 및 생성
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 파일이 존재하면 데이터 로드
if (fs.existsSync(statsFilePath)) {
  try {
    statsData = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
  } catch (error) {
    console.error('통계 데이터 로드 실패:', error);
  }
}

// 데이터 저장 함수
function saveStatsData() {
  try {
    // 데이터 파일 저장
    fs.writeFileSync(statsFilePath, JSON.stringify(statsData, null, 2));
  } catch (error) {
    console.error('통계 데이터 저장 실패:', error);
  }
}

// 데이터 백업 함수
function backupStatsData() {
  try {
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const date = new Date().toISOString().split('T')[0];
    const timestamp = Math.floor(Date.now() / 1000);
    const backupFilePath = path.join(backupDir, `stats_${date}_${timestamp}.json`);
    
    fs.writeFileSync(backupFilePath, JSON.stringify(statsData, null, 2));
    console.log(`통계 데이터 백업 완료: ${backupFilePath}`);
    
    // 오래된 백업 파일 정리 (최근 10개만 유지)
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('stats_'))
      .sort()
      .reverse();
    
    if (backupFiles.length > 10) {
      for (let i = 10; i < backupFiles.length; i++) {
        fs.unlinkSync(path.join(backupDir, backupFiles[i]));
      }
    }
  } catch (error) {
    console.error('통계 데이터 백업 실패:', error);
  }
}

// 데이터 암호화 함수 
function encryptSensitiveData(data, key) {
  try {
    // 암호화 키가 제공되지 않으면 원본 데이터 반환
    if (!key) return data;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(JSON.stringify(data));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return {
      iv: iv.toString('hex'),
      data: encrypted.toString('hex')
    };
  } catch (error) {
    console.error('데이터 암호화 실패:', error);
    return data;
  }
}

// 초기화 함수
function init(app, wsClient) {
  console.log('통계 웹 모듈 초기화됨');
  
  wsClient.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // 봇 이벤트 처리
      if (data.type === 'botEvent') {
        switch (data.eventType) {
          case 'commandExecuted':
            // 명령어 사용 통계 업데이트
            const command = data.data.command;
            if (!statsData.commandUsage[command]) {
              statsData.commandUsage[command] = 0;
            }
            statsData.commandUsage[command]++;
            break;
            
          case 'guildCreate':
            // 서버 참가 통계 업데이트
            statsData.serverJoins.push({
              guildId: data.data.id,
              guildName: data.data.name,
              memberCount: data.data.memberCount,
              timestamp: data.timestamp
            });
            break;
            
          case 'guildDelete':
            // 서버 탈퇴 통계 업데이트
            statsData.serverLeaves.push({
              guildId: data.data.id,
              guildName: data.data.name,
              timestamp: data.timestamp
            });
            break;
        }
        
        // 데이터 업데이트 시간 기록
        statsData.lastUpdated = new Date().toISOString();
        
        // 데이터 저장
        saveStatsData();
      }
    } catch (error) {
      console.error('웹소켓 메시지 처리 오류:', error);
    }
  });
  
  // 하루에 한 번 사용자 통계 초기화 및 데이터 백업
  setInterval(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 오늘 데이터가 이미 있는지 확인
    const existingEntry = statsData.dailyActiveUsers.find(entry => entry.date === today);
    
    if (!existingEntry) {
      // 새 날짜 항목 추가 (봇의 상태 요청으로 실제 데이터 업데이트)
      statsData.dailyActiveUsers.push({
        date: today,
        count: 0
      });
      
      // 데이터 저장
      saveStatsData();
      
      // 데이터 백업
      backupStatsData();
    }
  }, 24 * 60 * 60 * 1000); // 24시간마다
}

// 인증 확인 미들웨어
function checkAuth(req, res, next) {
  if (!req.session.isAuthenticated) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  next();
}

// API 라우트 설정
router.get('/', (req, res) => {
  res.json({
    module: 'stats',
    lastUpdated: statsData.lastUpdated
  });
});

// 전체 통계 데이터 제공
router.get('/data', checkAuth, (req, res) => {  
  res.json(statsData);
});

// 명령어 사용 통계 제공
router.get('/commands', checkAuth, (req, res) => {  
  res.json({
    commandUsage: statsData.commandUsage,
    lastUpdated: statsData.lastUpdated
  });
});

// 서버 통계 제공
router.get('/servers', checkAuth, (req, res) => {  
  // 최근 7일 데이터만 제공
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString();
  
  const recentJoins = statsData.serverJoins.filter(entry => entry.timestamp > oneWeekAgoStr);
  const recentLeaves = statsData.serverLeaves.filter(entry => entry.timestamp > oneWeekAgoStr);
  
  res.json({
    serverJoins: recentJoins,
    serverLeaves: recentLeaves,
    lastUpdated: statsData.lastUpdated
  });
});

// 일일 활성 사용자 통계 제공
router.get('/users', checkAuth, (req, res) => {
  // 최근 30일 데이터만 제공
  const recentUsers = statsData.dailyActiveUsers.slice(-30);
  
  res.json({
    dailyActiveUsers: recentUsers,
    lastUpdated: statsData.lastUpdated
  });
});

// 통계 모듈 정보 제공
router.get('/info', (req, res) => {
  res.json({
    name: 'stats',
    description: '봇 사용 통계 및 분석 정보 제공',
    version: '1.0.1',
    endpoints: [
      '/module/stats/data',
      '/module/stats/commands',
      '/module/stats/servers',
      '/module/stats/users',
      '/module/stats/info'
    ]
  });
});