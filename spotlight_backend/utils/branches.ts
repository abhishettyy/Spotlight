/**
 * The college's branches. Students pick one at sign-up (or onboarding after Google sign-in);
 * the student website and the Flutter app show this same list, so keep the three in step.
 */
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

/** The branch exactly as listed, or null when it isn't one of the college's branches. */
export function normalizeBranch(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  return BRANCHES.find((b) => b.toLowerCase() === v) ?? null;
}

export const INVALID_BRANCH_MESSAGE = 'Please choose your branch from the list.';
