/* =========================================================
   seller.js — Seller dashboard features
   Gumagamit ng shared data sa store.js para ipakita ang orders,
   baguhin ang status, at i-manage ang products at vouchers.
   ========================================================= */

(function () {
  "use strict";

  const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

  if (!STORE.requireRole("seller")) return;

  STORE.initSampleProductsIfEmpty();
  STORE.initOrdersIfMissing();

  let editingProductId = null;

  // I-set up ang dashboard panels at i-render ang initial data pag-load ng page.
  document.addEventListener("DOMContentLoaded", () => {
    initSidebarNav();
    initLogout();
    initOrdersPanel();
    initProductsPanel();
    initVoucherPanel();
    renderAll();

    // Mag-refresh kapag may pagbabago sa orders, products, o vouchers sa ibang tab.
    STORE.onExternalChange([STORE.KEYS.ORDERS, STORE.KEYS.PRODUCTS, STORE.KEYS.VOUCHERS], () => {
      renderAll();
    });

    // Regular na refresh bilang backup kung hindi na-detect ang storage change.
    setInterval(renderAll, 4000);
  });

  // I-refresh ang lahat ng summary, tables, at dashboard panels.
  function renderAll() {
    renderOverview();
    renderDemandForecastPanel();
    renderOrdersTable();
    renderProductsTable();
    renderProductDropdownsIfAny();
    renderVouchers();
  }

  // I-set up ang logout buttons para i-clear ang session at bumalik sa login.
  function initLogout() {
    document.querySelectorAll("[data-logout]").forEach((button) => {
      button.addEventListener("click", () => {
        STORE.logout();
        window.location.href = "login.html";
      });
    });
  }

  /* =========================================================
     Sidebar navigation
     ========================================================= */

  // Ipakita ang panel na pinili sa sidebar at itago ang ibang panels.
  function initSidebarNav() {
    const buttons = document.querySelectorAll(".sidebar-nav button[data-panel]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".main-panel > section").forEach((sec) => {
          sec.style.display = sec.id === btn.dataset.panel ? "block" : "none";
        });
      });
    });
  }

  /* =========================================================
     Overview panel
     ========================================================= */

  // Ipakita ang order stats, sales analytics, at recent orders.
  function renderOverview() {
    const orders = STORE.getOrders();
    const statsRow = document.getElementById("statsRow");
    if (!statsRow) return;

    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === "Pending").length;
    const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;
    const validOrders = orders.filter((o) => o.status !== "Cancelled");
    const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    statsRow.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${totalOrders}</div>
        <div class="stat-label">Total Orders</div>
      </div>
      <div class="stat-card stat-pending">
        <div class="stat-value">${pendingOrders}</div>
        <div class="stat-label">Pending Orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${deliveredOrders}</div>
        <div class="stat-label">Delivered Orders</div>
      </div>
      <div class="stat-card stat-revenue">
        <div class="stat-value">${STORE.formatPrice(totalRevenue)}</div>
        <div class="stat-label">Revenue (excl. cancelled)</div>
      </div>`;

    const analytics = document.getElementById("salesAnalytics");
    if (analytics) {
      const monthLabels = buildRecentMonths(6);
      const monthRevenue = new Map();

      monthLabels.forEach(({ key }) => {
        monthRevenue.set(key, 0);
      });

      validOrders.forEach((order) => {
        const created = new Date(order.createdAt);
        if (Number.isNaN(created.getTime())) return;
        const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
        if (!monthRevenue.has(key)) return;
        monthRevenue.set(key, (monthRevenue.get(key) || 0) + (Number(order.total) || 0));
      });

      const topProducts = new Map();
      validOrders.forEach((order) => {
        order.items.forEach((item) => {
          const productName = item.name || "Unknown item";
          const quantity = Number(item.qty) || 0;
          const subtotal = Number(item.subtotal) || 0;
          const current = topProducts.get(productName) || { qty: 0, revenue: 0 };
          current.qty += quantity;
          current.revenue += subtotal;
          topProducts.set(productName, current);
        });
      });

      const sortedProducts = [...topProducts.entries()]
        .sort((a, b) => b[1].qty - a[1].qty || b[1].revenue - a[1].revenue)
        .slice(0, 3);

      const maxRevenue = Math.max(...[...monthRevenue.values()], 1);
      const averageOrderValue = validOrders.length ? totalRevenue / validOrders.length : 0;
      const bestMonth = [...monthLabels]
        .map((month) => ({ ...month, value: monthRevenue.get(month.key) || 0 }))
        .sort((a, b) => b.value - a.value)[0];

      analytics.innerHTML = `
        <div class="analytics-card analytics-wide">
          <div class="analytics-header">
            <h2>Sales Analytics</h2>
            <span>Last 6 months</span>
          </div>
          <div class="sales-chart">
            ${monthLabels
              .map(({ key, label }) => {
                const value = monthRevenue.get(key) || 0;
                const height = value > 0 ? Math.max((value / maxRevenue) * 100, 12) : 0;
                return `
                  <div class="sales-bar-group" title="${label}: ${STORE.formatPrice(value)}">
                    <div class="sales-bar-wrap">
                      <div class="sales-bar" style="height: ${height}%"></div>
                    </div>
                    <span>${label}</span>
                  </div>`;
              })
              .join("")}
          </div>
        </div>
        <div class="analytics-card">
          <h3>Key Metrics</h3>
          <div class="analytics-metrics">
            <div>
              <span>Avg. order value</span>
              <strong>${STORE.formatPrice(averageOrderValue)}</strong>
            </div>
            <div>
              <span>Best month</span>
              <strong>${bestMonth && bestMonth.value > 0 ? bestMonth.label : "No sales"}</strong>
            </div>
          </div>
        </div>
        <div class="analytics-card">
          <h3>Most Sold Item</h3>
          ${
            sortedProducts.length
              ? `<div class="best-seller">
                  <strong>${STORE.escapeHtml(sortedProducts[0][0])}</strong>
                  <span>${sortedProducts[0][1].qty} sold</span>
                </div>`
              : `<p class="best-seller-empty">No sales yet.</p>`
          }
          <h4 class="analytics-subheading">Top Products</h4>
          <ul class="analytics-list">
            ${
              sortedProducts.length
                ? sortedProducts
                    .map(
                      ([name, stats]) => `
                        <li>
                          <span>${STORE.escapeHtml(name)}</span>
                          <strong>${stats.qty} sold</strong>
                        </li>`
                    )
                    .join("")
                : "<li><span>No product data yet</span></li>"
            }
          </ul>
        </div>`;

    }

    const recentBody = document.querySelector("#recentOrdersTable tbody");
    const recent = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    if (recent.length === 0) {
      recentBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#757575; padding:24px;">No orders yet.</td></tr>`;
      return;
    }

    recentBody.innerHTML = recent
      .map(
        (o) => `
      <tr>
        <td><strong>${STORE.escapeHtml(o.orderNumber)}</strong></td>
        <td>${STORE.escapeHtml(o.buyerName)}</td>
        <td>${o.items.reduce((s, i) => s + i.qty, 0)} item(s)</td>
        <td>
          <strong>${STORE.formatPrice(orderPaymentTotal(o))}</strong>
          ${orderPaymentLabel(o) ? `<small class="order-payment-method">Via ${STORE.escapeHtml(orderPaymentLabel(o))}</small>` : ""}
          ${payLaterPaymentStatus(o) ? `<small class="seller-installment-status">${STORE.escapeHtml(payLaterPaymentStatus(o))}</small>` : ""}
        </td>
        <td>${o.review
          ? `<div class="seller-customer-review">
              <strong>${"★".repeat(o.review.rating)}${"☆".repeat(5 - o.review.rating)}</strong>
              <p>${STORE.escapeHtml(o.review.comment)}</p>
            </div>`
          : "—"}</td>
        <td><span class="badge ${statusBadgeClass(o.status)}">${STORE.escapeHtml(o.status)}</span></td>
        <td>${STORE.formatDate(o.createdAt)}</td>
      </tr>`
      )
      .join("");
  }

  // Gumawa ng listahan ng recent months para sa sales chart at forecast.
  function buildRecentMonths(count) {
    const months = [];
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });

    for (let index = count - 1; index >= 0; index -= 1) {
      const monthDate = new Date();
      monthDate.setDate(1);
      monthDate.setMonth(monthDate.getMonth() - index);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: formatter.format(monthDate) });
    }

    return months;
  }

  // Ipakita ang monthly sales history, next-month estimate, at suggested restock.
  function renderDemandForecast(products, months, orders) {
    const actualHistory = new Map();
    orders.forEach((order) => {
      const created = new Date(order.createdAt);
      if (Number.isNaN(created.getTime())) return;
      const monthKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      const monthIndex = months.findIndex((month) => month.key === monthKey);
      if (monthIndex === -1) return;

      (order.items || []).forEach((item) => {
        if (!item.productId) return;
        const history = actualHistory.get(item.productId) || Array(months.length).fill(0);
        history[monthIndex] += Math.max(0, Number(item.qty) || 0);
        actualHistory.set(item.productId, history);
      });
    });

    const rows = products
      .map((product) => {
        const history = actualHistory.get(product.id) || Array(months.length).fill(0);

        const forecast = forecastNextMonth(history);
        const stock = Math.max(0, Number(product.stock) || 0);
        const restock = Math.max(0, forecast - stock);
        const historyCells = history
          .map(
            (quantity, index) => {
              const orderLabel = quantity === 1 ? "order" : "orders";
              return `<td class="demand-number" title="${months[index].label}: ${quantity} ${orderLabel}">${quantity}</td>`;
            }
          )
          .join("");

        return `<tr>
          <td>${STORE.escapeHtml(product.name)}</td>
          ${historyCells}
          <td class="demand-number"><strong>${forecast}</strong></td>
          <td class="demand-number">${stock}</td>
          <td class="demand-number">${restock ? `<strong>${restock}</strong>` : "—"}</td>
        </tr>`;
      })
      .filter(Boolean);

    if (rows.length === 0) {
      return `<div class="analytics-card analytics-wide demand-forecast">
        <h2>Demand Forecast</h2>
        <p class="best-seller-empty">Add a product to view its actual order history and forecast.</p>
      </div>`;
    }

    return `<div class="analytics-card analytics-wide demand-forecast">
      <div class="analytics-header">
        <h2>Demand Forecast</h2>
        <span>Next month · estimated units</span>
      </div>
      <p class="demand-note">Based only on non-cancelled orders recorded in this store during the last six months. Months without orders show 0. Forecasts extend the trend in those actual order quantities; they do not include market or seasonal signals.</p>
      <div class="demand-table-wrap">
        <table class="data-table demand-table">
          <thead>
            <tr>
              <th>Product</th>
              ${months.map((month) => `<th>${month.label} units</th>`).join("")}
              <th>Forecast</th>
              <th>In stock</th>
              <th>Suggested restock</th>
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
      <p class="demand-footnote">Suggested restock is the forecasted next-month demand minus current stock, with a minimum of zero. This is a basic estimate, not a purchase order.</p>
    </div>`;
  }

  // Kunin ang valid orders at products, tapos i-render ang demand forecast panel.
  function renderDemandForecastPanel() {
    const content = document.getElementById("demandForecastContent");
    if (!content) return;

    const orders = STORE.getOrders().filter(
      (order) => order.status !== "Cancelled" && Array.isArray(order.items)
    );
    content.innerHTML = renderDemandForecast(STORE.getProducts(), buildRecentMonths(6), orders);
  }

  // I-estimate ang benta sa susunod na buwan gamit ang average at trend ng history.
  function forecastNextMonth(history) {
    const count = history.length;
    const averageX = (count - 1) / 2;
    const averageY = history.reduce((sum, quantity) => sum + quantity, 0) / count;
    const varianceX = history.reduce((sum, _, index) => sum + (index - averageX) ** 2, 0);
    const covariance = history.reduce(
      (sum, quantity, index) => sum + (index - averageX) * (quantity - averageY),
      0
    );
    const trend = varianceX ? covariance / varianceX : 0;
    return Math.max(0, Math.round(averageY + trend * (count - averageX)));
  }

  /* =========================================================
     Orders panel
     ========================================================= */

  // I-set up ang status filter at search para ma-refresh ang orders table.
  function initOrdersPanel() {
    const statusFilter = document.getElementById("statusFilter");
    const orderSearch = document.getElementById("orderSearch");
    if (statusFilter) statusFilter.addEventListener("change", renderOrdersTable);
    if (orderSearch) orderSearch.addEventListener("input", renderOrdersTable);
  }

  // I-filter at ipakita ang orders kasama ang buyer info at status controls.
  function renderOrdersTable() {
    const tbody = document.querySelector("#ordersTable tbody");
    const emptyState = document.getElementById("ordersEmpty");
    if (!tbody) return;

    const statusFilter = document.getElementById("statusFilter").value;
    const search = document.getElementById("orderSearch").value.trim().toLowerCase();

    let orders = [...STORE.getOrders()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (statusFilter !== "All") {
      orders = orders.filter((o) => o.status === statusFilter);
    }
    if (search) {
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.buyerName.toLowerCase().includes(search) ||
          o.buyerContact.toLowerCase().includes(search)
      );
    }

    if (orders.length === 0) {
      tbody.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    if (emptyState) emptyState.style.display = "none";

    tbody.innerHTML = orders
      .map((o) => {
        const itemsHtml = `<ul>${o.items
          .map((i) => `<li>${STORE.escapeHtml(i.name)} &times; ${i.qty} (${STORE.formatPrice(i.subtotal)})</li>`)
          .join("")}</ul>`;

        const statusOptions = STATUSES.map(
          (s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`
        ).join("");

        return `
        <tr data-order="${STORE.escapeHtml(o.orderNumber)}">
          <td><strong>${STORE.escapeHtml(o.orderNumber)}</strong></td>
          <td>${STORE.escapeHtml(o.buyerName)}</td>
          <td>${STORE.escapeHtml(o.buyerContact)}</td>
          <td style="max-width:180px;">
            ${STORE.escapeHtml(o.buyerAddress)}
            ${o.delivery ? `<small class="order-payment-method">${STORE.escapeHtml(o.delivery.courier)} from ${STORE.escapeHtml(o.delivery.origin)}<br />ETA: ${STORE.escapeHtml(o.delivery.estimate)}</small>` : ""}
          </td>
          <td class="order-items-cell">${itemsHtml}</td>
          <td>
            <strong>${STORE.formatPrice(orderPaymentTotal(o))}</strong>
            ${orderPaymentLabel(o) ? `<small class="order-payment-method">Via ${STORE.escapeHtml(orderPaymentLabel(o))}</small>` : ""}
            ${payLaterPaymentStatus(o) ? `<small class="seller-installment-status">${STORE.escapeHtml(payLaterPaymentStatus(o))}</small>` : ""}
          </td>
          <td>${o.review
            ? `<div class="seller-customer-review">
                <strong>${"★".repeat(o.review.rating)}${"☆".repeat(5 - o.review.rating)}</strong>
                <p>${STORE.escapeHtml(o.review.comment)}</p>
              </div>`
            : "—"}</td>
          <td><span class="badge ${statusBadgeClass(o.status)}">${STORE.escapeHtml(o.status)}</span></td>
          <td>${STORE.formatDate(o.createdAt)}</td>
          <td>
            <select class="status-select" data-order="${STORE.escapeHtml(o.orderNumber)}" ${o.status === "Cancelled" ? "disabled" : ""}>
              ${statusOptions}
            </select>
          </td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", () => {
        updateOrderStatus(select.dataset.order, select.value);
      });
    });
  }

  // I-confirm at i-save ang bagong status ng order.
  function updateOrderStatus(orderNumber, newStatus) {
    const orders = STORE.getOrders();
    const order = orders.find((o) => o.orderNumber === orderNumber);
    if (!order) return;
    if (order.status === "Cancelled") {
      STORE.showToast("Cancelled orders cannot be reopened.", "error");
      renderOrdersTable();
      return;
    }

    if (!window.confirm(`Change status of ${orderNumber} to "${newStatus}"?`)) {
      renderOrdersTable(); // Ibalik ang select sa totoong status ng order.
      return;
    }

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    STORE.saveOrders(orders);
    STORE.showToast(`${orderNumber} marked as ${newStatus}.`, "success");
    renderAll();
  }

  /* =========================================================
     Products panel
     ========================================================= */

  // Ikabit ang product form at cancel button sa kanilang actions.
  function initProductsPanel() {
    const form = document.getElementById("productForm");
    const cancelBtn = document.getElementById("productFormCancel");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleProductFormSubmit();
    });

    cancelBtn.addEventListener("click", () => {
      resetProductForm();
    });
  }

  // I-set up ang voucher form at delivery fee display.
  function initVoucherPanel() {
    const form = document.getElementById("voucherForm");
    if (!form) return;
    const type = document.getElementById("sellerVoucherType");
    type.addEventListener("change", updateVoucherTypeFields);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveVoucher();
    });
    document.getElementById("sellerVoucherCancel").addEventListener("click", resetVoucherForm);
    updateVoucherTypeFields();
    renderDeliveryFeeSettings();
  }

  // Ipakita o itago ang discount value field depende sa voucher type.
  function updateVoucherTypeFields() {
    const type = document.getElementById("sellerVoucherType").value;
    const isFreeShipping = type === "free_shipping";
    const valueInput = document.getElementById("sellerVoucherValue");
    document.getElementById("sellerVoucherValueGroup").style.display = isFreeShipping ? "none" : "block";
    document.querySelector('label[for="sellerVoucherValue"]').textContent =
      type === "percent" ? "Percentage off (%)" : "Amount off (₱)";
    valueInput.required = !isFreeShipping;
    valueInput.disabled = isFreeShipping;
  }

  // Ipakita ang vouchers table at ikabit ang edit/delete buttons.
  function renderVouchers() {
    const tbody = document.querySelector("#vouchersTable tbody");
    if (!tbody) return;
    const vouchers = STORE.getVouchers();
    if (!Array.isArray(vouchers) || vouchers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">No vouchers created yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = vouchers.map((voucher) => {
      const offer = voucher.type === "free_shipping"
        ? "Free shipping"
        : voucher.type === "percent"
          ? `${Number(voucher.value)}% off`
          : `${STORE.formatPrice(voucher.value)} off`;
      return `<tr>
        <td><strong>${STORE.escapeHtml(voucher.code)}</strong></td>
        <td>${offer}</td>
        <td>${STORE.formatPrice(voucher.minSubtotal || 0)} – ${
          voucher.maxSubtotal != null && Number.isFinite(Number(voucher.maxSubtotal))
            ? STORE.formatPrice(voucher.maxSubtotal)
            : "No maximum"
        }</td>
        <td>${Number.isInteger(Number(voucher.maxUsesPerWeek)) && Number(voucher.maxUsesPerWeek) > 0
          ? `${Number(voucher.maxUsesPerWeek)} per buyer`
          : "Unlimited"}</td>
        <td>${voucher.active ? "Active" : "Inactive"}</td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" data-edit-voucher="${STORE.escapeHtml(voucher.code)}">Edit</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete-voucher="${STORE.escapeHtml(voucher.code)}">Delete</button>
        </td>
      </tr>`;
    }).join("");

    tbody.querySelectorAll("[data-edit-voucher]").forEach((button) =>
      button.addEventListener("click", () => editVoucher(button.dataset.editVoucher))
    );
    tbody.querySelectorAll("[data-delete-voucher]").forEach((button) =>
      button.addEventListener("click", () => deleteVoucher(button.dataset.deleteVoucher))
    );
  }

  // I-validate ang voucher details bago mag-create o mag-update ng voucher.
  function saveVoucher() {
    const code = document.getElementById("sellerVoucherCode").value.trim().toUpperCase();
    const type = document.getElementById("sellerVoucherType").value;
    const value = Number(document.getElementById("sellerVoucherValue").value);
    const minSubtotal = Number(document.getElementById("sellerVoucherMinimum").value);
    const maxSubtotalInput = document.getElementById("sellerVoucherMaximum").value.trim();
    const maxUsesInput = document.getElementById("sellerVoucherWeeklyLimit").value.trim();
    const maxSubtotal = maxSubtotalInput ? Number(maxSubtotalInput) : null;
    const maxUsesPerWeek = maxUsesInput ? Number(maxUsesInput) : null;
    const active = document.getElementById("sellerVoucherActive").checked;
    const feedback = document.getElementById("sellerVoucherFeedback");
    const editingCode = document.getElementById("sellerVoucherCode").dataset.editingCode || "";
    if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
      feedback.textContent = "Use 3–20 letters, numbers, or hyphens for the code.";
      return;
    }
    if (!["fixed", "percent", "free_shipping"].includes(type)
      || !Number.isFinite(minSubtotal) || minSubtotal < 0
      || (maxSubtotal !== null && (!Number.isFinite(maxSubtotal) || maxSubtotal < minSubtotal))
      || (maxUsesPerWeek !== null && (!Number.isInteger(maxUsesPerWeek) || maxUsesPerWeek < 1))
      || (type !== "free_shipping" && (!Number.isFinite(value) || value <= 0))
      || (type === "percent" && value > 100)) {
      feedback.textContent = "Check the discount, subtotal range, and optional whole-number use limit. Percentage discounts cannot exceed 100%.";
      return;
    }

    const vouchers = STORE.getVouchers();
    if (!Array.isArray(vouchers)) {
      feedback.textContent = "Saved vouchers could not be read. Refresh and try again.";
      return;
    }
    if (vouchers.some((voucher) => voucher.code.toUpperCase() === code && voucher.code !== editingCode)) {
      feedback.textContent = "That voucher code already exists.";
      return;
    }
    const voucher = {
      code,
      type,
      value: type === "free_shipping" ? 0 : Math.round(value * 100) / 100,
      minSubtotal: Math.round(minSubtotal * 100) / 100,
      maxSubtotal: maxSubtotal === null ? null : Math.round(maxSubtotal * 100) / 100,
      maxUsesPerWeek,
      active,
    };
    const existingIndex = vouchers.findIndex((item) => item.code === editingCode);
    if (existingIndex >= 0) vouchers[existingIndex] = voucher;
    else vouchers.push(voucher);
    STORE.saveVouchers(vouchers);
    feedback.textContent = "Voucher saved.";
    resetVoucherForm();
    renderVouchers();
  }

  // Ilagay sa form ang details ng napiling voucher para ma-edit.
  function editVoucher(code) {
    const voucher = STORE.getVouchers().find((item) => item.code === code);
    if (!voucher) return;
    const codeInput = document.getElementById("sellerVoucherCode");
    codeInput.value = voucher.code;
    codeInput.dataset.editingCode = voucher.code;
    document.getElementById("sellerVoucherType").value = voucher.type;
    document.getElementById("sellerVoucherValue").value = voucher.value;
    document.getElementById("sellerVoucherMinimum").value = voucher.minSubtotal || 0;
    document.getElementById("sellerVoucherMaximum").value = voucher.maxSubtotal ?? "";
    document.getElementById("sellerVoucherWeeklyLimit").value = voucher.maxUsesPerWeek ?? "";
    document.getElementById("sellerVoucherActive").checked = Boolean(voucher.active);
    document.getElementById("voucherFormTitle").textContent = `Editing voucher ${voucher.code}`;
    document.getElementById("sellerVoucherSubmit").textContent = "Save changes";
    document.getElementById("sellerVoucherCancel").style.display = "inline-block";
    updateVoucherTypeFields();
    document.getElementById("voucherForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Ibalik sa create mode ang voucher form at linisin ang mga field.
  function resetVoucherForm() {
    const form = document.getElementById("voucherForm");
    if (!form) return;
    form.reset();
    const codeInput = document.getElementById("sellerVoucherCode");
    delete codeInput.dataset.editingCode;
    document.getElementById("voucherFormTitle").textContent = "Create a voucher";
    document.getElementById("sellerVoucherSubmit").textContent = "Save voucher";
    document.getElementById("sellerVoucherCancel").style.display = "none";
    document.getElementById("sellerVoucherFeedback").textContent = "";
    updateVoucherTypeFields();
  }

  // I-confirm muna bago alisin ang voucher sa saved list.
  function deleteVoucher(code) {
    if (!window.confirm(`Delete voucher ${code}?`)) return;
    STORE.saveVouchers(STORE.getVouchers().filter((voucher) => voucher.code !== code));
    resetVoucherForm();
    renderVouchers();
  }

  // Ipakita ang nakatakdang delivery fee para sa bawat destination zone.
  function renderDeliveryFeeSettings() {
    const container = document.getElementById("deliveryFeeSettings");
    if (!container) return;
    const fees = STORE.getDeliveryFees();
    container.innerHTML = [
      ["Metro Manila", fees.metro],
      ["Rest of Luzon", fees.luzon],
      ["Visayas", fees.visayas],
      ["Mindanao", fees.mindanao],
    ].map(([zone, fee]) => `<div class="delivery-fee-card"><strong>${STORE.escapeHtml(zone)}</strong><span>${STORE.formatPrice(fee)}</span></div>`).join("");
  }

  // Ipakita ang product catalog at ikabit ang edit, restock, at delete actions.
  function renderProductsTable() {
    const tbody = document.querySelector("#productsTable tbody");
    if (!tbody) return;

    const products = STORE.getProducts();

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#757575; padding:24px;">No products yet. Add one above.</td></tr>`;
      return;
    }

    tbody.innerHTML = products
      .map(
        (p) => `
      <tr>
        <td><img src="${STORE.escapeHtml(p.image)}" alt="" style="width:44px; height:44px; object-fit:cover; border-radius:4px;" onerror="this.src='https://via.placeholder.com/44x44?text=%20'" /></td>
        <td>${STORE.escapeHtml(p.name)}</td>
        <td>${STORE.escapeHtml(p.category || "—")}</td>
        <td>${STORE.formatPrice(p.price)}</td>
        <td>${p.stock <= 0 ? '<span class="stock-out">0 (out)</span>' : p.stock <= 5 ? `<span class="stock-low">${p.stock}</span>` : p.stock}</td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" data-edit="${STORE.escapeHtml(p.id)}">Edit</button>
          <button type="button" class="btn btn-outline btn-sm" data-restock="${STORE.escapeHtml(p.id)}">Restock</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete="${STORE.escapeHtml(p.id)}">Delete</button>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => startEditProduct(btn.dataset.edit))
    );
    tbody.querySelectorAll("[data-restock]").forEach((btn) =>
      btn.addEventListener("click", () => restockProduct(btn.dataset.restock))
    );
    tbody.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => deleteProduct(btn.dataset.delete))
    );
  }

  // Placeholder kung may future dashboard panel na mangangailangan ng product dropdown.
  function renderProductDropdownsIfAny() {
  }

  // I-validate ang product form bago magdagdag o mag-update ng product.
  function handleProductFormSubmit() {
    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("productCategory").value.trim() || "Uncategorized";
    const price = parseFloat(document.getElementById("productPrice").value);
    const stock = parseInt(document.getElementById("productStock").value, 10);
    const image = document.getElementById("productImage").value.trim() || "https://via.placeholder.com/400x400?text=No+Image";
    const description = document.getElementById("productDescription").value.trim();

    if (!name) {
      STORE.showToast("Product name is required.", "error");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      STORE.showToast("Enter a valid price (0 or more).", "error");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      STORE.showToast("Enter a valid stock quantity (0 or more).", "error");
      return;
    }

    const products = STORE.getProducts();

    if (editingProductId) {
      const existing = products.find((p) => p.id === editingProductId);
      if (existing) {
        existing.name = name;
        existing.category = category;
        existing.price = Math.round(price * 100) / 100;
        existing.stock = stock;
        existing.image = image;
        existing.description = description;
        STORE.showToast("Product updated.", "success");
      }
    } else {
      const newProduct = {
        id: "p" + Date.now().toString(36) + Math.floor(Math.random() * 1000),
        name,
        category,
        price: Math.round(price * 100) / 100,
        stock,
        image,
        description,
      };
      products.push(newProduct);
      STORE.showToast("Product added.", "success");
    }

    STORE.saveProducts(products);
    resetProductForm();
    renderAll();
  }

  // I-load ang product details sa form at lumipat sa edit mode.
  function startEditProduct(id) {
    const product = STORE.getProductById(id);
    if (!product) return;

    editingProductId = id;
    document.getElementById("productId").value = id;
    document.getElementById("productName").value = product.name;
    document.getElementById("productCategory").value = product.category || "";
    document.getElementById("productPrice").value = product.price;
    document.getElementById("productStock").value = product.stock;
    document.getElementById("productImage").value = product.image || "";
    document.getElementById("productDescription").value = product.description || "";

    document.getElementById("productFormTitle").textContent = `Editing: ${product.name}`;
    document.getElementById("productFormSubmit").textContent = "Save Changes";
    document.getElementById("productFormCancel").style.display = "inline-block";

    document.getElementById("productForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Linisin ang product form at ibalik ito sa add-new mode.
  function resetProductForm() {
    editingProductId = null;
    document.getElementById("productForm").reset();
    document.getElementById("productId").value = "";
    document.getElementById("productFormTitle").textContent = "Add New Product";
    document.getElementById("productFormSubmit").textContent = "Add Product";
    document.getElementById("productFormCancel").style.display = "none";
  }

  // I-confirm muna bago tanggalin ang product sa catalog.
  function deleteProduct(id) {
    const product = STORE.getProductById(id);
    if (!product) return;
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    const products = STORE.getProducts().filter((p) => p.id !== id);
    STORE.saveProducts(products);
    if (editingProductId === id) resetProductForm();
    STORE.showToast("Product deleted.", "success");
    renderAll();
  }

  // Magtanong ng dagdag na stock, i-validate ito, at i-save ang bagong quantity.
  function restockProduct(id) {
    const product = STORE.getProductById(id);
    if (!product) return;

    const quantityInput = window.prompt(`How many units of "${product.name}" would you like to add?`);
    if (quantityInput === null) return;

    const quantity = Number(quantityInput);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      STORE.showToast("Enter a valid whole number of units to restock (1 or more).", "error");
      return;
    }

    const products = STORE.getProducts();
    const productToRestock = products.find((item) => item.id === id);
    if (!productToRestock) {
      STORE.showToast("Product not found. Refresh the dashboard and try again.", "error");
      return;
    }

    const currentStock = Number(productToRestock.stock);
    if (!Number.isSafeInteger(currentStock) || currentStock < 0 || !Number.isSafeInteger(currentStock + quantity)) {
      STORE.showToast("Unable to restock this product because its stock quantity is invalid or too large.", "error");
      return;
    }

    productToRestock.stock = currentStock + quantity;
    STORE.saveProducts(products);
    STORE.showToast(`${product.name} restocked. New stock: ${productToRestock.stock}.`, "success");
    renderAll();
  }

  /* =========================================================
     Helpers
     ========================================================= */

  // Itapat ang order status sa CSS class para sa badge style.
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

  // Gumawa ng readable payment label para sa order table.
  function orderPaymentLabel(order) {
    const payment = order.payment;
    if (!payment || !payment.paymentMethod) return "";
    if (payment.accountLabel) {
      return payment.method === "paylater"
        ? `PayLater (${payment.months} months) — ${payment.accountLabel}`
        : payment.accountLabel;
    }
    const methodLabels = {
      cod: "Cash on Delivery (COD)",
      card: "Credit / Debit Card",
      ewallet: "E-wallet",
    };
    const method = methodLabels[payment.paymentMethod];
    if (!method) return "";
    return payment.method === "paylater"
      ? `PayLater (${payment.months} months) — ${method}`
      : method;
  }

  // Kunin ang total na kasama ang PayLater late fees kung meron.
  function orderPaymentTotal(order) {
    if (!order.payment || order.payment.method !== "paylater") return order.total;
    const fees = (order.payment.installments || [])
      .reduce((sum, installment) => sum + (Number(installment.lateFee) || 0), 0);
    return order.payment.totalPayable + fees;
  }

  // Ibuod kung ilang PayLater installments ang paid o overdue.
  function payLaterPaymentStatus(order) {
    const payment = order.payment;
    if (!payment || payment.method !== "paylater" || !Array.isArray(payment.installments)) return "";

    const total = payment.installments.length;
    const paid = payment.installments.filter((installment) =>
      installment.status === "paid" || Boolean(installment.paidAt)
    ).length;
    const unpaid = total - paid;
    const overdue = payment.installments.filter((installment) => installment.status === "overdue").length;

    if (total > 0 && paid === total) return "PAYLATER: PAID";
    if (overdue > 0) return `PAYLATER: ${paid}/${total} PAID · ${overdue} OVERDUE`;
    return `PAYLATER: ${paid}/${total} PAID · ${unpaid} NOT PAID`;
  }
})();
