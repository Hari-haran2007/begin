const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');

// GET /api/projects - Get all projects for logged-in student
router.get('/', auth, async (req, res) => {
  try {
    const items = await Project.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json(items);
  } catch (err) {
    console.error('Error fetching student projects:', err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/projects/:id/document - Stream or serve actual uploaded document
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

    const item = await Project.findById(req.params.id);
    if (!item) {
      return res.status(404).send('Project submission not found.');
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
      return res.status(404).send('No document uploaded for this project.');
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const isPdf = Boolean(
      item.file_type === 'pdf' || 
      item.file_url.includes('application/pdf') || 
      (item.file_name && item.file_name.toLowerCase().endsWith('.pdf'))
    );
    const defaultName = isPdf ? 'project_document.pdf' : 'project_document.png';
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
    console.error('Error serving project document:', err);
    res.status(500).send('Server Error loading document.');
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Project.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Project not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    res.json(item);
  } catch (err) {
    console.error('Error fetching project:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/projects - Create new project
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      technologies,
      github_url,
      live_url,
      start_date,
      end_date,
      status,
      file_url,
      file_name,
      file_type
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required.' });
    }

    let detectedType = file_type;
    if (!detectedType && file_url) {
      if (file_url.includes('application/pdf') || (file_name && file_name.toLowerCase().endsWith('.pdf'))) {
        detectedType = 'pdf';
      } else {
        detectedType = 'image';
      }
    }

    const newItem = new Project({
      user_id: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      technologies: Array.isArray(technologies) ? technologies : [],
      github_url: github_url ? github_url.trim() : null,
      live_url: live_url ? live_url.trim() : null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || 'completed',
      file_url: file_url || null,
      file_name: file_name || null,
      file_type: detectedType || null,
      verification_status: 'Pending',
      staff_comment: ''
    });

    const saved = await newItem.save();
    res.json(saved);
  } catch (err) {
    console.error('Error creating project:', err.message);
    res.status(500).json({ error: 'Server Error creating project' });
  }
});

// PUT /api/projects/:id - Update existing project
router.put('/:id', auth, async (req, res) => {
  try {
    let item = await Project.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Project not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    const {
      title,
      description,
      technologies,
      github_url,
      live_url,
      start_date,
      end_date,
      status,
      file_url,
      file_name,
      file_type
    } = req.body;

    let detectedType = file_type || item.file_type;
    const finalFileUrl = file_url !== undefined ? file_url : item.file_url;
    const finalFileName = file_name !== undefined ? file_name : item.file_name;

    if (finalFileUrl && (!detectedType || file_url !== undefined)) {
      if (finalFileUrl.includes('application/pdf') || (finalFileName && finalFileName.toLowerCase().endsWith('.pdf'))) {
        detectedType = 'pdf';
      } else {
        detectedType = 'image';
      }
    }

    const updates = {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(technologies !== undefined && { technologies: Array.isArray(technologies) ? technologies : [] }),
      ...(github_url !== undefined && { github_url: github_url ? github_url.trim() : null }),
      ...(live_url !== undefined && { live_url: live_url ? live_url.trim() : null }),
      ...(start_date !== undefined && { start_date: start_date || null }),
      ...(end_date !== undefined && { end_date: end_date || null }),
      ...(status !== undefined && { status }),
      ...(file_url !== undefined && { file_url: finalFileUrl }),
      ...(file_name !== undefined && { file_name: finalFileName }),
      ...(detectedType !== undefined && { file_type: detectedType }),
      updated_at: new Date()
    };

    // If the project had been rejected or reupload requested, reset to Pending on student edit
    if (item.verification_status === 'rejected' || item.verification_status === 'Rejected' || 
        item.verification_status === 'reupload' || item.verification_status === 'Re-upload') {
      updates.verification_status = 'Pending';
    }

    const updatedItem = await Project.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.json(updatedItem);
  } catch (err) {
    console.error('Error updating project:', err.message);
    res.status(500).json({ error: 'Server Error updating project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    let item = await Project.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await Project.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Item removed' });
  } catch (err) {
    console.error('Error deleting project:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
