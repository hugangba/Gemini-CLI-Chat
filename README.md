# Gemini CLI Web Chat

一个基于 Gemini CLI 的 Web 聊天界面，支持通过浏览器与 Gemini 模型对话，类似 Grok 的双人对话风格。

A web-based chat interface powered by Gemini CLI, providing a Grok-like conversation experience in the browser.

## 功能亮点 / Features

- 现代聊天 UI（用户消息右对齐、模型消息左对齐、气泡式设计）  
  Modern chat UI (user messages right-aligned, model left-aligned, bubble style)
- 支持 Web 界面切换模型
  Model switching via web UI
- 模型切换后自动持久化（写入文件，下次启动保持）  
  Model selection is persisted to file (survives restarts)
- 前端实时显示当前模型  
  Current model displayed in real-time on frontend
- OpenAI 兼容接口 `/v1/chat/completions`（支持流式/非流式响应）  
  OpenAI-compatible endpoint `/v1/chat/completions` (supports streaming & non-streaming)
- HTTP Basic Auth + Bearer API Key 双重保护  
  Protected by HTTP Basic Auth + Bearer API Key
- 支持长文本输入/输出  
  Handles long inputs and outputs

## 技术栈 / Tech Stack

- 后端：Node.js + Express  
- 前端：Tailwind CSS + 原生 JavaScript  
- Gemini 交互：gemini-cli（命令行工具）  
- 认证：Basic Auth + Bearer Token

## 快速开始 / Quick Start

### 1. 安装依赖 / Install Dependencies

```bash
cd geminicliweb
npm install express cors dotenv
