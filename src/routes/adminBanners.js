import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Banner from "../models/Banner.js";
import cloudinary from "../utils/cloudinary.js";

const router = express.Router();

// ✅ Admin: list all banners
router.get("/", adminAuth, async (req, res) => {
  const banners = await Banner.find().sort({ sort: 1, createdAt: -1 });
  res.json({ ok: true, banners });
});

// ✅ Admin: create many banners (uploaded urls save)
router.post("/", adminAuth, async (req, res) => {
  const { banners } = req.body; // [{url, public_id}]
  if (!Array.isArray(banners) || banners.length === 0) {
    return res.status(400).json({ ok: false, message: "No banners to save" });
  }

  const docs = banners.map((b, i) => ({
    url: b.url,
    public_id: b.public_id || "",
    isActive: true,
    sort: Number(b.sort ?? i),
  }));

  const saved = await Banner.insertMany(docs);
  res.json({ ok: true, banners: saved });
});

// ✅ Admin: delete banner by id
router.delete("/:id", adminAuth, async (req, res) => {
  const b = await Banner.findById(req.params.id);
  if (!b) return res.status(404).json({ ok: false, message: "Not found" });

  await b.deleteOne();
  res.json({ ok: true });
});


// ✅ Save banners in DB
router.post(
  "/banners",
  adminAuth,
  asyncHandler(async (req, res) => {
    const { banners } = req.body; // [{url, public_id}] OR [{url, public_id}] mixed

    if (!Array.isArray(banners) || banners.length === 0) {
      return res.status(400).json({ ok: false, message: "No banners" });
    }

    const cleaned = banners
      .map((b) => ({
        url: String(b?.url || "").trim(),
        public_id: String(b?.public_id || "").trim()
      }))
      .filter((b) => b.url);

    if (cleaned.length === 0) {
      return res.status(400).json({ ok: false, message: "Invalid banners" });
    }

    const docs = await Banner.insertMany(
      cleaned.map((b) => ({
        url: b.url,
        public_id: b.public_id || "link_only",
        isActive: true
      }))
    );

    res.json({ ok: true, banners: docs });
  })
);

// ✅ Delete banner (DB + Cloudinary)
router.delete(
  "/banners/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    const b = await Banner.findById(req.params.id);
    if (!b) return res.status(404).json({ ok: false, message: "Not found" });

    // only delete cloudinary if it was uploaded
    try {
      if (b.public_id && b.public_id !== "link_only") {
        await cloudinary.uploader.destroy(b.public_id);
      }
    } catch (e) {
      console.log("Cloudinary destroy error:", e?.message);
    }

    await b.deleteOne();
    res.json({ ok: true });
  })
);

export default router;
