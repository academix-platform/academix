/**
 * Utility to localize notification bodies dynamically based on active locale.
 * Supports backward-compatibility with English template strings stored in the DB.
 */
export function localizeNotificationBody(
  body: string | null | undefined,
  locale: string,
): string {
  if (!body) return "";
  if (locale !== "ar") return body;

  let m: RegExpMatchArray | null;

  // 1. A new assignment "X" has been posted for your child.
  m = body.match(/^A new assignment "(.*?)" has been posted for your child\.$/);
  if (m) return `تم نشر واجب جديد لطفلك: "${m[1]}".`;

  // 2. A new assignment "X" has been posted.
  m = body.match(/^A new assignment "(.*?)" has been posted\.$/);
  if (m) return `تم نشر واجب جديد: "${m[1]}".`;

  // 3. The assignment "X" has been updated.
  m = body.match(/^The assignment "(.*?)" has been updated\.$/);
  if (m) return `تم تحديث الواجب "${m[1]}".`;

  // 4. X submitted "Y".
  m = body.match(/^(.*?) submitted "(.*?)"\.$/);
  if (m) return `قام ${m[1]} بتسليم "${m[2]}".`;

  // 5. X left feedback on "Y".
  m = body.match(/^(.*?) left feedback on "(.*?)"\.$/);
  if (m) return `ترك ${m[1]} ملاحظات على "${m[2]}".`;

  // 6. A new exam "X" has been scheduled.
  m = body.match(/^A new exam "(.*?)" has been scheduled\.$/);
  if (m) return `تمت جدولة اختبار جديد: "${m[1]}".`;

  // 7. A new event "X" has been added.
  m = body.match(/^A new event "(.*?)" has been added\.$/);
  if (m) return `تمت إضافة فعالية جديدة: "${m[1]}".`;

  // 8. Your [exam/assignment] "X" has been graded: Y points.
  m = body.match(
    /^Your (exam|assignment) "(.*?)" has been graded:\s*(.*?)\s*points\.$/,
  );
  if (m) {
    const typeLabel = m[1] === "exam" ? "اختبارك" : "واجبك";
    return `تم تصحيح ${typeLabel} "${m[2]}": ${m[3]} درجة.`;
  }

  // 9. Your [exam/assignment] "X" grade has been updated to Y points.
  m = body.match(
    /^Your (exam|assignment) "(.*?)" grade has been updated to\s*(.*?)\s*points\.$/,
  );
  if (m) {
    const typeLabel = m[1] === "exam" ? "اختبارك" : "واجبك";
    return `تم تحديث درجة ${typeLabel} "${m[2]}" إلى ${m[3]} درجة.`;
  }

  // 10. X's [exam/assignment] "Y" has been graded: Z points.
  m = body.match(
    /^(.*?)'s (exam|assignment) "(.*?)" has been graded:\s*(.*?)\s*points\.$/,
  );
  if (m) {
    const typeLabel = m[2] === "exam" ? "اختبار" : "واجب";
    return `تم رصد درجات ${typeLabel} الطالب ${m[1]} "${m[3]}": ${m[4]} درجة.`;
  }

  // 11. Attendance for X students/student on Y has been recorded.
  m = body.match(/^Attendance for (.*?) on (.*?) has been recorded\.$/);
  if (m) {
    const countPart = m[1].replace(/\s*students?/i, " طالب");
    return `تم تسجيل الحضور لـ ${countPart} بتاريخ ${m[2]}.`;
  }

  // 12. The schedule for your class "X" has been updated.
  m = body.match(/^The schedule for your class "(.*?)" has been updated\.$/);
  if (m) return `تم تحديث الجدول الدراسي لصفك "${m[1]}".`;

  // 13. The schedule for class "X" has been updated.
  m = body.match(/^The schedule for class "(.*?)" has been updated\.$/);
  if (m) return `تم تحديث الجدول الدراسي للصف "${m[1]}".`;

  // 14. You have been assigned as supervisor for class "X".
  m = body.match(/^You have been assigned as supervisor for class "(.*?)"\.$/);
  if (m) return `تم تعيينك مشرفاً للصف "${m[1]}".`;

  return body;
}
