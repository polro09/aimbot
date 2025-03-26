const { ActivityType } = require('discord.js');
const os = require('os');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    const botTag = client.user.tag;
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const channelCount = client.channels.cache.size;
    
    // 상세 시작 로그
    console.log('='.repeat(50));
    console.log(`봇 시작됨: ${botTag}`);
    console.log(`서버 수: ${guildCount}`);
    console.log(`유저 수: ${userCount}`);
    console.log(`채널 수: ${channelCount}`);
    
    // 시스템 정보
    const memoryUsage = process.memoryUsage();
    const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
    const usedMemoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    console.log(`시스템 메모리: ${freeMemoryMB}MB 사용 가능 / ${totalMemoryMB}MB 전체`);
    console.log(`봇 메모리 사용량: ${usedMemoryMB}MB`);
    console.log(`Node.js 버전: ${process.version}`);
    console.log(`운영체제: ${os.type()} ${os.release()}`);
    console.log('='.repeat(50));
    
    // 상태 메시지 설정
    const activities = [
      {
        name: `${guildCount}개 서버 관리 중`,
        type: ActivityType.Watching
      },
      {
        name: `${userCount}명의 유저와 함께`,
        type: ActivityType.Playing
      },
      {
        name: `/help로 도움말`,
        type: ActivityType.Listening
      },
      {
        name: `AIMBOT.AD v1.1.0`,
        type: ActivityType.Playing
      }
    ];
    
    let activityIndex = 0;
    
    // 초기 상태 설정
    client.user.setPresence({
      activities: [activities[activityIndex]],
      status: 'online'
    });
    
    // 상태 메시지 주기적 변경
    setInterval(() => {
      activityIndex = (activityIndex + 1) % activities.length;
      client.user.setPresence({
        activities: [activities[activityIndex]],
        status: 'online'
      });
    }, 5 * 60 * 1000); // 5분마다 변경
    
    // 메모리 사용량 모니터링 및 최적화
    setInterval(() => {
      const currentMemoryUsage = process.memoryUsage();
      const currentUsedMemoryMB = Math.round(currentMemoryUsage.heapUsed / 1024 / 1024);
      
      console.log(`메모리 사용량: ${currentUsedMemoryMB}MB`);
      
      // 메모리 사용량이 너무 높으면 가비지 컬렉션 강제 실행
      if (currentUsedMemoryMB > 500) { // 예: 500MB 이상
        console.log('높은 메모리 사용량 감지, 가비지 컬렉션 강제 실행 시도');
        try {
          if (global.gc) {
            global.gc();
            console.log('가비지 컬렉션 강제 실행 완료');
          }
        } catch (e) {
          console.log('가비지 컬렉션 강제 실행 불가 (--expose-gc 플래그 없음)');
        }
      }
    }, 30 * 60 * 1000); // 30분마다 체크
  }
};