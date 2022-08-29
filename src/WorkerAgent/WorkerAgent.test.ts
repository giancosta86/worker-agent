import { join } from "node:path";
import delay from "delay";
import { TestOperationModuleIds } from "../test";
import { WorkerAgent } from "./WorkerAgent";
import { exitAsPromise, workerAgentTestOperations } from "./_core.test";

describe("WorkerAgent", () => {
  describe("when passing an inexisting module to the constructor", () => {
    it("should raise both the error event and the exit event", () =>
      new Promise<void>((resolve, reject) => {
        let errorTriggered = false;

        new WorkerAgent<void, void>(join(__dirname, "INEXISTING"))
          .on("error", () => {
            errorTriggered = true;
          })
          .on("exit", exitCode => {
            try {
              expect(errorTriggered).toBe(true);
              expect(exitCode).not.toBe(0);
            } catch (err) {
              return reject(err);
            }

            resolve();
          });
      }));
  });

  describe("when exiting", () => {
    it("should support the exit event", async () => {
      const agent = new WorkerAgent<number, number>(
        TestOperationModuleIds.Sync
      );

      const exitCode = await exitAsPromise(agent);

      expect(exitCode).toBe(0);
    });

    it("should leave unfulfilled any waiting async operation", async () => {
      let actualOutput: number | undefined;

      const exitCode = await new Promise<number>((resolve, reject) => {
        const agent = new WorkerAgent<number, number>(
          TestOperationModuleIds.SlowAsync
        );

        agent.on("result", (err, value) => {
          if (value === null) {
            return reject(err);
          }

          actualOutput = value;
        });

        agent.on("exit", resolve);

        agent.runOperation(90);
        agent.requestExit();
      });

      expect(exitCode).toBe(0);

      await delay(750);

      expect(actualOutput).toBeUndefined();
    });
  });

  describe("when the operation is synchronous", () => {
    workerAgentTestOperations.runSyncTests();

    it("should handle operation errors without stopping the worker", async () => {
      const agent = new WorkerAgent<number, number>(
        TestOperationModuleIds.SyncKaboom
      );

      const error = await new Promise<Error | null>(resolve => {
        agent.once("result", resolve);
        agent.runOperation(99);
      });
      expect(error?.message).toBe('Error("KABOOM! (sync!)")');

      const output = await new Promise<number | null>(resolve => {
        agent.once("result", (_err, value) => resolve(value));
        agent.runOperation(2);
      });
      expect(output).toBe(200);

      const exitCode = await exitAsPromise(agent);
      expect(exitCode).toBe(0);
    });
  });

  describe("when the operation returns a Promise", () => {
    workerAgentTestOperations.runAsyncTests();

    it("should handle operation errors without stopping the worker", async () => {
      const agent = new WorkerAgent<number, number>(
        TestOperationModuleIds.AsyncKaboom
      );

      const error = await new Promise<Error | null>(resolve => {
        agent.once("result", resolve);
        agent.runOperation(99);
      });
      expect(error?.message).toBe('Error("KABOOM! (async!)")');

      const output = await new Promise<number | null>(resolve => {
        agent.once("result", (_err, value) => resolve(value));
        agent.runOperation(3);
      });
      expect(output).toBe(30);

      const exitCode = await exitAsPromise(agent);
      expect(exitCode).toBe(0);
    });
  });
});
