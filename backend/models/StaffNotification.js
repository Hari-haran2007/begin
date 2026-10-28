const mongoose = require('mongoose');

const staffNotificationSchema = new mongoose.Schema({
  staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notification_key: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  is_dismissed: { type: Boolean, default: false },
  read_at: { type: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

staffNotificationSchema.index({ staff_id: 1, notification_key: 1 }, { unique: true });

module.exports = mongoose.model('StaffNotification', staffNotificationSchema);
