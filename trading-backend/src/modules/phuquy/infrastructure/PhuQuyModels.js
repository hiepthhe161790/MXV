const mongoose = require('mongoose');

/**
 * PhuQuy Gold Price Cache Schema
 */
const phuQuyPriceSchema = new mongoose.Schema({
  goods_id:   { type: String, required: true, unique: true, index: true },
  name:       { type: String, required: true },
  unit_name:  { type: String, required: true },
  buy_price:  { type: Number, required: true },
  sell_price: { type: Number, required: true },
  isFound:    { type: Boolean, default: true },
  updatedAt:  { type: Date, default: Date.now },
}, { collection: 'phuquy_prices' });

const PhuQuyPriceModel = mongoose.models.PhuQuyPrice || 
  mongoose.model('PhuQuyPrice', phuQuyPriceSchema);

/**
 * PhuQuy QR Certificate Cache Schema
 */
const phuQuyQRSchema = new mongoose.Schema({
  qr_serial:      { type: String, required: true, unique: true, index: true },
  QrCode:         { type: String },
  Serial:         { type: String },
  NgayXuatXuong:  { type: String },
  ChatLieu:       { type: String },
  XuatXu:         { type: String },
  KL_Chi:         { type: String },
  KL_gram:        { type: String },
  HamLuong:       { type: Number },
  TenSanPham:     { type: String },
  MaSP:           { type: String },
  NgayKiemDinh:   { type: String },
  DonviKD:        { type: String },
  cachedAt:       { type: Date, default: Date.now },
}, { collection: 'phuquy_qrs' });

const PhuQuyQRModel = mongoose.models.PhuQuyQR || 
  mongoose.model('PhuQuyQR', phuQuyQRSchema);

module.exports = {
  PhuQuyPriceModel,
  PhuQuyQRModel,
};
