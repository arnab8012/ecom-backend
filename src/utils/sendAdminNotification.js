import admin from "./firebaseAdmin.js";
import AdminDeviceToken from "../models/AdminDeviceToken.js";

export async function sendAdminNewOrderNotification(order) {
  try {
    console.log("[FCM] sendAdminNewOrderNotification called for order:", {
      orderId: String(order?._id || ""),
      orderNo: String(order?.orderNo || ""),
    });

    const rows = await AdminDeviceToken.find({});
    const tokens = rows
      .map((r) => (r.token || "").trim())
      .filter(Boolean);

    console.log("[FCM] Admin device token rows:", rows.length);
    console.log("[FCM] Valid tokens found:", tokens.length);

    if (!tokens.length) {
      console.log("[FCM] No admin device tokens found. Skipping send.");
      return {
        ok: false,
        message: "No admin device tokens found",
        successCount: 0,
        failureCount: 0,
      };
    }

    const message = {
      notification: {
        title: "New Order",
        body: `Order ${order.orderNo || order._id} has been placed`,
      },
      data: {
        type: "new_order",
        orderId: String(order._id),
        orderNo: String(order.orderNo || ""),
      },
      tokens,
      android: {
        priority: "high",
        notification: {
          channelId: "default_channel",
          sound: "default",
        },
      },
    };

    console.log("[FCM] Sending multicast notification...");

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("[FCM] Multicast response:", {
      successCount: response.successCount,
      failureCount: response.failureCount,
      total: tokens.length,
    });

    const failedTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        failedTokens.push(tokens[i]);
        console.error("[FCM] Token send failed:", {
          token: tokens[i],
          error: r.error?.message || "Unknown error",
          code: r.error?.code || "",
        });
      } else {
        console.log("[FCM] Token send success:", tokens[i]);
      }
    });

    if (failedTokens.length) {
      console.log("[FCM] Removing failed tokens:", failedTokens.length);
      await AdminDeviceToken.deleteMany({ token: { $in: failedTokens } });
    }

    return {
      ok: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      removedFailedTokens: failedTokens.length,
    };
  } catch (err) {
    console.error("[FCM] sendAdminNewOrderNotification fatal error:", err?.message || err);
    return {
      ok: false,
      message: err?.message || "Unknown FCM error",
      successCount: 0,
      failureCount: 0,
    };
  }
}