type RawSearchParams = Record<string, string | string[] | undefined>;

export async function parseListParams(searchParams: RawSearchParams) {
  // PAGE
  const rawPage = await searchParams.page;

  const page =
    typeof rawPage === "string" && !isNaN(Number(rawPage))
      ? Math.max(1, parseInt(rawPage, 10))
      : 1;

  // REMOVE page from filters
  const { page: _, ...filters } = searchParams;

  return {
    page,
    filters,
  };
}
