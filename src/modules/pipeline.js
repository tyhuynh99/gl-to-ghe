const axios = require('axios');
const chalk = require('chalk');

async function convertPipeline(gitlabClient, glProject, aiBaseUrl, aiModelName, aiApiKey) {
  try {
    const glCiContent = await gitlabClient.getProjectFile(glProject.id, '.gitlab-ci.yml');
    
    if (!glCiContent) {
      console.log(chalk.gray(`   > No .gitlab-ci.yml found.`));
      return null;
    }

    console.log(chalk.gray(`   > Sending .gitlab-ci.yml to AI model (${aiModelName}) at ${aiBaseUrl} ...`));

    const systemPrompt = `You are an expert DevOps engineer specializing in migrating CI/CD pipelines from GitLab CI to GitHub Actions.
Your task is to take the provided .gitlab-ci.yml content and translate it into a valid, optimized .github/workflows/main.yml format.
Pay attention to converting stages, jobs, variables, cache, artifacts, and rules/needs appropriately.
IMPORTANT: Output ONLY the raw YAML content without any markdown formatting wrappers. Remove any lines starting with \`\`\`yaml or \`\`\`. Do not include any textual explanations.`;

    const headers = { 'Content-Type': 'application/json' };
    if (aiApiKey) {
      headers['Authorization'] = `Bearer ${aiApiKey}`;
    }

    const payload = {
      model: aiModelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: glCiContent }
      ],
      temperature: 0.1
    };

    // Ensure URL has /chat/completions suffix
    let endpoint = aiBaseUrl;
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
    }

    const response = await axios.post(endpoint, payload, { headers });
    
    let ghWorkflow = response.data.choices[0].message.content;
    
    // Clean up markdown wrappers if the AI ignored the instruction
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
