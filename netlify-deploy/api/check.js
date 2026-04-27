// api/check.js — cek ketersediaan nama subdomain
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });

  const TOKEN = process.env.NETLIFY_TOKEN;

  try {
    const r = await fetch(`https://api.netlify.com/api/v1/sites/${name}.netlify.app`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    // 404 = available, 200 = taken
    return res.status(200).json({ available: !r.ok });
  } catch {
    return res.status(200).json({ available: true });
  }
}
