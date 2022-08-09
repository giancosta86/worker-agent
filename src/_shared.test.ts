import { join } from "node:path";
import { WorkerAgent } from "./agent";

function mapValues<TInput, TOutput>(
  operationModuleId: string,
  inputValues: readonly TInput[]
): Promise<readonly TOutput[]> {
  return new Promise<readonly TOutput[]>((resolve, reject) => {
    const agent = new WorkerAgent<TInput, TOutput>(operationModuleId);

    const outputValues: TOutput[] = [];

    agent.on("result", (err, output) => {
      if (err) {
        return reject(err);
      }

      if (output === null) {
        return reject(new Error("Unexpected null output"));
      }

      outputValues.push(output);

      if (outputValues.length == inputValues.length) {
        agent.requestExit();
      }
    });

    agent.on("exit", exitCode => {
      if (exitCode) {
        return reject(new Error("The agent exited with non-zero exit code!"));
      }

      resolve(outputValues);
    });

    inputValues.forEach(inputValue => agent.runOperation(inputValue));
  });
}

async function testOperation<TInput, TOutput>(
  operationModuleBaseName: string,
  inputValues: readonly TInput[],
  expectedOutputValues: readonly TOutput[]
): Promise<void> {
  const outputValues = await mapValues(
    join(__dirname, operationModuleBaseName),
    inputValues
  );

  expect(new Set(outputValues)).toEqual(new Set(expectedOutputValues));
}

export function testSyncOperation(
  inputValues: readonly unknown[],
  expectedOutputValues: readonly unknown[]
): Promise<void> {
  return testOperation("_add40.sync.test", inputValues, expectedOutputValues);
}

export function testAsyncOperation(
  inputValues: readonly unknown[],
  expectedOutputValues: readonly unknown[]
): Promise<void> {
  return testOperation("_add90.async.test", inputValues, expectedOutputValues);
}

export function testSlowOperation(
  inputValues: readonly unknown[],
  expectedOutputValues: readonly unknown[]
): Promise<void> {
  return testOperation("_add100.slow.test", inputValues, expectedOutputValues);
}
