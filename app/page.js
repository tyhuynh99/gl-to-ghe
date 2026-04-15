'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [config, setConfig] = useState({
    gitlabUrl: '',
    gitlabToken: '',
    githubToken: '',
    githubOrg: '',
    tempDir: '',
    cleanup: true,
    aiBaseUrl: 'http://localhost:8080/v1',
    aiModelName: 'gpt-3.5-turbo',
    aiApiKey: ''
  });
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [modules, setModules] = useState(['git', 'variables']);
  const [isConfigured, setIsConfigured] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('idle');

  const handleUpdateConfig = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const fetchProjects = async () => {
    setStatus('loading_projects');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gitlabUrl: config.gitlabUrl, gitlabToken: config.gitlabToken })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProjects(data);
      setIsConfigured(true);
      setStatus('idle');
    } catch (err) {
      alert(err.message);
      setStatus('idle');
    }
  };

  const toggleProject = (id) => {
    setSelectedProjects(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleModule = (mod) => {
    setModules(prev => 
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const startMigration = async () => {
    setLogs([]);
    setStatus('migrating');
    
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, selectedProjectIds: selectedProjects, modules })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const { message } = JSON.parse(line.substring(6));
            setLogs(prev => [...prev, message]);
          }
        }
      }
      setStatus('done');
    } catch (err) {
      setLogs(prev => [...prev, `❌ FATAL ERROR: ${err.message}`]);
      setStatus('error');
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Migration Dashboard</h1>
        <p style={{ color: 'var(--secondary)' }}>Minimalist GitLab to GitHub Enterprise Migration Tool</p>
      </header>

      {!isConfigured ? (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <section className="card">
            <h2>1. Setup Connection</h2>
            <form onSubmit={handleUpdateConfig}>
              <label>GitLab URL</label>
              <input 
                type="text" 
                placeholder="https://gitlab.example.com" 
                value={config.gitlabUrl}
                onChange={(e) => setConfig({...config, gitlabUrl: e.target.value})}
                required 
              />
              <label>GitLab PAT</label>
              <input 
                type="password" 
                value={config.gitlabToken}
                onChange={(e) => setConfig({...config, gitlabToken: e.target.value})}
                required 
              />
              <label>GitHub PAT</label>
              <input 
                type="password" 
                value={config.githubToken}
                onChange={(e) => setConfig({...config, githubToken: e.target.value})}
                required 
              />
              <label>GitHub Org</label>
              <input 
                type="text" 
                placeholder="my-org" 
                value={config.githubOrg}
                onChange={(e) => setConfig({...config, githubOrg: e.target.value})}
                required 
              />
              <label>Temporary Directory (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. /tmp/migration or C:\temp" 
                value={config.tempDir}
                onChange={(e) => setConfig({...config, tempDir: e.target.value})}
              />
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '1rem', fontWeight: 'normal' }}>
                <input 
                  type="checkbox" 
                  checked={config.cleanup}
                  onChange={(e) => setConfig({...config, cleanup: e.target.checked})}
                  style={{ width: 'auto', marginBottom: 0, marginRight: '0.5rem' }}
                />
                Cleanup local data after completion
              </label>
              <label>AI API Base URL (For Pipeline Migration)</label>
              <input 
                type="text" 
                placeholder="http://localhost:8080/v1" 
                value={config.aiBaseUrl}
                onChange={(e) => setConfig({...config, aiBaseUrl: e.target.value})}
              />
              <label>AI Model Name</label>
              <input 
                type="text" 
                placeholder="gpt-3.5-turbo" 
                value={config.aiModelName}
                onChange={(e) => setConfig({...config, aiModelName: e.target.value})}
              />
              <label>AI API Key (Optional)</label>
              <input 
                type="password" 
                value={config.aiApiKey}
                onChange={(e) => setConfig({...config, aiApiKey: e.target.value})}
              />
              <button type="submit" className="btn-primary" disabled={status === 'loading_projects'}>
                {status === 'loading_projects' ? 'Connecting...' : 'Connect & Fetch Projects'}
              </button>
            </form>
          </section>
        </div>
      ) : (
        <div className="grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <section className="card">
              <h2>2. Select Modules</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {['git', 'variables', 'issues', 'mrs', 'wiki', 'pipeline'].map(m => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 'auto', marginBottom: 0, marginRight: '0.5rem' }} 
                      checked={modules.includes(m)}
                      onChange={() => toggleModule(m)}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{m}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="card">
              <h2>3. Select Projects</h2>
              <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                {projects.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 'auto', marginBottom: 0, marginRight: '0.5rem' }} 
                      checked={selectedProjects.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{p.path_with_namespace}</span>
                  </div>
                ))}
              </div>
              <button 
                className="btn-primary" 
                style={{ marginTop: '1rem', width: '100%' }}
                disabled={selectedProjects.length === 0 || status === 'migrating'}
                onClick={startMigration}
              >
                {status === 'migrating' ? 'Migrating...' : `Start Migration (${selectedProjects.length} Projects)`}
              </button>
            </section>
          </div>

          <section className="card">
            <h2>4. Output Stream</h2>
            <div className="log-container">
              {logs.length === 0 && <span style={{ color: '#64748b' }}>Logs will appear here during migration...</span>}
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '0.25rem' }}>{log}</div>
              ))}
            </div>
            {status === 'done' && <div style={{ marginTop: '1rem', color: 'var(--success)', fontWeight: 'bold' }}>✨ Migration Finished Successfully!</div>}
          </section>
        </div>
      )}
    </div>
  );
}
