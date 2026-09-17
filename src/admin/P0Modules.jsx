import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot,
  orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Plus, Minus, Trash2, Search, Printer, Download, RefreshCw, Check,
  X, ShieldCheck, GitBranch, Receipt, ChefHat, BarChart3, Save, RotateCcw
} from "lucide-react";

const INK = "#4C1504";
const BRASS = "#FF6B4A";
const LINE = "rgba(76,21,4,0.12)";
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nowDate = () => new Date();
const dateKey = (d = nowDate()) => {
  const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
};
const clean = (v) => String(v ?? "").trim();
const num = (v) => Math.max(0, Number(v) || 0);

export const P0_ROLES = ["Super Admin","Owner","Head Office Admin","Branch Manager","Cashier","Waiter","Kitchen Staff","Delivery Partner","Inventory Manager","Accountant"];
export const P0_PERMISSIONS = ["orders","pos","billing","discounts","refunds","menu","pricing","inventory","purchasing","customers","reports","staff","settings"];
const ROLE_DEFAULTS = {
  "Super Admin": P0_PERMISSIONS,
  "Owner": P0_PERMISSIONS,
  "Head Office Admin": ["orders","pos","billing","discounts","refunds","menu","pricing","inventory","purchasing","customers","reports","staff","settings"],
  "Branch Manager": ["orders","pos","billing","discounts","refunds","menu","pricing","inventory","purchasing","customers","reports","staff"],
  "Cashier": ["orders","pos","billing","discounts","refunds","customers"],
  "Waiter": ["orders","pos","customers"],
  "Kitchen Staff": ["orders","inventory"],
  "Delivery Partner": ["orders","customers"],
  "Inventory Manager": ["inventory","purchasing","menu"],
  "Accountant": ["billing","refunds","reports","customers"]
};
const SECTION_PERMISSION = { pos:"pos", kitchen:"orders", reports:"reports", audit:"settings", branches:"settings", staff:"staff", inventory:"inventory", payments:"billing", pricing:"pricing", products:"menu", orders:"orders", tables:"orders", delivery:"orders", customers:"customers", offers:"menu", website:"menu", settings:"settings" };
export const normalizeRole = (role) => role === "Administrator" ? "Super Admin" : (P0_ROLES.includes(role) ? role : "Cashier");
export const hasP0Permission = (staff, permission) => {
  const role = normalizeRole(staff?.role);
  const explicit = Array.isArray(staff?.permissions) ? staff.permissions : null;
  const allowed = explicit || ROLE_DEFAULTS[role] || [];
  return role === "Super Admin" || allowed.includes(permission);
};
export const canAccessSection = (staff, section) => hasP0Permission(staff, SECTION_PERMISSION[section] || "settings");

async function audit({ staff, action, module, oldValue = null, newValue = null, branchId = "all", details = "" }) {
  try {
    await addDoc(collection(db, "auditLogs"), {
      userId: staff?.uid || staff?.id || "unknown",
      user: staff?.name || staff?.email || "Unknown user",
      action, module, oldValue, newValue,
      branchId: branchId || "all",
      details,
      date: dateKey(),
      time: nowDate().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" }),
      device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 220) : "unknown",
      createdAt: serverTimestamp()
    });
  } catch (e) { console.error("Audit log failed:", e); }
}

async function nextSequence(name, branchId = "all") {
  const ref = doc(db, "counters", `${name}_${branchId || "all"}`);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const next = Number(snap.exists() ? snap.data().value || 0 : 0) + 1;
    tx.set(ref, { value: next, updatedAt: serverTimestamp() }, { merge: true });
    return next;
  });
}

async function createNumber(type, branchId) {
  const n = await nextSequence(type, branchId);
  let prefix = type === "invoice" ? "INV" : type === "kot" ? "KOT" : "ORD";
  if (type === "invoice") {
    try { const snap = await getDoc(doc(db, "settings", "invoiceSettings")); if (snap.exists() && clean(snap.data().prefix)) prefix = clean(snap.data().prefix).toUpperCase(); } catch {}
  }
  return `${prefix}-${String(n).padStart(5,"0")}`;
}

function useCollection(collectionName, { branchId = "all", order = false, max = 200 } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let q = collection(db, collectionName);
    const constraints = [];
    if (branchId && branchId !== "all") constraints.push(where("branchId", "==", branchId));
    if (order) constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(max));
    try { q = query(q, ...constraints); } catch { q = query(collection(db, collectionName), limit(max)); }
    const unsub = onSnapshot(q, snap => { setRows(snap.docs.map(d => ({ id:d.id, ...d.data() }))); setLoading(false); }, err => { console.error(`${collectionName} listener`, err); setLoading(false); });
    return () => unsub();
  }, [collectionName, branchId, order, max]);
  return { rows, loading };
}

export function BranchSelector({ value, onChange, currentStaff }) {
  const { rows } = useCollection("branches", { max: 50 });
  const branches = rows.length ? rows : [
    { id:"branch-01", code:"Branch 01", name:"Branch 01", active:true },
    { id:"branch-02", code:"Branch 02", name:"Branch 02", active:true },
    { id:"branch-03", code:"Branch 03", name:"Branch 03", active:true }
  ];
  const canAll = normalizeRole(currentStaff?.role) === "Super Admin" || normalizeRole(currentStaff?.role) === "Owner" || normalizeRole(currentStaff?.role) === "Head Office Admin";
  return <div className="p0-branch-selector">
    <GitBranch size={15}/>
    <select value={value} onChange={e => onChange(e.target.value)} aria-label="Branch selector">
      {canAll && <option value="all">All Branches</option>}
      {branches.filter(b => b.active !== false && (canAll || !currentStaff?.branchId || b.id === currentStaff.branchId)).map(b => <option key={b.id} value={b.id}>{b.code || b.name || b.id}</option>)}
    </select>
  </div>;
}

function Field({ label, value, onChange, type="text", placeholder="", children }) {
  return <label className="p0-field"><span>{label}</span>{children || <input type={type} value={value ?? ""} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} />}</label>;
}
function Btn({ children, onClick, disabled=false, secondary=false, danger=false, type="button" }) {
  return <button type={type} className={`p0-btn ${secondary ? "secondary" : ""} ${danger ? "danger" : ""}`} disabled={disabled} onClick={onClick}>{children}</button>;
}
function SectionCard({ title, icon:Icon, children, right }) { return <section className="p0-card"><div className="p0-card-head"><div>{Icon && <Icon size={17}/>}<strong>{title}</strong></div>{right}</div>{children}</section>; }
function Empty({ text="No records found." }) { return <div className="p0-empty">{text}</div>; }
function Loading() { return <div className="p0-loading">Loading…</div>; }

