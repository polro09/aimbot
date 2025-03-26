const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 통계 데이터를 저장할 파일 경로
const statsFilePath = path.join(__dirname, '..', 'data', 'stats.json');

// 통계 데이터 기본값
let statsData = {
  commandUsage: {},
  dailyActiveUsers: [],
  serverJoins: [],
  serverLeaves: [],
  lastUpdated: new Date().toISOString()
};

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
  // 데이터 디렉토리 확인 및 생성
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // 데이터 파일 저장
  fs.writeFileSync(statsFilePath, JSON.stringify(statsData, null, 2));
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
  
  // 하루에 한 번 사용자 통계 초기화
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
    }
  }, 24 * 60 * 60 * 1000); // 24시간마다
}

// API 라우트 설정
router.get('/', (req, res) => {
  res.json({
    module: 'stats',
    lastUpdated: statsData.lastUpdated
  });
});

// 전체 통계 데이터 제공
router.get('/data', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  
  res.json(statsData);
});

// 명령어 사용 통계 제공
router.get('/commands', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  
  res.json({
    commandUsage: statsData.commandUsage,
    lastUpdated: statsData.lastUpdated
  });
});

// 서버 통계 제공
router.get('/servers', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  
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

// 통계 모듈 정보 제공
router.get('/info', (req, res) => {
  res.json({
    name: 'stats',
    description: '봇 사용 통계 및 분석 정보 제공',
    version: '1.0.0',
    endpoints: [
      '/module/stats/data',
      '/module/stats/commands',
      '/module/stats/servers',
      '/module/stats/info'
    ]
  });
});

// 웹 모듈 요청 처리 함수
async function handleRequest(action, params, client) {
  switch (action) {
    case 'getCommandStats':
      return {
        commandUsage: statsData.commandUsage,
        lastUpdated: statsData.lastUpdated
      };
      
    case 'getServerStats':
      return {
        serverCount: client.guilds.cache.size,
        userCount: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        serverJoins: statsData.serverJoins.length,
        serverLeaves: statsData.serverLeaves.length,
        lastUpdated: statsData.lastUpdated
      };
      
    case 'resetStats':
      // 관리자 권한 확인 (params.adminKey 검증)
      if (params.adminKey !== 'admin-secret-key') {
        throw new Error('권한이 없습니다.');
      }
      
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
        message: '통계가 초기화되었습니다.'
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
};
