import { join } from "node:path";
import { Worker, WorkerOptions } from "node:worker_threads";
import { WorkerData, MessageToWorker, MessageFromWorker } from "./protocol";

const workerModuleId = join(__dirname, "worker");

type GenericCallback = (...args: any[]) => void;

type WorkerEventSubscriptionMethod = (
  workerEvent: string,
  callback: GenericCallback
) => void;

export class WorkerAgent<TInput, TOutput> {
  private readonly worker: Worker;

  constructor(operationModuleId: string, logToConsole = false) {
    const workerOptions: WorkerOptions = {
      workerData: {
        operationModuleId,
        logToConsole
      } as WorkerData
    };

    this.worker = new Worker(workerModuleId, workerOptions);
  }

  runOperation(input: TInput): void {
    this.worker.postMessage({
      operationInput: input
    } as MessageToWorker);
  }

  requestExit(): void {
    this.worker.postMessage("end" as MessageToWorker);
  }

  on(
    event: "result",
    callback: (err: Error | null, output: TOutput | null) => void
  ): this;
  on(event: "error", callback: (error: Error) => void): this;
  on(event: "exit", callback: (exitCode: number) => void): this;

  on(event: string, callback: GenericCallback): this {
    return this.registerEventListener(this.worker.on, event, callback);
  }

  once(
    event: "result",
    callback: (err: Error | null, output: TOutput | null) => void
  ): this;
  once(event: "error", callback: (error: Error) => void): this;
  once(event: "exit", callback: (exitCode: number) => void): this;

  once(event: string, callback: GenericCallback): this {
    return this.registerEventListener(this.worker.once, event, callback);
  }

  private registerEventListener(
    workerEventSubscriptionMethod: WorkerEventSubscriptionMethod,
    agentEvent: string,
    callback: GenericCallback
  ): this {
    switch (agentEvent) {
      case "result":
        this.registerResultListener(workerEventSubscriptionMethod, callback);
        break;

      case "exit":
      case "error":
        workerEventSubscriptionMethod.call(this.worker, agentEvent, callback);
        break;

      default:
        throw new Error(`Unexpected event: '${agentEvent}'`);
    }

    return this;
  }

  private registerResultListener(
    workerSubscriptionMethod: WorkerEventSubscriptionMethod,
    callback: GenericCallback
  ): void {
    workerSubscriptionMethod.call(
      this.worker,
      "message",
      (message: MessageFromWorker) => {
        if ("operationErrorString" in message) {
          const { operationErrorString } = message;
          return callback(new Error(operationErrorString), null);
        }

        if ("operationOutput" in message) {
          const { operationOutput } = message;
          return callback(null, operationOutput);
        }
      }
    );
  }
}
