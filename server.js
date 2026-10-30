const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 10000;

// 透明转发至 Google 官方接口
app.use('/', createProxyMiddleware({
  target: 'https://generativelanguage.googleapis.com',
  changeOrigin: true,
  ws: true,
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('Host', 'generativelanguage.googleapis.com');
  }
}));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
