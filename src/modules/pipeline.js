const axios = require('axios');
const chalk = require('chalk');
const yaml = require('js-yaml');

async function fetchAllCiFiles(gitlabClient, projectId, filePath = '.gitlab-ci.yml', visited = new Set()) {
  if (visited.has(filePath)) return [];
  visited.add(filePath);

  const content = await gitlabClient.getProjectFile(projectId, filePath);
  if (!content) return [];

  let files = [{ path: filePath, content }];

  try {
    const parsed = yaml.load(content);
    if (parsed && parsed.include) {
      let includes = Array.isArray(parsed.include) ? parsed.include : [parsed.include];
      for (const inc of includes) {
        if (typeof inc === 'string') {
          if (!inc.startsWith('http')) {
            const incPath = inc.startsWith('/') ? inc.substring(1) : inc;
            const subFiles = await fetchAllCiFiles(gitlabClient, projectId, incPath, visited);
            files = files.concat(subFiles);
          }
        } else if (typeof inc === 'object' && inc !== null) {
          if (inc.local) {
            const incPath = inc.local.startsWith('/') ? inc.local.substring(1) : inc.local;
            const subFiles = await fetchAllCiFiles(gitlabClient, projectId, incPath, visited);
            files = files.concat(subFiles);
          }
        }
      }
    }
  } catch (e) {
    // If yaml fails to parse, just proceed with what we have
  }
  return files;
}

async function convertPipeline(gitlabClient, glProject, aiBaseUrl, aiModelName, aiApiKey) {
  try {
    console.log(chalk.gray(`   > Scanning for .gitlab-ci.yml and local includes...`));
    const allFiles = await fetchAllCiFiles(gitlabClient, glProject.id);
    
    if (allFiles.length === 0) {
      console.log(chalk.gray(`   > No .gitlab-ci.yml found.`));
      return null;
    }

    let bundleContent = '';
    for (const f of allFiles) {
      bundleContent += `\n--- FILE: ${f.path} ---\n${f.content}\n`;
    }

    console.log(chalk.gray(`   > Bundled ${allFiles.length} file(s). Sending to AI model (${aiModelName}) at ${aiBaseUrl} ...`));

    const systemPrompt = `You are an expert DevOps engineer specializing in migrating CI/CD pipelines from GitLab CI to GitHub Actions.
Your task is to take the provided GitLab CI configurations (which may be spread across multiple files) and translate them into a valid, optimized .github/workflows/main.yml format.
The input will be formatted as follows:
--- FILE: filename ---
content...

Pay attention to converting stages, jobs, variables, cache, artifacts, and rules/needs appropriately by resolving cross-file includes.
If you notice any 'include: remote', 'include: project', or external URL templates in the source that were not provided in the bundle text, YOU MUST add a comment block at the very top of the generated workflow alerting the user to manually migrate these external references.
IMPORTANT: Output ONLY the raw YAML content without any markdown formatting wrappers. Remove any lines starting with \`\`\`yaml or \`\`\`. Do not include any textual explanations.`;

    const headers = { 'Content-Type': 'application/json' };
    if (aiApiKey) {
      headers['Authorization'] = `Bearer ${aiApiKey}`;
    }

    const payload = {
      model: aiModelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: bundleContent }
      ],
      temperature: 0.1
    };

    let endpoint = aiBaseUrl;
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
    }

    const response = await axios.post(endpoint, payload, { headers });
    
    let ghWorkflow = response.data.choices[0].message.content;
    ghWorkflow = ghWorkflow.replace(/^```yaml/mi, '').replace(/^```/mi, '').replace(/```$/mi, '').trim();

    return ghWorkflow;
  } catch (err) {
    if (err.response) {
      console.error(chalk.red(`   ! AI Pipeline conversion failed (API Error):`), JSON.stringify(err.response.data));
    } else {
      console.error(chalk.red(`   ! Pipeline conversion failed:`), err.message);
    }
    return null;
  }
}

module.exports = { convertPipeline };
