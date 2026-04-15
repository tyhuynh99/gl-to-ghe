const { migrateRepo } = require('./git');
const chalk = require('chalk');

async function migrateWiki(project, githubOrg, repoName, gitlabToken, githubToken, tempDir) {
  const wikiName = `${repoName}.wiki`;
  const glWikiUrl = project.http_url_to_repo.replace('.git', '.wiki.git').replace('https://', `https://oauth2:${gitlabToken}@`);
  const ghWikiUrl = `https://x-access-token:${githubToken}@github.com/${githubOrg}/${repoName}.wiki.git`;

  console.log(chalk.gray(`   > Attempting to migrate Wiki for ${project.name}...`));

  try {
    await migrateRepo(glWikiUrl, ghWikiUrl, wikiName, tempDir);
    console.log(chalk.green(`   ✔ Wiki migrated successfully`));
  } catch (err) {
    // Wiki might not exist for the project
    console.log(chalk.yellow(`   ! Wiki migration failed or Wiki does not exist for this project.`));
  }
}

module.exports = { migrateWiki };
