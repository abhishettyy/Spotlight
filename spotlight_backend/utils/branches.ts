export const BRANCHES = [
  'Aerospace Engineering',
  'Artificial Intelligence and Data Science',
  'Artificial Intelligence and Machine Learning',
  'Biotechnology',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Science and Engineering (CSE)',
  'CSE (Artificial Intelligence and Machine Learning)',
  'CSE (Cybersecurity)',
  'Electrical and Electronics Engineering (EEE)',
  'Electronics and Communication Engineering (ECE)',
  'Electronics and Instrumentation Engineering',
  'Electronics and Telecommunication Engineering',
  'Industrial Engineering and Management',
  'Information Science and Engineering (ISE)',
  'Mechanical Engineering',
  'Medical Electronics Engineering',
] as const;

export function normalizeBranch(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  return BRANCHES.find((b) => b.toLowerCase() === v) ?? null;
}

export const INVALID_BRANCH_MESSAGE = 'Please choose your branch from the list.';

export function readAllowedBranches(stored: string | null | undefined): string[] | null {
  if (!stored) return null;
  try {
    const list = JSON.parse(stored);
    if (!Array.isArray(list)) return null;
    const clean = list.map(normalizeBranch).filter((b): b is string => !!b);
    return clean.length > 0 ? clean : null;
  } catch {
    return null;
  }
}

export function parseAllowedBranchesInput(input: unknown): string[] | null | 'invalid' {
  if (input === undefined || input === null || input === '') return null;
  if (!Array.isArray(input)) return 'invalid';
  const clean: string[] = [];
  for (const item of input) {
    const b = normalizeBranch(item);
    if (!b) return 'invalid';
    if (!clean.includes(b)) clean.push(b);
  }
  if (clean.length === 0 || clean.length === BRANCHES.length) return null;
  return BRANCHES.filter((b) => clean.includes(b));
}

export function branchNotAllowedMessage(allowed: string[] | null, studentBranch: string | null | undefined): string | null {
  if (!allowed) return null;
  if (!studentBranch) return 'Please add your branch to your profile before registering for this event.';
  const branch = normalizeBranch(studentBranch) ?? studentBranch;
  if (allowed.includes(branch)) return null;
  return `${branch} students are not eligible for this event. It is open only to ${allowed.join(', ')}.`;
}