export function AdminPOS({ products = [], currentStaff, branchId = "all" }) {
  const [mode, setMode] = useState("Dine-in");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [coupon, setCoupon] = useState("");
  const [serviceCharge, setServiceCharge] = useState(0);
  const [customer, setCustomer] = useState({ name:"Walk-in Customer", phone:"", address:"", table:"" });
  const [paymentRows, setPaymentRows] = useState([{ method:"Cash", amount:"" }]);
  const [tax, setTax] = useState({ cgst:0, sgst:0, igst:0, inclusive:false, serviceCharge:0, roundOff:true });
  const [saving, setSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [message, setMessage] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const { rows: taxRows } = useCollection("settings", { max:100 });

  useEffect(() => {
    const found = taxRows.find(x => x.id === "taxSettings");
    if (found) {
      setTax(t => ({ ...t, ...found }));
      setServiceCharge(current => num(current) ? current : num(found.serviceCharge));
    }
  }, [taxRows]);
  const cats = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))], [products]);
  const filtered = products.filter(p => p.available !== false && (!search || String(p.name||"").toLowerCase().includes(search.toLowerCase())) && (category === "All" || p.category === category));
  const subtotal = cart.reduce((s,i)=>s + num(i.price)*num(i.qty),0);
  const discountValue = Math.min(subtotal, num(discount));
  const taxable = Math.max(0, subtotal - discountValue);
  const inclusiveRate = tax.interState ? num(tax.igst) : num(tax.cgst)+num(tax.sgst);
  const baseTax = tax.inclusive && inclusiveRate ? taxable - taxable/(1+inclusiveRate/100) : taxable*inclusiveRate/100;
  const service = taxable * num(serviceCharge || tax.serviceCharge)/100;
  const rawTotal = tax.inclusive ? taxable + service : taxable + baseTax + service;
  const total = tax.roundOff ? Math.round(rawTotal) : Math.round(rawTotal*100)/100;
  const paid = paymentRows.reduce((s,p)=>s+num(p.amount),0);
  const due = Math.max(0,total-paid);

  const add = (p) => setCart(c => { const x=c.find(i=>i.productId===p.id); return x ? c.map(i=>i.productId===p.id?{...i,qty:i.qty+1}:i) : [...c,{productId:p.id,name:p.name,price:num(p.price),qty:1,modifiers:[]}]; });
  const changeQty = (id,d) => setCart(c=>c.map(i=>i.productId===id?{...i,qty:Math.max(1,i.qty+d)}:i));
  const remove = id => setCart(c=>c.filter(i=>i.productId!==id));
  const addPayment = () => setPaymentRows(p=>[...p,{method:"UPI",amount:""}]);
  const updatePayment = (i,k,v) => setPaymentRows(p=>p.map((x,idx)=>idx===i?{...x,[k]:v}:x));
  const applyCoupon = async () => {
    const code = clean(coupon).toUpperCase();
    if (!code) return setCouponMessage("Enter a coupon code.");
    try {
      const snap = await getDocs(query(collection(db, "coupons"), where("code", "==", code), limit(5)));
      if (snap.empty) return setCouponMessage("Coupon not found.");
      const c = snap.docs.map(d => ({ id:d.id, ...d.data() })).find(x => x.active !== false);
      if (!c) return setCouponMessage("Coupon is inactive.");
      const value = c.type === "percentage" || c.discountType === "percentage" ? subtotal * num(c.value ?? c.discount) / 100 : num(c.value ?? c.discount);
      setDiscount(Math.min(subtotal, value));
      setCouponMessage(`Coupon applied: ${code}`);
    } catch (e) { setCouponMessage(e?.message || "Unable to validate coupon."); }
  };

  const reset = () => { setCart([]); setDiscount(0); setCoupon(""); setServiceCharge(0); setPaymentRows([{method:"Cash",amount:""}]); setLastInvoice(null); };

  const checkout = async () => {
    if (!cart.length) return setMessage("Add at least one product.");
    if (mode === "Dine-in" && !clean(customer.table)) return setMessage("Enter a table number for dine-in billing.");
    if (paid > total + 0.01) return setMessage("Payment cannot exceed the bill total.");
    setSaving(true); setMessage("");
    try {
      const orderNo = await createNumber("order", branchId);
      const invoiceNo = await createNumber("invoice", branchId);
      // Use the human-readable order number as the Firestore document ID.
      // The public website also uses order.id when reading/cancelling orders,
      // so both sides now reference the exact same document.
      const orderRef = doc(db,"orders",orderNo);
      const invoiceRef = doc(db,"invoices",invoiceNo);
      const paymentStatus = paid >= total - 0.01 ? "Paid" : paid > 0 ? "Partially Paid" : "Pending";
      const customerName = mode === "Dine-in"
        ? (clean(customer.name) && clean(customer.name) !== "Walk-in Customer" ? clean(customer.name) : `Table ${clean(customer.table) || "-"}`)
        : (clean(customer.name) || "Guest");
      const customerDetails = {
        name: customerName,
        phone: clean(customer.phone),
        address: clean(customer.address),
        table: clean(customer.table)
      };
      const paymentMethod = paymentRows.filter(x => num(x.amount) > 0).map(x => x.method).join(" + ") || "Pending";
      const order = {
        id:orderNo,
        orderNumber:orderNo,
        invoiceNumber:invoiceNo,
        branchId,
        source:"POS",
        channel:"admin-pos",
        type:mode,
        customer:customerName,
        customerDetails,
        phone:customerDetails.phone,
        address:customerDetails.address,
        table:customerDetails.table,
        items:cart,
        subtotal,
        discount:discountValue,
        coupon,
        tax:{cgst:tax.interState?0:num(tax.cgst),sgst:tax.interState?0:num(tax.sgst),igst:tax.interState?num(tax.igst):0,amount:baseTax,inclusive:!!tax.inclusive,interState:!!tax.interState},
        serviceCharge:service,
        roundOff:tax.roundOff ? total-rawTotal : 0,
        total,
        paid,
        due,
        paymentMethod,
        paymentStatus,
        status:"New",
        createdBy:currentStaff?.uid||currentStaff?.id||"unknown",
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      };
      await setDoc(orderRef, order);
      const invoice = {
        id:invoiceNo,
        invoiceNumber:invoiceNo,
        prefix:"INV",
        orderId:orderNo,
        orderNumber:orderNo,
        branchId,
        source:"POS",
        customer:customerDetails,
        customerDetails,
        gstInvoice:!!(tax.cgst||tax.sgst||tax.igst),
        items:cart,
        subtotal,
        discount:discountValue,
        tax:order.tax,
        serviceCharge:service,
        roundOff:order.roundOff,
        total,
        paid,
        due,
        paymentStatus,
        status:"Active",
        createdBy:currentStaff?.uid||currentStaff?.id||"unknown",
        createdAt:serverTimestamp()
      };
      await setDoc(invoiceRef, invoice);
      for (const p of paymentRows.filter(x=>num(x.amount)>0)) {
        const txId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
        await setDoc(doc(db,"payments",txId), { id:txId, orderId:orderNo, orderNumber:orderNo, invoiceNumber:invoiceNo, branchId, source:"POS", method:p.method, amount:num(p.amount), status:paymentStatus, transactionId: p.transactionId || "", upiReference:p.upiReference||"", createdBy:currentStaff?.uid||currentStaff?.id||"unknown", createdAt:serverTimestamp() });
      }
      if (cart.length) {
        const kotNo = await createNumber("kot", branchId);
        await setDoc(doc(db,"kots",kotNo), { id:kotNo,kotNumber:kotNo,orderId:orderNo,orderNumber:orderNo,branchId,source:"POS",orderType:mode,tableNumber:customer.table||"",items:cart.map(i=>({...i,status:"New"})),specialInstructions:"",status:"New",station:"Main Kitchen",createdAt:serverTimestamp(),updatedAt:serverTimestamp() });
      }
      await audit({staff:currentStaff,action:"CREATE",module:"POS",newValue:{orderNumber:orderNo,total},branchId,details:`${mode} bill created`});
      setLastInvoice({ ...invoice, invoiceNumber:invoiceNo, orderNumber:orderNo });
      setMessage(`Order ${orderNo} created successfully.`);
      setCart([]); setPaymentRows([{method:"Cash",amount:""}]);
    } catch(e) { console.error(e); setMessage(e?.message || "Unable to save the bill. Check Firestore Rules and try again."); }
    finally { setSaving(false); }
  };
  const cancelLatest = async () => {
    if (!lastInvoice) return;
    if (!window.confirm(`Cancel invoice ${lastInvoice.invoiceNumber}?`)) return;
    try {
      await updateDoc(doc(db, "invoices", lastInvoice.invoiceNumber), { status:"Cancelled", updatedAt:serverTimestamp() });
      // New POS orders use orders/{orderNumber}. Keep a query fallback so
      // older POS documents with random Firestore IDs remain cancellable.
      const directOrderRef = doc(db, "orders", lastInvoice.orderNumber);
      const directOrderSnap = await getDoc(directOrderRef);
      if (directOrderSnap.exists()) {
        await updateDoc(directOrderRef, { status:"Cancelled", updatedAt:serverTimestamp() });
      } else {
        const ordersSnap = await getDocs(query(collection(db,"orders"), where("orderNumber","==",lastInvoice.orderNumber), limit(5)));
        await Promise.all(ordersSnap.docs.map(d => updateDoc(d.ref,{status:"Cancelled",updatedAt:serverTimestamp()})));
      }
      await audit({staff:currentStaff,action:"ORDER_CANCEL",module:"POS",oldValue:"Active",newValue:"Cancelled",branchId,details:lastInvoice.invoiceNumber});
      setMessage(`Invoice ${lastInvoice.invoiceNumber} cancelled.`);
    } catch(e) { alert(e?.message||"Unable to cancel bill"); }
  };
  const print = () => lastInvoice && printDocument("Invoice", invoiceHtml(lastInvoice));

  return <div className="p0-page">
    {message && <div className="p0-message">{message}</div>}
    <div className="p0-pos-layout">
      <div>
        <SectionCard title="Order type" icon={Receipt}>
          <div className="p0-tabs">{["Dine-in","Takeaway","Delivery","Pre-order","QR Order"].map(x=><button key={x} className={mode===x?"active":""} onClick={()=>setMode(x)}>{x}</button>)}</div>
          <div className="p0-grid-4"><Field label="Customer" value={customer.name} onChange={v=>setCustomer({...customer,name:v})}/><Field label="Phone" value={customer.phone} onChange={v=>setCustomer({...customer,phone:v})}/><Field label={mode==="Dine-in"?"Table number":"Address"} value={mode==="Dine-in"?customer.table:customer.address} onChange={v=>setCustomer({...customer,[mode==="Dine-in"?"table":"address"]:v})}/><div><Field label="Coupon" value={coupon} onChange={v=>{setCoupon(v);setCouponMessage("")}} placeholder="Coupon code"/><div className="p0-actions"><Btn secondary onClick={applyCoupon}>Apply</Btn><small>{couponMessage}</small></div></div></div>
        </SectionCard>
        <SectionCard title="Menu" icon={Search} right={<input className="p0-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…"/>}>
          <div className="p0-tabs p0-tabs-scroll">{cats.map(x=><button key={x} className={category===x?"active":""} onClick={()=>setCategory(x)}>{x}</button>)}</div>
          <div className="p0-product-grid">{filtered.map(p=><button className="p0-product" key={p.id} onClick={()=>add(p)}><span>{p.name}</span><strong>{money(p.price)}</strong><small>{p.category||"Menu"} · Add</small></button>)}{!filtered.length&&<Empty text="No available products match this search."/>}</div>
        </SectionCard>
      </div>
      <aside className="p0-cart">
        <SectionCard title={`Current Bill (${cart.length})`} icon={Receipt}>
          {!cart.length?<Empty text="Cart is empty. Add menu items."/>:<div className="p0-cart-items">{cart.map(i=><div className="p0-cart-row" key={i.productId}><div><strong>{i.name}</strong><small>{money(i.price)} each</small></div><div className="p0-qty"><button onClick={()=>changeQty(i.productId,-1)}><Minus size={13}/></button><b>{i.qty}</b><button onClick={()=>changeQty(i.productId,1)}><Plus size={13}/></button></div><strong>{money(i.price*i.qty)}</strong><button className="p0-icon-danger" onClick={()=>remove(i.productId)}><Trash2 size={14}/></button></div>)}</div>}
          <div className="p0-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Discount</span><input type="number" min="0" value={discount} onChange={e=>setDiscount(e.target.value)}/></div><div><span>Service charge %</span><input type="number" min="0" value={serviceCharge} onChange={e=>setServiceCharge(e.target.value)}/></div>{!tax.inclusive&&<div><span>GST</span><b>{money(baseTax)}</b></div>}<div className="total"><span>Total</span><b>{money(total)}</b></div><div><span>Paid</span><b>{money(paid)}</b></div><div><span>Due</span><b>{money(due)}</b></div></div>
          <div className="p0-payment-list"><div className="p0-subhead">Payments</div>{paymentRows.map((p,i)=><div className="p0-payment-row" key={i}><select value={p.method} onChange={e=>updatePayment(i,"method",e.target.value)}><option>Cash</option><option>UPI</option><option>Card</option></select><input type="number" min="0" value={p.amount} placeholder="Amount" onChange={e=>updatePayment(i,"amount",e.target.value)}/><input value={p.transactionId||""} placeholder="Txn ID / UPI ref" onChange={e=>updatePayment(i,"transactionId",e.target.value)}/><button onClick={()=>setPaymentRows(x=>x.filter((_,idx)=>idx!==i))} disabled={paymentRows.length===1}><X size={13}/></button></div>)}<Btn secondary onClick={addPayment}><Plus size={14}/> Split / Add payment</Btn></div>
          <div className="p0-actions"><Btn onClick={checkout} disabled={saving}>{saving?"Saving…":"Create Bill & KOT"}</Btn><Btn secondary onClick={reset}>Clear</Btn>{lastInvoice&&<><Btn secondary onClick={print}><Printer size={14}/> Reprint</Btn><Btn secondary danger onClick={cancelLatest}><X size={14}/> Cancel / Void</Btn></>}</div>
        </SectionCard>
      </aside>
    </div>
  </div>;
}

