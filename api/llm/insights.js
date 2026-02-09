export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { prompt } = req.body || {};

  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
    return;
  }

  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_INSIGHTS_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful data processing assistant. Return JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 3000
    })
  });

  const completionJson = await completion.json();
  const content = completionJson.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse LLM response', raw: content });
    return;
  }

  res.status(200).json(parsed);
}
