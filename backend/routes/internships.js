const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Internship = require('../models/Internship');
const User = require('../models/User');

// GET /api/internships - Get all internships for logged-in student
router.get('/', auth, async (req, res) => {
  try {
    const items = await Internship.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json(items);
  } catch (err) {
    console.error('Error fetching student internships:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/internships/:id/document - Stream or serve actual uploaded document
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

    const item = await Internship.findById(req.params.id);
    if (!item) {
      return res.status(404).send('Internship submission not found.');
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
      return res.status(404).send('No document uploaded for this internship.');
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const isPdf = Boolean(
      item.file_type === 'pdf' || 
      item.file_url.includes('application/pdf') || 
      (item.file_name && item.file_name.toLowerCase().endsWith('.pdf'))
    );
    const defaultName = isPdf ? 'internship_document.pdf' : 'internship_document.png';
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
    console.error('Error serving internship document:', err);
    res.status(500).send('Server Error loading document.');
  }
});

// GET /api/internships/:id - Get single internship
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Internship.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Internship not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    res.json(item);
  } catch (err) {
    console.error('Error fetching internship:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/internships - Create new internship with document upload
router.post('/', auth, async (req, res) => {
  try {
    const {
      company,
      companyName,
      role,
      internshipRole,
      description,
      start_date,
      startDate,
      end_date,
      endDate,
      is_current,
      location,
      work_type,
      stipend,
      mode,
      url,
      file_url,
      uploadedDocumentUrl,
      file_name,
      file_type,
      uploadedDocumentType
    } = req.body;

    const finalCompany = (company || companyName || '').trim();
    const finalRole = (role || internshipRole || '').trim();
    const finalStartDate = start_date || startDate;
    const finalEndDate = is_current ? null : (end_date || endDate || null);
    const finalFileUrl = file_url || uploadedDocumentUrl || null;

    if (!finalCompany) {
      return res.status(400).json({ error: 'Company name is required.' });
    }
    if (!finalRole) {
      return res.status(400).json({ error: 'Internship role is required.' });
    }
    if (!finalStartDate) {
      return res.status(400).json({ error: 'Start date is required.' });
    }

    // Validate uploaded file if provided
    let detectedType = file_type || uploadedDocumentType || null;
    if (finalFileUrl) {
      const isPdf = finalFileUrl.includes('application/pdf') || 
                    (file_name && file_name.toLowerCase().endsWith('.pdf')) ||
                    finalFileUrl.toLowerCase().endsWith('.pdf');
      
      const isImage = finalFileUrl.startsWith('data:image/') ||
                      (file_name && file_name.match(/\.(jpe?g|png|webp)$/i)) ||
                      finalFileUrl.match(/\.(jpe?g|png|webp)/i);

      if (!isPdf && !isImage && !finalFileUrl.startsWith('http')) {
        return res.status(400).json({ 
          error: 'Supported formats for internship document are JPG, JPEG, PNG, WEBP and PDF.' 
        });
      }

      if (isPdf) {
        detectedType = 'pdf';
      } else if (isImage) {
        detectedType = 'image';
      }
    }

    let safeWorkType = 'remote';
    if (work_type && typeof work_type === 'string') {
      const wt = work_type.toLowerCase();
      if (['remote', 'onsite', 'hybrid'].includes(wt)) {
        safeWorkType = wt;
      }
    }

    let safeMode = 'online';
    if (mode && typeof mode === 'string') {
      const md = mode.toLowerCase();
      if (['online', 'offline'].includes(md)) {
        safeMode = md;
      } else if (md === 'onsite') {
        safeMode = 'offline';
      }
    } else if (!url) {
      safeMode = 'offline';
    }

    const newInternship = new Internship({
      user_id: req.user.id,
      company: finalCompany,
      role: finalRole,
      description: description || '',
      start_date: finalStartDate,
      end_date: finalEndDate,
      is_current: Boolean(is_current),
      location: location || null,
      work_type: safeWorkType,
      stipend: stipend ? parseFloat(stipend) : null,
      mode: safeMode,
      url: safeMode === 'online' ? (url || null) : null,
      file_url: finalFileUrl,
      file_name: file_name || (detectedType === 'pdf' ? 'internship_document.pdf' : detectedType === 'image' ? 'internship_document.png' : null),
      file_type: detectedType,
      verification_status: 'Pending',
      skills: Array.isArray(req.body.skills) ? req.body.skills : []
    });

    const item = await newInternship.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('Error creating internship:', err);
    res.status(500).json({ error: err.message || 'Server Error' });
  }
});

// PUT /api/internships/:id - Update internship
router.put('/:id', auth, async (req, res) => {
  try {
    let item = await Internship.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Internship not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    
    // If student updates their internship, reset status to Pending for review if file changed
    const updates = { ...req.body };
    delete updates.user_id; // prevent changing owner
    if (updates.file_url && updates.file_url !== item.file_url) {
      updates.verification_status = 'Pending';
    }

    item = await Internship.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.json(item);
  } catch (err) {
    console.error('Error updating internship:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE /api/internships/:id - Delete internship
router.delete('/:id', auth, async (req, res) => {
  try {
    let item = await Internship.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Internship not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await Internship.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Internship removed successfully' });
  } catch (err) {
    console.error('Error deleting internship:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;

