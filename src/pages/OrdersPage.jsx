// src/pages/OrdersPage.jsx
import { useState, useEffect, useRef } from "react";
import { StatusBadge, BottomSheet } from "../components/UI";
import { subscribeRiderLocation, submitReview, cancelOrder, updateOrderItems, sendMessage, subscribeMessages, sendNotification } from "../services/firestoreService";
import { useAuth } from "../context/AuthContext";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const fmtOrder = (o) => {
  if (o?.orderNumber) return o.orderNumber;
  const id = o?.id || "";
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return (n % 900000) + 100000;
};

const PHNOM_PENH = [11.5564, 104.9282];

function makeCustIcon(emoji, bg) {
  return L.divIcon({
    html: `<div style="background:${bg};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:14px;">${emoji}</div>`,
    className: "",
    iconSize:   [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeRiderIcon() {
  return L.divIcon({
    html: `<div style="position:relative;width:40px;height:46px;display:flex;flex-direction:column;align-items:center;">
      <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(145deg,#ff6b35,#e65c00);border:3px solid white;box-shadow:0 4px 14px rgba(230,92,0,0.55);display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
          <path d="M19 7c0-1.1-.9-2-2-2h-3l2 4h-4L10 7H7L5 11H3v2h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-2h-1l-3-4zM8 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
        </svg>
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #e65c00;margin-top:-1px;"></div>
    </div>`,
    className: "", iconSize: [40, 46], iconAnchor: [20, 46], popupAnchor: [0, -46],
  });
}

async function fetchOSRMRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const data = await fetch(url).then((r) => r.json());
    return data.routes?.[0] || null;
  } catch { return null; }
}

// ── Leaflet live delivery tracking ────────────────────────────────────────────
function DeliveryMap({ order }) {
  const mapElRef      = useRef(null);
  const leafletRef    = useRef(null);
  const markersRef    = useRef({});
  const routeLayerRef = useRef(null);
  const shopPosRef    = useRef(PHNOM_PENH);
  const custPosRef    = useRef([11.5630, 104.9240]);
  const orderRef      = useRef(order);

  const [riderPos, setRiderPos] = useState(null);
  const [eta,      setEta]      = useState(null);

  useEffect(() => { orderRef.current = order; }, [order]);

  // Init Leaflet map once
  useEffect(() => {
    if (!mapElRef.current || leafletRef.current) return;
    leafletRef.current = L.map(mapElRef.current, { zoomControl: false, attributionControl: false })
      .setView(PHNOM_PENH, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 })
      .addTo(leafletRef.current);
    return () => { leafletRef.current?.remove(); leafletRef.current = null; };
  }, []);

  // Geocode addresses, place markers, draw initial shop→customer road route
  useEffect(() => {
    const geocode = async (addr) => {
      try {
        const d = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`
        ).then((r) => r.json());
        if (d[0]) return [parseFloat(d[0].lat), parseFloat(d[0].lon)];
      } catch {}
      return null;
    };
    const run = async () => {
      const shopAddr = order.shopAddress    || "Phnom Penh, Cambodia";
      const custAddr = order.deliveryAddress || order.address || "Phnom Penh, Cambodia";
      const [sp, cp] = await Promise.all([geocode(shopAddr), geocode(custAddr)]);
      const map = leafletRef.current;
      if (!map) return;
      if (sp) shopPosRef.current = sp;
      if (cp) custPosRef.current = cp;
      const s = shopPosRef.current, c = custPosRef.current;
      if (markersRef.current.shop) markersRef.current.shop.setLatLng(s);
      else markersRef.current.shop = L.marker(s, { icon: makeCustIcon("🏪", "#f97316") }).addTo(map);
      if (markersRef.current.cust) markersRef.current.cust.setLatLng(c);
      else markersRef.current.cust = L.marker(c, { icon: makeCustIcon("📍", "#4285F4") }).addTo(map);
      // Draw OSRM road route between shop and customer
      const route = await fetchOSRMRoute(s, c);
      if (route) {
        if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
        routeLayerRef.current = L.geoJSON(route.geometry, { style: { color: "#4285F4", weight: 4, opacity: 0.75 } }).addTo(map);
        const mins = Math.round(route.duration / 60);
        setEta(mins < 1 ? "< 1 min" : `${mins} min`);
      }
      map.fitBounds([s, c], { padding: [30, 30] });
    };
    run();
  }, []); // eslint-disable-line

  // Subscribe to rider's live GPS from Firestore
  useEffect(() => {
    if (!order.riderId) return;
    return subscribeRiderLocation(order.riderId, (pos) => {
      if (Array.isArray(pos))        setRiderPos(pos);
      else if (pos?.lat && pos?.lng) setRiderPos([pos.lat, pos.lng]);
    });
  }, [order.riderId]); // eslint-disable-line

  // Rider marker + dynamic road route as they move
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || !riderPos) return;
    if (markersRef.current.rider) {
      markersRef.current.rider.setLatLng(riderPos);
    } else {
      markersRef.current.rider = L.marker(riderPos, { icon: makeRiderIcon() }).addTo(map);
      map.setView(riderPos, 14);
    }
    // Route: rider→shop while going to pick up; rider→customer once picked up / delivering
    const o = orderRef.current;
    const goingToShop = o.status === "rider_assigned" && o.deliveryStep !== "pickup";
    const dest = goingToShop ? shopPosRef.current : custPosRef.current;
    const routeColor = goingToShop ? "#34A853" : "#f97316";
    fetchOSRMRoute(riderPos, dest).then((route) => {
      if (!route || !leafletRef.current) return;
      if (routeLayerRef.current) { leafletRef.current.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
      routeLayerRef.current = L.geoJSON(route.geometry, { style: { color: routeColor, weight: 4, opacity: 0.85 } }).addTo(leafletRef.current);
      const mins = Math.round(route.duration / 60);
      setEta(mins < 1 ? "< 1 min" : `${mins} min`);
    });
  }, [riderPos]); // eslint-disable-line

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200">
      <div ref={mapElRef} style={{ height: "220px", width: "100%" }} />
      {eta && (
        <div className="bg-orange-50 border-t border-orange-100 px-3 py-2 flex items-center gap-2">
          <span className="text-sm">🕐</span>
          <span className="text-xs font-semibold text-orange-700">ETA: {eta}</span>
          <span className="ml-auto text-[10px] text-gray-400">Live routing</span>
        </div>
      )}
      <div className="bg-gray-50 flex gap-4 px-3 py-2 text-xs text-gray-500">
        <span><span className="text-orange-500 font-bold">●</span> Restaurant</span>
        <span><span className="text-orange-600 font-bold">●</span> Rider</span>
        <span><span className="text-blue-500 font-bold">●</span> You</span>
      </div>
    </div>
  );
}

// ── 7-step delivery timeline ──────────────────────────────────────────────────
const STEP_LABELS = [
  { icon: "📋", label: "Order Placed" },
  { icon: "✅", label: "Confirmed" },
  { icon: "👨‍🍳", label: "Preparing" },
  { icon: "🛵", label: "Rider On the Way" },
  { icon: "🏪", label: "At Restaurant" },
  { icon: "🚀", label: "On the Way to You" },
  { icon: "🎉", label: "Delivered" },
];

function getDeliveryStep(status, deliveryStep) {
  if (status === "pending")        return 1;
  if (status === "confirmed")      return 2;
  if (status === "preparing")      return 3;
  if (status === "rider_assigned") return deliveryStep === "pickup" ? 5 : 4;
  if (status === "delivering")     return 6;
  if (status === "delivered")      return 7;
  return 0;
}

function StatusTimeline({ status, deliveryStep, cancelReason }) {
  if (status === "cancelled") {
    return (
      <div className="bg-red-50 rounded-2xl px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <div>
            <div className="font-bold text-red-700 text-sm">Order Cancelled</div>
            <div className="text-xs text-red-500">We're sorry your order could not be completed.</div>
          </div>
        </div>
        {cancelReason && (
          <div className="bg-white border border-red-200 rounded-xl px-3 py-2.5">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-1">Reason</div>
            <div className="text-sm text-red-700">{cancelReason}</div>
          </div>
        )}
        <div className="text-xs text-red-400 text-center pt-0.5">Please feel free to place a new order anytime 🙏</div>
      </div>
    );
  }
  const currentStep = getDeliveryStep(status, deliveryStep);
  return (
    <div className="space-y-1">
      {STEP_LABELS.map((s, i) => {
        const step    = i + 1;
        const done    = step < currentStep;
        const current = step === currentStep;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                done    ? "bg-green-500 text-white" :
                current ? "bg-orange-500 text-white ring-4 ring-orange-100" :
                          "bg-gray-100 text-gray-400"
              }`}>
                {done ? "✓" : s.icon}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-0.5 h-5 mt-0.5 ${done || current ? "bg-orange-200" : "bg-gray-100"}`} />
              )}
            </div>
            <div className={`text-sm ${current ? "font-bold text-gray-900" : done ? "text-gray-500" : "text-gray-300"}`}>
              {s.label}
              {current && (
                <span className="ml-2 text-[10px] bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">NOW</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Order card (list item) ────────────────────────────────────────────────────
function OrderCard({ order, onClick }) {
  const isLive = ["rider_assigned", "delivering"].includes(order.status);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-3xl p-4 shadow-sm border border-gray-100 hover:shadow-md active:scale-[0.99] transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl">{order.shopEmoji}</div>
          <div>
            <div className="font-bold text-gray-900 text-sm">{order.shopName}</div>
            <div className="text-xs text-gray-500 mt-0.5">#{fmtOrder(order)} · {order.date}</div>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="text-xs text-gray-500 mb-2">
        {order.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
      </div>
      <div className="flex items-center justify-between">
        <span className="font-bold text-orange-500">${order.total.toFixed(2)}</span>
        {isLive && (
          <span className="text-xs bg-orange-50 text-orange-600 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="animate-pulse">●</span> Live Tracking
          </span>
        )}
      </div>
    </button>
  );
}

// ── Star rating picker ────────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={`text-4xl transition-transform active:scale-90 ${star <= value ? "opacity-100" : "opacity-25"}`}
        >⭐</button>
      ))}
    </div>
  );
}

// ── Rating modal (full-screen overlay, shown after delivery) ──────────────────
function RatingModal({ order, onSubmit, onSkip }) {
  const [rating, setRating]   = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(order.id, order.riderId, rating, comment);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8">
        <div className="text-center mb-5">
          <div className="text-5xl mb-2">🎉</div>
          <h3 className="text-xl font-black text-gray-900">Order Delivered!</h3>
          <p className="text-sm text-gray-500 mt-1">
            How was your experience with {order.riderName || "your rider"}?
          </p>
        </div>

        <StarPicker value={rating} onChange={setRating} />

        <div className="mt-2 mb-1 text-center text-sm font-semibold text-gray-700">
          {["", "Poor 😞", "Fair 😐", "Good 🙂", "Great 😊", "Excellent 🤩"][rating]}
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Any comments? (optional)"
          rows={3}
          className="w-full mt-4 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none"
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 font-semibold text-sm"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-200 disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chat panel (customer ↔ rider) ─────────────────────────────────────────────
const CUSTOMER_QUICK = ["Is my order ready? 🍔", "How far are you? 📍", "I'm home 🏠", "Please hurry! ⏰", "I'll be outside 🚶"];

function ChatPanel({ orderId, myId, myName, riderId, riderName, readOnly }) {
  const [msgs, setMsgs]       = useState([]);
  const [text, setText]       = useState("");
  const endRef = useRef(null);
  const taRef  = useRef(null);

  useEffect(() => {
    if (!orderId) return;
    return subscribeMessages(orderId, setMsgs);
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    const ta = taRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 96) + "px"; }
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
    sendMessage(orderId, myId, "customer", myName, t);
    sendNotification(riderId, `💬 ${myName}`, t, { orderId }).catch(() => {});
  };

  // Group consecutive messages from same sender
  const grouped = msgs.map((m, i) => ({
    ...m,
    isFirst: i === 0 || msgs[i - 1].senderId !== m.senderId,
    isLast:  i === msgs.length - 1 || msgs[i + 1].senderId !== m.senderId,
  }));

  return (
    <div className="border border-orange-100 rounded-2xl overflow-hidden">
      <div className="bg-orange-50 px-4 py-2.5 border-b border-orange-100 flex items-center gap-2">
        <span className="text-sm">💬</span>
        <span className="text-xs font-bold text-orange-700">Chat with {riderName || "Rider"}</span>
        <span className="ml-auto text-[10px] text-gray-400">{msgs.length > 0 ? `${msgs.length} message${msgs.length > 1 ? "s" : ""}` : ""}</span>
        {readOnly && <span className="text-[10px] text-gray-400 font-medium">• Completed</span>}
      </div>

      <div className="max-h-64 overflow-y-auto p-3 space-y-0.5 bg-white">
        {msgs.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">No messages yet. Say hello! 👋</p>
        )}
        {grouped.map(m => {
          const isMine = m.senderId === myId;
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"} ${m.isFirst ? "mt-2" : "mt-0.5"}`}>
              {!isMine && m.isFirst && (
                <span className="text-[10px] text-gray-400 font-semibold px-1 mb-0.5">{m.senderName || "Rider"}</span>
              )}
              <div className={`max-w-[80%] px-3 py-2 text-sm leading-snug break-words ${
                isMine
                  ? `bg-orange-500 text-white ${m.isFirst ? "rounded-t-2xl" : "rounded-t-lg"} ${m.isLast ? "rounded-b-2xl rounded-br-sm" : "rounded-b-lg"}`
                  : `bg-gray-100 text-gray-800 ${m.isFirst ? "rounded-t-2xl" : "rounded-t-lg"} ${m.isLast ? "rounded-b-2xl rounded-bl-sm" : "rounded-b-lg"}`
              }`}>
                {m.text}
              </div>
              {m.isLast && (
                <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(m.createdAt)}</span>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {!readOnly && (
        <>
          {/* Quick replies — always visible, horizontal scroll */}
          <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide bg-white border-t border-gray-50">
            {CUSTOMER_QUICK.map(q => (
              <button key={q} onClick={() => { setText(q); taRef.current?.focus(); }}
                className="flex-shrink-0 text-xs bg-orange-50 border border-orange-200 text-orange-600 px-2.5 py-1 rounded-full active:scale-95 transition-transform whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 p-2 border-t border-gray-100 bg-white">
            <textarea
              ref={taRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Message your rider..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 transition-all resize-none overflow-hidden leading-snug"
            />
            <button onClick={send} disabled={!text.trim()}
              className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all text-lg font-bold flex-shrink-0 mb-0.5">
              ›
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Order detail bottom sheet ─────────────────────────────────────────────────
function OrderDetail({ order, onClose, onRateOrder, onCancel, onSaveItems, onGoHome }) {
  const { user } = useAuth();
  const [editItems, setEditItems]           = useState(null);
  const [savingItems, setSavingItems]       = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Initialise editable copy only for pending orders
  useEffect(() => {
    if (order?.status === "pending") {
      setEditItems(order.items?.map(i => ({ ...i })) || []);
    } else {
      setEditItems(null);
    }
    setShowCancelConfirm(false);
  }, [order?.id, order?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) return null;

  const showMap = ["rider_assigned", "delivering"].includes(order.status);
  const canCancel = ["pending", "confirmed"].includes(order.status);

  const itemsChanged = editItems && JSON.stringify(editItems.map(i => ({ n: i.name, q: i.qty }))) !==
    JSON.stringify(order.items?.map(i => ({ n: i.name, q: i.qty })));

  const handleQtyChange = (idx, delta) => {
    setEditItems(prev => {
      const next = prev.map((it, i) => i === idx ? { ...it, qty: Math.max(0, it.qty + delta) } : it);
      return next.filter(it => it.qty > 0);
    });
  };

  const handleSaveItems = async () => {
    if (!editItems || editItems.length === 0) return;
    setSavingItems(true);
    const newSubtotal = editItems.reduce((s, i) => s + i.price * i.qty, 0);
    const fee         = order.deliveryFee || 1.5;
    const newTotal    = newSubtotal + fee - (order.discount || 0);
    await onSaveItems(order.id, editItems, newSubtotal, newTotal);
    setSavingItems(false);
  };

  const displayItems = editItems || order.items || [];

  return (
    <BottomSheet open={!!order} onClose={onClose} title="Order Details" snapFull>
      <div className="px-4 pb-8 space-y-5">
        {/* Shop & status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl">{order.shopEmoji}</div>
            <div>
              <div className="font-bold text-gray-900">{order.shopName}</div>
              <div className="text-xs text-gray-500">#{fmtOrder(order)}</div>
              <div className="text-xs text-gray-400">{order.date} · {order.time}</div>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* 7-step tracking timeline */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <h4 className="font-bold text-gray-800 text-sm mb-4">📍 Order Tracking</h4>
          <StatusTimeline status={order.status} deliveryStep={order.deliveryStep} cancelReason={order.cancelReason} />
        </div>

        {/* Live map — shown from rider_assigned through delivering */}
        {showMap && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-800 text-sm">🗺️ Live Tracking</h4>
              <div className="flex items-center gap-2">
                {order.riderPhone && (
                  <a
                    href={`tel:${order.riderPhone}`}
                    className="flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md shadow-orange-200"
                  >
                    📞 Call Rider
                  </a>
                )}
                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />Live
                </span>
              </div>
            </div>
            <DeliveryMap order={order} />
          </div>
        )}

        {/* Chat with rider — available once rider assigned; read-only after delivery */}
        {order.riderId && order.status !== "cancelled" && (
          <ChatPanel
            orderId={order.id}
            myId={user?.uid}
            myName={user?.name || user?.displayName || "Customer"}
            riderId={order.riderId}
            riderName={order.riderName}
            readOnly={order.status === "delivered"}
          />
        )}

        {/* Items — editable controls for pending, read-only otherwise */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h4 className="font-bold text-gray-800 text-sm">🛍️ Order Items</h4>
            {editItems && <span className="text-[10px] text-orange-500 font-semibold">Tap − to remove</span>}
          </div>
          {displayItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 last:border-0">
              <span className="flex-1 text-sm text-gray-700">{item.name}</span>
              {editItems ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQtyChange(i, -1)}
                    className="w-7 h-7 rounded-full bg-red-50 border border-red-200 text-red-500 font-bold text-sm flex items-center justify-center active:scale-90 transition-transform"
                  >−</button>
                  <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                  <span className="text-sm font-semibold text-gray-700 w-14 text-right">${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">
                  ×{item.qty} <span className="font-semibold text-gray-800 ml-2">${(item.price * item.qty).toFixed(2)}</span>
                </span>
              )}
            </div>
          ))}
          {editItems && editItems.length === 0 && (
            <div className="px-4 py-4 text-center text-sm text-gray-400">All items removed — cancel the order below</div>
          )}
        </div>

        {/* Save items button — only shown when items changed */}
        {itemsChanged && editItems.length > 0 && (
          <button
            onClick={handleSaveItems}
            disabled={savingItems}
            className="w-full py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm shadow-md shadow-orange-200 disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {savingItems ? "Saving…" : "✓ Save Item Changes"}
          </button>
        )}

        {/* Price summary */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{editItems ? `$${editItems.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}` : `$${(order.subtotal || order.total || 0).toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Delivery</span><span>${(order.deliveryFee || 1.5).toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span><span>−${order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-black text-orange-500">
              {editItems
                ? `$${(editItems.reduce((s, i) => s + i.price * i.qty, 0) + (order.deliveryFee || 1.5) - (order.discount || 0)).toFixed(2)}`
                : `$${(order.total || 0).toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Delivery address */}
        {order.address && (
          <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-3.5">
            <span className="text-lg mt-0.5">📍</span>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Deliver to</div>
              <div className="text-sm text-gray-800">{order.address}</div>
            </div>
          </div>
        )}

        {/* Cancel order — available for pending + confirmed */}
        {canCancel && !showCancelConfirm && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-semibold text-sm active:scale-[0.98] transition-all"
          >
            ❌ Cancel Order
          </button>
        )}
        {canCancel && showCancelConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-red-700 text-center">Cancel this order?</p>
            <p className="text-xs text-red-500 text-center">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold bg-white">Keep It</button>
              <button onClick={() => { onCancel(order.id); onClose(); onGoHome?.(); }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold">Yes, Cancel</button>
            </div>
          </div>
        )}

        {/* Review section — for delivered orders */}
        {order.status === "delivered" && (
          order.review ? (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-800">Your Review</span>
                <span className="text-amber-500 font-bold">{"⭐".repeat(order.review.rating)}</span>
              </div>
              {order.review.comment && (
                <p className="text-sm text-gray-600 italic">"{order.review.comment}"</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => onRateOrder(order)}
              className="w-full py-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              ⭐ Rate your delivery experience
            </button>
          )
        )}
      </div>
    </BottomSheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrdersPage({ orders, initialSelectedId, onClearInitialSelected, setPage }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = orders.find((o) => o.id === selectedId) || null;

  // Rating modal state
  const [ratingOrder, setRatingOrder] = useState(null);
  const prevStatusRef = useRef({});

  // Auto-open order detail from notification tap
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
      if (onClearInitialSelected) onClearInitialSelected();
    }
  }, [initialSelectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-show rating popup when an order transitions to "delivered" with no review
  useEffect(() => {
    orders.forEach((order) => {
      const prev = prevStatusRef.current[order.id];
      if (prev && prev !== "delivered" && order.status === "delivered" && !order.review) {
        setRatingOrder(order);
      }
      prevStatusRef.current[order.id] = order.status;
    });
  }, [orders]);

  const handleReviewSubmit = async (orderId, riderId, rating, comment) => {
    try {
      await submitReview(orderId, riderId, rating, comment);
    } catch (e) { console.error(e); }
    setRatingOrder(null);
  };

  const handleCancelOrder = async (orderId) => {
    try { await cancelOrder(orderId); } catch (e) { console.error(e); }
  };

  const handleSaveItems = async (orderId, items, subtotal, total) => {
    try { await updateOrderItems(orderId, items, subtotal, total); } catch (e) { console.error(e); }
  };

  const active  = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const history = orders.filter((o) =>  ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Rating popup — shown after delivery completes */}
      {ratingOrder && (
        <RatingModal
          order={ratingOrder}
          onSubmit={handleReviewSubmit}
          onSkip={() => setRatingOrder(null)}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-4 pt-10 pb-5 safe-top">
        <h1 className="text-2xl font-black text-white font-display">My Orders</h1>
        <p className="text-sm text-white/70 mt-0.5">{orders.length} total orders</p>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {active.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Active Orders
            </h3>
            <div className="space-y-3">
              {active.map((o) => (
                <OrderCard key={o.id} order={o} onClick={() => setSelectedId(o.id)} />
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 mb-3">Order History</h3>
            <div className="space-y-3">
              {history.map((o) => (
                <OrderCard key={o.id} order={o} onClick={() => setSelectedId(o.id)} />
              ))}
            </div>
          </div>
        )}

        {orders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📦</div>
            <div className="font-bold text-gray-800 text-lg">No orders yet</div>
            <div className="text-gray-500 text-sm mt-1">Your order history will appear here</div>
          </div>
        )}
      </div>

      <OrderDetail
        order={selected}
        onClose={() => setSelectedId(null)}
        onRateOrder={(order) => { setSelectedId(null); setRatingOrder(order); }}
        onCancel={handleCancelOrder}
        onSaveItems={handleSaveItems}
        onGoHome={() => setPage?.("home")}
      />
    </div>
  );
}