function invoiceHtml(inv) {
  return `<div style="font-family:Arial;padding:24px;max-width:760px;margin:auto"><h1>${escapeHtml(inv.invoiceNumber||"Invoice")}</h1><p>Order: ${escapeHtml(inv.orderNumber||"")}</p><hr/><table style="width:100%;border-collapse:collapse"><tr><th align="left">Item</th><th>Qty</th><th align="right">Amount</th></tr>${(inv.items||[]).map(i=>`<tr><td>${escapeHtml(i.name)}</td><td align="center">${i.qty}</td><td align="right">${money(i.price*i.qty)}</td></tr>`).join("")}</table><hr/><p>Subtotal: ${money(inv.subtotal)}</p><p>Discount: ${money(inv.discount)}</p><p>Tax: ${money(inv.tax?.amount)}</p><p>Service charge: ${money(inv.serviceCharge)}</p><h2>Total: ${money(inv.total)}</h2></div>`;
}
function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
function printDocument(title, html) { const w=window.open("","_blank","width=900,height=700"); if(!w)return; w.document.write(`<html><head><title>${escapeHtml(title)}</title></head><body>${html}<script>window.onload=()=>window.print()<\/script></body></html>`); w.document.close(); }
function downloadText(filename, content, mime="text/plain") { const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([content],{type:mime})); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function exportCSV(filename, rows) { const keys=Array.from(new Set(rows.flatMap(r=>Object.keys(r)))); const csv=[keys.join(","),...rows.map(r=>keys.map(k=>`"${String(r[k]??"").replace(/"/g,'""')}"`).join(","))].join("\n"); downloadText(filename,csv,"text/csv;charset=utf-8"); }
function exportExcel(filename, rows) { const keys=Array.from(new Set(rows.flatMap(r=>Object.keys(r)))); const html=`<table><tr>${keys.map(k=>`<th>${escapeHtml(k)}</th>`).join("")}</tr>${rows.map(r=>`<tr>${keys.map(k=>`<td>${escapeHtml(r[k])}</td>`).join("")}</tr>`).join("")}</table>`; downloadText(filename,`<html><body>${html}</body></html>`,'application/vnd.ms-excel'); }

