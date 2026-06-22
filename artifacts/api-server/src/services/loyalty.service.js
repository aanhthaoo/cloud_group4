const { db } = require("../config/firebase");
const {
  findContactByEmail,
  createContactForUser,
  updateContactLoyalty,
} = require("./bitrix.service");

function calculatePoints(amount) {
  return Math.floor(Number(amount || 0) / 10000);
}

function calculateTier(totalSpent) {
  const spent = Number(totalSpent || 0);

  if (spent >= 10000000) return "Diamond";
  if (spent >= 5000000) return "Gold";
  if (spent >= 2000000) return "Silver";

  return "Member";
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

async function applyLoyaltyAfterPayment(uid, paidAmount) {
  const userRef = db.collection("users").doc(uid);

  let result = null;

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error("Không tìm thấy người dùng để cộng điểm");
    }

    const user = userDoc.data();

    const oldLoyalty = user.loyalty || {
      tier: "Member",
      points: 0,
      totalSpent: 0,
    };

    const pointsAdded = calculatePoints(paidAmount);
    const newTotalSpent =
      Number(oldLoyalty.totalSpent || 0) + Number(paidAmount || 0);
    const newPoints = Number(oldLoyalty.points || 0) + pointsAdded;

    const oldTier = oldLoyalty.tier || "Member";
    const newTier = calculateTier(newTotalSpent);

    const newLoyalty = {
      points: newPoints,
      totalSpent: newTotalSpent,
      tier: newTier,
    };

    transaction.update(userRef, {
      loyalty: newLoyalty,
      updatedAt: new Date(),
    });

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
    };
  });

  const userSnap = await userRef.get();

  const latestUser = {
    uid,
    ...userSnap.data(),
  };

  const bitrixContactId = await ensureBitrixContact(userRef, latestUser);

  if (bitrixContactId) {
    await updateContactLoyalty(bitrixContactId, result.loyalty);
  }

  return {
    ...result,
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
};