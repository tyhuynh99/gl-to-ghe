const inquirer = require('inquirer');
const chalk = require('chalk');
const GitLabClient = require('./utils/gitlab');
const GitHubClient = require('./utils/github');
const { migrateRepo } = require('./modules/git');
const { migrateVariables } = require('./modules/variables');
const { migrateIssues } = require('./modules/issues');
const { migrateMRs } = require('./modules/mrs');
const { migrateWiki } = require('./modules/wiki');
const { convertPipeline } = require('./modules/pipeline');
const { loadCustomMapping, mapUser } = require('./utils/mapping');

async function mainCoordinator() {
  // 1. Module Selection
  const { modules } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'modules',
      message: 'Select components to migrate:',
      choices: [
        { name: 'Code (Repositories)', value: 'git', checked: true },
        { name: 'CI/CD Variables (Secrets)', value: 'variables', checked: true },
        { name: 'Issues', value: 'issues' },
        { name: 'Merge Requests (Pull Requests)', value: 'mrs' },
        { name: 'Wiki', value: 'wiki' },
        { name: 'Pipeline Conversion (.gitlab-ci.yml)', value: 'pipeline' }
      ]
    }
  ]);

  if (modules.length === 0) {
    console.log(chalk.yellow('No modules selected. Exiting.'));
    return;
  }

  // 2. User Mapping Configuration
  const { mappingType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mappingType',
      message: 'User mapping strategy:',
      choices: [
        { name: '1-1 Mapping via Company Email (Default)', value: 'email' },
        { name: 'Custom users.json file', value: 'custom' }
      ]
    }
  ]);

  let userMappingPath = null;
  if (mappingType === 'custom') {
    const { path } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'Enter path to users.json:',
        default: './users.json'
      }
    ]);
    userMappingPath = path;
  }
  const customMapping = loadCustomMapping(userMappingPath);

  const { tempDir, cleanup, aiBaseUrl, aiModelName, aiApiKey } = await inquirer.prompt([
    {
      type: 'input',
      name: 'tempDir',
      message: 'Temporary Directory for clones:',
      default: process.env.TEMP_DIR || require('path').join(require('os').tmpdir(), 'migration')
    },
    {
      type: 'confirm',
      name: 'cleanup',
      message: 'Cleanup local data after completion?',
      default: true
    },
    {
      type: 'input',
      name: 'aiBaseUrl',
      message: 'AI API Base URL (for Pipeline):',
      default: process.env.AI_BASE_URL || 'http://localhost:8080/v1'
    },
    {
      type: 'input',
      name: 'aiModelName',
      message: 'AI Model Name:',
      default: process.env.AI_MODEL_NAME || 'gpt-3.5-turbo'
    },
    {
      type: 'password',
      name: 'aiApiKey',
      message: 'AI API Key (if any):',
      default: process.env.AI_API_KEY || ''
    }
  ]);

  console.log(chalk.green('\n✅ Configuration complete. Starting migration process...\n'));

  // 3. Initialize Clients
  const gitlab = new GitLabClient(process.env.GITLAB_URL, process.env.GITLAB_TOKEN);
  const github = new GitHubClient(process.env.GITHUB_URL, process.env.GITHUB_TOKEN);
  const githubOrg = process.env.GITHUB_ORG;

  // 4. Discovery
  console.log(chalk.blue('🔍 Scanning GitLab projects...'));
  const projects = await gitlab.listProjects();
  console.log(chalk.gray(`Found ${projects.length} projects.`));

  // 5. Execution Loop
  for (const project of projects) {
    const repoName = project.path;
    console.log(chalk.cyan(`\n📦 Project: ${project.name_with_namespace}`));
    
    // Step-by-step approval
    const { approve } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'approve',
        message: `Migrate ${project.name}?`,
        default: true
      }
    ]);

    if (!approve) {
      console.log(chalk.yellow(`⏭ Skipped ${project.name}`));
      continue;
    }

    // Individual module execution
    try {
      if (modules.includes('git')) {
        console.log(chalk.white(`📝 [Git] mirror from ${project.http_url_to_repo}`));
        
        // Ensure GitHub repo exists
        await github.createRepository(githubOrg, repoName);
        const ghRepoUrl = `https://x-access-token:${process.env.GITHUB_TOKEN}@${process.env.GITHUB_URL.replace('https://api.', '').replace('https://', '')}/${githubOrg}/${repoName}.git`;
        const glRepoUrl = project.http_url_to_repo.replace('https://', `https://oauth2:${process.env.GITLAB_TOKEN}@`);
        
        await migrateRepo(glRepoUrl, ghRepoUrl, repoName, tempDir, cleanup);
      }

      if (modules.includes('variables')) {
        console.log(chalk.white(`📝 [Variables] syncing...`));
        await migrateVariables(gitlab, github, project, githubOrg, repoName);
      }

      if (modules.includes('issues')) {
        console.log(chalk.white(`📝 [Issues] migrating...`));
        await migrateIssues(gitlab, github, project, githubOrg, repoName, customMapping, mappingType);
      }

      if (modules.includes('mrs')) {
        console.log(chalk.white(`📝 [MRs] migrating as PRs...`));
        await migrateMRs(gitlab, github, project, githubOrg, repoName);
      }

      if (modules.includes('wiki')) {
        console.log(chalk.white(`📝 [Wiki] mirroring...`));
        await migrateWiki(project, githubOrg, repoName, process.env.GITLAB_TOKEN, process.env.GITHUB_TOKEN, tempDir, cleanup);
      }

      if (modules.includes('pipeline')) {
        console.log(chalk.white(`📝 [Pipeline] converting .gitlab-ci.yml...`));
        const ghWorkflow = await convertPipeline(gitlab, project, aiBaseUrl, aiModelName, aiApiKey);
        if (ghWorkflow) {
          // In a real scenario, we would commit this to the GH repo
          // For now, we'll log that it's generated.
          console.log(chalk.green(`   ✔ Generated .github/workflows/migrated-ci.yml`));
          // Use GitHub API to create/update file
          await github.client.put(`/repos/${githubOrg}/${repoName}/contents/.github/workflows/migrated-ci.yml`, {
            message: 'Migrate GitLab CI to GitHub Actions',
            content: Buffer.from(ghWorkflow).toString('base64'),
            branch: project.default_branch || 'main'
          }).catch(e => console.log(chalk.yellow(`   ! Could not commit workflow (might already exist or branch missing)`)));
        }
      }

      console.log(chalk.green(`✔ Successfully migrated components for ${project.name}\n`));
    } catch (err) {
      console.error(chalk.red(`❌ Failed to migrate ${project.name}:`), err.message);
      const { retry } = await inquirer.prompt([{ type: 'confirm', name: 'retry', message: 'Retry this project?', default: false }]);
      if (retry) { /* Logic to retry could go here or simply re-loop */ }
    }
  }

  console.log(chalk.blue.bold('\n✨ Migration session finished! ✨'));
}

module.exports = { mainCoordinator };
