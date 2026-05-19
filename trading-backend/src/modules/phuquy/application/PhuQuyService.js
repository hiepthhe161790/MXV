const https = require('https');
const url = require('url');
const { PhuQuyPriceModel, PhuQuyQRModel } = require('../infrastructure/PhuQuyModels');
const logger = require('../../../shared/infrastructure/Logger');

/**
 * Service to handle integration with PhuQuy Group API Gateway.
 * Supports offline DB caching and Sandbox Mock Mode.
 */
class PhuQuyService {
  constructor() {
    this.baseUrl = process.env.PHUQUY_BASE_URL || 'https://portal.phuquygroup.vn:6868';
    this.username = process.env.PHUQUY_USERNAME || 'phuquy_msb_user';
    this.password = process.env.PHUQUY_PASSWORD || 'phuquy_msb_password';
    this.clientCode = process.env.PHUQUY_CLIENT_CODE || 'MSB';
    this.checksum = process.env.PHUQUY_CHECKSUM || 'phuquy_checksum_token';
    this.mockMode = process.env.PHUQUY_MOCK_MODE === 'true';

    // In-memory token storage
    this.cachedToken = null;
    this.tokenExpiresAt = 0; // Timestamp in ms
    this.lastSyncTime = null;
    this.syncStatus = 'IDLE'; // IDLE, SYNCING, ERROR, SUCCESS
    this.lastSyncError = null;

    logger.info(`PhuQuyService initialized. BaseURL: ${this.baseUrl}. MockMode: ${this.mockMode}`);
  }

