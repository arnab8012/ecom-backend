const router = require("express").Router();
const Banner = require("../models/Banner");
const { requireAdmin } = require("../middleware/auth");

// Get banners
router.get("/banners", async (req, res) => {
  const b = await Banner.findOne().sort({ createdAt: -1 });
  res.json({ ok: true, banners: b?.images || [] });
});

// Save banners (admin)
router.put("/banners", requireAdmin, async (req, res) => {
  const images = req.body.images || [];
  const b = await Banner.create({ images });
  res.json({ ok: true, banners: b.images });
});

module.exports = router;
