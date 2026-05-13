export type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export const getQueryParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const searchParamsToRecord = (
  params: URLSearchParams,
): Record<string, string | string[]> => {
  const result: Record<string, string | string[]> = {};

  for (const key of params.keys()) {
    const values = params.getAll(key);
    if (values.length === 1) {
      result[key] = values[0];
    } else if (values.length > 1) {
      result[key] = values;
    }
  }

  return result;
};