  /**
   * Safe native https helper for POST/GET requests.
   */
  async _request(method, endpoint, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const fullUrl = `${this.baseUrl}${endpoint}`;
      const parsedUrl = url.parse(fullUrl);

      const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers,
      };

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: method.toUpperCase(),
        headers: requestHeaders,
        timeout: 8000, // 8 second timeout
        rejectUnauthorized: false, // In development, self-signed certificates might be used
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(responseData));
            } catch (err) {
              resolve(responseData);
            }
          } else {
            let parsedErr;
            try {
              parsedErr = JSON.parse(responseData);
            } catch (_) {
              parsedErr = { message: responseData || `HTTP Status ${res.statusCode}` };
            }
            reject({
              status: res.statusCode,
              error: parsedErr.error || 'api_error',
              message: parsedErr.message || 'API request failed',
            });
          }
        });
      });

      req.on('error', (err) => {
        reject({
          error: 'network_error',
          message: err.message || 'Network connection failed',
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          error: 'timeout',
          message: 'Connection timed out',
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * Authenticate and get Bearer Token. Manages token lifecycle.
   * Auto-refreshes if token is within 15 minutes of expiration.
   */
  async getAccessToken() {
    const now = Date.now();
    // Buffer of 15 minutes (900,000 ms) before expiration
    if (this.cachedToken && this.tokenExpiresAt > now + 900000) {
      return this.cachedToken;
    }

    logger.info('Acquiring fresh Bearer Token from PhuQuy Portal...');

    if (this.mockMode) {
      // Simulate live login in Mock Mode
      this.cachedToken = 'mock-bearer-token-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      this.tokenExpiresAt = now + (7200 * 1000); // 2 hours
      logger.info('Acquired mock Bearer token successfully.');
      return this.cachedToken;
    }

    try {
      const response = await this._request('POST', '/api/auth/token', {
        Username: this.username,
        Password: this.password,
        ClientCode: this.clientCode,
        CheckSum: this.checksum,
      });

      if (response && response.access_token) {
        this.cachedToken = response.access_token;
        const expiresIn = response.expires_in || 7200; // default 2 hours
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
        logger.info(`Acquired live token successfully. Expires in ${expiresIn}s`);
        return this.cachedToken;
      } else {
        throw new Error(response.message || 'Authentication response missing access token');
      }
    } catch (error) {
      logger.error('PhuQuy Authentication Failed:', error);
      throw error;
    }
  }

  /**
   * Sync prices from partner's API and cache them in MongoDB.
   * On failure, seamlessly fallbacks to the MongoDB cached price list.
   */
  async syncPriceList() {
    this.syncStatus = 'SYNCING';
    const now = Date.now();

    if (this.mockMode) {
      // Return high-quality mock data and save it to MongoDB cache
      logger.info('Syncing price list via Sandbox/Mock Mode...');
      const mockPrices = [
        {
          goods_id: 'SJC1L',
          name: 'Vàng miếng SJC Phú Quý (1 lượng)',
          unit_name: 'Lượng',
          buy_price: 89000000.0,
          sell_price: 91300000.0,
          isFound: true
        },
        {
          goods_id: 'NPQ10',
          name: 'Nhẫn tròn trơn Phú Quý 24K (999.9)',
          unit_name: 'Chỉ',
          buy_price: 75500000.0 / 10, // ~7.55M per chỉ
          sell_price: 77200000.0 / 10, // ~7.72M per chỉ
          isFound: true
        },
        {
          goods_id: '24K',
          name: 'Vàng trang sức Phú Quý 24K',
          unit_name: 'Chỉ',
          buy_price: 7490000.0,
          sell_price: 7690000.0,
          isFound: true
        },
        {
          goods_id: '999',
          name: 'Vàng trang sức Phú Quý 999',
          unit_name: 'Chỉ',
          buy_price: 7480000.0,
          sell_price: 7680000.0,
          isFound: true
        },
        {
          goods_id: '18K',
          name: 'Vàng trang sức Phú Quý 18K',
          unit_name: 'Chỉ',
          buy_price: 5460000.0,
          sell_price: 5760000.0,
          isFound: true
        }
      ];

      // Update cache in MongoDB
      try {
        for (const item of mockPrices) {
          await PhuQuyPriceModel.findOneAndUpdate(
            { goods_id: item.goods_id },
            { ...item, updatedAt: new Date() },
            { upsert: true, new: true }
          );
        }
        this.lastSyncTime = new Date();
        this.syncStatus = 'SUCCESS';
        this.lastSyncError = null;
        logger.info('MongoDB Price cache updated with mock data successfully.');
      } catch (err) {
        logger.error('Failed to update Price Cache in MongoDB:', err);
      }

      return {
        success: true,
        message: 'Lấy danh sách giá thành công (Sandbox Mode)',
        source: 'sandbox',
        timestamp: this.lastSyncTime,
        data: mockPrices,
      };
    }

    try {
      const token = await this.getAccessToken();
      logger.info('Fetching live price list from PhuQuy Group API...');
      const response = await this._request('GET', '/api/msb/pricelist', null, {
        Authorization: `Bearer ${token}`,
      });

      // Update Cache in MongoDB
      if (response && response.success && Array.isArray(response.data)) {
        for (const item of response.data) {
          await PhuQuyPriceModel.findOneAndUpdate(
            { goods_id: item.goods_id },
            {
              goods_id: item.goods_id,
              name: item.name,
              unit_name: item.unit_name,
              buy_price: item.buy_price,
              sell_price: item.sell_price,
              isFound: item.isFound === 1 || item.isFound === true,
              updatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
        }
        this.lastSyncTime = new Date();
        this.syncStatus = 'SUCCESS';
        this.lastSyncError = null;
        logger.info('Price Cache updated successfully from Live PhuQuy API.');
        
        return {
          ...response,
          source: 'live',
          timestamp: this.lastSyncTime,
        };
      } else {
        throw new Error(response.message || 'Invalid format returned by price list API');
      }
    } catch (error) {
      logger.error('PhuQuy Price Sync Failed. Falling back to MongoDB cached data...', error);
      this.syncStatus = 'ERROR';
      this.lastSyncError = error.message || 'API sync failed';

      // Fallback: Fetch cached price list from MongoDB
      try {
        const cachedPrices = await PhuQuyPriceModel.find({});
        if (cachedPrices && cachedPrices.length > 0) {
          logger.info(`Successfully served ${cachedPrices.length} records from MongoDB Cache.`);
          return {
            success: true,
            message: 'Lấy danh sách giá thành công (Dữ liệu từ Cache hệ thống do Đối tác ngoại tuyến)',
            source: 'cache',
            timestamp: this.lastSyncTime || (cachedPrices[0] ? cachedPrices[0].updatedAt : new Date()),
            data: cachedPrices.map(c => ({
              goods_id: c.goods_id,
              name: c.name,
              unit_name: c.unit_name,
              buy_price: c.buy_price,
              sell_price: c.sell_price,
              isFound: c.isFound,
            })),
          };
        }
      } catch (cacheErr) {
        logger.error('Failed to read price cache from MongoDB:', cacheErr);
      }

      // Final fallback if even DB is empty: high quality default prices
      const seedPrices = [
        { goods_id: 'SJC1L', name: 'Vàng SJC Phú Quý (Chưa đồng bộ)', unit_name: 'Lượng', buy_price: 88500000, sell_price: 90800000, isFound: true },
        { goods_id: 'NPQ10', name: 'Nhẫn Tròn Phú Quý (Chưa đồng bộ)', unit_name: 'Chỉ', buy_price: 7400000, sell_price: 7580000, isFound: true }
      ];
      return {
        success: false,
        message: 'Không thể kết nối đối tác & Không có cache. Sử dụng giá trị gốc mặc định.',
        source: 'default',
        timestamp: new Date(),
        data: seedPrices,
      };
    }
  }

  /**
   * Search product details by QR serial.
   * Seamlessly caches search results in MongoDB.
   * If live search fails, searches database or generates structure fallback.
   */
  async searchByQRSerial(qrSerial) {
    if (!qrSerial) {
      throw new Error('Mã QR/Serial không được để trống');
    }

    const trimmedSerial = qrSerial.trim();
    logger.info(`Searching product details for QR/Serial: ${trimmedSerial}`);

    // Step 1: Check MongoDB Cache first to see if it is already queried
    try {
      const cachedQR = await PhuQuyQRModel.findOne({
        $or: [
          { qr_serial: trimmedSerial },
          { Serial: trimmedSerial },
          { QrCode: trimmedSerial }
        ]
      });

      if (cachedQR) {
        logger.info(`Cache HIT for QR/Serial: ${trimmedSerial}`);
        return {
          success: true,
          message: 'Lấy thông tin thành công (Dữ liệu từ Cache hệ thống)',
          source: 'cache',
          timestamp: cachedQR.cachedAt,
          data: {
            QrCode: cachedQR.QrCode,
            Serial: cachedQR.Serial,
            NgayXuatXuong: cachedQR.NgayXuatXuong,
            ChatLieu: cachedQR.ChatLieu,
            XuatXu: cachedQR.XuatXu,
            KL_Chi: cachedQR.KL_Chi,
            KL_gram: cachedQR.KL_gram,
            HamLuong: cachedQR.HamLuong,
            TenSanPham: cachedQR.TenSanPham,
            MaSP: cachedQR.MaSP,
            NgayKiemDinh: cachedQR.NgayKiemDinh,
            DonviKD: cachedQR.DonviKD,
          }
        };
      }
    } catch (dbErr) {
      logger.error('Failed to read QR cache from MongoDB:', dbErr);
    }

    // Step 2: Cache MISS -> Request partner API (or simulate in mock mode)
    if (this.mockMode) {
      logger.info(`Creating mock QR certificate data for Serial: ${trimmedSerial}`);
      // Generate a realistic mock product depending on input
      const isGoldBar = trimmedSerial.toUpperCase().startsWith('SJC') || trimmedSerial.toUpperCase().startsWith('CB');
      
      const mockResult = {
        QrCode: 'QR-' + Math.random().toString(36).slice(2, 9).toUpperCase(),
        Serial: trimmedSerial,
        NgayXuatXuong: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), // 30 days ago
        ChatLieu: isGoldBar ? 'Vàng Ròng 999.9' : 'Bạc Nguyên Chất 999',
        XuatXu: 'Việt Nam',
        KL_Chi: isGoldBar ? '10.000 (1 lượng)' : '266.666 (Bản Giới Hạn)',
        KL_gram: isGoldBar ? '37.5 g' : '1 kg',
        HamLuong: 999.90,
        TenSanPham: isGoldBar 
          ? 'Vàng Miếng SJC Phú Quý 999.9 1 Lượng' 
          : 'Bạc Thanh Long Phú Quý Thượng Hạng 999 1KG',
        MaSP: isGoldBar ? 'SJC1L' : 'BTL1KGM',
        NgayKiemDinh: new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString(),
        DonviKD: 'Phòng Giám Định Kim Hoàn Phú Quý (VGVLab)',
      };

      // Save into cache
      try {
        await PhuQuyQRModel.create({
          qr_serial: trimmedSerial,
          ...mockResult,
          cachedAt: new Date(),
        });
        logger.info(`Mock QR detail saved to MongoDB Cache.`);
      } catch (err) {
        logger.error('Failed to write mock QR cache in MongoDB:', err);
      }

      return {
        success: true,
        message: 'Lấy thông tin thành công (Sandbox Mode)',
        source: 'sandbox',
        timestamp: new Date(),
        data: mockResult,
      };
    }

    try {
      const token = await this.getAccessToken();
      logger.info(`Requesting partner QR search for serial: ${trimmedSerial}`);
      const response = await this._request('GET', `/api/msb/qr_serial_search?qr_serial=${encodeURIComponent(trimmedSerial)}`, null, {
        Authorization: `Bearer ${token}`,
      });

      if (response && response.success && response.data) {
        // Cache result in MongoDB
        try {
          await PhuQuyQRModel.findOneAndUpdate(
            { qr_serial: trimmedSerial },
            {
              qr_serial: trimmedSerial,
              QrCode: response.data.QrCode,
              Serial: response.data.Serial,
              NgayXuatXuong: response.data['Ngay XuatXuong'] || response.data.NgayXuatXuong,
              ChatLieu: response.data.ChatLieu,
              XuatXu: response.data.XuatXu,
              KL_Chi: response.data.KL_Chi,
              KL_gram: response.data.KL_gram,
              HamLuong: response.data.HamLuong,
              TenSanPham: response.data.TenSanPham,
              MaSP: response.data.MaSP,
              NgayKiemDinh: response.data.NgayKiemDinh,
              DonviKD: response.data.DonviKD,
              cachedAt: new Date(),
            },
            { upsert: true, new: true }
          );
          logger.info(`Cached live QR result for ${trimmedSerial} in MongoDB.`);
        } catch (dbErr) {
          logger.error('Failed to cache live QR result in MongoDB:', dbErr);
        }

        return {
          ...response,
          source: 'live',
          timestamp: new Date(),
        };
      } else {
        throw new Error(response.message || 'QR Serial not found or invalid response');
      }
    } catch (error) {
      logger.error(`Live QR lookup failed for ${trimmedSerial}. Falling back to DB search...`, error);
      
      // Fallback: If DB query already ran, it would have found it. 
      // But let's verify if there is any fuzzy match cached, just in case
      try {
        const fuzzyCached = await PhuQuyQRModel.findOne({
          $or: [
            { qr_serial: { $regex: trimmedSerial, $options: 'i' } },
            { Serial: { $regex: trimmedSerial, $options: 'i' } }
          ]
        });

        if (fuzzyCached) {
          logger.info(`Fuzzy cache HIT for QR: ${trimmedSerial}`);
          return {
            success: true,
            message: 'Lấy thông tin thành công (Dữ liệu từ Cache hệ thống - Đối tác ngoại tuyến)',
            source: 'cache',
            timestamp: fuzzyCached.cachedAt,
            data: {
              QrCode: fuzzyCached.QrCode,
              Serial: fuzzyCached.Serial,
              NgayXuatXuong: fuzzyCached.NgayXuatXuong,
              ChatLieu: fuzzyCached.ChatLieu,
              XuatXu: fuzzyCached.XuatXu,
              KL_Chi: fuzzyCached.KL_Chi,
              KL_gram: fuzzyCached.KL_gram,
              HamLuong: fuzzyCached.HamLuong,
              TenSanPham: fuzzyCached.TenSanPham,
              MaSP: fuzzyCached.MaSP,
              NgayKiemDinh: fuzzyCached.NgayKiemDinh,
              DonviKD: fuzzyCached.DonviKD,
            }
          };
        }
      } catch (cacheErr) {
        logger.error('Failed to read fuzzy cache from MongoDB:', cacheErr);
      }

      // If absolutely no cache and it's demo/testing, generate structural template to keep the app gorgeous
      logger.warn(`Absolutely no cache found for QR: ${trimmedSerial}. Generating fallback simulation.`);
      return {
        success: false,
        message: `Mã QR/Serial '${trimmedSerial}' không có trong cache và kết nối đối tác hiện thời bị gián đoạn.`,
        source: 'failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get overall gateway integration health status.
   */
  async getIntegrationStatus() {
    let pricesCacheCount = 0;
    let qrsCacheCount = 0;

    try {
      pricesCacheCount = await PhuQuyPriceModel.countDocuments();
      qrsCacheCount = await PhuQuyQRModel.countDocuments();
    } catch (_) {}

    return {
      success: true,
      data: {
        baseUrl: this.baseUrl,
        mockMode: this.mockMode,
        connectionStatus: this.syncStatus,
        lastSyncTime: this.lastSyncTime,
        lastSyncError: this.lastSyncError,
        tokenCached: !!this.cachedToken,
        tokenTimeRemainingMinutes: this.cachedToken 
          ? Math.max(0, Math.round((this.tokenExpiresAt - Date.now()) / 60000))
          : 0,
        cacheStats: {
          pricesCached: pricesCacheCount,
          qrsCached: qrsCacheCount,
        }
      }
    };
  }
}

module.exports = new PhuQuyService();
