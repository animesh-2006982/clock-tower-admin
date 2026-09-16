import React, { useEffect, useState } from "react";
import "./index.css";

import { AdminLogin, AdminApp } from "./admin/Admin";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

const PUBLIC_SITE_URL =
  "https://hotel-management-system-kappa-gray.vercel.app/";

// --------------------------------------------------
// Persistent state helper
// --------------------------------------------------

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : initialValue;
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

// --------------------------------------------------
// Data shape matches Admin.jsx interface
// --------------------------------------------------

const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Classic Veg Thali", category: "Indian", price: 180, rating: 4.5, veg: true, bestseller: true, available: true, qty: "1 plate", desc: "Freshly prepared Indian thali.", img: "" },
  { id: "p2", name: "Chicken Biryani", category: "Biryani", price: 220, rating: 4.6, veg: false, bestseller: true, available: true, qty: "1 plate", desc: "Aromatic chicken biryani.", img: "" },
  { id: "p3", name: "Paneer Butter Masala", category: "Indian", price: 190, rating: 4.5, veg: true, bestseller: false, available: true, qty: "1 bowl", desc: "Creamy paneer in rich tomato gravy.", img: "" },
];

const DEFAULT_ORDERS = [
  { id: "ORD-1001", customer: "Rahul Das", phone: "9876543210", address: "Dharmanagar, Tripura", items: [{ name: "Chicken Biryani", qty: 2, price: 220 }], total: 440, type: "Delivery", status: "Preparing", paymentMethod: "UPI", time: "12:10 PM" },
  { id: "ORD-1002", customer: "Walk-in Customer", phone: "", address: "", items: [{ name: "Classic Veg Thali", qty: 1, price: 180 }, { name: "Paneer Butter Masala", qty: 1, price: 190 }], total: 370, type: "Dine-in", status: "Ready", paymentMethod: "Cash", time: "12:25 PM" },
];

const DEFAULT_TABLES = [
  { id: 1, name: "Table 01", seats: 2, status: "Available", order: [] },
  { id: 2, name: "Table 02", seats: 4, status: "Occupied", order: [{ name: "Chicken Biryani", qty: 1, price: 220 }] },
  { id: 3, name: "Table 03", seats: 4, status: "Available", order: [] },
  { id: 4, name: "Table 04", seats: 6, status: "Reserved", order: [] },
];

const DEFAULT_INVENTORY = [
  { id: "i1", name: "Rice", qty: 50, unit: "kg", min: 10, supplier: "Local Supplier", updated: "Today" },
  { id: "i2", name: "Chicken", qty: 25, unit: "kg", min: 8, supplier: "Fresh Meat Supplier", updated: "Today" },
  { id: "i3", name: "Cooking Oil", qty: 8, unit: "L", min: 10, supplier: "Grocery Supplier", updated: "Today" },
];

const DEFAULT_STAFF = [
  { id: "staff-1", name: "Admin Manager", email: "admin@kaverikitchen.in", phone: "9876543210", role: "Manager", duties: ["Cashier", "Dine-in", "Inventory"], active: true },
];

const DEFAULT_OFFER_BANNERS = [];

const DEFAULT_SITE_CONTENT = {
  heroEyebrow: "FRESH · HANDCRAFTED · DELICIOUS",
  heroTitle: "Savor the Taste of\nPerfection.",
  heroText: "Fresh ingredients, mouth-watering recipes and a passion for good food — freshly prepared at our kitchen.",
  heroMainImage: "", heroLeftImage: "", heroRightImage: "",
  offerEyebrow: "SPECIAL EDITION", offerSideLabel: "DAILY SPECIAL", offerFloatingLabel: "HANDCRAFTED", offerFloatingText: "Made fresh.\nServed warm.", offerMetaText: "FRESH / LOCAL / BOLD",
  signatureTitle: "Our Signature Dishes", signatureText: "Classic favourites and modern creations prepared fresh for every order.",
  aboutEyebrow: "MADE WITH LOVE", aboutTitle: "Good food.\nGood mood.", aboutText: "Carefully selected ingredients, balanced flavours and a kitchen that cares about every plate.", aboutImage: "",
  reviewsTitle: "They Love Us", reviewsText: "Good food, warm service and plenty of reasons to come back.",
  arKicker: "NEXT IN DINING", arTitle: "See your food\nbefore it arrives.", arText: "We are preparing an augmented-reality menu so you can preview selected dishes on your own table before ordering.", arTags: "3D Food Preview,Table View,Coming Soon",
  finalEyebrow: "KAVERI KITCHEN", finalTitle: "Don't Wait —\nOrder Now!", finalText: "Freshly prepared favourites delivered straight to your door.",
  footerTagline: "Fresh food, warm service and flavours worth coming back for.", footerHours: "11:00 AM – 11:00 PM", footerDays: "Open Every Day",
};

