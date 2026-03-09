import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection, onSnapshot,
  doc, updateDoc,
} from "firebase/firestore";
import {
  getAuth,
  sendPasswordResetEmail,
} from "firebase/auth";

// ─── Firebase Init (reuses existing app if already initialized) ───────────────
const firebaseConfig = {
  apiKey: "AIzaSyD0JrFSno-D0mqGlmzij964hltHwioSpiM",
  authDomain: "learnpulse-2c85d.firebaseapp.com",
  projectId: "learnpulse-2c85d",
  storageBucket: "learnpulse-2c85d.firebasestorage.app",
  messagingSenderId: "158614885761",
  appId: "1:158614885761:web:dd3f1c15227f36a1fdc480",
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ─── Backend API config ───────────────────────────────────────────────────────
// 👇 Replace this URL with your actual Render deployment URL
const BACKEND_URL  = import.meta.env.VITE_BACKEND_URL || "https://learnpulse-backend.onrender.com";
const ADMIN_SECRET = "superadmin123"; // must match ADMIN_SECRET_KEY in your backend .env

/** Helper: call admin_routes.py endpoints with the X-Admin-Key header */
async function adminAPI(method, path, body = null) {
  const res = await fetch(`${BACKEND_URL}/admin${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key":  ADMIN_SECRET,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = ["student", "teacher", "hod", "counselor", "admin"];

const ROLE_COLORS = {
  student:   { bg: "#1a2a1a", text: "#4ade80",  border: "#166534" },
  teacher:   { bg: "#1a1f2e", text: "#60a5fa",  border: "#1e40af" },
  hod:       { bg: "#2a1a2e", text: "#c084fc",  border: "#6b21a8" },
  counselor: { bg: "#2a1f1a", text: "#fb923c",  border: "#9a3412" },
  admin:     { bg: "#2a1a1a", text: "#f87171",  border: "#991b1b" },
};

const LOG_COLORS = {
  role: "#6366f1", password: "#f59e0b", suspend: "#ef4444", add: "#22c55e", alert: "#60a5fa",
};

// ─── Small UI Pieces ──────────────────────────────────────────────────────────
function Badge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.student;
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: "6px", padding: "2px 10px", fontSize: "12px",
      fontFamily: "'DM Mono', monospace", fontWeight: "600",
      letterSpacing: "0.03em", textTransform: "uppercase",
    }}>{role}</span>
  );
}

function StatusDot({ status }) {
  const active = (status ?? "active") === "active";
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
      color: active ? "#4ade80" : "#f87171", fontFamily: "'DM Sans', sans-serif" }}>
      <span style={{ width: "7px", height: "7px", borderRadius: "50%",
        background: active ? "#4ade80" : "#f87171",
        boxShadow: active ? "0 0 6px #4ade80" : "0 0 6px #f87171",
        display: "inline-block" }} />
      {active ? "active" : "suspended"}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", small = false, disabled = false }) {
  const V = {
    primary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none" },
    danger:  { background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", border: "none" },
    success: { background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: "#94a3b8", border: "1px solid #1e2535" },
    warning: { background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...V[variant], borderRadius: "8px",
      padding: small ? "6px 14px" : "10px 20px",
      fontSize: small ? "12px" : "14px",
      fontFamily: "'DM Sans', sans-serif", fontWeight: "600",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "opacity 0.2s, transform 0.1s", whiteSpace: "nowrap",
    }}
      onMouseOver={e => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
      onMouseOut={e => { e.currentTarget.style.opacity = "1"; }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >{children}</button>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px",
        fontFamily: "'DM Sans', sans-serif", fontWeight: "600",
        textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: "100%", background: "#161b27", border: "1px solid #1e2535",
          borderRadius: "8px", padding: "10px 14px", color: "#e2e8f0",
          fontSize: "14px", fontFamily: "'DM Sans', sans-serif",
          outline: "none", boxSizing: "border-box" }}
        onFocus={e => e.target.style.borderColor = "#6366f1"}
        onBlur={e => e.target.style.borderColor = "#1e2535"}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px",
        fontFamily: "'DM Sans', sans-serif", fontWeight: "600",
        textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <select value={value} onChange={onChange} style={{
        width: "100%", background: "#161b27", border: "1px solid #1e2535",
        borderRadius: "8px", padding: "10px 14px", color: "#e2e8f0",
        fontSize: "14px", fontFamily: "'DM Sans', sans-serif",
        outline: "none", boxSizing: "border-box", cursor: "pointer",
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(4px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "#0f1117", border: "1px solid #1e2535",
        borderRadius: "16px", padding: "32px",
        minWidth: "420px", maxWidth: "520px", width: "90%",
        boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "24px" }}>
          <h3 style={{ margin: 0, fontFamily: "'Sora', sans-serif",
            color: "#e2e8f0", fontSize: "18px" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none",
            color: "#64748b", fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onSave }) {
  const [name,   setName]   = useState(user.name   || "");
  const [email,  setEmail]  = useState(user.email  || "");
  const [role,   setRole]   = useState(user.role   || "student");
  const [status, setStatus] = useState(user.status || "active");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setLoading(true); setErr("");
    try {
      await updateDoc(doc(db, "users", user.id), { name, email, role, status });
      onSave({ ...user, name, email, role, status });
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <Modal title={`Edit — ${user.name || user.id}`} onClose={onClose}>
      <InputField label="Full Name"  value={name}  onChange={e => setName(e.target.value)} />
      <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <SelectField label="Role"   value={role}   onChange={e => setRole(e.target.value)}   options={ROLES} />
      <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value)} options={["active","suspended"]} />
      {err && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px",
        fontFamily: "'DM Sans', sans-serif" }}>{err}</p>}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
        </Btn>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, addLog, showToast }) {
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [err,     setErr]     = useState("");

  const handle = async () => {
    if (!user.email) { setErr("No email address on this account."); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      addLog("Password reset email sent", user.name || user.email, "password");
      showToast("Reset email sent to " + user.email);
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <Modal title={`Reset Password — ${user.name || user.id}`} onClose={onClose}>
      {done ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
          <div style={{ color: "#4ade80", fontFamily: "'DM Sans', sans-serif", fontWeight: "600" }}>
            Reset email sent!
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: "14px 16px", background: "#1a1f2e", borderRadius: "8px",
            marginBottom: "20px", borderLeft: "3px solid #f59e0b" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8",
              fontFamily: "'DM Sans', sans-serif" }}>
              ⚠️ A password reset link will be sent to{" "}
              <strong style={{ color: "#e2e8f0" }}>{user.email || "this user's email"}</strong>{" "}
              via Firebase Auth.
            </p>
          </div>
          {err && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px",
            fontFamily: "'DM Sans', sans-serif" }}>{err}</p>}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="warning" onClick={handle} disabled={loading}>
              {loading ? "Sending…" : "Send Reset Email"}
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

function AddUserModal({ onClose, addLog, showToast }) {
  const [form, setForm] = useState({ name: "", email: "", role: "student", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async () => {
    setLoading(true); setErr("");
    try {
      await adminAPI("POST", "/user", {
        name:     form.name,
        email:    form.email,
        role:     form.role,
        password: form.password,
      });
      addLog("New user added", `${form.name} (${form.role})`, "add");
      showToast(`${form.name} created successfully`);
      onClose();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <Modal title="Add New User" onClose={onClose}>
      <InputField label="Full Name" value={form.name} onChange={set("name")} placeholder="e.g. Rahul Verma" />
      <InputField label="Email" type="email" value={form.email} onChange={set("email")} placeholder="user@college.edu" />
      <SelectField label="Role" value={form.role} onChange={set("role")} options={ROLES} />
      <InputField label="Initial Password" type="password" value={form.password}
        onChange={set("password")} placeholder="Min. 6 characters" />
      {err && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px",
        fontFamily: "'DM Sans', sans-serif" }}>{err}</p>}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="success" onClick={handle}
          disabled={loading || !form.name || !form.email || form.password.length < 6}>
          {loading ? "Creating…" : "Create User"}
        </Btn>
      </div>
    </Modal>
  );
}

function DeleteConfirmModal({ user, onClose, onConfirm }) {
  return (
    <Modal title="Confirm Deletion" onClose={onClose}>
      <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🗑️</div>
        <p style={{ color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif",
          fontSize: "15px", marginBottom: "6px" }}>
          Delete <strong>{user.name || user.id}</strong>?
        </p>
        <p style={{ color: "#64748b", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }}>
          This permanently removes their{" "}
          <strong style={{ color: "#f87171" }}>Firebase Auth account</strong>{" "}
          and <strong style={{ color: "#f87171" }}>Firestore document</strong> via the backend.
          They will no longer be able to log in. This cannot be undone.
        </p>
      </div>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" onClick={() => { onConfirm(user.id); onClose(); }}>
          Delete Permanently
        </Btn>
      </div>
    </Modal>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, delta }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#0f1117 0%,#161b27 100%)",
      border: "1px solid #1e2535", borderRadius: "12px", padding: "20px 24px",
      position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px",
        background: "radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)" }} />
      <div style={{ fontSize: "24px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "28px", fontWeight: "700", color: "#e2e8f0",
        fontFamily: "'Sora', sans-serif" }}>{value}</div>
      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px",
        fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
      {delta && <div style={{ fontSize: "12px", color: "#4ade80", marginTop: "6px",
        fontFamily: "'DM Sans', sans-serif" }}>{delta}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminPanel({ onClose }) {
  const [authed,    setAuthed]    = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [logs,    setLogs]    = useState([]);

  const [search,       setSearch]       = useState("");
  const [filterRole,   setFilterRole]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab,    setActiveTab]    = useState("users");
  const [toast,        setToast]        = useState(null);

  const [editUser,    setEditUser]    = useState(null);
  const [resetUser,   setResetUser]   = useState(null);
  const [deleteUser,  setDeleteUser]  = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);

  useEffect(() => {
    if (!authed) return;
    const unsub = onSnapshot(
      collection(db, "users"),
      snap => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => { console.error("Firestore:", err); setLoading(false); }
    );
    return () => unsub();
  }, [authed]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addLog = (action, detail, type) => {
    setLogs(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      action, detail, type,
    }, ...prev.slice(0, 49)]);
  };

  const handleSaveEdit = (updated) => {
    const old = users.find(u => u.id === updated.id);
    if (old?.role   !== updated.role)   addLog("Role changed",    `${updated.name}: ${old?.role} → ${updated.role}`, "role");
    if (old?.status !== updated.status) addLog(`User ${updated.status}`, updated.name || updated.id, "suspend");
    showToast(`${updated.name || updated.id} updated`);
    setEditUser(null);
  };

  const handleDelete = async (id) => {
    const u = users.find(x => x.id === id);
    try {
      const result = await adminAPI("DELETE", `/user/${id}`);
      addLog("User fully deleted", u?.name || id, "suspend");
      if (result.warnings?.length) {
        showToast(`Deleted with warning: ${result.warnings[0]}`, "danger");
      } else {
        showToast(`${u?.name || id} fully deleted (Auth + Firestore)`, "danger");
      }
    } catch (e) {
      showToast("Delete failed: " + e.message, "danger");
    }
  };

  const handleToggleStatus = async (u) => {
    const next = u.status === "suspended" ? "active" : "suspended";
    try {
      await updateDoc(doc(db, "users", u.id), { status: next });
      addLog(`User ${next}`, u.name || u.id, "suspend");
      showToast(`${u.name || u.id} is now ${next}`);
    } catch (e) {
      showToast("Error: " + e.message, "danger");
    }
  };

  const totalUsers     = users.length;
  const highRisk       = users.filter(u => u.role === "student" && (u.riskScore ?? 0) >= 70).length;
  const activeCount    = users.filter(u => (u.status ?? "active") === "active").length;
  const suspendedCount = users.filter(u => u.status === "suspended").length;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (!q || (u.name||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q)) &&
      (filterRole   === "all" || u.role === filterRole) &&
      (filterStatus === "all" || (u.status ?? "active") === filterStatus)
    );
  });

  // ════════════════════════════════════════
  // AUTH GATE
  // ════════════════════════════════════════
  if (!authed) {
    const tryAuth = () => {
      if (authInput === ADMIN_SECRET) { setAuthed(true); setAuthError(""); }
      else { setAuthError("Invalid credentials. Access denied."); setAuthInput(""); }
    };
    return (
      <div style={{ minHeight: "100vh", background: "#080b11",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ background: "linear-gradient(135deg,#0f1117,#0d1320)",
          border: "1px solid #1e2535", borderRadius: "20px", padding: "48px",
          width: "380px", textAlign: "center",
          boxShadow: "0 0 80px rgba(99,102,241,0.08),0 40px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛡️</div>
          <h1 style={{ margin: "0 0 6px", fontFamily: "'Sora',sans-serif",
            fontSize: "22px", color: "#e2e8f0", fontWeight: "700" }}>LearnPulse</h1>
          <p style={{ margin: "0 0 32px", color: "#64748b", fontSize: "13px",
            fontFamily: "'DM Sans',sans-serif" }}>Super Admin Access Only</p>
          <input type="password" placeholder="Enter super admin key"
            value={authInput}
            onChange={e => setAuthInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && tryAuth()}
            style={{ width: "100%", background: "#161b27",
              border: `1px solid ${authError ? "#ef4444" : "#1e2535"}`,
              borderRadius: "10px", padding: "12px 16px", color: "#e2e8f0",
              fontSize: "14px", outline: "none", textAlign: "center",
              letterSpacing: "0.15em", marginBottom: "12px", boxSizing: "border-box" }} />
          {authError && (
            <p style={{ color: "#f87171", fontSize: "12px", marginBottom: "12px",
              fontFamily: "'DM Sans',sans-serif" }}>{authError}</p>
          )}
          <Btn variant="primary" onClick={tryAuth}>Authenticate</Btn>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "users",    label: "User Management", icon: "👥" },
    { id: "activity", label: "Activity Log",     icon: "📋" },
    { id: "system",   label: "System",           icon: "⚙️"  },
  ];

  // ════════════════════════════════════════
  // MAIN PANEL
  // ════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "#080b11", color: "#e2e8f0" }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 2000,
          background: toast.type === "danger" ? "#1a0808" : "#0a1a0a",
          border: `1px solid ${toast.type === "danger" ? "#ef4444" : "#22c55e"}`,
          borderRadius: "10px", padding: "12px 20px",
          fontFamily: "'DM Sans',sans-serif", fontSize: "14px",
          color: toast.type === "danger" ? "#f87171" : "#4ade80",
          animation: "toastIn 0.3s ease", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
          {toast.type === "danger" ? "🗑️" : "✅"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <header style={{ background: "#0a0e18", borderBottom: "1px solid #1e2535",
        padding: "0 32px", height: "64px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🛡️</div>
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: "700",
              fontSize: "16px", lineHeight: 1.2 }}>LearnPulse</div>
            <div style={{ fontSize: "11px", color: "#475569",
              letterSpacing: "0.08em", textTransform: "uppercase" }}>Super Admin Console</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "12px", color: "#475569", fontFamily: "'DM Mono',monospace" }}>
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </div>
          <div style={{ width: "1px", height: "24px", background: "#1e2535" }} />
          <Btn variant="ghost" small onClick={() => { setAuthed(false); onClose?.(); }}>Sign Out</Btn>
        </div>
      </header>

      <div style={{ padding: "28px 32px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* Live Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px",
          marginBottom: "28px", animation: "slideIn 0.4s ease" }}>
          <StatCard icon="👥" label="Total Users"        value={loading ? "…" : totalUsers}     delta="live from Firestore" />
          <StatCard icon="⚠️" label="High Risk Students" value={loading ? "…" : highRisk}       delta="riskScore ≥ 70" />
          <StatCard icon="🟢" label="Active Accounts"    value={loading ? "…" : activeCount}    delta="not suspended" />
          <StatCard icon="🚫" label="Suspended"          value={loading ? "…" : suspendedCount} delta="accounts" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px",
          background: "#0a0e18", padding: "6px", borderRadius: "12px",
          width: "fit-content", border: "1px solid #1e2535" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: activeTab === t.id
                ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
              border: "none", borderRadius: "8px", padding: "8px 18px",
              color: activeTab === t.id ? "#fff" : "#64748b",
              fontFamily: "'DM Sans',sans-serif", fontWeight: "600",
              fontSize: "13px", cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: "6px",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* ══ USERS TAB ══ */}
        {activeTab === "users" && (
          <div style={{ animation: "slideIn 0.3s ease" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center",
              marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%",
                  transform: "translateY(-50%)", color: "#475569" }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or email…"
                  style={{ width: "100%", background: "#0f1117", border: "1px solid #1e2535",
                    borderRadius: "8px", padding: "10px 14px 10px 38px",
                    color: "#e2e8f0", fontSize: "14px", outline: "none",
                    fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "#1e2535"} />
              </div>
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                style={{ background: "#0f1117", border: "1px solid #1e2535", borderRadius: "8px",
                  padding: "10px 14px", color: "#e2e8f0", fontSize: "13px",
                  fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer" }}>
                <option value="all">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ background: "#0f1117", border: "1px solid #1e2535", borderRadius: "8px",
                  padding: "10px 14px", color: "#e2e8f0", fontSize: "13px",
                  fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer" }}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <Btn variant="success" onClick={() => setShowAddUser(true)}>+ Add User</Btn>
            </div>

            <div style={{ background: "#0a0e18", border: "1px solid #1e2535",
              borderRadius: "14px", overflow: "hidden" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px",
                  color: "#475569", fontFamily: "'DM Sans',sans-serif" }}>
                  Connecting to Firestore…
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e2535" }}>
                      {["User", "Role", "Status", "Risk Score", "Actions"].map(h => (
                        <th key={h} style={{ padding: "14px 16px", textAlign: "left",
                          fontSize: "11px", color: "#475569",
                          fontFamily: "'DM Sans',sans-serif", fontWeight: "600",
                          textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: "48px",
                        color: "#475569", fontFamily: "'DM Sans',sans-serif" }}>
                        No users found
                      </td></tr>
                    ) : filtered.map(u => (
                      <tr key={u.id} className="row-hover"
                        style={{ borderBottom: "1px solid #0f1117", transition: "background 0.15s" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "34px", height: "34px", borderRadius: "10px",
                              flexShrink: 0,
                              background: `linear-gradient(135deg,${ROLE_COLORS[u.role]?.border||"#6366f1"},#0f1117)`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "14px", fontWeight: "700",
                              color: ROLE_COLORS[u.role]?.text || "#e2e8f0",
                              fontFamily: "'Sora',sans-serif" }}>
                              {(u.name || u.email || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0",
                                fontFamily: "'DM Sans',sans-serif" }}>{u.name || "—"}</div>
                              <div style={{ fontSize: "12px", color: "#475569",
                                fontFamily: "'DM Mono',monospace" }}>{u.email || u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}><Badge role={u.role || "student"} /></td>
                        <td style={{ padding: "14px 16px" }}><StatusDot status={u.status} /></td>
                        <td style={{ padding: "14px 16px" }}>
                          {u.riskScore != null ? (
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "13px",
                              fontWeight: "600",
                              color: u.riskScore >= 70 ? "#f87171" : u.riskScore >= 40 ? "#f59e0b" : "#4ade80" }}>
                              {u.riskScore}
                            </span>
                          ) : (
                            <span style={{ color: "#334155", fontSize: "12px",
                              fontFamily: "'DM Mono',monospace" }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <Btn small variant="ghost"    onClick={() => setEditUser(u)}>✏️ Edit</Btn>
                            <Btn small variant="warning"  onClick={() => setResetUser(u)}>🔑</Btn>
                            <Btn small
                              variant={u.status === "suspended" ? "success" : "danger"}
                              onClick={() => handleToggleStatus(u)}>
                              {u.status === "suspended" ? "✅" : "🚫"}
                            </Btn>
                            <Btn small variant="danger" onClick={() => setDeleteUser(u)}>🗑️</Btn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2535",
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#475569",
                  fontFamily: "'DM Sans',sans-serif" }}>
                  {loading ? "Loading…" : `Showing ${filtered.length} of ${users.length} users`}
                </span>
                <span style={{ fontSize: "11px", color: "#334155",
                  fontFamily: "'DM Mono',monospace" }}>🔴 Live · Firestore realtime</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ ACTIVITY LOG TAB ══ */}
        {activeTab === "activity" && (
          <div style={{ animation: "slideIn 0.3s ease" }}>
            <div style={{ background: "#0a0e18", border: "1px solid #1e2535",
              borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e2535",
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontFamily: "'Sora',sans-serif",
                  fontSize: "15px", color: "#e2e8f0" }}>Admin Activity Log</h3>
                <span style={{ fontSize: "12px", color: "#475569",
                  fontFamily: "'DM Mono',monospace" }}>{logs.length} events this session</span>
              </div>
              {logs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px",
                  color: "#334155", fontFamily: "'DM Sans',sans-serif", fontSize: "14px" }}>
                  No actions yet this session
                </div>
              ) : logs.map((log, i) => (
                <div key={log.id} style={{ display: "flex", alignItems: "flex-start",
                  gap: "16px", padding: "14px 24px",
                  borderBottom: i < logs.length - 1 ? "1px solid #0f1117" : "none" }}>
                  <div style={{ width: "8px", height: "8px", marginTop: "6px",
                    flexShrink: 0, borderRadius: "50%",
                    background: LOG_COLORS[log.type] || "#6366f1",
                    boxShadow: `0 0 8px ${LOG_COLORS[log.type] || "#6366f1"}` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "14px",
                      fontWeight: "600", color: "#e2e8f0" }}>{log.action}</div>
                    <div style={{ fontSize: "13px", color: "#64748b",
                      fontFamily: "'DM Sans',sans-serif", marginTop: "2px" }}>{log.detail}</div>
                  </div>
                  <div style={{ fontSize: "12px", color: "#334155",
                    fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{log.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ SYSTEM TAB ══ */}
        {activeTab === "system" && (
          <div style={{ animation: "slideIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

              {/* Role Distribution */}
              <div style={{ background: "#0a0e18", border: "1px solid #1e2535",
                borderRadius: "14px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 20px", fontFamily: "'Sora',sans-serif",
                  fontSize: "15px", color: "#e2e8f0" }}>Role Distribution</h3>
                {ROLES.map(role => {
                  const count = users.filter(u => u.role === role).length;
                  const pct   = users.length ? Math.round((count / users.length) * 100) : 0;
                  return (
                    <div key={role} style={{ marginBottom: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <Badge role={role} />
                        <span style={{ fontSize: "13px", color: "#64748b",
                          fontFamily: "'DM Mono',monospace" }}>{count} users</span>
                      </div>
                      <div style={{ height: "6px", background: "#1e2535",
                        borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`,
                          background: ROLE_COLORS[role]?.text || "#6366f1",
                          borderRadius: "3px", transition: "width 0.6s ease", opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div style={{ background: "#0a0e18", border: "1px solid #1e2535",
                borderRadius: "14px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 20px", fontFamily: "'Sora',sans-serif",
                  fontSize: "15px", color: "#e2e8f0" }}>Quick Actions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { label: "📤 Export All Users (CSV)", variant: "ghost", fn: () => {
                      const rows = [
                        "id,name,email,role,status,riskScore",
                        ...users.map(u =>
                          `${u.id},${u.name||""},${u.email||""},${u.role||""},${u.status||"active"},${u.riskScore??""}`
                        ),
                      ];
                      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "learnpulse_users.csv";
                      a.click();
                      addLog("CSV export", `${users.length} users`, "alert");
                      showToast("CSV downloaded");
                    }},
                    { label: "🔄 Recalculate All Risk Scores", variant: "primary",
                      fn: () => showToast("Call your FastAPI /recalculate endpoint here") },
                    { label: "📧 Bulk Alert High-Risk Students", variant: "warning",
                      fn: () => showToast("Call your FastAPI /send-alerts endpoint here") },
                    { label: "🗑️ Clear All Suspended Accounts", variant: "danger", fn: async () => {
                      const suspended = users.filter(u => u.status === "suspended");
                      if (!suspended.length) { showToast("No suspended accounts", "danger"); return; }
                      if (!confirm(`Permanently delete ${suspended.length} suspended account(s) from Auth + Firestore?`)) return;
                      try {
                        const result = await adminAPI("DELETE", "/users/bulk-suspended");
                        addLog("Bulk delete", `${result.deleted_count} suspended accounts removed`, "suspend");
                        showToast(`${result.deleted_count} accounts fully deleted`, "danger");
                      } catch (e) {
                        showToast("Bulk delete failed: " + e.message, "danger");
                      }
                    }},
                  ].map(a => (
                    <Btn key={a.label} variant={a.variant} onClick={a.fn}>{a.label}</Btn>
                  ))}
                </div>
              </div>

              {/* Firebase Services */}
              <div style={{ background: "#0a0e18", border: "1px solid #1e2535",
                borderRadius: "14px", padding: "24px", gridColumn: "1 / -1" }}>
                <h3 style={{ margin: "0 0 20px", fontFamily: "'Sora',sans-serif",
                  fontSize: "15px", color: "#e2e8f0" }}>Firebase Services</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
                  {[
                    { name: "Authentication",     ok: true     },
                    { name: "Firestore",          ok: !loading },
                    { name: "Hosting",            ok: true     },
                    { name: "FastAPI ML Backend", ok: true     },
                  ].map(svc => (
                    <div key={svc.name} style={{ background: "#0f1117", borderRadius: "10px",
                      padding: "14px 16px", border: "1px solid #0d1320" }}>
                      <div style={{ fontSize: "13px", color: "#94a3b8",
                        fontFamily: "'DM Sans',sans-serif", marginBottom: "8px" }}>{svc.name}</div>
                      <StatusDot status={svc.ok ? "active" : "suspended"} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      {editUser    && <EditUserModal      user={editUser}   onClose={() => setEditUser(null)}   onSave={handleSaveEdit} />}
      {resetUser   && <ResetPasswordModal user={resetUser}  onClose={() => setResetUser(null)}  addLog={addLog} showToast={showToast} />}
      {deleteUser  && <DeleteConfirmModal user={deleteUser} onClose={() => setDeleteUser(null)} onConfirm={handleDelete} />}
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} addLog={addLog} showToast={showToast} />}
    </div>
  );
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500;600&display=swap');
  * { box-sizing: border-box; }
  input, select, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0f1117; }
  ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 3px; }
  @keyframes slideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes toastIn { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:translateX(0); } }
  .row-hover:hover { background: #0f1420 !important; }
`;