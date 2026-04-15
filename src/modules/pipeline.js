const yaml = require('js-yaml');
const chalk = require('chalk');

async function convertPipeline(gitlabClient, glProject) {
  try {
    const glCiContent = await gitlabClient.getProjectFile(glProject.id, '.gitlab-ci.yml');
    
    if (!glCiContent) {
      console.log(chalk.gray(`   > No .gitlab-ci.yml found.`));
      return null;
    }

    const glCi = yaml.load(glCiContent);
    const ghWorkflow = {
      name: 'Migrated CI',
      on: ['push', 'pull_request'],
      jobs: {}
    };

    // Very basic mapping
    for (const [key, value] of Object.entries(glCi)) {
      if (typeof value === 'object' && (value.script || value.before_script)) {
        const jobName = key.replace(/[^a-zA-Z0-9_\-]/g, '_');
        ghWorkflow.jobs[jobName] = {
          'runs-on': 'ubuntu-latest',
          steps: [{ uses: 'actions/checkout@v3' }]
        };

        if (value.image) {
          ghWorkflow.jobs[jobName].container = typeof value.image === 'string' ? value.image : value.image.name;
        }

        const scripts = [];
        if (value.before_script) scripts.push(...(Array.isArray(value.before_script) ? value.before_script : [value.before_script]));
        if (value.script) scripts.push(...(Array.isArray(value.script) ? value.script : [value.script]));

        if (scripts.length > 0) {
          ghWorkflow.jobs[jobName].steps.push({
            run: scripts.join('\n')
          });
        }
      }
    }

    return yaml.dump(ghWorkflow);
  } catch (err) {
    console.error(chalk.red(`   ! Pipeline conversion failed:`), err.message);
    return null;
  }
}

module.exports = { convertPipeline };
