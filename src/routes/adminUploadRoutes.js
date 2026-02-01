import { Router } from "express";
import upload from "../middleware/upload.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { uploadProductImages, uploadBannerImages } from "../controllers/uploadController.js";

const router = Router();

// ✅ Product images upload (max 5)
router.post("/product-images", adminAuth, upload.array("images", 5), uploadProductImages);

// ✅ Banner images upload (max 10)
router.post("/banner-images", adminAuth, upload.array("images", 10), uploadBannerImages);

router.post("/upload/product-images", adminAuth, upload.array("images", 5), uploadProductImages);
router.post("/upload/banner-images", adminAuth, upload.array("images", 10), uploadBannerImages);

export default router;
