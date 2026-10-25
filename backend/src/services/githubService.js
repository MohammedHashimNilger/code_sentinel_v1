const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

export const getGithubOAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: "repo admin:repo_hook",
    state,
  });

  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
};

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
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
};

const GITHUB_API_BASE = "https://api.github.com";

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

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const fetchGithubUser = async (accessToken) => {
  return githubApiRequest("/user", accessToken);
};

export const listUserRepos = async (accessToken) => {
  return githubApiRequest("/user/repos?per_page=100&sort=updated", accessToken);
};

export const fetchRepoById = async (accessToken, githubRepoId) => {
  return githubApiRequest(`/repositories/${githubRepoId}`, accessToken);
};

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

export const deleteWebhook = async (accessToken, fullName, webhookId) => {
  await githubApiRequest(`/repos/${fullName}/hooks/${webhookId}`, accessToken, {
    method: "DELETE",
  });
};

export const getLatestCommitSha = async (accessToken, fullName, branch) => {
  const commit = await githubApiRequest(`/repos/${fullName}/commits/${branch}`, accessToken);
  return commit.sha;
};
