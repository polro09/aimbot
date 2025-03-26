const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 로그 디렉토리 확인 및 생성
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 현재 날짜를 파일명에 포함하는 포맷 함수
const getLogFileName = (type) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return path.join(logDir, `${type}-${year}-${month}-${day}.log`);
};

// 커스텀 로그 포맷
const customFormat = winston.format.printf(({ level, message, timestamp, context }) => {
  return `[${timestamp}] [${level.toUpperCase()}] ${context ? `[${context}] ` : ''}${message}`;
});

// Winston 로거 생성
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  defaultMeta: { service: 'aimbot-ad' },
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    // info 레벨 로그 파일
    new winston.transports.File({ 
      filename: getLogFileName('info'),
      level: 'info'
    }),
    // error 레벨 로그 파일
    new winston.transports.File({ 
      filename: getLogFileName('error'),
      level: 'error'
    }),
    // 모든 레벨 로그 파일
    new winston.transports.File({ 
      filename: getLogFileName('combined')
    })
  ]
});

// 로거 래퍼 함수 (컨텍스트 추가 가능)
const log = {
  info: (message, context) => {
    logger.info(message, { context });
  },
  error: (message, error, context) => {
    let formattedMessage = message;
    if (error) {
      formattedMessage += `: ${error.message}`;
      if (error.stack) {
        formattedMessage += `\n${error.stack}`;
      }
    }
    logger.error(formattedMessage, { context });
  },
  warn: (message, context) => {
    logger.warn(message, { context });
  },
  debug: (message, context) => {
    logger.debug(message, { context });
  },
  // 웹 요청 로깅용
  http: (message, context) => {
    logger.http(message, { context });
  }
};

// 로그 파일 정리 함수 (30일 이상 지난 로그 파일 삭제)
const cleanupLogs = () => {
  fs.readdir(logDir, (err, files) => {
    if (err) {
      log.error('로그 디렉토리 읽기 실패', err, 'LogCleanup');
      return;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    files.forEach(file => {
      if (!file.endsWith('.log')) return;

      const filePath = path.join(logDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          log.error(`파일 상태 확인 실패: ${file}`, err, 'LogCleanup');
          return;
        }

        if (stats.mtime < thirtyDaysAgo) {
          fs.unlink(filePath, err => {
            if (err) {
              log.error(`로그 파일 삭제 실패: ${file}`, err, 'LogCleanup');
              return;
            }
            log.info(`오래된 로그 파일 삭제됨: ${file}`, 'LogCleanup');
          });
        }
      });
    });
  });
};

// 주기적으로 로그 파일 정리 (매일)
setInterval(cleanupLogs, 24 * 60 * 60 * 1000);

module.exports = log;