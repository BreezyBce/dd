import axios from 'axios';

export default async function handler(req, res) {
  const { from, to } = req.query;
  
  console.log('Received exchange rate request:', { from, to });

  if (!from || !to) {
    console.log('Missing required parameters');
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`);
    console.log('Exchange rate API response:', response.data);
    res.json({ conversionRate: response.data.conversion_rate });
  } catch (error) {
    console.error('Error in exchange-rate:', error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch exchange rate', details: error.message });
  }
}
