import express from "express";
import Category from "../models/Category.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cats = await Category.find().sort({ createdAt: -1 });
    res.json({ ok: true, categories: cats });
  })
);

export default router;