const DEFAULT_PAYMENT_SETTINGS = {
  upiEnabled: true, upiId: "kaverikitchen@upi", merchantName: "Kaveri Kitchen", qrImage: "", cashEnabled: true, cardEnabled: true,
};

const DEFAULT_HOTEL = {
  name: "Kaveri Kitchen", phone: "", email: "", address: "", about: "Fresh food, warm service and flavours worth coming back for.",
};

// --------------------------------------------------
// App
// --------------------------------------------------

function App() {
  const [currentStaff, setCurrentStaff] = usePersistentState("kaveri-current-staff", null);
  const [hotel, setHotel] = usePersistentState("kaveri-hotel", DEFAULT_HOTEL);
  const [staff, setStaff] = usePersistentState("kaveri-staff", DEFAULT_STAFF);

  const [products, setProducts] = usePersistentState("kaveri-products", DEFAULT_PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(true);

  // Products are shared with the public website through Firestore.
  // This listener keeps Price & Menu in sync without changing the URL value.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const firebaseProducts = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        if (firebaseProducts.length > 0) {
          setProducts(firebaseProducts);
        }
        setProductsLoading(false);
      },
      (error) => {
        console.error("Firestore products error:", error);
        setProductsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [setProducts]);

  const [orders, setOrders] = usePersistentState("kaveri-orders", DEFAULT_ORDERS);
  const [tables, setTables] = usePersistentState("kaveri-tables", DEFAULT_TABLES);
  const [inventory, setInventory] = usePersistentState("kaveri-inventory", DEFAULT_INVENTORY);
  const [offerBanners, setOfferBanners] = usePersistentState("kaveri-offer-banners", DEFAULT_OFFER_BANNERS);
  const [siteContent, setSiteContent] = usePersistentState("kaveri-site-content", DEFAULT_SITE_CONTENT);
  const [paymentSettings, setPaymentSettings] = usePersistentState("kaveri-payment-settings", DEFAULT_PAYMENT_SETTINGS);

  const handleLogin = (staffData) => {
    const account = {
      id: staffData?.id || `staff-${Date.now()}`,
      name: staffData?.name || "Admin Manager",
      email: staffData?.email || "",
      phone: staffData?.phone || "",
      photoURL: staffData?.photoURL || "",
      role: staffData?.role || "Manager",
      duties: staffData?.duties || ["Dine-in"],
      active: staffData?.active !== false,
    };
    setCurrentStaff(account);
  };

  const handleLogout = () => setCurrentStaff(null);

  const handleNavigation = (page) => {
    if (page === "landing") {
      window.location.href = PUBLIC_SITE_URL;
      return;
    }
    console.log("Admin navigation:", page);
  };

  if (!currentStaff) {
    return <AdminLogin onLogin={handleLogin} nav={handleNavigation} />;
  }

  return (
    <AdminApp
      currentStaff={currentStaff}
      setCurrentStaff={setCurrentStaff}
      onLogout={handleLogout}
      nav={handleNavigation}
      hotel={hotel}
      setHotel={setHotel}
      staff={staff}
      setStaff={setStaff}
      products={products}
      setProducts={setProducts}
      productsLoading={productsLoading}
      orders={orders}
      setOrders={setOrders}
      tables={tables}
      setTables={setTables}
      inventory={inventory}
      setInventory={setInventory}
      offerBanners={offerBanners}
      setOfferBanners={setOfferBanners}
      siteContent={siteContent}
      setSiteContent={setSiteContent}
      paymentSettings={paymentSettings}
      setPaymentSettings={setPaymentSettings}
    />
  );
}

export default App;
