import { TestOperations } from "../test";
import { WorkerAgent } from "./WorkerAgent";

function mapValuesViaWorkerAgent<TInput, TOutput>(
  operationModuleId: string,
  inputValues: readonly TInput[]
): Promise<readonly TOutput[]> {
  return new Promise<readonly TOutput[]>((resolve, reject) => {
    const outputValues: TOutput[] = [];

    const agent = new WorkerAgent<TInput, TOutput>(operationModuleId);

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
export const workerAgentTestOperations = new TestOperations(
  mapValuesViaWorkerAgent
);

export function exitAsPromise<TInput, TOutput>(
  agent: WorkerAgent<TInput, TOutput>
): Promise<number> {
  return new Promise<number>(resolve => {
    agent.once("exit", resolve);
    agent.requestExit();
  });
}
