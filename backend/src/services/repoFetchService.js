import fs from "fs/promises";
import path from "path";
import { x as extractTar } from "tar";

// Downloads the repo's source at an exact commit as a tarball and
// extracts it to disk. We use GitHub's own archive endpoint (which
// redirects to a signed codeload.github.com URL) instead of `git clone`
// so we don't need git installed in the deployment environment, and
// instead of the GitHub Contents API so we get the whole tree in one
// request instead of one API call per file.
//
// Used by both analysisEngine (static analysis) and the AI semantic
// review pass - each needs the actual source at the scanned commit, and
// neither should duplicate this logic.
export const downloadAndExtractRepo = async (fullName, commitSha, accessToken, extractDir) => {
  const response = await fetch(`https://api.github.com/repos/${fullName}/tarball/${commitSha}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download repo archive: ${response.status} ${response.statusText}`);
  }

  const tarballPath = path.join(extractDir, "archive.tar.gz");
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(tarballPath, Buffer.from(arrayBuffer));

  await extractTar({ file: tarballPath, cwd: extractDir });

  // GitHub tarballs always extract into a single top-level folder named
  // like "owner-repo-<short-sha>" - find it rather than hardcoding the
  // name, since the exact short-sha length isn't guaranteed.
  const entries = await fs.readdir(extractDir, { withFileTypes: true });
  const repoFolder = entries.find((entry) => entry.isDirectory());

  if (!repoFolder) {
    throw new Error("Extracted archive did not contain a repository folder");
  }

  return path.join(extractDir, repoFolder.name);
};
