const chalk = require('chalk');

async function migrateIssues(gitlabClient, githubClient, glProject, githubOrg, repoName, userMapping, strategy) {
  try {
    // 1. Fetch GitLab Issues
    const issues = await gitlabClient.client.get(`/projects/${glProject.id}/issues`);
    const glIssues = issues.data;

    if (glIssues.length === 0) {
      console.log(chalk.gray(`   > No issues found for ${glProject.name}`));
      return;
    }

    console.log(chalk.gray(`   > Migrating ${glIssues.length} issues...`));

    for (const issue of glIssues) {
      console.log(chalk.gray(`     - #${issue.iid}: ${issue.title}`));
      
      // 2. Create GitHub Issue
      const body = `Migrated from GitLab #${issue.iid}\n\nOriginal Author: ${issue.author.name}\n\n${issue.description}`;
      
      await githubClient.client.post(`/repos/${githubOrg}/${repoName}/issues`, {
        title: issue.title,
        body: body,
        labels: issue.labels,
        // Assignee logic could be added here using mapUser
      });
    }

    console.log(chalk.green(`   ✔ Migrated ${glIssues.length} issues`));
  } catch (err) {
    console.error(chalk.red(`   ! Issue migration failed:`), err.message);
    throw err;
  }
}

module.exports = { migrateIssues };
