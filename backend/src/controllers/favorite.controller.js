const favoriteService = require('../services/favorite.service');

async function listMine(req, res, next) {
  try {
    const favorites = await favoriteService.listMyFavorites(req.user.userId);
    res.status(200).json({ success: true, data: favorites });
  } catch (err) {
    next(err);
  }
}

async function add(req, res, next) {
  try {
    const favorite = await favoriteService.addFavorite(req.user.userId, req.body.providerId);
    res.status(201).json({ success: true, data: favorite });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await favoriteService.removeFavorite(req.user.userId, req.params.providerId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listMine, add, remove };
