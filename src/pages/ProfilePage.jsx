// src/pages/ProfilePage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Modal, toast } from "../components/UI";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

const AVATARS = ["😊", "😎", "🤩", "🥳", "👩", "👨", "🧑", "👸", "🤴", "🦸", "🧑‍🍳", "🐱"];

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const [logoutModal, setLogoutModal] = useState(false);
  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [totalExpense, setTotalExpense] = useState(0);
  const [orderCount, setOrderCount]    = useState(0);

  // Subscribe to customer's delivered orders and compute total expense
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "orders"),
      where("customerId", "==", user.uid),
      where("status", "==", "delivered")
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => d.data());
      setOrderCount(orders.length);
      setTotalExpense(orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0));
    }, (err) => console.warn("expense query:", err.code));
  }, [user?.uid]); // eslint-disable-line

  const [form, setForm] = useState({
    name:    user?.name    || "",
    phone:   user?.phone   || "",
    address: user?.address || "",
    avatar:  user?.avatar  || "",
    gender:  user?.gender  || "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openEdit = () => {
    setForm({
      name:    user?.name    || "",
      phone:   user?.phone   || "",
      address: user?.address || "",
      avatar:  user?.avatar  || "",
      gender:  user?.gender  || "",
    });
    setEditing(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast("Name is required", "error"); return; }
    setSaving(true);
    await updateProfile(form);
    setSaving(false);
    setEditing(false);
    toast("Profile updated!", "success");
  };

  const displayAvatar = user?.avatar && AVATARS.includes(user.avatar)
    ? user.avatar
    : user?.name?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-4 pt-10 pb-14 safe-top">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-black text-white font-display">My Profile</h1>
          <button
            onClick={openEdit}
            className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-white/30 transition-all"
          >
            Edit ✏️
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center text-2xl font-black text-orange-500 shadow-lg">
            {displayAvatar}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{user?.name || "User"}</h2>
            <p className="text-white/80 text-sm">{user?.email}</p>
            <p className="text-white/70 text-xs mt-0.5">📱 {user?.phone || "No phone added"}</p>
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="mx-4 -mt-6 space-y-3">

        {/* Stats row */}
        <div className="bg-white rounded-3xl shadow-lg p-4 flex divide-x divide-gray-100">
          <div className="flex-1 text-center px-2">
            <div className="text-2xl mb-0.5">💰</div>
            <div className="font-black text-gray-900 text-base leading-tight">${totalExpense.toFixed(2)}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Total Spent</div>
          </div>
          <div className="flex-1 text-center px-2">
            <div className="text-2xl mb-0.5">📦</div>
            <div className="font-black text-orange-500 text-base leading-tight">{orderCount}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Orders</div>
          </div>
          <div className="flex-1 text-center px-2">
            <div className="text-2xl mb-0.5">⭐</div>
            <div className="font-black text-gray-900 text-base leading-tight">Member</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Status</div>
          </div>
        </div>

        {/* Expense detail card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">
                💳 Total Food Expense
              </div>
              <div className="text-3xl font-black text-gray-900">${totalExpense.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-1">
                {orderCount} completed order{orderCount !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl">
              🛍️
            </div>
          </div>
        </div>

        {/* Account info card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Account Info</span>
          </div>
          {[
            { icon: "👤", label: "Name",    value: user?.name    || "—" },
            { icon: "📱", label: "Phone",   value: user?.phone   || "—" },
            { icon: "🧑", label: "Gender",  value: user?.gender  || "—" },
            { icon: "📧", label: "Email",   value: user?.email   || "—" },
            { icon: "📍", label: "Address", value: user?.address || "—" },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-base flex-shrink-0">
                {row.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{row.label}</div>
                <div className="text-sm text-gray-800 font-medium truncate">{row.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={() => setLogoutModal(true)}
          className="w-full bg-red-50 border border-red-100 text-red-600 font-bold rounded-3xl py-4 flex items-center justify-center gap-2 hover:bg-red-100 active:bg-red-200 transition-all"
        >
          <span>🚪</span> Sign Out
        </button>
      </div>

      {/* ── Edit Profile Modal ── */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Profile">
        <div className="p-4 space-y-4">

          {/* Avatar picker */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Choose Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => set("avatar", emoji)}
                  className={`w-full aspect-square rounded-2xl text-2xl flex items-center justify-center border transition-all ${
                    form.avatar === emoji
                      ? "bg-orange-100 border-orange-400"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
              <span>👤</span>
              <input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-gray-800"
                placeholder="Your name"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
              <span>📱</span>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-gray-800"
                placeholder="012 345 678"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
            <div className="flex gap-2">
              {[
                { value: "Male",   icon: "👨" },
                { value: "Female", icon: "👩" },
                { value: "Other",  icon: "🧑" },
              ].map(({ value, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("gender", value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    form.gender === value
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {icon} {value}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Default Address</label>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-0.5">📍</span>
                <textarea
                  value={form.address}
                  onChange={e => set("address", e.target.value)}
                  rows={2}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-800 resize-none"
                  placeholder="St. 271, Phnom Penh..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" loading={saving} onClick={save}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* ── Logout confirm ── */}
      <Modal open={logoutModal} onClose={() => setLogoutModal(false)}>
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">👋</div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Sign Out?</h3>
          <p className="text-gray-500 text-sm mb-5">You'll need to sign in again to order food.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setLogoutModal(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
