import { NextResponse } from 'next/server';
import GitLabClient from '../../../src/utils/gitlab';

export async function POST(request) {
  const { gitlabUrl, gitlabToken } = await request.json();

  if (!gitlabUrl || !gitlabToken) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
  }

  try {
    const gitlab = new GitLabClient(gitlabUrl, gitlabToken);
    const projects = await gitlab.listProjects();
    return NextResponse.json(projects);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
