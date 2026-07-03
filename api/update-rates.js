// api/update-rates.js
// Place this file in your /api folder in the GitHub repo

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, remitRate, remitCharge } = req.body;

  // ── Password check (set ADMIN_PASSWORD in Vercel Environment Variables) ──
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Kata laluan salah.' });
  }

  // ── Validate rates ──
  if (!remitRate || remitRate <= 0 || remitCharge < 0) {
    return res.status(400).json({ error: 'Kadar tidak sah.' });
  }

  // ── GitHub API credentials (set these in Vercel Environment Variables) ──
  const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;   // Personal Access Token
  const GITHUB_OWNER  = process.env.GITHUB_OWNER;   // e.g. "fakhrijaladi"
  const GITHUB_REPO   = process.env.GITHUB_REPO;    // e.g. "emas-bnd"
  const FILE_PATH     = 'rates.json';               // file in repo root

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'GitHub environment variables not configured.' });
  }

  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

  try {
    // 1. Get current file SHA (required for update)
    let sha = null;
    try {
      const getRes = await fetch(apiBase, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }
    } catch (_) { /* file doesn't exist yet, will create */ }

    // 2. Prepare new content
    const content = JSON.stringify({ remitRate, remitCharge }, null, 2);
    const contentBase64 = Buffer.from(content).toString('base64');

    // 3. Commit to GitHub
    const body = {
      message: `Update rates: remitRate=${remitRate}, remitCharge=${remitCharge}`,
      content: contentBase64,
      ...(sha ? { sha } : {})
    };

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message || 'GitHub API error');
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
