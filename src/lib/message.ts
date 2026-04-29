import { Class, Message, Parent, Student, Teacher } from "@prisma/client";

export type MessageList = Message & {
  classes: Pick<Class, "id" | "name">[];
  students: Pick<Student, "id" | "name">[];
  parents: Pick<Parent, "id" | "name">[];
  teachers: Pick<Teacher, "id" | "name">[];
};

export const getRecipientsPreview = (item: MessageList) => {
  const recipients = [
    ...item.students.map((student) => student.name),
    ...item.parents.map((parent) => parent.name),
    ...item.teachers.map((teacher) => teacher.name),
  ];

  if (recipients.length === 0) return "-";
  if (recipients.length === 1) return recipients[0];

  return `${recipients[0]} +${recipients.length - 1} more`;
};

export const getDescriptionPreview = (description: string) => {
  const text = description.trim();

  if (text.length <= 40) {
    return text;
  }

  return `${text.slice(0, 40).trimEnd()}...`;
};
