const http = require('http');
const net = require('net');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Render CPA WebSocket Gateway is active and running.\n');
});

// 创建标准 WebSocket 服务器
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  let targetSocket = null;

  // 客户端第一帧发送目标地址: "host:port"，如 "daily-cloudcode-pa.googleapis.com:443"
  ws.once('message', (message) => {
    let target = message.toString().trim();
    let [host, port] = target.split(':');
    port = parseInt(port, 10) || 443;

    if (!host) {
      ws.close(1008, 'Invalid target');
      return;
    }

    // 建立与目标的真实 TCP 连接
    targetSocket = net.connect(port, host, () => {
      // 确认连接成功，告知本地客户端
      ws.send(Buffer.from([0x01])); // 0x01 表示 OK

      // 之后收到的所有 WebSocket 二进制帧直接转发给目标
      ws.on('message', (data) => {
        if (targetSocket && !targetSocket.destroyed) {
          targetSocket.write(data);
        }
      });
    });

    // 目标发回的所有 TCP 数据直接打包成 WebSocket 帧发回客户端
    targetSocket.on('data', (chunk) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(chunk);
      }
    });

    targetSocket.on('error', (err) => {
      console.error(`[TCP Error] -> ${host}:${port}:`, err.message);
      ws.close(1011, err.message);
    });

    targetSocket.on('close', () => {
      ws.close();
    });

    ws.on('close', () => {
      if (targetSocket && !targetSocket.destroyed) {
        targetSocket.destroy();
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`[WSS Gateway] Server listening on port ${PORT}`);
});
