const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 存储SSE连接
const connections = new Map(); // 改为Map以便更好地跟踪连接
let connectionIdCounter = 0;

// 模拟航班数据
const mockFlightData = {
  CA1234: {
    flightNumber: "CA1234",
    destination: "北京首都国际机场",
    departure: "14:30",
    gate: "A12",
    seat: "12A",
    status: "on-time",
  },
  MU5678: {
    flightNumber: "MU5678",
    destination: "上海浦东国际机场",
    departure: "16:45",
    gate: "B8",
    seat: "15C",
    status: "delayed",
  },
};

// SSE端点
app.get("/sse", (req, res) => {
  const connectionId = ++connectionIdCounter;
  const clientInfo = {
    id: connectionId,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers["user-agent"],
    origin: req.headers.origin,
  };

  console.log(
    `收到SSE连接请求 [${connectionId}]，来源:`,
    clientInfo.origin || "unknown",
  );

  // 设置SSE头
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
    "Access-Control-Max-Age": "86400",
  });

  // 发送初始连接消息
  const welcomeMessage = {
    type: "status",
    data: { message: "已连接到语音助手服务", connectionId },
    timestamp: Date.now(),
  };
  res.write(`data: ${JSON.stringify(welcomeMessage)}\n\n`);

  // 保存连接
  connections.set(connectionId, {
    res,
    ...clientInfo,
    connectedAt: Date.now(),
  });
  console.log(
    `新的SSE连接已建立 [${connectionId}]，当前连接数:`,
    connections.size,
  );

  // 定期发送心跳
  const heartbeat = setInterval(() => {
    if (res.destroyed || res.writableEnded) {
      clearInterval(heartbeat);
      connections.delete(connectionId);
      console.log(
        `心跳检测到连接已断开 [${connectionId}]，剩余连接数:`,
        connections.size,
      );
      return;
    }

    try {
      res.write(
        `data: ${JSON.stringify({
          type: "heartbeat",
          timestamp: Date.now(),
        })}\n\n`,
      );
    } catch (error) {
      console.error(`发送心跳失败 [${connectionId}]:`, error.message);
      clearInterval(heartbeat);
      connections.delete(connectionId);
    }
  }, 30000);

  // 连接关闭时清理
  req.on("close", () => {
    clearInterval(heartbeat);
    connections.delete(connectionId);
    console.log(
      `SSE连接已断开 [${connectionId}]，剩余连接数:`,
      connections.size,
    );
  });

  // 连接错误时清理
  req.on("error", (error) => {
    console.error(`SSE连接错误 [${connectionId}]:`, error.message);
    clearInterval(heartbeat);
    connections.delete(connectionId);
  });
});

// 处理文本消息
app.post("/api/message", async (req, res) => {
  try {
    const { message, type = "user" } = req.body;

    console.log("收到消息:", message, "类型:", type);

    // 只处理用户消息，忽略助手消息
    if (type !== "user") {
      console.log("忽略非用户消息");
      return res.json({ success: true, message: "消息已忽略" });
    }

    // 处理用户消息
    const response = await processUserMessage(message);

    // 只有当有有效响应时才广播
    if (response) {
      // 广播响应到所有连接
      broadcastMessage({
        type: "message",
        data: response,
        timestamp: Date.now(),
      });

      res.json({ success: true, response });
    } else {
      // 消息被忽略
      res.json({ success: true, message: "消息已忽略" });
    }
  } catch (error) {
    console.error("处理消息失败:", error);
    res.status(500).json({ error: "消息处理失败" });
  }
});

// 获取航班信息
app.get("/api/flight/:flightNumber", (req, res) => {
  const { flightNumber } = req.params;
  const flight = mockFlightData[flightNumber.toUpperCase()];

  if (flight) {
    res.json(flight);
  } else {
    res.status(404).json({ error: "未找到航班信息" });
  }
});

// 处理用户消息的逻辑
async function processUserMessage(message) {
  const lowerMessage = message.toLowerCase();
  return {
    text: `
${lowerMessage}
    我可以帮您办理以下业务：
🛫 办理值机手续
📋 查询航班信息
🎫 打印登机牌
❓ 其他咨询服务

请说出您需要办理的业务，例如"我要值机"。`,
    type: "assistant",
  };
}

// 广播消息到所有连接
function broadcastMessage(message) {
  const messageStr = `data: ${JSON.stringify(message)}\n\n`;

  for (const connection of connections.values()) {
    if (!connection.res.destroyed) {
      try {
        connection.res.write(messageStr);
      } catch (error) {
        console.error("发送消息失败:", error);
        connections.delete(connection.id);
      }
    }
  }
}

// 健康检查端点
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    connections: connections.size,
    uptime: process.uptime(),
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 语音助手服务器已启动`);
  console.log(`📡 SSE端点: http://localhost:${PORT}/sse`);
  console.log(`🔗 API端点: http://localhost:${PORT}/api`);
  console.log(`❤️  健康检查: http://localhost:${PORT}/health`);
});
