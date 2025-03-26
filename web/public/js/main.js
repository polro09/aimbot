document.addEventListener('DOMContentLoaded', function() {
    // 햄버거 메뉴 토글
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
      hamburger.addEventListener('click', function() {
        this.classList.toggle('active');
        navLinks.classList.toggle('active');
      });
    }
    
    // 통계 숫자 애니메이션
    function animateNumber(element, target) {
      const duration = 2000;
      const start = 0;
      const step = timestamp => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = Math.floor(progress * (target - start) + start);
        element.innerText = currentValue.toLocaleString();
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      let startTimestamp = null;
      window.requestAnimationFrame(step);
    }
    
    // 스크롤이 통계 섹션에 도달했을 때 숫자 애니메이션 시작
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const serversCount = document.getElementById('servers-count');
          const usersCount = document.getElementById('users-count');
          const modulesCount = document.getElementById('modules-count');
          const commandsCount = document.getElementById('commands-count');
          
          if (serversCount) animateNumber(serversCount, 120);
          if (usersCount) animateNumber(usersCount, 15000);
          if (modulesCount) animateNumber(modulesCount, 25);
          if (commandsCount) animateNumber(commandsCount, 50);
          
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
      observer.observe(statsSection);
    }
    
    // 웹소켓 연결
    connectWebSocket();
  });
  
  // 웹소켓 연결 및 이벤트 처리
  function connectWebSocket() {
    // 웹소켓 프로토콜(ws/wss) 자동 선택
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = function() {
      console.log('웹소켓 연결됨');
      
      // 봇 상태 요청
      ws.send(JSON.stringify({
        type: 'getStatus'
      }));
    };
    
    ws.onclose = function() {
      console.log('웹소켓 연결 종료됨');
      
      // 재연결 시도
      setTimeout(connectWebSocket, 5000);
    };
    
    ws.onerror = function(error) {
      console.error('웹소켓 오류:', error);
    };
    
    ws.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        
        // 메시지 타입에 따른 처리
        if (data.type === 'botStatus') {
          updateBotStatus(data);
        }
      } catch (error) {
        console.error('웹소켓 메시지 처리 오류:', error);
      }
    };
  }
  
  // 봇 상태 업데이트
  function updateBotStatus(data) {
    // 서버 수 업데이트
    const serversCount = document.getElementById('servers-count');
    if (serversCount && data.guilds) {
      serversCount.textContent = data.guilds.toLocaleString();
    }
    
    // 사용자 수는 별도로 계산하므로 여기서는 처리하지 않음
    
    // 모듈 수 업데이트
    const modulesCount = document.getElementById('modules-count');
    if (modulesCount && data.modules && data.modules.webModules) {
      modulesCount.textContent = data.modules.webModules.length.toLocaleString();
    }
    
    // 명령어 수 업데이트
    const commandsCount = document.getElementById('commands-count');
    if (commandsCount && data.modules && data.modules.commands) {
      commandsCount.textContent = data.modules.commands.length.toLocaleString();
    }
  }