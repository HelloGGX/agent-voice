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
  "connecting" | "open" | "closed" | "idle" | "retry" | "delaying",
  string,
  NonReducibleUnknown,
  NonReducibleUnknown,
  EventObject,
  MetaObject,
  {}
>;

export type SSEState = "connecting" | "open" | "closed" | "idle" | "retry" | "delaying";

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
  | { type: "reset" }
  | { type: "delaying" };

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
      // Add your guard condition here
      console.log("hasExceededMaxRetries", context.retryCount > context.retryMaxCount);
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
    handleMessage: assign(({ context, event }) => {
      console.log("Received message:", event);
      const newMessage = event;
      return {
        messages: [...(context.messages || []), newMessage],
      };
    }),
  },
  actors: {
    sseClientActor: fromPromise(async () => {
      try {
        const res = await client.connect(); // 等待 connect 完成
        return res; // ✅ 正确 resolve 并返回结果
      } catch (err) {
        console.error("连接失败（Actor内部）:", err);
        throw err; // ✅ 正确地抛出错误，触发 onError
      }
    }),
    retryDelayActor: fromPromise(({ input }: { input: SSEContext }) => {
      return new Promise((resolve) => {
        // const delay = 3000;
        const delay = Math.min(
          input.retryDelay * Math.pow(input.retryBackoffFactor, input.retryCount),
          30000,
        );
        console.log("Calculated delay:", delay);
        setTimeout(resolve, delay);
      });
    }),
  },
}).createMachine({
  context: {
    retryCount: 0,
    retryDelay: 1000,
    retryMaxCount: 3,
    retryBackoffFactor: 1.2,
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
        id: "sseClientActor",
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
      entry: "handleRetryCount",
      on: {
        retrying: [
          {
            target: "closed",
            guard: {
              type: "hasExceededMaxRetries",
            },
          },
          {
            target: "delaying",
          },
        ],
      },
      description: "Retrying to connect after a failed attempt.",
    },
    delaying: {
      invoke: {
        id: "retryDelayActor",
        src: "retryDelayActor",
        input: ({ context }) => ({ ...context }),
        onDone: {
          target: "connecting",
        },
      },
      description: "等待重试连接的时间。",
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
