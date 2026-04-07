const express = require('express');
const router = express.Router();
const Scenario = require('../models/Scenario');
const { protect } = require('../middlewares/auth');

// @route   GET /api/scenarios
// @desc    Get all user scenarios
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const scenarios = await Scenario.find({ owner: req.user._id })
                              .populate('trigger.deviceId')
                              .populate('action.deviceId');
    res.json(scenarios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/scenarios
// @desc    Create a new scenario
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, trigger, action, active } = req.body;

    const scenario = new Scenario({
      name,
      description,
      trigger,
      action,
      active: active !== undefined ? active : true,
      owner: req.user._id,
    });

    const createdScenario = await scenario.save();
    res.status(201).json(createdScenario);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/scenarios/:id
// @desc    Delete a scenario
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const scenario = await Scenario.findById(req.params.id);

    if (scenario && scenario.owner.toString() === req.user._id.toString()) {
      await scenario.deleteOne();
      res.json({ message: 'Scenario removed' });
    } else {
      res.status(404).json({ message: 'Scenario not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
