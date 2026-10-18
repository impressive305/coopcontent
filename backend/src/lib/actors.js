import { prisma } from './prisma.js';
import { HttpError } from './errors.js';

// Resolve the student/company profile behind the authenticated user.
export const currentStudent = async (userId) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new HttpError(403, 'Student profile required');
  return student;
};

export const currentCompany = async (userId) => {
  const company = await prisma.company.findUnique({ where: { userId } });
  if (!company) throw new HttpError(403, 'Company profile required');
  return company;
};
