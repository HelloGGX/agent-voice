import {
  assign,
  EventObject,
  fromPromise,
  MetaObject,
  NonReducibleUnknown,
  setup,
  StateMachine,
} from 'xstate';
import { SSEClient, SSEClientOptions } from '../services';

export type SSEStateMachineProps = StateMachine<
  SSEContext,
  SSEEvent,
  {},
  never,
  never,
  never,
  never,
  'connecting' | 'open' | 'failed' | 'idle' | 'retry' | 'delaying',
  string,
  NonReducibleUnknown,
  NonReducibleUnknown,
  EventObject,
  MetaObject,
  {}
>;

export type SSEState = 'connecting' | 'open' | 'failed' | 'idle' | 'retry' | 'delaying';

export type SSEEvent =
  | { type: 'CONNECT' }           // 开始连接
  | { type: 'MESSAGE'; data: any } // 接收到 SSE 消息
  | { type: 'ERROR'; error?: Error } // 连接或通信错误
  | { type: 'CLOSE' }             // 服务器主动关闭连接（触发重试）
  | { type: 'RESET' };            // 重置状态机（从失败状态恢复）

export type SSEContext = {
  retryCount: number;
  retryDelay: number;
  retryBackoffFactor: number;
  retryMaxCount: number;
  sseClient: SSEClient | null;    // 由状态机管理的 SSEClient 实例
  options: SSEClientOptions;      // SSE 连接配置
  messages: any[];
  lastError?: Error;              // 保存最后的错误信息
};

