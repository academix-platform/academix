/**
 * Dictionary and helper to translate validation and backend action error messages to Arabic.
 */

const ARABIC_MESSAGES: Record<string, string> = {
  // Required fields
  "Subject name is required!": "اسم المادة مطلوب!",
  "Grade is required!": "المرحلة الدراسية مطلوبة!",
  "Class name is required!": "اسم الفصل مطلوب!",
  "Capacity is required!": "السعة الاستيعابية مطلوبة!",
  "Grade ID is required!": "معرف المرحلة مطلوب!",
  "Grade level is required!": "المستوى الدراسي مطلوب!",
  "First name is required!": "الاسم مطلوب!",
  "Address Type is required!": "العنوان مطلوب!",
  "Blood Type is required!": "فصيلة الدم مطلوبة!",
  "Birthday is required!": "تاريخ الميلاد مطلوب!",
  "Sex is required!": "الجنس مطلوب!",
  "Subject is required!": "المادة مطلوبة!",
  "Class is required!": "الفصل مطلوب!",
  "Lesson name is required!": "اسم الحصة مطلوب!",
  "Day is required!": "اليوم مطلوب!",
  "Start time is required!": "وقت البدء مطلوب!",
  "End time is required!": "وقت الانتهاء مطلوب!",
  "Teacher is required!": "المعلم مطلوب!",
  "Date is required.": "التاريخ مطلوب.",
  "Date is required!": "التاريخ مطلوب!",
  "Academic year name is required.": "اسم العام الدراسي مطلوب.",
  "Start date is required.": "تاريخ البدء مطلوب.",
  "Start date is required!": "تاريخ البدء مطلوب!",
  "End date is required.": "تاريخ الانتهاء مطلوب.",
  "End date is required!": "تاريخ الانتهاء مطلوب!",
  "Exam title is required!": "عنوان الاختبار مطلوب!",
  "Assignment title is required!": "عنوان الواجب مطلوب!",
  "Student is required!": "الطالب مطلوب!",
  "Assessment type is required!": "نوع التقييم مطلوب!",
  "Assessment is required!": "التقييم مطلوب!",
  "Attendance scope is required!": "نطاق تسجيل الحضور مطلوب!",
  "Record id is required!": "معرف السجل مطلوب!",
  "Event title is required!": "عنوان الفعالية مطلوب!",
  "Description is required!": "الوصف مطلوب!",
  "Announcement title is required!": "عنوان الإعلان مطلوب!",
  "Message title is required!": "عنوان الرسالة مطلوب!",
  "Duration is required when timer is enabled": "المدة مطلوبة عند تفعيل المؤقت",

  // Length and range constraints
  "Username must be at least 4 characters long!": "يجب أن يتكون اسم المستخدم من 4 أحرف على الأقل!",
  "Username must be at most 20 characters long!": "يجب ألا يتجاوز اسم المستخدم 20 حرفاً!",
  "Password must be at least 8 characters long!": "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل!",
  "Invalid email address!": "البريد الإلكتروني غير صالح!",
  "Phone number must be at least 10 characters long!": "يجب أن يتكون رقم الهاتف من 10 أرقام على الأقل!",
  "Phone number must be at most 10 characters long!": "يجب ألا يتجاوز رقم الهاتف 10 أرقام!",
  "Add at least one subject!": "أضف مادة واحدة على الأقل!",
  "At least one class is required!": "فصل واحد على الأقل مطلوب!",
  "Marks must be greater than 0!": "يجب أن تكون الدرجة أكبر من 0!",
  "Score must be at least 0!": "يجب أن تكون الدرجة 0 على الأقل!",
  "Score cannot be greater than 100!": "لا يمكن أن تكون الدرجة أكبر من 100!",
  "At least one attendance record is required!": "سجل حضور واحد على الأقل مطلوب!",
  "Select at least one recipient.": "اختر مستلماً واحداً على الأقل.",
  "Schedule entries are required.": "إدخالات الجدول مطلوبة.",
  "Duplicate lesson slot found.": "تم العثور على حصة مكررة في نفس الفترة.",
  "Select a teacher": "اختر معلماً",
  "Select at least one subject in the weekly schedule.": "اختر مادة واحدة على الأقل في الجدول الأسبوعي.",
  "Invalid start time.": "وقت البدء غير صالح.",
  "Invalid end time.": "وقت الانتهاء غير صالح.",
  "Lesson duration must be at least 15 minutes.": "يجب أن تكون مدة الحصة 15 دقيقة على الأقل.",
  "Lesson duration cannot exceed 180 minutes.": "لا يمكن أن تتجاوز مدة الحصة 180 دقيقة.",
  "Lessons per day must be at least 1.": "يجب أن تكون عدد الحصص باليوم 1 على الأقل.",
  "Lessons per day cannot exceed 12.": "لا يمكن أن يتجاوز عدد الحصص 12 حصة باليوم.",
  "Work day end must be after work day start.": "يجب أن يكون انتهاء اليوم الدراسي بعد بدايته.",
  "Total lessons duration exceeds the available work day time window.": "مجموع مدد الحصص يتجاوز الوقت المتاح لليوم الدراسي.",
  "Select at least one working day.": "اختر يوم عمل واحداً على الأقل.",
  "End time must be after start time!": "يجب أن يكون وقت الانتهاء بعد وقت البدء!",
  "End time must be after start time": "يجب أن يكون وقت الانتهاء بعد وقت البدء!",
  "Academic year end date must be after start date.": "يجب أن يكون تاريخ نهاية العام الدراسي بعد تاريخ بدايته.",
  "End date must be after start date!": "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء!",
  "Min file size cannot exceed max file size": "لا يمكن أن يتجاوز الحد الأدنى لحجم الملف الحد الأقصى",

  // Exam workflow
  "MCQ must have at least 2 options": "يجب أن يحتوي السؤال متعدد الخيارات على خيارين على الأقل",
  "All options must have text. Please fill in all choices.": "يجب تعبئة نص جميع الخيارات.",
  "Please select the correct answer for this question": "يرجى تحديد الإجابة الصحيحة لهذا السؤال",
  "Please select whether the statement is True or False": "يرجى تحديد ما إذا كانت العبارة صح أم خطأ",
  "Please provide a model answer for this text question": "يرجى تقديم إجابة نموذجية لهذا السؤال النصي",

  // Generic Zod fallbacks
  "Required": "هذا الحقل مطلوب",
  "Invalid input": "إدخال غير صالح",

  // Backend / Server Action common messages
  "Something went wrong!": "حدث خطأ ما! يرجى المحاولة لاحقاً.",
  "You are not allowed to perform this action.": "ليس لديك الصلاحية لتنفيذ هذا الإجراء.",
  "Your school is not active yet. Please wait for super admin approval.": "مدرستك غير مفعلة بعد. يرجى انتظار موافقة المشرف العام.",
  "Your school is pending approval by a super admin.": "مدرستك في انتظار موافقة المشرف العام.",
  "No current academic year found. Create one and mark it as current in settings.": "لا يوجد عام دراسي حالي. يرجى إنشاء عام دراسي وتعيينه كعام حالي في الإعدادات.",
  "Please choose a stronger password, try to  include a mix of uppercase and lowercase letters, numbers, and special characters (!, @, #, $, %, &)": "يرجى اختيار كلمة مرور أقوى تحتوي على مزيج من الأحرف الكبيرة والصغيرة والأرقام والرموز الخاصة.",
  "That password may be unsafe. Please choose a different password that you have not used elsewhere.": "قد تكون كلمة المرور غير آمنة. يرجى اختيار كلمة مرور مختلفة لم تستخدمها في مكان آخر.",
};

export function localizeValidationError(
  message: unknown,
  locale: string = "ar",
): string {
  if (typeof message !== "string" || !message.trim()) {
    return "";
  }

  if (locale !== "ar") {
    return message;
  }

  const trimmed = message.trim();
  if (ARABIC_MESSAGES[trimmed]) {
    return ARABIC_MESSAGES[trimmed];
  }

  // Fallback checks
  if (trimmed.startsWith("Your school account is paused.")) {
    const reasonPart = trimmed.replace("Your school account is paused.", "").trim();
    return `تم إيقاف حساب مدرستك مؤقتاً. ${reasonPart ? reasonPart.replace("Reason:", "السبب:") : ""}`;
  }

  return message;
}
