import express from "express";
import Banner from "../models/Banner.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ ok: true, banners });
  })
);
// ✅ Public: active banners list
router.get("/", async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ sort: 1, createdAt: -1 });
  res.json({ ok: true, banners });
});
export default router;
