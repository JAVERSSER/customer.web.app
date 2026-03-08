// src/pages/CartPage.jsx
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Button, QtyControl, toast } from "../components/UI";
import { placeOrder as placeOrderFS, fetchActivePromos, updateOrderItems as updateOrderItemsFS, incrementPromoUsage } from "../services/firestoreService";

// Merge new cart items into existing order items, combining quantities by name
function mergeOrderItems(existing, incoming) {
  const map = {};
  existing.forEach(i => { map[i.name] = { ...i }; });
  incoming.forEach(i => {
    if (map[i.name]) {
      map[i.name] = { ...map[i.name], qty: map[i.name].qty + i.qty };
    } else {
      map[i.name] = { ...i };
    }
  });
  return Object.values(map);
}

export default function CartPage({ setPage, onOrderPlaced, existingOrders = [] }) {
  const { cart, addItem, removeItem, clearCart, total, itemCount } = useCart();
  const { user } = useAuth();
  const [address, setAddress] = useState(user?.address || "St. 271, Phnom Penh");
  const [note, setNote]       = useState("");
  const [promo, setPromo]     = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError]     = useState("");
  const [placing, setPlacing] = useState(false);
  const [step, setStep]       = useState("cart"); // cart | success
  const [combined, setCombined] = useState(false);
  const [promos, setPromos]   = useState([]);

  // Load active promo codes from Firestore once on mount
  useEffect(() => {
    fetchActivePromos().then(setPromos).catch(() => {});
  }, []);

  const deliveryFee = 1.5;

  const discount = appliedPromo
    ? appliedPromo.type === "percent"      ? total * appliedPromo.value / 100
    : appliedPromo.type === "fixed"        ? appliedPromo.value
    : appliedPromo.type === "free_delivery" ? deliveryFee
    : 0
    : 0;
  const finalTotal = total + deliveryFee - discount;

  const applyPromo = () => {
    setPromoError("");
    const code  = promo.toUpperCase().trim();
    const found = promos.find(p => p.code === code && p.active);
    if (!found) { setPromoError("Invalid or expired promo code"); return; }
    if (found.expiry && new Date(found.expiry) < new Date()) { setPromoError("This promo code has expired"); return; }
    if (found.maxUse > 0 && (found.used || 0) >= found.maxUse) { setPromoError("This promo code has reached its maximum uses"); return; }
    if (total < (found.minOrder || 0)) { setPromoError(`Minimum order $${found.minOrder} required`); return; }
    setAppliedPromo(found);
    toast(`Promo "${found.code}" applied!`, "success");
    setPromo("");
  };

  const placeOrder = async () => {
    if (!address.trim()) { toast("Please enter a delivery address", "error"); return; }
    setPlacing(true);
    try {
      const cartItems = cart.items.map(i => ({ name: i.name, qty: i.qty, price: i.price, emoji: i.emoji || "" }));

      // Check for an existing active order from the same shop that can be combined
      const combinable = existingOrders.find(o =>
        o.shopId === cart.shopId &&
        ["pending", "confirmed", "preparing"].includes(o.status)
      );

      if (combinable) {
        // Merge items — combine quantities for same item name, append new ones
        const mergedItems  = mergeOrderItems(combinable.items || [], cartItems);
        const newSubtotal  = mergedItems.reduce((s, i) => s + i.price * i.qty, 0);
        const newDiscount  = appliedPromo
          ? appliedPromo.type === "percent"       ? newSubtotal * appliedPromo.value / 100
          : appliedPromo.type === "fixed"         ? appliedPromo.value
          : appliedPromo.type === "free_delivery" ? deliveryFee
          : 0 : 0;
        const newTotal = newSubtotal + deliveryFee - newDiscount;

        await updateOrderItemsFS(combinable.id, mergedItems, newSubtotal, newTotal);
        if (appliedPromo?.id) incrementPromoUsage(appliedPromo.id).catch(() => {});

        clearCart();
        onOrderPlaced({ ...combinable, items: mergedItems, subtotal: newSubtotal, total: newTotal });
        setCombined(true);
        setStep("success");
        setTimeout(() => { setPage("orders"); }, 3500);
        return;
      }

      // No combinable order — create a new one
      const orderData = {
        shopId: cart.shopId, shopName: cart.shopName, shopEmoji: cart.shopEmoji,
        shopAddress: "",
        items: cartItems,
        subtotal: total, deliveryFee, discount, total: finalTotal,
        customerId:    user?.uid || "demo-cust-001",
        customer:      user?.name || "Customer",
        customerName:  user?.name || "Customer",
        customerPhone: user?.phone || "",
        address,
        deliveryAddress: address,
        note, promo: appliedPromo?.code || null,
        distance: "~1.5 km", estimatedTime: "~15 min",
        payment: "Cash on delivery",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };

      const firestoreId = await placeOrderFS(orderData);
      if (appliedPromo?.id) incrementPromoUsage(appliedPromo.id).catch(() => {});
      clearCart();
      onOrderPlaced({ ...orderData, id: firestoreId, status: "pending", riderName: null });
      setCombined(false);
      setStep("success");
      setTimeout(() => { setPage("orders"); }, 3500);
    } catch (err) {
      console.error("Failed to place order:", err);
      toast("Failed to place order. Please try again.", "error");
    } finally {
      setPlacing(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-7xl mb-4">{combined ? "🛒" : "🎉"}</div>
        <h2 className="text-2xl font-black text-gray-900 font-display">{combined ? "Items Added!" : "Order Placed!"}</h2>
        <p className="text-gray-500 mt-2">
          {combined
            ? "Your items have been added to your existing order."
            : <>We're confirming your order now.<br />You'll get an update soon!</>}
        </p>
        <div className="mt-6 bg-white rounded-3xl p-5 shadow-lg w-full max-w-xs">
          <div className="text-sm font-bold text-gray-800">Redirecting to your orders...</div>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full animate-pulse w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-gray-800">Your cart is empty</h2>
        <p className="text-gray-500 text-sm mt-2">Add some delicious food to get started!</p>
        <Button variant="primary" size="lg" className="mt-6" onClick={() => setPage("home")}>Browse Restaurants →</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-4 pt-10 pb-4 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => setPage("home")} className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center text-white text-base">←</button>
          <div>
            <h2 className="font-black text-white text-lg">Your Cart</h2>
            <p className="text-xs text-white/70">{cart.shopEmoji} {cart.shopName} · {itemCount} items</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Cart items */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">Order Items</h3>
          </div>
          {cart.items.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <div className="text-2xl">{item.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{item.name}</div>
                <div className="text-xs text-orange-500 font-bold">${item.price.toFixed(2)} each</div>
              </div>
              <div className="flex items-center gap-2">
                <QtyControl qty={item.qty} onAdd={() => addItem(cart.shopId, cart.shopName, cart.shopEmoji, item)} onRemove={() => removeItem(item.id)} size="sm" />
                <span className="text-sm font-bold text-gray-800 w-12 text-right">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-3">📍 Delivery Address</h3>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            rows={2}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none"
            placeholder="Enter your delivery address..."
          />
        </div>

        {/* Note */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-3">📝 Order Note (optional)</h3>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            placeholder="Special requests, allergies..."
          />
        </div>

        {/* Promo code */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-3">🏷️ Promo Code</h3>
          {appliedPromo ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl px-4 py-2.5">
              <span className="text-sm font-bold text-green-700">✅ {appliedPromo.code} — {appliedPromo.label}</span>
              <button onClick={() => setAppliedPromo(null)} className="text-red-400 text-sm hover:text-red-600">✕</button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={promo}
                  onChange={e => { setPromo(e.target.value); setPromoError(""); }}
                  placeholder="WELCOME10 / FREEDEL / SAVE2"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 uppercase font-mono tracking-wide transition-all"
                />
                <Button variant="secondary" onClick={applyPromo} size="md">Apply</Button>
              </div>
              {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
            </>
          )}
        </div>

        {/* Price summary */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-2.5">
          <h3 className="font-bold text-gray-800 text-sm mb-1">💰 Price Summary</h3>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span className="font-semibold">${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Delivery fee</span><span className="font-semibold">${deliveryFee.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({appliedPromo?.code})</span><span className="font-semibold">−${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2.5 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-black text-orange-500 text-lg">${finalTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Place order button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-bottom max-w-md mx-auto">
        <Button size="xl" className="w-full" loading={placing} onClick={placeOrder}>
          {placing ? "Placing Order..." : `Place Order · $${finalTotal.toFixed(2)}`}
        </Button>
        <p className="text-center text-[11px] text-gray-400 mt-2">💳 Cash on delivery · Secure checkout</p>
      </div>
    </div>
  );
}