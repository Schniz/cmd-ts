export type Assign<T extends {}, Key extends keyof T, Value> = {
  [key in keyof T | Key]: key extends Key ? Value : T[key];
};

export function assign<T, Key extends keyof T, Value>(
  t: T,
  key: Key,
  value: Value
): Assign<T, Key, Value> {
  return { ...t, [key]: value } as any;
}
