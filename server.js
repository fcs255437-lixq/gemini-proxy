const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 10000;

// 健康检查与状态提示
app.get(['/', '/health'], (req, res) => {
  res.status(200).send('CPA Reverse Proxy is running and healthy.\n');
});

// 1. Google 反重力官方端点 (cloudcode-pa.googleapis.com)
app.use('/antigravity', createProxyMiddleware({
  target: 'https://cloudcode-pa.googleapis.com',
  changeOrigin: true,
  pathRewrite: {
    '^/antigravity': ''
  },
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('Host', 'cloudcode-pa.googleapis.com');
  }
}));

// 2. Google Gemini / AIStudio 端点 (generativelanguage.googleapis.com)
app.use('/gemini', createProxyMiddleware({
  target: 'https://generativelanguage.googleapis.com',
  changeOrigin: true,
  pathRewrite: {
    '^/gemini': ''
  },
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('Host', 'generativelanguage.googleapis.com');
  }
}));

app.listen(PORT, () => {
  console.log(`[CPA Proxy] Gateway running on port ${PORT}`);
});
