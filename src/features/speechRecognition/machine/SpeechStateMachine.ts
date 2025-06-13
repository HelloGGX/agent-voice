import { createMachine, setup } from "xstate";

export const machine = setup({
  types: {
    context: {} as {},
    events: {} as
      | { type: "wake_word_detected / post card" }
      | { type: "ready_to_recognize" }
      | { type: "wake_failed" }
      | { type: "speech_detected" }
      | { type: "no_speech_detected" }
      | { type: "recognition_completed" }
      | { type: "recognition_error" }
      | { type: "reset" }
      | { type: "process_results" }
      | { type: "retry" },
  },
  actors: {
    "call api": createMachine({
      /* ... */
    }),
  },
}).createMachine({
  context: {},
  id: "speechRecognition",
  initial: "idle",
  states: {
    idle: {
      on: {
        "wake_word_detected / post card": {
          target: "wakingUp",
        },
      },
      description:
        "The state where the system is idle and waiting for a wake word to initiate speech recognition.",
    },
    wakingUp: {
      on: {
        ready_to_recognize: {
          target: "recognitionStarted",
        },
        wake_failed: {
          target: "idle",
        },
      },
      description:
        "The state where the system has detected a wake word and is preparing to start speech recognition.",
    },
    recognitionStarted: {
      on: {
        speech_detected: {
          target: "recognizing",
        },
        no_speech_detected: {
          target: "wake_down",
        },
      },
      description:
        "The state where the system has started the speech recognition process.",
    },
    recognizing: {
      on: {
        recognition_completed: {
          target: "recognitionSuccess",
        },
        recognition_error: {
          target: "recognitionFailure",
        },
      },
      description:
        "The state where speech is currently being recognized and processed.",
    },
    wake_down: {
      on: {
        reset: {
          target: "idle",
        },
      },
    },
    recognitionSuccess: {
      on: {
        process_results: {
          target: "recognitionStarted",
        },
      },
      invoke: {
        id: "speechRecognition.recognitionSuccess:invocation[0]",
        input: {},
        src: "call api",
      },
      description:
        "The state where speech recognition has successfully completed and results are ready.",
    },
    recognitionFailure: {
      on: {
        retry: {
          target: "recognitionStarted",
        },
      },
      description:
        "The state indicating that the speech recognition process has failed.",
    },
  },
});