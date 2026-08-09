const express = require('express');
const Character = require('../models/Character');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/:characterId/initiate', auth, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const character = await Character.findOne({ where: { id: characterId, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });

    res.json({
      code: 200,
      message: '通话已建立',
      data: {
        callId: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        character: { id: character.id, name: character.name, voiceType: character.voiceType },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:callId/end', auth, async (req, res) => {
  res.json({ code: 200, message: '通话已结束' });
});

module.exports = router;
