import React, { useEffect, useState } from "react";
import "./Admin.css";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp, onSnapshot } from "firebase/firestore";
import {
  LayoutDashboard,
  Package,
  Tag,
  Users,
  Warehouse,
  LayoutGrid,
  ClipboardList,
  UserCircle2,
  Settings as SettingsIcon,
  ChevronLeft,
  Check,
  AlertTriangle,
  Trash2,
  Pencil,
  LogOut,
  Download,
  Bell,
  Flame,
  Sparkles,
  Image as ImageIcon,
  Type,
  CreditCard,
  Truck,
  MessageSquare,
  Save,
  Eye,
  ChefHat,
  CircleDollarSign,
  ReceiptText,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Phone
} from "lucide-react";

const INK = "#4C1504";
const BONE = "#FFF4EE";
const BRASS = "#FF6B4A";
const BRASS_SOFT = "#FF9A7A";
const LINE = "rgba(76,21,4,0.12)";

const serif = {
  fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
};

const categoryEmoji = (category) => {
  const icons = {
    Momo: "🥟",
    Chicken: "🍗",
    Biryani: "🍛",
    Chinese: "🥢",
    Indian: "🍛",
    Drinks: "🥤",
    Desserts: "🍰",
    Italian: "🍝"
  };
  return icons[category] || "🍽️";
};

const CATEGORIES = [
  "All",
  "Momo",
  "Chicken",
  "Biryani",
  "Chinese",
  "Indian",
  "Drinks",
  "Desserts",
  "Italian"
];

const seedSiteContent = () => ({
  heroEyebrow: "FRESH · HANDCRAFTED · DELICIOUS",
  heroTitle: "Savor the Taste of\nPerfection.",
  heroText: "Fresh ingredients, mouth-watering recipes and a passion for good food — freshly prepared at our kitchen.",
  heroMainImage: "",
  heroLeftImage: "",
  heroRightImage: "",
  offerEyebrow: "SPECIAL EDITION",
  offerSideLabel: "DAILY SPECIAL",
  offerFloatingLabel: "HANDCRAFTED",
  offerFloatingText: "Made fresh.\nServed warm.",
  offerMetaText: "FRESH / LOCAL / BOLD",
  signatureTitle: "Our Signature Dishes",
  signatureText: "Classic favourites and modern creations prepared fresh for every order.",
  aboutEyebrow: "MADE WITH LOVE",
  aboutTitle: "Good food.\nGood mood.",
  aboutText: "Carefully selected ingredients, balanced flavours and a kitchen that cares about every plate.",
  aboutImage: "",
  reviewsTitle: "They Love Us",
  reviewsText: "Good food, warm service and plenty of reasons to come back.",
  arKicker: "NEXT IN DINING",
  arTitle: "See your food\nbefore it arrives.",
  arText: "We are preparing an augmented-reality menu so you can preview selected dishes on your own table before ordering.",
  arTags: "3D Food Preview,Table View,Coming Soon",
  finalEyebrow: "KAVERI KITCHEN",
  finalTitle: "Don't Wait —\nOrder Now!",
  finalText: "Freshly prepared favourites delivered straight to your door.",
  footerTagline: "Fresh food, warm service and flavours worth coming back for.",
  footerHours: "11:00 AM – 11:00 PM",
  footerDays: "Open Every Day"
});

