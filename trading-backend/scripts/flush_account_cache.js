/**
 * flush_account_cache.js
 * Xóa cache Redis cho tất cả account để lấy dữ liệu mới nhất từ MongoDB.
 * Run: node scripts/flush_account_cache.js
 */
const { createClient } = require('redis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ REDIS_URL not defined in .env!');
    process.exit(1);
  }

  console.log('🔌 Connecting to Redis...');
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => console.error('Redis error:', err));
  await client.connect();
  console.log('✅ Connected to Redis\n');

  // Find all account:* keys
  const accountKeys = await client.keys('account:*');
  const positionKeys = await client.keys('position:*');
  const positionsKeys = await client.keys('positions:*');

  const allKeys = [...accountKeys, ...positionKeys, ...positionsKeys];

  if (allKeys.length === 0) {
    console.log('ℹ️  No cached account/position keys found.');
  } else {
    console.log(`🗑️  Deleting ${allKeys.length} cached key(s):`);
    for (const key of allKeys) {
      await client.del(key);
      console.log(`   ✅ Deleted: ${key}`);
    }
  }

  await client.disconnect();
  console.log('\n🔌 Disconnected from Redis.');
  console.log('✅ Cache flushed — backend will now read fresh data from MongoDB.');
}

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
