import { parentPort, workerData } from "node:worker_threads";
import { exit } from "node:process";
import { formatError } from "@giancosta86/format-error";
import { MessageToWorker, WorkerData, MessageFromWorker } from "./protocol";

const { operationModuleId, logToConsole } = workerData as WorkerData;

const logger = logToConsole ? console : undefined;

logger?.info(`###> Trying to load module '${operationModuleId}'...`);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const operation = require(operationModuleId);

logger?.info(`###> Module loaded!`);

parentPort?.on("message", (message: MessageToWorker) => {
  switch (message.type) {
    case "operationInput":
      logger?.info(`###> Now running the operation!`);
      runOperation(message.value, message.correlationId);
      return;

    case "end":
      logger?.info(`###> Now exiting worker thread!`);
      setImmediate(() => exit(0));
      return;
  }
});

function runOperation(input: unknown, correlationId?: string): void {
  let operationOutput: unknown;

  try {
    operationOutput = operation(input);
  } catch (err) {
    logger?.error(
      `###> Error when calling the worker's operation: ${formatError(err, {
        showCauseChain: true,
        showStackTrace: true
      })}`
    );

    const message: MessageFromWorker = {
      correlationId,
      type: "error",
      formattedError: formatError(err)
    };
    parentPort?.postMessage(message);

    return;
  }

  logger?.info(`###> The operation result is: ${operationOutput}`);

  if (!(operationOutput instanceof Promise)) {
    logger?.info(`###> Sending the result to the parent!`);

    const message: MessageFromWorker = {
      correlationId,
      type: "operationOutput",
      value: operationOutput
    };
    parentPort?.postMessage(message);

    return;
  }

  logger?.info(`###> Waiting for the promise to resolve...`);

  operationOutput
    .then(value => {
      logger?.info(
        `###> Promise successful! Sending the result to the parent: ${value}`
      );

      const message: MessageFromWorker = {
        correlationId,
        type: "operationOutput",
        value
      };
      parentPort?.postMessage(message);
    })
    .catch(operationError => {
      logger?.error(
        `###> Promise failed! Sending an error message to the parent! The error is: ${formatError(
          operationError,
          { showCauseChain: true, showStackTrace: true }
        )}`
      );

      const message: MessageFromWorker = {
        correlationId,
        type: "error",
        formattedError: formatError(operationError)
      };
      parentPort?.postMessage(message);
    });
}