const seedPaymentSettings = () => ({
  upiEnabled: true,
  upiId: "kaverikitchen@upi",
  merchantName: "Kaveri Kitchen",
  qrImage: "",
  cashEnabled: true,
  cardEnabled: true
});

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function Badge({ children, tone = "brass" }) {
  const tones = {
    brass: { bg: "rgba(255,107,74,0.12)", color: BRASS },
    green: { bg: "rgba(90,168,110,0.15)", color: "#4F8A5D" },
    red: { bg: "rgba(214,90,90,0.12)", color: "#C84632" },
    grey: { bg: "rgba(76,21,4,0.07)", color: "#75635B" }
  };
  const t = tones[tone] || tones.grey;
  return (
    <span style={{ background: t.bg, color: t.color, fontSize: 11, padding: "4px 9px", borderRadius: 999, letterSpacing: 0.2, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    Available: "green", Occupied: "red", Cleaning: "grey", New: "brass", Accepted: "brass", Preparing: "brass", Ready: "green",
    "Out for Delivery": "brass", Delivered: "green", Cancelled: "red", "In Stock": "green", "Low Stock": "brass", "Out of Stock": "red"
  };
  return <Badge tone={map[status] || "grey"}>{status}</Badge>;
}

/* =========================================================
   ADMIN LOGIN — FIREBASE AUTHENTICATION
   ========================================================= */

function AdminLogin({ onLogin, nav }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitLogin = async (event) => {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your admin email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const user = result.user;

      const account = {
        id: user.uid,
        uid: user.uid,
        name: user.displayName || "Clock Tower Admin",
        email: user.email || cleanEmail,
        role: "Administrator",
        active: true,
      };

      try {
        localStorage.setItem("kaveri-current-staff", JSON.stringify(account));
      } catch {}

      onLogin(account);
    } catch (firebaseError) {
      console.error("Firebase login error:", firebaseError);

      const code = firebaseError?.code || "";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        setError("Invalid email or password.");
      } else if (code === "auth/user-not-found") {
        setError("No admin account found with this email.");
      } else if (code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(firebaseError?.message || "Unable to sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="staff-auth-page">
      <div className="staff-auth-glow staff-auth-glow-one" />
      <div className="staff-auth-glow staff-auth-glow-two" />

      <section className="staff-auth-shell">
        <div className="staff-auth-visual">
          <div className="staff-auth-brand">
            <div className="staff-auth-brand-mark">C</div>
            <div>
              <strong>Clock Tower</strong>
              <span>STAFF MANAGEMENT</span>
            </div>
          </div>

          <div className="staff-auth-visual-copy">
            <span className="staff-auth-kicker">PRIVATE STAFF PORTAL</span>
            <h1 style={serif}>
              Run the restaurant
              <br />
              <span>beautifully.</span>
            </h1>
            <p>
              Manage menus, orders, kitchen operations, inventory and guest
              service from one refined workspace.
            </p>
          </div>

          <div className="staff-auth-mini-grid">
            <div>
              <ChefHat size={18} />
              <span>Kitchen</span>
              <strong>Live control</strong>
            </div>
            <div>
              <ClipboardList size={18} />
              <span>Orders</span>
              <strong>Instant updates</strong>
            </div>
            <div>
              <Warehouse size={18} />
              <span>Inventory</span>
              <strong>Stock aware</strong>
            </div>
            <div>
              <CreditCard size={18} />
              <span>Payments</span>
              <strong>UPI ready</strong>
            </div>
          </div>
        </div>

        <div className="staff-auth-card-wrap">
          <div className="staff-auth-card">
            <div className="staff-auth-head">
              <div>
                <span className="staff-auth-card-kicker">WELCOME BACK</span>
                <h2 style={serif}>Admin login</h2>
                <p>
                  Sign in with the administrator account created in Firebase
                  Authentication.
                </p>
              </div>

              <div className="staff-auth-secure-icon">
                <SettingsIcon size={21} />
              </div>
            </div>

            <form className="staff-auth-form" onSubmit={submitLogin}>
              <div className="staff-auth-field">
                <label>Admin email</label>
                <div className="staff-auth-input-wrap">
                  <UserCircle2 size={17} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="admin@example.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="staff-auth-field">
                <label>Password</label>
                <div className="staff-auth-input-wrap">
                  <SettingsIcon size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="staff-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="staff-auth-submit"
                disabled={loading}
              >
                <span>{loading ? "Signing in..." : "Sign in to dashboard"}</span>
                {loading ? (
                  <Sparkles size={17} />
                ) : (
                  <ChevronLeft
                    size={17}
                    style={{ transform: "rotate(180deg)" }}
                  />
                )}
              </button>
            </form>

            {error && (
              <div className="staff-auth-message error">
                <AlertTriangle size={15} />
                {error}
              </div>
            )}

            <div className="staff-auth-card-footer">
              <button type="button" onClick={() => nav("landing")}>
                ← Back to restaurant site
              </button>
              <span>Staff-only access · Firebase Authentication</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   ADMIN NAVIGATION
   ========================================================= */

const NAV_ITEMS = [
  { k: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { k: "website", label: "Website Content", icon: ImageIcon },
  { k: "products", label: "Menu & Products", icon: Package },
  { k: "pricing", label: "Price & Menu", icon: Tag },
  { k: "staff", label: "Staff & Duties", icon: Users },
  { k: "inventory", label: "Inventory", icon: Warehouse },
  { k: "tables", label: "Tables & Orders", icon: LayoutGrid },
  { k: "orders", label: "Orders", icon: ClipboardList },
  { k: "delivery", label: "Delivery", icon: Truck },
  { k: "customers", label: "Customers", icon: UserCircle2 },
  { k: "offers", label: "Offers & Banners", icon: Flame },
  { k: "payments", label: "Payments / UPI", icon: CreditCard },
  { k: "arMenu", label: "AR Menu", icon: Sparkles },
  { k: "settings", label: "Settings", icon: SettingsIcon }
];

/* =========================================================
   ADMIN ERROR BOUNDARY
   ========================================================= */

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Admin section error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="admin-section-error">
          <AlertTriangle size={24} />
          <h3>That section could not be loaded</h3>
          <p>{this.state.error?.message || "Unexpected admin section error."}</p>
          <button type="button" className="admin-retry-button" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

/* =========================================================
   ADMIN APP
   ========================================================= */

function AdminApp(props) {
  const [section, setSection] = useState("dashboard");
  const { onLogout, nav } = props;
  const activeItem = NAV_ITEMS.find((item) => item.k === section) || NAV_ITEMS[0];
  const ActiveIcon = activeItem.icon;

  const chooseSection = (key) => {
    setSection(key);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="admin-shell admin-shell-modern">
      <header className="admin-top-navigation">
        <div className="admin-top-brand">
          <div className="admin-top-brand-mark">K</div>
          <div>
            <strong>{props.hotel?.name || "Kaveri Kitchen"}</strong>
            <span>STAFF CONSOLE</span>
          </div>
        </div>

        <nav className="admin-top-nav-scroll" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.k;
            return (
              <button
                key={item.k}
                type="button"
                className={active ? "active" : ""}
                onClick={() => chooseSection(item.k)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-top-actions">
          <button type="button" className="admin-top-icon" title="Notifications">
            <Bell size={17} />
          </button>
          <div className="admin-profile-chip" title="Current staff">
            <span>KK</span>
          </div>
          <button type="button" className="admin-top-logout" onClick={onLogout}>
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="admin-main admin-main-modern">
        <div className="admin-page-head">
          <div>
            <span className="admin-page-kicker">STAFF WORKSPACE</span>
            <h1 style={serif}>{activeItem.label}</h1>
            <p>Everything you need to keep the restaurant running smoothly.</p>
          </div>
          <div className="admin-current-module">
            <ActiveIcon size={17} />
            <span>Live workspace</span>
          </div>
        </div>

        <div className="admin-content">
          <AdminErrorBoundary key={section}>
            {section === "dashboard" && <AdminDashboard {...props} />}
            {section === "website" && <AdminWebsiteContent {...props} />}
            {section === "products" && <AdminProducts {...props} />}
            {section === "pricing" && <AdminPricing {...props} />}
            {section === "staff" && <AdminStaff {...props} />}
            {section === "inventory" && <AdminInventory {...props} />}
            {section === "tables" && <AdminTables {...props} />}
            {section === "orders" && <AdminOrders {...props} />}
            {section === "delivery" && <AdminDelivery {...props} />}
            {section === "payments" && <AdminPayments {...props} />}
            {section === "customers" && <AdminCustomers {...props} />}
            {section === "offers" && <AdminOffers {...props} />}
            {section === "arMenu" && <AdminARMenu {...props} />}
            {section === "settings" && <AdminSettings {...props} />}
          </AdminErrorBoundary>
        </div>

        <div className="admin-desktop-footer-actions">
          <button type="button" onClick={() => nav("landing")}>
            <ChevronLeft size={15} /> View restaurant site
          </button>
          <span>Staff Console • Kaveri Kitchen</span>
        </div>
      </main>

      <nav className="admin-bottom-nav" aria-label="Mobile admin navigation">
        <div className="admin-bottom-nav-scroll">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.k;
            return (
              <button
                key={item.k}
                type="button"
                className={active ? "active" : ""}
                onClick={() => chooseSection(item.k)}
              >
                <span className="admin-bottom-icon-wrap">
                  <Icon size={16} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* =========================================================
   ADMIN SHARED COMPONENTS
   ========================================================= */

function Panel({
  title,
  children,
  right
}) {
  return (
    <div
      className="admin-card"
      style={{
        padding: 20,
        marginBottom: 20
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom: 17
          }}
        >
          <div
            style={{
              fontWeight: 750,
              fontSize: 15,
              color: INK
            }}
          >
            {title}
          </div>

          {right}
        </div>
      )}

      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone
}) {
  return (
    <div
      className="stat-card"
      style={{
        padding: 19
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#8A7770",
          fontWeight: 650
        }}
      >
        {label}
      </div>

      <div
        className="admin-stat-value"
        style={{
          fontSize: 27,
          fontWeight: 800,
          marginTop: 8,
          color:
            tone === "brass"
              ? BRASS
              : INK,
          ...serif
        }}
      >
        {value}
      </div>
    </div>
  );
}

function IconBtn({
  icon: Icon,
  onClick,
  tone = "default"
}) {
  const danger =
    tone === "danger";

  return (
    <button
      onClick={onClick}
      style={{
        background: danger
          ? "#fde8e3"
          : "#fff3ed",
        border: 0,
        borderRadius: 9,
        width: 33,
        height: 33,
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        cursor: "pointer",
        color: danger
          ? "#C84632"
          : INK
      }}
    >
      <Icon size={14} />
    </button>
  );
}

function Toggle({
  on,
  onClick,
  good
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: 0,
        cursor: "pointer",
        background: on
          ? good
            ? "#62855A"
            : BRASS
          : "#dccdc6",
        position: "relative"
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition:
            "left .15s"
        }}
      />
    </button>
  );
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

function AdminDashboard({
  orders,
  tables,
  inventory,
  products
}) {
  const todayRevenue =
    orders.reduce(
      (sum, order) =>
        sum + Number(order.total || 0),
      0
    );

  const pending =
    orders.filter(
      (order) =>
        ![
          "Delivered",
          "Cancelled"
        ].includes(order.status)
    ).length;

  const available =
    tables.filter(
      (table) =>
        table.status ===
        "Available"
    ).length;

  const lowStock =
    inventory.filter(
      (item) => {
        const qty =
          item.qty ??
          item.stock ??
          0;

        const min =
          item.min ?? 0;

        return qty <= min;
      }
    ).length;

  const trend = [
    42,
    58,
    51,
    66,
    74,
    60,
    82
  ];

  return (
    <div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(5,minmax(0,1fr))",
          gap: 14,
          marginBottom: 22
        }}
      >
        <StatCard
          label="Today's Orders"
          value={orders.length}
        />

        <StatCard
          label="Today's Revenue"
          value={money(
            todayRevenue
          )}
          tone="brass"
        />

        <StatCard
          label="Pending Orders"
          value={pending}
        />

        <StatCard
          label="Available Tables"
          value={available}
        />

        <StatCard
          label="Low Stock Items"
          value={lowStock}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1.35fr 1fr",
          gap: 16
        }}
      >
        <Panel title="Orders this week">

          <div
            style={{
              display: "flex",
              alignItems:
                "flex-end",
              gap: 10,
              height: 165
            }}
          >
            {trend.map(
              (value, index) => (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    height: "100%",
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    justifyContent:
                      "flex-end",
                    alignItems:
                      "center",
                    gap: 6
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: value,
                      background:
                        index ===
                        trend.length -
                          1
                          ? BRASS
                          : "#f5b7a5",
                      borderRadius:
                        "7px 7px 3px 3px"
                    }}
                  />

                  <span
                    style={{
                      fontSize: 10,
                      color:
                        "#927f77"
                    }}
                  >
                    {
                      "MTWTFSS"[
                        index
                      ]
                    }
                  </span>
                </div>
              )
            )}
          </div>
        </Panel>

        <Panel title="Popular dishes">

          {products
            .filter(
              (product) =>
                product.bestseller
            )
            .slice(0, 6)
            .map((product) => (
              <div
                key={product.id}
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  fontSize: 13,
                  padding:
                    "10px 0",
                  borderBottom:
                    `1px solid ${LINE}`,
                  color: INK
                }}
              >
                <span>
                  {product.name}
                </span>

                <span
                  style={{
                    color:
                      BRASS,
                    fontWeight:
                      750
                  }}
                >
                  {money(
                    product.price
                  )}
                </span>
              </div>
            ))}

        </Panel>
      </div>
    </div>
  );
}

/* =========================================================
   ADMIN PRODUCTS
   ========================================================= */

