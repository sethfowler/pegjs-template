export function assertExhaustive(value: never): never {
  throw new Error(`Unhandled case: ${value}`);
}
