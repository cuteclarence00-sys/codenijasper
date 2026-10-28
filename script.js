/* =========================================================
   script.js — Buyer-side features
   Para sa navigation bar (search at cart badge), product list at details,
   cart, checkout, confirmation, at order history ng buyer.
   Alamin kung anong page ito base sa mga element na nasa page.
   ========================================================= */

(function () {
  "use strict";

  const MY_ORDERS_KEY = "shopee_demo_my_order_numbers";
  const PAY_LATER_PLANS = {
    "paylater-3": { months: 3, monthlyRate: 0 },
    "paylater-6": { months: 6, monthlyRate: 0.001 },
    "paylater-12": { months: 12, monthlyRate: 0.003 },
  };
  const SELLER_ORIGIN = "Tondo, Manila, Philippines";
  const SELLER_NAME = "Jasper Clarence Ramos";
  const DELIVERY_COURIERS = {
    jnt: { name: "J&T Express", metro: "3–7 business days", provincial: "5–10 business days" },
    spx: { name: "SPX Express", metro: "3–7 business days", provincial: "5–10 business days" },
  };
  const DELIVERY_ZONES = {
    metro: "Metro Manila",
    luzon: "Rest of Luzon",
    visayas: "Visayas",
    mindanao: "Mindanao",
  };
  let appliedVoucherCode = null;

  if (document.getElementById("sellerPublicReviews")) {
    if (!STORE.getSession()) {
      STORE.requireRole("buyer");
      return;
    }
  } else if (!STORE.requireRole("buyer")) {
    return;
  }

  /* ---------- siguraduhing ready ang data ---------- */
  STORE.initSampleProductsIfEmpty();
  STORE.initOrdersIfMissing();

  // I-start ang navigation at kung anong features ang meron sa page na ito.
  document.addEventListener("DOMContentLoaded", () => {
    initNavbar();
    initLogout();
    renderCartBadge();

    if (document.getElementById("productGrid")) initHomePage();
    if (document.getElementById("productDetailWrap")) initProductPage();
    if (document.getElementById("cartContent")) initCartPage();
    if (document.getElementById("checkoutForm")) initCheckoutPage();
    if (document.getElementById("confirmBox")) initConfirmationPage();
    if (document.getElementById("ordersList")) initMyOrdersPage();
    if (document.getElementById("profileForm")) initAccountPage();
    if (document.getElementById("sellerPublicReviews")) initSellerProfilePage();
    refreshIcons();

    // I-refresh ang cart badge kapag nagbago ang cart sa ibang tab,
    // o kapag bumalik ang user dito.
    STORE.onExternalChange([STORE.KEYS.CART, STORE.KEYS.ORDERS, STORE.KEYS.PRODUCTS], () => {
      renderCartBadge();
      if (document.getElementById("productGrid")) renderProductGrid();
      if (document.getElementById("cartContent")) renderCartPage();
      if (document.getElementById("ordersList")) renderMyOrders();
    });

    // Gawing actual SVG icons ang mga Lucide placeholder.
    function refreshIcons() {
      if (window.lucide) window.lucide.createIcons();
    }

    // Kapag nag-logout, i-clear ang session at bumalik sa login page.
    function initLogout() {
      document.querySelectorAll("[data-logout]").forEach((button) => {
        button.addEventListener("click", () => {
          STORE.logout();
          window.location.href = "login.html";
        });
      });
    }
  });

  /* =========================================================
     Navigation bar: search at cart badge
     ========================================================= */

  // Ibalik sa search box ang query mula sa URL, at dalhin sa product list kapag nag-search.
  function initNavbar() {
    const form = document.getElementById("searchForm");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const input = document.getElementById("searchInput");
    if (q && input) input.value = q;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const term = input.value.trim();
      const url = new URL("index.html", window.location.href);
      if (term) url.searchParams.set("q", term);
      window.location.href = url.toString();
    });
  }

  // I-update ang bilang sa cart badge sa header; itago ito kapag walang laman ang cart.
  function renderCartBadge() {
    const badge = document.getElementById("cartBadge");
    if (!badge) return;
    const count = STORE.getCartCount();
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.style.display = count > 0 ? "flex" : "none";
  }

  /* =========================================================
     Home page: products, search, at categories
     ========================================================= */

  // Kunin sa URL ang selected category, tapos i-display ang products sa home page.
  function initHomePage() {
    const params = new URLSearchParams(window.location.search);
    const activeCategory = params.get("category") || "All";
    renderCategoryBar(activeCategory);
    renderProductGrid();
  }

  // Gumawa ng category links nang hindi nawawala ang current search query.
  function renderCategoryBar(activeCategory) {
    const bar = document.getElementById("categoryBar");
    if (!bar) return;
    const categories = ["All", ...STORE.getCategories()];
    bar.innerHTML = categories
      .map((cat) => {
        const isActive = cat === activeCategory;
        const url = new URL("index.html", window.location.href);
        if (cat !== "All") url.searchParams.set("category", cat);
        const q = new URLSearchParams(window.location.search).get("q");
        if (q) url.searchParams.set("q", q);
        return `<a class="chip${isActive ? " active" : ""}" href="${url.pathname}${url.search}">${STORE.escapeHtml(cat)}</a>`;
      })
      .join("");
  }

  // I-filter ang products base sa search at category, tapos i-display ang cards at buttons.
  function renderProductGrid() {
    const grid = document.getElementById("productGrid");
    const emptyState = document.getElementById("emptyState");
    const title = document.getElementById("resultsTitle");
    if (!grid) return;

    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") || "").trim().toLowerCase();
    const category = params.get("category") || "All";

    let products = STORE.getProducts();

    if (category !== "All") {
      products = products.filter((p) => p.category === category);
    }

    if (q) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }

    if (title) {
      if (q) title.textContent = `Search results for "${q}"`;
      else if (category !== "All") title.textContent = category;
      else title.textContent = "All Products";
    }

    if (products.length === 0) {
      grid.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    if (emptyState) emptyState.style.display = "none";

    grid.innerHTML = products.map(renderProductCard).join("");

    grid.querySelectorAll("[data-product-id]").forEach((card) => {
      card.addEventListener("click", (e) => {
        // Huwag mag-navigate kapag Add to Cart button ang pinindot.
        if (e.target.closest(".add-to-cart-btn")) return;
        window.location.href = `product.html?id=${encodeURIComponent(card.dataset.productId)}`;
      });
    });

    grid.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.productId;
        addToCart(id, 1);
      });
    });
  }

  // Ipakita ang seller reviews at i-refresh kapag may pagbabago sa orders.
  function initSellerProfilePage() {
    renderSellerPublicReviews();
    STORE.onExternalChange([STORE.KEYS.ORDERS], renderSellerPublicReviews);
  }

  // I-compute ang average rating at ipakita ang reviews mula sa delivered orders.
  function renderSellerPublicReviews() {
    const reviewsContainer = document.getElementById("sellerPublicReviews");
    const summary = document.getElementById("sellerReviewSummary");
    if (!reviewsContainer || !summary) return;

    const reviews = STORE.getOrders()
      .filter((order) => order.status === "Delivered" && order.review
        && Number.isInteger(Number(order.review.rating))
        && Number(order.review.rating) >= 1 && Number(order.review.rating) <= 5
        && typeof order.review.comment === "string")
      .sort((a, b) => new Date(b.review.createdAt) - new Date(a.review.createdAt));
    const average = reviews.length
      ? reviews.reduce((total, order) => total + Number(order.review.rating), 0) / reviews.length
      : 0;
    summary.innerHTML = reviews.length
      ? `<strong>${average.toFixed(1)} / 5</strong> <span class="seller-review-stars">${"★".repeat(Math.round(average))}${"☆".repeat(5 - Math.round(average))}</span> · ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`
      : "No buyer reviews yet.";

    reviewsContainer.innerHTML = reviews.length
      ? reviews.map((order) => `
        <article class="public-review-card">
          <div class="public-review-heading">
            <strong class="seller-review-stars" aria-label="${Number(order.review.rating)} out of 5 stars">${"★".repeat(Number(order.review.rating))}${"☆".repeat(5 - Number(order.review.rating))}</strong>
            <span>Verified buyer</span>
          </div>
          <p>${STORE.escapeHtml(order.review.comment)}</p>
          <small>${STORE.formatDate(order.review.createdAt)}</small>
        </article>`).join("")
      : `<div class="empty-state">Reviews from delivered orders will appear here.</div>`;
  }

  // Ibalik ang product card markup kasama ang stock status at Add to Cart button.
  function renderProductCard(p) {
    const outOfStock = p.stock <= 0;
    const lowStock = !outOfStock && p.stock <= 5;
    let stockHtml;
    if (outOfStock) stockHtml = `<span class="stock-out">Out of stock</span>`;
    else if (lowStock) stockHtml = `<span class="stock-low">Only ${p.stock} left</span>`;
    else stockHtml = `<span>${p.stock} in stock</span>`;

    return `
      <div class="product-card" data-product-id="${STORE.escapeHtml(p.id)}">
        <img class="product-thumb" src="${STORE.escapeHtml(p.image)}" alt="${STORE.escapeHtml(p.name)}"
             onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'" />
        <div class="product-info">
          <div class="product-name">${STORE.escapeHtml(p.name)}</div>
          <div class="product-price">${STORE.formatPrice(p.price)}</div>
          <div class="product-meta">
            ${stockHtml}
          </div>
          <button class="btn btn-primary btn-sm btn-block add-to-cart-btn" style="margin-top:8px;"
                  data-product-id="${STORE.escapeHtml(p.id)}" ${outOfStock ? "disabled" : ""}>
            ${outOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>`;
  }

  /* =========================================================
     Product details page
     ========================================================= */

  // Kunin ang product gamit ang URL, tapos i-set up ang quantity, Add to Cart, at Buy Now controls.
  function initProductPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const product = id ? STORE.getProductById(id) : null;
    const wrap = document.getElementById("productDetailWrap");
    const crumb = document.getElementById("breadcrumbName");

    if (!product) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="icon"><i data-lucide="circle-x"></i></div>
          <p>Product not found. It may have been removed by the seller.</p>
          <br />
          <a href="index.html" class="btn btn-primary">Back to Home</a>
        </div>`;
      return;
    }

    if (crumb) crumb.textContent = product.name;

    const outOfStock = product.stock <= 0;

    wrap.innerHTML = `
      <div class="product-detail">
        <div>
          <img src="${STORE.escapeHtml(product.image)}" alt="${STORE.escapeHtml(product.name)}"
               onerror="this.src='https://via.placeholder.com/500x500?text=No+Image'" />
        </div>
        <div>
          <h1 class="detail-name">${STORE.escapeHtml(product.name)}</h1>
          <div class="detail-price-box">
            <div class="detail-price">${STORE.formatPrice(product.price)}</div>
          </div>
          <div class="detail-row"><span class="label">Category</span><span>${STORE.escapeHtml(product.category || "Uncategorized")}</span></div>
          <div class="detail-row"><span class="label">Stock</span><span>${outOfStock ? '<span class="stock-out">Out of stock</span>' : product.stock + " available"}</span></div>
          <div class="detail-row"><span class="label">Description</span><span>${STORE.escapeHtml(product.description || "No description provided.")}</span></div>

          ${
            outOfStock
              ? `<p style="color:#e03131; font-weight:600; margin-top:16px;">This product is currently out of stock.</p>`
              : `
          <div class="qty-selector" id="qtySelector">
            <button type="button" id="qtyMinus">&minus;</button>
            <input type="number" id="qtyInput" value="1" min="1" max="${product.stock}" />
            <button type="button" id="qtyPlus">+</button>
          </div>
          <div class="detail-actions">
            <button class="btn btn-primary" id="addToCartBtn">Add to Cart</button>
            <button class="btn btn-outline" id="buyNowBtn">Buy Now</button>
          </div>`
          }
        </div>
      </div>`;

    if (outOfStock) return;

    const qtyInput = document.getElementById("qtyInput");
    document.getElementById("qtyMinus").addEventListener("click", () => {
      qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    });
    document.getElementById("qtyPlus").addEventListener("click", () => {
      qtyInput.value = Math.min(product.stock, (parseInt(qtyInput.value, 10) || 1) + 1);
    });
    qtyInput.addEventListener("change", () => {
      let v = parseInt(qtyInput.value, 10) || 1;
      v = Math.max(1, Math.min(product.stock, v));
      qtyInput.value = v;
    });

    document.getElementById("addToCartBtn").addEventListener("click", () => {
      const qty = parseInt(qtyInput.value, 10) || 1;
      addToCart(product.id, qty);
    });

    document.getElementById("buyNowBtn").addEventListener("click", () => {
      const qty = parseInt(qtyInput.value, 10) || 1;
      addToCart(product.id, qty);
      window.location.href = "checkout.html";
    });
  }

  /* =========================================================
     Cart functions (shared sa product, cart, at checkout pages)
     ========================================================= */

  // Idagdag sa cart ang quantity na pinili, pero huwag sosobra sa available stock.
  function addToCart(productId, qty) {
    const product = STORE.getProductById(productId);
    if (!product) {
      STORE.showToast("Product not found.", "error");
      return;
    }
    if (product.stock <= 0) {
      STORE.showToast("This product is out of stock.", "error");
      return;
    }

    const cart = STORE.getCart();
    const existing = cart.find((item) => item.productId === productId);
    const currentQtyInCart = existing ? existing.qty : 0;
    const desiredQty = currentQtyInCart + qty;

    if (desiredQty > product.stock) {
      const addable = product.stock - currentQtyInCart;
      if (addable <= 0) {
        STORE.showToast(`You already have the max available stock (${product.stock}) in your cart.`, "error");
        return;
      }
      STORE.showToast(`Only ${product.stock} in stock. Added ${addable} more to your cart.`, "error");
      if (existing) existing.qty += addable;
      else cart.push({ productId, qty: addable });
    } else {
      if (existing) existing.qty = desiredQty;
      else cart.push({ productId, qty: desiredQty });
      STORE.showToast("Added to cart.", "success");
    }

    STORE.saveCart(cart);
    renderCartBadge();
    refreshIcons();
  }

  /* =========================================================
     Cart page
     ========================================================= */

  // I-render ang cart gamit ang latest product info at quantities.
  function initCartPage() {
    renderCartPage();
  }

  /* I-check ang laman ng cart gamit ang latest product info
     (baka nagbago na ang price o stock simula nang idagdag ang item).
     Awtomatikong alisin ang products na hindi na makita. */
  function getHydratedCart() {
    const cart = STORE.getCart();
    const products = STORE.getProducts();
    const hydrated = [];
    let changed = false;

    cart.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        changed = true; // Tinanggal ng seller ang product, kaya alisin din sa cart.
        return;
      }
      let qty = item.qty;
      if (qty > product.stock) {
        qty = product.stock;
        changed = true;
      }
      if (qty <= 0) {
        changed = true;
        return;
      }
      hydrated.push({ product, qty });
    });

    if (changed) {
      STORE.saveCart(hydrated.map((h) => ({ productId: h.product.id, qty: h.qty })));
    }

    return hydrated;
  }

  // I-display ang cart items, total, at controls base sa na-check na cart.
  function renderCartPage() {
    const content = document.getElementById("cartContent");
    const emptyState = document.getElementById("cartEmptyState");
    if (!content) return;

    const hydrated = getHydratedCart();

    if (hydrated.length === 0) {
      content.style.display = "none";
      if (emptyState) emptyState.style.display = "block";
      renderCartBadge();
      return;
    }
    content.style.display = "block";
    if (emptyState) emptyState.style.display = "none";

    const tbody = document.getElementById("cartTbody");
    let total = 0;
    let itemCount = 0;

    tbody.innerHTML = hydrated
      .map(({ product, qty }) => {
        const subtotal = product.price * qty;
        total += subtotal;
        itemCount += qty;
        return `
        <tr data-row-id="${STORE.escapeHtml(product.id)}">
          <td>
            <div class="cart-product">
              <img src="${STORE.escapeHtml(product.image)}" alt="${STORE.escapeHtml(product.name)}"
                   onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'" />
              <div>
                <a href="product.html?id=${encodeURIComponent(product.id)}" style="font-weight:500;">${STORE.escapeHtml(product.name)}</a>
                <div style="margin-top:4px;"><a href="#" class="remove-link" data-remove="${STORE.escapeHtml(product.id)}">Remove</a></div>
              </div>
            </div>
          </td>
          <td>${STORE.formatPrice(product.price)}</td>
          <td>
            <div class="cart-qty">
              <button type="button" class="qty-minus" data-id="${STORE.escapeHtml(product.id)}">&minus;</button>
              <input type="number" class="qty-input" data-id="${STORE.escapeHtml(product.id)}" value="${qty}" min="1" max="${product.stock}" />
              <button type="button" class="qty-plus" data-id="${STORE.escapeHtml(product.id)}">+</button>
            </div>
            <div style="font-size:11px; color:#757575; margin-top:4px;">${product.stock} available</div>
          </td>
          <td><strong>${STORE.formatPrice(subtotal)}</strong></td>
          <td><a href="#" class="remove-link" data-remove="${STORE.escapeHtml(product.id)}" aria-label="Remove item"><i data-lucide="x"></i></a></td>
        </tr>`;
      })
      .join("");

    document.getElementById("cartItemCount").textContent = itemCount;
    document.getElementById("cartTotal").textContent = STORE.formatPrice(total);

    tbody.querySelectorAll(".qty-minus").forEach((btn) =>
      btn.addEventListener("click", () => changeCartQty(btn.dataset.id, -1))
    );
    tbody.querySelectorAll(".qty-plus").forEach((btn) =>
      btn.addEventListener("click", () => changeCartQty(btn.dataset.id, 1))
    );
    tbody.querySelectorAll(".qty-input").forEach((input) =>
      input.addEventListener("change", () => setCartQty(input.dataset.id, parseInt(input.value, 10)))
    );
    tbody.querySelectorAll("[data-remove]").forEach((link) =>
      link.addEventListener("click", (e) => {
        e.preventDefault();
        removeFromCart(link.dataset.remove);
      })
    );

    renderCartBadge();
    refreshIcons();
  }

  // Dagdagan o bawasan ang quantity, tapos ipa-check ang stock at i-refresh ang display.
  function changeCartQty(productId, delta) {
    const cart = STORE.getCart();
    const item = cart.find((i) => i.productId === productId);
    if (!item) return;
    setCartQty(productId, item.qty + delta);
  }

  // I-set ang item quantity ayon sa available stock; alisin ang item kung invalid ang quantity.
  function setCartQty(productId, newQty) {
    const product = STORE.getProductById(productId);
    const cart = STORE.getCart();
    const item = cart.find((i) => i.productId === productId);
    if (!item || !product) return;

    if (!Number.isFinite(newQty) || newQty < 1) {
      removeFromCart(productId);
      return;
    }
    if (newQty > product.stock) {
      STORE.showToast(`Only ${product.stock} in stock for this product.`, "error");
      newQty = product.stock;
    }
    item.qty = newQty;
    STORE.saveCart(cart);
    renderCartPage();
  }

  // Alisin ang product sa saved cart, tapos i-refresh ang cart page.
  function removeFromCart(productId) {
    const cart = STORE.getCart().filter((i) => i.productId !== productId);
    STORE.saveCart(cart);
    renderCartPage();
    STORE.showToast("Item removed from cart.", "success");
  }

  /* =========================================================
     Checkout page
     ========================================================= */

  // I-set up ang checkout fields, live totals, voucher controls, at form submission.
  function initCheckoutPage() {
    const hydrated = getHydratedCart();
    const content = document.getElementById("checkoutContent");
    const emptyState = document.getElementById("checkoutEmptyState");

    if (hydrated.length === 0) {
      content.style.display = "none";
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    content.style.display = "grid";
    if (emptyState) emptyState.style.display = "none";

    const voucherForm = document.getElementById("voucherForm");
    const voucherInput = document.getElementById("voucherCode");
    const removeVoucherBtn = document.getElementById("removeVoucherBtn");
    const paymentPlanSelect = document.getElementById("paymentPlan");
    const paymentMethodSelect = document.getElementById("paymentMethod");
    const deliveryCourierSelect = document.getElementById("deliveryCourier");
    const deliveryZoneSelect = document.getElementById("deliveryZone");
    // I-prefill ang contact at demo payment details gamit ang buyer profile.
    function fillCheckoutFromProfile() {
      const currentProfile = STORE.getCurrentProfile();
      if (!currentProfile) return;
      document.getElementById("buyerName").value = currentProfile.name || "";
      document.getElementById("buyerContact").value = currentProfile.contact || "";
      document.getElementById("buyerAddress").value = currentProfile.address || "";
      document.getElementById("cardholderName").value = currentProfile.cardholderName || "";
      document.getElementById("cardLastFour").value = currentProfile.cardLastFour || "";
      document.getElementById("ewalletProvider").value = currentProfile.ewalletProvider || "";
      document.getElementById("ewalletLastFour").value = currentProfile.ewalletLastFour || "";
    }
    fillCheckoutFromProfile();
    STORE.onExternalChange([STORE.KEYS.PROFILES], fillCheckoutFromProfile);
    STORE.onExternalChange([STORE.KEYS.VOUCHERS], () => {
      if (appliedVoucherCode && !STORE.getVouchers().some((voucher) =>
        voucher.code === appliedVoucherCode && voucher.active
      )) {
        appliedVoucherCode = null;
        voucherInput.value = "";
        removeVoucherBtn.style.display = "none";
        setVoucherFeedback("The applied voucher is no longer available.", "error");
      }
      renderCheckoutOrderReview(getHydratedCart());
    });

    renderCheckoutOrderReview(hydrated);
    renderDeliveryEstimate();
    updatePaymentMethodOptions();
    updatePaymentLinkPanel();
    deliveryCourierSelect.addEventListener("change", renderDeliveryEstimate);
    deliveryZoneSelect.addEventListener("change", () => {
      renderDeliveryEstimate();
      renderCheckoutOrderReview(getHydratedCart());
    });
    paymentPlanSelect.addEventListener("change", () => {
      updatePaymentMethodOptions();
      updatePaymentLinkPanel();
      renderCheckoutOrderReview(getHydratedCart());
    });
    paymentMethodSelect.addEventListener("change", () => {
      updatePaymentLinkPanel();
      renderCheckoutOrderReview(getHydratedCart());
    });

    voucherForm.addEventListener("submit", (e) => {
      e.preventDefault();
      applyVoucher();
    });
    voucherInput.addEventListener("input", () => {
      if (voucherInput.value.trim().toUpperCase() === appliedVoucherCode) return;
      appliedVoucherCode = null;
      removeVoucherBtn.style.display = "none";
      setVoucherFeedback("", "");
      renderCheckoutOrderReview(getHydratedCart());
    });
    removeVoucherBtn.addEventListener("click", () => {
      appliedVoucherCode = null;
      voucherInput.value = "";
      removeVoucherBtn.style.display = "none";
      setVoucherFeedback("Voucher removed.", "success");
      renderCheckoutOrderReview(getHydratedCart());
    });

    const form = document.getElementById("checkoutForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handlePlaceOrder();
    });
  }

  // I-disable ang COD kapag PayLater ang pinili dahil kailangan nito ng linked account.
  function updatePaymentMethodOptions() {
    const paymentPlan = document.getElementById("paymentPlan").value;
    const paymentMethod = document.getElementById("paymentMethod");
    const codOption = paymentMethod.querySelector('option[value="cod"]');
    const hint = document.getElementById("paymentMethodHint");
    const isPayLater = paymentPlan !== "pay-now";
    codOption.disabled = isPayLater;
    if (isPayLater && paymentMethod.value === "cod") {
      paymentMethod.value = "";
    }
    hint.textContent = isPayLater
      ? "PayLater requires a card or e-wallet. COD is unavailable."
      : "Choose COD, card, or e-wallet.";
  }

  // Ipakita ang delivery fee ng napiling lugar at estimate ng courier.
  function renderDeliveryEstimate() {
    const courier = DELIVERY_COURIERS[document.getElementById("deliveryCourier").value];
    const zone = document.getElementById("deliveryZone").value;
    const deliveryFee = getDeliveryFee(zone);
    const estimate = document.getElementById("deliveryEstimate");
    if (!courier || !estimate) return;
    estimate.innerHTML = `
      <strong>Ships from ${STORE.escapeHtml(SELLER_NAME)}</strong>
      <span>${SELLER_ORIGIN}</span>
      <span>Destination: ${STORE.escapeHtml(DELIVERY_ZONES[zone] || "Unknown area")} · Delivery fee: ${STORE.formatPrice(deliveryFee)}</span>
      <span>${courier.name} estimate: ${courier.metro} within Metro Manila; ${courier.provincial} elsewhere.</span>
      <small>Estimated from checkout; allow 1–2 business days for handling. Actual delivery may vary by destination, weather, and courier operations.</small>`;
  }

  // Ipakita ang payment fields para sa napiling method at gawing required ang kailangan.
  function updatePaymentLinkPanel() {
    const method = document.getElementById("paymentMethod").value;
    const cardPanel = document.getElementById("cardLinkPanel");
    const walletPanel = document.getElementById("ewalletLinkPanel");
    const cardholder = document.getElementById("cardholderName");
    const cardLastFour = document.getElementById("cardLastFour");
    const walletProvider = document.getElementById("ewalletProvider");
    const walletLastFour = document.getElementById("ewalletLastFour");
    const showCard = method === "card";
    const showWallet = method === "ewallet";

    cardPanel.style.display = showCard ? "block" : "none";
    walletPanel.style.display = showWallet ? "block" : "none";
    cardholder.required = showCard;
    cardLastFour.required = showCard;
    walletProvider.required = showWallet;
    walletLastFour.required = showWallet;
  }

  // I-check ang demo card o e-wallet details, tapos ibalik ang label na ise-save sa order.
  function getLinkedPaymentDetails(method) {
    if (method === "card") {
      const cardholder = document.getElementById("cardholderName").value.trim();
      const lastFour = document.getElementById("cardLastFour").value.trim();
      if (cardholder.length < 2 || !/^\d{4}$/.test(lastFour)) {
        STORE.showToast("Enter a demo cardholder name and exactly four card digits.", "error");
        return null;
      }
      return { accountLabel: `Card ending in ${lastFour}` };
    }

    if (method === "ewallet") {
      const provider = document.getElementById("ewalletProvider").value;
      const lastFour = document.getElementById("ewalletLastFour").value.trim();
      if (!["GCash", "Maya", "Other e-wallet"].includes(provider) || !/^\d{4}$/.test(lastFour)) {
        STORE.showToast("Choose a demo e-wallet provider and enter exactly four account digits.", "error");
        return null;
      }
      return { accountLabel: `${provider} ending in ${lastFour}` };
    }

    return { accountLabel: "Cash on Delivery" };
  }

  // I-check kung valid ang voucher para sa current cart at i-update ang feedback.
  function applyVoucher() {
    const code = document.getElementById("voucherCode").value.trim().toUpperCase();
    const hydrated = getHydratedCart();
    const subtotal = hydrated.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
    const deliveryFee = getDeliveryFee(document.getElementById("deliveryZone").value);
    const savings = calculateVoucherDiscount(code, subtotal, deliveryFee);

    if (savings === null) {
      appliedVoucherCode = null;
      document.getElementById("removeVoucherBtn").style.display = "none";
      const voucher = STORE.getVouchers().find((item) => item.code === code);
      const reason = voucher
        ? getVoucherEligibilityError(voucher, subtotal)
        : "That voucher code is not valid.";
      setVoucherFeedback(reason, "error");
      renderCheckoutOrderReview(hydrated);
      return;
    }

    appliedVoucherCode = code;
    document.getElementById("voucherCode").value = code;
    document.getElementById("removeVoucherBtn").style.display = "inline-block";
    const totalSavings = savings.discount + savings.shippingDiscount;
    setVoucherFeedback(`${code} applied. You save ${STORE.formatPrice(totalSavings)}.`, "success");
    renderCheckoutOrderReview(hydrated);
  }

  // Ipakita ang voucher message kasama ang tamang style.
  function setVoucherFeedback(message, type) {
    const feedback = document.getElementById("voucherFeedback");
    feedback.textContent = message;
    feedback.className = `voucher-feedback${type ? ` ${type}` : ""}`;
  }

  // I-load ang buyer profile sa account form at i-set up ang form actions.
  function initAccountPage() {
    const profile = STORE.getCurrentProfile();
    const form = document.getElementById("profileForm");
    const unavailable = document.getElementById("profileUnavailable");
    if (!profile) {
      form.style.display = "none";
      unavailable.style.display = "block";
      unavailable.innerHTML = `The built-in demo buyer profile cannot be edited. <a href="login.html?mode=register">Create your own buyer profile</a> to manage saved details.`;
      return;
    }

    document.getElementById("profileName").value = profile.name || "";
    document.getElementById("profileUsername").value = profile.username || "";
    document.getElementById("profileContact").value = profile.contact || "";
    document.getElementById("profileAddress").value = profile.address || "";
    document.getElementById("profileCardholder").value = profile.cardholderName || "";
    document.getElementById("profileCardLastFour").value = profile.cardLastFour || "";
    document.getElementById("profileWalletProvider").value = profile.ewalletProvider || "";
    document.getElementById("profileWalletLastFour").value = profile.ewalletLastFour || "";

    document.getElementById("clearCardBtn").addEventListener("click", () => {
      document.getElementById("profileCardholder").value = "";
      document.getElementById("profileCardLastFour").value = "";
    });
    document.getElementById("clearWalletBtn").addEventListener("click", () => {
      document.getElementById("profileWalletProvider").value = "";
      document.getElementById("profileWalletLastFour").value = "";
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveAccountProfile();
    });
  }

  // I-validate at i-save ang buyer contact at demo payment details.
  function saveAccountProfile() {
    const name = document.getElementById("profileName").value.trim();
    const contact = document.getElementById("profileContact").value.trim();
    const address = document.getElementById("profileAddress").value.trim();
    const cardholderName = document.getElementById("profileCardholder").value.trim();
    const cardLastFour = document.getElementById("profileCardLastFour").value.trim();
    const ewalletProvider = document.getElementById("profileWalletProvider").value;
    const ewalletLastFour = document.getElementById("profileWalletLastFour").value.trim();
    const feedback = document.getElementById("profileFeedback");

    if (name.length < 2) {
      feedback.textContent = "Enter a name with at least two characters.";
      feedback.className = "profile-feedback error";
      return;
    }
    if ((cardholderName || cardLastFour) && (cardholderName.length < 2 || !/^\d{4}$/.test(cardLastFour))) {
      feedback.textContent = "For a linked demo card, enter a cardholder name and exactly four digits.";
      feedback.className = "profile-feedback error";
      return;
    }
    if ((ewalletProvider || ewalletLastFour) &&
      (!["GCash", "Maya", "Other e-wallet"].includes(ewalletProvider) || !/^\d{4}$/.test(ewalletLastFour))) {
      feedback.textContent = "For a linked demo e-wallet, choose a provider and enter exactly four digits.";
      feedback.className = "profile-feedback error";
      return;
    }

    const saved = STORE.updateCurrentProfile({
      name,
      contact,
      address,
      cardholderName,
      cardLastFour,
      ewalletProvider,
      ewalletLastFour,
      updatedAt: new Date().toISOString(),
    });
    if (!saved) {
      feedback.textContent = "Unable to save the profile. Please sign in again.";
      feedback.className = "profile-feedback error";
      return;
    }

    feedback.textContent = "Profile saved. Your name, address, and demo payment details are ready for checkout.";
    feedback.className = "profile-feedback success";
    STORE.showToast("Profile saved.", "success");
  }

  // Kunin ang valid delivery fee para sa zone; zero kung walang valid na fee.
  function getDeliveryFee(zone) {
    const fees = STORE.getDeliveryFees();
    const fee = Number(fees[zone]);
    return Number.isFinite(fee) && fee >= 0 ? fee : 0;
  }

  // Kunin ang buyer ID na gagamitin para ma-check ang voucher usage limit.
  function getCheckoutBuyerId() {
    const session = STORE.getSession();
    return session.profileId || session.username || document.getElementById("buyerName").value.trim();
  }

  // Ibalik ang dahilan kung bakit hindi puwede ang voucher, o empty string kung eligible ito.
  function getVoucherEligibilityError(voucher, subtotal) {
    if (!voucher.active) return "This voucher is inactive.";
    if (subtotal < Number(voucher.minSubtotal || 0)) {
      return `This voucher requires an item subtotal of at least ${STORE.formatPrice(voucher.minSubtotal)}.`;
    }
    if (voucher.maxSubtotal != null && subtotal > Number(voucher.maxSubtotal)) {
      return `This voucher is only valid for item subtotals up to ${STORE.formatPrice(voucher.maxSubtotal)}.`;
    }

    const limit = Number(voucher.maxUsesPerWeek);
    if (Number.isInteger(limit) && limit > 0) {
      const buyerId = getCheckoutBuyerId();
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const uses = STORE.getOrders().filter((order) => {
        if (order.status === "Cancelled" || order.voucherCode !== voucher.code) return false;
        const orderTime = new Date(order.createdAt).getTime();
        if (!Number.isFinite(orderTime) || orderTime < weekAgo || orderTime > Date.now()) return false;
        const orderBuyerId = order.buyerProfileId || order.buyerUsername || order.buyerName;
        return orderBuyerId === buyerId;
      }).length;
      if (uses >= limit) {
        return `You have reached this voucher's limit of ${limit} use${limit === 1 ? "" : "s"} in 7 days.`;
      }
    }
    return "";
  }

  // I-compute ang discount sa items o shipping; null ang ibalik kung invalid ang voucher.
  function calculateVoucherDiscount(code, subtotal, deliveryFee) {
    const voucher = STORE.getVouchers().find((item) => item.code === code && item.active);
    if (!voucher || getVoucherEligibilityError(voucher, subtotal)) return null;
    if (voucher.type === "free_shipping") {
      return { discount: 0, shippingDiscount: deliveryFee };
    }
    if (voucher.type !== "fixed" && voucher.type !== "percent") return null;
    const rawDiscount = voucher.type === "percent"
      ? subtotal * Number(voucher.value) / 100
      : Number(voucher.value);
    if (!Number.isFinite(rawDiscount) || rawDiscount <= 0) return null;
    return {
      discount: Math.round(Math.min(subtotal, rawDiscount) * 100) / 100,
      shippingDiscount: 0,
    };
  }

  // I-recompute at i-display ang items, discounts, delivery, at payment totals sa checkout.
  function renderCheckoutOrderReview(hydrated) {
    const itemsWrap = document.getElementById("orderReviewItems");
    if (!itemsWrap) return;
    const totalEl = document.getElementById("orderReviewTotal");
    const subtotal = hydrated.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
    const deliveryZone = document.getElementById("deliveryZone").value;
    const deliveryFee = getDeliveryFee(deliveryZone);
    const savings = appliedVoucherCode
      ? calculateVoucherDiscount(appliedVoucherCode, subtotal, deliveryFee) || { discount: 0, shippingDiscount: 0 }
      : { discount: 0, shippingDiscount: 0 };
    const discount = savings.discount;
    const shippingDiscount = savings.shippingDiscount;
    const orderTotal = Math.round((subtotal - discount + deliveryFee - shippingDiscount) * 100) / 100;
    const payment = calculatePaymentPlan(orderTotal, document.getElementById("paymentPlan").value);

    itemsWrap.innerHTML = hydrated
      .map(({ product, qty }) => {
        const subtotal = product.price * qty;
        return `
        <div class="order-review-item">
          <span>${STORE.escapeHtml(product.name)} &times; ${qty}</span>
          <span>${STORE.formatPrice(subtotal)}</span>
        </div>`;
      })
      .join("");

    document.getElementById("orderReviewSubtotal").textContent = STORE.formatPrice(subtotal);
    const discountRow = document.getElementById("orderReviewDiscountRow");
    discountRow.style.display = discount > 0 ? "flex" : "none";
    document.getElementById("orderReviewDiscountLabel").textContent =
      appliedVoucherCode ? `Voucher (${appliedVoucherCode})` : "Voucher discount";
    document.getElementById("orderReviewDiscount").textContent = `-${STORE.formatPrice(discount)}`;
    const deliveryLabel = document.getElementById("orderReviewDeliveryLabel");
    deliveryLabel.textContent = shippingDiscount > 0 ? "Delivery fee (free shipping voucher)" : "Delivery fee";
    document.getElementById("orderReviewDeliveryFee").textContent = shippingDiscount > 0
      ? `${STORE.formatPrice(deliveryFee)} - ${STORE.formatPrice(shippingDiscount)}`
      : STORE.formatPrice(deliveryFee);
    const interestRow = document.getElementById("orderReviewInterestRow");
    const installmentPreview = document.getElementById("paylaterInstallmentPreview");
    interestRow.style.display = payment.method === "paylater" && payment.interest > 0 ? "flex" : "none";
    document.getElementById("orderReviewInterest").textContent = STORE.formatPrice(payment.interest);
    installmentPreview.style.display = payment.method === "paylater" ? "flex" : "none";
    if (payment.method === "paylater") {
      document.getElementById("paylaterPlanLabel").textContent =
        `${payment.months} monthly payments${payment.monthlyRate ? ` (${payment.monthlyRate * 100}% monthly)` : " (0% interest)"}`;
      document.getElementById("paylaterMonthlyAmount").textContent =
        `About ${STORE.formatPrice(payment.monthlyInstallment)} / month`;
    }
    document.getElementById("orderReviewTotalLabel").textContent =
      payment.method === "paylater" ? "PayLater total" : "Total";
    totalEl.textContent = STORE.formatPrice(payment.totalPayable);
  }

  // I-compute ang total at monthly installment base sa piniling payment plan.
  function calculatePaymentPlan(amount, selectedPlan) {
    if (selectedPlan === "pay-now") {
      return { method: "paynow", totalPayable: amount, interest: 0, installments: [] };
    }

    const plan = PAY_LATER_PLANS[selectedPlan];
    if (!plan) return null;

    const interest = Math.round(amount * plan.monthlyRate * plan.months * 100) / 100;
    const totalPayable = Math.round((amount + interest) * 100) / 100;
    const monthlyInstallment = Math.round(totalPayable / plan.months * 100) / 100;
    return {
      method: "paylater",
      months: plan.months,
      monthlyRate: plan.monthlyRate,
      interest,
      totalPayable,
      monthlyInstallment,
    };
  }

  // Hatiin ang PayLater total sa monthly payments; i-adjust ang huli para sakto ang cents.
  function createInstallmentSchedule(totalPayable, months, orderDate) {
    const totalCents = Math.round(totalPayable * 100);
    const regularCents = Math.round(totalCents / months);
    let scheduledCents = 0;

    return Array.from({ length: months }, (_, index) => {
      const amountCents = index === months - 1 ? totalCents - scheduledCents : regularCents;
      scheduledCents += amountCents;
      const dueDate = new Date(orderDate);
      const dayOfMonth = dueDate.getDate();
      dueDate.setDate(1);
      dueDate.setMonth(dueDate.getMonth() + index + 1);
      const lastDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
      dueDate.setDate(Math.min(dayOfMonth, lastDay));

      return {
        dueAt: dueDate.toISOString(),
        amount: amountCents / 100,
        status: "unpaid",
        lateFee: 0,
        lateFeeApplied: false,
        paidAt: null,
      };
    });
  }

  // I-toggle ang invalid style ng field group at ibalik kung pasado ang validation.
  function validateField(inputEl, groupEl, isValid) {
    if (isValid) {
      groupEl.classList.remove("invalid");
    } else {
      groupEl.classList.add("invalid");
    }
    return isValid;
  }

  // I-validate ang checkout, i-check ulit ang stock at prices, i-save ang order, tapos buksan ang confirmation.
  function handlePlaceOrder() {
    const nameInput = document.getElementById("buyerName");
    const contactInput = document.getElementById("buyerContact");
    const addressInput = document.getElementById("buyerAddress");

    const name = nameInput.value.trim();
    const contact = contactInput.value.trim();
    const address = addressInput.value.trim();

    const digitsOnly = contact.replace(/\D/g, "");

    const nameOk = validateField(nameInput, document.getElementById("groupName"), name.length >= 2);
    const contactOk = validateField(
      contactInput,
      document.getElementById("groupContact"),
      digitsOnly.length >= 7 && digitsOnly.length <= 15
    );
    const addressOk = validateField(addressInput, document.getElementById("groupAddress"), address.length >= 10);

    if (!nameOk || !contactOk || !addressOk) {
      STORE.showToast("Please fix the highlighted fields.", "error");
      return;
    }

    // I-check ulit ang cart gamit ang latest product info
    // bago i-save ang order; huwag basta magtiwala sa nakikita sa screen.
    const hydrated = getHydratedCart();
    if (hydrated.length === 0) {
      STORE.showToast("Your cart is empty.", "error");
      return;
    }

    const products = STORE.getProducts();
    for (const { product, qty } of hydrated) {
      const liveProduct = products.find((p) => p.id === product.id);
      if (!liveProduct) {
        STORE.showToast(`"${product.name}" is no longer available.`, "error");
        return;
      }
      if (qty > liveProduct.stock) {
        STORE.showToast(`Only ${liveProduct.stock} left for "${liveProduct.name}". Please update your cart.`, "error");
        return;
      }
    }

    // I-recompute ang items at total base sa latest product info;
    // huwag gamitin ang displayed numbers bilang source ng order data.
    const items = hydrated.map(({ product, qty }) => {
      const liveProduct = products.find((p) => p.id === product.id);
      return {
        productId: liveProduct.id,
        name: liveProduct.name,
        price: liveProduct.price,
        qty,
        subtotal: Math.round(liveProduct.price * qty * 100) / 100,
      };
    });
    const subtotal = Math.round(items.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100;
    const courier = DELIVERY_COURIERS[document.getElementById("deliveryCourier").value];
    if (!courier) {
      STORE.showToast("Choose a valid delivery courier.", "error");
      return;
    }
    const deliveryZone = document.getElementById("deliveryZone").value;
    if (!Object.prototype.hasOwnProperty.call(DELIVERY_ZONES, deliveryZone)) {
      STORE.showToast("Choose a valid delivery area.", "error");
      return;
    }
    const deliveryFee = getDeliveryFee(deliveryZone);
    const voucherCode = appliedVoucherCode;
    const voucherSavings = voucherCode
      ? calculateVoucherDiscount(voucherCode, subtotal, deliveryFee)
      : { discount: 0, shippingDiscount: 0 };
    if (voucherCode && voucherSavings === null) {
      appliedVoucherCode = null;
      document.getElementById("removeVoucherBtn").style.display = "none";
      const voucher = STORE.getVouchers().find((item) => item.code === voucherCode);
      const reason = voucher
        ? getVoucherEligibilityError(voucher, subtotal)
        : "This voucher is no longer available.";
      setVoucherFeedback(reason || "This voucher is no longer eligible for the current order.", "error");
      renderCheckoutOrderReview(hydrated);
      STORE.showToast(reason || "The applied voucher is no longer eligible for this order.", "error");
      return;
    }
    const discount = voucherSavings.discount;
    const shippingDiscount = voucherSavings.shippingDiscount;
    const total = Math.round((subtotal - discount + deliveryFee - shippingDiscount) * 100) / 100;
    const selectedPlan = document.getElementById("paymentPlan").value;
    const paymentMethod = document.getElementById("paymentMethod").value;
    if (!["cod", "card", "ewallet"].includes(paymentMethod)) {
      STORE.showToast("Choose a payment method.", "error");
      return;
    }
    if (selectedPlan !== "pay-now" && paymentMethod === "cod") {
      STORE.showToast("PayLater is only available with card or e-wallet.", "error");
      return;
    }
    const linkedPaymentDetails = getLinkedPaymentDetails(paymentMethod);
    if (!linkedPaymentDetails) return;
    const payment = calculatePaymentPlan(total, selectedPlan);
    if (!payment) {
      STORE.showToast("Choose a valid payment plan.", "error");
      return;
    }

    const paymentMethodLabel = getPaymentMethodLabel(paymentMethod);
    const paymentDescription = payment.method === "paylater"
      ? `PayLater (${payment.months} months) via ${paymentMethodLabel}: ${STORE.formatPrice(payment.totalPayable)} total, about ${STORE.formatPrice(payment.monthlyInstallment)} per month`
      : `Pay now via ${paymentMethodLabel}: ${STORE.formatPrice(payment.totalPayable)}`;
    if (!window.confirm(`Place this order?\n\n${paymentDescription}`)) return;
    const createdAt = new Date().toISOString();
    const savedPayment = {
      ...payment,
      paymentMethod,
      accountLabel: linkedPaymentDetails.accountLabel,
      ...(payment.method === "paylater"
        ? { installments: createInstallmentSchedule(payment.totalPayable, payment.months, createdAt) }
        : {}),
    };

    // Bawasan ang stock ayon sa dami ng inorder.
    const updatedProducts = products.map((p) => {
      const line = items.find((i) => i.productId === p.id);
      if (!line) return p;
      return { ...p, stock: Math.max(0, p.stock - line.qty) };
    });
    STORE.saveProducts(updatedProducts);

    const orderNumber = STORE.generateOrderNumber();
    const order = {
      orderNumber,
      buyerName: name,
      buyerContact: contact,
      buyerAddress: address,
      buyerProfileId: STORE.getSession().profileId || null,
      buyerUsername: STORE.getSession().username || null,
      items,
      subtotal,
      voucherCode,
      discount,
      shippingDiscount,
      total,
      payment: savedPayment,
      delivery: {
        courier: courier.name,
        origin: SELLER_ORIGIN,
        zone: DELIVERY_ZONES[deliveryZone],
        fee: deliveryFee,
        feeAfterVoucher: deliveryFee - shippingDiscount,
        estimate: `${courier.metro} within Metro Manila; ${courier.provincial} elsewhere`,
        handling: "Allow 1–2 business days for handling",
      },
      status: "Pending",
      createdAt,
      updatedAt: createdAt,
    };

    const orders = STORE.getOrders();
    orders.push(order);
    STORE.saveOrders(orders);

    rememberMyOrder(orderNumber);
    STORE.clearCart();

    window.location.href = `confirmation.html?order=${encodeURIComponent(orderNumber)}`;
  }

  /* =========================================================
     Confirmation page
     ========================================================= */

  // Ipakita ang order summary gamit ang order number mula sa confirmation URL.
  function initConfirmationPage() {
    const params = new URLSearchParams(window.location.search);
    const orderNumber = params.get("order");
    const box = document.getElementById("confirmBox");
    const order = orderNumber ? STORE.getOrderByNumber(orderNumber) : null;

    if (!order) {
      box.innerHTML = `
        <div class="check" style="color:#e03131;"><i data-lucide="circle-x"></i></div>
        <h1>Order Not Found</h1>
        <p style="color:#757575; margin-top:8px;">We couldn't find that order. It may have been removed.</p>
        <br />
        <a href="index.html" class="btn btn-primary">Back to Home</a>`;
      return;
    }

    box.innerHTML = `
      <div class="check"><i data-lucide="circle-check"></i></div>
      <h1>Order Placed Successfully!</h1>
      <div class="confirm-order-no">${STORE.escapeHtml(order.orderNumber)}</div>
      <div class="order-review">
        <div class="order-review-item"><span><strong>Buyer</strong></span><span>${STORE.escapeHtml(order.buyerName)}</span></div>
        <div class="order-review-item"><span><strong>Contact</strong></span><span>${STORE.escapeHtml(order.buyerContact)}</span></div>
        <div class="order-review-item"><span><strong>Address</strong></span><span>${STORE.escapeHtml(order.buyerAddress)}</span></div>
        <div class="order-review-item"><span><strong>Status</strong></span><span><span class="badge ${statusBadgeClass(order.status)}">${STORE.escapeHtml(order.status)}</span></span></div>
        <hr style="margin:12px 0; border:none; border-top:1px solid #e8e8e8;" />
        ${order.items
          .map(
            (i) => `
          <div class="order-review-item">
            <span>${STORE.escapeHtml(i.name)} &times; ${i.qty}</span>
            <span>${STORE.formatPrice(i.subtotal)}</span>
          </div>`
          )
          .join("")}
        ${savedOrderPriceRows(order)}
        ${renderPayLaterSchedule(order, false)}
        <div class="order-review-total">
          <span>${orderPayableLabel(order)}</span>
          <span class="value">${STORE.formatPrice(orderPayableTotal(order))}</span>
        </div>
      </div>
      <div style="display:flex; gap:12px; justify-content:center; margin-top:20px;">
        <a href="index.html" class="btn btn-outline">Continue Shopping</a>
        <a href="orders.html" class="btn btn-primary">View My Orders</a>
      </div>`;
  }

  /* =========================================================
     Order history ng buyer ("My Orders")
     ========================================================= */

  // I-save sa browser ang order number para makita ng buyer ang order history niya.
  function rememberMyOrder(orderNumber) {
    const mine = JSON.parse(localStorage.getItem(MY_ORDERS_KEY) || "[]");
    mine.push(orderNumber);
    localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(mine));
  }

  // Kunin ang saved order numbers; empty list ang ibalik kung sira o invalid ang data.
  function getMyOrderNumbers() {
    try {
      const raw = localStorage.getItem(MY_ORDERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  // Ipakita ang buyer orders at i-refresh paminsan-minsan ang status at payment schedule.
  function initMyOrdersPage() {
    renderMyOrders();
    window.setInterval(renderMyOrders, 60000);
  }

  // I-filter ang orders ng current buyer at i-display ang details at available actions.
  function renderMyOrders() {
    const list = document.getElementById("ordersList");
    const emptyState = document.getElementById("ordersEmptyState");
    if (!list) return;

    const myNumbers = new Set(getMyOrderNumbers());
    const session = STORE.getSession();
    const allOrders = STORE.getOrders();
    const orders = allOrders
      .filter((o) => session.profileId
        ? o.buyerProfileId === session.profileId
        : myNumbers.has(o.orderNumber))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (applyOverdueInstallmentFees(orders)) STORE.saveOrders(allOrders);

    if (orders.length === 0) {
      list.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    if (emptyState) emptyState.style.display = "none";

    list.innerHTML = orders
      .map(
        (order) => `
      <div class="order-review" style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px;">
          <div>
            <strong>${STORE.escapeHtml(order.orderNumber)}</strong>
            <div style="font-size:12px; color:#757575;">${STORE.formatDate(order.createdAt)}</div>
          </div>
          <span class="badge ${statusBadgeClass(order.status)}">${STORE.escapeHtml(order.status)}</span>
        </div>
        ${order.items
          .map(
            (i) => `
          <div class="order-review-item">
            <span>${STORE.escapeHtml(i.name)} &times; ${i.qty}</span>
            <span>${STORE.formatPrice(i.subtotal)}</span>
          </div>`
          )
          .join("")}
        ${savedOrderPriceRows(order)}
        ${renderPayLaterSchedule(order)}
        ${renderPayLaterBalance(order)}
        ${renderBuyerCancelOrder(order)}
        ${renderOrderReview(order)}
        <div class="order-review-total">
          <span>${orderPayableLabel(order)}</span>
          <span class="value">${STORE.formatPrice(orderPayableTotal(order))}</span>
        </div>
      </div>`
      )
      .join("");

    list.querySelectorAll("[data-pay-installment]").forEach((button) => {
      button.addEventListener("click", () => {
        payInstallmentEarly(button.dataset.order, Number(button.dataset.payInstallment));
      });
    });
    list.querySelectorAll("[data-cancel-order]").forEach((button) => {
      button.addEventListener("click", () => cancelBuyerOrder(button.dataset.cancelOrder));
    });
    list.querySelectorAll("[data-review-order]").forEach((form) => {
      form.addEventListener("submit", (event) => submitOrderReview(event, form));
    });
  }

  // Ipakita ang cancel button o paliwanag depende sa order status.
  function renderBuyerCancelOrder(order) {
    if (order.status === "Pending" || order.status === "Processing") {
      const hasPaidInstallments = order.payment && Array.isArray(order.payment.installments)
        && order.payment.installments.some((installment) => installment.status === "paid");
      if (hasPaidInstallments) {
        return `<p class="review-eligibility-note">This order cannot be cancelled because an installment has already been paid. Contact the seller for help.</p>`;
      }
      return `<div class="buyer-order-actions">
        <button type="button" class="btn btn-outline btn-sm buyer-cancel-order" data-cancel-order="${STORE.escapeHtml(order.orderNumber)}">Cancel order</button>
        <small>Need to change your address or order details? Cancel this order and place a new one.</small>
      </div>`;
    }
    if (order.status === "Shipped") {
      return `<p class="review-eligibility-note">This order has shipped and can no longer be cancelled.</p>`;
    }
    return "";
  }

  // I-cancel ang order kung puwede pa at pag-aari ito ng naka-login na buyer.
  function cancelBuyerOrder(orderNumber) {
    const session = STORE.getSession();
    const myNumbers = new Set(getMyOrderNumbers());
    const orders = STORE.getOrders();
    const order = orders.find((item) => item.orderNumber === orderNumber);
    const ownsOrder = session && (session.profileId
      ? order && order.buyerProfileId === session.profileId
      : myNumbers.has(orderNumber));
    const canCancel = order && (order.status === "Pending" || order.status === "Processing");
    const hasPaidInstallments = order && order.payment && Array.isArray(order.payment.installments)
      && order.payment.installments.some((installment) => installment.status === "paid");
    if (!ownsOrder || !canCancel || hasPaidInstallments) {
      STORE.showToast("This order can no longer be cancelled.", "error");
      renderMyOrders();
      return;
    }
    if (!window.confirm(`Cancel order ${orderNumber}? You can place a new order with the corrected details.`)) return;

    order.status = "Cancelled";
    order.cancelledAt = new Date().toISOString();
    order.cancelledBy = "buyer";
    order.updatedAt = order.cancelledAt;
    STORE.saveOrders(orders);
    STORE.showToast("Your order has been cancelled.", "success");
    renderMyOrders();
  }

  // Ipakita ang review na naisumite na, o review form kung delivered na ang order.
  function renderOrderReview(order) {
    if (order.status !== "Delivered") {
      return `<p class="review-eligibility-note">You can rate and review this order after it is delivered.</p>`;
    }
    if (order.review) {
      return `<div class="customer-review">
        <strong>Your review: ${"★".repeat(order.review.rating)}${"☆".repeat(5 - order.review.rating)}</strong>
        <p>${STORE.escapeHtml(order.review.comment)}</p>
        <small>Submitted ${STORE.formatDate(order.review.createdAt)}</small>
      </div>`;
    }
    return `<form class="customer-review-form" data-review-order="${STORE.escapeHtml(order.orderNumber)}">
      <h3>Rate this order</h3>
      <label for="reviewRating-${STORE.escapeHtml(order.orderNumber)}">Rating</label>
      <select id="reviewRating-${STORE.escapeHtml(order.orderNumber)}" name="rating" required>
        <option value="">Choose a rating</option>
        <option value="5">5 — Excellent</option>
        <option value="4">4 — Good</option>
        <option value="3">3 — Okay</option>
        <option value="2">2 — Poor</option>
        <option value="1">1 — Very poor</option>
      </select>
      <label for="reviewComment-${STORE.escapeHtml(order.orderNumber)}">Comment</label>
      <textarea id="reviewComment-${STORE.escapeHtml(order.orderNumber)}" name="comment" rows="3" minlength="3" maxlength="1000" required placeholder="Share your experience with this order"></textarea>
      <button type="submit" class="btn btn-primary btn-sm">Submit review</button>
    </form>`;
  }

  // I-check kung sa buyer ang order at valid ang review bago i-save.
  function submitOrderReview(event, form) {
    event.preventDefault();
    const orderNumber = form.dataset.reviewOrder;
    const session = STORE.getSession();
    const myNumbers = new Set(getMyOrderNumbers());
    const orders = STORE.getOrders();
    const order = orders.find((item) => item.orderNumber === orderNumber);
    const ownsOrder = session.profileId
      ? order && order.buyerProfileId === session.profileId
      : myNumbers.has(orderNumber);
    if (!order || !ownsOrder || order.status !== "Delivered" || order.review) {
      STORE.showToast("Only delivered orders can be reviewed, and each order can be reviewed once.", "error");
      renderMyOrders();
      return;
    }

    const rating = Number(form.elements.rating.value);
    const comment = form.elements.comment.value.trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3) {
      STORE.showToast("Choose a rating and enter a comment of at least 3 characters.", "error");
      return;
    }

    order.review = { rating, comment, createdAt: new Date().toISOString() };
    STORE.saveOrders(orders);
    STORE.showToast("Thank you for reviewing your order.", "success");
    renderMyOrders();
  }

  // I-build ang summary rows para sa subtotal, voucher, delivery, at payment.
  function savedOrderPriceRows(order) {
    const subtotal = Number.isFinite(Number(order.subtotal))
      ? Number(order.subtotal)
      : order.items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    const discount = Number(order.discount) || 0;
    const shippingDiscount = Number(order.shippingDiscount) || 0;
    const voucherRow = discount > 0
      ? `<div class="order-review-item voucher-saved-row">
          <span>Voucher (${STORE.escapeHtml(order.voucherCode || "Applied")})</span>
          <span>-${STORE.formatPrice(discount)}</span>
        </div>`
      : "";
    const freeShippingRow = shippingDiscount > 0
      ? `<div class="order-review-item voucher-saved-row">
          <span>Free shipping (${STORE.escapeHtml(order.voucherCode || "Voucher")})</span>
          <span>-${STORE.formatPrice(shippingDiscount)}</span>
        </div>`
      : "";
    const deliveryRow = order.delivery && Number(order.delivery.fee) > 0
      ? `<div class="order-review-item">
          <span>Delivery fee${order.delivery.zone ? ` · ${STORE.escapeHtml(order.delivery.zone)}` : ""}</span>
          <span>${STORE.formatPrice(Number(order.delivery.fee))}</span>
        </div>`
      : "";
    const payment = order.payment;
    const paymentMethodRow = payment && payment.paymentMethod
      ? `<div class="order-review-item">
          <span>Payment method</span>
          <span>${STORE.escapeHtml(payment.accountLabel || getPaymentMethodLabel(payment.paymentMethod))}</span>
        </div>`
      : "";
    const financingRows = payment && payment.method === "paylater"
      ? `<div class="order-review-item paylater-interest-row">
          <span>PayLater interest (${payment.monthlyRate * 100}% monthly)</span>
          <span>${STORE.formatPrice(payment.interest)}</span>
        </div>
        <div class="paylater-policy-note">Late installments receive a one-time ₱50 fee after a 3-day grace period. This is a demo rule.</div>`
      : "";

    return `${paymentMethodRow}<div class="order-review-item"><span>Subtotal</span><span>${STORE.formatPrice(subtotal)}</span></div>${voucherRow}${deliveryRow}${freeShippingRow}${financingRows}`;
  }

  // I-display ang PayLater installments at, kung puwede, maglagay ng pay buttons.
  function renderPayLaterSchedule(order, allowPayment = true) {
    if (!order.payment || order.payment.method !== "paylater" || !Array.isArray(order.payment.installments)) return "";

    const rows = order.payment.installments.map((installment, index) => {
      const dueDate = new Date(installment.dueAt);
      const status = ["paid", "overdue"].includes(installment.status)
        ? installment.status
        : installment.paidAt ? "paid" : "unpaid";
      const statusText = status === "paid"
        ? `Paid${installment.paidAt ? ` on ${new Date(installment.paidAt).toLocaleDateString("en-PH")}` : ""}`
        : status === "overdue" ? "Overdue" : "Upcoming";
      const feeRow = Number(installment.lateFee) > 0
        ? `<small class="installment-fee">Late fee: ${STORE.formatPrice(installment.lateFee)}</small>`
        : "";
      const payButton = allowPayment && status !== "paid"
        ? `<button type="button" class="btn btn-primary btn-sm" data-pay-installment="${index}" data-order="${STORE.escapeHtml(order.orderNumber)}">Pay now</button>`
        : "";

      return `<li class="installment-row ${status}">
        <span>
          <strong>Payment ${index + 1}</strong>
          <small>Due ${Number.isNaN(dueDate.getTime()) ? "date unavailable" : dueDate.toLocaleDateString("en-PH")}</small>
          <small class="installment-status">${statusText}</small>
          ${feeRow}
        </span>
        <span class="installment-actions">
          <strong>${STORE.formatPrice(Number(installment.amount) + (Number(installment.lateFee) || 0))}</strong>
          ${payButton}
        </span>
      </li>`;
    }).join("");

    return `<div class="paylater-schedule">
      <strong>${order.payment.months}-month PayLater schedule</strong>
      <ul>${rows}</ul>
    </div>`;
  }

  // Ipakita kung magkano na ang paid at magkano pa ang balance ng PayLater order.
  function renderPayLaterBalance(order) {
    if (!order.payment || order.payment.method !== "paylater" || !Array.isArray(order.payment.installments)) return "";
    const paid = order.payment.installments
      .filter((installment) => installment.status === "paid")
      .reduce((sum, installment) => sum + Number(installment.paidAmount || installment.amount), 0);
    const balance = Math.max(0, orderPayableTotal(order) - paid);
    return `<div class="order-review-item">
      <span>Paid to date / remaining</span>
      <span>${STORE.formatPrice(paid)} / ${STORE.formatPrice(balance)}</span>
    </div>`;
  }

  // Markahang overdue ang installment kapag lagpas na sa grace period at mag-apply ng one-time demo late fee.
  function applyOverdueInstallmentFees(orders) {
    const now = Date.now();
    const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
    let changed = false;

    orders.forEach((order) => {
      const payment = order.payment;
      if (!payment || payment.method !== "paylater" || !Array.isArray(payment.installments)) return;

      payment.installments.forEach((installment) => {
        if (!installment.status) {
          installment.status = installment.paidAt ? "paid" : "unpaid";
          changed = true;
        }
        if (!Number.isFinite(Number(installment.lateFee))) {
          installment.lateFee = 0;
          changed = true;
        }
        if (installment.status === "paid") return;

        const dueTime = Date.parse(installment.dueAt);
        if (Number.isNaN(dueTime) || now <= dueTime + gracePeriodMs) return;

        if (!installment.lateFeeApplied) {
          installment.lateFee = 50;
          installment.lateFeeApplied = true;
          changed = true;
        }
        if (installment.status !== "overdue") {
          installment.status = "overdue";
          changed = true;
        }
      });
    });

    return changed;
  }

  // Markahang paid ang PayLater installment sa demo, tapos i-refresh ang order history.
  function payInstallmentEarly(orderNumber, installmentIndex) {
    if (!getMyOrderNumbers().includes(orderNumber)) return;
    const orders = STORE.getOrders();
    const order = orders.find((item) => item.orderNumber === orderNumber);
    if (!order || !order.payment || !["card", "ewallet"].includes(order.payment.paymentMethod)) {
      STORE.showToast("PayLater payments require a linked card or e-wallet.", "error");
      return;
    }
    const installments = order.payment.installments;
    const installment = Array.isArray(installments) ? installments[installmentIndex] : null;
    if (!installment || installment.status === "paid") return;

    applyOverdueInstallmentFees([order]);
    const dueNow = Number(installment.amount) + (Number(installment.lateFee) || 0);
    const accountLabel = order.payment.accountLabel || getPaymentMethodLabel(order.payment.paymentMethod);
    if (!window.confirm(`Pay ${STORE.formatPrice(dueNow)} for Payment ${installmentIndex + 1} now via ${accountLabel}? This demo marks it as paid but does not process a real payment.`)) {
      STORE.saveOrders(orders);
      renderMyOrders();
      return;
    }

    installment.status = "paid";
    installment.paidAt = new Date().toISOString();
    installment.paidAmount = dueNow;
    STORE.saveOrders(orders);
    STORE.showToast(`Payment ${installmentIndex + 1} marked as paid.`, "success");
    renderMyOrders();
  }

  // I-convert ang payment method key sa mas madaling basahing label para sa order summary.
  function getPaymentMethodLabel(paymentMethod) {
    const labels = {
      cod: "Cash on Delivery (COD)",
      card: "Credit / Debit Card",
      ewallet: "E-wallet",
    };
    return labels[paymentMethod] || "Not recorded";
  }

  // Ibalik ang amount due kasama ang anumang PayLater late fees.
  function orderPayableTotal(order) {
    if (!order.payment || order.payment.method !== "paylater") return order.total;
    const fees = (order.payment.installments || [])
      .reduce((sum, installment) => sum + (Number(installment.lateFee) || 0), 0);
    return order.payment.totalPayable + fees;
  }

  // Piliin kung "Total" o "PayLater total" ang label na ipapakita.
  function orderPayableLabel(order) {
    return order.payment && order.payment.method === "paylater" ? "PayLater total" : "Total";
  }

  // Itapat ang order status sa CSS class na magbibigay ng style sa badge.
  function statusBadgeClass(status) {
    const map = {
      Pending: "badge-pending",
      Processing: "badge-processing",
      Shipped: "badge-shipped",
      Delivered: "badge-delivered",
      Cancelled: "badge-cancelled",
    };
    return map[status] || "badge-pending";
  }
})();