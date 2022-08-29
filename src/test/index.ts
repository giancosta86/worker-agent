import { join } from "node:path";

export const TestOperationModuleIds = {
  Sync: join(__dirname, "add40.sync"),
  Async: join(__dirname, "add90.async"),
  SlowAsync: join(__dirname, "add100.slow"),
  SyncKaboom: join(__dirname, "kaboom.sync"),
  AsyncKaboom: join(__dirname, "kaboom.async")
} as const;

export type AgentBasedMapper = (
  operationModuleId: string,
  inputValues: readonly number[]
) => Promise<readonly number[]>;

export class TestOperations {
  constructor(private readonly mapValuesViaAgent: AgentBasedMapper) {}

  private async expectOperation(
    operationModuleId: string,
    inputValues: readonly number[],
    expectedOutputValues: readonly number[]
  ): Promise<void> {
    const outputValues = await this.mapValuesViaAgent(
      operationModuleId,
      inputValues
    );

    expect(new Set(outputValues)).toEqual(new Set(expectedOutputValues));
  }

  private expectSyncOperation(
    inputValues: readonly number[],
    expectedOutputValues: readonly number[]
  ): Promise<void> {
    return this.expectOperation(
      TestOperationModuleIds.Sync,
      inputValues,
      expectedOutputValues
    );
  }

  private expectAsyncOperation(
    inputValues: readonly number[],
    expectedOutputValues: readonly number[]
  ): Promise<void> {
    return this.expectOperation(
      TestOperationModuleIds.Async,
      inputValues,
      expectedOutputValues
    );
  }

  private expectSlowOperation(
    inputValues: readonly number[],
    expectedOutputValues: readonly number[]
  ): Promise<void> {
    return this.expectOperation(
      TestOperationModuleIds.SlowAsync,
      inputValues,
      expectedOutputValues
    );
  }

  runSyncTests() {
    it("should process just one element", () =>
      this.expectSyncOperation([2], [42]));

    it("should process two elements", () =>
      this.expectSyncOperation([5, 8], [45, 48]));

    it("should process three elements", () =>
      this.expectSyncOperation([2, 5, 8], [42, 45, 48]));
  }

  runAsyncTests() {
    it("should process just one element", () =>
      this.expectAsyncOperation([2], [92]));

    it("should process two elements", () =>
      this.expectAsyncOperation([5, 8], [95, 98]));

    it("should process three elements", () =>
      this.expectAsyncOperation([2, 5, 8], [92, 95, 98]));

    it("should process three elements with slow operation", () =>
      this.expectSlowOperation([10, 15, 75], [110, 115, 175]));
  }
}
