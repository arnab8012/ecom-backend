import express from "express";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

async function updateProductRating(productId) {
  const pid = new mongoose.Types.ObjectId(productId);

  const stats = await Review.aggregate([
    {
      $match: {
        productId: pid,
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$productId",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const averageRating = Number((stats[0]?.averageRating || 0).toFixed(1));
  const reviewCount = Number(stats[0]?.reviewCount || 0);

  await Product.findByIdAndUpdate(productId, {
    averageRating,
    reviewCount,
  });
}

/**
 * GET /api/reviews/product/:productId
 * public
 */
router.get(
  "/product/:productId",
  asyncHandler(async (req, res) => {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ ok: false, message: "Invalid product id" });
    }

    const reviews = await Review.find({
      productId,
      status: "approved",
    })
      .sort({ createdAt: -1 })
      .select("name rating comment isVerifiedPurchase createdAt");

    const stats = await Review.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
          five: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          four: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          three: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          two: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          one: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    const summary = stats[0] || {
      averageRating: 0,
      reviewCount: 0,
      five: 0,
      four: 0,
      three: 0,
      two: 0,
      one: 0,
    };

    res.json({
      ok: true,
      reviews,
      summary: {
        averageRating: Number(Number(summary.averageRating || 0).toFixed(1)),
        reviewCount: Number(summary.reviewCount || 0),
        breakdown: {
          5: Number(summary.five || 0),
          4: Number(summary.four || 0),
          3: Number(summary.three || 0),
          2: Number(summary.two || 0),
          1: Number(summary.one || 0),
        },
      },
    });
  })
);

/**
 * POST /api/reviews
 * login required
 */
router.post(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { productId, rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ ok: false, message: "Invalid product id" });
    }

    const cleanRating = Number(rating);
    if (!cleanRating || cleanRating < 1 || cleanRating > 5) {
      return res.status(400).json({ ok: false, message: "Rating must be between 1 and 5" });
    }

    const product = await Product.findById(productId);
    if (!product || product.isActive === false) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    const existing = await Review.findOne({ userId, productId });
    if (existing) {
      return res.status(400).json({ ok: false, message: "You already reviewed this product" });
    }

    // ✅ delivered order check
    const deliveredOrder = await Order.findOne({
      userId,
      status: "DELIVERED",
      "items.productId": productId,
    });

    const review = await Review.create({
      userId,
      productId,
      orderId: deliveredOrder?._id || null,
      name: req.user?.name || "Customer",
      rating: cleanRating,
      comment: String(comment || "").trim(),
      isVerifiedPurchase: !!deliveredOrder,
      status: "approved",
    });

    await updateProductRating(productId);

    res.status(201).json({
      ok: true,
      message: "Review added successfully",
      review,
    });
  })
);

/**
 * PUT /api/reviews/:id
 * user can edit own review
 */
router.put(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid review id" });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ ok: false, message: "Review not found" });
    }

    if (String(review.userId) !== String(req.userId)) {
      return res.status(403).json({ ok: false, message: "Not allowed" });
    }

    const cleanRating = Number(rating);
    if (!cleanRating || cleanRating < 1 || cleanRating > 5) {
      return res.status(400).json({ ok: false, message: "Rating must be between 1 and 5" });
    }

    review.rating = cleanRating;
    review.comment = String(comment || "").trim();
    await review.save();

    await updateProductRating(review.productId);

    res.json({
      ok: true,
      message: "Review updated successfully",
      review,
    });
  })
);

/**
 * DELETE /api/reviews/:id
 * user can delete own review
 */
router.delete(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid review id" });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ ok: false, message: "Review not found" });
    }

    if (String(review.userId) !== String(req.userId)) {
      return res.status(403).json({ ok: false, message: "Not allowed" });
    }

    const productId = String(review.productId);
    await review.deleteOne();
    await updateProductRating(productId);

    res.json({ ok: true, message: "Review deleted successfully" });
  })
);

export default router;