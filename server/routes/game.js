const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController.js');

// Example routes (implement the corresponding controller functions)
router.post('/create', gameController.createGame);
router.get('/:id', gameController.getGame);
router.post('/:id/join', gameController.joinGame);
router.post('/:id/move', gameController.makeMove);

module.exports = router;