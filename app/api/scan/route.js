import { NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

// Fetch with optional GitHub token
async function ghFetch(path) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

// Get raw file content from repo
async function getRawFile(owner, repo, filePath) {
  try {
    const headers = {};
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filePath}`,
      { headers }
    );
    if (!res.ok) return null;
    return res.text();
  } catch { return null; }
}

// Parse github URL
function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/?\s]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

// Dangerous patterns to scan for
const DANGEROUS_PATTERNS = [
  { pattern: /curl\s+[^|]+\|\s*(bash|sh|zsh)/gi, label: 'Curl-pipe-bash command', severity: 'HIGH' },
  { pattern: /wget\s+[^|]+\|\s*(bash|sh|zsh)/gi, label: 'Wget-pipe-bash command', severity: 'HIGH' },
  { pattern: /process\.env\b.*(?:fetch|axios|http|request)/gi, label: 'Environment variable exfiltration', severity: 'HIGH' },
  { pattern: /postinstall.*(?:curl|wget|fetch|exec|spawn|eval)/gi, label: 'Malicious postinstall script', severity: 'HIGH' },
  { pattern: /eval\s*\(.*(?:fetch|http|request)/gi, label: 'Remote code execution pattern', severity: 'HIGH' },
  { pattern: /GROQ_API_KEY|OPENAI_API_KEY|AWS_SECRET|GITHUB_TOKEN/gi, label: 'Credential harvesting pattern', severity: 'HIGH' },
  { pattern: /serverUrl.*http(?!s:\/\/(?:localhost|127\.0\.0\.1))/gi, label: 'MCP server URL override', severity: 'HIGH' },
  { pattern: /npx\s+[^\s]+\s+--yes/gi, label: 'Silent auto-execution flag', severity: 'MEDIUM' },
  { pattern: /chmod\s+\+x/gi, label: 'File permission escalation', severity: 'MEDIUM' },
  { pattern: /rm\s+-rf/gi, label: 'Destructive file removal', severity: 'MEDIUM' },
  { pattern: /base64\s+--decode/gi, label: 'Base64 obfuscation pattern', severity: 'MEDIUM' },
];

function scanTextForThreats(text, source) {
  const threats = [];
  for (const { pattern, label, severity } of DANGEROUS_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      threats.push({
        title: label,
        severity,
        description: `Found in ${source}`,
        evidence: matches[0].slice(0, 120),
      });
    }
  }
  return threats;
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    const parsed = parseGitHubUrl(url);
    if (!parsed) return NextResponse.json({ error: 'Invalid GitHub URL. Use format: https://github.com/owner/repo' }, { status: 400 });

    const { owner, repo } = parsed;

    // 1. Fetch repo metadata
    const repoData = await ghFetch(`/repos/${owner}/${repo}`);
    if (!repoData) return NextResponse.json({ error: 'Repository not found or is private.' }, { status: 404 });

    // 2. Fetch user/org metadata
    const userData = await ghFetch(`/users/${owner}`);
    const accountCreated = userData?.created_at ? new Date(userData.created_at) : null;
    const accountAgeDays = accountCreated ? Math.floor((Date.now() - accountCreated) / 86400000) : null;
    const accountAgeStr = accountAgeDays
      ? accountAgeDays < 30 ? `${accountAgeDays} days 🚨` : accountAgeDays < 365 ? `${Math.floor(accountAgeDays / 30)}mo` : `${Math.floor(accountAgeDays / 365)}yr`
      : 'Unknown';

    // 3. Fetch contributors count
    const contributors = await ghFetch(`/repos/${owner}/${repo}/contributors?per_page=1&anon=true`);

    // 4. Scan dangerous files
    const filesToScan = [
      { path: 'package.json', label: 'package.json' },
      { path: '.mcp.json', label: '.mcp.json' },
      { path: 'Makefile', label: 'Makefile' },
      { path: 'install.sh', label: 'install.sh' },
      { path: 'setup.sh', label: 'setup.sh' },
      { path: 'README.md', label: 'README.md' },
      { path: '.github/workflows/main.yml', label: 'GitHub Actions' },
    ];

    const fileContents = await Promise.all(
      filesToScan.map(async f => ({
        ...f,
        content: await getRawFile(owner, repo, f.path),
      }))
    );

    // 5. Pattern-based threat detection
    const patternFindings = [];
    for (const { label, content } of fileContents) {
      if (content) {
        patternFindings.push(...scanTextForThreats(content, label));
      }
    }

    // 6. Heuristic checks
    const heuristicFindings = [];
    if (accountAgeDays !== null && accountAgeDays < 14) {
      heuristicFindings.push({
        title: 'Very new account',
        severity: 'HIGH',
        description: `This account was created only ${accountAgeDays} days ago. Attackers frequently create fresh accounts to publish malicious repos.`,
        evidence: `Account created: ${accountCreated?.toDateString()}`,
      });
    }
    const starsPerDay = accountAgeDays ? repoData.stargazers_count / Math.max(1, accountAgeDays) : 0;
    if (starsPerDay > 100 && repoData.stargazers_count > 500) {
      heuristicFindings.push({
        title: 'Suspicious star velocity',
        severity: 'MEDIUM',
        description: `This repo gained stars extremely fast (~${Math.round(starsPerDay)}/day). Fake stars are commonly used to make malicious repos appear legitimate.`,
        evidence: `${repoData.stargazers_count} stars, account ${accountAgeDays} days old`,
      });
    }

    const allFindings = [...patternFindings, ...heuristicFindings];

    // 7. Build context for Claude AI analysis
    const contextSummary = `
Repository: ${owner}/${repo}
Description: ${repoData.description || 'None'}
Stars: ${repoData.stargazers_count}
Forks: ${repoData.forks_count}
Account age: ${accountAgeStr}
Account created: ${accountCreated?.toDateString() || 'Unknown'}
Open issues: ${repoData.open_issues_count}
Language: ${repoData.language || 'Unknown'}
Pattern-based threats found: ${patternFindings.length}
Heuristic flags: ${heuristicFindings.length}

Files found: ${fileContents.filter(f => f.content).map(f => f.label).join(', ')}

Package.json content (first 800 chars):
${fileContents.find(f => f.label === 'package.json')?.content?.slice(0, 800) || 'Not found'}

README.md content (first 600 chars):
${fileContents.find(f => f.label === 'README.md')?.content?.slice(0, 600) || 'Not found'}

Pattern findings:
${JSON.stringify(patternFindings, null, 2)}
    `.trim();

    // 8. Claude AI analysis
    const llamaResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1000,
        messages: [
          {
          role: 'user',
          content: `
          You are a cybersecurity expert analyzing GitHub repositories for security threats. Be direct, precise, and helpful. Respond ONLY with valid JSON, no markdown, no explanation outside JSON.

          Analyze this GitHub repository for security threats and respond with ONLY this JSON structure:
{
  "trustScore": <integer 0-100, where 100 is completely safe>,
  "verdict": <one of: "✅ Safe to Clone" | "⚠️ Clone With Caution" | "🚨 Do Not Clone">,
  "verdictSummary": <1 sentence plain English verdict>,
  "aiSummary": <2-3 sentence detailed analysis explaining the key risks or why it's safe. Be specific.>,
  "additionalFindings": <array of any extra findings you spotted not in pattern findings, each with title/severity/description/evidence>
}

Repository data:
${contextSummary}`
        }]
      })
    });

    if (!llamaResponse.ok) {
      const errText = await llamaResponse.text();
      console.error("Groq API error:", errText);
    }

    const llamaData = await llamaResponse.json();
    // console.log("Groq raw:", llamaData);
    const rawText = llamaData?.choices?.[0]?.message?.content || '{}';
    // console.log("Groq response text:", rawText);
    let aiResult = {};
    try {
      aiResult = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      aiResult = {
        trustScore: allFindings.length === 0 ? 80 : allFindings.some(f => f.severity === 'HIGH') ? 15 : 45,
        verdict: allFindings.length === 0 ? '✅ Safe to Clone' : '⚠️ Clone With Caution',
        verdictSummary: 'Analysis completed with pattern scanning.',
        aiSummary: `Found ${allFindings.length} potential issues in this repository.`,
        additionalFindings: [],
      };
    }

    const finalFindings = [...allFindings, ...(aiResult.additionalFindings || [])];

    return NextResponse.json({
      trustScore: aiResult.trustScore ?? 50,
      verdict: aiResult.verdict ?? '⚠️ Clone With Caution',
      verdictSummary: aiResult.verdictSummary ?? '',
      aiSummary: aiResult.aiSummary ?? '',
      findings: finalFindings,
      meta: {
        stars: repoData.stargazers_count?.toLocaleString(),
        accountAge: accountAgeStr,
        contributors: Array.isArray(contributors) ? contributors.length + '+' : '?',
        language: repoData.language || 'Unknown',
      }
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Scan failed: ' + err.message }, { status: 500 });
  }
}
