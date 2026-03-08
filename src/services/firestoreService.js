// src/services/firestoreService.js
// Customer-side Firestore operations

import {
  collection, doc, addDoc, onSnapshot, updateDoc, increment,
  query, where, serverTimestamp, getDocs, Timestamp, limit,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Cancel an order (customer-initiated) ──────────────────────────────────────
export const cancelOrder = async (orderId) => {
  await updateDoc(doc(db, "orders", orderId), {
    status: "cancelled",
    cancelReason: "Cancelled by customer",
    updatedAt: serverTimestamp(),
  });
};

// ── Merge new items into an existing active order ─────────────────────────────
export const updateOrderItems = async (orderId, items, subtotal, total) => {
  await updateDoc(doc(db, "orders", orderId), {
    items, subtotal, total,
    updatedAt: serverTimestamp(),
  });
};

// ── Generate a unique 6-digit order number ────────────────────────────────────
const generateUniqueOrderNumber = async () => {
  for (let i = 0; i < 10; i++) {
    const num = Math.floor(100000 + Math.random() * 900000); // 100000–999999
    const snap = await getDocs(
      query(collection(db, "orders"), where("orderNumber", "==", num), limit(1))
    );
    if (snap.empty) return num;
  }
  // Fallback: 8-digit number (virtually no collision risk)
  return Math.floor(10000000 + Math.random() * 90000000);
};

// ── Place a new order ─────────────────────────────────────────────────────────
// Writes the full order document that all 3 apps read from.
export const placeOrder = async (orderData) => {
  const orderNumber = await generateUniqueOrderNumber();
  const ref = await addDoc(collection(db, "orders"), {
    ...orderData,
    orderNumber,
    status:    "pending",
    riderId:   null,
    riderName: null,
    riderAccepted: false,
    deliveryStep:  null,
    placedAt:  Date.now(),          // plain ms number — always readable, no Timestamp issues
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id; // Firestore-generated order ID
};

// ── Subscribe to this customer's orders in real-time ─────────────────────────
// Single-field query (no composite index required). Sorted in JS.
const toMs = (o) => {
  if (o.placedAt && typeof o.placedAt === "number") return o.placedAt;  // plain Date.now()
  const t = o.createdAt;
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  return 0;
};

export const subscribeCustomerOrders = (customerId, callback) => {
  const q = query(collection(db, "orders"), where("customerId", "==", customerId));
  return onSnapshot(q, (snap) => {
    const orders = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => toMs(b) - toMs(a));
    callback(orders);
  });
};

// ── Subscribe to shop settings (name, emoji, isOpen, deliveryFee …) ──────────
// Real-time listener on settings/default — updated by Admin Panel instantly.
export const subscribeShopSettings = (callback) => {
  return onSnapshot(doc(db, "settings", "default"), (snap) => {
    if (snap.exists()) callback({ id: "default", ...snap.data() });
  });
};

// ── Subscribe to available menu items ─────────────────────────────────────────
// Returns only items the admin has marked available:true in the menuItems collection.
export const subscribeShopMenu = (callback) => {
  const q = query(collection(db, "menuItems"), where("available", "==", true));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// ── Subscribe to a rider's live GPS location ──────────────────────────────────
// Listens to riders/{riderId} document for lat/lng updates.
export const subscribeRiderLocation = (riderId, callback) => {
  return onSnapshot(doc(db, "riders", riderId), (snap) => {
    if (snap.exists()) {
      const { lat, lng } = snap.data();
      if (lat && lng) callback([lat, lng]);
    }
  });
};

// ── Subscribe to in-app notifications for this user ───────────────────────────
// No orderBy — single-collection query, sorted in JS to avoid index requirements.
export const subscribeUserNotifications = (userId, callback) => {
  const q = query(collection(db, "notifications", userId, "messages"));
  return onSnapshot(q, (snap) => {
    const notifs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    callback(notifs);
  });
};

export const markNotificationRead = async (userId, notifId) => {
  await updateDoc(doc(db, "notifications", userId, "messages", notifId), { isRead: true });
};

export const markAllNotificationsRead = async (userId, notifs) => {
  await Promise.all(
    notifs.filter(n => !n.isRead).map(n =>
      updateDoc(doc(db, "notifications", userId, "messages", n.id), { isRead: true })
    )
  );
};

// ── Submit a review for a delivered order ─────────────────────────────────────
export const submitReview = async (orderId, riderId, rating, comment) => {
  await updateDoc(doc(db, "orders", orderId), {
    review: { rating, comment, createdAt: new Date().toISOString() },
  });
  // Also update rider's rating average (stored as running total for simplicity)
  if (riderId) {
    const riderSnap = await getDocs(query(collection(db, "riders"), where("__name__", "==", riderId)));
    // Just update the order; admin can compute averages from orders
  }
};

// ── Fetch active promo codes from Firestore ───────────────────────────────────
export const fetchActivePromos = async () => {
  const snap = await getDocs(collection(db, "promoCodes"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.active);
};

// ── Increment promo code usage count when an order is placed ─────────────────
export const incrementPromoUsage = async (promoId) => {
  await updateDoc(doc(db, "promoCodes", promoId), { used: increment(1) });
};

// ── Push a notification to any user (used for chat message alerts) ───────────
export const sendNotification = async (uid, title, body, data = {}) => {
  if (!uid) return;
  await addDoc(collection(db, "notifications", uid, "messages"), {
    title, body, data, createdAt: serverTimestamp(), isRead: false,
  });
};

// ── Send a chat message (customer ↔ rider) ────────────────────────────────────
// Stored under orders/{orderId}/chat so Firestore rules that cover orders also cover chat.
// Fire-and-forget: Firestore local cache delivers the message instantly to
// both onSnapshot listeners. No await — never blocks on network round-trip.
// Client Timestamp (not serverTimestamp) so sort works before server confirms.
export const sendMessage = (orderId, senderId, senderRole, senderName, text) => {
  addDoc(collection(db, "orders", orderId, "chat"), {
    senderId, senderRole, senderName, text,
    createdAt: Timestamp.fromDate(new Date()),
  });
};

// ── Subscribe to chat messages for an order ───────────────────────────────────
export const subscribeMessages = (orderId, callback) => {
  const q = collection(db, "orders", orderId, "chat");
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
    callback(msgs);
  });
};
