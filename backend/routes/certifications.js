const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Certification = require('../models/Certification');
const User = require('../models/User');

// GET /api/certifications - Get all certifications for logged-in student
router.get('/', auth, async (req, res) => {
  try {
    const items = await Certification.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json(items);
  } catch (err) {
    console.error('Error fetching student certifications:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/certifications/:id/document - Stream or serve actual uploaded certificate document
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

    const item = await Certification.findById(req.params.id);
    if (!item) {
      return res.status(404).send('Certificate submission not found.');
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
      return res.status(404).send('No document uploaded for this certificate.');
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const isPdf = Boolean(
      item.file_type === 'pdf' || 
      item.file_url.includes('application/pdf') || 
      (item.file_name && item.file_name.toLowerCase().endsWith('.pdf'))
    );
    const defaultName = isPdf ? `${item.name || 'certificate'}.pdf` : `${item.name || 'certificate'}.png`;
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
    console.error('Error serving certificate document:', err);
    res.status(500).send('Server Error loading document.');
  }
});

// GET /api/certifications/:id - Get single certification
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Certification.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Certification not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    res.json(item);
  } catch (err) {
    console.error('Error fetching certification:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/certifications - Create new certification
router.post('/', auth, async (req, res) => {
  try {
    const { name, issuer, issue_date, expiry_date, credential_url, credential_id, mode, file_url, file_name, file_type } = req.body;

    let detectedType = file_type;
    if (!detectedType && file_url) {
      if (file_url.includes('application/pdf') || file_url.endsWith('.pdf') || (file_name && file_name.toLowerCase().endsWith('.pdf'))) {
        detectedType = 'pdf';
      } else if (file_url.startsWith('data:image/') || (file_name && file_name.match(/\.(jpe?g|png|webp)$/i))) {
        detectedType = 'image';
      }
    }

    const newItem = new Certification({ 
      ...req.body, 
      file_type: detectedType,
      file_name: file_name || (detectedType === 'pdf' ? `${name || 'certificate'}.pdf` : detectedType === 'image' ? `${name || 'certificate'}.png` : null),
      user_id: req.user.id 
    });
    const item = await newItem.save();
    res.json(item);
  } catch (err) {
    console.error('Error creating certification:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /api/certifications/:id - Update certification
router.put('/:id', auth, async (req, res) => {
  try {
    let item = await Certification.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    
    item = await Certification.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(item);
  } catch (err) {
    console.error('Error updating certification:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE /api/certifications/:id - Delete certification
router.delete('/:id', auth, async (req, res) => {
  try {
    let item = await Certification.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await Certification.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Item removed' });
  } catch (err) {
    console.error('Error deleting certification:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
