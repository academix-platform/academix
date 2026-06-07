// Subject actions
export { createSubject, updateSubject, deleteSubject } from "./subject.actions";

// Class actions
export { createClass, updateClass, deleteClass } from "./class.actions";
export { createGrade, deleteGrade } from "./grade.actions";

// Teacher actions
export { createTeacher, updateTeacher, deleteTeacher } from "./teacher.actions";

// Student actions
export { createStudent, updateStudent, deleteStudent } from "./student.actions";
export { promoteStudentsByPerformance } from "./studentPromotion.actions";

// Parent actions
export { createParent, updateParent, deleteParent } from "./parent.actions";

// Lesson actions
export { saveLessonSchedule } from "./lesson.actions";

// Exam actions
export { createExam, updateExam, deleteExam } from "./exam.actions";

// Assignment actions
export {
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "./assignment.actions";

// Result actions
export { createResult, updateResult, deleteResult } from "./result.actions";
export { updateStudentFinalGrade } from "./finalResult.actions";

// Attendance actions
export { saveDailyAttendance } from "./attendance.actions";

// Event actions
export { createEvent, updateEvent, deleteEvent } from "./event.actions";

// Announcement actions
export {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "./announcement.actions";

// Message actions
export { createMessage, updateMessage, deleteMessage } from "./message.actions";

// School settings actions
export {
  updateSchoolSettings,
  updateSchoolWorkingDays,
  createSchoolDayException,
  deleteSchoolDayException,
} from "./schoolSettings.actions";

// Academic year actions
export { createAcademicYear, updateAcademicYear } from "./academicYear.actions";

// Exam Workflow actions
export {
  createExamWorkflow,
  updateExamWorkflow,
  startExam,
  getExamPage,
  saveAnswer,
  submitExam,
  gradeAnswer,
  extendTime,
  recordDisconnection,
  approveAndFinalizeGrading,
  publishAllGrades,
  publishExamGrades,
} from "./examWorkflow.actions";

// Study material actions
export * from "./studyMaterial.actions";

// Assignment submission actions
export * from "./submission.actions";

// AI evaluation actions
export * from "./aiEvaluation.actions";

// Subject page settings actions
export * from "./subjectPageSettings.actions";
