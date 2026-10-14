/** class-transformer helper: trims string input, leaves other values unchanged. */
export const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
