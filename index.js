const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
const port = 3000;

// 加载 .env 文件
dotenv.config();

// 基本认证中间件（原有端点使用）
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
const modelFile = './current-model.txt';  // 文件存储当前模型

// 启动时检查并设置默认模型 gemini-2.5-pro
const defaultModel = 'gemini-2.5-pro';

if (!fs.existsSync(modelFile)) {
  console.log('Model file not found, setting default model...');
  const child = spawn(geminiPath, ['--model', defaultModel], {
    stdio: 'pipe',
    env: process.env
  });

  child.stdin.write('ok\n');
  child.stdin.end();

  child.on('close', (code) => {
    if (code === 0) {
      fs.writeFileSync(modelFile, defaultModel);
      console.log(`Default model set to ${defaultModel} and saved to file.`);
    } else {
      console.error('Failed to set default model on startup');
    }
  });
} else {
  console.log('Model file exists, current model:', fs.readFileSync(modelFile, 'utf8').trim());
}

// 原有端点：/api/gemini（使用基本认证）
app.post('/api/gemini', basicAuth, (req, res) => {
  const userInput = req.body.input;
  console.log('Received input:', userInput);
  console.log('Input length:', userInput.length);
  if (!userInput) {
    return res.status(400).json({ error: 'Input is required' });
  }

  console.log('GEMINI_API_KEY in parent process:', process.env.GEMINI_API_KEY ? 'present' : 'missing');

  if (!process.env.GEMINI_API_KEY) {
    const errorMsg = 'GEMINI_API_KEY environment variable not found in parent process';
    console.error('Gemini CLI error:', errorMsg);
    fs.appendFileSync('error.log', `${new Date().toISOString()} - Error: ${errorMsg}\n`);
    return res.status(500).json({ error: errorMsg });
  }

  const gemini = spawn(geminiPath, [userInput], {
    env: {
      ...process.env,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      LANG: 'en_US.UTF-8'
    },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024
  });

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

// 新增端点：切换模型（使用基本认证，成功后更新文件）
app.post('/api/switch-model', basicAuth, (req, res) => {
  const { model } = req.body;

  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'model 参数必须是字符串' });
  }

  // 支持的模型白名单
  const allowedModels = [
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ];

  if (!allowedModels.includes(model)) {
    return res.status(400).json({ 
      error: `不支持的模型。支持的模型：${allowedModels.join(', ')}` 
    });
  }

  try {
    const child = spawn(geminiPath, ['--model', model], {
      stdio: 'pipe',
      env: process.env
    });

    child.stdin.write('ok\n');
    child.stdin.end();

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { errorOutput += data.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`切换模型失败: ${errorOutput}`);
        return res.status(500).json({ 
          error: '切换模型失败',
          details: errorOutput.trim() || '未知错误'
        });
      }

      // 切换成功，更新文件
      fs.writeFileSync(modelFile, model);
      console.log(`模型切换成功并保存到文件: ${model}`);

      res.json({ 
        success: true,
        message: `已将默认模型切换至 ${model}`,
        currentModel: model
      });
    });

    child.on('error', (err) => {
      console.error('执行 gemini --model 失败:', err);
      res.status(500).json({ error: '执行命令失败', details: err.message });
    });
  } catch (err) {
    console.error('切换模型异常:', err);
    res.status(500).json({ error: '服务器内部错误', details: err.message });
  }
});

// 新增端点：获取当前模型（从文件读取）
app.get('/api/current-model', basicAuth, (req, res) => {
  try {
    if (fs.existsSync(modelFile)) {
      const currentModel = fs.readFileSync(modelFile, 'utf8').trim();
      res.json({ currentModel });
    } else {
      res.json({ currentModel: defaultModel });
    }
  } catch (err) {
    console.error('读取模型文件失败:', err);
    res.status(500).json({ error: '读取当前模型失败', details: err.message });
  }
});

// OpenAI 兼容端点（使用 API Key 认证，支持流式/非流式）
app.post('/v1/chat/completions', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'API Key authentication required' });
  }

  const apiKey = authHeader.split(' ')[1];
  const validApiKey = process.env.API_KEY;

  if (apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Invalid API Key' });
  }

  const { messages, model = 'gemini-pro', stream = false } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const userMessage = messages.filter(m => m.role === 'user').pop();
  const prompt = userMessage ? userMessage.content : '';

  if (!prompt) {
    return res.status(400).json({ error: 'User message is required in messages array' });
  }

  console.log('Received OpenAI-compatible request:', { prompt, model, stream });

  const gemini = spawn(geminiPath, [prompt], {
    env: {
      ...process.env,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      LANG: 'en_US.UTF-8'
    },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024
  });

  let output = '';
  let errorOutput = '';

  gemini.stdout.on('data', (data) => output += data.toString());
  gemini.stderr.on('data', (data) => errorOutput += data.toString());

  gemini.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: errorOutput || 'Gemini CLI failed' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const chunks = output.match(/.{1,100}/g) || [output];
      chunks.forEach((chunk, index) => {
        const data = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model,
          choices: [{
            index: 0,
            delta: { role: 'assistant', content: chunk },
            finish_reason: index === chunks.length - 1 ? 'stop' : null
          }]
        };
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      });
      res.write(`data: [DONE]\n\n`);
      res.end();
    } else {
      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: output },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: prompt.length, completion_tokens: output.length, total_tokens: prompt.length + output.length }
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://<服务器IP>:${port}`);
});
