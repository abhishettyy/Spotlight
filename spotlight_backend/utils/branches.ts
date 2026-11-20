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

/**
 * Event eligibility, as stored in Event.allowedBranches: null means open to all branches,
 * otherwise a JSON array of branch names from BRANCHES.
 */
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

/**
 * Checks what a club sent when creating an event. Nothing, an empty list or every branch means
 * open to all (null). Returns 'invalid' when a name isn't one of the college's branches.
 */
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
  // Keep the college's order, so the list reads the same everywhere
  return BRANCHES.filter((b) => clean.includes(b));
}

/** Why this student can't register, or null when their branch is allowed. */
export function branchNotAllowedMessage(allowed: string[] | null, studentBranch: string | null | undefined): string | null {
  if (!allowed) return null;
  if (!studentBranch) return 'Please add your branch to your profile before registering for this event.';
  const branch = normalizeBranch(studentBranch) ?? studentBranch;
  if (allowed.includes(branch)) return null;
  return `${branch} students are not eligible for this event. It is open only to ${allowed.join(', ')}.`;
}
