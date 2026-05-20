const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const Cache = require('../src/shared/infrastructure/Cache');

async function run() {
  const cache = new Cache(process.env.REDIS_URL);
  await cache.connect();

  const symbols = ['GCZ24', 'SIZ24', 'CLZ24', 'NGF25', 'HGZ24', 'ZCZ24', 'ZSF25', 'KCZ24'];
  
  console.log('\n=== CHECKING market:price:* KEYS IN REDIS ===');
  for (const sym of symbols) {
    const val = await cache.get(`market:price:${sym}`);
    console.log(`  market:price:${sym} = ${JSON.stringify(val)} (type: ${typeof val})`);
  }

  await cache.disconnect();
}

run().catch(console.error);