async function deductRecipeIngredients(kot) {
  if (kot.inventoryDeducted) return;
  const recipeIds = (kot.items || []).map(i => i.productId).filter(Boolean);
  if (!recipeIds.length) return;
  const recipeSnaps = await Promise.all(recipeIds.map(id => getDoc(doc(db, "recipes", id))));
  const recipeMap = {};
  recipeSnaps.forEach(s => { if (s.exists()) recipeMap[s.id] = s.data(); });
  const deductions = {};
  (kot.items || []).forEach(item => {
    const recipe = recipeMap[item.productId];
    if (!recipe) return;
    (recipe.ingredients || []).forEach(ing => {
      if (!ing.inventoryId) return;
      deductions[ing.inventoryId] = (deductions[ing.inventoryId] || 0) + num(ing.qty) * num(item.qty);
    });
  });
  const entries = Object.entries(deductions);
  if (!entries.length) return;
  await runTransaction(db, async tx => {
    const snaps = await Promise.all(entries.map(([id]) => tx.get(doc(db, "inventory", id))));
    snaps.forEach((snap, idx) => {
      if (!snap.exists()) return;
      const current = num(snap.data().qty ?? snap.data().stock);
      const next = Math.max(0, current - entries[idx][1]);
      tx.update(snap.ref, { qty: next, updatedAt: serverTimestamp(), updated: "Recipe deduction" });
    });
    tx.update(doc(db, "kots", kot.id), { inventoryDeducted: true, inventoryDeductedAt: serverTimestamp() });
  });
}

