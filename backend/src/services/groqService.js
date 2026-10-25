const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

const RETRYABLE_STATUS = [429, 500, 503];
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Shared call into Groq's chat completions API. Groq follows the OpenAI
// request format, so we use plain fetch instead of an SDK.
//
// response_format json_object makes Groq return valid JSON text. Groq
// requires the word "JSON" to appear in the prompt when this is on, and
// it only accepts a JSON object (not a bare array) as the top level.
const callGroq = async (prompt) => {
  let response;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    // Stop on success, or on errors that retrying can't fix (bad key, bad request)
    if (response.ok || !RETRYABLE_STATUS.includes(response.status)) break;

    // Wait longer after each failed attempt: 2s, then 4s
    if (attempt < MAX_ATTEMPTS) await sleep(attempt * 2000);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API request failed (${response.status}): ${errorBody.error?.message || "Unknown error"}`,
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice) {
    throw new Error("Groq returned no choices");
  }

  // "length" means the response was cut off, so the JSON would be incomplete
  if (choice.finish_reason === "length") {
    throw new Error("Groq response was cut off before it finished");
  }

  const text = choice.message?.content;
  if (!text) {
    throw new Error("Groq response had no text content");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Groq response was not valid JSON");
  }
};

// @param issue - object with ruleId, category, severity, message,
// filePath, lineNumber, codeSnippet
// Returns { explanation, suggestedFix }
export const explainIssue = async (issue) => {
  // The code snippet comes from a repo we don't control. We only parse two
  // string fields out of the response and never execute it, so a prompt
  // injection in the snippet can at worst produce a bad explanation.
  const prompt = `You are a senior software engineer reviewing a static analysis finding.

Issue details:
- Rule: ${issue.ruleId}
- Category: ${issue.category}
- Severity: ${issue.severity}
- Message: ${issue.message}
- File: ${issue.filePath}${issue.lineNumber ? `, line ${issue.lineNumber}` : ""}

Code snippet:
\`\`\`
${issue.codeSnippet || "(no snippet available)"}
\`\`\`

Respond with ONLY a JSON object in this exact shape, no other text:
{
  "explanation": "2-3 sentences explaining why this is a problem and its real-world impact, written for a student developer",
  "suggestedFix": "A concrete code-level suggestion for how to fix it, including a corrected code example if relevant"
}`;

  const result = await callGroq(prompt);

  if (!result.explanation || !result.suggestedFix) {
    throw new Error("Groq response was missing required fields");
  }

  return {
    explanation: result.explanation,
    suggestedFix: result.suggestedFix,
  };
};

// @param files - array of { filePath, content }
// Reviews source code for issues static rules can't catch: missing
// authorization checks, injection patterns, hardcoded secrets.
// Returns an array of findings.
export const semanticReview = async (files) => {
  const fileBlocks = files
    .map((file) => `--- FILE: ${file.filePath} ---\n${file.content}`)
    .join("\n\n");

  const prompt = `You are a senior application security engineer performing a manual code review. Static analysis tools (ESLint, dependency scanners) have already run. Your job is to find issues that pattern-based rules miss because they require understanding intent, such as:
- SQL/NoSQL/command injection where user input reaches a query or shell call in a way a generic rule would not catch
- Missing authentication or authorization checks on a route or function that clearly should have one
- Hardcoded secrets, API keys, or credentials
- Logic bugs where the code's behavior does not match what it appears intended to do

Only report findings you are genuinely confident about. Do not report generic style issues, and do not repeat things a basic linter would already catch (unused variables, missing semicolons, etc).

${fileBlocks}

Respond with ONLY a JSON object in this exact shape, no other text. Use an empty findings array if you find nothing significant:
{
  "findings": [
    {
      "filePath": "the exact file path as given above",
      "lineNumber": <number or null if not line-specific>,
      "category": "security" or "correctness",
      "severity": "critical" or "high" or "medium" or "low",
      "message": "A specific, actionable description of the issue and why it matters"
    }
  ]
}`;

  const result = await callGroq(prompt);

  if (!Array.isArray(result.findings)) {
    throw new Error(
      "Groq semantic review response was missing a findings array",
    );
  }

  return result.findings;
};
