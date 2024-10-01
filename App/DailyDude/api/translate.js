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
    console.log('Attempting translation with:', { text, from, to });
    console.log('Using API key:', process.env.GOOGLE_TRANSLATE_API_KEY ? 'Present' : 'Missing');

    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2`,
      {
        q: text,
        source: from,
        target: to,
        format: 'text'
      },
      {
        params: {
          key: process.env.GOOGLE_TRANSLATE_API_KEY
        }
      }
    );
    
    console.log('Google API Response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.data && response.data.data.translations && response.data.data.translations[0]) {
      console.log('Translation successful');
      res.json({ translatedText: response.data.data.translations[0].translatedText });
    } else {
      console.error('Unexpected response structure:', JSON.stringify(response.data, null, 2));
      res.status(500).json({ error: 'Unexpected response from translation service' });
    }
  } catch (error) {
    console.error('Translation error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    res.status(500).json({ error: 'An error occurred during translation', details: error.message });
  }
}