export function AdminKitchen({ currentStaff, branchId="all" }) {
  const [tab, setTab] = useState("kots");
  const [stations] = useState(["Main Kitchen", "Grill", "Beverage", "Dessert", "Packing"]);
  const [station, setStation] = useState("All");
  const { rows: kots, loading } = useCollection("kots", { branchId, order: true });

  const update = async (kot, status) => {
    try {
      if (status === "Completed") await deductRecipeIngredients(kot);
      const statusTimes = status === "Accepted" ? { acceptedAt: serverTimestamp() } : status === "Preparing" ? { preparingAt: serverTimestamp() } : {};
      await updateDoc(doc(db, "kots", kot.id), {
        status,
        ...statusTimes,
        updatedAt: serverTimestamp(),
        lastActionBy: currentStaff?.uid || currentStaff?.id || "unknown"
      });
      await audit({
        staff: currentStaff,
        action: `KOT_${status.toUpperCase()}`,
        module: "Kitchen",
        oldValue: kot.status,
        newValue: status,
        branchId
      });
    } catch (e) {
      console.error(e);
      alert(e?.message || "Unable to update KOT");
    }
  };

  const removeItem = async (kot, index) => {
    const item = (kot.items || [])[index];
    if (!item) return;
    try {
      const next = (kot.items || []).filter((_, i) => i !== index);
      await updateDoc(doc(db, "kots", kot.id), {
        items: next,
        updatedAt: serverTimestamp()
      });
      await audit({ staff: currentStaff, action: "KOT_ITEM_CANCEL", module: "Kitchen", oldValue: item, newValue: null, branchId });
    } catch (e) {
      alert(e?.message || "Unable to cancel item");
    }
  };

  const modifyItem = async (kot, index) => {
    const item = (kot.items || [])[index];
    if (!item) return;
    const qtyText = window.prompt(`Quantity for ${item.name}`, String(item.qty || 1));
    if (qtyText === null) return;
    const qty = Math.max(1, Number(qtyText) || 1);
    try {
      const next = (kot.items || []).map((x, i) => i === index ? { ...x, qty } : x);
      await updateDoc(doc(db, "kots", kot.id), { items: next, updatedAt: serverTimestamp() });
      await audit({ staff: currentStaff, action: "KOT_ITEM_MODIFY", module: "Kitchen", oldValue: item, newValue: next[index], branchId });
    } catch (e) { alert(e?.message || "Unable to modify item"); }
  };

  const modifyInstructions = async (kot) => {
    const text = window.prompt("Special instructions", kot.specialInstructions || "");
    if (text === null) return;
    try {
      await updateDoc(doc(db, "kots", kot.id), { specialInstructions: text, updatedAt: serverTimestamp() });
      await audit({ staff: currentStaff, action: "KOT_MODIFY", module: "Kitchen", oldValue: kot.specialInstructions || "", newValue: text, branchId });
    } catch (e) {
      alert(e?.message || "Unable to modify KOT");
    }
  };

  const printKot = (kot) => printDocument(
    kot.kotNumber,
    `<div style="font-family:Arial;padding:20px"><h2>${escapeHtml(kot.kotNumber)}</h2><p>Order: ${escapeHtml(kot.orderNumber)} | Table: ${escapeHtml(kot.tableNumber || "—")}</p><hr/>${(kot.items || []).map(i => `<p><b>${i.qty} × ${escapeHtml(i.name)}</b></p>`).join("")}<p>Instructions: ${escapeHtml(kot.specialInstructions || "—")}</p></div>`
  );

  const visibleKots = station === "All" ? kots : kots.filter(k => (k.station || "Main Kitchen") === station);

  return (
    <div className="p0-page">
      <div className="p0-tabs">
        <button className={tab === "kots" ? "active" : ""} onClick={() => setTab("kots")}>KOT Management</button>
        <button className={tab === "kds" ? "active" : ""} onClick={() => setTab("kds")}>Kitchen Display</button>
      </div>

      {tab === "kots" ? (
        <SectionCard
          title="Kitchen Orders (KOT)"
          icon={ChefHat}
          right={<select className="p0-select-small" value={station} onChange={e => setStation(e.target.value)}><option>All</option>{stations.map(s => <option key={s}>{s}</option>)}</select>}
        >
          {loading ? <Loading /> : !visibleKots.length ? <Empty text="No KOTs yet. Create one from POS." /> : (
            <div className="p0-kot-grid">
              {visibleKots.map(k => (
                <article className="p0-kot" key={k.id}>
                  <div className="p0-kot-head"><strong>{k.kotNumber}</strong><span>{k.status}</span></div>
                  <p>Order {k.orderNumber} · Table {k.tableNumber || "—"} · {k.station || "Main Kitchen"}</p>
                  {(k.items || []).map((item, idx) => (
                    <div className="p0-kot-item" key={`${k.id}-${idx}`}>
                      <b>{item.qty} × {item.name}</b><span>{item.status || "New"}</span>
                    </div>
                  ))}
                  <small>Instructions: {k.specialInstructions || "—"}</small>
                  <div className="p0-actions">
                    {(k.items || []).map((item, idx) => (
                      <React.Fragment key={`${k.id}-item-actions-${idx}`}>
                        <Btn secondary onClick={() => modifyItem(k, idx)}>Modify item: {item.name}</Btn>
                        <Btn secondary onClick={() => removeItem(k, idx)}>Cancel item: {item.name}</Btn>
                      </React.Fragment>
                    ))}
                    <Btn secondary onClick={() => modifyInstructions(k)}>Modify instructions</Btn>
                    <Btn secondary onClick={() => printKot(k)}><Printer size={13} /> Print / Reprint</Btn>
                    <select className="p0-select-small" value={k.status || "New"} onChange={e => update(k, e.target.value)}>
                      <option>New</option><option>Accepted</option><option>Preparing</option><option>Ready</option><option>Completed</option><option>Cancelled</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      ) : <KDS kots={visibleKots} update={update} />}
    </div>
  );
}

function KDS({ kots, update }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(id); }, []);
  const active = kots.filter(k => ["New", "Accepted", "Preparing", "Ready"].includes(k.status));
  const elapsed = (kot) => { const start = kot.preparingAt?.toDate?.() || kot.acceptedAt?.toDate?.() || kot.createdAt?.toDate?.(); if (!start) return "00:00"; const sec = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)); return `${String(Math.floor(sec / 60)).padStart(2,"0")}:${String(sec % 60).padStart(2,"0")}`; };
  return (
    <div className="p0-kds-grid">
      {active.map(k => (
        <article className={`p0-kds-card status-${String(k.status).toLowerCase()}`} key={k.id}>
          <div className="p0-kot-head"><strong>{k.kotNumber}</strong><span>{k.status}</span></div>
          <h3>Order {k.orderNumber}</h3>
          <small>Table {k.tableNumber || "—"} · {k.station || "Main Kitchen"}</small>
          <div className="p0-timer">⏱ Preparation timer: {elapsed(k)}</div>
          {(k.items || []).map((item, idx) => <div className="p0-kot-item" key={idx}><b>{item.qty} × {item.name}</b><span>{item.instructions || ""}</span></div>)}
          <div className="p0-actions">
            {k.status === "New" && <Btn onClick={() => update(k, "Accepted")}><Check size={13} /> Accept</Btn>}
            {k.status === "Accepted" && <Btn onClick={() => update(k, "Preparing")}>Start Preparing</Btn>}
            {k.status === "Preparing" && <Btn onClick={() => update(k, "Ready")}>Mark Ready</Btn>}
            {k.status === "Ready" && <Btn onClick={() => update(k, "Completed")}>Complete</Btn>}
          </div>
        </article>
      ))}
      {!active.length && <Empty text="No active kitchen tickets." />}
    </div>
  );
}

export function AdminTaxSettings({ currentStaff, branchId="all" }) {
  const [form,setForm]=useState({gstin:"",cgst:2.5,sgst:2.5,igst:5,interState:false,inclusive:false,serviceCharge:0,roundOff:true,defaultProductTax:5}); const [saving,setSaving]=useState(false);
  useEffect(()=>{getDoc(doc(db,"settings","taxSettings")).then(s=>s.exists()&&setForm(f=>({...f,...s.data()}))).catch(console.error)},[]);
  const save=async()=>{setSaving(true);try{await setDoc(doc(db,"settings","taxSettings"),{...form,branchId,updatedAt:serverTimestamp()},{merge:true});await audit({staff:currentStaff,action:"UPDATE",module:"Tax & GST",newValue:form,branchId});alert("Tax settings saved.")}catch(e){alert(e?.message||"Unable to save tax settings")}finally{setSaving(false)}};
  return <SectionCard title="Tax & GST" icon={Receipt}><div className="p0-grid-4"><Field label="GSTIN" value={form.gstin} onChange={v=>setForm({...form,gstin:v})}/><Field label="CGST %" type="number" value={form.cgst} onChange={v=>setForm({...form,cgst:v})}/><Field label="SGST %" type="number" value={form.sgst} onChange={v=>setForm({...form,sgst:v})}/><Field label="IGST %" type="number" value={form.igst} onChange={v=>setForm({...form,igst:v})}/><Field label="Service charge %" type="number" value={form.serviceCharge} onChange={v=>setForm({...form,serviceCharge:v})}/><Field label="Default product tax %" type="number" value={form.defaultProductTax} onChange={v=>setForm({...form,defaultProductTax:v})}/><label className="p0-check"><input type="checkbox" checked={!!form.inclusive} onChange={e=>setForm({...form,inclusive:e.target.checked})}/> Tax-inclusive pricing</label><label className="p0-check"><input type="checkbox" checked={!!form.interState} onChange={e=>setForm({...form,interState:e.target.checked})}/> Inter-state billing (IGST only)</label><label className="p0-check"><input type="checkbox" checked={!!form.roundOff} onChange={e=>setForm({...form,roundOff:e.target.checked})}/> Round-off bill total</label></div><div className="p0-note">CGST + SGST are used for intra-state billing; IGST is available for inter-state billing. POS uses the saved configuration rather than hard-coded tax values.</div><Btn onClick={save} disabled={saving}><Save size={14}/> {saving?"Saving…":"Save Tax Settings"}</Btn></SectionCard>;
}

export function AdminTransactions({ currentStaff, branchId="all" }) {
  const {rows,loading}=useCollection("payments",{branchId,order:true}); const [filter,setFilter]=useState("All"); const shown=rows.filter(r=>filter==="All"||r.status===filter); const reconcile=shown.reduce((a,r)=>a+num(r.amount),0);
  const update=async(r,status)=>{
    try {
      if (status === "Refunded") {
        const refundId = `REF-${Date.now()}`;
        await setDoc(doc(db,"refunds",refundId),{id:refundId,paymentId:r.id,orderId:r.orderId||"",orderNumber:r.orderNumber||"",invoiceNumber:r.invoiceNumber||"",branchId,amount:num(r.amount),reason:"Manual refund",status:"Refunded",createdBy:currentStaff?.uid||currentStaff?.id||"unknown",createdAt:serverTimestamp()});
        if (r.invoiceNumber) await updateDoc(doc(db,"invoices",r.invoiceNumber),{status:"Refunded",updatedAt:serverTimestamp()});
      }
      await updateDoc(doc(db,"payments",r.id),{status,updatedAt:serverTimestamp()});
      await audit({staff:currentStaff,action:status==="Refunded"?"REFUND":"PAYMENT_STATUS",module:"Payments",oldValue:r.status,newValue:status,branchId});
    } catch(e) { alert(e?.message||"Payment update failed"); }
  };
  return <SectionCard title="Payment Transactions & Daily Reconciliation" icon={Receipt} right={<div className="p0-inline"><select className="p0-select-small" value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Pending</option><option>Paid</option><option>Partially Paid</option><option>Failed</option><option>Refunded</option></select><b>{money(reconcile)}</b></div>}>{loading?<Loading/>:!shown.length?<Empty/>:<div className="p0-table-wrap"><table className="p0-table"><thead><tr><th>Transaction</th><th>Order</th><th>Method</th><th>Amount</th><th>Status</th><th>Reference</th><th>Action</th></tr></thead><tbody>{shown.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.orderNumber||"—"}</td><td>{r.method}</td><td>{money(r.amount)}</td><td><span className="p0-badge">{r.status}</span></td><td>{r.transactionId||r.upiReference||"—"}</td><td><select className="p0-select-small" value={r.status||"Pending"} onChange={e=>update(r,e.target.value)}><option>Pending</option><option>Paid</option><option>Partially Paid</option><option>Failed</option><option>Refunded</option><option>Cancelled</option></select></td></tr>)}</tbody></table></div>}</SectionCard>;
}

