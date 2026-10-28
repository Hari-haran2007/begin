const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const GrowthMetrics = require('../models/GrowthMetrics');

router.get('/', auth, async (req, res) => {
  try {
    const items = await GrowthMetrics.find({ user_id: req.user.id });
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const newItem = new GrowthMetrics({ ...req.body, user_id: req.user.id });
    const item = await newItem.save();
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    let item = await GrowthMetrics.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    
    item = await GrowthMetrics.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    let item = await GrowthMetrics.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await GrowthMetrics.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Item removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
