import cloudinary from "../utils/cloudinary.js";

const uploadOne = async (file, folder) => {
  if (file?.buffer) {
    const base64 = file.buffer.toString("base64");
    const dataUri = `data:${file.mimetype};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, { folder });
    return { url: result.secure_url, public_id: result.public_id };
  }

  if (file?.path) {
    const result = await cloudinary.uploader.upload(file.path, { folder });
    return { url: result.secure_url, public_id: result.public_id };
  }

  throw new Error("Invalid file input");
};

export const uploadProductImages = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ ok: false, message: "No files" });

    const out = [];
    for (const f of files) {
      out.push(await uploadOne(f, "ecom/products"));
    }

    // ✅ for product: keep only urls if you want, but returning objects is useful
    return res.json({
      ok: true,
      images: out.map((x) => x.url),
      assets: out // [{url, public_id}]
    });
  } catch (e) {
    console.log("❌ uploadProductImages error:", e);
    return res.status(500).json({ ok: false, message: e?.message || "Upload failed" });
  }
};

export const uploadBannerImages = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ ok: false, message: "No files" });

    const out = [];
    for (const f of files) {
      out.push(await uploadOne(f, "ecom/banners"));
    }

    return res.json({ ok: true, banners: out }); // [{url, public_id}]
  } catch (e) {
    console.log("❌ uploadBannerImages error:", e);
    return res.status(500).json({ ok: false, message: e?.message || "Upload failed" });
  }
};
// ✅ Category icon upload (single image)
export const uploadCategoryIcon = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, message: "No file" });
    }

    // 🔥 SAME helper as product/banner
    const out = await uploadOne(file, "ecom/categories");

    // 🔁 same response style
    return res.json({
      ok: true,
      icon: out, // { url, public_id }
    });
  } catch (e) {
    console.log("❌ uploadCategoryIcon error:", e);
    return res.status(500).json({
      ok: false,
      message: e?.message || "Upload failed",
    });
  }
};
