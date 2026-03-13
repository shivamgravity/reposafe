'use client';
import { useState } from 'react';

const THREAT_COLORS = {
  HIGH: '#ff3b3b',
  MEDIUM: '#ffaa00',
  LOW: '#00c896',
  SAFE: '#00e5a0',
};

function ShieldIcon({ score }) {
  const color = score >= 80 ? '#00e5a0' : score >= 50 ? '#ffaa00' : '#ff3b3b';
  return (
    <svg width="120" height="140" viewBox="0 0 120 140" fill="none">
      <defs>
        <radialGradient id="shieldGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="70" rx="55" ry="55" fill="url(#shieldGlow)" />
      <path
        d="M60 8 L104 28 L104 72 C104 98 84 118 60 128 C36 118 16 98 16 72 L16 28 Z"
        fill={`${color}18`}
        stroke={color}
        strokeWidth="2"
        style={{ filter: `drop-shadow(0 0 12px ${color})` }}
      />
      {score >= 80 ? (
        <path d="M40 68 L54 82 L80 56" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      ) : (
        <text x="60" y="78" textAnchor="middle" fill={color} fontSize="28" fontWeight="bold" fontFamily="monospace">!</text>
      )}
      <text x="60" y="110" textAnchor="middle" fill={color} fontSize="13" fontWeight="700" fontFamily="'Space Mono', monospace" letterSpacing="2">
        {score >= 80 ? 'SAFE' : score >= 50 ? 'CAUTION' : 'DANGER'}
      </text>
    </svg>
  );
}

function ScanLine({ label, status, detail, delay }) {
  return (
    <div className="scan-line" style={{ animationDelay: `${delay}ms` }}>
      <div className="scan-label">{label}</div>
      <div className="scan-detail">{detail}</div>
      <div className={`scan-badge badge-${status.toLowerCase()}`}>{status}</div>
    </div>
  );
}

export default function RepoSafe() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | scanning | result | error
  const [scanLog, setScanLog] = useState([]);
  const [result, setResult] = useState(null);

  const addLog = (msg) => setScanLog(prev => [...prev, msg]);

  const scan = async () => {
    if (!url.trim()) return;
    setPhase('scanning');
    setScanLog([]);
    setResult(null);

    const steps = [
      '⟳ Fetching repository metadata...',
      '⟳ Analyzing config files (.mcp.json, package.json, Makefile)...',
      '⟳ Scanning install scripts for dangerous patterns...',
      '⟳ Checking README for social engineering...',
      '⟳ Verifying account age and star velocity...',
      '⟳ Running AI threat analysis...',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      addLog(steps[i]);
    }

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setPhase('result');
    } catch (e) {
      setPhase('error');
      setScanLog(prev => [...prev, `✗ Error: ${e.message}`]);
    }
  };

  const reset = () => { setPhase('idle'); setUrl(''); setResult(null); setScanLog([]); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #030a0e;
          color: #c8e6f0;
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .grid-bg {
          position: fixed; inset: 0; z-index: 0;
          background-image:
            linear-gradient(rgba(0,200,180,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,180,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .noise {
          position: fixed; inset: 0; z-index: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          pointer-events: none;
        }

        .container {
          position: relative; z-index: 1;
          max-width: 780px;
          margin: 0 auto;
          padding: 60px 24px 80px;
        }

        .header { text-align: center; margin-bottom: 56px; }

        .logo-row {
          display: flex; align-items: center; justify-content: center;
          gap: 14px; margin-bottom: 16px;
        }

        .logo-icon {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #00c896, #00a8e8);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          box-shadow: 0 0 24px rgba(0,200,150,0.4);
        }

        h1 {
          font-size: clamp(2.2rem, 5vw, 3.4rem);
          font-weight: 800;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #ffffff 30%, #00c896);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          line-height: 1.1;
        }

        .tagline {
          font-family: 'Space Mono', monospace;
          font-size: 0.8rem;
          color: #00c896;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .subtitle {
          font-size: 1.05rem;
          color: #7aa8b8;
          max-width: 480px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .input-panel {
          background: rgba(0,200,150,0.04);
          border: 1px solid rgba(0,200,150,0.15);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          backdrop-filter: blur(10px);
        }

        .input-row {
          display: flex; gap: 12px;
          flex-wrap: wrap;
        }

        .url-input {
          flex: 1; min-width: 0;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(0,200,150,0.2);
          border-radius: 10px;
          padding: 14px 18px;
          color: #c8e6f0;
          font-family: 'Space Mono', monospace;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .url-input:focus { border-color: #00c896; }
        .url-input::placeholder { color: #3a6070; }

        .scan-btn {
          background: linear-gradient(135deg, #00c896, #00a8e8);
          color: #030a0e;
          border: none;
          border-radius: 10px;
          padding: 14px 28px;
          font-family: 'Space Mono', monospace;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.2s, transform 0.1s;
          box-shadow: 0 0 20px rgba(0,200,150,0.3);
        }

        .scan-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .scan-btn:active { transform: translateY(0); }
        .scan-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .examples {
          margin-top: 16px;
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }

        .examples-label {
          font-family: 'Space Mono', monospace;
          font-size: 0.7rem;
          color: #3a6070;
          letter-spacing: 1px;
        }

        .example-chip {
          background: rgba(0,200,150,0.06);
          border: 1px solid rgba(0,200,150,0.12);
          border-radius: 6px;
          padding: 4px 10px;
          font-family: 'Space Mono', monospace;
          font-size: 0.7rem;
          color: #00c896;
          cursor: pointer;
          transition: background 0.2s;
        }

        .example-chip:hover { background: rgba(0,200,150,0.14); }

        /* Scan Terminal */
        .terminal {
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(0,200,150,0.15);
          border-radius: 12px;
          padding: 24px;
          font-family: 'Space Mono', monospace;
          font-size: 0.78rem;
        }

        .terminal-header {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(0,200,150,0.1);
        }

        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot-r { background: #ff5f57; }
        .dot-y { background: #febc2e; }
        .dot-g { background: #28c840; }

        .terminal-title { color: #3a6070; font-size: 0.72rem; margin-left: 4px; }

        .log-line {
          color: #00c896;
          margin-bottom: 6px;
          animation: fadein 0.3s ease;
        }

        .spinner {
          display: inline-block;
          animation: spin 0.8s linear infinite;
          margin-right: 6px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }

        /* Results */
        .result-panel {
          animation: fadein 0.5s ease;
        }

        .verdict-header {
          display: flex;
          align-items: center;
          gap: 32px;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(0,200,150,0.15);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .verdict-text h2 {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .verdict-text p {
          color: #7aa8b8;
          font-size: 0.95rem;
          line-height: 1.5;
          max-width: 420px;
        }

        .score-badge {
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 2px;
          padding: 6px 14px;
          border-radius: 6px;
          margin-top: 10px;
          display: inline-block;
        }

        .findings-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .finding-card {
          background: rgba(0,0,0,0.35);
          border-radius: 12px;
          padding: 18px 20px;
          border-left: 3px solid;
          animation: fadein 0.4s ease;
        }

        .finding-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .finding-title {
          font-weight: 700;
          font-size: 0.95rem;
          flex: 1;
        }

        .finding-badge {
          font-family: 'Space Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 2px;
          padding: 3px 10px;
          border-radius: 4px;
          font-weight: 700;
        }

        .finding-desc {
          color: #7aa8b8;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .finding-code {
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          background: rgba(0,0,0,0.4);
          border-radius: 6px;
          padding: 8px 12px;
          margin-top: 8px;
          color: #ff9a3c;
          word-break: break-all;
        }

        .meta-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .meta-card {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(0,200,150,0.1);
          border-radius: 10px;
          padding: 16px;
          text-align: center;
        }

        .meta-value {
          font-family: 'Space Mono', monospace;
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .meta-label {
          font-size: 0.75rem;
          color: #3a6070;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .summary-box {
          background: rgba(0,200,150,0.05);
          border: 1px solid rgba(0,200,150,0.2);
          border-radius: 12px;
          padding: 20px 24px;
          font-size: 0.9rem;
          line-height: 1.7;
          color: #a8d8e8;
          margin-bottom: 24px;
        }

        .action-row {
          display: flex; gap: 12px; flex-wrap: wrap;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid rgba(0,200,150,0.3);
          color: #00c896;
          border-radius: 10px;
          padding: 12px 24px;
          font-family: 'Space Mono', monospace;
          font-size: 0.8rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-secondary:hover { background: rgba(0,200,150,0.08); }

        .scan-line {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,200,150,0.06);
          animation: fadein 0.3s ease both;
          font-size: 0.82rem;
        }

        .scan-label { color: #7aa8b8; flex: 1; }
        .scan-detail { color: #3a6070; font-size: 0.75rem; font-family: 'Space Mono', monospace; }

        .scan-badge {
          font-family: 'Space Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 1px;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 700;
        }

        .badge-safe { background: rgba(0,229,160,0.15); color: #00e5a0; }
        .badge-risk { background: rgba(255,59,59,0.15); color: #ff3b3b; }
        .badge-warn { background: rgba(255,170,0,0.15); color: #ffaa00; }

        .error-box {
          background: rgba(255,59,59,0.08);
          border: 1px solid rgba(255,59,59,0.3);
          border-radius: 12px;
          padding: 24px;
          color: #ff3b3b;
          font-family: 'Space Mono', monospace;
          font-size: 0.85rem;
        }

        .pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div className="grid-bg" />
      <div className="noise" />

      <div className="container">
        <header className="header">
          <div className="logo-row">
            <div className="logo-icon">🛡️</div>
            <h1>RepoSafe</h1>
          </div>
          <p className="tagline">AI-Powered Repository Security Scanner</p>
          <p className="subtitle">
            Know if a GitHub repo will attack your machine <strong>before</strong> you clone it.
            10 seconds. No account needed.
          </p>
        </header>

        <div className="input-panel">
          <div className="input-row">
            <input
              className="url-input"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && phase === 'idle' && scan()}
              disabled={phase === 'scanning'}
            />
            <button
              className="scan-btn"
              onClick={scan}
              disabled={phase === 'scanning' || !url.trim()}
            >
              {phase === 'scanning' ? '⟳ SCANNING...' : '⚡ SCAN REPO'}
            </button>
          </div>
          <div className="examples">
            <span className="examples-label">TRY:</span>
            {[
              'facebook/react',
              'torvalds/linux',
              'openai/openai-python',
            ].map(r => (
              <span
                key={r}
                className="example-chip"
                onClick={() => setUrl(`https://github.com/${r}`)}
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {phase === 'scanning' && (
          <div className="terminal">
            <div className="terminal-header">
              <div className="dot dot-r" /><div className="dot dot-y" /><div className="dot dot-g" />
              <span className="terminal-title">reposafe — threat analysis</span>
            </div>
            {scanLog.map((line, i) => (
              <div key={i} className="log-line">
                <span className="spinner">◌</span>{line}
              </div>
            ))}
            <div className="log-line pulse">▊</div>
          </div>
        )}

        {phase === 'error' && (
          <div className="error-box">
            <div style={{ marginBottom: 12, fontWeight: 700 }}>✗ Scan Failed</div>
            {scanLog[scanLog.length - 1]}
            <div style={{ marginTop: 16 }}>
              <button className="btn-secondary" onClick={reset}>← Try Again</button>
            </div>
          </div>
        )}

        {phase === 'result' && result && (
          <div className="result-panel">
            {/* Verdict Header */}
            <div className="verdict-header">
              <ShieldIcon score={result.trustScore} />
              <div className="verdict-text">
                <h2 style={{ color: result.trustScore >= 80 ? '#00e5a0' : result.trustScore >= 50 ? '#ffaa00' : '#ff3b3b' }}>
                  {result.verdict}
                </h2>
                <p>{result.verdictSummary}</p>
                <div
                  className="score-badge"
                  style={{
                    background: `${result.trustScore >= 80 ? '#00e5a0' : result.trustScore >= 50 ? '#ffaa00' : '#ff3b3b'}18`,
                    color: result.trustScore >= 80 ? '#00e5a0' : result.trustScore >= 50 ? '#ffaa00' : '#ff3b3b',
                    border: `1px solid ${result.trustScore >= 80 ? '#00e5a0' : result.trustScore >= 50 ? '#ffaa00' : '#ff3b3b'}44`,
                  }}
                >
                  TRUST SCORE: {result.trustScore}/100
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="meta-row">
              {[
                { label: 'Stars', value: result.meta?.stars ?? '—' },
                { label: 'Account Age', value: result.meta?.accountAge ?? '—' },
                { label: 'Contributors', value: result.meta?.contributors ?? '—' },
                { label: 'Threats Found', value: result.findings?.length ?? 0 },
              ].map(m => (
                <div className="meta-card" key={m.label}>
                  <div className="meta-value" style={{ color: m.label === 'Threats Found' && m.value > 0 ? '#ff3b3b' : '#00c896' }}>
                    {m.value}
                  </div>
                  <div className="meta-label">{m.label}</div>
                </div>
              ))}
            </div>

            {/* AI Summary */}
            <div className="summary-box">
              <strong style={{ color: '#00c896' }}>🤖 AI Analysis: </strong>
              {result.aiSummary}
            </div>

            {/* Findings */}
            {result.findings?.length > 0 && (
              <div className="findings-grid">
                {result.findings.map((f, i) => (
                  <div
                    key={i}
                    className="finding-card"
                    style={{ borderColor: THREAT_COLORS[f.severity] }}
                  >
                    <div className="finding-top">
                      <div className="finding-title">{f.title}</div>
                      <div
                        className="finding-badge"
                        style={{
                          background: `${THREAT_COLORS[f.severity]}18`,
                          color: THREAT_COLORS[f.severity],
                        }}
                      >
                        {f.severity}
                      </div>
                    </div>
                    <div className="finding-desc">{f.description}</div>
                    {f.evidence && <div className="finding-code">{f.evidence}</div>}
                  </div>
                ))}
              </div>
            )}

            <div className="action-row">
              <button className="btn-secondary" onClick={reset}>← Scan Another Repo</button>
              <button
                className="btn-secondary"
                onClick={() => navigator.clipboard.writeText(
                  `RepoSafe verdict for ${url}:\n${result.verdict} (Trust Score: ${result.trustScore}/100)\n\n${result.aiSummary}`
                )}
              >
                📋 Copy Report
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
