export type WorkerData = {
  operationModuleId: string;
  logToConsole: boolean;
};

export type MessageToWorker =
  | {
      operationInput: unknown;
    }
  | "end";

export type MessageFromWorker =
  | {
      operationOutput: unknown;
    }
  | {
      operationErrorString: string;
    };
