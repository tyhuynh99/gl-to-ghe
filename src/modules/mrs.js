const chalk = require('chalk');

async function migrateMRs(gitlabClient, githubClient, glProject, githubOrg, repoName) {
  try {
    // 1. Fetch GitLab Merge Requests
    const mrs = await gitlabClient.client.get(`/projects/${glProject.id}/merge_requests`, {
      params: { state: 'all' }
    });
    const glMrs = mrs.data;

    if (glMrs.length === 0) {
      console.log(chalk.gray(`   > No merge requests found for ${glProject.name}`));
      return;
    }

    console.log(chalk.gray(`   > Migrating ${glMrs.length} merge requests...`));

    for (const mr of glMrs) {
      console.log(chalk.gray(`     - !${mr.iid}: ${mr.title}`));
      
      try {
        // 2. Create GitHub Pull Request
        const body = `Migrated from GitLab !${mr.iid}\n\nOriginal Author: ${mr.author.name}\n\n${mr.description}`;
        
        await githubClient.client.post(`/repos/${githubOrg}/${repoName}/pulls`, {
          title: mr.title,
          body: body,
          head: mr.source_branch,
          base: mr.target_branch,
          draft: mr.work_in_progress
        });
      } catch (err) {
        // Often migration fails if branches were deleted or already merged
        console.log(chalk.yellow(`       ! Could not create PR for !${mr.iid} (possibly branch missing)`));
      }
    }

    console.log(chalk.green(`   ✔ Migrated MRs for ${glProject.name}`));
  } catch (err) {
    console.error(chalk.red(`   ! MR migration failed:`), err.message);
    throw err;
  }
}

module.exports = { migrateMRs };
