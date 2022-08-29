function kaboomSync(value: number): number {
  if (value == 99) {
    throw new Error("KABOOM! (sync!)");
  }

  return value * 100;
}

export = kaboomSync;
