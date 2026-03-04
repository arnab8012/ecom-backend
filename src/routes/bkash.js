import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const BASE = process.env.BKASH_BASE_URL;
const USERNAME = process.env.BKASH_USERNAME;
const PASSWORD = process.env.BKASH_PASSWORD;
const APP_KEY = process.env.BKASH_APP_KEY;
const APP_SECRET = process.env.BKASH_APP_SECRET;

// ✅ Simple token cache (prod এ Redis/DB better)
let tokenCache = { idToken: "", refreshToken: "", expiresAt: 0 };

function envOk() {
  return BASE && USERNAME && PASSWORD && APP_KEY && APP_SECRET;
}

async function bkashFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

async function grantToken() {
  const { ok, data } = await bkashFetch(`/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: { username: USERNAME, password: PASSWORD },
    body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET }),
  });

  if (!ok) return null;

  const idToken = data?.id_token;
  const refreshToken = data?.refresh_token || "";
  const expiresIn = Number(data?.expires_in ?? 3600);

  if (!idToken) return null;

  tokenCache.idToken = idToken;
  tokenCache.refreshToken = refreshToken;
  tokenCache.expiresAt = Date.now() + expiresIn * 1000 - 60_000;
  return idToken;
}

async function refreshToken() {
  if (!tokenCache.refreshToken) return grantToken();

  const { ok, data } = await bkashFetch(`/tokenized/checkout/token/refresh`, {
    method: "POST",
    headers: { username: USERNAME, password: PASSWORD },
    body: JSON.stringify({
      app_key: APP_KEY,
      app_secret: APP_SECRET,
      refresh_token: tokenCache.refreshToken,
    }),
  });

  if (!ok) return null;

  const idToken = data?.id_token;
  const refreshToken = data?.refresh_token || tokenCache.refreshToken;
  const expiresIn = Number(data?.expires_in ?? 3600);

  if (!idToken) return grantToken();

  tokenCache.idToken = idToken;
  tokenCache.refreshToken = refreshToken;
  tokenCache.expiresAt = Date.now() + expiresIn * 1000 - 60_000;
  return idToken;
}

async function getIdToken() {
  if (tokenCache.idToken && Date.now() < tokenCache.expiresAt) return tokenCache.idToken;
  return (await refreshToken()) || (await grantToken());
}

// ✅ Create payment
router.post(
  "/create",
  auth,
  asyncHandler(async (req, res) => {
    if (!envOk()) {
      return res.status(500).json({ ok: false, message: "bKash env missing" });
    }

    const { orderId } = req.body;

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    if (order.paymentMethod !== "FULL_PAYMENT") {
      return res.status(400).json({ ok: false, message: "Not FULL_PAYMENT order" });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ ok: false, message: "Already PAID" });
    }

    const idToken = await getIdToken();
    if (!idToken) return res.status(500).json({ ok: false, message: "Token error" });

    const body = {
      mode: "0011",
      amount: String(order.total),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: String(order._id),
      callbackURL: "https://thecuriousempire.com/checkout", // required field (dummy ok)
    };

    const resp = await bkashFetch(`/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        Authorization: idToken,
        "X-App-Key": APP_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      return res.status(500).json({ ok: false, message: "bKash create failed", bkash: resp });
    }

    if (resp.data?.paymentID) {
      order.bkash.paymentID = resp.data.paymentID;
      await order.save();
    }

    return res.json(resp.data);
  })
);

// ✅ Execute payment (success হলে stock decrement + PAID)
router.post(
  "/execute",
  auth,
  asyncHandler(async (req, res) => {
    if (!envOk()) {
      return res.status(500).json({ ok: false, message: "bKash env missing" });
    }

    const { orderId, paymentID } = req.body;

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    if (order.paymentMethod !== "FULL_PAYMENT") {
      return res.status(400).json({ ok: false, message: "Not FULL_PAYMENT order" });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ ok: false, message: "Already PAID" });
    }

    const idToken = await getIdToken();
    if (!idToken) return res.status(500).json({ ok: false, message: "Token error" });

    const resp = await bkashFetch(`/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        Authorization: idToken,
        "X-App-Key": APP_KEY,
      },
      body: JSON.stringify({ paymentID }),
    });

    if (!resp.ok) {
      return res.status(500).json({ ok: false, message: "bKash execute failed", bkash: resp });
    }

    const exec = resp.data;

    if (exec?.statusCode === "0000") {
      // ✅ payment success → now decrement stock (variant-based)
      for (const it of order.items) {
        const qty = Math.max(1, Number(it.qty || 1));
        const variantName = String(it.variant || "");

        const r = await Product.updateOne(
          {
            _id: it.productId,
            isActive: true,
            "variants.name": variantName,
            "variants.stock": { $gte: qty },
          },
          { $inc: { "variants.$.stock": -qty } }
        );

        if (r.modifiedCount !== 1) {
          // Payment success but stock out now (rare)
          return res.status(409).json({
            ok: false,
            message: "Payment success but stock out now. Please contact support.",
            exec,
          });
        }
      }

      order.paymentStatus = "PAID";
      order.paidAt = new Date();
      order.bkash.paymentID = paymentID || order.bkash.paymentID;
      order.bkash.trxID = exec?.trxID || exec?.transactionId || "";
      await order.save();
    }

    return res.json(exec);
  })
);
// =========================
// ✅ DEMO MODE (No credential needed)
// =========================

// ✅ DEMO create: orderId দিলে fake paymentID তৈরি করে order এ save করবে
router.post(
  "/demo-create",
  auth,
  asyncHandler(async (req, res) => {
    const { orderId } = req.body;

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    if (order.paymentMethod !== "FULL_PAYMENT") {
      return res.status(400).json({ ok: false, message: "Not FULL_PAYMENT order" });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ ok: false, message: "Already PAID" });
    }

    const paymentID = `DEMO_${Date.now()}`;
    order.bkash = order.bkash || {};
    order.bkash.paymentID = paymentID;
    await order.save();

    return res.json({ statusCode: "0000", paymentID });
  })
);

// ✅ DEMO execute: payment success ধরে নিয়ে stock decrement + order PAID করবে
router.post(
  "/demo-execute",
  auth,
  asyncHandler(async (req, res) => {
    const { orderId } = req.body;

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    if (order.paymentMethod !== "FULL_PAYMENT") {
      return res.status(400).json({ ok: false, message: "Not FULL_PAYMENT order" });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ ok: false, message: "Already PAID" });
    }

    // ✅ payment success → now decrement stock
    for (const it of order.items) {
      const qty = Math.max(1, Number(it.qty || 1));
      const variantName = String(it.variant || "");

      const r = await Product.updateOne(
        {
          _id: it.productId,
          isActive: true,
          "variants.name": variantName,
          "variants.stock": { $gte: qty },
        },
        { $inc: { "variants.$.stock": -qty, soldCount: qty } }
      );

      if (r.modifiedCount !== 1) {
        return res.status(409).json({
          ok: false,
          message: "Payment success but stock out now. Please contact support.",
        });
      }
    }

    const trxID = `DEMO_TRX_${Date.now()}`;

    order.paymentStatus = "PAID";
    order.paidAt = new Date();
    order.bkash = order.bkash || {};
    order.bkash.trxID = trxID;
    await order.save();

    return res.json({ statusCode: "0000", trxID });
  })
);
export default router;