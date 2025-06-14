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
import { EventData } from '@/types';

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
  | { type: 'CONNECT' }
  | { type: 'MESSAGE'; data: EventData }
  | { type: 'ERROR'; error: Error }
  | { type: 'CLOSE' }
  | { type: 'RESET' };

export type SSEContext = {
  retryCount: number;
  retryDelay: number;
  retryBackoffFactor: number;
  retryMaxCount: number;
  sseClient: SSEClient | null;
  options: SSEClientOptions;
  messages: any[];
};

export const SSEStateMachine = setup({
  types: {
    context: {} as SSEContext,
    events: {} as SSEEvent,
  },

  guards: {
    // 检查是否超过最大重试次数
    hasExceededMaxRetries: ({ context }) => {
      return context.retryCount > context.retryMaxCount;
    },
  },

  actions: {
    // 重置重试计数
    resetRetryCount: assign({
      retryCount: 0,
    }),

    // 管理 SSEClient 实例和清理
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

    // 重置连接
    resetConnection: assign(({ context }) => {
      if (context.sseClient) {
        context.sseClient.close();
      }
      return { ...context, retryCount: 0, sseClient: null };
    }),

    // 递增重试次数
    incrementRetryCount: assign({
      retryCount: ({ context }) => context.retryCount + 1,
    }),

    handleMessage: assign(({ context, event }) => {
      if (event.type !== 'MESSAGE') {
        return {
          ...context,
        };
      }
      const newMessage = event.data;
      console.log('Received message:', newMessage);
      if (newMessage.event === 'ai_message') {
        switch (newMessage.data.state) {
          case 'start': {
            return { ...context, messages: [...context.messages, newMessage] };
          }
          case 'processing': {
            const data = newMessage.data;
            const lastMessageIndex = context.messages.length - 1;
            const lastMessage = context.messages[lastMessageIndex];

            const updatedMessage = {
              ...lastMessage,
              data: {
                ...lastMessage.data,
                content: lastMessage.data.content + data.content,
              },
            };

            const updatedMessages = [
              ...context.messages.slice(0, lastMessageIndex),
              updatedMessage,
            ];

            return { ...context, messages: updatedMessages };
          }
          case 'end':
            return { ...context };
        }
      } else if (newMessage.event === 'human_message') {
        return {
          ...context,
          messages: [...context.messages, newMessage],
        };
      } else if (newMessage.event === 'journey') {
        let message = JSON.parse(newMessage.data.content as string);
        console.log('journey:', newMessage.data.content, message);
        return {
          ...context,
          messages: [...context.messages, message],
        };
      }

      return { ...context };
    }),

    // 设置 SSE 事件监听器
    setupSSEListeners: ({ context, self }) => {
      if (!context.sseClient) return;

      // 监听 SSE 消息事件
      context.sseClient.on('message', (data) => {
        self.send({ type: 'MESSAGE', data });
      });

      // 监听 SSE 错误事件
      context.sseClient.on('error', (error) => {
        console.error('SSE Error:', error);
        const errorObj =
          error instanceof Error ? error : new Error(String(error || 'Unknown SSE error'));
        self.send({ type: 'ERROR', error: errorObj });
      });

      // 监听 SSE 连接关闭事件
      context.sseClient.on('close', () => {
        console.log('SSE Connection failed');
        self.send({ type: 'CLOSE' });
      });
    },

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
  },
  actors: {
    sseClientActor: fromPromise(async ({ input }: { input: SSEContext }) => {
      try {
        if (!input.sseClient) {
          throw new Error('SSEClient not initialized');
        }
        const res = await input.sseClient.connect(input.retryCount != 0); // 等待 connect 完成，retryCount不为 0 表示重连
        return res; // ✅ 正确 resolve 并返回结果
      } catch (err) {
        console.error('SSE connection failed:', err);
        throw err;
      }
    }),

    retryDelayActor: fromPromise(async ({ input }: { input: SSEContext }) => {
      return new Promise((resolve) => {
        const delay = Math.min(
          input.retryDelay * Math.pow(input.retryBackoffFactor, input.retryCount),
          30000,
        );
        console.log(`Retrying in ${delay}ms (attempt ${input.retryCount}/${input.retryMaxCount})`);
        setTimeout(() => {
          return resolve(true);
        }, delay);
      });
    }),
  },
}).createMachine({
  context: {
    retryCount: 0,
    retryDelay: 2000, // 基础延迟 2 秒
    retryMaxCount: 5, // 最大重试 5 次
    retryBackoffFactor: 1.2, // 指数退避因子
    sseClient: null,
    options: {
      // 默认 SSE 连接配置
      url: '/api/v1/sse',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
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
      description: 'The initial state where the SSE connection is not yet started.',
    },

    // 连接状态：正在建立 SSE 连接
    connecting: {
      invoke: {
        id: 'sseClientActor',
        src: 'sseClientActor',
        input: ({ context }) => ({ ...context }),
        onDone: {
          target: 'open',
          actions: 'setupSSEListeners',
        },
        onError: {
          target: 'retry',
          actions: 'saveError', // 保存错误信息
        },
      },
      description: 'Attempting to establish an SSE connection.',
    },
    open: {
      entry: 'resetRetryCount',
      on: {
        MESSAGE: {
          actions: 'handleMessage',
        },
        ERROR: {
          target: 'retry',
          actions: 'saveError', // 保存错误信息
        },
      },
      description: 'The SSE connection is successfully established and open.',
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

    delaying: {
      invoke: {
        id: 'retryDelayActor',
        src: 'retryDelayActor',
        input: ({ context }) => ({ ...context }),
        onDone: {
          target: 'connecting',
        },
      },
      description: 'Waiting for retry delay before reconnecting',
    },
    failed: {
      on: {
        RESET: {
          target: 'idle',
          actions: 'resetConnection',
        },
      },
      description: 'The SSE connection has been failed.',
    },
  },
});
