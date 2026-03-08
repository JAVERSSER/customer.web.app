// src/App.jsx
import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider, toast } from "./components/UI";
import BottomNav from "./components/BottomNav";
import AuthPage    from "./pages/AuthPage";
import HomePage    from "./pages/HomePage";
import CartPage    from "./pages/CartPage";
import OrdersPage  from "./pages/OrdersPage";
import ProfilePage from "./pages/ProfilePage";
import { Spinner } from "./components/UI";
import { subscribeCustomerOrders, subscribeUserNotifications, markNotificationRead, markAllNotificationsRead } from "./services/firestoreService";

// ── Browser notification helper ───────────────────────────────────────────────
function notifyBrowser(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico" });
}

// Human-readable messages for each order status change
const STATUS_MESSAGES = {
  confirmed:      "✅ Your order has been confirmed!",
  preparing:      "👨‍🍳 The kitchen is now preparing your order.",
  rider_assigned: "🛵 A rider has been assigned to your order!",
  delivering:     "🚀 Your order is on the way!",
  delivered:      "🎉 Your order has been delivered. Enjoy!",
  cancelled:      "❌ Your order was cancelled.",
};

function AppInner() {
  const { user, loading } = useAuth();
  const [page, setPage]   = useState("home");
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifOrderId, setNotifOrderId]   = useState(null);
  const [isOffline, setIsOffline]         = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Track previous statuses so we only fire a notification on actual changes
  const prevStatusMap         = useRef({});
  const initialLoadDone       = useRef(false);
  const notifInitialDone      = useRef(false); // skip toasting old notifications on first load
  const seenNotifIds          = useRef(new Set());

  // ── Request browser notification permission once user is logged in ──────────
  useEffect(() => {
    if (!user) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [user]);

  // ── Subscribe to this customer's real orders from Firestore ────────────────
  useEffect(() => {
    if (!user) return;

    initialLoadDone.current = false;

    const unsub = subscribeCustomerOrders(user.uid, (firestoreOrders) => {
      if (!initialLoadDone.current) {
        firestoreOrders.forEach((o) => { prevStatusMap.current[o.id] = o.status; });
        initialLoadDone.current = true;
        setOrders(firestoreOrders);
        return;
      }

      firestoreOrders.forEach((order) => {
        const prev = prevStatusMap.current[order.id];
        if (prev && prev !== order.status) {
          const msg = STATUS_MESSAGES[order.status];
          if (msg) {
            toast(msg, order.status === "cancelled" ? "error" : "success");
            notifyBrowser("FoodDash Order Update", msg);
          }
        }
        prevStatusMap.current[order.id] = order.status;
      });

      setOrders(firestoreOrders);
    });

    return unsub;
  }, [user]);

  // ── Subscribe to Firestore push notifications (sent by admin) ────────────
  useEffect(() => {
    if (!user) return;
    notifInitialDone.current = false;
    seenNotifIds.current = new Set();

    const unsub = subscribeUserNotifications(user.uid, (notifs) => {
      // On first snapshot: seed seen IDs silently (don't toast old notifications)
      if (!notifInitialDone.current) {
        notifs.forEach((n) => seenNotifIds.current.add(n.id));
        notifInitialDone.current = true;
        setNotifications(notifs);
        return;
      }

      // Only toast genuinely new unread notifications
      notifs.forEach((n) => {
        if (!seenNotifIds.current.has(n.id) && !n.isRead) {
          toast(`${n.title} — ${n.body}`, "info");
          notifyBrowser(n.title, n.body);
          markNotificationRead(user.uid, n.id).catch(() => {});
        }
        seenNotifIds.current.add(n.id);
      });

      setNotifications(notifs);
    });
    return unsub;
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isOffline) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-6xl">📶</div>
        <h2 className="text-xl font-black text-gray-900">No Internet Connection</h2>
        <p className="text-gray-500 text-sm">Please check your connection and try again.</p>
        <div className="flex items-center gap-2 text-gray-400 text-xs mt-2">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />Offline
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🍔</div>
        <Spinner size="lg" />
        <div className="text-gray-500 text-sm font-medium">Loading FoodDash...</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // Called by CartPage after writing to Firestore — optimistically prepend to list
  const handleOrderPlaced = (order) => {
    setOrders((prev) => [order, ...prev]);
    prevStatusMap.current[order.id] = order.status;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const handleMarkAllRead = () => {
    if (user?.uid) markAllNotificationsRead(user.uid, notifications).catch(() => {});
  };

  return (
    <div className="max-w-md mx-auto min-h-screen relative bg-white">
      {page === "home"    && (
        <HomePage
          setPage={setPage}
          notifications={notifications}
          onNotifClick={(orderId) => setNotifOrderId(orderId)}
          onMarkAllRead={handleMarkAllRead}
        />
      )}
      {page === "cart"    && <CartPage setPage={setPage} onOrderPlaced={handleOrderPlaced} existingOrders={orders} />}
      {page === "orders"  && (
        <OrdersPage
          orders={orders}
          initialSelectedId={notifOrderId}
          onClearInitialSelected={() => setNotifOrderId(null)}
          setPage={setPage}
        />
      )}
      {page === "profile" && <ProfilePage />}
      {page !== "cart"    && (
        <BottomNav page={page} setPage={setPage} unreadNotifCount={unreadCount} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <AppInner />
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
