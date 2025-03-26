/**
 * 보안 관련 유틸리티 함수
 */
const crypto = require('crypto');

// CSRF 토큰 생성
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

// API 키 생성
function generateAPIKey(userId, secret) {
  const timestamp = Date.now();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${userId}-${timestamp}`);
  return `${userId}.${timestamp}.${hmac.digest('hex')}`;
}

// API 키 검증
function validateAPIKey(apiKey, secret) {
  try {
    const [userId, timestamp, hash] = apiKey.split('.');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${userId}-${timestamp}`);
    const expectedHash = hmac.digest('hex');
    
    // 해시가 일치하는지 확인
    if (hash !== expectedHash) {
      return false;
    }
    
    // 키가 만료되었는지 확인 (30일)
    const keyTime = new Date(parseInt(timestamp));
    const now = new Date();
    const daysDiff = (now - keyTime) / (1000 * 60 * 60 * 24);
    
    return daysDiff <= 30;
  } catch (error) {
    return false;
  }
}

// 비밀번호 해싱
function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return {
    salt,
    hash
  };
}

// 비밀번호 검증
function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt);
  return hash === storedHash;
}

// 데이터 암호화
function encryptData(data, key) {
  if (!key || typeof data !== 'string') {
    throw new Error('유효한 데이터와 키가 필요합니다.');
  }
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

// 데이터 복호화
function decryptData(encryptedData, iv, key) {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('데이터 복호화 실패');
  }
}

// 암호화 키 생성
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

// XSS 방지를 위한 텍스트 정화
function sanitizeText(text) {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

module.exports = {
  generateCSRFToken,
  generateAPIKey,
  validateAPIKey,
  hashPassword,
  verifyPassword,
  encryptData,
  decryptData,
  generateEncryptionKey,
  sanitizeText
};