export function AdminInvoices({ currentStaff, branchId="all" }) {
  const { rows, loading } = useCollection("invoices", { branchId, order: true });
  const [prefix, setPrefix] = useState("INV");
  const [saving, setSaving] = useState(false);
  useEffect(() => { getDoc(doc(db,"settings","invoiceSettings")).then(s => s.exists() && setPrefix(s.data().prefix || "INV")).catch(console.error); }, []);
  const savePrefix = async () => {
    const value = clean(prefix).toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 12) || "INV";
    setSaving(true);
    try { await setDoc(doc(db,"settings","invoiceSettings"),{prefix:value,updatedAt:serverTimestamp()},{merge:true}); setPrefix(value); await audit({staff:currentStaff,action:"UPDATE",module:"Invoice",newValue:{prefix:value},branchId}); alert("Invoice prefix saved."); }
    catch(e){ alert(e?.message||"Unable to save invoice prefix"); }
    finally { setSaving(false); }
  };
  const cancel = async r => { if(!window.confirm(`Cancel invoice ${r.invoiceNumber}?`))return; try { await updateDoc(doc(db,"invoices",r.id),{status:"Cancelled",updatedAt:serverTimestamp()}); await audit({staff:currentStaff,action:"CANCEL",module:"Invoice",oldValue:r.status,newValue:"Cancelled",branchId}); } catch(e){alert(e?.message||"Unable to cancel invoice")} };
  return <SectionCard title="Invoice Management" icon={Receipt}>
    <div className="p0-inline" style={{marginBottom:15}}><label className="p0-field" style={{maxWidth:220}}><span>Invoice prefix</span><input value={prefix} onChange={e=>setPrefix(e.target.value)}/></label><Btn onClick={savePrefix} disabled={saving}><Save size={13}/> Save Prefix</Btn></div>
    {loading?<Loading/>:!rows.length?<Empty text="Invoices appear here after POS billing."/>:<div className="p0-table-wrap"><table className="p0-table"><thead><tr><th>Invoice</th><th>Order</th><th>Customer</th><th>Total</th><th>GST</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.invoiceNumber}</td><td>{r.orderNumber}</td><td>{r.customer?.name||"Walk-in"}</td><td>{money(r.total)}</td><td>{r.gstInvoice?"GST":"Customer"}</td><td>{r.status}</td><td><div className="p0-inline"><Btn secondary onClick={()=>printDocument(r.invoiceNumber,invoiceHtml(r))}><Printer size={13}/> Print / PDF</Btn><Btn secondary onClick={()=>downloadText(`${r.invoiceNumber}.html`,invoiceHtml(r),"text/html")}><Download size={13}/> Download</Btn><Btn danger secondary onClick={()=>cancel(r)}>Cancel</Btn></div></td></tr>)}</tbody></table></div>}
  </SectionCard>;
}

