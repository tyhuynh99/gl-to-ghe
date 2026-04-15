const chalk = require('chalk');

async function migrateVariables(gitlabClient, githubClient, glProject, githubOrg, repoName) {
  try {
    const variables = await gitlabClient.getProjectVariables(glProject.id);
    
    if (variables.length === 0) {
      console.log(chalk.gray(`   > No variables found for ${glProject.name}`));
      return;
    }

    for (const variable of variables) {
      // Logic: If masked, treat as GitHub Secret. Otherwise, as GitHub Variable.
      if (variable.masked) {
        console.log(chalk.gray(`   > Creating Actions Secret: ${variable.key}`));
        await githubClient.createSecret(githubOrg, repoName, variable.key, variable.value);
      } else {
        console.log(chalk.gray(`   > Creating Actions Variable: ${variable.key}`));
        await githubClient.createVariable(githubOrg, repoName, variable.key, variable.value);
      }
    }
    
    console.log(chalk.green(`   ✔ Migrated ${variables.length} variables`));
  } catch (err) {
    console.error(chalk.red(`   ! Variable migration failed:`), err.message);
    throw err;
  }
}

module.exports = { migrateVariables };
