const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const SURVEY_FILE = path.join(__dirname, 'surveyResults.json');

app.use(cors());
app.use(express.json());

// ✅ 이메일 인증 코드 저장소
const emailCodes = {};

// ✅ Nodemailer 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'daesin102163@gmail.com',
    pass: 'vsyv ollj jnjc wsdd'
  }
});

// ✅ 이메일 중복 확인 API
app.get('/api/check-email', (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send('이메일이 필요합니다.');

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch {
      users = [];
    }
  }

  const exists = users.some(u => u.email === email);
  res.json({ exists });
});

// ✅ 회원가입 API
app.post('/api/signup', (req, res) => {
  const user = req.body;
  console.log('회원가입 데이터:', user);

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch {
      users = [];
    }
  }

  const exists = users.some(u => u.email === user.email);
  if (exists) {
    return res.status(400).send('이미 가입된 이메일입니다.');
  }

  users.push(user);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  res.json({ message: `${user.name}님, 회원가입이 완료되었습니다.` });
});

// ✅ 로그인 API
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!fs.existsSync(USERS_FILE)) {
    return res.json({ success: false, message: '가입된 사용자가 없습니다.' });
  }

  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    res.json({ success: true, message: `${user.name}님 환영합니다!`, user });
  } else {
    res.json({ success: false, message: '이메일 또는 비밀번호가 틀렸습니다.' });
  }
});

// ✅ 사용자 정보 수정 API
app.post('/api/updateUser', (req, res) => {
  const updatedUser = req.body;

  if (!fs.existsSync(USERS_FILE)) {
    return res.status(400).json({ message: '사용자 파일이 없습니다.' });
  }

  let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const index = users.findIndex(u => u.email === updatedUser.email);

  if (index === -1) {
    return res.status(404).json({ message: '해당 사용자를 찾을 수 없습니다.' });
  }

  const existing = users[index];
  updatedUser.password = updatedUser.password || existing.password;

  users[index] = updatedUser;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

  res.json({ message: '사용자 정보가 서버에 저장되었습니다.' });
});

// ✅ 사용자 탈퇴 API
app.post('/api/deleteUser', (req, res) => {
  const { email } = req.body;

  if (!fs.existsSync(USERS_FILE)) {
    return res.status(400).json({ message: '사용자 파일이 없습니다.' });
  }

  let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const filteredUsers = users.filter(u => u.email !== email);

  if (filteredUsers.length === users.length) {
    return res.status(404).json({ message: '해당 사용자를 찾을 수 없습니다.' });
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(filteredUsers, null, 2), 'utf8');

  res.json({ message: '회원 탈퇴가 완료되었습니다.' });
});

// ✅ 인증 코드 전송 API
app.post('/api/send-code', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send('이메일이 필요합니다.');

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  emailCodes[email] = code;

  transporter.sendMail({
    from: 'daesin102163@gmail.com',
    to: email,
    subject: 'SkinGenius 이메일 인증 코드',
    text: `안녕하세요, 인증 코드는 ${code} 입니다.`
  }, (err, info) => {
    if (err) {
      console.error('이메일 전송 실패:', err);
      res.status(500).send('이메일 전송 실패');
    } else {
      console.log('이메일 전송 성공:', info.response);
      res.send('인증 코드 전송 완료');
    }
  });
});

// ✅ 인증 코드 확인 API
app.post('/api/verify-email', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).send('이메일과 코드가 필요합니다.');

  if (emailCodes[email] === code) {
    delete emailCodes[email];
    res.json({ success: true, message: '이메일 인증 성공' });
  } else {
    res.status(400).json({ success: false, message: '인증 코드가 일치하지 않습니다.' });
  }
});

// ✅ 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 루트 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 화장품 검색 API
app.get('/api/search', (req, res) => {
  const { type, concern } = req.query;
  const products = JSON.parse(fs.readFileSync('products.json', 'utf8'));
  const filtered = products.filter(p => {
    const matchType = type ? p.type === type : true;
    const matchConcern = concern ? p.concerns.includes(concern) : true;
    return matchType && matchConcern;
  });
  res.json(filtered);
});

// ✅ 설문 결과 저장 API (POST)
app.post('/api/survey', (req, res) => {
  const newResult = req.body;

  if (!newResult.userId) {
    return res.status(400).json({ error: 'userId가 필요합니다.' });
  }

  let surveyData = [];
  if (fs.existsSync(SURVEY_FILE)) {
    try {
      surveyData = JSON.parse(fs.readFileSync(SURVEY_FILE, 'utf8'));
    } catch {
      surveyData = [];
    }
  }

  // 기존 결과 제거 후 추가
  const filtered = surveyData.filter(item => item.userId !== newResult.userId);
  filtered.push(newResult);

  fs.writeFileSync(SURVEY_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  res.json({ success: true, message: '설문 결과 저장 완료' });
});

// ✅ 설문 결과 조회 API (GET)
app.get('/api/survey', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId 누락' });

  let surveyData = [];
  if (fs.existsSync(SURVEY_FILE)) {
    try {
      surveyData = JSON.parse(fs.readFileSync(SURVEY_FILE, 'utf8'));
    } catch {
      return res.status(500).json({ error: '설문 데이터 파일 오류' });
    }
  }

  const result = surveyData.find(item => item.userId === userId);
  res.json(result || null);
});


app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
