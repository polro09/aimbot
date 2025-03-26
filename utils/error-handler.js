/**
 * 오류 처리 유틸리티
 */
const logger = require('./logger');

// 일반 오류 처리
function handleError(error, context = 'General') {
  logger.error('오류 발생', error, context);
  
  return {
    success: false,
    message: '오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'production' 
      ? '서버에서 오류가 발생했습니다.' 
      : error.message
  };
}

// 비동기 오류 핸들러 래퍼
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('비동기 오류 발생', error, 'Express');
      next(error);
    });
  };
}

// 디스코드 명령어 오류 처리
function handleCommandError(error, interaction, commandName) {
  logger.error(`명령어 오류: ${commandName}`, error, 'DiscordCommand');
  
  // 응답이 아직 전송되지 않았다면
  if (interaction.deferred || interaction.replied) {
    interaction.editReply({ 
      content: '명령을 처리하는 중 오류가 발생했습니다.', 
      ephemeral: true 
    }).catch(e => {
      logger.error('오류 응답 전송 실패', e, 'DiscordCommand');
    });
  } else {
    interaction.reply({ 
      content: '명령을 처리하는 중 오류가 발생했습니다.', 
      ephemeral: true 
    }).catch(e => {
      logger.error('오류 응답 전송 실패', e, 'DiscordCommand');
    });
  }
  
  // 필요 시 여기에 추가 오류 처리 로직을 구현할 수 있음
  // 예: 심각한 오류를 개발자에게 알림
}

// API 오류 응답
function apiError(res, message, statusCode = 500, details = null) {
  const errorResponse = {
    success: false,
    message: message || '서버 오류가 발생했습니다.',
    timestamp: new Date().toISOString()
  };
  
  if (details && process.env.NODE_ENV !== 'production') {
    errorResponse.details = details;
  }
  
  return res.status(statusCode).json(errorResponse);
}

// 웹소켓 오류 처리
function handleWSError(ws, error, context = 'WebSocket') {
  logger.error('웹소켓 오류', error, context);
  
  if (ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify({
      type: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? '오류가 발생했습니다.' 
        : error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

// 오류 코드별 메시지
const errorMessages = {
  UNKNOWN: '알 수 없는 오류가 발생했습니다.',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
  UNAUTHORIZED: '인증이 필요합니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
  BAD_REQUEST: '잘못된 요청입니다.',
  INVALID_INPUT: '유효하지 않은 입력입니다.',
  RATE_LIMITED: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도하세요.',
  INTERNAL_ERROR: '내부 서버 오류가 발생했습니다.',
  DATABASE_ERROR: '데이터베이스 오류가 발생했습니다.',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  DISCORD_API_ERROR: 'Discord API 오류가 발생했습니다.',
};

// 커스텀 오류 클래스
class AppError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message || errorMessages[code] || errorMessages.UNKNOWN);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

module.exports = {
  handleError,
  asyncHandler,
  handleCommandError,
  apiError,
  handleWSError,
  errorMessages,
  AppError
};