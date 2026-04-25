export function parseLessonParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const getParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return {
    classId: getParam(searchParams.classId)
      ? Number(getParam(searchParams.classId))
      : null,

    grade: getParam(searchParams.grade)
      ? Number(getParam(searchParams.grade))
      : null,

    teacherId: getParam(searchParams.teacherId) ?? null,
  };
}
