export type Default<T> = {
  /**
   * A default value to be provided when a value is missing.
   * i.e., `string | null` should probably return `null`.
   */
  defaultValue(): T;
  defaultValueIsSerializable?: boolean;
};
