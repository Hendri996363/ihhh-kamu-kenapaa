// api/deploy.js — Vercel Serverless Function
// Token disimpan di Vercel Environment Variables (NETLIFY_TOKEN)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const TOKEN = process.env.NETLIFY_TOKEN;
  if (!TOKEN) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const { siteName, htmlContent } = req.body;

    if (!siteName || !htmlContent) {
      return res.status(400).json({ error: 'siteName and htmlContent required' });
    }

    // Validate site name — only alphanumeric + dash, 3-40 chars
    const nameRegex = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
    if (!nameRegex.test(siteName)) {
      return res.status(400).json({
        error: 'Nama hanya boleh huruf kecil, angka, dan tanda -. Min 3, maks 40 karakter.'
      });
    }

    // 1. Check if name is available
    const checkRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteName}.netlify.app`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    if (checkRes.ok) {
      return res.status(409).json({ error: 'Nama sudah dipakai, coba nama lain.' });
    }

    // 2. Create Netlify site with custom subdomain
    const createSite = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: siteName,
        custom_domain: `${siteName}.netlify.app`,
      }),
    });

    const siteData = await createSite.json();
    if (!createSite.ok) {
      // Name taken
      if (siteData.errors?.name) {
        return res.status(409).json({ error: 'Nama sudah dipakai, coba nama lain.' });
      }
      return res.status(500).json({ error: siteData.message || 'Gagal membuat site' });
    }

    const siteId = siteData.id;

    // 3. Deploy HTML file
    // Netlify file digest deploy: need SHA1 of each file
    const encoder = new TextEncoder();
    const data = encoder.encode(htmlContent);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create deploy with file digest
    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: { '/index.html': sha1 },
        async: false,
      }),
    });

    const deployData = await deployRes.json();
    if (!deployRes.ok) {
      return res.status(500).json({ error: 'Gagal membuat deploy' });
    }

    const deployId = deployData.id;

    // 4. Upload the actual file
    const uploadRes = await fetch(
      `https://api.netlify.com/api/v1/deploys/${deployId}/files/index.html`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/octet-stream',
        },
        body: htmlContent,
      }
    );

    if (!uploadRes.ok) {
      return res.status(500).json({ error: 'Gagal upload file' });
    }

    // 5. Wait for deploy to be ready (poll)
    let ready = false;
    let attempts = 0;
    let finalUrl = `https://${siteName}.netlify.app`;

    while (!ready && attempts < 15) {
      await new Promise(r => setTimeout(r, 1500));
      const statusRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      const statusData = await statusRes.json();
      if (statusData.state === 'ready' || statusData.state === 'current') {
        ready = true;
        finalUrl = statusData.deploy_ssl_url || statusData.ssl_url || finalUrl;
      }
      attempts++;
    }

    return res.status(200).json({
      success: true,
      url: finalUrl,
      siteId,
      deployId,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
