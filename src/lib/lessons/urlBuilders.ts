export function buildLessonTabHref({
  baseParams,
  classId,
  grade,
}: {
  baseParams: Record<string, string>;
  classId: number;
  grade: number;
}) {
  const params = new URLSearchParams(baseParams);
  params.set("classId", classId.toString());
  params.set("grade", grade.toString());
  return `/list/lessons?${params.toString()}`;
}

export function buildGradeHref({
  baseParams,
  grade,
}: {
  baseParams: Record<string, string>;
  grade: number;
}) {
  const params = new URLSearchParams(baseParams);
  params.set("grade", grade.toString());
  return `/list/lessons?${params.toString()}`;
}