function AdminProducts({
  products,
  setProducts
}) {
  const [form, setForm] =
    useState({
      name: "",
      category: "Momo",
      qty: "",
      price: "",
      desc: ""
    });

  const addProduct = async () => {
    if (!form.name.trim() || !form.price) {
      return;
    }

    const product = {
      id: `p${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      rating: 4.5,
      veg: false,
      bestseller: false,
      available: true,
      qty: form.qty || "1 plate",
      desc: form.desc || "Freshly prepared.",
      img: categoryEmoji(form.category)
    };

    try {
      await setDoc(doc(db, "products", product.id), product);
      setProducts((current) => [...current, product]);
      setForm({
        name: "",
        category: "Momo",
        qty: "",
        price: "",
        desc: ""
      });
    } catch (error) {
      console.error("Product save failed:", error);
      window.alert(error?.message || "Unable to save product to Firebase.");
    }
  };

  const remove = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts((current) =>
        current.filter((product) => product.id !== id)
      );
    } catch (error) {
      console.error("Product delete failed:", error);
      window.alert(error?.message || "Unable to delete product from Firebase.");
    }
  };

  const toggle = async (id, key) => {
    const product = products.find((item) => item.id === id);
    if (!product) return;

    const nextValue = !product[key];

    try {
      await updateDoc(doc(db, "products", id), {
        [key]: nextValue
      });
      setProducts((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, [key]: nextValue }
            : item
        )
      );
    } catch (error) {
      console.error("Product update failed:", error);
      window.alert(error?.message || "Unable to update product in Firebase.");
    }
  };

  return (
    <div>

      <Panel title="Add Product">

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(5,minmax(0,1fr)) auto",
            gap: 10,
            alignItems:
              "end"
          }}
        >
          <AdminField
            label="Dish Name"
            value={form.name}
            onChange={(value) =>
              setForm({
                ...form,
                name: value
              })
            }
          />

          <div>
            <div
              style={{
                fontSize: 11,
                marginBottom: 5,
                color: "#8a7770"
              }}
            >
              Category
            </div>

            <select
              value={
                form.category
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  category:
                    event.target
                      .value
                })
              }
              style={selStyle}
            >
              {CATEGORIES
                .filter(
                  (category) =>
                    category !==
                    "All"
                )
                .map(
                  (category) => (
                    <option
                      key={category}
                    >
                      {category}
                    </option>
                  )
                )}
            </select>
          </div>

          <AdminField
            label="Quantity"
            value={form.qty}
            onChange={(value) =>
              setForm({
                ...form,
                qty: value
              })
            }
            placeholder="e.g. 8 pcs"
          />

          <AdminField
            label="Price"
            value={form.price}
            onChange={(value) =>
              setForm({
                ...form,
                price: value
              })
            }
          />

          <AdminField
            label="Description"
            value={form.desc}
            onChange={(value) =>
              setForm({
                ...form,
                desc: value
              })
            }
          />

          <button
            onClick={addProduct}
            style={btnBrass}
          >
            Save Product
          </button>
        </div>
      </Panel>

      <Panel
        title={`All Products (${products.length})`}
      >
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {[
                  "Dish",
                  "Category",
                  "Price",
                  "Bestseller",
                  "Available",
                  ""
                ].map((heading) => (
                  <th key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {products.map(
                (product) => (
                  <tr
                    key={
                      product.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          product.name
                        }
                      </strong>
                    </td>

                    <td>
                      {
                        product.category
                      }
                    </td>

                    <td>
                      {money(
                        product.price
                      )}
                    </td>

                    <td>
                      <Toggle
                        on={
                          product.bestseller
                        }
                        onClick={() =>
                          toggle(
                            product.id,
                            "bestseller"
                          )
                        }
                      />
                    </td>

                    <td>
                      <Toggle
                        on={
                          product.available
                        }
                        onClick={() =>
                          toggle(
                            product.id,
                            "available"
                          )
                        }
                        good
                      />
                    </td>

                    <td>
                      <IconBtn
                        icon={Trash2}
                        tone="danger"
                        onClick={() =>
                          remove(
                            product.id
                          )
                        }
                      />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================
   ADMIN PRICING
   ========================================================= */

function AdminPricing({
  products,
  setProducts
}) {
  const updatePrice = async (id, price) => {
    const nextPrice = Number(price) || 0;

    try {
      await updateDoc(doc(db, "products", id), {
        price: nextPrice
      });
      setProducts((current) =>
        current.map((product) =>
          product.id === id
            ? { ...product, price: nextPrice }
            : product
        )
      );
    } catch (error) {
      console.error("Price update failed:", error);
      window.alert(error?.message || "Unable to update price in Firebase.");
    }
  };

  return (
    <Panel title="Price & Menu">

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {[
                "Dish",
                "Category",
                "Price",
                "Rating",
                "Availability"
              ].map(
                (heading) => (
                  <th key={heading}>
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {products.map(
              (product) => (
                <tr
                  key={
                    product.id
                  }
                >
                  <td>
                    {
                      product.name
                    }
                  </td>

                  <td>
                    {
                      product.category
                    }
                  </td>

                  <td>
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 5
                      }}
                    >
                      ₹

                      <input
                        defaultValue={
                          product.price
                        }
                        onBlur={(
                          event
                        ) =>
                          updatePrice(
                            product.id,
                            event.target
                              .value
                          )
                        }
                        style={{
                          width: 90,
                          padding:
                            "8px 10px",
                          border:
                            "1px solid rgba(76,21,4,0.12)",
                          borderRadius: 9,
                          color: INK,
                          background:
                            "#fff"
                        }}
                      />
                    </div>
                  </td>

                  <td>
                    ⭐{" "}
                    {
                      product.rating
                    }
                  </td>

                  <td>
                    <StatusBadge
                      status={
                        product.available
                          ? "In Stock"
                          : "Out of Stock"
                      }
                    />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* =========================================================
   STAFF
   ========================================================= */

const ROLES = [
  "Super Admin",
  "Manager",
  "Kitchen Staff",
  "Waiter",
  "Cashier",
  "Inventory Manager",
  "Delivery Staff"
];

function AdminStaff({
  staff,
  setStaff
}) {
  const DUTIES = ["Kitchen", "Packing", "Cashier", "Dine-in", "Delivery", "Inventory"];
  const [form, setForm] = useState({ name: "", email: "", role: "Waiter", duties: ["Dine-in"] });

  const add = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setStaff((current) => [
      ...current,
      { id: `s${Date.now()}`, ...form, active: true, duties: form.duties.length ? form.duties : ["Dine-in"] }
    ]);
    setForm({ name: "", email: "", role: "Waiter", duties: ["Dine-in"] });
  };

  const toggleActive = (id) => setStaff((current) => current.map((member) => member.id === id ? { ...member, active: !member.active } : member));
  const remove = (id) => setStaff((current) => current.filter((member) => member.id !== id));
  const toggleDuty = (duty) => setForm((current) => ({ ...current, duties: current.duties.includes(duty) ? current.duties.filter((item) => item !== duty) : [...current.duties, duty] }));
  const updateDuty = (id, duty) => setStaff((current) => current.map((member) => member.id === id ? { ...member, duties: (member.duties || []).includes(duty) ? (member.duties || []).filter((item) => item !== duty) : [...(member.duties || []), duty] } : member));

  return (
    <div>
      <Panel title="Add staff & assign duties" right={<Users size={16} color={BRASS} />}>
        <div className="staff-form-grid">
          <AdminField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <AdminField label="Email / phone" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <div><div className="admin-mini-label">Role</div><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={selStyle}>{ROLES.map((role) => <option key={role}>{role}</option>)}</select></div>
          <button onClick={add} style={btnBrass}><Plus size={14} /> Add Staff</button>
        </div>
        <div className="duty-picker">
          <div className="admin-mini-label">Primary duties</div>
          {DUTIES.map((duty) => <button type="button" key={duty} className={form.duties.includes(duty) ? "selected" : ""} onClick={() => toggleDuty(duty)}>{duty}</button>)}
        </div>
      </Panel>

      <Panel title={`Team (${staff.length})`}>
        <div className="staff-cards-grid">
          {staff.map((member) => (
            <article className="staff-admin-card" key={member.id}>
              <div className="staff-card-head">
                <div className="staff-avatar">{member.name.slice(0,1).toUpperCase()}</div>
                <div><strong>{member.name}</strong><span>{member.email}</span></div>
                <button className="icon-only-button" onClick={() => remove(member.id)}><Trash2 size={14} /></button>
              </div>
              <div className="staff-role-line"><span>{member.role}</span><button onClick={() => toggleActive(member.id)} className={member.active ? "staff-live" : "staff-off"}>{member.active ? "Active" : "Off Duty"}</button></div>
              <div className="staff-duties-label">Assigned work</div>
              <div className="staff-duty-list">
                {DUTIES.map((duty) => <button type="button" key={duty} className={(member.duties || []).includes(duty) ? "selected" : ""} onClick={() => updateDuty(member.id, duty)}>{duty}</button>)}
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================
   INVENTORY
   ========================================================= */

function AdminInventory({
  inventory,
  setInventory
}) {
  const [form, setForm] =
    useState({
      name: "",
      qty: "",
      unit: "kg",
      min: ""
    });

  const add = async () => {
    if (!form.name.trim() || !form.qty) {
      return;
    }

    const item = {
      id: `i${Date.now()}`,
      name: form.name.trim(),
      qty: Number(form.qty),
      unit: form.unit,
      min: Number(form.min) || 1,
      supplier: "—",
      updated: "Just now"
    };

    try {
      await setDoc(doc(db, "inventory", item.id), item);
      setInventory((current) => [...current, item]);
      setForm({ name: "", qty: "", unit: "kg", min: "" });
    } catch (error) {
      console.error("Inventory save failed:", error);
      window.alert(error?.message || "Unable to save inventory to Firebase.");
    }
  };

  const adjust = async (id, delta) => {
    const item = inventory.find((entry) => entry.id === id);
    if (!item) return;

    const currentQty = Number(item.qty ?? item.stock ?? 0);
    const nextQty = Math.max(0, currentQty + delta);

    try {
      await updateDoc(doc(db, "inventory", id), {
        qty: nextQty,
        updated: "Just now"
      });
      setInventory((current) =>
        current.map((entry) =>
          entry.id === id
            ? { ...entry, qty: nextQty, updated: "Just now" }
            : entry
        )
      );
    } catch (error) {
      console.error("Inventory update failed:", error);
      window.alert(error?.message || "Unable to update inventory in Firebase.");
    }
  };

  const statusFor = (item) => {
    const qty =
      item.qty ??
      item.stock ??
      0;

    const min =
      item.min ?? 0;

    if (qty === 0) {
      return "Out of Stock";
    }

    if (qty <= min) {
      return "Low Stock";
    }

    return "In Stock";
  };

  return (
    <div>

      <Panel title="Add Inventory Item">

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr 1fr 1fr auto",
            gap: 10,
            alignItems:
              "end"
          }}
        >
          <AdminField
            label="Item name"
            value={form.name}
            onChange={(value) =>
              setForm({
                ...form,
                name: value
              })
            }
          />

          <AdminField
            label="Quantity"
            value={form.qty}
            onChange={(value) =>
              setForm({
                ...form,
                qty: value
              })
            }
          />

          <div>
            <div
              style={{
                fontSize: 11,
                marginBottom: 5,
                color:
                  "#8a7770"
              }}
            >
              Unit
            </div>

            <select
              value={form.unit}
              onChange={(event) =>
                setForm({
                  ...form,
                  unit:
                    event.target
                      .value
                })
              }
              style={selStyle}
            >
              {[
                "kg",
                "pcs",
                "bottles",
                "litres",
                "packs"
              ].map(
                (unit) => (
                  <option
                    key={unit}
                  >
                    {unit}
                  </option>
                )
              )}
            </select>
          </div>

          <AdminField
            label="Minimum stock"
            value={form.min}
            onChange={(value) =>
              setForm({
                ...form,
                min: value
              })
            }
          />

          <button
            onClick={add}
            style={btnBrass}
          >
            Add Item
          </button>
        </div>
      </Panel>

      <Panel title="Stock">

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {[
                  "Item",
                  "Stock",
                  "Min",
                  "Supplier",
                  "Status",
                  "Updated",
                  "Adjust"
                ].map(
                  (heading) => (
                    <th
                      key={
                        heading
                      }
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {inventory.map(
                (item) => {
                  const qty =
                    item.qty ??
                    item.stock ??
                    0;

                  const name =
                    item.name ??
                    item.item ??
                    "Unnamed";

                  return (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        {name}
                      </td>

                      <td>
                        {qty}{" "}
                        {
                          item.unit
                        }
                      </td>

                      <td>
                        {item.min ??
                          0}{" "}
                        {
                          item.unit
                        }
                      </td>

                      <td>
                        {item.supplier ??
                          "—"}
                      </td>

                      <td>
                        <StatusBadge
                          status={statusFor(
                            item
                          )}
                        />
                      </td>

                      <td>
                        {
                          item.updated
                        }
                      </td>

                      <td>
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 5
                          }}
                        >
                          <IconBtn
                            icon={
                              Minus
                            }
                            onClick={() =>
                              adjust(
                                item.id,
                                -1
                              )
                            }
                          />

                          <IconBtn
                            icon={
                              Plus
                            }
                            onClick={() =>
                              adjust(
                                item.id,
                                1
                              )
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================
   TABLES
   ========================================================= */

function AdminTables({
  tables,
  setTables,
  products
}) {
  const [openId, setOpenId] =
    useState(null);

  const table =
    tables.find(
      (item) =>
        item.id === openId
    );

  const currentOrder =
    table?.order || [];

  const subtotal = (items) =>
    items.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
          Number(item.qty || 0),
      0
    );

  const addItem = (
    name,
    price
  ) => {
    setTables(
      (current) =>
        current.map(
          (item) => {
            if (
              item.id !==
              openId
            ) {
              return item;
            }

            const order =
              item.order || [];

            const existing =
              order.find(
                (entry) =>
                  entry.name ===
                  name
              );

            const nextOrder =
              existing
                ? order.map(
                    (entry) =>
                      entry.name ===
                      name
                        ? {
                            ...entry,
                            qty:
                              entry.qty +
                              1
                          }
                        : entry
                  )
                : [
                    ...order,
                    {
                      name,
                      qty: 1,
                      price
                    }
                  ];

            return {
              ...item,
              order:
                nextOrder,
              status:
                "Occupied"
            };
          }
        )
    );
  };

  const markAvailable =
    () => {
      setTables(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              openId
                ? {
                    ...item,
                    order:
                      [],
                    status:
                      "Available"
                  }
                : item
          )
      );

      setOpenId(null);
    };

  return (
    <div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4,minmax(0,1fr))",
          gap: 14
        }}
      >
        {tables.map(
          (item) => {
            const order =
              item.order || [];

            return (
              <button
                key={
                  item.id
                }
                onClick={() =>
                  setOpenId(
                    item.id
                  )
                }
                style={{
                  background:
                    "#fff",
                  border:
                    "1px solid rgba(76,21,4,0.08)",
                  borderRadius: 18,
                  padding: 18,
                  cursor:
                    "pointer",
                  textAlign:
                    "left",
                  boxShadow:
                    "0 7px 20px rgba(76,21,4,0.05)"
                }}
              >
                <div
                  style={{
                    fontWeight:
                      800,
                    color: INK,
                    marginBottom: 9
                  }}
                >
                  {item.name}
                </div>

                <StatusBadge
                  status={
                    item.status
                  }
                />

                {order.length >
                  0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        "#85736c",
                      marginTop: 9
                    }}
                  >
                    {
                      order.length
                    }{" "}
                    items ·{" "}
                    {money(
                      subtotal(
                        order
                      )
                    )}
                  </div>
                )}
              </button>
            );
          }
        )}
      </div>

      {table && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setOpenId(null)
          }
        >
          <div
            className="modal-card"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className="modal-header"
            >
              <div>
                <h2>
                  {
                    table.name
                  }
                </h2>

                <StatusBadge
                  status={
                    table.status
                  }
                />
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setOpenId(null)
                }
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                fontWeight:
                  750,
                marginBottom:
                  10,
                color: INK
              }}
            >
              Current Order
            </div>

            {currentOrder.length ===
              0 && (
              <div
                style={{
                  color:
                    "#89766e",
                  fontSize: 13,
                  marginBottom:
                    12
                }}
              >
                No items yet.
              </div>
            )}

            {currentOrder.map(
              (item, index) => (
                <div
                  key={index}
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    gap: 15,
                    padding:
                      "7px 0",
                    color: INK,
                    fontSize: 13
                  }}
                >
                  <span>
                    {item.qty} ×{" "}
                    {item.name}
                  </span>

                  <span>
                    {money(
                      item.qty *
                        item.price
                    )}
                  </span>
                </div>
              )
            )}

            {currentOrder.length >
              0 && (
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  marginTop: 8,
                  paddingTop: 12,
                  borderTop:
                    `1px solid ${LINE}`,
                  fontWeight:
                    800
                }}
              >
                <span>
                  Subtotal
                </span>

                <span>
                  {money(
                    subtotal(
                      currentOrder
                    )
                  )}
                </span>
              </div>
            )}

            <div
              style={{
                marginTop: 20,
                marginBottom: 9,
                fontWeight: 750,
                color: INK
              }}
            >
              Add Item
            </div>

            <div
              style={{
                display:
                  "flex",
                flexWrap:
                  "wrap",
                gap: 7,
                marginBottom: 18
              }}
            >
              {products
                .filter(
                  (product) =>
                    product.available
                )
                .slice(0, 8)
                .map(
                  (product) => (
                    <button
                      key={
                        product.id
                      }
                      onClick={() =>
                        addItem(
                          product.name,
                          product.price
                        )
                      }
                      style={{
                        fontSize: 11,
                        background:
                          "#fff0eb",
                        border:
                          "1px solid rgba(255,107,74,0.15)",
                        borderRadius:
                          999,
                        padding:
                          "7px 10px",
                        color:
                          INK,
                        cursor:
                          "pointer"
                      }}
                    >
                      +{" "}
                      {
                        product.name
                      }
                    </button>
                  )
                )}
            </div>

            <div
              style={{
                display:
                  "flex",
                gap: 9
              }}
            >
              <button
                style={{
                  ...btnBrass,
                  flex: 1
                }}
                onClick={() =>
                  alert(
                    "Bill generation can be connected to your printer/POS backend."
                  )
                }
              >
                Generate Bill
              </button>

              <button
                onClick={
                  markAvailable
                }
                style={{
                  flex: 1,
                  background:
                    "#fff0eb",
                  color: INK,
                  border:
                    "1px solid rgba(76,21,4,0.1)",
                  borderRadius:
                    10,
                  padding:
                    "10px",
                  cursor:
                    "pointer",
                  fontWeight:
                    700
                }}
              >
                Mark Available
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ORDERS
   ========================================================= */

function AdminOrders({ orders, setOrders }) {
  const [filter, setFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [liveOrders, setLiveOrders] = useState(() =>
    Array.isArray(orders) ? orders : []
  );
  const filters = ["All", "Pending", "Preparing", "Ready", "Out for Delivery", "Delivered", "Cancelled", "Delivery", "Dine-in", "Takeaway"];
  const STATUS_FLOW = ["Pending", "Accepted", "Preparing", "Ready", "Out for Delivery", "Delivered", "Cancelled"];

  // Keep ONLY the Orders section directly synced with Firestore.
  // This prevents the Orders screen from depending on a stale/missing
  // parent orders prop while leaving every other admin section untouched.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        const firebaseOrders = snapshot.docs.map((item) => ({
          ...item.data(),
          id: item.data()?.id || item.id,
          firestoreDocId: item.id
        }));

        setLiveOrders(firebaseOrders);
      },
      (error) => {
        console.error("Firestore orders error:", error);
      }
    );

    return () => unsubscribe();
  }, [setOrders]);

  const saveOrderChanges = async (id, changes, fallbackOrder) => {
    const exactRef = doc(db, "orders", id);

    try {
      await updateDoc(exactRef, { ...changes, updatedAt: serverTimestamp() });
      return;
    } catch (error) {
      if (error?.code !== "not-found") throw error;
    }

    const snapshot = await getDocs(query(collection(db, "orders"), where("id", "==", id)));
    if (snapshot.empty) {
      await setDoc(exactRef, { ...fallbackOrder, ...changes, id, updatedAt: serverTimestamp() }, { merge: true });
      return;
    }

    await Promise.all(
      snapshot.docs.map((item) =>
        updateDoc(item.ref, { ...changes, updatedAt: serverTimestamp() })
      )
    );
  };

  const advance = async (id) => {
    const order = liveOrders.find((item) => item.id === id);
    if (!order) return;

    const index = STATUS_FLOW.indexOf(order.status);
    const next =
      order.status === "New"
        ? "Accepted"
        : index >= 0 && index < STATUS_FLOW.length - 2
          ? STATUS_FLOW[index + 1]
          : null;

    if (!next) return;
    const notification =
      next === "Out for Delivery"
        ? `Your order ${order.id} is out for delivery.`
        : next === "Delivered"
          ? `Your order ${order.id} has been delivered successfully.`
          : `Order ${order.id} is now ${next}.`;

    try {
      await saveOrderChanges(id, { status: next, notification }, order);

      setLiveOrders((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status: next, notification }
            : item
        )
      );

      if (typeof setOrders === "function") {
        setOrders((current) =>
          current.map((item) =>
            item.id === id
              ? { ...item, status: next, notification }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Order status update failed:", error);
      window.alert(error?.message || "Unable to update order status in Firebase.");
    }
  };

  const cancel = async (id) => {
    const order = liveOrders.find((item) => item.id === id);
    if (!order) return;

    const notification = `Your order ${order.id} has been cancelled.`;

    try {
      await saveOrderChanges(id, { status: "Cancelled", notification }, order);

      setLiveOrders((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status: "Cancelled", notification }
            : item
        )
      );

      if (typeof setOrders === "function") {
        setOrders((current) =>
          current.map((item) =>
            item.id === id
              ? { ...item, status: "Cancelled", notification }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Order cancellation failed:", error);
      window.alert(error?.message || "Unable to cancel order in Firebase.");
    }
  };

  const filtered = liveOrders.filter((order) => filter === "All" || filter === "Pending" ? (filter === "Pending" ? !["Delivered", "Cancelled"].includes(order.status) : true) : ["Delivery", "Dine-in", "Takeaway"].includes(filter) ? order.type === filter : order.status === filter);

  return (
    <div className="orders-admin-wrap">
      <div className="cms-hero-head">
        <div><span className="cms-kicker">ORDER OPERATIONS</span><h2>Orders</h2><p>See who ordered, exact dishes, quantities, total price and the current status.</p></div>
        <div className="orders-total-pill"><ReceiptText size={15} /> {liveOrders.length} total orders</div>
      </div>
      <div className="order-filter-pills">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <Panel>
        <div className="data-table-wrap">
          <table className="data-table order-admin-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.firestoreDocId || order.id}>
                  <td><strong>{order.id}</strong><div className="muted-cell">{order.time || "just now"}</div></td>
                  <td><strong>{order.customer || "Guest"}</strong><div className="muted-cell">{order.phone || "No phone"}</div></td>
                  <td><div className="order-items-cell">{(order.items || []).map((item, index) => <span key={index}>{item.qty}× {item.name}</span>)}</div></td>
                  <td><strong>{money(order.total)}</strong><div className="muted-cell">{order.paymentMethod || "Payment not recorded"}</div></td>
                  <td>{order.type}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td><div className="order-actions-inline"><button className="details-button" onClick={() => setSelectedOrder(order)}>Details</button>{!["Delivered", "Cancelled"].includes(order.status) && <button className="advance-button" onClick={() => advance(order.id)}>Advance</button>}{order.status !== "Cancelled" && <button className="icon-only-button danger" onClick={() => cancel(order.id)}><X size={14} /></button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {selectedOrder && <div className="admin-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
        <div className="admin-modal-card order-detail-modal">
          <button className="admin-modal-close" onClick={() => setSelectedOrder(null)}><X size={16} /></button>
          <span className="cms-kicker">ORDER DETAILS</span><h3>{selectedOrder.id}</h3>
          <div className="order-detail-customer"><div className="delivery-customer-icon"><UserCircle2 size={18} /></div><div><strong>{selectedOrder.customer || "Guest"}</strong><span>{selectedOrder.phone || "—"}</span><span>{selectedOrder.address || (selectedOrder.type === "Dine-in" ? selectedOrder.customer : "—")}</span></div></div>
          <div className="detail-items-list">{(selectedOrder.items || []).map((item, index) => <div key={index}><div><strong>{item.qty}× {item.name}</strong><span>Unit price {money(item.price || 0)}</span></div><strong>{money(Number(item.qty || 0) * Number(item.price || 0))}</strong></div>)}</div>
          <div className="order-detail-total"><span>Total</span><strong>{money(selectedOrder.total)}</strong></div>
          <div className="detail-grid"><div><span>Order type</span><strong>{selectedOrder.type}</strong></div><div><span>Status</span><strong>{selectedOrder.status}</strong></div><div><span>Payment</span><strong>{selectedOrder.paymentMethod || "Not recorded"}</strong></div><div><span>Time</span><strong>{selectedOrder.time || "—"}</strong></div></div>
        </div>
      </div>}
    </div>
  );
}

/* =========================================================
   CUSTOMERS
   ========================================================= */

function AdminCustomers({
  orders
}) {
  const customerMap = {};

  orders.forEach(
    (order) => {
      if (!order.phone) {
        return;
      }

      if (
        !customerMap[
          order.phone
        ]
      ) {
        customerMap[
          order.phone
        ] = {
          name:
            order.customer,
          phone:
            order.phone,
          orders: 0,
          spend: 0
        };
      }

      customerMap[
        order.phone
      ].orders += 1;

      customerMap[
        order.phone
      ].spend +=
        Number(
          order.total || 0
        );
    }
  );

  const customers =
    Object.values(
      customerMap
    );

  return (
    <Panel
      title={`Customers (${customers.length})`}
    >
      {customers.length ===
        0 && (
        <div className="empty-state">
          Customers will appear
          after delivery or
          takeaway orders.
        </div>
      )}

      {customers.length >
        0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {[
                  "Name",
                  "Phone",
                  "Orders",
                  "Total Spend"
                ].map(
                  (heading) => (
                    <th
                      key={
                        heading
                      }
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {customers.map(
                (customer) => (
                  <tr
                    key={
                      customer.phone
                    }
                  >
                    <td>
                      {
                        customer.name
                      }
                    </td>

                    <td>
                      {
                        customer.phone
                      }
                    </td>

                    <td>
                      {
                        customer.orders
                      }
                    </td>

                    <td
                      style={{
                        color:
                          BRASS,
                        fontWeight:
                          800
                      }}
                    >
                      {money(
                        customer.spend
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* =========================================================
   OFFERS & BANNERS ADMIN
   ========================================================= */

function AdminOffers({
  offerBanners = [],
  setOfferBanners
}) {
  const emptyForm = {
    image: "",
    alt: "",
    title: "",
    subtitle: "",
    buttonText: "Explore Offer",
    enabled: true
  };

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  const ghostButton = {
    minHeight: 38,
    padding: "0 12px",
    border: "1px solid rgba(76,21,4,.11)",
    borderRadius: 9,
    background: "#fff",
    color: INK,
    fontSize: 10,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ ...emptyForm });
  };

  const startAdd = () => {
    setNotice("");
    resetForm();
  };

  const startEdit = (banner) => {
    setEditing(banner.id);
    setForm({
      image: banner.image || "",
      alt: banner.alt || "Special offer",
      title: banner.title || "Special Offer",
      subtitle: banner.subtitle || "Freshly prepared for you.",
      buttonText: banner.buttonText || "Explore Offer",
      enabled: banner.enabled !== false
    });
    setNotice("");
  };

  const saveBanner = (event) => {
    event.preventDefault();

    const image = String(form.image || "").trim();
    if (!image || image === "Local uploaded image") {
      setNotice("Please add a banner image first.");
      return;
    }

    const payload = {
      image,
      alt: String(form.alt || "").trim() || "Special offer",
      title: String(form.title || "").trim() || "Special Offer",
      subtitle:
        String(form.subtitle || "").trim() ||
        "Freshly prepared for you.",
      buttonText:
        String(form.buttonText || "").trim() || "Explore Offer",
      enabled: form.enabled !== false
    };

    if (editing) {
      setOfferBanners((current) =>
        current.map((banner) =>
          banner.id === editing ? { ...banner, ...payload } : banner
        )
      );
      setNotice("Banner updated successfully.");
    } else {
      setOfferBanners((current) => [
        ...current,
        {
          id: `offer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...payload
        }
      ]);
      setNotice("Banner added successfully.");
    }

    resetForm();
  };

  const readImageFile = (file) =>
    new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Please select image files only."));
        return;
      }

      // Keep individual uploads reasonably small because banners are stored
      // in browser storage by the parent app.
      if (file.size > 2.5 * 1024 * 1024) {
        reject(
          new Error(
            `${file.name} is larger than 2.5 MB. Please compress it and try again.`
          )
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file);
    });

  const uploadMultipleImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setUploading(true);
    setNotice("");

    try {
      const uploaded = [];
      for (const file of files) {
        try {
          const image = await readImageFile(file);
          uploaded.push({ file, image });
        } catch (error) {
          setNotice(error?.message || "One of the images could not be added.");
        }
      }

      if (uploaded.length) {
        const timestamp = Date.now();
        setOfferBanners((current) => [
          ...current,
          ...uploaded.map(({ file, image }, index) => ({
            id: `offer-${timestamp}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            image,
            alt: file.name.replace(/\.[^.]+$/, "") || "Special offer",
            title: "Special Offer",
            subtitle: "Freshly prepared for you.",
            buttonText: "Explore Offer",
            enabled: true
          }))
        ]);
        setNotice(
          `${uploaded.length} banner${uploaded.length === 1 ? "" : "s"} added. You can keep adding more.`
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const addImageUrl = () => {
    const image = String(form.image || "").trim();
    if (!image) {
      setNotice("Paste an image URL first.");
      return;
    }

    setOfferBanners((current) => [
      ...current,
      {
        id: `offer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        image,
        alt: String(form.alt || "").trim() || "Special offer",
        title: String(form.title || "").trim() || "Special Offer",
        subtitle:
          String(form.subtitle || "").trim() ||
          "Freshly prepared for you.",
        buttonText:
          String(form.buttonText || "").trim() || "Explore Offer",
        enabled: form.enabled !== false
      }
    ]);

    setNotice("Banner image added to the list.");
    resetForm();
  };

  const removeBanner = (id) => {
    if (!window.confirm("Delete this promotional banner?")) return;

    setOfferBanners((current) =>
      current.filter((banner) => banner.id !== id)
    );

    if (editing === id) resetForm();
  };

  const toggleBanner = (id) => {
    setOfferBanners((current) =>
      current.map((banner) =>
        banner.id === id
          ? { ...banner, enabled: !banner.enabled }
          : banner
      )
    );
  };

  return (
    <div className="offers-admin-page">
      <div className="cms-hero-head">
        <div>
          <span className="cms-kicker">HOMEPAGE OFFER CAROUSEL</span>
          <h2>Offers & Banners</h2>
          <p>
            Add as many promotional banner images as your website needs.
            Upload multiple images together, edit them anytime, or paste an image URL.
          </p>
        </div>

        <div className="offers-admin-count-pill">
          <ImageIcon size={15} />
          {offerBanners.length} banners
        </div>
      </div>

      <Panel title={editing ? "Edit banner" : "Add new banners"} right={<Flame size={16} color={BRASS} />}>
        <div className="offers-upload-actions">
          <label className="offers-upload-primary">
            <ImageIcon size={17} />
            <span>
              {uploading ? "Uploading…" : "Upload multiple images"}
            </span>
            <small>No banner-count limit</small>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={uploadMultipleImages}
              disabled={uploading}
              hidden
            />
          </label>

          <div className="offers-upload-divider">OR</div>

          <div className="offers-url-box">
            <div className="cms-field">
              <label>Banner image URL</label>
              <input
                value={form.image.startsWith("data:") ? "Local uploaded image" : form.image}
                placeholder="https://.../offer-banner.jpg"
                onChange={(event) =>
                  setForm((current) => ({ ...current, image: event.target.value }))
                }
              />
            </div>
            <button type="button" style={btnBrass} onClick={addImageUrl}>
              <Plus size={14} /> Add Image
            </button>
          </div>
        </div>

        <form className="offers-banner-form" onSubmit={saveBanner}>
          <AdminField
            label="Image description"
            value={form.alt}
            placeholder="Weekend combo offer"
            onChange={(value) => setForm((current) => ({ ...current, alt: value }))}
          />
          <AdminField
            label="Banner heading"
            value={form.title}
            placeholder="Weekend Pizza Celebration"
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
          />
          <AdminField
            label="Banner subtext"
            value={form.subtitle}
            placeholder="Hot, fresh and ready for your table."
            onChange={(value) => setForm((current) => ({ ...current, subtitle: value }))}
          />
          <AdminField
            label="Button text"
            value={form.buttonText}
            placeholder="Explore Offer"
            onChange={(value) => setForm((current) => ({ ...current, buttonText: value }))}
          />

          <label className="offers-enabled-check">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  enabled: event.target.checked
                }))
              }
            />
            Show this banner on the homepage
          </label>

          <div className="offers-form-buttons">
            <button type="submit" style={btnBrass}>
              {editing ? <Pencil size={14} /> : <Plus size={14} />}
              {editing ? "Save changes" : "Add banner"}
            </button>
            {editing && (
              <button type="button" style={ghostButton} onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {notice && <div className="offers-admin-notice">{notice}</div>}
      </Panel>

      <div className="offers-admin-list-head">
        <div>
          <span className="cms-kicker">BANNER LIBRARY</span>
          <h3>All promotional images</h3>
        </div>
        <span>{offerBanners.filter((banner) => banner.enabled !== false).length} live</span>
      </div>

      <div className="offers-admin-grid">
        {offerBanners.map((banner, index) => (
          <article className="admin-banner-card offers-admin-card" key={banner.id || `banner-${index}`}>
            <div className="admin-banner-preview offers-preview">
              <img
                src={banner.image}
                alt={banner.alt || "Promotional banner"}
                onError={(event) => {
                  event.currentTarget.style.opacity = "0.22";
                }}
              />
              <span className={`admin-banner-status ${banner.enabled !== false ? "active" : ""}`}>
                {banner.enabled !== false ? "LIVE" : "HIDDEN"}
              </span>
              <span className="offers-index-badge">#{index + 1}</span>
            </div>

            <div className="offers-admin-card-body">
              <strong>{banner.title || banner.alt || "Promotional banner"}</strong>
              <span>{banner.subtitle || "Homepage promotional image"}</span>

              <div className="offers-admin-card-actions">
                <button type="button" style={ghostButton} onClick={() => startEdit(banner)}>
                  <Pencil size={13} /> Edit
                </button>
                <button type="button" style={ghostButton} onClick={() => toggleBanner(banner.id)}>
                  {banner.enabled !== false ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  style={{ ...ghostButton, color: "#C84632", borderColor: "rgba(200,70,50,.18)" }}
                  onClick={() => removeBanner(banner.id)}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </article>
        ))}

        {offerBanners.length === 0 && (
          <div className="orders-empty">
            <ImageIcon size={30} />
            <h3>No banners yet</h3>
            <p>Upload one or more banner images to build your homepage carousel.</p>
            <button type="button" style={btnBrass} onClick={startAdd}>
              <Plus size={14} /> Add first banner
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


/* =========================================================
   WEBSITE CONTENT / CMS
   ========================================================= */

function AdminWebsiteContent({ siteContent, setSiteContent }) {
  const [form, setForm] = useState(() => ({ ...seedSiteContent(), ...siteContent }));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm((current) => ({ ...current, ...siteContent }));
  }, [siteContent]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const uploadImage = (key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Please choose an image smaller than 2 MB for browser storage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update(key, String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const save = () => {
    setSiteContent(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const input = (key, label, placeholder = "", multiline = false) => (
    <div className="cms-field">
      <label>{label}</label>
      {multiline ? (
        <textarea value={form[key] || ""} placeholder={placeholder} onChange={(e) => update(key, e.target.value)} rows={4} />
      ) : (
        <input value={form[key] || ""} placeholder={placeholder} onChange={(e) => update(key, e.target.value)} />
      )}
    </div>
  );

  const imageField = (key, label) => (
    <div className="cms-image-field">
      {input(key, label, "https://...")}
      <label className="cms-upload-button">
        <ImageIcon size={14} /> Upload from computer
        <input type="file" accept="image/*" onChange={(e) => uploadImage(key, e)} hidden />
      </label>
      {form[key] && <img src={form[key]} alt="CMS preview" className="cms-image-preview" />}
    </div>
  );

  return (
    <div className="cms-wrap">
      <div className="cms-hero-head">
        <div>
          <span className="cms-kicker">FULL WEBSITE CONTROL</span>
          <h2>Homepage Content Manager</h2>
          <p>Change homepage text and imagery from one place. Save once and the customer-facing page updates immediately.</p>
        </div>
        <button className="btn-primary cms-save-btn" onClick={save}>
          <Save size={15} /> {saved ? "Saved" : "Save All Changes"}
        </button>
      </div>

      <Panel title="Hero section" right={<Type size={16} color={BRASS} />}>
        <div className="cms-grid-2">
          {input("heroEyebrow", "Eyebrow text")}
          {input("heroTitle", "Main headline", "Savor the Taste of\nPerfection.", true)}
          <div className="cms-field cms-span-2">{input("heroText", "Hero description", "Fresh ingredients...", true)}</div>
        </div>
        <div className="cms-image-grid">
          {imageField("heroMainImage", "Main hero image")}
          {imageField("heroLeftImage", "Left floating food image")}
          {imageField("heroRightImage", "Right floating food image")}
        </div>
      </Panel>

      <Panel title="Homepage menu / signature section" right={<Package size={16} color={BRASS} />}>
        <div className="cms-grid-2">
          {input("signatureTitle", "Section title")}
          {input("signatureText", "Section description", "Classic favourites...", true)}
        </div>
      </Panel>

      <Panel title="About section" right={<ChefHat size={16} color={BRASS} />}>
        <div className="cms-grid-2">
          {input("aboutEyebrow", "Eyebrow")}
          {input("aboutTitle", "Heading", "Good food.\nGood mood.", true)}
          <div className="cms-span-2">{input("aboutText", "Description", "Carefully selected ingredients...", true)}</div>
        </div>
        {imageField("aboutImage", "About section image")}
      </Panel>

      <Panel title="Reviews section" right={<MessageSquare size={16} color={BRASS} />}>
        <div className="cms-grid-2">
          {input("reviewsTitle", "Review heading")}
          {input("reviewsText", "Review section description", "Good food, warm service...", true)}
        </div>
      </Panel>

      <Panel title="AR Coming Soon section" right={<Sparkles size={16} color={BRASS} />}>
        <div className="cms-grid-2">
          {input("arKicker", "AR kicker")}
          {input("arTitle", "AR headline", "See your food\nbefore it arrives.", true)}
          <div className="cms-span-2">{input("arText", "AR description", "Preview selected dishes...", true)}</div>
          <div className="cms-span-2">{input("arTags", "AR tags", "3D Food Preview,Table View,Coming Soon")}</div>
        </div>
      </Panel>

      <Panel title="Final order call-to-action" right={<ShoppingCart size={16} color={BRASS} />}>
        <div className="cms-grid-2">
          {input("finalEyebrow", "Eyebrow")}
          {input("finalTitle", "Heading", "Don't Wait —\nOrder Now!", true)}
          <div className="cms-span-2">{input("finalText", "Description", "Freshly prepared favourites...", true)}</div>
        </div>
      </Panel>

      <Panel title="Footer content" right={<ReceiptText size={16} color={BRASS} />}>
        <div className="cms-grid-2">
          {input("footerTagline", "Footer tagline", "Fresh food...", true)}
          {input("footerHours", "Opening hours")}
          {input("footerDays", "Opening days")}
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================
   DELIVERY CONTROL
   ========================================================= */

function AdminDelivery({ orders, setOrders }) {
  const [selected, setSelected] = useState(null);
  const deliveryOrders = orders.filter((order) => order.type === "Delivery");

  const statusMessage = (status, order) => {
    const first = order.customer || "Customer";
    if (status === "Out for Delivery") return `Hi ${first}, your order ${order.id} is out for delivery.`;
    if (status === "Delivered") return `Your order ${order.id} has been delivered successfully. Thank you!`;
    if (status === "Ready") return `Your order ${order.id} is ready for pickup/delivery.`;
    return `Order ${order.id} is now ${status}.`;
  };

  const setStatus = async (id, status) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;

    const message = statusMessage(status, order);
    const notificationTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });

    try {
      const changes = { status, notification: message, notificationTime };
      const exactRef = doc(db, "orders", id);

      try {
        await updateDoc(exactRef, { ...changes, updatedAt: serverTimestamp() });
      } catch (error) {
        if (error?.code !== "not-found") throw error;

        const snapshot = await getDocs(query(collection(db, "orders"), where("id", "==", id)));
        if (snapshot.empty) {
          await setDoc(exactRef, { ...order, ...changes, id, updatedAt: serverTimestamp() }, { merge: true });
        } else {
          await Promise.all(
            snapshot.docs.map((item) =>
              updateDoc(item.ref, { ...changes, updatedAt: serverTimestamp() })
            )
          );
        }
      }

      setOrders((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, ...changes }
            : item
        )
      );

      if (["Out for Delivery", "Delivered"].includes(status)) {
        alert(
          `Customer notification prepared for ${order.phone || "customer"}.\n\n${message}\n\nFor real SMS delivery, connect an SMS provider/backend.`
        );
      }
    } catch (error) {
      console.error("Delivery status update failed:", error);
      window.alert(error?.message || "Unable to update delivery status in Firebase.");
    }
  };

  return (
    <div className="delivery-admin-wrap">
      <div className="cms-hero-head">
        <div>
          <span className="cms-kicker">LIVE DELIVERY OPERATIONS</span>
          <h2>Delivery Control</h2>
          <p>Move orders through delivery stages and keep the customer-facing status in sync.</p>
        </div>
        <div className="delivery-live-badge"><span /> {deliveryOrders.length} delivery orders</div>
      </div>

      <div className="delivery-kanban">
        {deliveryOrders.length === 0 ? (
          <Panel title="No delivery orders"><div className="orders-empty">New delivery orders will appear here.</div></Panel>
        ) : deliveryOrders.map((order) => (
          <article className="delivery-order-card" key={order.id}>
            <div className="delivery-order-top">
              <div><strong>{order.id}</strong><span>{order.time || "just now"}</span></div>
              <StatusBadge status={order.status} />
            </div>
            <div className="delivery-customer">
              <div className="delivery-customer-icon"><Truck size={15} /></div>
              <div><strong>{order.customer}</strong><span>{order.phone || "No phone"}</span><span>{order.address || "Address not added"}</span></div>
            </div>
            <div className="delivery-items-mini">
              {(order.items || []).map((item, index) => <div key={index}><span>{item.qty}× {item.name}</span><strong>{money(Number(item.qty || 0) * Number(item.price || 0))}</strong></div>)}
            </div>
            {order.notification && <div className="delivery-notice"><MessageSquare size={13} /><span>{order.notification}</span></div>}
            <div className="delivery-actions">
              {[["Accepted", "Accept"], ["Preparing", "Start Kitchen"], ["Ready", "Ready"], ["Out for Delivery", "Out for Delivery"], ["Delivered", "Delivered ✓"]].map(([status, label]) => (
                <button key={status} className={order.status === status ? "active" : ""} disabled={order.status === status || order.status === "Delivered"} onClick={() => setStatus(order.id, status)}>{label}</button>
              ))}
              <button className="delivery-details-btn" onClick={() => setSelected(order)}>Details</button>
            </div>
          </article>
        ))}
      </div>

      {selected && <div className="admin-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div className="admin-modal-card">
          <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={16} /></button>
          <span className="cms-kicker">DELIVERY DETAILS</span>
          <h3>{selected.id}</h3>
          <div className="detail-grid">
            <div><span>Customer</span><strong>{selected.customer}</strong></div>
            <div><span>Phone</span><strong>{selected.phone || "—"}</strong></div>
            <div className="detail-grid-wide"><span>Address</span><strong>{selected.address || "—"}</strong></div>
            <div><span>Payment</span><strong>{selected.paymentMethod || "Not recorded"}</strong></div>
            <div><span>Total</span><strong>{money(selected.total)}</strong></div>
          </div>
        </div>
      </div>}
    </div>
  );
}

/* =========================================================
   PAYMENT / UPI CONTROL
   ========================================================= */

function AdminPayments({ paymentSettings, setPaymentSettings, hotel }) {
  const [form, setForm] = useState(() => ({ ...seedPaymentSettings(), ...paymentSettings }));
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm((current) => ({ ...current, ...paymentSettings })), [paymentSettings]);

  const save = async () => {
    const qrLink = String(form.qrImage || "").trim();

    if (qrLink && !/^https?:\/\//i.test(qrLink)) {
      return alert("Please enter a valid QR image link starting with http:// or https://");
    }

    const nextSettings = { ...form, qrImage: qrLink };
    setPaymentSettings(nextSettings);

    try {
      await setDoc(
        doc(db, "settings", "paymentSettings"),
        { qrImage: qrLink, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (error) {
      console.error("Firestore payment settings error:", error);
      alert("QR link was saved locally, but could not be synced to Firebase. Please check Firestore Rules.");
      return;
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="payment-admin-wrap">
      <div className="cms-hero-head">
        <div>
          <span className="cms-kicker">ONLINE PAYMENTS</span>
          <h2>UPI & Payment Settings</h2>
          <p>Paste your QR image link. Customers will see it automatically when they select UPI at checkout.</p>
        </div>
        <button className="btn-primary cms-save-btn" onClick={save}><Save size={15} /> {saved ? "Saved" : "Save Payment Settings"}</button>
      </div>

      <Panel title="Available payment methods" right={<CreditCard size={16} color={BRASS} />}>
        <div className="payment-toggle-grid">
          {[
            ["cashEnabled", "Cash / Counter", "Accept pay-at-delivery or counter payments."],
            ["upiEnabled", "UPI", "Show UPI with QR at checkout."],
            ["cardEnabled", "Cards", "Keep the card option visible."],
          ].map(([key, title, sub]) => (
            <button key={key} type="button" className={`payment-toggle-card ${form[key] ? "active" : ""}`} onClick={() => setForm((current) => ({ ...current, [key]: !current[key] }))}>
              <span className="payment-toggle-icon">{key === "upiEnabled" ? "◉" : key === "cardEnabled" ? "▣" : "₹"}</span>
              <span><strong>{title}</strong><small>{sub}</small></span>
              <span className={`mini-switch ${form[key] ? "on" : ""}`}><i /></span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="UPI merchant details" right={<CircleDollarSign size={16} color={BRASS} />}>
        <div className="cms-grid-2">
          <div className="cms-field"><label>UPI ID</label><input value={form.upiId || ""} onChange={(e) => setForm((c) => ({ ...c, upiId: e.target.value }))} placeholder="restaurant@upi" /></div>
          <div className="cms-field"><label>Merchant name</label><input value={form.merchantName || hotel?.name || ""} onChange={(e) => setForm((c) => ({ ...c, merchantName: e.target.value }))} /></div>
        </div>
        <div className="upi-admin-upload">
          <div>
            <span className="cms-kicker">QR IMAGE LINK</span>
            <h3>Customer payment QR</h3>
            <p>Paste the direct URL of your QR image. It is shown when UPI is selected during checkout.</p>
            <div className="cms-field">
              <label>QR image link</label>
              <input
                type="url"
                value={form.qrImage || ""}
                onChange={(e) => setForm((current) => ({ ...current, qrImage: e.target.value }))}
                placeholder="https://example.com/your-qr.png"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="upi-admin-preview">
            {form.qrImage ? <img src={form.qrImage} alt="UPI QR preview" /> : <QRVisual seed={form.upiId || "KAVERI-UPI"} />}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* =========================================================
   DIGITAL MENU ADMIN
   ========================================================= */

function AdminDigitalMenu() {
  const [token, setToken] =
    useState("KVK-2026-A1");

  const url =
    `https://kaverikitchen.example/menu/${token}`;

  const downloadQr =
    () => {
      alert(
        "Connect a real QR generator library/backend here for downloadable QR files."
      );
    };

  return (
    <Panel title="Digital Menu QR">

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "230px 1fr",
          gap: 30,
          alignItems:
            "center"
        }}
      >
        <div
          style={{
            background:
              "#ffffff",
            borderRadius: 20,
            padding: 20,
            display: "grid",
            placeItems:
              "center"
          }}
        >
          <QRVisual
            seed={token}
          />
        </div>

        <div>

          <div
            style={{
              fontSize: 12,
              color: "#8A7770",
              marginBottom: 7
            }}
          >
            Menu URL
          </div>

          <div
            style={{
              fontSize: 12,
              background:
                "#fff8f4",
              border:
                "1px solid rgba(76,21,4,0.09)",
              borderRadius: 11,
              padding:
                "11px 12px",
              marginBottom: 16,
              wordBreak:
                "break-all",
              color: INK
            }}
          >
            {url}
          </div>

          <div
            style={{
              display:
                "flex",
              gap: 8,
              flexWrap:
                "wrap"
            }}
          >
            <button
              style={btnBrass}
              onClick={
                downloadQr
              }
            >
              <Download
                size={13}
              />
              Download QR
            </button>

            <button
              onClick={() =>
                setToken(
                  `KVK-2026-${Math.random()
                    .toString(
                      36
                    )
                    .slice(
                      2,
                      6
                    )
                    .toUpperCase()}`
                )
              }
              style={{
                background:
                  "#fff0eb",
                color: INK,
                border:
                  "1px solid rgba(76,21,4,0.1)",
                borderRadius:
                  10,
                padding:
                  "10px 15px",
                cursor:
                  "pointer",
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 6,
                fontWeight:
                  700
              }}
            >
              <RefreshCw
                size={13}
              />
              Regenerate
            </button>
          </div>

          <p
            style={{
              fontSize: 12,
              color:
                "#8A7770",
              marginTop: 17,
              maxWidth: 450
            }}
          >
            Use this QR destination
            for table cards, receipts
            and entrance signage.
          </p>

        </div>
      </div>
    </Panel>
  );
}

/* =========================================================
   QR VISUAL
   ========================================================= */

function QRVisual({
  seed
}) {
  const grid = 21;

  let hash = 0;

  for (
    let index = 0;
    index < seed.length;
    index += 1
  ) {
    hash =
      (hash * 31 +
        seed.charCodeAt(
          index
        )) &
      0x7fffffff;
  }

  const cells = [];

  let x =
    hash || 123456;

  for (
    let index = 0;
    index <
    grid * grid;
    index += 1
  ) {
    x =
      (x * 1103515245 +
        12345) &
      0x7fffffff;

    cells.push(
      x % 5 === 0 ||
      x % 7 === 0
    );
  }

  const finder = (
    x,
    y
  ) => (
    <g>
      <rect
        x={x}
        y={y}
        width="7"
        height="7"
        fill={INK}
      />

      <rect
        x={x + 1}
        y={y + 1}
        width="5"
        height="5"
        fill="#fff"
      />

      <rect
        x={x + 2}
        y={y + 2}
        width="3"
        height="3"
        fill={INK}
      />
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${grid} ${grid}`}
      width="175"
      height="175"
      style={{
        display: "block"
      }}
    >
      <rect
        width={grid}
        height={grid}
        fill="#fff"
      />

      {cells.map(
        (active, index) =>
          active && (
            <rect
              key={index}
              x={
                index %
                grid
              }
              y={Math.floor(
                index /
                  grid
              )}
              width="1"
              height="1"
              fill={INK}
            />
          )
      )}

      {finder(0, 0)}

      {finder(
        grid - 7,
        0
      )}

      {finder(
        0,
        grid - 7
      )}
    </svg>
  );
}

/* =========================================================
   AR MENU
   ========================================================= */

function AdminARMenu() {
  const [shown, setShown] =
    useState(true);

  return (
    <Panel title="AR Menu">

      <div
        style={{
          display:
            "flex",
          alignItems:
            "flex-start",
          gap: 15,
          marginBottom: 18
        }}
      >
        <div
          style={{
            width: 43,
            height: 43,
            display: "grid",
            placeItems:
              "center",
            borderRadius: 13,
            background:
              "#fff0eb"
          }}
        >
          <Sparkles
            size={20}
            color={BRASS}
          />
        </div>

        <div>
          <h3
            style={{
              marginBottom: 6,
              color: INK
            }}
          >
            Augmented Reality Menu
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: 13,
              color:
                "#7b6961",
              maxWidth: 650
            }}
          >
            Guests will be able to view
            selected dishes in an AR
            experience before ordering.
          </p>
        </div>
      </div>

      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "space-between",
          padding:
            "15px 16px",
          background:
            "#fff8f4",
          borderRadius:
            14
        }}
      >
        <div>
          <strong
            style={{
              display:
                "block",
              color: INK,
              marginBottom:
                4
            }}
          >
            Show Coming Soon
          </strong>

          <span
            style={{
              fontSize: 11,
              color:
                "#89766f"
            }}
          >
            Display the AR section
            on the website and menu.
          </span>
        </div>

        <Toggle
          on={shown}
          onClick={() =>
            setShown(
              (current) =>
                !current
            )
          }
          good
        />
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          color:
            "#89766f"
        }}
      >
        Planned flow: Choose Dish →
        View AR → Launch AR →
        See 3D dish → View details.
      </div>
    </Panel>
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */

function AdminSettings({
  hotel,
  setHotel
}) {
  const [form, setForm] =
    useState(hotel);

  return (
    <Panel title="Hotel Settings">

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 14,
          maxWidth: 760
        }}
      >
        <AdminField
          label="Hotel name"
          value={form.name}
          onChange={(value) =>
            setForm({
              ...form,
              name: value
            })
          }
        />

        <AdminField
          label="Phone"
          value={form.phone}
          onChange={(value) =>
            setForm({
              ...form,
              phone: value
            })
          }
        />

        <div
          style={{
            gridColumn:
              "1 / -1"
          }}
        >
          <AdminField
            label="Address"
            value={
              form.address
            }
            onChange={(value) =>
              setForm({
                ...form,
                address:
                  value
              })
            }
          />
        </div>

        <div
          style={{
            gridColumn:
              "1 / -1"
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#8a7770",
              marginBottom: 5
            }}
          >
            About
          </div>

          <textarea
            value={form.about}
            onChange={(event) =>
              setForm({
                ...form,
                about:
                  event.target
                    .value
              })
            }
            rows={4}
            style={{
              width: "100%",
              padding: 12,
              border:
                "1px solid rgba(76,21,4,0.12)",
              borderRadius: 11,
              background:
                "#fff",
              color: INK,
              resize:
                "vertical",
              outline:
                "none"
            }}
          />
        </div>
      </div>

      <button
        onClick={() => {
          setHotel(form);
          alert(
            "Hotel settings saved."
          );
        }}
        style={{
          ...btnBrass,
          marginTop: 17
        }}
      >
        Save Settings
      </button>
    </Panel>
  );
}

/* =========================================================
   ADMIN FIELD
   ========================================================= */

function UploadIconFallback() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 20,
        height: 20,
        display: "grid",
        placeItems: "center",
        borderRadius: 6,
        background: "#fff0eb",
        color: BRASS,
        fontWeight: 900
      }}
    >
      ↑
    </span>
  );
}

function AdminField({
  label,
  value,
  onChange,
  placeholder
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "#8a7770",
          marginBottom: 5
        }}
      >
        {label}
      </div>

      <input
        value={value}
        placeholder={
          placeholder
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={{
          width: "100%",
          minHeight: 42,
          background:
            "#fff",
          border:
            "1px solid rgba(76,21,4,0.12)",
          borderRadius: 10,
          padding:
            "9px 11px",
          color: INK,
          fontSize: 13,
          outline: "none"
        }}
      />
    </div>
  );
}

/* =========================================================
   ADMIN TABLE / BUTTON STYLES
   ========================================================= */

const tableStyle = {
  width: "100%",
  borderCollapse:
    "collapse",
  fontSize: 13
};

const thStyle = {
  textAlign: "left",
  fontSize: 11,
  color: "#8A7770",
  padding:
    "0 10px 10px",
  fontWeight: 700
};

const tdStyle = {
  padding: "12px 10px",
  verticalAlign:
    "middle",
  color: INK
};

const selStyle = {
  width: "100%",
  minHeight: 42,
  background:
    "#fff",
  border:
    "1px solid rgba(76,21,4,0.12)",
  borderRadius: 10,
  padding:
    "9px 10px",
  color: INK,
  fontSize: 13,
  outline: "none"
};

const btnBrass = {
  background: BRASS,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding:
    "10px 16px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
  display: "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 6,
  minHeight: 42
};

export { AdminLogin, AdminApp };
