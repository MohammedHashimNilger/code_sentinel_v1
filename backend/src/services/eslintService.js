import { ESLint } from "eslint";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// This service's own directory, used below to tell ESLint where to find
// our plugins (eslint-plugin-security) from - NOT from the scanned
// repo's directory, which is what "cwd: repoPath" would otherwise imply
// and which doesn't have our tooling's dependencies installed.
const SERVICE_DIR = path.dirname(fileURLToPath(import.meta.url));

// We intentionally do NOT load the scanned repo's own .eslintrc. ESLint
// configs can specify custom parsers and plugins, which are just
// arbitrary Node.js code that gets require()'d and executed during
// linting. Since we're linting code from repos we don't control, honoring
// their config would mean running untrusted code with our server's own
// permissions. Bringing a single fixed config we own avoids that risk
// entirely, at the cost of not respecting repo-specific style choices -
// a reasonable trade-off for a security-focused tool.
const buildLintConfig = () => ({
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  env: {
    es2021: true,
    node: true,
    browser: true,
  },
  plugins: ["security"],
  extends: ["eslint:recommended", "plugin:security/recommended-legacy"],
  ignorePatterns: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/*.min.js", "**/vendor/**"],
  rules: {
    // Fix #2: cyclomatic complexity, not line count. Flags any function
    // with a cyclomatic complexity above 10 (industry-common threshold -
    // beyond this, functions become hard to fully test and reason about).
    complexity: ["warn", 10],

    // Maintainability nits
    "no-var": "warn",
    camelcase: "warn",
    "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
    "no-magic-numbers": [
      "warn",
      { ignore: [-1, 0, 1, 2], ignoreArrayIndexes: true, detectObjects: false },
    ],

    // Correctness - stricter than the default "recommended" warn level,
    // since a loose equality bug is a real source of runtime issues.
    eqeqeq: "warn",
  },
});

// Rules whose category/severity we know in advance. Anything not listed
// here falls back to a safe default (see categorizeRule below) so an
// unrecognized rule still gets *a* reasonable classification instead of
// crashing the scan.
const RULE_METADATA = {
  // Correctness - eslint:recommended rules likely to indicate real bugs
  "no-undef": { category: "correctness", severity: "high" },
  "no-dupe-keys": { category: "correctness", severity: "high" },
  "no-dupe-args": { category: "correctness", severity: "high" },
  "no-unsafe-negation": { category: "correctness", severity: "high" },
  "no-fallthrough": { category: "correctness", severity: "medium" },
  "no-unreachable": { category: "correctness", severity: "medium" },
  "no-constant-condition": { category: "correctness", severity: "medium" },
  "no-cond-assign": { category: "correctness", severity: "medium" },
  "no-case-declarations": { category: "correctness", severity: "medium" },
  "no-prototype-builtins": { category: "correctness", severity: "low" },
  "no-unused-vars": { category: "correctness", severity: "low" },
  "no-empty": { category: "correctness", severity: "low" },
  eqeqeq: { category: "correctness", severity: "low" },

  // Maintainability nits
  "no-var": { category: "maintainability", severity: "low" },
  camelcase: { category: "maintainability", severity: "low" },
  "max-lines-per-function": { category: "maintainability", severity: "low" },
  "no-magic-numbers": { category: "maintainability", severity: "low" },
};

// eslint-plugin-security's "recommended" rules all indicate genuine
// security concerns (eval, unsafe regex, non-literal fs paths that could
// enable path traversal, etc.), so every rule with this prefix is
// category "security" regardless of whether it's individually listed.
const isSecurityRule = (ruleId) => ruleId && ruleId.startsWith("security/");

// Parses "Function 'foo' has a complexity of 14. Maximum allowed is 10."
// to pull out the actual complexity number, so severity reflects how far
// over the threshold a function is instead of a single flat severity for
// every flagged function.
const parseComplexityScore = (message) => {
  const match = message.match(/complexity of (\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

const complexitySeverity = (score) => {
  if (score >= 21) return "critical";
  if (score >= 16) return "high";
  if (score >= 11) return "medium";
  return "low";
};

const categorizeMessage = (ruleId, message) => {
  if (ruleId === "complexity") {
    const score = parseComplexityScore(message);
    return {
      category: "correctness",
      severity: complexitySeverity(score ?? 11),
      complexityScore: score,
    };
  }

  if (isSecurityRule(ruleId)) {
    // A handful of security plugin rules are noisier / lower-confidence
    // than the rest (they flag patterns that are often intentional), so
    // they're downgraded to medium rather than high.
    const noisyRules = ["security/detect-object-injection", "security/detect-non-literal-fs-filename"];
    return {
      category: "security",
      severity: noisyRules.includes(ruleId) ? "medium" : "high",
    };
  }

  const known = RULE_METADATA[ruleId];
  if (known) {
    return { category: known.category, severity: known.severity };
  }

  // Safe fallback for any eslint:recommended rule we didn't explicitly
  // classify - better to under-weight an unknown finding than to skip it.
  return { category: "correctness", severity: "low" };
};

// Reads the specific offending line from disk to give the issue a code
// snippet for context in the dashboard, without needing the whole file.
const getCodeSnippet = (filePath, lineNumber) => {
  if (!lineNumber) return null;
  try {
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    return lines[lineNumber - 1]?.trim() || null;
  } catch {
    // File might have been removed/renamed mid-scan, or be non-UTF8 -
    // a missing snippet isn't worth failing the whole scan over.
    return null;
  }
};

// Runs ESLint against every JS/JSX file in repoPath and returns a flat
// array of normalized issue objects (not yet Mongoose documents - the
// analysis engine handles turning these into Issue records).
export const lintDirectory = async (repoPath) => {
  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfig: buildLintConfig(),
    // Without this, ESLint tries to resolve "eslint-plugin-security"
    // relative to repoPath (the scanned repo), which doesn't have our
    // tooling's node_modules. Pointing it at our own service directory
    // makes plugin resolution independent of what's being scanned.
    resolvePluginsRelativeTo: SERVICE_DIR,
    cwd: repoPath,
    // Passing the directory itself (rather than separate "**/*.js" and
    // "**/*.jsx" glob patterns) with an explicit extensions list avoids
    // ESLint throwing when a repo happens to have zero files of one of
    // the extensions - a glob pattern that matches nothing is treated as
    // an error, but "no .jsx files in this particular repo" isn't one.
    extensions: [".js", ".jsx"],
  });

  let results;
  try {
    results = await eslint.lintFiles([repoPath]);
  } catch (error) {
    if (error.messageTemplate === "file-not-found") {
      // No JS/JSX files anywhere in the repo at all - a valid outcome
      // (e.g. a repo that's pure Python or docs), not a scan failure.
      return [];
    }
    throw error;
  }

  const issues = [];

  for (const fileResult of results) {
    const relativeFilePath = path.relative(repoPath, fileResult.filePath);

    for (const message of fileResult.messages) {
      // ESLint fatal parse errors have no ruleId - still worth surfacing
      // since it means the file couldn't even be analyzed, but they
      // don't map to our rule metadata table.
      const ruleId = message.ruleId || "parse-error";
      const { category, severity, complexityScore } = categorizeMessage(ruleId, message.message);

      issues.push({
        category,
        severity,
        source: ruleId === "complexity" ? "complexity" : "eslint",
        ruleId,
        message: message.message,
        filePath: relativeFilePath,
        lineNumber: message.line || null,
        codeSnippet: getCodeSnippet(fileResult.filePath, message.line),
        complexityScore: complexityScore ?? undefined,
      });
    }
  }

  return issues;
};
