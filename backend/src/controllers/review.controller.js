const reviewService = require('../services/review.service');

async function create(req, res, next) {
  try {
    const review = await reviewService.createReview({
      customerId: req.user.userId,
      bookingId: req.body.bookingId,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await reviewService.deleteReview(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const reviews = await reviewService.listMyReviews(req.user.userId);
    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, remove, listMine };
