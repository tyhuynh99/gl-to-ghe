require('dotenv').config();
const { mainCoordinator } = require('./ui');
const chalk = require('chalk');

async function main() {
  console.log(chalk.blue.bold('\n🚀 GitLab to GitHub Enterprise Migration Tool'));
  console.log(chalk.gray('--------------------------------------------------\n'));

  try {
    await mainCoordinator();
  } catch (err) {
    console.error(chalk.red('\n❌ Critical Error:'), err.message);
    process.exit(1);
  }
}

main();
