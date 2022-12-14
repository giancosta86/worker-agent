import { setTimeout as delay } from "node:timers/promises";

async function kaboomAsync(value: number): Promise<number> {
  await delay(100);

  if (value == 99) {
    throw new Error("KABOOM! (async!)");
  }

  return value * 10;
}

export = kaboomAsync;
