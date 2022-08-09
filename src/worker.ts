import { parentPort, workerData } from "node:worker_threads";
import { exit } from "node:process";
import { formatError } from "@giancosta86/format-error";
import { MessageToWorker, WorkerData, MessageFromWorker } from "./protocol";

const { operationModuleId, logToConsole } = workerData as WorkerData;

const logger = logToConsole ? console : undefined;

logger?.info(`###> Trying to load module '${operationModuleId}'...`);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const operationModule = require(operationModuleId);

logger?.info(`###> Module loaded!`);

parentPort?.on("message", (message: MessageToWorker) => {
  if (message == "end") {
    logger?.info(`###> Now exiting worker thread!`);
    setImmediate(() => exit(0));
    return;
  }

  if ("operationInput" in message) {
    logger?.info(`###> Now running the operation!`);
    runOperation(message.operationInput);
    return;
  }

  throw new Error(
    `Unexpected message received by the worker: ${JSON.stringify(message)}`
  );
});

function runOperation(input: unknown): void {
  let operationOutput: unknown;

  try {
    operationOutput = operationModule(input);
  } catch (err) {
    logger?.error(
      `###> Error when calling the worker's operation: ${formatError(err, {
        showCauseChain: true,
        showStackTrace: true
      })}`
    );

    parentPort?.postMessage({
      operationErrorString: formatError(err)
    } as MessageFromWorker);

    return;
  }

  logger?.info(`###> The operation result is: ${operationOutput}`);

  if (!(operationOutput instanceof Promise)) {
    logger?.info(`###> Sending the result to the parent!`);

    parentPort?.postMessage({
      operationOutput
    } as MessageFromWorker);

    return;
  }

  logger?.info(`###> Waiting for the promise to resolve...`);

  operationOutput
    .then(value => {
      logger?.info(
        `###> Promise successful! Sending the result to the parent: ${value}`
      );

      parentPort?.postMessage({
        operationOutput: value
      } as MessageFromWorker);
    })
    .catch(operationError => {
      logger?.error(
        `###> Promise failed! Sending an error message to the parent! The error is: ${formatError(
          operationError,
          { showCauseChain: true, showStackTrace: true }
        )}`
      );

      parentPort?.postMessage({
        operationErrorString: formatError(operationError)
      } as MessageFromWorker);
    });
}
