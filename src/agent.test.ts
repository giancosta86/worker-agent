import { join } from "node:path";
import { WorkerAgent } from "./agent";
import {
  testAsyncOperation,
  testSlowOperation,
  testSyncOperation
} from "./_shared.test";

describe("Worker", () => {
  describe("when passing an inexisting module to the constructor", () => {
    it("should raise both the error event and the exit event", () =>
      new Promise<void>((resolve, reject) => {
        let errorTriggered = false;

        new WorkerAgent(join(__dirname, "INEXISTING"))
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

  it("should support the exit event", async () => {
    const exitCode = await new Promise<number>(resolve => {
      const agent = new WorkerAgent(join(__dirname, "_add40.sync.test")).on(
        "exit",
        resolve
      );

      agent.requestExit();
    });

    expect(exitCode).toBe(0);
  });

  describe("when the operation is synchronous", () => {
    it("should process just one element", () => testSyncOperation([2], [42]));

    it("should process two elements", () =>
      testSyncOperation([5, 8], [45, 48]));

    it("should process three elements", () =>
      testSyncOperation([2, 5, 8], [42, 45, 48]));

    it("should handle operation errors without stopping the worker", async () => {
      const agent = new WorkerAgent<number, number>(
        join(__dirname, "_kaboom.sync.test")
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

      agent.requestExit();
    });
  });

  describe("when the operation returns a Promise", () => {
    it("should process just one element", () => testAsyncOperation([2], [92]));

    it("should process two elements", () =>
      testAsyncOperation([5, 8], [95, 98]));

    it("should process three elements", () =>
      testAsyncOperation([2, 5, 8], [92, 95, 98]));

    it("should process three elements with slow operation", () =>
      testSlowOperation([10, 15, 75], [110, 115, 175]));

    it("should handle operation errors without stopping the worker", async () => {
      const agent = new WorkerAgent<number, number>(
        join(__dirname, "_kaboom.async.test")
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

      agent.requestExit();
    });
  });
});

describe("when subscribing via .on() to an inexisting event", () => {
  it("should throw", () => {
    const agent = new WorkerAgent<number, number>(
      join(__dirname, "_add90.async.test")
    );

    try {
      expect(() => {
        (agent as any).on("INEXISTING EVENT", () => {
          //Just do nothing
        });
      }).toThrow("Unexpected event: 'INEXISTING EVENT'");
    } finally {
      agent.requestExit();
    }
  });
});

describe("when subscribing via .once() to an inexisting event", () => {
  it("should throw", () => {
    const agent = new WorkerAgent<number, number>(
      join(__dirname, "_add90.async.test")
    );

    try {
      expect(() => {
        (agent as any).once("INEXISTING EVENT", () => {
          //Just do nothing
        });
      }).toThrow("Unexpected event: 'INEXISTING EVENT'");
    } finally {
      agent.requestExit();
    }
  });
});
