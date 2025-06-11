import {
  assign,
  EventObject,
  fromPromise,
  MetaObject,
  NonReducibleUnknown,
  setup,
  StateMachine,
} from "xstate";
import { SSEClient } from "../services";

export type SSEStateMachineProps = StateMachine<
  SSEContext,
  SSEEvent,
  {},
  never,
  never,
  never,
  never,
  "connecting" | "open" | "closed" | "idle" | "retry",
  string,
  NonReducibleUnknown,
  NonReducibleUnknown,
  EventObject,
  MetaObject,
  {}
>;

export type SSEState = "connecting" | "open" | "closed" | "idle" | "retry";

export type SSEEvent =
  | { type: "connect" }
  | { type: "connecting" }
  | { type: "success" }
  | { type: "failure" }
  | { type: "open" }
  | { type: "message"; data: any }
  | { type: "closed" }
  | { type: "idle" }
  | { type: "retry" }
  | { type: "retrying" }
  | { type: "reset" };

export type SSEContext = {
  retryCount: number;
  retryDelay: number;
  retryMaxCount: number;
  retryBackoffFactor: number;
  sseClient: SSEClient | null;
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
      // Add your guard condition here
      console.log("hasExceededMaxRetries", context.retryCount > context.retryMaxCount);
      return context.retryCount > context.retryMaxCount;
    },
  },
  actions: {
    resetRetryCount: assign({
      retryCount: 0,
    }),
    // 重试连接
    handleRetry: ({ context, self }) => {
      console.log("handleRetry, retryCount:", context.retryCount);
      const delay = context.retryDelay * Math.pow(context.retryBackoffFactor, context.retryCount);
      setTimeout(() => {
        // 触发重试事件
        self.send({ type: "connecting" });
      }, delay);
    },
    // 重置连接
    resetConnection: assign(({ context }) => {
      if (context.sseClient) {
        context.sseClient.close();
      }
      return { ...context, retryCount: 0, sseClient: null };
    }),
    // 管理重试次数
    handleRetryCount: assign(({ context, self }) => {
      console.log("handleRetryCount:", context.retryCount, context.retryMaxCount);
      if (context.retryCount > context.retryMaxCount) {
        self.send({ type: "closed" });
        return { ...context };
      } else {
        context.retryCount += 1;
        self.send({ type: "retrying" });
        return { ...context };
      }
    }),
    handleMessage: ({ context, event }) => {
      console.log("Received message:", event);
      const newMessage = event;
      return {
        messages: [...(context.messages || []), newMessage],
      };
    },
  },
  actors: {
    sseClientActor: fromPromise(async () => {
    const client = new SSEClient();
    try {
      const res = await client.connect(); // 等待 connect 完成
      console.log("Connection established:", res);
      return res; // ✅ 正确 resolve 并返回结果
    } catch (err) {
      console.error("连接失败（Actor内部）:", err); // ✅ 添加日志
      throw err; // ✅ 正确地抛出错误，触发 onError
    }
  }),
  },
}).createMachine({
  context: {
    retryCount: 0,
    retryDelay: 1000,
    retryMaxCount: 3,
    retryBackoffFactor: 2,
    sseClient: null,
    messages: [],
  },
  id: "sseConnection",
  initial: "idle",
  states: {
    idle: {
      on: {
        connect: {
          target: "connecting",
        },
      },
      description: "The initial state where the SSE connection is not yet started.",
    },
    connecting: {
      invoke: {
        src: "sseClientActor",
        onDone: {
          target: "open",
        },
        onError: {
          target: "retry",
        },
      },
      description: "Attempting to establish an SSE connection.",
    },
    open: {
      on: {
        message: {
          actions: "handleMessage",
        },
      },
      description: "The SSE connection is successfully established and open.",
    },
    retry: {
      on: {
        retrying: [
          {
            target: "closed",
            guard: {
              type: "hasExceededMaxRetries",
            },
          },
          {
            target: "connecting",
            actions: "handleRetry",
          },
        ],
      },
      entry: "handleRetryCount",
      description: "Retrying to connect after a failed attempt.",
    },
    closed: {
      on: {
        reset: {
          target: "idle",
          actions: "resetConnection",
        },
      },
      description: "The SSE connection has been closed.",
    },
  },
});
