export type Default<T> = {
  defaultValue(): T;
  defaultValueAsString?(): string;
};
