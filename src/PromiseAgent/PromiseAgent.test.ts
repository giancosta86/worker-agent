import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { TestOperationModuleIds } from "../test";
import { PromiseAgent } from "./PromiseAgent";
import { promiseAgentTestOperations } from "./_core.test";

describe("PromiseAgent", () => {
  describe("when passing an inexisting module to the constructor", () => {
    it("should report the error on every operation request", async () => {
      const agent = new PromiseAgent<number, number>(
        join(__dirname, "INEXISTING")
      );

      await expect(agent.runOperation(90)).rejects.toThrow(
        "Cannot find module"
      );

      await expect(agent.runOperation(92)).rejects.toThrow(
        "Cannot find module"
      );

      const exitCode = await agent.requestExit();
      expect(exitCode).not.toBe(0);
    });
  });

  describe("when exiting", () => {
    it("should support the exit promise", async () => {
      const agent = new PromiseAgent<number, number>(
        TestOperationModuleIds.Sync
      );

      const exitCode = await agent.requestExit();

      expect(exitCode).toBe(0);
    });

    it("should leave unfulfilled any waiting async operation", async () => {
      const agent = new PromiseAgent<number, number>(
        TestOperationModuleIds.SlowAsync
      );

      let actualOutput: number | undefined;

      agent.runOperation(90).then(output => (actualOutput = output));

      const exitCode = await agent.requestExit();

      expect(exitCode).toBe(0);

      await delay(750);

      expect(actualOutput).toBeUndefined();
    });
  });

  describe("when the operation is synchronous", () => {
    promiseAgentTestOperations.runSyncTests();

    it("should handle operation errors without stopping the worker", async () => {
      const agent = new PromiseAgent<number, number>(
        TestOperationModuleIds.SyncKaboom
      );

      await expect(agent.runOperation(99)).rejects.toThrow("KABOOM! (sync!)");

      const output = await agent.runOperation(2);
      expect(output).toBe(200);

      const exitCode = await agent.requestExit();
      expect(exitCode).toBe(0);
    });
  });

  describe("when the operation returns a Promise", () => {
    promiseAgentTestOperations.runAsyncTests();

    it("should handle operation errors without stopping the worker", async () => {
      const agent = new PromiseAgent<number, number>(
        TestOperationModuleIds.AsyncKaboom
      );

      await expect(agent.runOperation(99)).rejects.toThrow("KABOOM! (async!)");

      const output = await agent.runOperation(3);
      expect(output).toBe(30);

      const exitCode = await agent.requestExit();
      expect(exitCode).toBe(0);
    });
  });
});
