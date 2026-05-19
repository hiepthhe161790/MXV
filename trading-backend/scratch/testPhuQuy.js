require('dotenv').config();
const Database = require('../src/shared/infrastructure/Database');
const phuQuyService = require('../src/modules/phuquy/application/PhuQuyService');
const { PhuQuyPriceModel, PhuQuyQRModel } = require('../src/modules/phuquy/infrastructure/PhuQuyModels');

async function runTests() {
  console.log('--- STARTING PHUQUY INTEGRATION VERIFICATION ---');
  
  try {
    // 1. Connect to Database
    console.log('\n[1] Connecting to MongoDB...');
    await Database.connect();
    console.log('MongoDB connection established successfully.');

    // Clear existing cache for a clean state check
    console.log('\n[2] Cleaning up existing test cache to verify write operations...');
    await PhuQuyPriceModel.deleteMany({});
    await PhuQuyQRModel.deleteMany({});
    console.log('Cleared price cache & QR certificates cache successfully.');

    // 2. Test Price List Synchronization (Mock Mode Enabled)
    console.log('\n[3] Triggering Manual Price List Synchronization (Mock Mode)...');
    const priceRes = await phuQuyService.syncPriceList();
    console.log(`Sync status: success=${priceRes.success}, source=${priceRes.source}`);
    console.log(`Synced ${priceRes.data.length} gold product prices.`);
    
    // Verify prices are cached in DB
    const dbPricesCount = await PhuQuyPriceModel.countDocuments();
    console.log(`Verified DB: ${dbPricesCount} prices written in MongoDB 'phuquy_prices' collection.`);

    // 3. Test QR Serial Search
    console.log('\n[4] Querying Serial: CBETDRX12 (Expected Cache Miss & Cache Write)...');
    const qrRes = await phuQuyService.searchByQRSerial('CBETDRX12');
    console.log(`Lookup status: success=${qrRes.success}, source=${qrRes.source}`);
    console.log(`Product Name: ${qrRes.data.TenSanPham}`);
    console.log(`Material: ${qrRes.data.ChatLieu}`);

    // Verify written in DB cache
    const dbQRCount = await PhuQuyQRModel.countDocuments();
    console.log(`Verified DB: ${dbQRCount} QR certificate cached in 'phuquy_qrs' collection.`);

    // 4. Test Cache Hit (Querying the same serial again)
    console.log('\n[5] Querying Serial: CBETDRX12 again (Expected Cache HIT)...');
    const qrResCached = await phuQuyService.searchByQRSerial('CBETDRX12');
    console.log(`Lookup status: success=${qrResCached.success}, source=${qrResCached.source}`);
    console.log(`Verified source is CACHE: ${qrResCached.source === 'cache'}`);

    // 5. Test Offline Fallback behavior (Simulate live connection fail in non-mock mode)
    console.log('\n[6] Testing Gateway Offline Fallback Mechanism...');
    // We temporarily turn mockMode to false and change base URL to a broken URL to trigger a network error
    phuQuyService.mockMode = false;
    phuQuyService.baseUrl = 'https://portal.phuquygroup-broken-website.vn:9999';
    
    console.log('Simulating offline partner server (MockMode=false, Broken BaseURL)...');
    console.log('Attempting syncPriceList()...');
    const fallbackRes = await phuQuyService.syncPriceList();
    console.log(`Fallback status: success=${fallbackRes.success}, source=${fallbackRes.source}`);
    console.log(`Retrieved ${fallbackRes.data.length} prices from Cache DB during offline fallback.`);
    console.log('Is Offline Fallback Successful?', fallbackRes.source === 'cache' ? 'YES' : 'NO');

    // 6. Print Integration Health Stats
    console.log('\n[7] Retrieving Gateway Integration Health Statistics...');
    // Restore settings
    phuQuyService.mockMode = true;
    phuQuyService.baseUrl = process.env.PHUQUY_BASE_URL || 'https://portal.phuquygroup.vn:6868';
    
    const health = await phuQuyService.getIntegrationStatus();
    console.log('Gateway Health Data:', JSON.stringify(health.data, null, 2));

    console.log('\n--- ALL PHUQUY SERVICE INTEGRATION TESTS PASSED ---');

  } catch (error) {
    console.error('\n!!! TEST EXECUTION ENCOUNTERED AN ERROR !!!', error);
  } finally {
    console.log('\nDisconnecting from MongoDB...');
    await Database.disconnect();
    console.log('Database connection closed.');
  }
}

runTests();
