const https = require('https');

function _fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      timeout: 5000
    };

    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
          } catch (err) {
            reject(new Error('Failed to parse JSON response: ' + err.message));
          }
        } else {
          reject(new Error(`HTTP Status ${res.statusCode} with body: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

async function run() {
  const symbol = 'GC=F';
  const url1 = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
  const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
  const testUrl = 'https://api.coindesk.com/v1/bpi/currentprice.json';

  console.log(`📡 Fetching from query1: ${url1}`);
  try {
    const res = await _fetchJson(url1);
    console.log(`✅ Success query1! Status: ${res.statusCode}`);
  } catch (err) {
    console.error('❌ Failed query1:', err.message);
  }

  console.log(`📡 Fetching from query2: ${url2}`);
  try {
    const res = await _fetchJson(url2);
    console.log(`✅ Success query2! Status: ${res.statusCode}`);
  } catch (err) {
    console.error('❌ Failed query2:', err.message);
  }

  console.log(`📡 Fetching general API (Coindesk): ${testUrl}`);
  try {
    const res = await _fetchJson(testUrl);
    console.log(`✅ Success Coindesk! Bitcoin Price: $${res.data?.bpi?.USD?.rate}`);
  } catch (err) {
    console.error('❌ Failed Coindesk:', err.message);
  }
}

run();
