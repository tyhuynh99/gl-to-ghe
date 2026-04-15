const fs = require('fs');

function loadCustomMapping(path) {
  if (!path) return {};
  try {
    const data = fs.readFileSync(path, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Warning: Could not load mapping file at ${path}`);
    return {};
  }
}

function mapUser(gitlabUser, customMapping, strategy = 'email') {
  // 1. Check custom mapping first
  if (customMapping[gitlabUser.username]) {
    return customMapping[gitlabUser.username];
  }
  if (gitlabUser.email && customMapping[gitlabUser.email]) {
    return customMapping[gitlabUser.email];
  }

  // 2. Default: 1-1 mapping
  // If strategy is email, we assume GitLab username == GitHub username
  return gitlabUser.username;
}

module.exports = { loadCustomMapping, mapUser };
