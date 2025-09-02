const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
const port = 3000;

// 加载 .env 文件
dotenv.config();

// 基本认证中间件
const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.set('WWW-Authenticate', 'Basic realm="Gemini CLI"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const username = auth[0];
  const password = auth[1];

  const validUsername = process.env.AUTH_USERNAME || 'admin';
  const validPassword = process.env.AUTH_PASSWORD || 'your_secure_password';

  if (username === validUsername && password === validPassword) {
    return next();
  } else {
    res.set('WWW-Authenticate', 'Basic realm="Gemini CLI"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
};

app.use(basicAuth);
app.use(express.static('public'));
app.use(express.json());
app.use(cors());

const geminiPath = '/usr/bin/gemini';

app.post('/api/gemini', (req, res) => {
  const userInput = req.body.input;
  console.log('Received input:', userInput);
  console.log('Input length:', userInput.length);
  if (!userInput) {
    return res.status(400).json({ error: 'Input is required' });
  }

  // 调试：打印父进程环境变量
  console.log('GEMINI_API_KEY in parent process:', process.env.GEMINI_API_KEY);

  // 确保 GEMINI_API_KEY 存在
  if (!process.env.GEMINI_API_KEY) {
    const errorMsg = 'GEMINI_API_KEY environment variable not found in parent process';
    console.error('Gemini CLI error:', errorMsg);
    fs.appendFileSync('error.log', `${new Date().toISOString()} - Error: ${errorMsg}\n`);
    return res.status(500).json({ error: errorMsg });
  }

  // 使用 stdin 传递输入，避免参数解析问题
  const gemini = spawn(geminiPath, ['-p'], {
    env: {
      ...process.env,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      LANG: 'en_US.UTF-8'
    },
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024 // 10MB 缓冲区
  });

  // 通过 stdin 写入输入
  gemini.stdin.write(userInput);
  gemini.stdin.end();

  let stdout = '';
  let stderr = '';

  gemini.stdout.on('data', (data) => {
    stdout += data.toString();
    console.log('Gemini CLI stdout chunk:', data.toString());
  });

  gemini.stderr.on('data', (data) => {
    stderr += data.toString();
    console.error('Gemini CLI stderr chunk:', data.toString());
  });

  gemini.on('close', (code, signal) => {
    if (code !== 0 || signal) {
      const errorMsg = stderr || `Command failed with code ${code}, signal ${signal}`;
      console.error('Gemini CLI error:', errorMsg, { code, signal });
      fs.appendFileSync('error.log', `${new Date().toISOString()} - Error: ${errorMsg}\n`);
      return res.status(500).json({ error: errorMsg });
    }
    console.log('Gemini CLI output length:', stdout.length);
    res.json({ response: stdout });
  });

  gemini.on('error', (err) => {
    console.error('Spawn error:', err);
    fs.appendFileSync('error.log', `${new Date().toISOString()} - Spawn Error: ${err.message}\n`);
    res.status(500).json({ error: err.message });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://<服务器IP>:${port}`);
});
