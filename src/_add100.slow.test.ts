import delay from "delay";

async function add100(value: number): Promise<number> {
  await delay(200);
  await delay(250);
  return value + 100;
}

export = add100;
