import { setTimeout as delay } from "node:timers/promises";

async function add100(value: number): Promise<number> {
  await delay(200);
  await delay(250);
  return value + 100;
}

export = add100;
