/* Shared data layer ng buyer at seller; dito binabasa at sine-save ang data sa localStorage. */
(function () {
  "use strict";

  const KEYS = {
    PRODUCTS: "shopee_demo_products",
    CART: "shopee_demo_cart",
    ORDERS: "shopee_demo_orders",
    SESSION: "shopee_demo_session",
    PROFILES: "shopee_demo_profiles",
    VOUCHERS: "shopee_demo_vouchers",
  };

  const DEFAULT_VOUCHERS = [
    { code: "SAVE10", type: "percent", value: 10, minSubtotal: 0, active: true },
    { code: "LESS100", type: "fixed", value: 100, minSubtotal: 1000, active: true },
  ];
  const DEFAULT_DELIVERY_FEES = {
    metro: 80,
    luzon: 120,
    visayas: 150,
    mindanao: 180,
  };
  const previousSampleImageIds = {
    "canvas-tote-bag": ["1544816155-12df9643f363", "1152077"],
    "wireless-earbuds": ["1606220945770-b5b6c2c55bf1", "3394650"],
    "ceramic-mug": ["1514228742587-6b1558fcca3d", "302899"],
    "desk-lamp": ["1507473885765-e6ed057f782c", "1112598"],
    "cotton-shirt": ["1521572163474-6864f9cf17ab", "1020585"],
    "phone-stand": ["1586953208448-b95a79798f07", "4792733"],
    "plant-pot": ["1485955900006-10f4d324d411", "3097770"],
    "notebook-set": ["1531346878377-a5be20888e57", "261763"],
    "leather-wallet": ["1627123424574-724758594e93", "2079246"],
    "running-shoes": ["1542291026-7eec264c27ff", "2529148"],
    "portable-speaker": ["1608043152269-423dbba4e7e1", "63703"],
    "usb-c-charger": ["1625842268584-8f3296236761", "4526407"],
    "linen-cushion": ["1584100936595-c0654b55a2e2", "6430731"],
    "bamboo-cutlery": ["1556911220-e15b29be8c8f", "6996086"],
    "gel-pen-set": ["1583485088034-697b5bc54ccd", "376464"],
    "weekly-planner": ["1506784983877-45594efa4cbe", "669615"],
  };

  const sampleProducts = [
    {
      id: "canvas-tote-bag",
      name: "Everyday Canvas Tote Bag",
      category: "Fashion",
      price: 249,
      stock: 18,
      image: "https://images.pexels.com/photos/17836626/pexels-photo-17836626.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A sturdy, roomy tote for errands, work, and weekends.",
    },
    {
      id: "wireless-earbuds",
      name: "Wireless Bluetooth Earbuds",
      category: "Electronics",
      price: 899,
      stock: 12,
      image: "https://images.pexels.com/photos/33797659/pexels-photo-33797659.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "Compact earbuds with a charging case and clear everyday sound.",
    },
    {
      id: "ceramic-mug",
      name: "Handmade Ceramic Mug",
      category: "Home & Living",
      price: 329,
      stock: 9,
      image: "https://images.pexels.com/photos/6754875/pexels-photo-6754875.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A comfortable ceramic mug for coffee, tea, and slow mornings.",
    },
    {
      id: "desk-lamp",
      name: "Warm Light Desk Lamp",
      category: "Home & Living",
      price: 749,
      stock: 7,
      image: "https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A simple adjustable lamp for a calmer, better-lit workspace.",
    },
    {
      id: "cotton-shirt",
      name: "Relaxed Cotton T-Shirt",
      category: "Fashion",
      price: 399,
      stock: 24,
      image: "https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "Soft cotton with a relaxed fit for everyday wear.",
    },
    {
      id: "phone-stand",
      name: "Foldable Phone Stand",
      category: "Electronics",
      price: 199,
      stock: 30,
      image: "https://images.pexels.com/photos/4065883/pexels-photo-4065883.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A compact stand for hands-free calls, recipes, and viewing.",
    },
    {
      id: "plant-pot",
      name: "Minimal Plant Pot",
      category: "Home & Living",
      price: 279,
      stock: 14,
      image: "https://images.pexels.com/photos/9709224/pexels-photo-9709224.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A clean ceramic pot to bring a little green indoors.",
    },
    {
      id: "notebook-set",
      name: "Recycled Paper Notebook Set",
      category: "Stationery",
      price: 159,
      stock: 20,
      image: "https://images.pexels.com/photos/5712485/pexels-photo-5712485.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "Three practical notebooks for lists, ideas, and daily notes.",
    },
    {
      id: "leather-wallet",
      name: "Slim Everyday Wallet",
      category: "Fashion",
      price: 499,
      stock: 16,
      image: "https://images.pexels.com/photos/7952556/pexels-photo-7952556.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A compact wallet with room for cards and folded cash.",
    },
    {
      id: "running-shoes",
      name: "Lightweight Running Shoes",
      category: "Fashion",
      price: 1299,
      stock: 10,
      image: "https://images.pexels.com/photos/29096394/pexels-photo-29096394.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "Cushioned everyday trainers for walks, workouts, and commutes.",
    },
    {
      id: "portable-speaker",
      name: "Portable Bluetooth Speaker",
      category: "Electronics",
      price: 1099,
      stock: 8,
      image: "https://images.pexels.com/photos/18542239/pexels-photo-18542239.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A compact speaker for clear sound at home or on the go.",
    },
    {
      id: "usb-c-charger",
      name: "Fast USB-C Wall Charger",
      category: "Electronics",
      price: 599,
      stock: 22,
      image: "https://images.pexels.com/photos/36012993/pexels-photo-36012993.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A compact fast charger for phones, tablets, and other devices.",
    },
    {
      id: "linen-cushion",
      name: "Textured Linen Cushion",
      category: "Home & Living",
      price: 449,
      stock: 11,
      image: "https://images.pexels.com/photos/8762877/pexels-photo-8762877.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A soft textured cushion to add comfort to a sofa or reading chair.",
    },
    {
      id: "bamboo-cutlery",
      name: "Bamboo Kitchen Utensil Set",
      category: "Home & Living",
      price: 389,
      stock: 13,
      image: "https://images.pexels.com/photos/11001668/pexels-photo-11001668.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "A practical set of lightweight utensils for everyday cooking.",
    },
    {
      id: "gel-pen-set",
      name: "Fine Point Gel Pen Set",
      category: "Stationery",
      price: 129,
      stock: 35,
      image: "https://images.pexels.com/photos/5324787/pexels-photo-5324787.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "Smooth-writing pens in a useful set of everyday colors.",
    },
    {
      id: "weekly-planner",
      name: "Undated Weekly Planner",
      category: "Stationery",
      price: 229,
      stock: 19,
      image: "https://images.pexels.com/photos/6690208/pexels-photo-6690208.jpeg?auto=compress&cs=tinysrgb&w=600",
      description: "Plan projects, errands, and priorities one flexible week at a time.",
    },
  ];

  // Basahin at i-parse ang naka-save na data; gamitin ang fallback kung wala o invalid.
  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      if (!value) return fallback;
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch (error) {
      console.error(`Unable to read store data for ${key}.`, error);
      return fallback;
    }
  }

  // I-convert sa JSON at i-save ang data sa localStorage.
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Unable to save store data for ${key}.`, error);
      throw error;
    }
  }

  // I-save ang buong product list.
  function saveProducts(products) {
    write(KEYS.PRODUCTS, products);
  }

  // I-save ang laman ng cart.
  function saveCart(cart) {
    write(KEYS.CART, cart);
  }

  // I-save ang listahan ng orders.
  function saveOrders(orders) {
    write(KEYS.ORDERS, orders);
  }

  // Kunin ang current session kung valid buyer o seller ang role.
  function getSession() {
    const session = read(KEYS.SESSION, null);
    return session && (session.role === "buyer" || session.role === "seller") ? session : null;
  }

  // I-check ang credentials ng registered buyer o demo account, tapos gumawa ng session.
  function login(role, username, password) {
    if (arguments.length === 2) {
      password = username;
      username = role;
      role = "";
    }

    const profiles = read(KEYS.PROFILES, []);
    const profile = Array.isArray(profiles)
      ? profiles.find((item) => String(item.username || "").toLowerCase() === username.toLowerCase() && item.password === password)
      : null;
    if (profile) {
      write(KEYS.SESSION, {
        role: "buyer",
        profileId: profile.id,
        username: profile.username,
        name: profile.name,
        signedInAt: new Date().toISOString(),
      });
      return true;
    }

    const credentials = {
      buyer: { username: "buyer", password: "buyer123", name: "Buyer" },
      seller: { username: "seller", password: "seller123", name: "Seller" },
    };
    const accountRole = role || (username === "seller" ? "seller" : "buyer");
    const account = credentials[accountRole];
    if (!account || username !== account.username || password !== account.password) return false;
    write(KEYS.SESSION, {
      role: accountRole,
      username: account.username,
      name: account.name,
      signedInAt: new Date().toISOString(),
    });
    return true;
  }

  // Gumawa ng bagong buyer profile, i-save ito, at i-sign in agad ang bagong account.
  function registerBuyerProfile(profileData) {
    const profiles = read(KEYS.PROFILES, []);
    if (!Array.isArray(profiles)) throw new Error("Saved profiles are invalid.");
    const username = profileData.username.toLowerCase();
    if (["buyer", "seller"].includes(username) || profiles.some((profile) =>
      String(profile.username || "").toLowerCase() === username
    )) {
      return false;
    }

    const profile = {
      id: `buyer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      role: "buyer",
      name: profileData.name,
      username: profileData.username,
      password: profileData.password,
      contact: profileData.contact || "",
      address: profileData.address || "",
      cardholderName: "",
      cardLastFour: "",
      ewalletProvider: "",
      ewalletLastFour: "",
      createdAt: new Date().toISOString(),
    };
    profiles.push(profile);
    write(KEYS.PROFILES, profiles);
    write(KEYS.SESSION, {
      role: "buyer",
      profileId: profile.id,
      username: profile.username,
      name: profile.name,
      signedInAt: new Date().toISOString(),
    });
    return true;
  }

  // Hanapin ang profile na pag-aari ng kasalukuyang buyer session.
  function getCurrentProfile() {
    const session = getSession();
    if (!session || session.role !== "buyer" || !session.profileId) return null;
    const profiles = read(KEYS.PROFILES, []);
    return Array.isArray(profiles)
      ? profiles.find((profile) => profile.id === session.profileId) || null
      : null;
  }

  // I-update ang current buyer profile at i-sync ang pangalan sa session.
  function updateCurrentProfile(updates) {
    const session = getSession();
    const profiles = read(KEYS.PROFILES, []);
    if (!session || !session.profileId || !Array.isArray(profiles)) return false;
    const profile = profiles.find((item) => item.id === session.profileId);
    if (!profile) return false;

    Object.assign(profile, updates);
    write(KEYS.PROFILES, profiles);
    write(KEYS.SESSION, { ...session, name: profile.name });
    return true;
  }

  // Alisin ang current session para mag-sign out ang user.
  function logout() {
    localStorage.removeItem(KEYS.SESSION);
  }

  // Siguraduhing naka-login ang tamang role; kung hindi, dalhin sa login page.
  function requireRole(role) {
    const session = getSession();
    if (session && session.role === role) return session;
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`login.html?next=${encodeURIComponent(next)}&role=${encodeURIComponent(role)}`);
    return null;
  }

  // I-escape ang special HTML characters bago ilagay ang user data sa markup.
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // I-format ang number bilang Philippine peso na may dalawang decimal places.
  function formatPrice(value) {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // I-format ang petsa at oras para madaling basahin sa Philippine locale.
  function formatDate(value) {
    return new Date(value).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  window.STORE = {
    KEYS,
    getSession,
    login,
    registerBuyerProfile,
    getCurrentProfile,
    updateCurrentProfile,
    // Kunin o i-save ang vouchers at delivery fees na ginagamit sa checkout.
    getVouchers: () => read(KEYS.VOUCHERS, DEFAULT_VOUCHERS),
    saveVouchers: (vouchers) => write(KEYS.VOUCHERS, vouchers),
    getDeliveryFees: () => ({ ...DEFAULT_DELIVERY_FEES }),
    logout,
    requireRole,
    // Maglagay ng sample products kung empty pa ang catalog; panatilihin ang seller edits.
    initSampleProductsIfEmpty() {
      const products = read(KEYS.PRODUCTS, null);
      if (!Array.isArray(products) || products.length === 0) {
        saveProducts(sampleProducts);
        return;
      }

      let imagesUpdated = false;
      products.forEach((product) => {
        const previousImageIds = previousSampleImageIds[product.id] || [];
        const sample = sampleProducts.find((item) => item.id === product.id);
        if (sample && previousImageIds.some((imageId) => String(product.image).includes(imageId))) {
          product.image = sample.image;
          imagesUpdated = true;
        }
      });

      // Idagdag ang bagong sample products nang hindi pinapalitan ang seller edits o stock.
      const existingIds = new Set(products.map((product) => product.id));
      const newProducts = sampleProducts.filter((product) => !existingIds.has(product.id));
      if (newProducts.length > 0 || imagesUpdated) saveProducts([...products, ...newProducts]);
    },
    // Gumawa ng empty orders list kapag wala pang naka-save na orders.
    initOrdersIfMissing() {
      const orders = read(KEYS.ORDERS, null);
      if (!Array.isArray(orders)) saveOrders([]);
    },
    // Kunin, i-save, o hanapin ang products sa catalog.
    getProducts: () => read(KEYS.PRODUCTS, []),
    saveProducts,
    getProductById: (id) => read(KEYS.PRODUCTS, []).find((product) => product.id === id) || null,
    getCategories: () => [...new Set(read(KEYS.PRODUCTS, []).map((product) => product.category).filter(Boolean))],
    // Kunin, i-save, i-clear, at bilangin ang items sa cart.
    getCart: () => read(KEYS.CART, []),
    saveCart,
    clearCart: () => saveCart([]),
    getCartCount: () => read(KEYS.CART, []).reduce((total, item) => total + (Number(item.qty) || 0), 0),
    // Kunin, i-save, at hanapin ang orders.
    getOrders: () => read(KEYS.ORDERS, []),
    saveOrders,
    getOrderByNumber: (number) => read(KEYS.ORDERS, []).find((order) => order.orderNumber === number) || null,
    // Gumawa ng unique-ish order number gamit ang kasalukuyang oras.
    generateOrderNumber: () => `SD-${Date.now().toString(36).toUpperCase()}`,
    // Patakbuhin ulit ang callback kapag nagbago ang piniling localStorage data sa ibang tab.
    onExternalChange(keys, callback) {
      window.addEventListener("storage", (event) => {
        if (keys.includes(event.key)) callback();
      });
    },
    escapeHtml,
    formatPrice,
    formatDate,
    // Magpakita ng temporary success o error message sa screen.
    showToast(message, type) {
      const toast = document.createElement("div");
      toast.textContent = message;
      toast.style.cssText = [
        "position:fixed",
        "right:20px",
        "bottom:20px",
        "z-index:1000",
        "max-width:320px",
        "padding:12px 16px",
        "border-radius:4px",
        "color:#fff",
        `background:${type === "error" ? "#e03131" : "#26aa99"}`,
        "box-shadow:0 3px 12px rgba(0,0,0,.2)",
        "font-size:14px",
      ].join(";");
      document.body.appendChild(toast);
      window.setTimeout(() => toast.remove(), 2800);
    },
  };
})();
