// All direct communication with GitHub's API lives here, so the
// controller doesn't need to know about GitHub's specific endpoints,
// headers, or response shapes.

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

// Builds the URL we redirect the user to in order to start the GitHub
// OAuth flow. "state" is a random value we generated and stored in a
// short-lived cookie - GitHub sends it back unchanged on the callback,
// and we compare it to the cookie to confirm the callback actually
// came from a redirect we initiated (CSRF protection).
export const getGithubOAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    // "repo" is needed to read private repo contents for scanning.
    // "admin:repo_hook" is needed to create/delete webhooks (Phase 4/5).
    scope: "repo admin:repo_hook",
    state,
  });

  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
};

// Exchanges the temporary authorization code GitHub sent to our callback
// for a real access token we can use on GitHub's API.
export const exchangeCodeForAccessToken = async (code) => {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
    }),
  });

  const data = await response.json();

  if (data.error) {
    // GitHub returns 200 OK even on failure, with an "error" field in
    // the body instead of a non-2xx status - so we have to check this
    // manually rather than relying on response.ok.
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
};

const GITHUB_API_BASE = "https://api.github.com";

// Small shared helper for authenticated GitHub API calls - every function
// below needs the same Authorization header and the same "check for a
// non-2xx response" logic, so this avoids repeating both in every function.
const githubApiRequest = async (path, accessToken, options = {}) => {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub API request failed (${response.status} ${path}): ${errorBody.message || "Unknown error"}`
    );
  }

  // DELETE requests to GitHub's API return 204 No Content - there's no
  // JSON body to parse in that case.
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

// Fetches the authenticated user's GitHub profile using their access
// token. Used right after the token exchange to know who just logged in.
export const fetchGithubUser = async (accessToken) => {
  return githubApiRequest("/user", accessToken);
};

// Lists repositories the authenticated user owns or collaborates on.
// Capped at 100 results (GitHub's max per_page) - a user with more repos
// than that would need pagination, which is a reasonable known limitation
// for a final-year project rather than something worth over-engineering.
export const listUserRepos = async (accessToken) => {
  return githubApiRequest("/user/repos?per_page=100&sort=updated", accessToken);
};

// Fetches a single repo by GitHub's numeric ID rather than by owner/name.
// This matters for connectRepo: the client only sends an ID, and we look
// the repo up ourselves instead of trusting owner/name strings the client
// could tamper with. If the authenticated user doesn't actually have
// access to that repo, GitHub responds 404 and this throws - so the
// lookup doubles as an authorization check.
export const fetchRepoById = async (accessToken, githubRepoId) => {
  return githubApiRequest(`/repositories/${githubRepoId}`, accessToken);
};

// Registers a webhook on the repo so GitHub notifies us on every push.
// The webhook is configured with a shared secret - GitHub signs every
// payload with it (HMAC), which webhookController verifies in Phase 5
// to confirm incoming requests genuinely came from GitHub.
export const createWebhook = async (accessToken, fullName, webhookUrl) => {
  const webhook = await githubApiRequest(`/repos/${fullName}/hooks`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["push"],
      config: {
        url: webhookUrl,
        content_type: "json",
        secret: process.env.GITHUB_WEBHOOK_SECRET,
      },
    }),
  });

  return webhook.id;
};

// Removes the webhook from GitHub when a user disconnects a repo.
export const deleteWebhook = async (accessToken, fullName, webhookId) => {
  await githubApiRequest(`/repos/${fullName}/hooks/${webhookId}`, accessToken, {
    method: "DELETE",
  });
};

// Fetches the latest commit SHA on a branch. Used when a user manually
// triggers a scan (rather than one arriving via webhook push) - we still
// need a concrete commit to scan against, and "whatever's currently at
// the tip of the default branch" is the correct thing to scan in that case.
export const getLatestCommitSha = async (accessToken, fullName, branch) => {
  const commit = await githubApiRequest(`/repos/${fullName}/commits/${branch}`, accessToken);
  return commit.sha;
};
