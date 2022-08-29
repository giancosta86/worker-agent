import { TestOperations } from "../test";
import { PromiseAgent } from "./PromiseAgent";

async function mapValuesViaPromiseAgent<TInput, TOutput>(
  operationModuleId: string,
  inputValues: readonly TInput[]
): Promise<readonly TOutput[]> {
  const agent = new PromiseAgent<TInput, TOutput>(operationModuleId);

  const actualValues = await Promise.all(
    inputValues.map(inputValue => agent.runOperation(inputValue))
  );

  const exitValue = await agent.requestExit();
  if (exitValue) {
    throw new Error("The agent failed to exit");
  }

  return actualValues;
}

export const promiseAgentTestOperations = new TestOperations(
  mapValuesViaPromiseAgent
);
