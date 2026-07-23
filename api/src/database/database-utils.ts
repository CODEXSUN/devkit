export function assertDatabaseName(value: string) {
  if (!/^[a-zA-Z0-9_]+$/u.test(value)) {
    throw new Error(`Invalid DevKit database name: ${value}`);
  }
  return value;
}

export function quoteIdentifier(value: string) {
  return `\`${assertDatabaseName(value)}\``;
}
