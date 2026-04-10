export type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export const getQueryParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
