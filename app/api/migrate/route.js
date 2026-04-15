import GitLabClient from '../../../src/utils/gitlab';
import GitHubClient from '../../../src/utils/github';
import { migrateRepo } from '../../../src/modules/git';
import { migrateVariables } from '../../../src/modules/variables';
import { migrateIssues } from '../../../src/modules/issues';
import { migrateMRs } from '../../../src/modules/mrs';
import { migrateWiki } from '../../../src/modules/wiki';
import { convertPipeline } from '../../../src/modules/pipeline';

// This is an SSE version of the migration handler
export async function POST(request) {
  const body = await request.json();
  const { config, selectedProjectIds, modules } = body;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (message) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
      };

      try {
        const gitlab = new GitLabClient(config.gitlabUrl, config.gitlabToken);
        const github = new GitHubClient('https://api.github.com', config.githubToken); // Assuming Cloud
        const githubOrg = config.githubOrg;
        const tempDir = '/tmp/migration';

        sendLog(`🚀 Starting migration for ${selectedProjectIds.length} projects...`);

        // Fetch project details
        const allProjects = await gitlab.listProjects();
        const projectsToMigrate = allProjects.filter(p => selectedProjectIds.includes(p.id));

        for (const project of projectsToMigrate) {
          const repoName = project.path;
          sendLog(`\n📦 Processing project: ${project.name_with_namespace}`);

          if (modules.includes('git')) {
            sendLog(`   > Creating GitHub repository ${githubOrg}/${repoName}...`);
            await github.createRepository(githubOrg, repoName);
            
            const ghRepoUrl = `https://x-access-token:${config.githubToken}@github.com/${githubOrg}/${repoName}.git`;
            const glRepoUrl = project.http_url_to_repo.replace('https://', `https://oauth2:${config.gitlabToken}@`);
            
            sendLog(`   > Mirroring git history...`);
            // Note: We need to wrap existing modules to take sendLog as an alternative to console.log
            await migrateRepo(glRepoUrl, ghRepoUrl, repoName, tempDir);
          }

          if (modules.includes('variables')) {
            sendLog(`   > Syncing CI/CD variables...`);
            await migrateVariables(gitlab, github, project, githubOrg, repoName);
          }

          if (modules.includes('issues')) {
            sendLog(`   > Migrating issues...`);
            await migrateIssues(gitlab, github, project, githubOrg, repoName, {}, 'email');
          }

          if (modules.includes('mrs')) {
            sendLog(`   > Migrating merge requests...`);
            await migrateMRs(gitlab, github, project, githubOrg, repoName);
          }

          if (modules.includes('wiki')) {
            sendLog(`   > Mirroring wiki...`);
            await migrateWiki(project, githubOrg, repoName, config.gitlabToken, config.githubToken, tempDir);
          }

          sendLog(`✅ Successfully migrated ${project.name}`);
        }

        sendLog(`\n✨ ALL MIGRATIONS COMPLETE!`);
        controller.close();
      } catch (err) {
        sendLog(`❌ ERROR: ${err.message}`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
