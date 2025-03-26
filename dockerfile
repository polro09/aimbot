FROM node:16-slim

# 작업 디렉토리 생성
WORKDIR /app

# 패키지 설치에 필요한 파일 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci --only=production

# 앱 소스 복사
COPY . .

# 데이터 및 로그 디렉토리 생성
RUN mkdir -p data logs web/data

# 권한 설정
RUN chmod -R 755 /app
RUN chown -R node:node /app

# 보안을 위해 비루트 사용자로 전환
USER node

# 앱 실행
CMD ["node", "main.js"]