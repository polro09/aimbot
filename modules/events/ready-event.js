module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`${client.user.tag}로 로그인 완료!`);
    console.log(`${client.guilds.cache.size}개의 서버에 참여 중`);
    
    // 상태 메시지 설정
    client.user.setPresence({
      activities: [
        {
          name: `${client.guilds.cache.size}개 서버 관리 중`,
          type: 3 // WATCHING
        }
      ],
      status: 'online'
    });
    
    // 서버 통계 주기적 업데이트
    setInterval(() => {
      client.user.setPresence({
        activities: [
          {
            name: `${client.guilds.cache.size}개 서버 관리 중`,
            type: 3 // WATCHING
          }
        ],
        status: 'online'
      });
    }, 60 * 60 * 1000); // 1시간마다 업데이트
    
    // 메모리 사용량 로깅
    const memoryUsage = process.memoryUsage();
    console.log(`메모리 사용량: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  }
};
