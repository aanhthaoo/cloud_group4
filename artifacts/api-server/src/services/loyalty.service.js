const { db } = require("../config/firebase");
const {
  findContactByEmail,
  createContactForUser,
  updateContactLoyalty,
} = require("./bitrix.service");

function calculatePoints(amount) {
  return Math.floor(Number(amount || 0) / 10000);
}

function calculateTier(lifetimePoints) {
  const points = Number(lifetimePoints || 0);

  if (points >= 5000) return "VIP";
  if (points >= 1000) return "Gold";

  return "Member";
}

function getTierBenefit(tier) {
  if (tier === "VIP") return { discountPercent: 10 };
  if (tier === "Gold") return { discountPercent: 5 };
  return { discountPercent: 0 };
}

async function ensureBitrixContact(userRef, user) {
  if (user.bitrixContactId) {
    return user.bitrixContactId;
  }

  const existingContact = await findContactByEmail(user.email);

  if (existingContact?.ID) {
    await userRef.update({
      bitrixContactId: String(existingContact.ID),
    });

    return String(existingContact.ID);
  }

  const newContactId = await createContactForUser(user);

  if (newContactId) {
    await userRef.update({
      bitrixContactId: String(newContactId),
    });
  }

  return newContactId ? String(newContactId) : null;
}

async function applyLoyaltyAfterPayment(uid, paidAmount, options = {}) {
  console.log(`\n  [LOYALTY] applyLoyaltyAfterPayment: uid=${uid}, paidAmount=${paidAmount}`);

  const userRef = db.collection("users").doc(uid);
  const eventId = options.eventId ? String(options.eventId) : null;
  const eventRef = eventId ? db.collection("loyalty_events").doc(eventId) : null;

  let result = null;

  try {
    if (eventRef) {
      const eventDoc = await eventRef.get();
      if (eventDoc.exists) {
        console.log(`  [LOYALTY] Event ${eventId} đã xử lý trước đó, bỏ qua.`);
        result = {
          ...eventDoc.data().result,
          alreadyProcessed: true,
        };
      }
    }

    if (!result) {
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error("Không tìm thấy người dùng để cộng điểm");
      }

      const user = userDoc.data();
      console.log(`  [LOYALTY] User hiện tại: loyalty=${JSON.stringify(user.loyalty)}`);

      const oldLoyalty = user.loyalty || {
        tier: "Member",
        points: 0,
        lifetimePoints: 0,
        totalSpent: 0,
        discountPercent: 0,
      };

      const pointsAdded = calculatePoints(paidAmount);
      const newTotalSpent =
        Number(oldLoyalty.totalSpent || 0) + Number(paidAmount || 0);
      const oldLifetimePoints = Number(
        oldLoyalty.lifetimePoints ?? oldLoyalty.points ?? 0
      );
      const newLifetimePoints = oldLifetimePoints + pointsAdded;

      const oldTier = oldLoyalty.tier || "Member";
      const newTier = calculateTier(newLifetimePoints);

      console.log(`  [LOYALTY] Tính điểm: paidAmount=${paidAmount} -> +${pointsAdded} điểm | ${oldLifetimePoints} -> ${newLifetimePoints} | tier: ${oldTier} -> ${newTier}`);

      const newLoyalty = {
        points: newLifetimePoints,
        lifetimePoints: newLifetimePoints,
        totalSpent: newTotalSpent,
        tier: newTier,
        discountPercent: getTierBenefit(newTier).discountPercent,
        updatedAt: new Date(),
      };

      await userRef.update({
        loyalty: newLoyalty,
        updatedAt: new Date(),
      });
      console.log(`  [LOYALTY] Đã ghi loyalty mới vào Firestore (không dùng transaction)`);

      result = {
        user: {
          uid,
          ...user,
        },
        oldTier,
        newTier,
        pointsAdded,
        loyalty: newLoyalty,
        isTierUpgraded: oldTier !== newTier,
        alreadyProcessed: false,
        source: options.source || null,
        sourceId: options.sourceId || null,
      };

      if (eventRef) {
        await eventRef.set({
          eventId,
          uid,
          paidAmount: Number(paidAmount || 0),
          source: options.source || null,
          sourceId: options.sourceId || null,
          payload: options.payload || null,
          result,
          createdAt: new Date(),
        });
      }
    }
  } catch (txError) {
    console.error(`  [LOYALTY] Lỗi cập nhật điểm nội bộ:`, txError);
    throw txError;
  }

  if (result?.alreadyProcessed) {
    return result;
  }

  const userSnap = await userRef.get();
  console.log(`  [LOYALTY] Firestore loyalty sau transaction: ${JSON.stringify(userSnap.data()?.loyalty)}`);

  const latestUser = {
    uid,
    ...userSnap.data(),
  };

  let bitrixContactId = null;
  let bitrixSyncError = null;

  try {
    console.log(`  [LOYALTY] Bắt đầu đồng bộ Bitrix24...`);
    bitrixContactId = await ensureBitrixContact(userRef, latestUser);
    console.log(`  [LOYALTY] bitrixContactId=${bitrixContactId}`);

    if (bitrixContactId) {
      await updateContactLoyalty(bitrixContactId, result.loyalty);
      console.log(`  [LOYALTY] Đồng bộ Bitrix24 thành công`);
    } else {
      console.warn(`  [LOYALTY] Không tìm được bitrixContactId, bỏ qua sync Bitrix`);
    }
  } catch (error) {
    bitrixSyncError = error.message;
    console.error("  [LOYALTY] Bitrix sync failed:", error.message);
  }

  return {
    ...result,
    bitrixSyncError,
    user: {
      ...latestUser,
      bitrixContactId,
    },
  };
}

module.exports = {
  applyLoyaltyAfterPayment,
  calculatePoints,
  calculateTier,
  getTierBenefit,
};
