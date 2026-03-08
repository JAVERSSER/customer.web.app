// src/pages/AuthPage.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/UI";

export default function AuthPage() {
  const { login, register, resetPassword, error, setError } = useAuth();
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [errs, setErrs] = useState({});

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrs((p) => ({ ...p, [k]: "" }));
    setError("");
  };

  const validate = () => {
    const e = {};
    if (mode === "register" && !form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "At least 6 characters";
    if (mode === "register" && !form.phone.trim())
      e.phone = "Phone is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) {
      setErrs(e2);
      return;
    }
    setLoading(true);
    if (mode === "login") await login(form.email, form.password);
    else await register(form);
    setLoading(false);
  };

  const switchMode = (m) => {
    setMode(m);
    setErrs({});
    setError("");
    setResetSent(false);
    setResetEmail("");
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    const ok = await resetPassword(resetEmail);
    if (ok) setResetSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pt-12 pb-8 px-6 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-orange-200 mx-auto mb-4">
          🍔
        </div>
        <h1 className="text-3xl font-black text-gray-900 font-display">
          FoodDash
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Delicious food, delivered fast 🚀
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-t-3xl shadow-2xl px-6 pt-6 pb-8">
        {/* Tabs */}
        {mode !== "forgot" && (
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === m ? "bg-white text-orange-500 shadow-sm" : "text-gray-500"}`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
            <span className="text-red-400">⚠️</span>
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}

        {mode !== "forgot" && <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <Input
              label="Full Name"
              placeholder="Sophea Meas"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={errs.name}
              icon="👤"
            />
          )}
          <Input
            label="Email"
            type="email"
            placeholder="you@email.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            error={errs.email}
            icon="✉️"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">
                🔒
              </span>
              <input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className={`w-full bg-white border ${errs.password ? "border-red-400" : "border-gray-200 focus:border-orange-400"} rounded-2xl pl-10 pr-11 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-100 transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
            {errs.password && (
              <span className="text-xs text-red-500">{errs.password}</span>
            )}
            {mode === "login" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-xs text-orange-500 font-semibold text-right self-end hover:underline"
              >
                Forgot Password?
              </button>
            )}
          </div>

          {mode === "register" && (
            <Input
              label="Phone Number"
              type="tel"
              placeholder="012 345 678"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              error={errs.phone}
              icon="📱"
            />
          )}

          <Button
            type="submit"
            size="xl"
            className="w-full mt-2"
            loading={loading}
          >
            {mode === "login" ? "Sign In →" : "Create Account →"}
          </Button>
        </form>}

        {/* Forgot Password view */}
        {mode === "forgot" && (
          <div className="mt-2">
            <button
              onClick={() => switchMode("login")}
              className="flex items-center gap-1 text-sm text-gray-500 mb-5 hover:text-gray-700"
            >
              ← Back to Sign In
            </button>
            <h2 className="text-xl font-black text-gray-900 mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-5">Enter your email and we'll send you a reset link.</p>

            {resetSent ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4 text-center">
                <div className="text-3xl mb-2">📧</div>
                <p className="text-green-700 font-semibold text-sm">Reset email sent!</p>
                <p className="text-green-600 text-xs mt-1">Check your inbox and follow the link to reset your password.</p>
                <button
                  onClick={() => switchMode("login")}
                  className="mt-4 text-sm text-orange-500 font-semibold hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@email.com"
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); setError(""); }}
                  icon="✉️"
                />
                <Button type="submit" size="xl" className="w-full" loading={loading}>
                  Send Reset Link →
                </Button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
