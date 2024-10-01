import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, from, to } = req.body;

  if (!text || !from || !to) {
    console.log('Missing required fields in translation request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      {
        q: text,
        source: from,
        target: to,
        format: 'text'
      }
    );
    console.log('Translation successful');
    res.json({ translatedText: response.data.data.translations[0].translatedText });
  } catch (error) {
    console.error('Translation error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred during translation' });
  }
}
