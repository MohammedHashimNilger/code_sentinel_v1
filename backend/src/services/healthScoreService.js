// Fix #1: severity-tiered scoring. Two issues with the same "severity"
// label shouldn't cost the same if they're different kinds of problem -
// a "critical" naming nit isn't remotely as dangerous as a "critical"
// SQL injection risk. CATEGORY_WEIGHT is what actually encodes "security
// vulnerabilities weighted highest, correctness bugs next, maintainability
// nits weighted lowest" - it's the dominant factor, with SEVERITY_WEIGHT
// providing finer-grained scaling within a category.
const CATEGORY_WEIGHT = {
  security: 5,
  correctness: 2,
  maintainability: 1,
};

const SEVERITY_WEIGHT = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
};

// Controls how quickly the score drops as penalty accumulates. Larger =
// more forgiving. Chosen so that a single critical security issue (the
// worst realistic single finding: 5 * 10 = 50 penalty) drops the score
// to the high 70s - noticeable, but not "this repo is a disaster" for
// one issue - while dozens of accumulated issues push the score toward
// single digits.
const DECAY_SCALE = 200;

const calculatePenalty = (issue) => {
  const categoryWeight = CATEGORY_WEIGHT[issue.category] ?? 1;
  const severityWeight = SEVERITY_WEIGHT[issue.severity] ?? 1;
  return categoryWeight * severityWeight;
};

// Converts a list of issues into a single 0-100 health score.
//
// We use exponential decay (100 * e^-(penalty/scale)) rather than plain
// linear subtraction (100 - penalty) for two reasons:
//   1. Linear subtraction needs an artificial floor at 0 - a repo with
//      30 issues and one with 300 would both just show "0", which
//      throws away information about how much worse the second one is.
//   2. Diminishing marginal impact is the realistic behavior: the 1st
//      critical security issue should hurt a lot more than the 50th
//      low-severity naming nit on an already-messy file. Exponential
//      decay naturally produces that curve; linear subtraction treats
//      every point of penalty as equally damaging regardless of how
//      unhealthy the repo already is.
//
// The result is always in the range (0, 100], asymptotically approaching
// (but never exactly hitting) 0 for extremely bad repos, and rounds to
// a clean integer for display.
export const calculateHealthScore = (issues) => {
  if (issues.length === 0) return 100;

  const totalPenalty = issues.reduce((sum, issue) => sum + calculatePenalty(issue), 0);

  const score = 100 * Math.exp(-totalPenalty / DECAY_SCALE);

  return Math.round(score);
};