export const SSEStateMachine = setup({
  types: {
    context: {} as SSEContext,
    events: {} as SSEEvent,
  },
  guards: {
    // 检查是否超过最大重试次数
    hasExceededMaxRetries: ({ context }) => {
      const exceeded = context.retryCount >= context.retryMaxCount;
      console.log('hasExceededMaxRetries:', exceeded, `(${context.retryCount}/${context.retryMaxCount})`);
      return exceeded;
    },
  },
  actions: {
    // 修复问题3：简化重试计数，移除状态发送逻辑
    incrementRetryCount: assign({
      retryCount: ({ context }) => context.retryCount + 1,
    }),

    // 重置重试计数
    resetRetryCount: assign({
      retryCount: 0,
    }),

    // 修复问题1&5：正确管理 SSEClient 实例和清理
    initializeClient: assign(({ context }) => {
      // 如果已有客户端，先清理
      if (context.sseClient) {
        context.sseClient.close();
      }
      
      // 创建新的 SSEClient 实例
      const newClient = new SSEClient(context.options);
      
      return {
        ...context,
        sseClient: newClient,
      };
    }),

    // 修复问题5：完整的连接重置和清理
    resetConnection: assign(({ context }) => {
      // 清理现有连接
      if (context.sseClient) {
        context.sseClient.close();
      }
      
      return {
        ...context,
        retryCount: 0,
        sseClient: null,
        lastError: undefined,
      };
    }),

    // 修复问题2：处理 SSE 消息
    handleMessage: assign(({ context, event }) => {
      console.log('Received SSE message:', event);
      if (event.type === 'MESSAGE') {
        return {
          ...context,
          messages: [...context.messages, event.data],
        };
      }
      return context;
    }),

    // 保存错误信息
    saveError: assign(({ context, event }) => {
      if (event.type === 'ERROR') {
        const error = event.error;
        return {
          ...context,
          lastError: error instanceof Error ? error : new Error(String(error || 'Unknown error')),
        };
      }
      return context;
    }),

    // 处理服务器关闭连接
    handleServerClose: assign(({ context }) => {
      return {
        ...context,
        lastError: new Error('服务器主动关闭了连接'),
      };
    }),

    // 修复问题2：设置 SSE 事件监听器
    setupSSEListeners: ({ context, self }) => {
      if (!context.sseClient) return;

      // 监听 SSE 消息事件
      context.sseClient.on('message', (data) => {
        self.send({ type: 'MESSAGE', data });
      });

      // 监听 SSE 错误事件
      context.sseClient.on('error', (error) => {
        console.error('SSE Error:', error);
        const errorObj = error instanceof Error ? error : new Error(String(error || 'Unknown SSE error'));
        self.send({ type: 'ERROR', error: errorObj });
      });

      // 监听 SSE 连接关闭事件
      context.sseClient.on('close', () => {
        console.log('SSE Connection closed');
        self.send({ type: 'CLOSE' });
      });
    },

    // 清理 SSE 事件监听器
    cleanupSSEListeners: ({ context }) => {
      if (!context.sseClient) return;
      
      // 移除所有事件监听器
      context.sseClient.off('message');
      context.sseClient.off('error');
      context.sseClient.off('close');
    },
  },
  actors: {
    // 修复问题1：使用 context 中的 SSEClient 实例
    sseClientActor: fromPromise(async ({ input }: { input: SSEContext }) => {
      try {
        if (!input.sseClient) {
          throw new Error('SSEClient not initialized');
        }
        
        console.log('Attempting to connect...');
        const result = await input.sseClient.connect();
        console.log('SSE connection established successfully');
        return result;
      } catch (error) {
        console.error('SSE connection failed:', error);
        throw error;
      }
    }),

    // 修复问题3：简化延迟逻辑，使用指数退避
    retryDelayActor: fromPromise(({ input }: { input: SSEContext }) => {
      return new Promise((resolve) => {
        // 计算指数退避延迟，最大30秒
        const delay = Math.min(
          input.retryDelay * Math.pow(input.retryBackoffFactor, input.retryCount),
          30000
        );
        
        console.log(`Retrying in ${delay}ms (attempt ${input.retryCount + 1}/${input.retryMaxCount})`);
        setTimeout(resolve, delay);
      });
    }),
  },
}).createMachine({
  context: {
    retryCount: 0,
    retryDelay: 1000,              // 基础延迟 1 秒
    retryMaxCount: 3,              // 最大重试 3 次
    retryBackoffFactor: 2,         // 指数退避因子
    sseClient: null,
    options: {                     // 默认 SSE 连接配置
      url: '/api/v1/sse',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
    },
    messages: [],
  },
  id: 'sseConnection',
  initial: 'idle',
  states: {
    // 空闲状态：等待连接指令
    idle: {
      on: {
        CONNECT: {
          target: 'connecting',
          actions: 'initializeClient', // 初始化 SSEClient
        },
      },
      description: 'Initial state waiting for connection command',
    },

    // 连接状态：正在建立 SSE 连接
    connecting: {
      entry: 'resetRetryCount', // 重置重试计数
      invoke: {
        id: 'sseClientActor',
        src: 'sseClientActor',
        input: ({ context }) => context,
        onDone: {
          target: 'open',
          actions: 'setupSSEListeners', // 修复问题2：设置事件监听
        },
        onError: {
          target: 'retry',
          actions: 'saveError', // 保存错误信息
        },
      },
      // 修复问题5：状态退出时清理
      exit: 'cleanupSSEListeners',
      description: 'Establishing SSE connection',
    },

    // 开放状态：SSE 连接已建立，可以接收消息
    open: {
      on: {
        MESSAGE: {
          actions: 'handleMessage', // 处理接收到的消息
        },
        ERROR: {
          target: 'retry',
          actions: 'saveError',
        },
        CLOSE: {
          target: 'retry', // 服务器关闭连接 → 自动重试
          actions: 'handleServerClose', // 处理服务器关闭连接
        }
      },
      // 修复问题5：状态退出时清理监听器
      exit: 'cleanupSSEListeners',
      description: 'SSE connection is open and receiving messages',
    },

    // 重试状态：连接失败，准备重试
    retry: {
      entry: 'incrementRetryCount', // 修复问题3：简化重试计数
      always: [
        {
          // 如果超过最大重试次数，转到失败状态
          target: 'failed',
          guard: 'hasExceededMaxRetries',
        },
        {
          // 否则进入延迟状态
          target: 'delaying',
        },
      ],
      description: 'Evaluating retry conditions after connection failure',
    },

    // 延迟状态：等待重试延迟时间
    delaying: {
      invoke: {
        id: 'retryDelayActor',
        src: 'retryDelayActor',
        input: ({ context }) => context,
        onDone: {
          target: 'connecting', // 延迟结束后重新连接
        },
      },
      description: 'Waiting for retry delay before reconnecting',
    },

    // 失败状态：重试次数耗尽，需要手动重置
    failed: {
      entry: 'cleanupSSEListeners', // 确保清理所有监听器
      on: {
        RESET: {
          target: 'idle',
          actions: 'resetConnection', // 重置所有状态和错误计数
        },
        CONNECT: {
          target: 'connecting',
          actions: ['resetConnection', 'initializeClient'], // 重置并重新初始化
        },
      },
      description: 'SSE connection failed permanently after max retries',
    },
  },
});
