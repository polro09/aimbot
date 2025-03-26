// config.js
// 환경 변수에서 설정을 로드하고 기본값을 제공하는 설정 모듈

require('dotenv').config();

// 환경 변수에서 값을 가져오고, 없으면 기본값 사용
const config = {
  // 봇 설정
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  prefix: process.env.PREFIX || '!',

  // 웹 서버 설정
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET || 'aimbot-ad-default-session-secret',
  wsPort: parseInt(process.env.WS_PORT || '8080'),
  webPort: parseInt(process.env.WEB_PORT || '3000'),
  domain: process.env.DOMAIN || 'localhost',

  // 환경 설정
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

// 필수 환경 변수 확인
const requiredEnvVars = ['BOT_TOKEN', 'CLIENT_ID', 'ADMIN_PASSWORD', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('필수 환경 변수가 설정되지 않았습니다:');
  missingEnvVars.forEach(varName => {
    console.error(`- ${varName}`);
  });
  console.error('.env 파일을 확인하거나 환경 변수를 설정해주세요.');
  process.exit(1);
}

module.exports = config;