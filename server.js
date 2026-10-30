const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 10000;

// 目标映射路由表
const ROUTE_TARGETS = {
  '/antigravity': 'cloudcode-pa.googleapis.com',
  '/gemini': 'generativelanguage.googleapis.com'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname || '';

  // 1. 健康检查路由
  if (pathname === '/' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('CPA Native Reverse Proxy is running and healthy.\n');
  }

  // 2. 匹配路由前缀
  let targetHost = null;
  let targetPath = req.url;

  for (const prefix in ROUTE_TARGETS) {
    if (pathname.startsWith(prefix)) {
      targetHost = ROUTE_TARGETS[prefix];
      // 重写路径：去掉 /antigravity 或 /gemini 前缀
      targetPath = req.url.slice(prefix.length) || '/';
      break;
    }
  }

  // 未命中已知路由
  if (!targetHost) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found: Unknown Gateway Route\n');
  }

  // 3. 构建向上游 Google 的转发请求
  const newHeaders = { ...req.headers };
  newHeaders['host'] = targetHost;
  // 避免 gzip/br 解码问题，保证纯净双向流式透传
  delete newHeaders['content-length'];

  const options = {
    hostname: targetHost,
    port: 443,
    path: targetPath,
    method: req.method,
    headers: newHeaders
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // 拷贝上游响应头
    const resHeaders = { ...proxyRes.headers };
    // 确保 CORS 开放
    resHeaders['access-control-allow-origin'] = '*';
    res.writeHead(proxyRes.statusCode, resHeaders);
    // 双向流式透传（打字机 SSE 流式无缓冲直接吐回本地）
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] -> ${targetHost}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Gateway', detail: err.message }));
    }
  });

  // 透传客户端的请求体到 Google
  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`[CPA Gateway] Zero-dependency reverse proxy listening on port ${PORT}`);
});
