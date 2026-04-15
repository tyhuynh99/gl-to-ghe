const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

async function migrateRepo(gitlabUrl, githubUrl, repoName, tempDir, cleanup = true) {
  const repoDir = path.join(tempDir, `${repoName}.git`);
  
  // Ensure temp dir exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    console.log(chalk.gray(`   > Cloning mirror from GitLab...`));
    execSync(`git clone --mirror "${gitlabUrl}" "${repoDir}"`, { stdio: 'inherit' });

    console.log(chalk.gray(`   > Pushing mirror to GitHub...`));
    process.chdir(repoDir);
    execSync(`git remote add github "${githubUrl}"`, { stdio: 'inherit' });
    execSync(`git push --mirror github`, { stdio: 'inherit' });

    return true;
  } catch (err) {
    console.error(chalk.red(`   ! Git Migration failed for ${repoName}:`), err.message);
    throw err;
  } finally {
    if (cleanup) {
      console.log(chalk.gray(`   > Cleaning up local repository data...`));
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  }
}

module.exports = { migrateRepo };