function periodRange(period,from,to){const end=new Date();end.setHours(23,59,59,999);let start=new Date();start.setHours(0,0,0,0);if(period==="Yesterday"){start.setDate(start.getDate()-1);end.setDate(end.getDate()-1);end.setHours(23,59,59,999)}else if(period==="This week"){start.setDate(start.getDate()-((start.getDay()+6)%7))}else if(period==="This month"){start.setDate(1)}else if(period==="Custom"&&from&&to){start=new Date(from);end=new Date(to);end.setHours(23,59,59,999)}return [start,end]}
export function AdminReports({ branchId="all" }) {
  const [period,setPeriod]=useState("Today");const [from,setFrom]=useState(dateKey());const [to,setTo]=useState(dateKey());const [refresh,setRefresh]=useState(0);const [data,setData]=useState({orders:[],payments:[],inventory:[],expenses:[],purchases:[]});
  useEffect(()=>{let dead=false;(async()=>{try{const names=["orders","payments","inventory","expenses","purchases"];const out={};for(const n of names){const snap=await getDocs(branchId!=="all"?query(collection(db,n),where("branchId","==",branchId),limit(1000)):query(collection(db,n),limit(1000)));out[n]=snap.docs.map(d=>({id:d.id,...d.data()}));}if(!dead)setData(out)}catch(e){console.error("Reports",e)}})();return()=>{dead=true}},[branchId,refresh]);
  const [start,end]=periodRange(period,from,to);const inRange=r=>{const d=r.createdAt?.toDate?.()||new Date(r.createdAt||r.date||0);return d>=start&&d<=end};const orders=data.orders.filter(inRange);const payments=data.payments.filter(inRange);const revenue=orders.reduce((s,o)=>s+num(o.total),0);const refunds=payments.filter(p=>p.status==="Refunded").reduce((s,p)=>s+num(p.amount),0);const net=revenue-refunds;const rows=[...orders.map(o=>({type:"Order",id:o.orderNumber||o.id,date:o.date||dateKey(),type2:o.type,total:o.total,status:o.status})),...payments.map(p=>({type:"Payment",id:p.id,date:p.date||dateKey(),type2:p.method,total:p.amount,status:p.status}))];const productMap={};orders.forEach(o=>(o.items||[]).forEach(i=>{productMap[i.name]=(productMap[i.name]||0)+num(i.qty)}));const productRows=Object.entries(productMap).map(([product,qty])=>({product,qty}));
  return <div className="p0-page"><SectionCard title="Reports & Analytics" icon={BarChart3} right={<Btn secondary onClick={()=>setRefresh(x=>x+1)}><RefreshCw size={13}/> Refresh</Btn>}><div className="p0-report-filters"><select className="p0-select-small" value={period} onChange={e=>setPeriod(e.target.value)}><option>Today</option><option>Yesterday</option><option>This week</option><option>This month</option><option>Custom</option></select>{period==="Custom"&&<><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></>}<Btn secondary onClick={()=>exportCSV(`restaurant-report-${dateKey()}.csv`,rows)}><Download size={13}/> CSV</Btn><Btn secondary onClick={()=>exportExcel(`restaurant-report-${dateKey()}.xls`,rows)}><Download size={13}/> Excel</Btn><Btn secondary onClick={()=>printDocument("Restaurant Report",`<h1>Restaurant Report</h1><pre>${escapeHtml(JSON.stringify(rows,null,2))}</pre>`)}><Printer size={13}/> PDF / Print</Btn></div><div className="p0-stat-grid"><div><small>Sales / Revenue</small><strong>{money(revenue)}</strong></div><div><small>Net after refunds</small><strong>{money(net)}</strong></div><div><small>Orders</small><strong>{orders.length}</strong></div><div><small>Payments</small><strong>{payments.length}</strong></div></div><div className="p0-report-grid"><ReportList title="Sales report" rows={rows}/><ReportList title="Product report" rows={productRows}/><ReportList title="Payment report" rows={payments.map(p=>({method:p.method,amount:p.amount,status:p.status}))}/><ReportList title="Inventory report" rows={data.inventory.map(i=>({name:i.name,qty:i.qty,unit:i.unit,min:i.min}))}/><ReportList title="Purchase report" rows={data.purchases}/><ReportList title="Expense report" rows={data.expenses}/><ReportList title="Customer report" rows={orders.map(o=>({customer:o.customer?.name||o.customer||"Walk-in",total:o.total,type:o.type}))}/><ReportList title="Delivery report" rows={orders.filter(o=>o.type==="Delivery").map(o=>({order:o.orderNumber,total:o.total,status:o.status}))}/><ReportList title="Branch report" rows={orders.map(o=>({branchId:o.branchId,total:o.total}))}/><ReportList title="Profitability report" rows={productRows}/><ReportList title="Category report" rows={orders.flatMap(o=>o.items||[]).map(i=>({category:i.category||"Uncategorised",qty:i.qty}))}/><ReportList title="GST report" rows={orders.map(o=>({order:o.orderNumber,cgst:o.tax?.cgst||0,sgst:o.tax?.sgst||0,igst:o.tax?.igst||0,tax:o.tax?.amount||0}))}/></div></SectionCard></div>;
}
function ReportList({title,rows}){return <div className="p0-report-card"><strong>{title}</strong>{!rows.length?<small>No data</small>:rows.slice(0,12).map((r,i)=><div key={i}><span>{Object.values(r)[0]}</span><b>{Object.values(r)[1]??""}</b></div>)}</div>}

export function AdminAuditLogs({ branchId="all" }) { const {rows,loading}=useCollection("auditLogs",{branchId,order:true,max:500});return <SectionCard title="Audit Logs" icon={ShieldCheck}>{loading?<Loading/>:!rows.length?<Empty text="No audit activity yet."/>:<div className="p0-table-wrap"><table className="p0-table"><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Module</th><th>Branch</th><th>Details</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.date} {r.time}</td><td>{r.user}</td><td>{r.action}</td><td>{r.module}</td><td>{r.branchId}</td><td>{r.details||"—"}</td></tr>)}</tbody></table></div>}</SectionCard> }

export function AdminBranches({ currentStaff }) { const {rows,loading}=useCollection("branches",{max:100});const [form,setForm]=useState({id:"",code:"",name:"",address:"",phone:"",managerId:"",active:true});const edit=b=>setForm({id:b.id,code:b.code||"",name:b.name||"",address:b.address||"",phone:b.phone||"",managerId:b.managerId||"",active:b.active!==false});const save=async()=>{if(!clean(form.name)||!clean(form.code))return alert("Branch name and code are required.");try{const id=clean(form.id)||`branch-${Date.now()}`;const old=rows.find(x=>x.id===id)||null;await setDoc(doc(db,"branches",id),{...form,id,createdAt:old?.createdAt||serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});await audit({staff:currentStaff,action:old?"UPDATE":"CREATE",module:"Branches",oldValue:old,newValue:form,branchId:id});setForm({id:"",code:"",name:"",address:"",phone:"",managerId:"",active:true})}catch(e){alert(e?.message||"Unable to save branch")}};const disable=async b=>{try{await updateDoc(doc(db,"branches",b.id),{active:false,updatedAt:serverTimestamp()});await audit({staff:currentStaff,action:"DISABLE",module:"Branches",oldValue:b,newValue:{...b,active:false},branchId:b.id})}catch(e){alert(e?.message||"Unable to disable branch")}};return <div className="p0-page"><SectionCard title="Multi-Branch Management" icon={GitBranch}><div className="p0-grid-4"><Field label="Branch code" value={form.code} onChange={v=>setForm({...form,code:v})}/><Field label="Branch name" value={form.name} onChange={v=>setForm({...form,name:v})}/><Field label="Phone" value={form.phone} onChange={v=>setForm({...form,phone:v})}/><Field label="Manager ID" value={form.managerId} onChange={v=>setForm({...form,managerId:v})}/><div className="p0-span-4"><Field label="Address" value={form.address} onChange={v=>setForm({...form,address:v})}/></div></div><div className="p0-actions"><Btn onClick={save}><Save size={14}/> {form.id?"Update Branch":"Add Branch"}</Btn>{form.id&&<Btn secondary onClick={()=>setForm({id:"",code:"",name:"",address:"",phone:"",managerId:"",active:true})}>Cancel</Btn>}</div></SectionCard><SectionCard title={`Branches (${rows.length})`}>{loading?<Loading/>:!rows.length?<Empty text="No branches configured. Add Branch 01–03 as required."/>:<div className="p0-table-wrap"><table className="p0-table"><thead><tr><th>Code</th><th>Name</th><th>Manager</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(b=><tr key={b.id}><td>{b.code}</td><td>{b.name}</td><td>{b.managerId||"—"}</td><td>{b.active===false?"Disabled":"Active"}</td><td><Btn secondary onClick={()=>edit(b)}><RotateCcw size={13}/> Edit</Btn> <Btn danger secondary onClick={()=>disable(b)} disabled={b.active===false}>Disable</Btn></td></tr>)}</tbody></table></div>}</SectionCard></div> }

