export function computeClassSelection({
  classes,
  selectedClassId,
  selectedGrade,
}: {
  classes: any[];
  selectedClassId: number | null;
  selectedGrade: number | null;
}) {
  const availableGrades = Array.from(
    new Set(classes.map((c) => c.grade.level)),
  ).sort((a, b) => a - b);

  const defaultGrade = availableGrades.includes(1) ? 1 : availableGrades[0];

  const grade =
    selectedGrade && availableGrades.includes(selectedGrade)
      ? selectedGrade
      : defaultGrade;

  const filteredClasses = classes.filter((c) => c.grade.level === grade);

  const selectedClass =
    filteredClasses.find((c) => c.id === selectedClassId) || filteredClasses[0];

  return {
    availableGrades,
    selectedGrade: grade,
    filteredClasses,
    selectedClass,
  };
}
