import {
  assign,
  EventObject,
  fromPromise,
  MetaObject,
  NonReducibleUnknown,
  setup,
  StateMachine,
} from 'xstate';
import { SSEClient } from '../services';
import { EventData } from '@/types';

export type SSEStateMachineProps = StateMachine<
  SSEContext,
  SSEEvent,
  {},
  never,
  never,
  never,
  never,
  'connecting' | 'open' | 'closed' | 'idle' | 'retry' | 'delaying',
  string,
  NonReducibleUnknown,
  NonReducibleUnknown,
  EventObject,
  MetaObject,
  {}
>;

export type SSEState = 'connecting' | 'open' | 'closed' | 'idle' | 'retry' | 'delaying';

export type SSEEvent =
  | { type: 'connect' }
  | { type: 'connecting' }
  | { type: 'open' }
  | { type: 'message'; data: EventData }
  | { type: 'error' }
  | { type: 'closed' }
  | { type: 'idle' }
  | { type: 'retry' }
  | { type: 'retrying' }
  | { type: 'reset' }
  | { type: 'delaying' };

export type SSEContext = {
  retryCount: number;
  retryDelay: number;
  retryBackoffFactor: number;
  retryMaxCount: number;
  sseClient: SSEClient | null;
  messages: any[];
};
export const client = new SSEClient();

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
    resetRetryCount: assign({
      retryCount: 0,
    }),
    // 重置连接
    resetConnection: assign(({ context }) => {
      if (context.sseClient) {
        context.sseClient.close();
      }
      return { ...context, retryCount: 0, sseClient: null };
    }),
    // 管理重试次数
    handleRetryCount: assign(({ context, self }) => {
      if (context.retryCount > context.retryMaxCount) {
        self.send({ type: 'closed' });
        return { ...context };
      } else {
        context.retryCount += 1;
        self.send({ type: 'retrying' });
        return { ...context };
      }
    }),
    handleMessage: assign(({ context, event }) => {
      if (event.type !== 'message') {
        return {
          ...context,
        };
      }
      const newMessage = event.data;
      console.log('Received message:', newMessage);
      if (newMessage.event === 'ai_message') {
        let assistantMessage = '';
        switch (newMessage.data.state) {
          case 'start':
            return {
              ...context,
              messages: [...context.messages, newMessage],
            };
          case 'processing':
            const data = newMessage.data.content;
            assistantMessage = context.messages[context.messages.length - 1].content + data;
            context.messages[context.messages.length - 1] = {
              ...context.messages[context.messages.length - 1],
              content: assistantMessage,
            };
            return { ...context };
          case 'end':
            assistantMessage += newMessage.data.content;
            break;
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
  },
  actors: {
    sseClientActor: fromPromise(async ({ input }: { input: SSEContext }) => {
      try {
        const res = await client.connect(input.retryCount != 0); // 等待 connect 完成，retryCount不为 0 表示重连
        return res; // ✅ 正确 resolve 并返回结果
      } catch (err) {
        console.error('连接失败（Actor内部）:', err);
        throw err; // ✅ 正确地抛出错误，触发 onError
      }
    }),
    retryDelayActor: fromPromise(async ({ input }: { input: SSEContext }) => {
      return new Promise((resolve) => {
        const delay = Math.min(
          input.retryDelay * Math.pow(input.retryBackoffFactor, input.retryCount),
          30000,
        );
        setTimeout(() => {
          return resolve(true);
        }, delay);
      });
    }),
  },
}).createMachine({
  context: {
    retryCount: 0,
    retryDelay: 2000,
    retryMaxCount: 5,
    retryBackoffFactor: 1.2,
    sseClient: null,
    messages: [],
  },
  id: 'sseConnection',
  initial: 'idle',
  states: {
    idle: {
      on: {
        connect: {
          target: 'connecting',
        },
      },
      description: 'The initial state where the SSE connection is not yet started.',
    },
    connecting: {
      invoke: {
        id: 'sseClientActor',
        src: 'sseClientActor',
        input: ({ context }) => ({ ...context }),
        onDone: {
          target: 'open',
        },
        onError: {
          target: 'retry',
        },
      },
      description: 'Attempting to establish an SSE connection.',
    },
    open: {
      entry: 'resetRetryCount',
      on: {
        message: {
          actions: 'handleMessage',
        },
        error: {
          target: 'retry',
        },
      },
      description: 'The SSE connection is successfully established and open.',
    },
    retry: {
      entry: 'handleRetryCount',
      on: {
        retrying: [
          {
            target: 'closed',
            guard: {
              type: 'hasExceededMaxRetries',
            },
          },
          {
            target: 'delaying',
          },
        ],
      },
      description: 'Retrying to connect after a failed attempt.',
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
      description: '等待重试连接的时间。',
    },
    closed: {
      on: {
        reset: {
          target: 'idle',
          actions: 'resetConnection',
        },
      },
      description: 'The SSE connection has been closed.',
    },
  },
});
