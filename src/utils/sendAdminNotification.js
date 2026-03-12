import admin from "./firebaseAdmin.js";
import AdminDeviceToken from "../models/AdminDeviceToken.js";

export async function sendAdminNewOrderNotification(order) {
  try {
    const rows = await AdminDeviceToken.find({});
    const tokens = rows.map((r) => r.token).filter(Boolean);

    if (!tokens.length) return;

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
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    const failedTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success) failedTokens.push(tokens[i]);
    });

    if (failedTokens.length) {
      await AdminDeviceToken.deleteMany({ token: { $in: failedTokens } });
    }
  } catch (err) {
    console.error("FCM send error:", err.message);
  }
}