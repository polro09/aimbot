// 봇 상태 표시기 업데이트
function updateBotStatusIndicator(status) {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    if (statusIndicator && statusText) {
      // 클래스 초기화
      statusIndicator.classList.remove('online', 'offline', 'idle');
      
      // 상태에 따른 클래스 추가
      statusIndicator.classList.add(status);
      
      // 상태 텍스트 업데이트
      switch (status) {
        case 'online':
          statusText.textContent = '온라인';
          break;
        case 'offline':
          statusText.textContent = '오프라인';
          break;
        case 'idle':
          statusText.textContent = '대기 중';
          break;
        default:
          statusText.textContent = '알 수 없음';
      }
    }
  }
  
  // 봇 상태 처리
  function handleBotStatus(data) {
    // 서버 수 업데이트
    const serversCount = document.getElementById('servers-count');
    if (serversCount && data.guilds) {
      serversCount.textContent = data.guilds.toLocaleString();
    }
    
    // 유저 수 업데이트
    const usersCount = document.getElementById('users-count');
    if (usersCount && data.users) {
      usersCount.textContent = data.users.toLocaleString();
    } else if (usersCount) {
      usersCount.textContent = '계산 중...';
    }
    
    // 메모리 사용량 업데이트
    const memoryUsage = document.getElementById('memory-usage');
    if (memoryUsage && data.memoryUsage) {
      const memory = Math.round(data.memoryUsage / 1024 / 1024);
      memoryUsage.textContent = `${memory} MB`;
    }
    
    // 업타임 업데이트
    const uptime = document.getElementById('uptime');
    if (uptime && data.uptime) {
      const days = Math.floor(data.uptime / (24 * 60 * 60));
      const hours = Math.floor((data.uptime % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((data.uptime % (60 * 60)) / 60);
      
      uptime.textContent = `${days}일 ${hours}시간 ${minutes}분`;
    }
    
    // 활성 모듈 목록 업데이트
    updateModulesList(data);
  }
  
  // 모듈 목록 업데이트
  function updateModulesList(data) {
    const activeModules = document.getElementById('active-modules');
    if (activeModules && data.modules && data.modules.webModules) {
      if (data.modules.webModules.length > 0) {
        activeModules.innerHTML = '';
        
        data.modules.webModules.forEach(module => {
          const moduleItem = document.createElement('div');
          moduleItem.className = 'module-item';
          moduleItem.innerHTML = `
            <div class="module-info">
              <div class="module-icon">
                <i class="fas fa-puzzle-piece"></i>
              </div>
              <div class="module-name">${module}</div>
            </div>
            <div class="module-actions">
              <button title="설정" data-module="${module}" class="module-settings">
                <i class="fas fa-cog"></i>
              </button>
              <button title="비활성화" data-module="${module}" class="module-toggle">
                <i class="fas fa-power-off"></i>
              </button>
            </div>
          `;
          
          activeModules.appendChild(moduleItem);
        });
        
        // 모듈 버튼 이벤트 설정
        setupModuleActions();
      } else {
        activeModules.innerHTML = '<div class="empty-state">활성화된 모듈이 없습니다.</div>';
      }
    }
  }
  
  // 모듈 버튼 이벤트 설정
  function setupModuleActions() {
    // 모듈 설정 버튼
    document.querySelectorAll('.module-settings').forEach(button => {
      button.addEventListener('click', function() {
        const moduleName = this.getAttribute('data-module');
        alert(`${moduleName} 모듈 설정 기능은 개발 중입니다.`);
      });
    });
    
    // 모듈 토글 버튼
    document.querySelectorAll('.module-toggle').forEach(button => {
      button.addEventListener('click', function() {
        const moduleName = this.getAttribute('data-module');
        
        if (window.botWebSocket && window.botWebSocket.readyState === WebSocket.OPEN) {
          window.botWebSocket.send(JSON.stringify({
            type: 'webModule',
            module: moduleName,
            action: 'toggle'
          }));
          
          addLogMessage('모듈', `${moduleName} 모듈 상태 변경 요청됨`);
        }
      });
    });
  }
  
  // 봇 이벤트 처리
  function handleBotEvent(data) {
    // 이벤트 타입과 데이터에 따라 다른 내용 표시
    let eventType = '이벤트';
    let eventMessage = '';
    
    switch (data.eventType) {
      case 'ready':
        eventType = '시스템';
        eventMessage = '봇이 성공적으로 시작되었습니다.';
        break;
      case 'commandExecuted':
        eventType = '명령어';
        eventMessage = `사용자 '${data.data.user}'가 '${data.data.command}' 명령어를 실행했습니다.`;
        break;
      case 'guildCreate':
        eventType = '서버';
        eventMessage = `새 서버 '${data.data.name}'에 봇이 추가되었습니다.`;
        break;
      case 'guildDelete':
        eventType = '서버';
        eventMessage = `서버 '${data.data.name}'에서 봇이 제거되었습니다.`;
        break;
      case 'error':
        eventType = '오류';
        eventMessage = `오류 발생: ${data.data.message}`;
        break;
      default:
        eventMessage = JSON.stringify(data.data);
    }
    
    // 로그 메시지 추가
    addLogMessage(eventType, eventMessage);
  }
  
  // 명령어 응답 처리
  function handleCommandResponse(data) {
    const commandResult = document.getElementById('command-result');
    if (commandResult) {
      commandResult.style.display = 'block';
      
      if (data.status === 'success') {
        commandResult.className = 'command-result success';
        commandResult.textContent = `명령어 '${data.command}' 실행 성공: ${data.message}`;
        addLogMessage('명령어', `'${data.command}' 명령어가 성공적으로 실행되었습니다.`);
      } else {
        commandResult.className = 'command-result error';
        commandResult.textContent = `명령어 '${data.command}' 실행 실패: ${data.message}`;
        addLogMessage('오류', `'${data.command}' 명령어 실행 중 오류가 발생했습니다.`);
      }
    }
  }
  
  // 웹 모듈 응답 처리
  function handleWebModuleResponse(data) {
    console.log('웹 모듈 응답:', data);
    
    if (data.status === 'success') {
      addLogMessage('모듈', `'${data.module}' 모듈의 '${data.action}' 액션이 성공적으로 처리되었습니다.`);
      
      // 상태 새로고침을 위한 요청
      if (window.botWebSocket && window.botWebSocket.readyState === WebSocket.OPEN) {
        window.botWebSocket.send(JSON.stringify({
          type: 'getStatus'
        }));
      }
    } else {
      addLogMessage('오류', `'${data.module}' 모듈의 '${data.action}' 액션 처리 중 오류가 발생했습니다: ${data.message}`);
    }
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    // 사이드바 토글
    const toggleSidebar = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleSidebar) {
      toggleSidebar.addEventListener('click', function() {
        sidebar.classList.toggle('open');
      });
    }
    
    // 사용자 메뉴 드롭다운
    const userMenuButton = document.querySelector('.user-menu-button');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (userMenuButton && userDropdown) {
      userMenuButton.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });
      
      // 외부 클릭 시 드롭다운 닫기
      document.addEventListener('click', function() {
        if (userDropdown.classList.contains('show')) {
          userDropdown.classList.remove('show');
        }
      });
    }
    
    // 상태 새로고침 버튼
    const refreshStatus = document.getElementById('refresh-status');
    if (refreshStatus) {
      refreshStatus.addEventListener('click', function() {
        this.classList.add('rotating');
        
        // 웹소켓으로 상태 요청
        if (window.botWebSocket && window.botWebSocket.readyState === WebSocket.OPEN) {
          window.botWebSocket.send(JSON.stringify({
            type: 'getStatus'
          }));
          
          // 로그 업데이트
          addLogMessage('시스템', '봇 상태 새로고침 요청됨');
        }
        
        // 회전 애니메이션 종료
        setTimeout(() => {
          this.classList.remove('rotating');
        }, 1000);
      });
    }
    
    // 명령어 실행 버튼
    const executeCommand = document.getElementById('execute-command');
    const commandInput = document.getElementById('command-input');
    const commandParams = document.getElementById('command-params');
    const commandResult = document.getElementById('command-result');
    
    if (executeCommand && commandInput && commandParams && commandResult) {
      executeCommand.addEventListener('click', function() {
        const command = commandInput.value.trim();
        if (!command) {
          alert('명령어를 입력해주세요.');
          commandInput.focus();
          return;
        }
        
        let params = {};
        try {
          if (commandParams.value.trim()) {
            params = JSON.parse(commandParams.value);
          }
        } catch (error) {
          alert('파라미터 JSON 형식이 올바르지 않습니다.');
          commandParams.focus();
          return;
        }
        
        // 명령어 실행 요청
        if (window.botWebSocket && window.botWebSocket.readyState === WebSocket.OPEN) {
          window.botWebSocket.send(JSON.stringify({
            type: 'command',
            command: command,
            params: params
          }));
          
          // 로그 업데이트
          addLogMessage('명령어', `'${command}' 명령어 실행 요청됨`);
          
          // 로딩 상태 표시
          commandResult.className = 'command-result';
          commandResult.style.display = 'block';
          commandResult.textContent = '명령어 실행 중...';
        } else {
          commandResult.className = 'command-result error';
          commandResult.style.display = 'block';
          commandResult.textContent = '봇과의 연결이 끊어졌습니다. 페이지를 새로고침해주세요.';
        }
      });
    }
    
    // 페이지 로드 시 초기 로그 메시지 추가
    addLogMessage('시스템', '대시보드가 로드되었습니다.');
    
    // 웹소켓 연결
    connectWebSocket();
  
  // 웹소켓 연결 및 이벤트 처리
  function connectWebSocket() {
    // 웹소켓 프로토콜(ws/wss) 자동 선택
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/ws`;
    
    console.log(`웹소켓 연결 시도: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    window.botWebSocket = ws;
    
    ws.onopen = function() {
      console.log('웹소켓 연결됨');
      updateBotStatusIndicator('online');
      addLogMessage('시스템', '웹소켓 서버에 연결되었습니다.');
      
      // 봇 상태 요청
      ws.send(JSON.stringify({
        type: 'getStatus'
      }));
    };
    
    ws.onclose = function() {
      console.log('웹소켓 연결 종료됨');
      updateBotStatusIndicator('offline');
      addLogMessage('시스템', '웹소켓 서버와 연결이 끊어졌습니다. 재연결 시도 중...');
      
      // 재연결 시도
      setTimeout(connectWebSocket, 5000);
    };
    
    ws.onerror = function(error) {
      console.error('웹소켓 오류:', error);
      updateBotStatusIndicator('offline');
      addLogMessage('오류', '웹소켓 연결 중 오류가 발생했습니다.');
    };
    
    ws.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        console.log('웹소켓 메시지 수신:', data);
        
        // 메시지 타입에 따른 처리
        if (data.type === 'botStatus') {
          handleBotStatus(data);
          addLogMessage('상태', '봇 상태 정보가 업데이트되었습니다.');
        } else if (data.type === 'botEvent') {
          handleBotEvent(data);
        } else if (data.type === 'commandResponse') {
          handleCommandResponse(data);
        } else if (data.type === 'webModuleResponse') {
          handleWebModuleResponse(data);
        } else if (data.type === 'error') {
          addLogMessage('오류', data.message);
        } else if (data.type === 'connected') {
          addLogMessage('시스템', data.message);
        }
      } catch (error) {
        console.error('웹소켓 메시지 처리 오류:', error);
        addLogMessage('오류', '메시지 처리 중 오류가 발생했습니다.');
      }
    };
  }
  });
  
  // 로그 메시지 추가 함수
  function addLogMessage(type, message) {
    const recentLogs = document.getElementById('recent-logs');
    if (!recentLogs) return;
    
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    logItem.innerHTML = `
      <div class="log-header">
        <div class="log-type">${type}</div>
        <div class="log-time">${timeString}</div>
      </div>
      <div class="log-message">${message}</div>
    `;
    
    // 목록 맨 앞에 추가
    recentLogs.insertBefore(logItem, recentLogs.firstChild);
    
    // 최대 5개 로그만 유지
    while (recentLogs.children.length > 5) {
      recentLogs.removeChild(recentLogs.lastChild);
    }
  }