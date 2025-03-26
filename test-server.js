const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('테스트 서버가 작동 중입니다!');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`테스트 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});