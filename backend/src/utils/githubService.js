const axios = require('axios');

/**
 * Fetches repository structure from GitHub
 */
async function fetchRepoContent(owner, repo, path = '') {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });
    return response.data;
  } catch (err) {
    console.error('GitHub Fetch Error:', err.response?.data || err.message);
    throw new Error(err.response?.data?.message || 'Failed to fetch from GitHub');
  }
}

/**
 * Downloads raw file content from GitHub
 */
async function downloadFile(downloadUrl) {
  try {
    const response = await axios.get(downloadUrl);
    return response.data;
  } catch (err) {
    console.error('GitHub Download Error:', err.message);
    throw new Error('Failed to download file from GitHub');
  }
}

async function getBranch(owner, repo, branch = 'main', token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
  const response = await axios.get(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${token}`
    }
  });
  return response.data;
}

async function createBlob(owner, repo, content, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs`;
  const response = await axios.post(url, {
    content,
    encoding: 'utf-8'
  }, {
    headers: { 'Authorization': `token ${token}` }
  });
  return response.data;
}

async function createTree(owner, repo, baseTreeSha, treeItems, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees`;
  const response = await axios.post(url, {
    base_tree: baseTreeSha,
    tree: treeItems
  }, {
    headers: { 'Authorization': `token ${token}` }
  });
  return response.data;
}

async function createCommit(owner, repo, message, treeSha, parentSha, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/commits`;
  const response = await axios.post(url, {
    message,
    tree: treeSha,
    parents: [parentSha]
  }, {
    headers: { 'Authorization': `token ${token}` }
  });
  return response.data;
}

async function updateRef(owner, repo, branch, commitSha, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  const response = await axios.patch(url, {
    sha: commitSha,
    force: false
  }, {
    headers: { 'Authorization': `token ${token}` }
  });
  return response.data;
}

module.exports = { 
  fetchRepoContent, 
  downloadFile, 
  getBranch, 
  createBlob, 
  createTree, 
  createCommit, 
  updateRef 
};

