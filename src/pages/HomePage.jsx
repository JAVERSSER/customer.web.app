// src/pages/HomePage.jsx
// Single-shop mode: all data (shop info + menu items) comes from Firestore in real-time.
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { QtyControl, toast } from "../components/UI";
import { subscribeShopSettings, subscribeShopMenu } from "../services/firestoreService";

// ── NOTIFICATION PANEL ────────────────────────────────────────────────────────
function NotificationPanel({ notifications, onClose, onOrderClick, onMarkAllRead }) {
  const unread = notifications.filter(n => !n.isRead);
  return (
    <div className="fixed inset-0 z-[150]" onClick={onClose}>
      <div
        className="absolute top-20 right-4 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-bold text-gray-900 text-sm">Notifications</span>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-orange-500 font-semibold hover:text-orange-600 transition-colors"
              >
                Mark all read
              </button>
            )}
            {unread.length === 0 && notifications.length > 0 && (
              <span className="text-xs text-gray-400">All read</span>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <div className="text-3xl mb-2">🔔</div>
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <button
                key={n.id}
                onClick={() => { if (n.data?.orderId) { onOrderClick(n.data.orderId); onClose(); } }}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-orange-50 active:bg-orange-100 transition-colors ${!n.isRead ? "bg-orange-50/50" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {n.data?.status === "cancelled" ? "❌" : n.data?.status === "delivered" ? "🎉" : "📦"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${!n.isRead ? "text-gray-900" : "text-gray-600"}`}>{n.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />}
                </div>
              </button>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 text-center">
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
// The shop is now a single entity configured in the Admin Panel (settings/default).
// Menu items come from the Admin's menuItems collection (available:true only).
export default function HomePage({ setPage, notifications = [], onNotifClick, onMarkAllRead }) {
  const { user } = useAuth();
  const { itemCount, total, addItem, removeItem, getQty } = useCart();

  const [shop, setShop]           = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch]       = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [notifOpen, setNotifOpen] = useState(false);

  // Real-time shop settings (name, emoji, isOpen, deliveryFee, etc.)
  useEffect(() => {
    const unsub = subscribeShopSettings(setShop);
    return unsub;
  }, []);

  // Real-time menu items (admin controls availability)
  useEffect(() => {
    const unsub = subscribeShopMenu(setMenuItems);
    return unsub;
  }, []);

  // Derive category list from actual menu items
  const categories = useMemo(() => {
    const cats = [...new Set(menuItems.map(i => i.category).filter(Boolean))].sort();
    return ["All", ...cats];
  }, [menuItems]);

  // Filter by search + category
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return menuItems.filter(item => {
      const matchSearch = !q || item.name?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      const matchCat    = activeCategory === "All" || item.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [menuItems, search, activeCategory]);

  // Single shop identifiers — all orders go to the same shop
  const shopId    = "default-shop";
  const shopName  = shop?.name    || "FoodDash Kitchen";
  const shopEmoji = shop?.emoji   || "🍔";
  const isOpen    = shop?.isOpen  !== false; // defaults to open until set otherwise
  const deliveryFee = Number(shop?.deliveryFee || 1.5).toFixed(2);

  const handleAdd = (item) => {
    if (!isOpen) { toast("Sorry, the shop is currently closed", "error"); return; }
    addItem(shopId, shopName, shopEmoji, { ...item, desc: item.description || "" });
  };

  const handleNotifClick = (orderId) => {
    setPage("orders");
    if (onNotifClick) onNotifClick(orderId);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Notification panel overlay */}
      {notifOpen && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setNotifOpen(false)}
          onOrderClick={handleNotifClick}
          onMarkAllRead={() => { if (onMarkAllRead) onMarkAllRead(); }}
        />
      )}

      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-4 safe-top border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 font-medium">📍 Delivering to</p>
            <h2 className="text-sm font-bold text-gray-900 mt-0.5">St. 271, Phnom Penh ▾</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="relative w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-base"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.avatar || user?.name?.[0] || "?"}
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="mb-4">
          <h1 className="text-2xl font-black text-gray-900 font-display leading-tight">
            Hey {user?.name?.split(" ")[0] || "there"} 👋<br />
            <span className="text-orange-500">What's for today?</span>
          </h1>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveCategory("All"); }}
            placeholder="Search food or category..."
            className="w-full bg-gray-100 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all"
          />
        </div>
      </div>

      {/* Shop banner — info from Admin settings */}
      <div className={`px-4 py-4 flex items-center gap-4 ${isOpen ? "bg-gradient-to-r from-orange-500 to-amber-500" : "bg-gray-700"}`}>
        <div className="text-5xl">{shopEmoji}</div>
        <div className="flex-1">
          <h2 className="font-black text-white text-lg font-display leading-tight">{shopName}</h2>
          <div className="flex items-center gap-3 text-white/80 text-xs mt-0.5 flex-wrap">
            <span className="font-semibold">{isOpen ? "🟢 Open Now" : "🔴 Closed"}</span>
            {shop?.deliveryTime && <span>⏱ {shop.deliveryTime} min</span>}
            <span>🛵 ${deliveryFee} delivery</span>
            {shop?.address && <span>📍 {shop.address}</span>}
          </div>
          {shop?.description && (
            <p className="text-white/70 text-xs mt-1 line-clamp-1">{shop.description}</p>
          )}
        </div>
        {shop?.rating && (
          <div className="text-center flex-shrink-0">
            <div className="text-white font-black text-xl">★ {shop.rating}</div>
            {shop.reviewCount && <div className="text-white/70 text-[10px]">{shop.reviewCount} reviews</div>}
          </div>
        )}
      </div>

      {/* Category tabs — derived from real menu items */}
      {categories.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-white border-b border-gray-100">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === cat ? "bg-orange-500 text-white shadow-sm" : "bg-gray-100 text-gray-600"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Menu items — directly from Firestore via Admin Panel */}
      <div className="flex-1 px-4 py-4 pb-32">
        {/* Loading state */}
        {menuItems.length === 0 && shop === null && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3 animate-pulse">🍔</div>
            <div className="font-semibold">Loading menu...</div>
          </div>
        )}

        {/* Empty menu */}
        {menuItems.length === 0 && shop !== null && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🍽️</div>
            <div className="font-semibold">No menu items yet</div>
            <div className="text-sm mt-1">The admin is setting up the menu</div>
          </div>
        )}

        {/* No search results */}
        {menuItems.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-semibold">No items found</div>
            <div className="text-sm mt-1">Try a different search or category</div>
          </div>
        )}

        {/* Item list */}
        <div className="space-y-3">
          {filtered.map(item => {
            const qty = getQty(item.id);
            return (
              <div key={item.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    : (item.emoji || "🍽️")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900 truncate">{item.name}</span>
                  </div>
                  <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wide mt-0.5">{item.category}</div>
                  {item.description && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                  <span className="text-sm font-bold text-orange-500 mt-1 block">
                    ${Number(item.price || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  {!isOpen ? (
                    <span className="text-xs text-gray-400 font-medium">Closed</span>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => handleAdd(item)}
                      className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-orange-200 hover:bg-orange-600 active:scale-90 transition-all"
                    >
                      +
                    </button>
                  ) : (
                    <QtyControl
                      qty={qty}
                      onAdd={() => handleAdd(item)}
                      onRemove={() => removeItem(item.id)}
                      size="sm"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-30 max-w-md mx-auto">
          <button
            onClick={() => setPage("cart")}
            className="w-full bg-gray-900 text-white rounded-2xl px-4 py-3.5 flex items-center justify-between font-bold shadow-2xl active:scale-[0.98] transition-all"
          >
            <span className="bg-orange-500 rounded-xl px-2.5 py-1 text-sm">{itemCount} items</span>
            <span>View Cart · {shopEmoji} {shopName}</span>
            <span className="text-orange-400">${total.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
