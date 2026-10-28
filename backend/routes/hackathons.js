const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Hackathon = require('../models/Hackathon');
const User = require('../models/User');

// GET /api/hackathons - Get all hackathons for student
router.get('/', auth, async (req, res) => {
  try {
    const items = await Hackathon.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json(items);
  } catch (err) {
    console.error('Error fetching hackathons:', err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/hackathons/:id/document - Stream or serve actual uploaded certificate/proof
router.get('/:id/document', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        user = decoded.user;
      } catch (e) {
        try {
          const decoded = jwt.verify(token, 'fallback_secret');
          user = decoded.user;
        } catch (err) {
          // Token invalid, ignore
        }
      }
    }

    const item = await Hackathon.findById(req.params.id);
    if (!item) {
      return res.status(404).send('Hackathon record not found.');
    }

    if (user) {
      const dbUser = await User.findById(user.id);
      const isStaff = dbUser && dbUser.role === 'staff';
      const isOwner = item.user_id.toString() === user.id;
      if (!isStaff && !isOwner) {
        return res.status(403).send('Unauthorized to access this document.');
      }
    }

    if (!item.file_url) {
      return res.status(404).send('No document uploaded for this hackathon.');
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const isPdf = Boolean(
      item.file_type === 'pdf' || 
      item.file_url.includes('application/pdf') || 
      (item.file_name && item.file_name.toLowerCase().endsWith('.pdf'))
    );
    const defaultName = isPdf ? 'hackathon_certificate.pdf' : 'hackathon_certificate.png';
    const rawName = item.file_name || defaultName;
    const filename = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Handle Data URL (Base64)
    if (item.file_url.startsWith('data:')) {
      const matches = item.file_url.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send('Malformed document data URL.');
      }
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.end(buffer);
    }

    // External URL
    if (item.file_url.startsWith('http')) {
      return res.redirect(item.file_url);
    }

    return res.status(400).send('Unsupported document storage format.');
  } catch (err) {
    console.error('Error serving hackathon document:', err);
    res.status(500).send('Server Error loading document.');
  }
});

// GET /api/hackathons/:id - Get single hackathon
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Hackathon.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Hackathon not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    res.json(item);
  } catch (err) {
    console.error('Error fetching hackathon:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/hackathons - Create new hackathon
router.post('/', auth, async (req, res) => {
  try {
    let detectedType = req.body.file_type;
    const fileUrl = req.body.file_url;
    const fileName = req.body.file_name;

    if (!detectedType && fileUrl) {
      if (fileUrl.includes('application/pdf') || (fileName && fileName.toLowerCase().endsWith('.pdf'))) {
        detectedType = 'pdf';
      } else {
        detectedType = 'image';
      }
    }

    const newItem = new Hackathon({ 
      ...req.body, 
      user_id: req.user.id,
      file_type: detectedType || null,
      verification_status: 'Pending',
      staff_comment: ''
    });
    const item = await newItem.save();
    res.json(item);
  } catch (err) {
    console.error('Error creating hackathon:', err.message);
    res.status(500).send('Server Error');
  }
});

// PUT /api/hackathons/:id - Update hackathon
router.put('/:id', auth, async (req, res) => {
  try {
    let item = await Hackathon.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    let detectedType = req.body.file_type || item.file_type;
    const fileUrl = req.body.file_url !== undefined ? req.body.file_url : item.file_url;
    const fileName = req.body.file_name !== undefined ? req.body.file_name : item.file_name;

    if (fileUrl && (!detectedType || req.body.file_url !== undefined)) {
      if (fileUrl.includes('application/pdf') || (fileName && fileName.toLowerCase().endsWith('.pdf'))) {
        detectedType = 'pdf';
      } else {
        detectedType = 'image';
      }
    }

    const updates = {
      ...req.body,
      file_type: detectedType || null,
      updated_at: new Date()
    };

    if (item.verification_status === 'rejected' || item.verification_status === 'Rejected' || 
        item.verification_status === 'reupload' || item.verification_status === 'Re-upload') {
      updates.verification_status = 'Pending';
    }

    item = await Hackathon.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.json(item);
  } catch (err) {
    console.error('Error updating hackathon:', err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE /api/hackathons/:id - Delete hackathon
router.delete('/:id', auth, async (req, res) => {
  try {
    let item = await Hackathon.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await Hackathon.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Item removed' });
  } catch (err) {
    console.error('Error deleting hackathon:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
