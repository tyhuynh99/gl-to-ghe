const axios = require('axios');

class GitLabClient {
  constructor(baseUrl, token) {
    this.client = axios.create({
      baseURL: `${baseUrl.replace(/\/$/, '')}/api/v4`,
      headers: { 'Private-Token': token }
    });
  }

  async listProjects(namespaceId = null) {
    const params = namespaceId ? { namespace_id: namespaceId } : {};
    try {
      const response = await this.client.get('/projects', { params });
      return response.data;
    } catch (err) {
      throw new Error(`GitLab: Failed to list projects - ${err.message}`);
    }
  }

  async getProjectVariables(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/variables`);
      return response.data;
    } catch (err) {
      throw new Error(`GitLab: Failed to get variables for project ${projectId} - ${err.message}`);
    }
  }

  async getProjectFile(projectId, filePath, ref = 'main') {
    try {
      const response = await this.client.get(`/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw`, {
        params: { ref }
      });
      return response.data;
    } catch (err) {
      if (err.response && err.response.status === 404) return null;
      throw new Error(`GitLab: Failed to get file ${filePath} - ${err.message}`);
    }
  }
}

module.exports = GitLabClient;