export function AdminStaffPermissions({ staff=[], setStaff, currentStaff, branchId="all" }) { const [selected,setSelected]=useState(staff[0]?.id||"");const member=staff.find(x=>x.id===selected);const [perms,setPerms]=useState(member?.permissions||ROLE_DEFAULTS[normalizeRole(member?.role)]||[]);useEffect(()=>setPerms(member?.permissions||ROLE_DEFAULTS[normalizeRole(member?.role)]||[]),[selected,member?.role]);const save=async()=>{if(!member)return;try{await setDoc(doc(db,"staff",member.id),{...member,permissions:perms,branchId:member.branchId||branchId,updatedAt:serverTimestamp()},{merge:true});setStaff(c=>c.map(x=>x.id===member.id?{...x,permissions:perms,branchId:x.branchId||branchId}:x));await audit({staff:currentStaff,action:"PERMISSION_CHANGE",module:"Staff",oldValue:member.permissions||[],newValue:perms,branchId});alert("Permissions saved.")}catch(e){alert(e?.message||"Unable to save permissions")}};return <SectionCard title="Role-Based Permissions" icon={ShieldCheck}><div className="p0-grid-2"><label className="p0-field"><span>Staff member</span><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select staff</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}</select></label><div className="p0-note">Roles are data-driven. For production security, Firebase Rules must enforce the same branch and permission model.</div></div>{member&&<><div className="p0-permission-grid">{P0_PERMISSIONS.map(p=><label key={p} className="p0-check"><input type="checkbox" checked={perms.includes(p)} onChange={e=>setPerms(x=>e.target.checked?[...x,p]:x.filter(y=>y!==p))}/>{p}</label>)}</div><Btn onClick={save}><Save size={14}/> Save Permissions</Btn></>}</SectionCard> }

export function AdminRecipes({ inventory=[], products=[], currentStaff, branchId="all" }) { const {rows:recipes,loading}=useCollection("recipes",{branchId,max:200});const [form,setForm]=useState({name:"",productId:"",sellingPrice:"",ingredients:[]});const [ingredient,setIngredient]=useState({inventoryId:"",qty:"",unit:"kg",cost:""});const product=products.find(p=>p.id===form.productId);const totalCost=form.ingredients.reduce((s,i)=>s+num(i.qty)*num(i.cost),0);const foodPct=num(form.sellingPrice)?(totalCost/num(form.sellingPrice))*100:0;const margin=num(form.sellingPrice)-totalCost;const addIngredient=()=>{const item=inventory.find(i=>i.id===ingredient.inventoryId);if(!item||!num(ingredient.qty))return;setForm(f=>({...f,ingredients:[...f.ingredients,{inventoryId:item.id,name:item.name,qty:num(ingredient.qty),unit:ingredient.unit||item.unit||"kg",cost:num(ingredient.cost)}]}));setIngredient({inventoryId:"",qty:"",unit:"kg",cost:""})};const save=async()=>{if(!clean(form.name)||!form.ingredients.length)return alert("Recipe name and at least one ingredient are required.");try{const id=form.productId||`recipe-${Date.now()}`;await setDoc(doc(db,"recipes",id),{...form,id,branchId,totalCost,foodCostPercentage:foodPct,sellingPrice:num(form.sellingPrice||product?.price),profitMargin:margin,updatedAt:serverTimestamp(),createdAt:serverTimestamp()},{merge:true});await audit({staff:currentStaff,action:"CREATE",module:"Recipe",newValue:{name:form.name,totalCost},branchId});setForm({name:"",productId:"",sellingPrice:"",ingredients:[]});alert("Recipe saved.")}catch(e){alert(e?.message||"Unable to save recipe")}};return <SectionCard title="Recipes / Food Costing" icon={ChefHat}>{loading&&<Loading/>}<div className="p0-grid-4"><Field label="Recipe name" value={form.name} onChange={v=>setForm({...form,name:v})}/><label className="p0-field"><span>Menu product</span><select value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><Field label="Selling price" type="number" value={form.sellingPrice} onChange={v=>setForm({...form,sellingPrice:v})}/><div className="p0-cost-box"><b>Total cost {money(totalCost)}</b><span>Food cost {foodPct.toFixed(1)}% · Margin {money(margin)}</span></div></div><div className="p0-grid-4"><label className="p0-field"><span>Ingredient</span><select value={ingredient.inventoryId} onChange={e=>setIngredient({...ingredient,inventoryId:e.target.value})}><option value="">Select ingredient</option>{inventory.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label><Field label="Quantity" type="number" value={ingredient.qty} onChange={v=>setIngredient({...ingredient,qty:v})}/><Field label="Unit" value={ingredient.unit} onChange={v=>setIngredient({...ingredient,unit:v})}/><Field label="Cost per unit" type="number" value={ingredient.cost} onChange={v=>setIngredient({...ingredient,cost:v})}/></div><Btn secondary onClick={addIngredient}><Plus size={14}/> Add Ingredient</Btn><div className="p0-ingredient-list">{form.ingredients.map((i,idx)=><div key={idx}><span>{i.name} · {i.qty} {i.unit}</span><b>{money(i.qty*i.cost)}</b><button onClick={()=>setForm(f=>({...f,ingredients:f.ingredients.filter((_,x)=>x!==idx)}))}><X size={13}/></button></div>)}</div><Btn onClick={save}><Save size={14}/> Save Recipe</Btn><div className="p0-note">When a completed order contains a recipe, ingredient deduction should be performed server-side/transactionally against inventory. This client module stores the recipe and costing data without silently changing stock.</div><div className="p0-table-wrap"><table className="p0-table"><thead><tr><th>Recipe</th><th>Cost</th><th>Selling</th><th>Food cost %</th><th>Margin</th></tr></thead><tbody>{recipes.map(r=><tr key={r.id}><td>{r.name}</td><td>{money(r.totalCost)}</td><td>{money(r.sellingPrice)}</td><td>{Number(r.foodCostPercentage||0).toFixed(1)}%</td><td>{money(r.profitMargin)}</td></tr>)}</tbody></table></div></SectionCard> }
