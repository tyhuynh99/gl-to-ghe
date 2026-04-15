const axios = require('axios');
const sodium = require('libsodium-wrappers');

class GitHubClient {
  constructor(baseUrl, token) {
    this.client = axios.create({
      baseURL: `${baseUrl.replace(/\/$/, '')}`,
      headers: { 
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
  }

  async createRepository(org, name, isPrivate = true) {
    try {
      const response = await this.client.post(`/orgs/${org}/repos`, {
        name,
        private: isPrivate,
        auto_init: false
      });
      return response.data;
    } catch (err) {
      if (err.response && err.response.status === 422) {
        // Repo might already exist
        const repoResponse = await this.client.get(`/repos/${org}/${name}`);
        return repoResponse.data;
      }
      throw new Error(`GitHub: Failed to create repository ${name} - ${err.message}`);
    }
  }

  async getRepoPublicKey(owner, repo) {
    const response = await this.client.get(`/repos/${owner}/${repo}/actions/secrets/public-key`);
    return response.data;
  }

  async createSecret(owner, repo, secretName, secretValue) {
    await sodium.ready;
    const { key, key_id } = await this.getRepoPublicKey(owner, repo);
    
    // Encrypt the secret
    const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
    const binSec = sodium.from_string(secretValue);
    const encBytes = sodium.crypto_box_seal(binSec, binKey);
    const encryptedValue = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

    await this.client.put(`/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
      encrypted_value: encryptedValue,
      key_id: key_id
    });
  }

  async createVariable(owner, repo, name, value) {
    try {
      await this.client.post(`/repos/${owner}/${repo}/actions/variables`, {
        name,
        value
      });
    } catch (err) {
      if (err.response && err.response.status === 422) {
        // Variable might exist, update it
        await this.client.patch(`/repos/${owner}/${repo}/actions/variables/${name}`, {
          value
        });
      } else {
        throw err;
      }
    }
  }
}

module.exports = GitHubClient;
