import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

function genOrderNo() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `#${n}`;
}

router.post(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const { items, shipping, paymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "No items" });
    }
    if (
      !shipping ||
      !shipping.fullName ||
      !shipping.phone1 ||
      !shipping.division ||
      !shipping.district ||
      !shipping.upazila ||
      !shipping.addressLine
    ) {
      return res.status(400).json({ ok: false, message: "Shipping info missing" });
    }

    const dbIds = items.map((it) => it.productId);
    const dbProducts = await Product.find({ _id: { $in: dbIds }, isActive: true });

    const itemSnapshots = items.map((it) => {
      const p = dbProducts.find((x) => String(x._id) === String(it.productId));
      if (!p) throw Object.assign(new Error("Invalid product in cart"), { statusCode: 400 });

      const img = Array.isArray(p.images) && p.images.length ? p.images[0] : "";
      const qty = Number(it.qty || 1);
      const price = Number(p.price);

      return {
        productId: p._id,
        title: p.title,
        image: img,
        variant: it.variant || "",
        qty,
        price
      };
    });

    const subTotal = itemSnapshots.reduce((s, it) => s + it.price * it.qty, 0);
    const deliveryCharge = 110;
    const total = subTotal + deliveryCharge;

    const order = await Order.create({
      orderNo: genOrderNo(),
      userId: req.user._id, // ✅ safest
      items: itemSnapshots,
      shipping,
      paymentMethod: paymentMethod === "FULL_PAYMENT" ? "FULL_PAYMENT" : "COD",
      deliveryCharge,
      subTotal,
      total,
      status: "PLACED"
    });

    res.json({ ok: true, order });
  })
);

router.get(
  "/my",
  auth,
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const q = { userId: req.user._id };
    if (status && status !== "ALL") q.status = status;

    const orders = await Order.find(q).sort({ createdAt: -1 });
    res.json({ ok: true, orders });
  })
);

export default router;
