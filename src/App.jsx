import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const toKey = d => d.toISOString().split("T")[0];
const todayDate = () => new Date();

function getWeek(base) {
  const days = [];
  const dow = base.getDay();
  for (let i = -dow; i < 7 - dow; i++) {
    const d = new Date(base); d.setDate(d.getDate() + i); days.push(d);
  }
  return days;
}

function getHijri(date) {
  try { return date.toLocaleDateString("en-TN-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

function getHijriDay(date) {
  try {
    const parts = date.toLocaleDateString("en-TN-u-ca-islamic", { day: "numeric" });
    return parseInt(parts, 10);
  } catch { return null; }
}

// Is today Mon or Thu?
function isMonOrThu(date) {
  const d = date.getDay(); // 0=Sun,1=Mon,4=Thu
  return d === 1 || d === 4;
}

// Is today 13, 14, or 15 of Hijri month?
function isWhiteDay(date) {
  const day = getHijriDay(date);
  return day === 13 || day === 14 || day === 15;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const FARD = [
  { id: "fajr",    name: "Fajr" },
  { id: "dhuhr",   name: "Dhuhr" },
  { id: "asr",     name: "Asr" },
  { id: "maghrib", name: "Maghrib" },
  { id: "isha",    name: "Isha" },
];

const RAWATIB = {
  fajr:    [{ id: "rb_fajr_before",   label: "2 Sunnah before Fajr", hasFour: false }],
  dhuhr:   [{ id: "rb_dhuhr_before",  label: "Sunnah before Dhuhr",  hasFour: true  },
            { id: "rb_dhuhr_after",   label: "2 Sunnah after Dhuhr", hasFour: false }],
  asr:     [],
  maghrib: [{ id: "rb_maghrib_after", label: "2 Sunnah after Maghrib", hasFour: false }],
  isha:    [{ id: "rb_isha_after",    label: "2 Sunnah after Isha",    hasFour: false }],
};

const FARD_STATUSES_M = [
  { id: "not_prayed",    label: "Not prayed",       icon: "block",   bg: "#111827" },
  { id: "prayed_late",   label: "Prayed late",       icon: "late",    bg: "#e5484d" },
  { id: "prayed_ontime", label: "Prayed on time",    icon: "person",  bg: "#f5a623" },
  { id: "jamaah",        label: "Prayed in jamaah",  icon: "group",   bg: "#3ecf8e" },
];
const FARD_STATUSES_F = [
  { id: "not_prayed",    label: "Not prayed",        icon: "block",   bg: "#111827" },
  { id: "prayed_late",   label: "Prayed late",        icon: "late",    bg: "#e5484d" },
  { id: "prayed_ontime", label: "Prayed on time",     icon: "person",  bg: "#f5a623" },
  { id: "excused",       label: "Excused",            icon: "excused", bg: "#adb5bd" },
];

const RAWATIB_OPTS_2 = [
  { id: "not_prayed", label: "Not prayed", color: "#e05c5c" },
  { id: "prayed",     label: "Prayed",     color: "#22c55e" },
];
const RAWATIB_OPTS_4 = [
  { id: "not_prayed", label: "Not prayed",      color: "#e05c5c" },
  { id: "prayed",     label: "Prayed",          color: "#22c55e" },
  { id: "prayed_4",   label: "Prayed 4 rakaat", color: "#8b5cf6" },
];

const PRESET_PRAYERS  = [
  { id: "duha",     name: "Duha",     emoji: "🕌" },
  { id: "tahajjud", name: "Tahajjud", emoji: "🌙" },
  { id: "witr",     name: "Witr",     emoji: "✨" },
];
const PRESET_FASTING  = [
  { id: "fast_mon_thu", name: "Mondays & Thursdays", emoji: "📅" },
  { id: "fast_white",   name: "White days fasting",  emoji: "🌕" },
];
const PRESET_QURAN = { id: "read_quran", name: "Read Quran", emoji: "📖" };
const ALL_PRESETS  = [...PRESET_PRAYERS, ...PRESET_FASTING, PRESET_QURAN];

// ─────────────────────────────────────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────────────────────────────────────
const FajrSVG = ({ s = 32 }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
    <path d="M23 17A9 9 0 1 1 12 7a7 7 0 0 0 11 10z" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const DhuhrSVG = ({ s = 32 }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="5" stroke="#2563eb" strokeWidth="2" />
    {[[16,5,16,8],[16,24,16,27],[5,16,8,16],[24,16,27,16],[9.2,9.2,11.3,11.3],[20.7,20.7,22.8,22.8],[22.8,9.2,20.7,11.3],[11.3,20.7,9.2,22.8]].map(([x1,y1,x2,y2],i) =>
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />)}
  </svg>
);
const AsrSVG = ({ s = 32 }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="5" stroke="#2563eb" strokeWidth="2" />
    {[0,45,90,135,180,225,270,315].map((deg, i) => {
      const r = deg * Math.PI / 180;
      return <line key={i} x1={16+8*Math.cos(r)} y1={16+8*Math.sin(r)} x2={16+10.5*Math.cos(r)} y2={16+10.5*Math.sin(r)} stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />;
    })}
  </svg>
);
const MaghribSVG = ({ s = 32 }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
    <path d="M9 18a8 8 0 0 0 14 0" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
    <line x1="6" y1="18" x2="26" y2="18" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="7" x2="16" y2="10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
    <line x1="9.5" y1="9.5" x2="11.6" y2="11.6" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
    <line x1="22.5" y1="9.5" x2="20.4" y2="11.6" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IshaSVG = ({ s = 32 }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
    <path d="M21 10c-4.418 0-8 3.582-8 8s3.582 8 8 8c-4.418 0-8-3.582-8-8s3.582-8 8-8z" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
    <line x1="22" y1="7" x2="23" y2="5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="25" y1="10" x2="27" y2="9" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="24" y1="7" x2="26" y2="6" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const QuranSVG = ({ s = 32, color = "#2563eb" }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
    <path d="M7 8h7v18H7a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" stroke={color} strokeWidth="2" />
    <path d="M18 8h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7V8z" stroke={color} strokeWidth="2" />
    <line x1="14" y1="8" x2="18" y2="8" stroke={color} strokeWidth="2" />
    <line x1="14" y1="26" x2="18" y2="26" stroke={color} strokeWidth="2" />
    <line x1="16" y1="8" x2="16" y2="26" stroke={color} strokeWidth="1.5" />
  </svg>
);
const FARD_SVG = { fajr: FajrSVG, dhuhr: DhuhrSVG, asr: AsrSVG, maghrib: MaghribSVG, isha: IshaSVG };

// Status badge (right side of row)
function BadgeLarge({ icon, bg }) {
  const wrap = {
    width: 52, height: 62, background: bg,
    borderRadius: "12px 0 0 12px",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  const w = { stroke: "#fff", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" };
  if (icon === "block") return <div style={wrap}><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="9" {...w} /><line x1="7" y1="7" x2="19" y2="19" {...w} /></svg></div>;
  if (icon === "late")  return <div style={wrap}><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="9" {...w} /><path d="M13 7v6l3.5 3.5" {...w} /><path d="M4 4l4 4" {...w} /></svg></div>;
  if (icon === "person")return <div style={wrap}><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="9" r="4" fill="#fff" /><path d="M5 23c0-4 3-7 8-7s8 3 8 7" fill="#fff" /></svg></div>;
  if (icon === "group") return <div style={wrap}><svg width="30" height="26" viewBox="0 0 30 26" fill="none"><circle cx="7" cy="8" r="3.5" fill="#fff" /><circle cx="15" cy="7" r="3.5" fill="#fff" /><circle cx="23" cy="8" r="3.5" fill="#fff" /><path d="M1 24c0-3 2-5 6-5h16c4 0 6 2 6 5" fill="#fff" /></svg></div>;
  if (icon === "excused")return <div style={wrap}><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="9" {...w} /><path d="M9 13c0 2.2 1.8 4 4 4" {...w} /></svg></div>;
  if (icon === "masjid") return <div style={wrap}><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M13 3c-2 0-3 1.5-3 3v1H7v2h1v11h10V9h1V7h-3V6c0-1.5-1-3-3-3z" fill="#fff"/><path d="M10 9h6v10H10z" fill="#2563eb"/><path d="M12 9v10M14 9v10" stroke="#fff" strokeWidth="0.8"/><circle cx="13" cy="6" r="1.5" fill="#2563eb"/></svg></div>;
  return <div style={wrap} />;
}

function BadgeSmall({ icon, bg }) {
  const s = { width: 32, height: 32, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  const w = { stroke: "#fff", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" };
  if (icon === "block")  return <div style={s}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" {...w} /><line x1="4" y1="4" x2="12" y2="12" {...w} /></svg></div>;
  if (icon === "late")   return <div style={s}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" {...w} /><path d="M8 4v4l2.5 2.5" {...w} /></svg></div>;
  if (icon === "person") return <div style={s}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" fill="#fff" /><path d="M3 15c0-3 2-5 5-5s5 2 5 5" fill="#fff" /></svg></div>;
  if (icon === "group")  return <div style={s}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4.5" cy="5" r="2" fill="#fff" /><circle cx="8" cy="4.5" r="2" fill="#fff" /><circle cx="11.5" cy="5" r="2" fill="#fff" /><path d="M1 15c0-2 1.5-3.5 3.5-3.5h7C13.5 11.5 15 13 15 15" fill="#fff" /></svg></div>;
  if (icon === "excused")return <div style={s}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" {...w} /><path d="M5.5 8c0 1.38 1.12 2.5 2.5 2.5" {...w} /></svg></div>;
  if (icon === "masjid") return <div style={s}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2c-1.2 0-2 1-2 2v1H4v1.5h.5V14h7V6.5H12V5h-2V4c0-1-0.8-2-2-2z" fill="#fff"/><circle cx="8" cy="4" r="1" fill="#2563eb"/></svg></div>;
  return <div style={s} />;
}

function XSvg({ color = "#e05c5c" }) { return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="5" y1="5" x2="17" y2="17" stroke={color} strokeWidth="2.5" strokeLinecap="round" /><line x1="17" y1="5" x2="5" y2="17" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></svg>; }
function CheckSvg({ color = "#22c55e" }) { return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 12l5 5L18 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function DblCheck() { return <svg width="28" height="22" viewBox="0 0 28 22" fill="none"><path d="M2 12l5 5L17 5" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 12l5 5L25 5" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Checkmark({ color = "#2563eb" }) {
  return <div style={{ width: 20, height: 20, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────────────────────
function ModalSheet({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 420, margin: "0 auto", padding: "12px 20px 36px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: "#e5e7eb", borderRadius: 4, margin: "0 auto 16px" }} />
        {children}
      </div>
    </div>
  );
}
function FullSheet({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 420, margin: "0 auto", padding: "20px 20px 40px", maxHeight: "94vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
function OptionList({ children }) {
  return <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 18, overflow: "hidden", marginBottom: 14 }}>{children}</div>;
}
function OptionRow({ children, onClick, selected, last, selBg }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: last ? "none" : "1px solid #f3f4f6", cursor: "pointer", background: selected ? (selBg || "#f0f7ff") : "transparent", transition: "background 0.15s" }}>
      {children}
    </div>
  );
}
function SaveBtn({ onClick, label = "Save" }) {
  return <button onClick={onClick} style={{ width: "100%", padding: "14px", borderRadius: 14, background: "#2563eb", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 6 }}>{label}</button>;
}
function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase", padding: "4px 4px 8px" }}>{children}</div>;
}
function SectionTitle({ children }) {
  return <div style={{ textAlign: "center", fontSize: 16, fontWeight: 600, color: "#111827", padding: "6px 0 10px" }}>{children}</div>;
}
function ArrowRight() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PeriodFilter({ value, onChange }) {
  const opts = [
    { id:"weeks",  label:"Weeks"    },
    { id:"months", label:"Months"   },
    { id:"years",  label:"Years"    },
    { id:"all",    label:"All time" },
  ];
  return (
    <div style={{ display:"flex", background:"#f3f4f6", borderRadius:12, padding:3, gap:2, marginBottom:8 }}>
      {opts.map(o=>(
        <button key={o.id} onClick={()=>onChange(o.id)}
          style={{ flex:1, padding:"8px 4px", borderRadius:9, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
            background: value===o.id?"#fff":"transparent",
            color: value===o.id?"#111827":"#9ca3af",
            boxShadow: value===o.id?"0 1px 4px rgba(0,0,0,0.1)":"none",
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PeriodNav({ period, label, index, total, onPrev, onNext }) {
  if (period === "all" || total <= 1) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:"8px 12px" }}>
      <button onClick={onNext} disabled={index >= total-1}
        style={{ background:"none", border:"none", fontSize:20, cursor:index>=total-1?"default":"pointer", color:index>=total-1?"#d1d5db":"#2563eb", fontWeight:700, padding:"0 4px" }}>‹</button>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#111827" }}>{label}</div>
        <div style={{ fontSize:10, color:"#9ca3af", marginTop:1 }}>{total - index} of {total}</div>
      </div>
      <button onClick={onPrev} disabled={index <= 0}
        style={{ background:"none", border:"none", fontSize:20, cursor:index<=0?"default":"pointer", color:index<=0?"#d1d5db":"#2563eb", fontWeight:700, padding:"0 4px" }}>›</button>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getUsers() {
  try { return JSON.parse(localStorage.getItem("dd_users") || "{}"); } catch { return {}; }
}
function saveUsers(users) {
  try { localStorage.setItem("dd_users", JSON.stringify(users)); } catch {}
}
function getUserKey(username) { return `dd_user_${username}`; }

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [screen,   setScreen]   = useState("home");   // home | login | create
  const [username, setUsername] = useState("");
  const [pin,      setPin]      = useState("");
  const [pin2,     setPin2]     = useState("");        // confirm pin
  const [error,    setError]    = useState("");
  const [showPin,  setShowPin]  = useState(false);

  const PinDots = ({ value, max=4 }) => (
    <div style={{ display:"flex", justifyContent:"center", gap:12, margin:"20px 0" }}>
      {Array.from({length:max}).map((_,i)=>(
        <div key={i} style={{ width:16, height:16, borderRadius:"50%",
          background: i<value.length ? "#2563eb" : "#e5e7eb",
          transition:"background 0.15s" }}/>
      ))}
    </div>
  );

  const PinPad = ({ value, onChange, max=4 }) => {
    const press = (v) => { if(value.length < max) onChange(value+v); };
    const del   = () => onChange(value.slice(0,-1));
    const btns  = [1,2,3,4,5,6,7,8,9,"",0,"⌫"];
    return (
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, maxWidth:260, margin:"0 auto" }}>
        {btns.map((b,i)=>(
          b==="" ? <div key={i}/> :
          <button key={i} onClick={()=>b==="⌫"?del():press(String(b))}
            style={{ padding:"16px 0", borderRadius:14, border:"1px solid #e5e7eb",
              background:b==="⌫"?"#fef2f2":"#fff", fontSize:b==="⌫"?20:22,
              fontWeight:700, color:b==="⌫"?"#e05c5c":"#111827", cursor:"pointer",
              boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
            {b}
          </button>
        ))}
      </div>
    );
  };

  const handleLogin = () => {
    setError("");
    const users = getUsers();
    const u = username.trim().toLowerCase();
    if (!u) { setError("Please enter a username"); return; }
    if (!users[u]) { setError("Username not found"); return; }
    if (users[u].pin !== pin) { setError("Incorrect PIN"); return; }
    onLogin({ username: u, isGuest: false });
  };

  const handleCreate = () => {
    setError("");
    const users = getUsers();
    const u = username.trim().toLowerCase();
    if (!u || u.length < 2) { setError("Username must be at least 2 characters"); return; }
    if (users[u]) { setError("Username already taken"); return; }
    if (pin.length !== 4) { setError("PIN must be 4 digits"); return; }
    if (pin !== pin2) { setError("PINs do not match"); return; }
    users[u] = { pin, createdAt: new Date().toISOString() };
    saveUsers(users);
    onLogin({ username: u, isGuest: false });
  };

  // ── Home screen ──────────────────────────────────────────────────────
  if (screen === "home") return (
    <div style={{ minHeight:"100vh", maxWidth:420, margin:"0 auto",
      background:"linear-gradient(160deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"40px 24px" }}>
      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <div style={{ fontSize:64, marginBottom:12 }}>🕌</div>
        <div style={{ fontSize:28, fontWeight:900, color:"#fff", letterSpacing:-0.5 }}>Daily Deeds</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.7)", marginTop:6 }}>Prayer & Deeds Tracker</div>
      </div>

      {/* Buttons */}
      <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:12 }}>
        <button onClick={()=>setScreen("create")} style={{ padding:"16px", borderRadius:16,
          background:"#fff", border:"none", fontSize:16, fontWeight:800, color:"#2563eb",
          cursor:"pointer", boxShadow:"0 4px 16px rgba(0,0,0,0.15)" }}>
          Create Account
        </button>
        <button onClick={()=>setScreen("login")} style={{ padding:"16px", borderRadius:16,
          background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.4)",
          fontSize:16, fontWeight:700, color:"#fff", cursor:"pointer" }}>
          Login
        </button>
        <button onClick={()=>onLogin({username:"guest",isGuest:true})} style={{ padding:"14px",
          borderRadius:16, background:"transparent", border:"none",
          fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.6)", cursor:"pointer" }}>
          Continue as Guest
        </button>
      </div>

      <div style={{ position:"absolute", bottom:24, fontSize:11, color:"rgba(255,255,255,0.4)" }}>
        v5.0 · Personal use only
      </div>
    </div>
  );

  // ── Login screen ─────────────────────────────────────────────────────
  if (screen === "login") return (
    <div style={{ minHeight:"100vh", maxWidth:420, margin:"0 auto", background:"#fff", padding:"0 0 40px" }}>
      <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", padding:"48px 24px 28px", textAlign:"center" }}>
        <button onClick={()=>{setScreen("home");setError("");setPin("");setUsername("");}}
          style={{ position:"absolute", left:20, top:52, background:"rgba(255,255,255,0.2)",
            border:"none", borderRadius:10, padding:"6px 12px", color:"#fff", fontSize:13,
            fontWeight:600, cursor:"pointer" }}>‹ Back</button>
        <div style={{ fontSize:36, marginBottom:8 }}>🔐</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#fff" }}>Welcome back</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", marginTop:4 }}>Enter your username and PIN</div>
      </div>

      <div style={{ padding:"24px 20px" }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Username</div>
          <input value={username} onChange={e=>setUsername(e.target.value)}
            placeholder="your username"
            style={{ width:"100%", background:"#f9fafb", border:"1.5px solid #e5e7eb",
              borderRadius:12, padding:"13px 16px", fontSize:15, color:"#111827", outline:"none" }}/>
        </div>

        <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, marginBottom:0 }}>PIN</div>
        <PinDots value={pin}/>
        <PinPad value={pin} onChange={setPin}/>

        {error && <div style={{ color:"#e05c5c", fontSize:13, fontWeight:600, textAlign:"center", margin:"12px 0" }}>{error}</div>}

        <button onClick={handleLogin} style={{ width:"100%", padding:"15px", borderRadius:14,
          background:"#2563eb", border:"none", color:"#fff", fontSize:16, fontWeight:800,
          cursor:"pointer", marginTop:20 }}>Login</button>

        <button onClick={()=>{setScreen("create");setError("");setPin("");}}
          style={{ width:"100%", padding:"12px", borderRadius:14, background:"transparent",
            border:"none", color:"#6b7280", fontSize:13, fontWeight:600, cursor:"pointer", marginTop:8 }}>
          Don't have an account? Create one
        </button>
      </div>
    </div>
  );

  // ── Create account ───────────────────────────────────────────────────
  const createStep = pin.length === 4 && pin2.length === 0 ? "confirm" : pin2.length > 0 ? "confirm" : "create";
  return (
    <div style={{ minHeight:"100vh", maxWidth:420, margin:"0 auto", background:"#fff", padding:"0 0 40px" }}>
      <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", padding:"48px 24px 28px", textAlign:"center" }}>
        <button onClick={()=>{setScreen("home");setError("");setPin("");setPin2("");setUsername("");}}
          style={{ position:"absolute", left:20, top:52, background:"rgba(255,255,255,0.2)",
            border:"none", borderRadius:10, padding:"6px 12px", color:"#fff", fontSize:13,
            fontWeight:600, cursor:"pointer" }}>‹ Back</button>
        <div style={{ fontSize:36, marginBottom:8 }}>✨</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#fff" }}>Create Account</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", marginTop:4 }}>No email required</div>
      </div>

      <div style={{ padding:"24px 20px" }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Username</div>
          <input value={username} onChange={e=>setUsername(e.target.value)}
            placeholder="choose a username"
            style={{ width:"100%", background:"#f9fafb", border:"1.5px solid #e5e7eb",
              borderRadius:12, padding:"13px 16px", fontSize:15, color:"#111827", outline:"none" }}/>
        </div>

        {pin.length < 4 ? (
          <>
            <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1 }}>Choose a 4-digit PIN</div>
            <PinDots value={pin}/>
            <PinPad value={pin} onChange={setPin}/>
          </>
        ) : (
          <>
            <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1 }}>Confirm your PIN</div>
            <PinDots value={pin2}/>
            <PinPad value={pin2} onChange={setPin2}/>
          </>
        )}

        {error && <div style={{ color:"#e05c5c", fontSize:13, fontWeight:600, textAlign:"center", margin:"12px 0" }}>{error}</div>}

        {pin.length === 4 && pin2.length === 4 && (
          <button onClick={handleCreate} style={{ width:"100%", padding:"15px", borderRadius:14,
            background:"#2563eb", border:"none", color:"#fff", fontSize:16, fontWeight:800,
            cursor:"pointer", marginTop:16 }}>Create Account</button>
        )}

        {pin.length === 4 && pin2.length === 0 && (
          <button onClick={()=>setPin("")} style={{ width:"100%", padding:"12px", borderRadius:14,
            background:"#fef2f2", border:"1px solid #fecaca", color:"#e05c5c",
            fontSize:13, fontWeight:600, cursor:"pointer", marginTop:16 }}>
            ← Change PIN
          </button>
        )}

        <button onClick={()=>{setScreen("login");setError("");setPin("");setPin2("");}}
          style={{ width:"100%", padding:"12px", borderRadius:14, background:"transparent",
            border:"none", color:"#6b7280", fontSize:13, fontWeight:600, cursor:"pointer", marginTop:8 }}>
          Already have an account? Login
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const WEEKLY_MAX = 217;

const SCORE_TABLE_MALE = {
  soft:   { normal:{masjid:5,jamaah:3,prayed_ontime:1,prayed_late:0, not_prayed:-1,excused:0}, heavy:{masjid:8,jamaah:5,prayed_ontime:2,prayed_late:-1,not_prayed:-3,excused:0} },
  medium: { normal:{masjid:5,jamaah:3,prayed_ontime:1,prayed_late:0, not_prayed:-2,excused:0}, heavy:{masjid:8,jamaah:5,prayed_ontime:2,prayed_late:-2,not_prayed:-5,excused:0} },
  hard:   { normal:{masjid:5,jamaah:3,prayed_ontime:1,prayed_late:0, not_prayed:-3,excused:0}, heavy:{masjid:8,jamaah:5,prayed_ontime:2,prayed_late:-3,not_prayed:-7,excused:0} },
};
const SCORE_TABLE_FEMALE = {
  soft:   { normal:{prayed_ontime:3,prayed_late:-1,not_prayed:-1,excused:1}, heavy:{prayed_ontime:5,prayed_late:-2,not_prayed:-3,excused:1} },
  medium: { normal:{prayed_ontime:3,prayed_late:-2,not_prayed:-2,excused:1}, heavy:{prayed_ontime:5,prayed_late:-4,not_prayed:-5,excused:1} },
  hard:   { normal:{prayed_ontime:3,prayed_late:-3,not_prayed:-3,excused:1}, heavy:{prayed_ontime:5,prayed_late:-6,not_prayed:-7,excused:1} },
};
const WEEKLY_MAX_MALE   = 217;
const WEEKLY_MAX_FEMALE = 105;
const HEAVY_PRAYERS = ["fajr","asr"];

function getPrayerScore(prayerId, statusId, difficulty, gender) {
  if (!statusId || !difficulty) return 0;
  const table = gender === "female" ? SCORE_TABLE_FEMALE[difficulty] : SCORE_TABLE_MALE[difficulty];
  const row = HEAVY_PRAYERS.includes(prayerId) ? table.heavy : table.normal;
  return row[statusId] ?? 0;
}

function getWeeklyMax(gender) {
  return gender === "female" ? WEEKLY_MAX_FEMALE : WEEKLY_MAX_MALE;
}

function getWeekScoreData(logs, difficulty, weekStartDate, gender) {
  const days = [];
  for (let i=0;i<7;i++) { const d=new Date(weekStartDate); d.setDate(d.getDate()+i); days.push(toKey(d)); }
  let total=0;
  days.forEach(k => {
    FARD.forEach(p => {
      const s = logs[k]?.[p.id];
      total += getPrayerScore(p.id, s, difficulty, gender);
    });
  });
  const max = getWeeklyMax(gender);
  return { score:total, max };
}

// Score preview data for a given prayer, difficulty, gender
function getScorePreview(prayerId, difficulty, gender) {
  const isHeavy = HEAVY_PRAYERS.includes(prayerId);
  const table = gender === "female" ? SCORE_TABLE_FEMALE[difficulty] : SCORE_TABLE_MALE[difficulty];
  const row = isHeavy ? table.heavy : table.normal;
  return row;
}

function getZone(score, max) {
  const pct = max>0 ? Math.round((score/max)*100) : 0;
  if (pct>=78)   return {label:"Elite",    emoji:"🏆",color:"#f59e0b",bg:"#fffbeb",border:"#fde68a",pct};
  if (pct>=46)   return {label:"Strong",   emoji:"✅",color:"#22c55e",bg:"#f0fdf4",border:"#bbf7d0",pct};
  if (pct>=18)   return {label:"Building", emoji:"🟡",color:"#f97316",bg:"#fff7ed",border:"#fed7aa",pct};
  if (score>=0)  return {label:"Danger",   emoji:"🟠",color:"#ef4444",bg:"#fef2f2",border:"#fecaca",pct};
  return               {label:"Critical",  emoji:"🔴",color:"#991b1b",bg:"#fff1f2",border:"#f87171",pct};
}

const ASR_HADITH  = "من فاتته صلاة العصر فكأنما وُتِر أهله وماله";
const FAJR_HADITH = "ركعتا الفجر خير من الدنيا وما فيها";

const FARD_STATUSES_M_FULL = [
  {id:"not_prayed",    label:"Not prayed",       icon:"block",  bg:"#111827"},
  {id:"prayed_late",   label:"Prayed late",       icon:"late",   bg:"#e5484d"},
  {id:"prayed_ontime", label:"Prayed on time",    icon:"person", bg:"#f5a623"},
  {id:"jamaah",        label:"Prayed in jamaah",  icon:"group",  bg:"#3ecf8e"},
  {id:"masjid",        label:"Prayed in masjid",  icon:"masjid", bg:"#2563eb"},
];
const FARD_STATUSES_F_FULL = [
  {id:"not_prayed",    label:"Not prayed",        icon:"block",  bg:"#111827"},
  {id:"prayed_late",   label:"Prayed late",        icon:"late",   bg:"#e5484d"},
  {id:"prayed_ontime", label:"Prayed on time",     icon:"person", bg:"#f5a623"},
  {id:"excused",       label:"Excused",            icon:"excused",bg:"#adb5bd"},
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
function AppShell() {
  const [authUser, setAuthUser] = useState(null); // null | {username, isGuest}

  // Check for saved session
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dd_session");
      if (saved) setAuthUser(JSON.parse(saved));
    } catch {}
  }, []);

  const handleLogin = (user) => {
    setAuthUser(user);
    if (!user.isGuest) {
      try { localStorage.setItem("dd_session", JSON.stringify(user)); } catch {}
    }
  };

  const handleLogout = () => {
    try { localStorage.removeItem("dd_session"); } catch {}
    setAuthUser(null);
  };

  if (!authUser) return <LoginScreen onLogin={handleLogin}/>;
  return <App authUser={authUser} onLogout={handleLogout}/>;
}

export default AppShell;

function App({ authUser, onLogout }) {
  // Storage prefix per user
  const pfx = authUser.isGuest ? "dd4" : `dd4_${authUser.username}`;

  const [selDate, setSelDate]       = useState(todayDate());
  const [logs, setLogs]             = useState({});
  const [gender, setGender]         = useState("male");
  const [tab, setTab]               = useState("deeds");
  const [activeDeeds, setActiveDeeds] = useState([]);
  const [modal, setModal]           = useState(null); // {type, id}
  const [addFlow, setAddFlow]       = useState(null); // null | "pick" | "quran_config"
  const [quranGoal, setQuranGoal]   = useState(10);
  const [quranUnit, setQuranUnit]   = useState("pages");
  const [quranFreq, setQuranFreq]   = useState([0,1,2,3,4,5,6]);

  useEffect(() => {
    try {
      const l  = localStorage.getItem(`${pfx}_logs`);  if (l)  setLogs(JSON.parse(l));
      const g  = localStorage.getItem(`${pfx}_gender`); if (g)  setGender(g);
      const d  = localStorage.getItem(`${pfx}_deeds`);  if (d)  setActiveDeeds(JSON.parse(d));
      const qg = localStorage.getItem(`${pfx}_qgoal`);  if (qg) setQuranGoal(Number(qg));
      const qu = localStorage.getItem(`${pfx}_qunit`);  if (qu) setQuranUnit(qu);
      const qf = localStorage.getItem(`${pfx}_qfreq`);  if (qf) setQuranFreq(JSON.parse(qf));
    } catch {}
  }, []);

  const persist = (l, g, d, qg, qu, qf) => {
    try {
      localStorage.setItem(`${pfx}_logs`,   JSON.stringify(l));
      localStorage.setItem(`${pfx}_gender`, g);
      localStorage.setItem(`${pfx}_deeds`,  JSON.stringify(d));
      localStorage.setItem(`${pfx}_qgoal`,  qg);
      localStorage.setItem(`${pfx}_qunit`,  qu);
      localStorage.setItem(`${pfx}_qfreq`,  JSON.stringify(qf));
    } catch {}
  };

  const dateKey  = toKey(selDate);
  const todayKey = toKey(todayDate());
  const dayLog   = logs[dateKey] || {};
  const hijri    = getHijri(selDate);
  const week     = getWeek(selDate);
  const fardStat = gender === "male" ? FARD_STATUSES_M_FULL : FARD_STATUSES_F_FULL;

  // Challenge state
  const [challengeOn,    setChallengeOn]    = useState(false);
  const [difficulty,     setDifficulty]     = useState("soft");
  const [challengeStart, setChallengeStart] = useState(null);
  const [showHadith,     setShowHadith]     = useState(null); // {prayer, hadith}

  useEffect(() => {
    try {
      const co=localStorage.getItem(`${pfx}_con`); if(co) setChallengeOn(JSON.parse(co));
      const df=localStorage.getItem(`${pfx}_dif`); if(df) setDifficulty(df);
      const cs=localStorage.getItem(`${pfx}_cs`);  if(cs) setChallengeStart(cs);
    } catch {}
  }, []);

  const persistChallenge = (on, diff, start) => {
    try {
      localStorage.setItem(`${pfx}_con`, JSON.stringify(on));
      localStorage.setItem(`${pfx}_dif`, diff);
      localStorage.setItem(`${pfx}_cs`,  start||"");
    } catch {}
  };

  const setVal = (field, value) => {
    const updated = { ...logs, [dateKey]: { ...dayLog, [field]: value } };
    setLogs(updated);
    persist(updated, gender, activeDeeds, quranGoal, quranUnit, quranFreq);
    // Hadith alert for missed Fajr/Asr
    if (challengeOn && HEAVY_PRAYERS.includes(field) && (value === "not_prayed" || value === "prayed_late")) {
      const hadith = field === "fajr" ? FAJR_HADITH : ASR_HADITH;
      setShowHadith({ prayer: field, hadith, status: value });
    }
  };

  const addDeed = id => {
    if (activeDeeds.includes(id)) return;
    const updated = [...activeDeeds, id];
    setActiveDeeds(updated);
    persist(logs, gender, updated, quranGoal, quranUnit, quranFreq);
  };
  const removeDeed = id => {
    const updated = activeDeeds.filter(d => d !== id);
    setActiveDeeds(updated);
    persist(logs, gender, updated, quranGoal, quranUnit, quranFreq);
  };

  // ── Availability checks ───────────────────────────────────────────────
  const monThuAvailable  = isMonOrThu(selDate);
  const whiteDayAvailable = isWhiteDay(selDate);

  // ── Prayer row ────────────────────────────────────────────────────────
  const PrayerRow = ({ prayerId }) => {
    const SVG = FARD_SVG[prayerId];
    const statusId = dayLog[prayerId] || null;
    const st = fardStat.find(s => s.id === statusId);
    // Glow color per status
    const GLOW = { masjid:"rgba(37,99,235,0.25)", jamaah:"rgba(62,207,142,0.25)", prayed_ontime:"rgba(245,166,35,0.2)", prayed_late:"rgba(229,72,77,0.2)", not_prayed:"rgba(17,24,39,0.15)", excused:"rgba(173,181,189,0.2)" };
    const glowColor = statusId ? GLOW[statusId] : null;
    const borderColor = statusId ? st?.bg+"55" : "#e5e7eb";
    return (
      <div onClick={() => setModal({ type: "fard", id: prayerId })}
        style={{ display: "flex", alignItems: "center", background: "#fff", border: `1px solid ${borderColor}`, borderRadius: 16, marginBottom: 8, cursor: "pointer", overflow: "hidden", minHeight: 62,
          boxShadow: glowColor ? `0 4px 20px ${glowColor}, 0 1px 4px rgba(0,0,0,0.04)` : "0 1px 3px rgba(0,0,0,0.04)",
          transition: "box-shadow 0.3s ease, border-color 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", flex: 1, padding: "0 14px" }}>
          <SVG /><span style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginLeft: 12 }}>{FARD.find(f => f.id === prayerId).name}</span>
        </div>
        {st
          ? <BadgeLarge icon={st.icon} bg={st.bg} />
          : <div style={{ width: 52, height: 62, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.2 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 9h8M13 9l-3-3M13 9l-3 3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="1" y="1" width="16" height="16" rx="5" stroke="#6b7280" strokeWidth="1.5" /></svg>
            </div>
        }
      </div>
    );
  };

  // ── Optional deed row ─────────────────────────────────────────────────
  const OptRow = ({ id }) => {
    const preset = ALL_PRESETS.find(p => p.id === id);
    if (!preset) return null;

    const isQuran    = id === "read_quran";
    const isMonThu   = id === "fast_mon_thu";
    const isWhite    = id === "fast_white";
    const val        = dayLog[id];

    // Lock notice
    let lockMsg = null;
    if (isMonThu && !monThuAvailable)   lockMsg = "Available Mon & Thu only";
    if (isWhite  && !whiteDayAvailable) lockMsg = "Available on Hijri 13–15 only";

    let badge = null;
    if (isQuran && val != null && val > 0) {
      badge = <div style={{ background: "#eff6ff", borderRadius: "12px 0 0 12px", padding: "0 14px", height: 62, display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, color: "#2563eb", whiteSpace: "nowrap" }}>{val}/{quranGoal} {quranUnit}</div>;
    } else if (!isQuran && val === "done") {
      badge = <div style={{ background: "#3ecf8e", borderRadius: "12px 0 0 12px", width: 52, height: 62, display: "flex", alignItems: "center", justifyContent: "center" }}><CheckSvg color="#fff" /></div>;
    } else if (!isQuran && val === "not_done") {
      badge = <div style={{ background: "#e5484d", borderRadius: "12px 0 0 12px", width: 52, height: 62, display: "flex", alignItems: "center", justifyContent: "center" }}><XSvg color="#fff" /></div>;
    }

    return (
      <div onClick={() => {
          if (lockMsg) return;
          setModal({ type: isQuran ? "quran" : "optional", id });
        }}
        style={{ display: "flex", alignItems: "center", background: lockMsg ? "#f9fafb" : "#fff", border: "1px solid #e5e7eb", borderRadius: 16, marginBottom: 8, overflow: "hidden", minHeight: 62, cursor: lockMsg ? "default" : "pointer", opacity: lockMsg ? 0.6 : 1 }}>
        <div style={{ display: "flex", alignItems: "center", flex: 1, padding: "0 14px" }}>
          <span style={{ fontSize: 24, width: 32, textAlign: "center" }}>{preset.emoji}</span>
          <div style={{ marginLeft: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{preset.name}</div>
            {lockMsg && <div style={{ fontSize: 11, color: "#f97316", fontWeight: 600, marginTop: 2 }}>🔒 {lockMsg}</div>}
          </div>
        </div>
        {!lockMsg && (badge || (
          <div style={{ width: 52, height: 62, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.2 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 9h8M13 9l-3-3M13 9l-3 3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="1" y="1" width="16" height="16" rx="5" stroke="#6b7280" strokeWidth="1.5" /></svg>
          </div>
        ))}
      </div>
    );
  };

  // ── Fard modal ────────────────────────────────────────────────────────
  const FardModal = () => {
    if (!modal || modal.type !== "fard") return null;
    const prayer = FARD.find(p => p.id === modal.id);
    const SVG = FARD_SVG[modal.id];
    const rawatibs = RAWATIB[modal.id] || [];
    return (
      <ModalSheet onClose={() => setModal(null)}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><SVG s={40} /></div>
        <div style={{ textAlign: "center", fontSize: 19, fontWeight: 700, color: "#111827", marginBottom: 16 }}>How did you pray {prayer.name} today?</div>
        <OptionList>
          {fardStat.map((s, i) => {
            const sel = dayLog[modal.id] === s.id;
            return (
              <OptionRow key={s.id} last={i === fardStat.length - 1} onClick={() => setVal(modal.id, s.id)} selected={sel}>
                <BadgeSmall icon={s.icon} bg={s.bg} />
                <span style={{ flex: 1, fontSize: 16, fontWeight: sel ? 700 : 400, color: "#111827" }}>{s.label}</span>
                {sel && <Checkmark color={s.bg} />}
              </OptionRow>
            );
          })}
        </OptionList>
        {rawatibs.map(rb => (
          <div key={rb.id}>
            <SectionTitle>{rb.label}</SectionTitle>
            <OptionList>
              {(rb.hasFour ? RAWATIB_OPTS_4 : RAWATIB_OPTS_2).map((o, i, arr) => {
                const sel = dayLog[rb.id] === o.id;
                return (
                  <OptionRow key={o.id} last={i === arr.length - 1} onClick={() => setVal(rb.id, o.id)} selected={sel} selBg={o.id === "not_prayed" ? "#fef2f2" : o.id === "prayed_4" ? "#faf5ff" : "#f0fdf4"}>
                    {o.id === "not_prayed" && <XSvg />}
                    {o.id === "prayed"     && <CheckSvg />}
                    {o.id === "prayed_4"   && <DblCheck />}
                    <span style={{ flex: 1, fontSize: 16, fontWeight: sel ? 700 : 400, color: o.color }}>{o.label}</span>
                    {sel && <Checkmark color={o.color} />}
                  </OptionRow>
                );
              })}
            </OptionList>
          </div>
        ))}
        <SaveBtn onClick={() => setModal(null)} />
      </ModalSheet>
    );
  };

  // ── Optional modal ────────────────────────────────────────────────────
  const OptModal = () => {
    if (!modal || modal.type !== "optional") return null;
    const preset = ALL_PRESETS.find(p => p.id === modal.id);
    if (!preset) return null;
    return (
      <ModalSheet onClose={() => setModal(null)}>
        <div style={{ textAlign: "center", fontSize: 28, marginBottom: 4 }}>{preset.emoji}</div>
        <div style={{ textAlign: "center", fontSize: 19, fontWeight: 700, color: "#111827", marginBottom: 16 }}>{preset.name}</div>
        <OptionList>
          {[{ id: "not_done", label: "Not done" }, { id: "done", label: "Done" }].map((o, i) => {
            const sel = dayLog[modal.id] === o.id;
            const good = o.id === "done";
            return (
              <OptionRow key={o.id} last={i === 1} onClick={() => setVal(modal.id, o.id)} selected={sel} selBg={good ? "#f0fdf4" : "#fef2f2"}>
                {good ? <CheckSvg /> : <XSvg />}
                <span style={{ flex: 1, fontSize: 16, fontWeight: sel ? 700 : 400, color: good ? "#22c55e" : "#e05c5c" }}>{o.label}</span>
                {sel && <Checkmark color={good ? "#22c55e" : "#e05c5c"} />}
              </OptionRow>
            );
          })}
        </OptionList>
        <SaveBtn onClick={() => setModal(null)} />
      </ModalSheet>
    );
  };

  // ── Quran logging modal ───────────────────────────────────────────────
  const QuranLogModal = () => {
    if (!modal || modal.type !== "quran") return null;
    const current = dayLog["read_quran"] || 0;
    const [val, setLocalVal]   = useState(current);
    const [mode, setMode]      = useState("slider"); // "slider" | "input"
    const [inputStr, setInputStr] = useState(String(current));

    const applyInput = () => {
      const n = parseInt(inputStr, 10);
      if (!isNaN(n) && n >= 0) setLocalVal(Math.min(n, quranGoal * 10));
    };

    return (
      <ModalSheet onClose={() => setModal(null)}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><QuranSVG s={48} /></div>
        <div style={{ textAlign: "center", fontSize: 19, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Read Quran</div>

        {/* Mode toggle */}
        <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 }}>
          {["slider", "input"].map(m => (
            <button key={m} onClick={() => {
              setMode(m);
              if (m === "input") setInputStr(String(val));
            }} style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: mode === m ? "#fff" : "transparent", color: mode === m ? "#111827" : "#9ca3af", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {m === "slider" ? "🎚 Slider" : "⌨️ Type"}
            </button>
          ))}
        </div>

        {mode === "slider" ? (
          <>
            <input type="range" min={0} max={quranGoal} value={val}
              onChange={e => setLocalVal(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#2563eb", marginBottom: 6 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b7280", marginBottom: 14 }}>
              <span>0</span>
              <span style={{ fontWeight: 700, color: "#2563eb" }}>{val} {quranUnit}</span>
              <span>{quranGoal}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {[1, 3, 5].map(n => (
                <button key={n} onClick={() => setLocalVal(Math.min(quranGoal, val + n))}
                  style={{ flex: 1, padding: "12px 0", background: "#eff6ff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#2563eb", cursor: "pointer" }}>+{n}</button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Enter number of {quranUnit}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number" min={0} max={quranGoal * 10}
                value={inputStr}
                onChange={e => setInputStr(e.target.value)}
                onBlur={applyInput}
                style={{ flex: 1, background: "#f3f4f6", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", fontSize: 22, fontWeight: 800, color: "#111827", outline: "none", textAlign: "center" }}
              />
              <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 600 }}>{quranUnit}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {[1, 2, 5, 10].map(n => (
                <button key={n} onClick={() => {
                  const cur = parseInt(inputStr, 10) || 0;
                  const next = cur + n;
                  setInputStr(String(next));
                  setLocalVal(next);
                }} style={{ flex: 1, padding: "10px 0", background: "#eff6ff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#2563eb", cursor: "pointer" }}>+{n}</button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: quranGoal > 0 ? "#22c55e" : "#9ca3af", fontWeight: 600, textAlign: "center" }}>
              {(() => {
                const cur = parseInt(inputStr, 10) || 0;
                const pct = Math.min(100, Math.round((cur / quranGoal) * 100));
                return `${pct}% of goal (${quranGoal} ${quranUnit})`;
              })()}
            </div>
          </div>
        )}

        <SaveBtn onClick={() => {
          const finalVal = mode === "input" ? (parseInt(inputStr, 10) || 0) : val;
          setVal("read_quran", finalVal);
          setModal(null);
        }} />
      </ModalSheet>
    );
  };

  // ── Add flow: pick deed ───────────────────────────────────────────────
  const PickModal = () => {
    if (addFlow !== "pick") return null;
    const avail = id => !activeDeeds.includes(id);
    return (
      <FullSheet onClose={() => setAddFlow(null)}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <button onClick={() => setAddFlow(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#111827", marginRight: 8 }}>✕</button>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#111827", flex: 1, textAlign: "center", marginRight: 28 }}>New deed</span>
        </div>

        {/* Prayers */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>🕌</span> Prayers</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {PRESET_PRAYERS.map(p => (
            <button key={p.id} disabled={!avail(p.id)} onClick={() => { addDeed(p.id); setAddFlow(null); }}
              style={{ padding: "14px 12px", background: avail(p.id) ? "#fff" : "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 14, fontSize: 14, fontWeight: 600, color: avail(p.id) ? "#111827" : "#adb5bd", cursor: avail(p.id) ? "pointer" : "default", textAlign: "left" }}>
              {p.emoji} {p.name}{!avail(p.id) ? " ✓" : ""}
            </button>
          ))}
        </div>

        {/* Fasting */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>🍽️</span> Fasting</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {PRESET_FASTING.map(p => (
            <button key={p.id} disabled={!avail(p.id)} onClick={() => { addDeed(p.id); setAddFlow(null); }}
              style={{ padding: "14px 12px", background: avail(p.id) ? "#fff" : "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 14, fontSize: 13, fontWeight: 600, color: avail(p.id) ? "#111827" : "#adb5bd", cursor: avail(p.id) ? "pointer" : "default", textAlign: "left" }}>
              {p.emoji} {p.name}{!avail(p.id) ? " ✓" : ""}
            </button>
          ))}
        </div>

        {/* Learning */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>📖</span> Learning</div>
        <button disabled={!avail("read_quran")} onClick={() => avail("read_quran") && setAddFlow("quran_config")}
          style={{ width: "100%", padding: "14px 16px", background: avail("read_quran") ? "#fff" : "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 14, fontSize: 14, fontWeight: 600, color: avail("read_quran") ? "#111827" : "#adb5bd", cursor: avail("read_quran") ? "pointer" : "default", textAlign: "left" }}>
          📖 Read Quran{!avail("read_quran") ? " ✓" : ""}
        </button>
      </FullSheet>
    );
  };

  // ── Add flow: Quran config ────────────────────────────────────────────
  const QuranConfigModal = () => {
    if (addFlow !== "quran_config") return null;
    const [goal, setGoal]   = useState(quranGoal);
    const [unit, setUnit]   = useState(quranUnit);
    const [freq, setFreq]   = useState(quranFreq);
    const [goalStr, setGoalStr] = useState(String(quranGoal));
    const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const toggleDay = d => setFreq(f => f.includes(d) ? f.filter(x => x !== d) : [...f, d].sort());

    return (
      <FullSheet onClose={() => setAddFlow("pick")}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <button onClick={() => setAddFlow("pick")} style={{ background: "none", border: "none", fontSize: 15, cursor: "pointer", color: "#2563eb", fontWeight: 600 }}>‹ New deed</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700, color: "#111827", marginRight: 60 }}>Add deed</span>
        </div>

        {/* Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <QuranSVG s={36} color="#6b7280" />
          </div>
        </div>

        <input readOnly value="Read Quran" style={{ width: "100%", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 12, padding: "13px 16px", fontSize: 15, color: "#6b7280", outline: "none", marginBottom: 14 }} />

        {/* Frequency */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: "#111827" }}>📅 Frequency</div>
            <ArrowRight />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {DAYS.map((d, i) => (
              <div key={i} onClick={() => toggleDay(i)} style={{ flex: 1, paddingTop: "120%", position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", inset: 0, background: freq.includes(i) ? "#2563eb" : "#e5e7eb", borderRadius: 10, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 5, transition: "background 0.15s" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: freq.includes(i) ? "#fff" : "#9ca3af" }}>{d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goal — type number */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Daily goal</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {["pages", "verses"].map(u => (
                <button key={u} onClick={() => setUnit(u)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", background: unit === u ? "#eff6ff" : "#f3f4f6", border: `1.5px solid ${unit === u ? "#2563eb" : "#e5e7eb"}`, color: unit === u ? "#2563eb" : "#6b7280" }}>{u}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" min={1} max={999} value={goalStr}
              onChange={e => { setGoalStr(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n) && n > 0) setGoal(n); }}
              style={{ flex: 1, background: "#f3f4f6", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", fontSize: 22, fontWeight: 800, color: "#2563eb", outline: "none", textAlign: "center" }} />
            <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 600 }}>{unit} / day</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[5, 10, 20, 50].map(n => (
              <button key={n} onClick={() => { setGoal(n); setGoalStr(String(n)); }}
                style={{ flex: 1, padding: "8px 0", background: goal === n ? "#eff6ff" : "#f3f4f6", border: `1px solid ${goal === n ? "#2563eb" : "#e5e7eb"}`, borderRadius: 8, fontSize: 13, fontWeight: 700, color: goal === n ? "#2563eb" : "#6b7280", cursor: "pointer" }}>{n}</button>
            ))}
          </div>
        </div>

        <SaveBtn label="Add Deed" onClick={() => {
          setQuranGoal(goal); setQuranUnit(unit); setQuranFreq(freq);
          const updatedDeeds = [...activeDeeds.filter(d => d !== "read_quran"), "read_quran"];
          setActiveDeeds(updatedDeeds);
          persist(logs, gender, updatedDeeds, goal, unit, freq);
          setAddFlow(null);
        }} />
      </FullSheet>
    );
  };

  // ── Stats ─────────────────────────────────────────────────────────────
  const Stats = () => {
    const [statsPeriod, setStatsPeriod] = useState("all"); // weeks|months|years|all
    const [periodIndex, setPeriodIndex] = useState(0);     // 0 = most recent, 1 = one before, etc.
    const [detailView, setDetailView]   = useState(null);

    const allKeys = Object.keys(logs).sort();
    const now = new Date();

    // Build swipeable period buckets
    const getPeriodBuckets = () => {
      if (statsPeriod === "all") return [allKeys];
      const buckets = [];
      const sorted = [...allKeys].sort().reverse();
      if (statsPeriod === "weeks") {
        // Group by ISO week
        const weekMap = {};
        sorted.forEach(k => {
          const d = new Date(k);
          const startOfWeek = new Date(d);
          startOfWeek.setDate(d.getDate() - d.getDay());
          const wk = startOfWeek.toISOString().split("T")[0];
          if (!weekMap[wk]) weekMap[wk] = [];
          weekMap[wk].push(k);
        });
        Object.keys(weekMap).sort().reverse().forEach(wk => buckets.push(weekMap[wk]));
      } else if (statsPeriod === "months") {
        const monthMap = {};
        sorted.forEach(k => {
          const mo = k.slice(0, 7); // "2025-01"
          if (!monthMap[mo]) monthMap[mo] = [];
          monthMap[mo].push(k);
        });
        Object.keys(monthMap).sort().reverse().forEach(mo => buckets.push(monthMap[mo]));
      } else if (statsPeriod === "years") {
        const yearMap = {};
        sorted.forEach(k => {
          const yr = k.slice(0, 4);
          if (!yearMap[yr]) yearMap[yr] = [];
          yearMap[yr].push(k);
        });
        Object.keys(yearMap).sort().reverse().forEach(yr => buckets.push(yearMap[yr]));
      }
      return buckets.length ? buckets : [[]];
    };

    const buckets = getPeriodBuckets();
    const clampedIndex = Math.min(periodIndex, buckets.length - 1);
    const filteredKeys = buckets[clampedIndex] || [];

    // Period label for current bucket
    const getPeriodLabel = () => {
      if (statsPeriod === "all") return "All time";
      if (!filteredKeys.length) return "";
      const first = filteredKeys[filteredKeys.length - 1];
      const last  = filteredKeys[0];
      if (statsPeriod === "weeks") {
        const d = new Date(first);
        return d.toLocaleDateString("en-GB", { day:"numeric", month:"short" }) + " – " + new Date(last).toLocaleDateString("en-GB", { day:"numeric", month:"short" });
      }
      if (statsPeriod === "months") return new Date(first).toLocaleDateString("en-GB", { month:"long", year:"numeric" });
      if (statsPeriod === "years")  return first.slice(0, 4);
      return "";
    };

    const handlePeriodChange = (p) => { setStatsPeriod(p); setPeriodIndex(0); };

    const total = filteredKeys.length || 1;

    // Status counts across all fard prayers
    const statusCounts = { masjid:0, jamaah:0, prayed_ontime:0, prayed_late:0, not_prayed:0, excused:0 };
    filteredKeys.forEach(k => {
      FARD.forEach(p => {
        const s = logs[k][p.id];
        if (s && statusCounts[s] !== undefined) statusCounts[s]++;
      });
    });
    const totalFardSlots = total * 5;
    const statusPct = id => totalFardSlots ? Math.round((statusCounts[id]||0) / totalFardSlots * 100) : 0;

    // Per-prayer breakdown
    const prayerBreakdown = FARD.map(p => {
      const counts = { jamaah:0, prayed_ontime:0, prayed_late:0, not_prayed:0, excused:0 };
      filteredKeys.forEach(k => { const s = logs[k][p.id]; if (s && counts[s] !== undefined) counts[s]++; });
      return { ...p, counts, total };
    });

    // Calendar grid for fard — colored squares per day per prayer
    const STATUS_SQUARE = {
      jamaah:"#3ecf8e", prayed_ontime:"#f5a623", prayed_late:"#e5484d",
      not_prayed:"#111827", excused:"#adb5bd", default:"#e5e7eb"
    };

    // Rawatib stats
    const ALL_RB = [
      { id:"rb_fajr_before",   label:"Sunnah before Fajr" },
      { id:"rb_dhuhr_before",  label:"Sunnah before Dhuhr" },
      { id:"rb_dhuhr_after",   label:"Sunnah after Dhuhr" },
      { id:"rb_maghrib_after", label:"Sunnah after Maghrib" },
      { id:"rb_isha_after",    label:"Sunnah after Isha" },
    ];
    const rbStats = ALL_RB.map(rb => {
      const prayed  = filteredKeys.filter(k => logs[k][rb.id] && logs[k][rb.id] !== "not_prayed").length;
      const missed  = filteredKeys.filter(k => logs[k][rb.id] === "not_prayed").length;
      const pct     = total ? Math.round(prayed / total * 100) : 0;
      const missedPct = total ? Math.round(missed / total * 100) : 0;
      return { ...rb, prayed, missed, pct, missedPct };
    });

    // Deed stats for optional deeds
    const deedStatFor = id => {
      const done   = filteredKeys.filter(k => logs[k][id] === "done" || (id === "read_quran" && (logs[k][id]||0) >= quranGoal)).length;
      const missed = filteredKeys.filter(k => logs[k][id] === "not_done" || (id === "read_quran" && logs[k][id] != null && (logs[k][id]||0) < quranGoal)).length;
      const pct    = total ? Math.round(done / total * 100) : 0;
      return { done, missed, pct };
    };

    // ── Semicircle arc ──────────────────────────────────────────────────
    const Semicircle = ({ pct, color, count, label }) => {
      const r = 80, cx = 110, cy = 100;
      const startAngle = Math.PI;
      const endAngle   = Math.PI + (Math.PI * Math.min(pct, 100) / 100);
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const large = pct > 50 ? 1 : 0;
      return (
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:18, padding:"20px 16px 16px", marginBottom:12 }}>
          <svg width="100%" viewBox="0 0 220 120" style={{ overflow:"visible" }}>
            {/* track */}
            <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"/>
            {/* fill */}
            {pct > 0 && <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"/>}
          </svg>
          <div style={{ textAlign:"center", marginTop:-30 }}>
            <div style={{ fontSize:28, fontWeight:800, color:"#111827" }}>{count} times</div>
            <div style={{ fontSize:13, color:"#9ca3af", marginTop:2 }}>Since starting the deed</div>
          </div>
        </div>
      );
    };

    // ── Detail: Fard prayers ────────────────────────────────────────────
    if (detailView === "fard") {
      const daysToShow = filteredKeys.slice(-60); // last 60 logged days
      const STATUS_COL = { jamaah:"#3ecf8e", prayed_ontime:"#f5a623", prayed_late:"#e5484d", not_prayed:"#111827", excused:"#adb5bd" };
      const totalPrayed = filteredKeys.reduce((a,k)=>a+FARD.filter(p=>{const s=logs[k][p.id];return s&&s!=="not_prayed";}).length,0);
      const totalSlots  = filteredKeys.length * 5;

      return (
        <div style={{ padding:"0 16px" }}>
          <div style={{ display:"flex", alignItems:"center", marginBottom:16 }}>
            <button onClick={()=>setDetailView(null)} style={{ background:"none",border:"none",fontSize:15,cursor:"pointer",color:"#2563eb",fontWeight:600,display:"flex",alignItems:"center",gap:4 }}>‹ Stats</button>
            <span style={{ flex:1, textAlign:"center", fontSize:17, fontWeight:700, color:"#111827", marginRight:50 }}>Fard prayers</span>
          </div>

          {/* Calendar grid — columns=days, rows=prayers */}
          <div style={{ display:"flex", gap:0, marginBottom:16, overflowX:"auto" }}>
            <div style={{ flex:1, overflowX:"auto" }}>
              {/* Day numbers */}
              <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                {daysToShow.map(k=>(
                  <div key={k} style={{ minWidth:28, textAlign:"center", fontSize:9, color:"#9ca3af", fontWeight:600 }}>
                    {new Date(k).getDate()}
                  </div>
                ))}
              </div>
              {/* Prayer rows */}
              {FARD.map(p=>(
                <div key={p.id} style={{ display:"flex", gap:4, marginBottom:4 }}>
                  {daysToShow.map(k=>{
                    const s = logs[k]?.[p.id] || "default";
                    return <div key={k} style={{ minWidth:28, height:28, borderRadius:6, background:STATUS_COL[s]||"#e5e7eb" }}/>;
                  })}
                </div>
              ))}
            </div>
            {/* Prayer icons on right */}
            <div style={{ display:"flex", flexDirection:"column", gap:4, paddingTop:20, marginLeft:4 }}>
              {FARD.map(p=>{
                const SVG=FARD_SVG[p.id];
                return <div key={p.id} style={{ width:32, height:28, background:"#2563eb", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}><SVG s={16}/></div>;
              })}
            </div>
          </div>

          {/* Period filter */}
          <PeriodFilter value={statsPeriod} onChange={handlePeriodChange}/>

          {/* Status summary grid */}
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>STATUS SUMMARY</div>
          <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
            {[
              { id:"masjid",       label:"Masjid",  color:"#2563eb", icon:"masjid" },
              { id:"jamaah",       label:"Jamaah",  color:"#3ecf8e", icon:"group"  },
              { id:"prayed_ontime",label:"On time", color:"#f5a623", icon:"person" },
              { id:"prayed_late",  label:"Late",    color:"#e5484d", icon:"late"   },
              { id:"not_prayed",   label:"Missed",  color:"#111827", icon:"block"  },
            ].map(s=>{
              const count = filteredKeys.reduce((a,k)=>a+FARD.filter(p=>logs[k]?.[p.id]===s.id).length,0);
              const pct   = totalSlots ? Math.round(count/totalSlots*100) : 0;
              const bars  = Math.min(4, Math.ceil(pct/25));
              return(
                <div key={s.id} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"14px 12px", minWidth:100, flex:"0 0 auto" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                    <BadgeSmall icon={s.icon} bg={s.color}/>
                    <span style={{ fontSize:11, fontWeight:600, color:"#6b7280" }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize:24, fontWeight:900, color:"#111827" }}>{pct}%</div>
                  <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>{count}×</div>
                  <div style={{ display:"flex", gap:2, marginTop:8 }}>
                    {[0,1,2,3].map(i=><div key={i} style={{ width:16, height:5, borderRadius:3, background: i<bars ? s.color : "#e5e7eb" }}/>)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prayer summary */}
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>PRAYER SUMMARY</div>
          {prayerBreakdown.map(p=>{
            const SVG=FARD_SVG[p.id];
            const total2 = filteredKeys.length||1;
            const seg = ["jamaah","prayed_ontime","prayed_late","not_prayed"].map(sid=>({
              sid, count:p.counts[sid]||0, pct:Math.round((p.counts[sid]||0)/total2*100),
              color:STATUS_COL[sid]||"#e5e7eb",
            }));
            return(
              <div key={p.id} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"14px 14px", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <SVG s={22}/><span style={{ fontSize:16, fontWeight:700, color:"#111827" }}>{p.name}</span>
                </div>
                {/* Segmented bar */}
                <div style={{ display:"flex", gap:2, height:10, borderRadius:6, overflow:"hidden", marginBottom:8 }}>
                  {seg.map(s=>s.pct>0&&<div key={s.sid} style={{ flex:s.pct, background:s.color, minWidth:4 }}/>)}
                </div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {seg.map(s=>(
                    <div key={s.sid} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#6b7280" }}>
                      <BadgeSmall icon={s.sid==="jamaah"?"group":s.sid==="prayed_ontime"?"person":s.sid==="prayed_late"?"late":"block"} bg={s.color}/>
                      <span style={{ fontWeight:700 }}>{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // ── Detail: Rawatib ─────────────────────────────────────────────────
    if (detailView === "rawatib") {
      const daysToShow = filteredKeys.slice(-60);
      const PRAYER_ICONS = { rb_fajr_before:FajrSVG, rb_dhuhr_before:DhuhrSVG, rb_dhuhr_after:DhuhrSVG, rb_maghrib_after:MaghribSVG, rb_isha_after:IshaSVG };
      return (
        <div style={{ padding:"0 16px" }}>
          <div style={{ display:"flex", alignItems:"center", marginBottom:16 }}>
            <button onClick={()=>setDetailView(null)} style={{ background:"none",border:"none",fontSize:15,cursor:"pointer",color:"#2563eb",fontWeight:600 }}>‹ Stats</button>
            <span style={{ flex:1, textAlign:"center", fontSize:17, fontWeight:700, color:"#111827", marginRight:50 }}>Sunnan Al-Rawatib</span>
          </div>

          {/* Calendar grid */}
          <div style={{ display:"flex", gap:0, marginBottom:16, overflowX:"auto" }}>
            <div style={{ flex:1, overflowX:"auto" }}>
              <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                {daysToShow.map(k=>(
                  <div key={k} style={{ minWidth:28, textAlign:"center", fontSize:9, color:"#9ca3af", fontWeight:600 }}>{new Date(k).getDate()}</div>
                ))}
              </div>
              {ALL_RB.map(rb=>(
                <div key={rb.id} style={{ display:"flex", gap:4, marginBottom:4 }}>
                  {daysToShow.map(k=>{
                    const s=logs[k]?.[rb.id];
                    const col = s==="prayed"||s==="prayed_4"?"#3ecf8e":s==="not_prayed"?"#e5484d":"#e5e7eb";
                    return <div key={k} style={{ minWidth:28, height:28, borderRadius:6, background:col }}/>;
                  })}
                </div>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, paddingTop:20, marginLeft:4 }}>
              {ALL_RB.map(rb=>{
                const SVG=PRAYER_ICONS[rb.id]||FajrSVG;
                return <div key={rb.id} style={{ width:32, height:28, background:"#2563eb", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}><SVG s={16}/></div>;
              })}
            </div>
          </div>

          <PeriodFilter value={statsPeriod} onChange={handlePeriodChange}/>
          <PeriodNav period={statsPeriod} label={getPeriodLabel()} index={clampedIndex} total={buckets.length} onPrev={()=>setPeriodIndex(i=>Math.max(0,i-1))} onNext={()=>setPeriodIndex(i=>Math.min(buckets.length-1,i+1))}/>

          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>PRAYER SUMMARY</div>
          {rbStats.map(rb=>(
            <div key={rb.id} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"14px", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>🕌</span>
                <span style={{ fontSize:15, fontWeight:700, color:"#111827" }}>{rb.label}</span>
              </div>
              {filteredKeys.length === 0
                ? <div style={{ fontSize:13, color:"#9ca3af" }}>No data for selected period.</div>
                : <div style={{ fontSize:13, color:"#9ca3af" }}>
                    {rb.prayed} times prayed · {rb.missed} times missed
                  </div>
              }
              <div style={{ display:"flex", gap:16, marginTop:8 }}>
                <span style={{ fontSize:12, color:"#22c55e", fontWeight:600 }}>✓ {rb.pct}%</span>
                <span style={{ fontSize:12, color:"#e05c5c", fontWeight:600 }}>✕ {rb.missedPct}%</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ── Detail: single optional deed ────────────────────────────────────
    if (detailView && detailView !== "fard" && detailView !== "rawatib") {
      const preset   = ALL_PRESETS.find(p=>p.id===detailView);
      const isQuran  = detailView === "read_quran";
      const daysToShow = filteredKeys.slice(-60);

      // Quran: bar chart of pages per day
      if (isQuran) {
        const quranData = filteredKeys.map(k=>({ key:k, val:logs[k]["read_quran"]||0, day:new Date(k).getDate() }));
        const avg = quranData.length ? Math.round(quranData.reduce((a,d)=>a+d.val,0)/quranData.length) : 0;
        const completed = quranData.filter(d=>d.val>=quranGoal).length;
        const exceeded  = quranData.filter(d=>d.val>quranGoal).length;
        const late      = quranData.filter(d=>d.val>0&&d.val<quranGoal).length;
        const total2    = quranData.length||1;
        const maxVal    = Math.max(quranGoal, ...quranData.map(d=>d.val), 1);

        return (
          <div style={{ padding:"0 16px" }}>
            <div style={{ display:"flex", alignItems:"center", marginBottom:16 }}>
              <button onClick={()=>setDetailView(null)} style={{ background:"none",border:"none",fontSize:15,cursor:"pointer",color:"#2563eb",fontWeight:600 }}>‹ Stats</button>
              <span style={{ flex:1, textAlign:"center", fontSize:17, fontWeight:700, color:"#111827", marginRight:50 }}>Read Quran</span>
            </div>
            {/* Avg + goal */}
            <div style={{ display:"flex", gap:16, marginBottom:16 }}>
              <div><div style={{ fontSize:12, color:"#9ca3af" }}>Daily average</div><div style={{ fontSize:22, fontWeight:800, color:"#111827" }}>{avg} {quranUnit}</div></div>
              <div><div style={{ fontSize:12, color:"#9ca3af" }}>Goal</div><div style={{ fontSize:22, fontWeight:800, color:"#111827" }}>{quranGoal} {quranUnit}</div></div>
            </div>
            {/* Bar chart */}
            <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"14px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:120, overflowX:"auto" }}>
                {quranData.slice(-20).map(d=>(
                  <div key={d.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:28 }}>
                    <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
                      <div style={{ width:"100%", background:"#3ecf8e", borderRadius:"4px 4px 0 0", height:`${Math.round((d.val/maxVal)*100)}%`, minHeight:d.val>0?4:0 }}/>
                    </div>
                    <span style={{ fontSize:9, color:"#9ca3af", fontWeight:600 }}>{d.day}</span>
                  </div>
                ))}
              </div>
              {/* Y-axis hint */}
              <div style={{ display:"flex", justifyContent:"flex-end", fontSize:10, color:"#9ca3af", marginTop:4, gap:16 }}>
                <span>{Math.round(maxVal/2)}</span><span>0</span>
              </div>
            </div>
            <PeriodFilter value={statsPeriod} onChange={handlePeriodChange}/>
            <PeriodNav period={statsPeriod} label={getPeriodLabel()} index={clampedIndex} total={buckets.length} onPrev={()=>setPeriodIndex(i=>Math.max(0,i-1))} onNext={()=>setPeriodIndex(i=>Math.min(buckets.length-1,i+1))}/>
            <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>STATUS SUMMARY</div>
            <Semicircle pct={Math.round(completed/total2*100)} color="#3ecf8e" count={completed} label="Since starting the deed"/>
            <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden" }}>
              {[
                { label:"Exceeded",  pct:Math.round(exceeded/total2*100),  count:exceeded,  color:"#8b5cf6", icon:"✓✓" },
                { label:"Completed", pct:Math.round(completed/total2*100), count:completed, color:"#22c55e", icon:"✓" },
                { label:"Partial",   pct:Math.round(late/total2*100),      count:late,      color:"#f97316", icon:"◔" },
                { label:"Missed",    pct:Math.round((total2-completed-late)/total2*100), count:total2-completed-late, color:"#e05c5c", icon:"✕" },
              ].map((s,i,arr)=>(
                <div key={s.label} style={{ display:"flex", alignItems:"center", padding:"13px 16px", borderBottom:i<arr.length-1?"1px solid #f3f4f6":"none" }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${s.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:s.color, fontWeight:800, marginRight:12, flexShrink:0 }}>{s.icon}</div>
                  <span style={{ flex:1, fontSize:15, color:"#374151", fontWeight:500 }}>{s.label}</span>
                  <span style={{ fontSize:14, color:"#9ca3af", fontWeight:600 }}>{s.pct}% ({s.count} times)</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // Other optional deeds (Duha, Tahajjud, Witr, Fasting)
      const ds = deedStatFor(detailView);
      const totalLogged = filteredKeys.filter(k=>logs[k][detailView]!=null).length;
      const arcColor = ds.pct >= 50 ? "#3ecf8e" : "#e5484d";

      return (
        <div style={{ padding:"0 16px" }}>
          <div style={{ display:"flex", alignItems:"center", marginBottom:16 }}>
            <button onClick={()=>setDetailView(null)} style={{ background:"none",border:"none",fontSize:15,cursor:"pointer",color:"#2563eb",fontWeight:600 }}>‹ Stats</button>
            <span style={{ flex:1, textAlign:"center", fontSize:17, fontWeight:700, color:"#111827", marginRight:50 }}>{preset?.name}</span>
          </div>
          {/* Mini calendar */}
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"12px", marginBottom:16, overflowX:"auto" }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {daysToShow.map(k=>{
                const v=logs[k]?.[detailView];
                const col=v==="done"?"#3ecf8e":v==="not_done"?"#e5484d":"#e5e7eb";
                return <div key={k} style={{ width:28, height:28, borderRadius:6, background:col, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:9, color:"#fff", fontWeight:700 }}>{new Date(k).getDate()}</span></div>;
              })}
            </div>
          </div>
          <PeriodFilter value={statsPeriod} onChange={handlePeriodChange}/>
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>STATUS SUMMARY</div>
          <Semicircle pct={ds.pct} color={arcColor} count={ds.done} label="Since starting the deed"/>
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden" }}>
            {[
              { label:"Completed", count:ds.done,   color:"#22c55e", pct:totalLogged?Math.round(ds.done/totalLogged*100):0,   icon:"✓" },
              { label:"Missed",    count:ds.missed, color:"#e05c5c", pct:totalLogged?Math.round(ds.missed/totalLogged*100):0, icon:"✕" },
            ].map((s,i,arr)=>(
              <div key={s.label} style={{ display:"flex", alignItems:"center", padding:"13px 16px", borderBottom:i<arr.length-1?"1px solid #f3f4f6":"none" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${s.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:s.color, fontWeight:800, marginRight:12, flexShrink:0 }}>{s.icon}</div>
                <span style={{ flex:1, fontSize:15, color:"#374151", fontWeight:500 }}>{s.label}</span>
                <span style={{ fontSize:14, color:"#9ca3af", fontWeight:600 }}>{s.pct}% ({s.count} times)</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Main stats overview ─────────────────────────────────────────────
    const totalPrayed2 = filteredKeys.reduce((a,k)=>a+FARD.filter(p=>{const s=logs[k][p.id];return s&&s!=="not_prayed";}).length,0);
    const totalSlots2  = filteredKeys.length*5||1;

    // Calendar heatmap (last 60 days shown as colored squares per prayer per day)
    const recentKeys = filteredKeys.slice(-20);
    const STATUS_COL = { jamaah:"#3ecf8e", prayed_ontime:"#f5a623", prayed_late:"#e5484d", not_prayed:"#111827", excused:"#adb5bd" };

    return (
      <div style={{ padding:"0 16px" }}>
        {/* Calendar grid */}
        <div style={{ display:"flex", gap:0, marginBottom:8, overflowX:"auto" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:4, marginBottom:4 }}>
              {recentKeys.map(k=>(
                <div key={k} style={{ minWidth:28, textAlign:"center", fontSize:9, color:"#9ca3af", fontWeight:600 }}>{new Date(k).getDate()}</div>
              ))}
            </div>
            {FARD.map(p=>(
              <div key={p.id} style={{ display:"flex", gap:4, marginBottom:4 }}>
                {recentKeys.map(k=>{
                  const s=logs[k]?.[p.id]||"default";
                  return <div key={k} style={{ minWidth:28, height:28, borderRadius:6, background:STATUS_COL[s]||"#e5e7eb" }}/>;
                })}
              </div>
            ))}
          </div>
          {/* Prayer icons */}
          <div style={{ display:"flex", flexDirection:"column", gap:4, paddingTop:20, marginLeft:4 }}>
            {FARD.map(p=>{
              const SVG=FARD_SVG[p.id];
              return <div key={p.id} style={{ width:32, height:28, background:"#2563eb", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}><SVG s={16}/></div>;
            })}
          </div>
        </div>

        {/* Period filter */}
        <PeriodFilter value={statsPeriod} onChange={handlePeriodChange}/>
        <PeriodNav period={statsPeriod} label={getPeriodLabel()} index={clampedIndex} total={buckets.length} onPrev={()=>setPeriodIndex(i=>Math.max(0,i-1))} onNext={()=>setPeriodIndex(i=>Math.min(buckets.length-1,i+1))}/>

        {/* Status summary grid */}
        <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>STATUS SUMMARY</div>
        <div style={{ display:"flex", gap:8, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
          {[
            { id:"masjid",       label:"Masjid",     color:"#2563eb", icon:"masjid" },
            { id:"jamaah",       label:"Jamaah",     color:"#3ecf8e", icon:"group"  },
            { id:"prayed_ontime",label:"On time",    color:"#f5a623", icon:"person" },
            { id:"prayed_late",  label:"Late",       color:"#e5484d", icon:"late"   },
            { id:"not_prayed",   label:"Missed",     color:"#111827", icon:"block"  },
          ].map(s=>{
            const count = filteredKeys.reduce((a,k)=>a+FARD.filter(p=>logs[k]?.[p.id]===s.id).length,0);
            const pct   = totalSlots2 ? Math.round(count/totalSlots2*100) : 0;
            const bars  = Math.min(4, Math.ceil(pct/25));
            return(
              <div key={s.id} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"14px 12px", minWidth:100, flex:"0 0 auto" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                  <BadgeSmall icon={s.icon} bg={s.color}/>
                  <span style={{ fontSize:11, fontWeight:600, color:"#6b7280" }}>{s.label}</span>
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:"#111827" }}>{pct}%</div>
                <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>{count}×</div>
                <div style={{ display:"flex", gap:2, marginTop:8 }}>
                  {[0,1,2,3].map(i=><div key={i} style={{ width:16, height:5, borderRadius:3, background: i<bars ? s.color : "#e5e7eb" }}/>)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats by deeds list */}
        <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>STATS BY DEEDS</div>
        {[
          { id:"fard",    label:"Fard prayers",      sub:"Prayers",          emoji:"👥" },
          { id:"rawatib", label:"Sunnan Al-Rawatib",  sub:"Prayers",          emoji:"🕌" },
          ...PRESET_PRAYERS.filter(p=>activeDeeds.includes(p.id)).map(p=>({ id:p.id, label:p.name, sub:"Prayers", emoji:p.emoji })),
          ...PRESET_FASTING.filter(p=>activeDeeds.includes(p.id)).map(p=>({ id:p.id, label:p.name, sub:"Fasting", emoji:p.emoji })),
          ...(activeDeeds.includes("read_quran") ? [{ id:"read_quran", label:"Read Quran", sub:"Learning & dawah", emoji:"📖" }] : []),
        ].map(item=>(
          <div key={item.id} onClick={()=>setDetailView(item.id)}
            style={{ display:"flex", alignItems:"center", background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:"14px 16px", marginBottom:8, cursor:"pointer" }}>
            <span style={{ fontSize:24, width:36, textAlign:"center" }}>{item.emoji}</span>
            <div style={{ flex:1, marginLeft:12 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#111827" }}>{item.label}</div>
              <div style={{ fontSize:12, color:"#9ca3af" }}>{item.sub}</div>
            </div>
            <ArrowRight/>
          </div>
        ))}
      </div>
    );
  };


  // ── Challenge Mode ────────────────────────────────────────────────────
  const ChallengeMode = () => {
    const [localDiff, setLocalDiff] = useState(difficulty);

    // Get current week start (Monday)
    const weekStart = new Date(selDate);
    const day = weekStart.getDay();
    const diff2 = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff2);

    const { score, max } = challengeOn
      ? getWeekScoreData(logs, difficulty, weekStart, gender)
      : { score: 0, max: getWeeklyMax(gender) };

    const pct = max > 0 ? Math.round(Math.max(0, score) / max * 100) : 0;
    const zone = getZone(score, max);

    // Per-day scores for the week
    const weekDays2 = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(d.getDate() + i);
      const k = toKey(d);
      let dayScore = 0;
      FARD.forEach(p => { dayScore += getPrayerScore(p.id, logs[k]?.[p.id], difficulty, gender); });
      weekDays2.push({ date: d, key: k, score: dayScore });
    }

    const maxDayScore = 31; // max per day all masjid

    // Consecutive miss alerts
    const alerts = [];
    HEAVY_PRAYERS.forEach(pid => {
      let streak = 0;
      const sortedKeys = Object.keys(logs).sort().slice(-7);
      sortedKeys.forEach(k => {
        const s = logs[k]?.[pid];
        if (s === "not_prayed") streak++;
        else streak = 0;
      });
      if (streak >= 2) alerts.push({ prayer: pid, streak });
    });

    if (!challengeOn) {
      return (
        <div style={{ padding: "20px 16px" }}>
          {/* Opt-in screen */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#111827", marginBottom: 8 }}>Challenge Mode</div>
            <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 20 }}>
              Track your prayer quality with a scoring system designed to push you toward praying in the masjid and jamaah. Opt in to start your journey.
            </div>
          </div>

          {/* Difficulty selector */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Choose Difficulty</div>
          {[
            { id:"soft",   emoji:"😌", label:"Soft",   desc:"Gentle start. Missing prayers has lower penalty." },
            { id:"medium", emoji:"⚖️", label:"Medium", desc:"Balanced. Missing prayers costs you significantly." },
            { id:"hard",   emoji:"💪", label:"Hard",   desc:"Maximum accountability. Every missed prayer hurts." },
          ].map((d, i, arr) => (
            <div key={d.id} onClick={() => setLocalDiff(d.id)}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px",
                background: localDiff===d.id ? "#eff6ff" : "#fff",
                border: `1.5px solid ${localDiff===d.id ? "#2563eb" : "#e5e7eb"}`,
                borderRadius: 16, marginBottom: 8, cursor:"pointer" }}>
              <span style={{ fontSize: 24 }}>{d.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{d.label}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{d.desc}</div>
              </div>
              {localDiff === d.id && <Checkmark color="#2563eb" />}
            </div>
          ))}

          {/* ── HEATMAP SCORE PREVIEW ── */}
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"16px", marginTop:16, marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#111827", marginBottom:2 }}>Score Preview — {localDiff.charAt(0).toUpperCase()+localDiff.slice(1)}</div>
            <div style={{ fontSize:11, color:"#9ca3af", marginBottom:14 }}>
              {gender==="female" ? "Female · consistency focus" : "Male · masjid & jamaah push"}
              {" · max "}<b style={{ color:"#2563eb" }}>{gender==="female"?"105":"217"} pts/week</b>
            </div>
            {(()=>{
              const statuses = gender==="female"
                ? [{id:"prayed_ontime",emoji:"🙋",short:"On Time"},{id:"prayed_late",emoji:"⏰",short:"Late"},{id:"excused",emoji:"~",short:"Excused"},{id:"not_prayed",emoji:"✕",short:"Missed"}]
                : [{id:"masjid",emoji:"🕌",short:"Masjid"},{id:"jamaah",emoji:"👥",short:"Jamaah"},{id:"prayed_ontime",emoji:"🙋",short:"On Time"},{id:"prayed_late",emoji:"⏰",short:"Late"},{id:"not_prayed",emoji:"✕",short:"Missed"}];
              return (
                <div>
                  {/* Column headers */}
                  <div style={{ display:"flex", gap:4, marginBottom:6, paddingLeft:58 }}>
                    {statuses.map(s=>(
                      <div key={s.id} style={{ flex:1, textAlign:"center" }}>
                        <div style={{ fontSize:13 }}>{s.emoji}</div>
                        <div style={{ fontSize:8, fontWeight:700, color:"#9ca3af", letterSpacing:0.3 }}>{s.short}</div>
                      </div>
                    ))}
                  </div>
                  {/* Prayer rows — heatmap cells */}
                  {FARD.map(p => {
                    const isH = HEAVY_PRAYERS.includes(p.id);
                    const TBL = gender==="female" ? SCORE_TABLE_FEMALE[localDiff] : SCORE_TABLE_MALE[localDiff];
                    const row = isH ? TBL.heavy : TBL.normal;
                    const maxPos = gender==="female" ? (isH?5:3) : (isH?8:5);
                    const maxNeg = isH?7 : (localDiff==="hard"?3:localDiff==="medium"?2:1);
                    const SVG = FARD_SVG[p.id];
                    return (
                      <div key={p.id} style={{ display:"flex", gap:4, marginBottom:5, alignItems:"center" }}>
                        <div style={{ width:54, flexShrink:0, display:"flex", alignItems:"center", gap:4 }}>
                          <SVG s={16}/>
                          <div>
                            <div style={{ fontSize:11, fontWeight:700, color:isH?"#f97316":"#374151", lineHeight:1.1 }}>{p.name}</div>
                            {isH && <div style={{ fontSize:8, color:"#f97316", fontWeight:700, letterSpacing:0.5 }}>KEY</div>}
                          </div>
                        </div>
                        {statuses.map(s => {
                          const v = row[s.id] ?? 0;
                          const intensity = v>0 ? v/maxPos : v<0 ? Math.abs(v)/maxNeg : 0;
                          const bg = v>0 ? `rgba(34,197,94,${0.07+intensity*0.38})` : v<0 ? `rgba(239,68,68,${0.07+intensity*0.38})` : "#f9fafb";
                          const borderCol = v>0 ? `rgba(34,197,94,${0.15+intensity*0.35})` : v<0 ? `rgba(239,68,68,${0.15+intensity*0.35})` : "#e5e7eb";
                          const color = v>0 ? "#15803d" : v<0 ? "#b91c1c" : "#9ca3af";
                          return (
                            <div key={s.id} style={{ flex:1, background:bg, border:`1px solid ${borderCol}`, borderRadius:8, padding:"8px 2px", textAlign:"center" }}>
                              <div style={{ fontSize:12, fontWeight:900, color, lineHeight:1 }}>{v>0?"+":""}{v}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {/* Legend */}
                  <div style={{ display:"flex", gap:10, marginTop:10, paddingTop:10, borderTop:"1px solid #f3f4f6", justifyContent:"center", flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10,height:10,borderRadius:3,background:"rgba(34,197,94,0.4)" }}/><span style={{ fontSize:10, color:"#6b7280" }}>Positive</span></div>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10,height:10,borderRadius:3,background:"#f9fafb",border:"1px solid #e5e7eb" }}/><span style={{ fontSize:10, color:"#6b7280" }}>Neutral</span></div>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10,height:10,borderRadius:3,background:"rgba(239,68,68,0.35)" }}/><span style={{ fontSize:10, color:"#6b7280" }}>Negative</span></div>
                    <span style={{ fontSize:10, color:"#9ca3af" }}>Darker = stronger</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <button onClick={() => {
            const start = toKey(todayDate());
            setChallengeOn(true); setDifficulty(localDiff); setChallengeStart(start);
            persistChallenge(true, localDiff, start);
          }} style={{ width:"100%", padding:"16px", borderRadius:16, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer" }}>
            🏆 Start Challenge Mode
          </button>
        </div>
      );
    }

    // Active challenge view
    return (
      <div style={{ padding: "0 16px 16px" }}>

        {/* Alerts */}
        {alerts.map(a => (
          <div key={a.prayer} style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:14, padding:"12px 14px", marginBottom:10, marginTop:16 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#e05c5c", marginBottom:4 }}>
              🔴 {a.streak} consecutive missed {a.prayer === "fajr" ? "Fajr" : "Asr"} prayers
            </div>
            <div style={{ fontSize:12, color:"#6b7280", fontStyle:"italic", direction:"rtl", textAlign:"right", lineHeight:1.6 }}>
              {a.prayer === "asr" ? ASR_HADITH : FAJR_HADITH}
            </div>
          </div>
        ))}

        {/* Zone banner */}
        <div style={{ background: zone.bg, border: `1.5px solid ${zone.border}`, borderRadius: 20, padding: "20px 16px", marginTop: alerts.length ? 8 : 16, marginBottom: 16, textAlign:"center" }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>{zone.emoji}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: zone.color }}>{zone.label}</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>This week's zone</div>
          {/* Semicircle meter */}
          <div style={{ position:"relative", margin:"16px auto 0", width:180, height:90 }}>
            <svg width="180" height="90" viewBox="0 0 180 90">
              <path d="M10 90 A80 80 0 0 1 170 90" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"/>
              {pct > 0 && (() => {
                const angle = Math.PI * Math.min(pct,100) / 100;
                const x = 90 + 80 * Math.cos(Math.PI - angle);
                const y = 90 - 80 * Math.sin(angle);
                const large = pct > 50 ? 1 : 0;
                return <path d={`M10 90 A80 80 0 ${large} 1 ${x.toFixed(1)} ${y.toFixed(1)}`} fill="none" stroke={zone.color} strokeWidth="14" strokeLinecap="round"/>;
              })()}
            </svg>
            <div style={{ position:"absolute", bottom:0, width:"100%", textAlign:"center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#111827" }}>{pct}%</div>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:12 }}>
            <div><div style={{ fontSize:20, fontWeight:900, color:score>=0?"#111827":"#e05c5c" }}>{score>0?"+":""}{score}</div><div style={{ fontSize:11, color:"#9ca3af" }}>points</div></div>
            <div style={{ width:1, background:"#e5e7eb" }}/>
            <div><div style={{ fontSize:20, fontWeight:900, color:"#9ca3af" }}>{max}</div><div style={{ fontSize:11, color:"#9ca3af" }}>max</div></div>
          </div>
        </div>

        {/* Daily bar chart */}
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#111827", marginBottom:12 }}>This Week — Daily Scores</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
            {weekDays2.map((d, i) => {
              const isToday2 = d.key === todayKey;
              const isSel2   = d.key === dateKey;
              const barPct   = Math.max(0, Math.round((d.score / maxDayScore) * 100));
              const barColor = d.score < 0 ? "#e5484d" : d.score >= 20 ? "#3ecf8e" : d.score >= 10 ? "#f5a623" : "#9ca3af";
              return (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  {d.score < 0 && <span style={{ fontSize:9, color:"#e5484d", fontWeight:700 }}>{d.score}</span>}
                  <div style={{ flex:1, width:"100%", display:"flex", alignItems:"flex-end" }}>
                    <div style={{ width:"100%", background: barPct>0 ? barColor : "#f3f4f6", borderRadius:"4px 4px 0 0",
                      height: barPct>0 ? `${barPct}%` : "4px", minHeight:4,
                      border: isSel2 ? "2px solid #2563eb" : "none" }}/>
                  </div>
                  <span style={{ fontSize:9, fontWeight:700, color: isToday2?"#2563eb":"#9ca3af" }}>
                    {d.date.toLocaleDateString("en-US",{weekday:"short"}).slice(0,1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score breakdown per prayer */}
        <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Today's Prayer Scores</div>
        {FARD.map(p => {
          const sid    = logs[dateKey]?.[p.id];
          const pts    = getPrayerScore(p.id, sid, difficulty, gender);
          const isHeavy = HEAVY_PRAYERS.includes(p.id);
          const SVG    = FARD_SVG[p.id];
          const st     = fardStat.find(s => s.id === sid);
          return (
            <div key={p.id} style={{ display:"flex", alignItems:"center", background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:"11px 14px", marginBottom:8 }}>
              <SVG s={22}/>
              <span style={{ fontSize:14, fontWeight:700, color:"#111827", flex:1, marginLeft:10 }}>{p.name}</span>
              {isHeavy && <span style={{ fontSize:10, fontWeight:700, color:"#f97316", background:"#fff7ed", padding:"2px 6px", borderRadius:20, marginRight:8 }}>★ KEY</span>}
              {st && <span style={{ fontSize:11, color:st.bg, fontWeight:600, marginRight:10 }}>{st.label}</span>}
              <span style={{ fontSize:16, fontWeight:900, color: pts>0?"#22c55e":pts<0?"#e05c5c":"#9ca3af", minWidth:30, textAlign:"right" }}>
                {pts>0?"+":""}{pts}
              </span>
            </div>
          );
        })}

        {/* Score reference card */}
        <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, marginBottom:10, marginTop:6 }}>Prayer Score Guide</div>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ fontSize:11, color:"#9ca3af", marginBottom:10 }}>
            {gender==="female" ? "★ Fajr & Asr carry higher weight" : "★ Fajr & Asr carry higher weight · 🕌 Masjid is the top score"}
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:"left", color:"#9ca3af", fontWeight:600, paddingBottom:6, paddingRight:8 }}>Prayer</th>
                  {gender==="male" && <th style={{ color:"#2563eb", fontWeight:700, paddingBottom:6, paddingRight:8 }}>🕌</th>}
                  {gender==="male" && <th style={{ color:"#3ecf8e", fontWeight:700, paddingBottom:6, paddingRight:8 }}>👥</th>}
                  <th style={{ color:"#f5a623", fontWeight:700, paddingBottom:6, paddingRight:8 }}>🙋</th>
                  <th style={{ color:"#e5484d", fontWeight:700, paddingBottom:6, paddingRight:8 }}>⏰</th>
                  {gender==="female" && <th style={{ color:"#adb5bd", fontWeight:700, paddingBottom:6, paddingRight:8 }}>~</th>}
                  <th style={{ color:"#111827", fontWeight:700, paddingBottom:6 }}>✕</th>
                </tr>
              </thead>
              <tbody>
                {FARD.map(p => {
                  const isHeavy = HEAVY_PRAYERS.includes(p.id);
                  const mRow = SCORE_TABLE_MALE[difficulty]?.[isHeavy?"heavy":"normal"] || {};
                  const fRow = SCORE_TABLE_FEMALE[difficulty]?.[isHeavy?"heavy":"normal"] || {};
                  const row = gender==="female" ? fRow : mRow;
                  const sc = (v) => {
                    const n = row[v]??0;
                    const c = n>0?"#22c55e":n<0?"#e05c5c":"#9ca3af";
                    return <td key={v} style={{ fontWeight:800, color:c, paddingBottom:6, paddingRight:8, textAlign:"center" }}>{n>0?"+":""}{n}</td>;
                  };
                  return (
                    <tr key={p.id} style={{ borderTop:"1px solid #f3f4f6" }}>
                      <td style={{ paddingTop:6, paddingBottom:6, paddingRight:8, color: isHeavy?"#f97316":"#374151", fontWeight: isHeavy?700:500 }}>
                        {p.name}{isHeavy?" ★":""}
                      </td>
                      {gender==="male" && sc("masjid")}
                      {gender==="male" && sc("jamaah")}
                      {sc("prayed_ontime")}
                      {sc("prayed_late")}
                      {gender==="female" && sc("excused")}
                      {sc("not_prayed")}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize:10, color:"#9ca3af", marginTop:8, borderTop:"1px solid #f3f4f6", paddingTop:6 }}>
            Difficulty: <b>{difficulty}</b> · Weekly max: <b>{gender==="female"?105:217} pts</b>
          </div>
        </div>

        {/* Zone guide */}
        <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, marginBottom:10, marginTop:6 }}>Zone Guide</div>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden", marginBottom:16 }}>
          {[
            { label:"Elite",    range:"78–100%", emoji:"🏆", color:"#f59e0b", desc:"Mostly masjid" },
            { label:"Strong",   range:"46–77%",  emoji:"✅", color:"#22c55e", desc:"Solid jamaah habit" },
            { label:"Building", range:"18–45%",  emoji:"🟡", color:"#f97316", desc:"On time, some jamaah" },
            { label:"Danger",   range:"0–17%",   emoji:"🟠", color:"#ef4444", desc:"Many late, few jamaah" },
            { label:"Critical", range:"< 0%",    emoji:"🔴", color:"#991b1b", desc:"Missing prayers" },
          ].map((z, i, arr) => {
            const isCurrent = z.label === zone.label;
            return (
              <div key={z.label} style={{ display:"flex", alignItems:"center", padding:"11px 14px",
                borderBottom: i<arr.length-1?"1px solid #f3f4f6":"none",
                background: isCurrent ? "#f8faff" : "transparent" }}>
                <span style={{ fontSize:18, marginRight:10 }}>{z.emoji}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:14, fontWeight:isCurrent?800:600, color:isCurrent?z.color:"#374151" }}>{z.label}</span>
                  <span style={{ fontSize:12, color:"#9ca3af", marginLeft:8 }}>{z.desc}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:"#9ca3af" }}>{z.range}</span>
                {isCurrent && <span style={{ marginLeft:8, fontSize:12, fontWeight:800, color:z.color }}>← You</span>}
              </div>
            );
          })}
        </div>

        {/* Difficulty + exit */}
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"14px 16px", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#111827", marginBottom:10 }}>Difficulty: {difficulty.charAt(0).toUpperCase()+difficulty.slice(1)}</div>
          <div style={{ display:"flex", gap:6, marginBottom:12 }}>
            {["soft","medium","hard"].map(d=>(
              <button key={d} onClick={()=>{ setDifficulty(d); persistChallenge(true,d,challengeStart); }}
                style={{ flex:1, padding:"8px 4px", borderRadius:10, border:`1.5px solid ${difficulty===d?"#2563eb":"#e5e7eb"}`,
                  background:difficulty===d?"#eff6ff":"#f9fafb", fontSize:12, fontWeight:700,
                  color:difficulty===d?"#2563eb":"#6b7280", cursor:"pointer" }}>
                {d==="soft"?"😌 Soft":d==="medium"?"⚖️ Medium":"💪 Hard"}
              </button>
            ))}
          </div>
          <div style={{ fontSize:11, color:"#9ca3af", marginBottom:10 }}>Started: {challengeStart || "—"}</div>
          <button onClick={()=>{ setChallengeOn(false); setChallengeStart(null); persistChallenge(false,difficulty,null); }}
            style={{ width:"100%", padding:"10px", borderRadius:10, background:"#fef2f2", border:"1px solid #fecaca", color:"#e05c5c", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Exit Challenge Mode
          </button>
        </div>
      </div>
    );
  };

  // ── Settings ──────────────────────────────────────────────────────────
  const Settings = () => (
    <div style={{ padding: "0 16px" }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "4px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
          <div><div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Gender</div><div style={{ fontSize: 12, color: "#9ca3af" }}>Affects prayer status options</div></div>
          <div style={{ display: "flex", gap: 6 }}>
            {["male", "female"].map(g => (
              <button key={g} onClick={() => { setGender(g); persist(logs, g, activeDeeds, quranGoal, quranUnit, quranFreq); }}
                style={{ padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", background: gender === g ? "#eff6ff" : "#f9fafb", border: `1.5px solid ${gender === g ? "#2563eb" : "#e5e7eb"}`, color: gender === g ? "#2563eb" : "#6b7280" }}>
                {g === "male" ? "♂ Male" : "♀ Female"}
              </button>
            ))}
          </div>
        </div>
        {activeDeeds.length > 0 && (
          <div style={{ padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Active Deeds</div>
            {activeDeeds.map(id => {
              const p = ALL_PRESETS.find(x => x.id === id);
              if (!p) return null;
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ fontSize: 14, color: "#374151" }}>{p.emoji} {p.name}</span>
                  <button onClick={() => removeDeed(id)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#e05c5c", cursor: "pointer" }}>Remove</button>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0" }}>
          <div><div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Reset All Data</div><div style={{ fontSize: 12, color: "#9ca3af" }}>Clears all prayer logs</div></div>
          <button onClick={() => { if (window.confirm("Reset all data?")) { setLogs({}); localStorage.removeItem(`${pfx}_logs`); } }}
            style={{ padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "#fef2f2", border: "1px solid #fecaca", color: "#e05c5c", cursor: "pointer" }}>Reset</button>
        </div>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "20px", textAlign: "center", marginBottom:12 }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🕌</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Daily Deeds</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>Prayer & Deeds Tracker · v5.0</div>
        <div style={{ marginTop:8, fontSize:13, color:"#6b7280" }}>
          Logged in as <b>{authUser.isGuest?"Guest":authUser.username}</b>
        </div>
      </div>
      <button onClick={onLogout} style={{ width:"100%", padding:"14px", borderRadius:14,
        background:"#fef2f2", border:"1px solid #fecaca", color:"#e05c5c",
        fontSize:15, fontWeight:700, cursor:"pointer" }}>
        {authUser.isGuest ? "Exit Guest Mode" : "Logout"}
      </button>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", background: "#f3f4f6", minHeight: "100vh", maxWidth: 420, margin: "0 auto", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#fff", padding: "16px 20px 0", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{dateKey === todayKey ? "Today, " : ""}{selDate.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</div>
            {hijri && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 1 }}>{hijri}</div>}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginTop:3 }}>
              <div style={{ fontSize:11, fontWeight:700, color: authUser.isGuest?"#9ca3af":"#2563eb",
                background: authUser.isGuest?"#f3f4f6":"#eff6ff",
                padding:"2px 8px", borderRadius:20, border:`1px solid ${authUser.isGuest?"#e5e7eb":"#bfdbfe"}` }}>
                {authUser.isGuest ? "👤 Guest" : `👤 ${authUser.username}`}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setAddFlow("pick")} style={{ width: 36, height: 36, borderRadius: "50%", background: "#2563eb", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 400 }}>+</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0" }}>
          {["SUN","MON","TUE","WED","THU","FRI","SAT"].map((d, i) => {
            const wk = toKey(week[i]); const isSel = wk === dateKey; const isTod = wk === todayKey;
            return (
              <div key={d} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", marginBottom: 4 }}>{d}</div>
                <div onClick={() => { setSelDate(week[i]); setModal(null); }} style={{ width: 36, height: 36, borderRadius: "50%", background: isSel ? "#2563eb" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: "pointer", border: isTod && !isSel ? "1.5px solid #2563eb" : "none" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: isSel ? "#fff" : isTod ? "#2563eb" : "#374151" }}>{week[i].getDate()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {tab === "deeds" && (
        <div style={{ padding: "16px 16px 0" }}>
          <SectionLabel>PRAYERS</SectionLabel>
          {FARD.map(p => <PrayerRow key={p.id} prayerId={p.id} />)}
          {activeDeeds.length > 0 && (
            <>
              <SectionLabel>MY DEEDS</SectionLabel>
              {activeDeeds.map(id => <OptRow key={id} id={id} />)}
            </>
          )}
          {activeDeeds.length === 0 && (
            <button onClick={() => setAddFlow("pick")} style={{ width: "100%", padding: "14px", background: "#fff", border: "1.5px dashed #cbd5e1", borderRadius: 16, fontSize: 14, fontWeight: 600, color: "#9ca3af", cursor: "pointer", marginTop: 4 }}>
              + Add a deed to track
            </button>
          )}
        </div>
      )}
      {tab === "stats"     && <div style={{ padding: "16px 0 0" }}><Stats /></div>}
      {tab === "challenge" && <div style={{ padding: "0" }}><ChallengeMode /></div>}
      {tab === "settings"  && <div style={{ padding: "16px 0 0" }}><Settings /></div>}

      {/* Hadith Alert Modal */}
      {showHadith && (
        <div style={{ position:"fixed",inset:0,zIndex:80,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end" }}>
          <div style={{ background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:420,margin:"0 auto",padding:"24px 20px 40px" }}>
            <div style={{ width:36,height:4,background:"#e5e7eb",borderRadius:4,margin:"0 auto 20px" }}/>
            <div style={{ textAlign:"center",fontSize:32,marginBottom:8 }}>
              {showHadith.prayer==="fajr"?"🌙":"☀️"}
            </div>
            <div style={{ textAlign:"center",fontSize:13,fontWeight:700,color:showHadith.status==="not_prayed"?"#e05c5c":"#f97316",marginBottom:12,textTransform:"uppercase",letterSpacing:1 }}>
              {showHadith.status==="not_prayed"?"Prayer Missed":"Prayer Delayed"} — {showHadith.prayer==="fajr"?"Fajr":"Asr"}
            </div>
            <div style={{ background:"#fef9f0",border:"1px solid #fed7aa",borderRadius:14,padding:"16px",marginBottom:16,direction:"rtl",textAlign:"right" }}>
              <div style={{ fontSize:16,fontWeight:700,color:"#92400e",lineHeight:1.8 }}>{showHadith.hadith}</div>
            </div>
            <div style={{ fontSize:13,color:"#6b7280",textAlign:"center",marginBottom:20,lineHeight:1.6 }}>
              {showHadith.prayer==="asr"
                ? "The Prophet ﷺ warned that missing Asr is like losing one's family and wealth."
                : "The Prophet ﷺ said the two sunnah of Fajr are better than the world and all it contains."}
            </div>
            <button onClick={()=>setShowHadith(null)} style={{ width:"100%",padding:"14px",borderRadius:14,background:"#2563eb",border:"none",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer" }}>
              I understand — JazakAllahu Khayran
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", padding: "10px 0 20px" }}>
        {[
          { id:"deeds",     label:"Deeds",     svg:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="12" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="2" y="12" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="12" y="12" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg> },
          { id:"stats",     label:"Stats",     svg:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="12" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/><rect x="9" y="7" width="4" height="13" rx="1" stroke="currentColor" strokeWidth="1.8"/><rect x="16" y="3" width="4" height="17" rx="1" stroke="currentColor" strokeWidth="1.8"/></svg> },
          { id:"challenge", label:"Challenge", svg:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2l2.4 6.5H20l-5.5 4 2.1 6.5L11 15l-5.6 4 2.1-6.5L2 8.5h6.6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>, dot: challengeOn },
          { id:"settings",  label:"Settings",  svg:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
        ].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer", color: tab===t.id ? (t.id==="challenge"?"#f59e0b":"#2563eb") : "#9ca3af" }}>
            {t.svg}
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:0.3 }}>{t.label}</span>
            {t.dot && tab!==t.id && <div style={{ width:5,height:5,borderRadius:"50%",background:"#f59e0b",marginTop:-2 }}/>}
          </div>
        ))}
      </div>

      {/* Modals */}
      <FardModal />
      <OptModal />
      <QuranLogModal />
      <PickModal />
      <QuranConfigModal />
    </div>
  );
}
