const http = require('http');
const net = require('net');
const url = require('url');

const PORT = process.env.PORT || 10000;
// 从环境变量读取账号密码，默认预设为 cpauser / cpapass888
const PROXY_USER = process.env.PROXY_USER || 'cpauser';
const PROXY_PASS = process.env.PROXY_PASS || 'cpapass888';

// 鉴权校验函数
function checkAuth(req) {
  const authHeader = req.headers['proxy-authorization'];
  if (!authHeader) return false;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'basic') return false;
  const creds = Buffer.from(parts[1], 'base64').toString('utf-8').split(':');
  return creds[0] === PROXY_USER && creds[1] === PROXY_PASS;
}

// 统一鉴权失败响应
function sendAuthRequired(res) {
  res.writeHead(407, {
    'Proxy-Authenticate': 'Basic realm="Secure CPA Proxy"',
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end('407 Proxy Authentication Required\n');
}

const server = http.createServer((req, res) => {
  // 健康检查与状态提示（给浏览器访问查看状态）
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('CPA Forward Proxy is running.\n');
  }

  // 1. 普通 HTTP 请求代理校验
  if (!checkAuth(req)) {
    return sendAuthRequired(res);
  }

  const parsedUrl = url.parse(req.url);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 80,
    path: parsedUrl.path,
    method: req.method,
    headers: { ...req.headers }
  };
  delete options.headers['proxy-authorization'];

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Bad Gateway: ${err.message}\n`);
  });

  req.pipe(proxyReq);
});

// 2. HTTPS CONNECT 隧道代理（核心：CPA 访问 Google/反重力必须走的 TLS 穿透通道）
server.on('connect', (req, clientSocket, head) => {
  // 安全校验
  if (!checkAuth(req)) {
    clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Secure CPA Proxy"\r\n\r\n');
    clientSocket.destroy();
    return;
  }

  const [targetHost, targetPort] = req.url.split(':');
  const port = parseInt(targetPort, 10) || 443;

  // 与目标服务器建立原生 TCP 连接（直达 Google）
  const serverSocket = net.connect(port, targetHost, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    // 双向全双工数据管道：本地 CPA 与 Google 之间完全加密直通，零中间篡改
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', () => {
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.destroy();
  });

  clientSocket.on('error', () => {
    serverSocket.destroy();
  });
});

server.listen(PORT, () => {
  console.log(`[CPA Proxy] Secure forward proxy listening on port ${PORT}`);
});
