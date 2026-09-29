// NEXUS COWORKING - FRONTEND CLIENT APPLICATION LOGIC (ENTERPRISE DEMO SUITE)
var currentFilterType = "hour";
var selectedSpace = null;
var selectedDate = nxToday();
var selectedTimeSlot = null;      // Texto "HH:MM - HH:MM" del rango elegido (modo por horas)
var selectedStartHour = null;     // Hora inicial (entero) del rango elegido
var selectedEndHour = null;       // Hora final (entero, exclusiva)
var selectedDaysCount = 1;
var selectedMonthPlan = 1;
var selectedAttendees = 1;
var selectedAddons = new Set();
var currentUser = null;
var currentRole = null;

var calculatedTotalCRC = 0;
var calculatedTotalUSD = 0;
var calculatedHours = 1;
var currentPaymentMethod = "sinpe";
var uploadedVoucherUrl = null;
var currentRescheduleBookingId = null;

const HOUR_SLOTS_START = 8;   // 08:00
const HOUR_SLOTS_END = 20;    // 20:00 (última franja 19:00 - 20:00)
const MAX_PDF_BYTES = 1.5 * 1024 * 1024;

function initNexusApp() {
  currentUser = NexusStorage.getCurrentUser();
  currentRole = NexusStorage.getAuthRole();
  initUserBadge();
  initNotificationBell();
  renderSpacesCatalog();
  setupFloorPlanInteractions();
  setupSearchEvents();
  setupClientPortalEvents();
  setupVoucherInput();

  // Si otra pestaña (p. ej. el panel admin) cambia reservas, refrescar disponibilidad.
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("nexus_bookings")) {
      renderSpacesCatalog(currentCategory, currentCapacity);
      refreshFloorPlanStatus();
    }
  });

  if (window.location.hash === "#login") {
    openAuthModal("login");
    showToast("Inicie sesión como Gerencia para acceder al panel administrativo.", "info");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNexusApp);
} else {
  initNexusApp();
}

// ---------------------------------------------------------------------------
// Usuario / navbar
// ---------------------------------------------------------------------------
function initUserBadge() {
  currentUser = NexusStorage.getCurrentUser();
  currentRole = NexusStorage.getAuthRole();

  const userBadgeEl = document.getElementById("navUserBadge");
  const navGuestActions = document.getElementById("navGuestActions");
  const navUserLoggedActions = document.getElementById("navUserLoggedActions");
  const navMyReservationsItem = document.getElementById("navMyReservationsItem");

  if (!currentUser) {
    if (navGuestActions) navGuestActions.style.display = "flex";
    if (navUserLoggedActions) navUserLoggedActions.style.display = "none";
    if (navMyReservationsItem) navMyReservationsItem.style.display = "none";
    return;
  }

  if (navGuestActions) navGuestActions.style.display = "none";
  if (navUserLoggedActions) navUserLoggedActions.style.display = "flex";
  if (navMyReservationsItem) navMyReservationsItem.style.display = currentRole === "admin" ? "none" : "block";

  if (!userBadgeEl) return;

  if (currentRole === "admin") {
    userBadgeEl.innerHTML = `
      <div class="user-avatar" style="background: var(--grad-gold);">👑</div>
      <div style="text-align: left;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #FFF; line-height: 1.2;">Lic. Roberto Alvarado</div>
        <span class="user-tier-badge" style="background: rgba(224, 122, 95, 0.2); color: var(--champagne);">Gerencia General · Ir al Panel</span>
      </div>
    `;
    userBadgeEl.onclick = () => { window.location.href = "admin.html"; };
  } else {
    const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U";
    userBadgeEl.innerHTML = `
      <div class="user-avatar">${nxEscape(initial)}</div>
      <div style="text-align: left;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #FFF; line-height: 1.2;">${nxEscape(currentUser.name)}</div>
        <span class="user-tier-badge">⭐ ${nxEscape(currentUser.loyaltyTier || 'Socio')}</span>
      </div>
    `;
    userBadgeEl.onclick = () => openClientPortalModal();
  }
}

// Notification Bell (el portal público no la muestra; la campana vive en el panel admin)
function initNotificationBell() {
  const bellBtn = document.getElementById("notifBellBtn");
  const dropdown = document.getElementById("notifDropdown");
  const container = document.getElementById("notifItemsContainer");
  const badge = document.getElementById("notifCountBadge");
  if (!bellBtn || !dropdown) return;

  bellBtn.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle("open"); };
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== bellBtn) dropdown.classList.remove("open");
  });

  const notifs = NexusStorage.getNotifications();
  if (badge) badge.textContent = notifs.filter(n => n.unread).length;
  if (container) {
    container.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.unread ? 'unread' : ''}">
        <div class="notif-title">${nxEscape(n.title)}</div>
        <div class="notif-desc">${nxEscape(n.message)}</div>
        <div class="notif-time">${nxEscape(n.time)}</div>
      </div>
    `).join("");
  }
}

// ---------------------------------------------------------------------------
// Catálogo, filtros y plano
// ---------------------------------------------------------------------------
var currentCategory = "all";
var currentCapacity = "all";

window.renderSpacesCatalog = function(filterCategory = currentCategory, minCapacity = currentCapacity) {
  currentCategory = filterCategory;
  currentCapacity = minCapacity;
  const grid = document.getElementById("spacesGrid");
  if (!grid) return;
  const spaces = NexusStorage.getSpaces();
  const bookings = NexusStorage.getBookings();

  const filtered = spaces.filter(sp => {
    if (filterCategory !== "all" && sp.category !== filterCategory) return false;
    if (minCapacity !== "all") {
      const cap = parseInt(minCapacity, 10);
      if (cap === 1 && sp.capacity > 2) return false;
      if (cap === 5 && (sp.capacity < 2 || sp.capacity > 6)) return false;
      if (cap === 12 && (sp.capacity < 7 || sp.capacity > 15)) return false;
      if (cap === 25 && sp.capacity < 16) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
        <div style="font-size: 2.2rem; margin-bottom: 10px;">🔍</div>
        <h4 style="color: #FFF; font-size: 1.15rem; margin-bottom: 6px;">No se encontraron espacios para este filtro</h4>
        <p style="color: #B8A99A; font-size: 0.88rem; margin-bottom: 16px;">Pruebe seleccionando 'Todas las salas y suites' o 'Cualquier aforo'.</p>
        <button class="btn btn-secondary btn-sm" onclick="resetFilters()">Restablecer Todos los Filtros</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(sp => {
    let priceDisplay = "";
    if (currentFilterType === "hour") {
      priceDisplay = `${nxFormatCRC(sp.priceHour)} <span class="price-sub">/ hora ($${sp.priceHourUSD})</span>`;
    } else if (currentFilterType === "day") {
      priceDisplay = `${nxFormatCRC(sp.priceDay)} <span class="price-sub">/ jornada ($${sp.priceDayUSD})</span>`;
    } else {
      priceDisplay = `${nxFormatCRC(sp.priceMonth)} <span class="price-sub">/ mes ($${sp.priceMonthUSD})</span>`;
    }

    const busyNow = nxIsSpaceBusyNow(bookings, sp.id);
    const bookedToday = bookings.some(b => b.spaceId === sp.id && nxIsActiveBooking(b) && nxBookingCoversDate(b, nxToday()));
    const statusBadge = busyNow
      ? `<div class="status-dot-badge"><span class="dot-busy"></span> En uso ahora</div>`
      : (bookedToday
        ? `<div class="status-dot-badge"><span class="dot-busy"></span> Con reservas hoy</div>`
        : `<div class="status-dot-badge"><span class="dot-free"></span> Disponible hoy</div>`);

    const safeImg = sp.image || "assets/room_horizon.svg";

    return `
      <div class="space-card" data-space-id="${sp.id}" onclick="openBookingModal('${sp.id}')" style="cursor: pointer;">
        <div class="card-img-wrap">
          <img src="${safeImg}" alt="${nxEscape(sp.name)}" class="card-img" onerror="this.onerror=null;this.src='assets/room_horizon.svg'">
          <span class="card-badge ${getBadgeClass(sp.badge)}">${nxEscape(sp.badge)}</span>
          ${statusBadge}
        </div>
        <div class="card-body">
          <h3 class="card-title">${nxEscape(sp.name)}</h3>
          <div class="card-meta">
            <span>👥 Capacidad: ${sp.capacity} ${sp.capacity === 1 ? 'persona' : 'personas'}</span>
            <span>📍 ${nxEscape(sp.floor)}</span>
          </div>
          <p class="card-desc">${nxEscape(sp.description)}</p>
          <div class="amenities-tags">
            ${sp.amenities.map(a => `<span class="tag">✓ ${nxEscape(a)}</span>`).join("")}
          </div>
          <div class="card-pricing-row">
            <div class="price-box">
              <span class="price-amount" style="font-size: 1.28rem; font-weight: 700; color: #FFF; font-family: 'Plus Jakarta Sans', sans-serif;">${priceDisplay}</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openRoomCalendarModal('${sp.id}')" title="Ver agenda completa">
                📅 Calendario
              </button>
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openBookingModal('${sp.id}')">
                Reservar ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
};

function getBadgeClass(badge) {
  if (!badge) return "badge-flex";
  if (badge.includes("VIP")) return "badge-vip";
  if (badge.includes("Suite") || badge.includes("Privada")) return "badge-private";
  if (badge.includes("Acústica")) return "badge-pod";
  return "badge-flex";
}

function refreshFloorPlanStatus() {
  const spaces = NexusStorage.getSpaces();
  const bookings = NexusStorage.getBookings();
  document.querySelectorAll(".fp-zone").forEach(zone => {
    const space = spaces.find(s => s.zoneId === zone.getAttribute("id"));
    if (!space) return;
    const busy = nxIsSpaceBusyNow(bookings, space.id);
    zone.classList.toggle("zone-busy", busy);
    zone.classList.toggle("zone-available", !busy);
  });
}

// Interactive 2D Floor Plan
function setupFloorPlanInteractions() {
  const zones = document.querySelectorAll(".fp-zone");
  const previewDrawer = document.getElementById("fpPreviewDrawer");
  const spaces = NexusStorage.getSpaces();
  refreshFloorPlanStatus();

  zones.forEach(zone => {
    const space = spaces.find(s => s.zoneId === zone.getAttribute("id"));
    if (!space) return;

    zone.addEventListener("mouseenter", () => {
      if (!previewDrawer) return;
      const busy = nxIsSpaceBusyNow(NexusStorage.getBookings(), space.id);
      previewDrawer.style.display = "block";
      previewDrawer.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 10px;">
          <img src="${space.image || 'assets/room_horizon.svg'}" onerror="this.onerror=null;this.src='assets/room_horizon.svg'" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-gold);">
          <div>
            <h4 style="color: #FFF; font-size: 0.98rem;">${nxEscape(space.name)}</h4>
            <span style="font-size: 0.78rem; color: ${busy ? 'var(--rosewood)' : 'var(--sage-green)'};">● ${busy ? 'En uso en este momento' : 'Disponible para agendar'}</span>
          </div>
        </div>
        <p style="font-size: 0.82rem; color: #B8A99A; margin-bottom: 14px;">${nxEscape(space.description.slice(0, 88))}...</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: var(--champagne); font-size: 0.95rem; font-family: 'Plus Jakarta Sans', sans-serif;">${nxFormatCRC(space.priceHour)} / hr</span>
          <button class="btn btn-primary btn-sm" id="fpQuickBookBtn">Reservar</button>
        </div>
      `;
      document.getElementById("fpQuickBookBtn").onclick = () => openBookingModal(space.id);
    });

    zone.addEventListener("click", () => openBookingModal(space.id));
  });
}

window.applyFilters = function() {
  const categorySelect = document.getElementById("searchCategory");
  const capacitySelect = document.getElementById("searchCapacity");
  renderSpacesCatalog(categorySelect ? categorySelect.value : "all", capacitySelect ? capacitySelect.value : "all");
};

window.resetFilters = function() {
  const categorySelect = document.getElementById("searchCategory");
  const capacitySelect = document.getElementById("searchCapacity");
  if (categorySelect) categorySelect.value = "all";
  if (capacitySelect) capacitySelect.value = "all";
  renderSpacesCatalog("all", "all");
};

window.setFilterType = function(type) {
  currentFilterType = type;
  ["pillHour", "pillDay", "pillMonth"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
  });
  const map = { hour: "pillHour", day: "pillDay", month: "pillMonth" };
  const active = document.getElementById(map[type]);
  if (active) active.classList.add("active");
  applyFilters();
};

function setupSearchEvents() {
  const categorySelect = document.getElementById("searchCategory");
  const capacitySelect = document.getElementById("searchCapacity");
  const btnSearch = document.getElementById("btnFilterSearch");
  if (categorySelect) categorySelect.onchange = applyFilters;
  if (capacitySelect) capacitySelect.onchange = applyFilters;
  if (btnSearch) {
    btnSearch.onclick = () => {
      applyFilters();
      const catSection = document.getElementById("catalogo");
      if (catSection) catSection.scrollIntoView({ behavior: "smooth" });
    };
  }
}

// ---------------------------------------------------------------------------
// Calendario individual de sala (próximos 4 días, dinámico)
// ---------------------------------------------------------------------------
window.openRoomCalendarModal = function(spaceId) {
  const space = NexusStorage.getSpaces().find(s => s.id === spaceId);
  if (!space) return;

  const modal = document.getElementById("roomCalendarModal");
  document.getElementById("roomCalModalTitle").textContent = space.name;
  document.getElementById("roomCalModalSub").textContent = `📍 ${space.floor} · Capacidad: ${space.capacity} personas · ${space.badge}`;

  const container = document.getElementById("roomCalModalGridContainer");
  const bookings = NexusStorage.getBookings().filter(b => b.spaceId === space.id && nxIsActiveBooking(b));
  const days = [0, 1, 2, 3].map(i => nxAddDays(nxToday(), i));

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
      ${days.map(d => {
        const dayB = bookings.filter(b => nxBookingCoversDate(b, d)).sort((a, b) => a.timeStart.localeCompare(b.timeStart));
        return `
          <div style="background: rgba(36,29,25,0.45); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 12px;">
            <div style="font-weight: 700; color: #FFF; font-size: 0.88rem; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">
              ${nxEscape(nxFormatDayLabel(d))}
            </div>
            ${dayB.length === 0 ? `<div style="font-size: 0.78rem; color: var(--sage-green);">✓ Todo el día libre</div>` : ''}
            ${dayB.map(b => `
              <div style="background: rgba(201, 90, 83, 0.15); border-left: 2px solid var(--rosewood); padding: 6px 8px; border-radius: 4px; margin-bottom: 6px;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #FFF;">⏰ ${nxEscape(b.timeStart)} - ${nxEscape(b.timeEnd)}</div>
                <div style="font-size: 0.72rem; color: #B8A99A;">Ocupado${b.status === 'pending_sinpe' ? ' (pago en validación)' : ''}</div>
              </div>
            `).join("")}
          </div>
        `;
      }).join("")}
    </div>
  `;

  document.getElementById("roomCalModalBookBtn").onclick = () => {
    closeRoomCalendarModal();
    openBookingModal(space.id);
  };

  modal.classList.add("open");
};

window.closeRoomCalendarModal = function() {
  document.getElementById("roomCalendarModal").classList.remove("open");
};

// ---------------------------------------------------------------------------
// Modal de reserva
// ---------------------------------------------------------------------------
function resetBookingState() {
  selectedAddons.clear();
  selectedTimeSlot = null;
  selectedStartHour = null;
  selectedEndHour = null;
  selectedDaysCount = 1;
  selectedMonthPlan = 1;
  selectedAttendees = 1;
  if (selectedDate < nxToday()) selectedDate = nxToday();
  uploadedVoucherUrl = null;
  calculatedTotalCRC = 0;
  calculatedTotalUSD = 0;

  const ref = document.getElementById("sinpeRefInput");
  if (ref) ref.value = "";
  const file = document.getElementById("sinpeFile");
  if (file) file.value = "";
  const label = document.getElementById("sinpeUploadLabel");
  if (label) {
    label.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 6px;">📎</div>
      <div style="color: #FFF; font-weight: 600; font-size: 0.94rem;">Haga clic o arrastre el comprobante digital</div>
      <div style="font-size: 0.78rem; color: #B8A99A;">Formatos permitidos: PNG, JPG (se optimiza automáticamente) o PDF (máx. 1.5 MB)</div>
    `;
  }
  selectPaymentTab("sinpe");
  const btn = document.getElementById("btnFinalizeBooking");
  if (btn) btn.disabled = false;
}

window.openBookingModal = function(spaceId) {
  const spaces = NexusStorage.getSpaces();
  selectedSpace = spaces.find(s => s.id === spaceId);
  if (!selectedSpace) return;

  resetBookingState();

  const modal = document.getElementById("bookingModal");
  document.getElementById("modalSpaceTitle").textContent = selectedSpace.name;
  document.getElementById("modalSpaceMeta").textContent = `📍 ${selectedSpace.floor} | 👥 Capacidad: ${selectedSpace.capacity} pers. | ⭐ ${selectedSpace.badge}`;

  switchModalStep(1);
  renderBookingModeStep1();
  renderAddonsSelector();
  modal.classList.add("open");
};

window.closeModal = function() {
  document.getElementById("bookingModal").classList.remove("open");
};

window.switchModalStep = function(stepNum) {
  document.querySelectorAll(".modal-step-content").forEach(el => el.style.display = "none");
  document.getElementById(`modalStep${stepNum}`).style.display = "block";

  document.querySelectorAll(".wizard-step").forEach((step, idx) => {
    step.classList.remove("active", "completed");
    if (idx + 1 === stepNum) step.classList.add("active");
    if (idx + 1 < stepNum) step.classList.add("completed");
  });

  if (stepNum === 3) renderCheckoutSummary();
};

function attendeesFieldHtml() {
  return `
    <div class="field-group">
      <label class="field-label">Asistentes (máx. ${selectedSpace.capacity})</label>
      <input type="number" id="attendeesInput" class="field-input" min="1" max="${selectedSpace.capacity}" value="${selectedAttendees}">
    </div>
  `;
}

function bindAttendeesInput() {
  const input = document.getElementById("attendeesInput");
  if (!input) return;
  input.onchange = (e) => {
    let v = parseInt(e.target.value, 10) || 1;
    v = Math.max(1, Math.min(selectedSpace.capacity, v));
    e.target.value = v;
    selectedAttendees = v;
  };
}

// Render Step 1 depending on whether it's Hour, Day, or Month
function renderBookingModeStep1() {
  const container = document.getElementById("bookingModeContainer");
  if (!container || !selectedSpace) return;
  const today = nxToday();

  if (currentFilterType === "hour") {
    container.innerHTML = `
      <div class="room-cal-matrix">
        <div class="cal-header-row">
          <span style="font-weight: 700; color: #FFFFFF; font-size: 0.96rem;">📅 Reserva por Horas: Disponibilidad de la Sala</span>
          <input type="date" id="bookingModalDate" class="field-input" min="${today}" value="${selectedDate}" style="padding: 6px 14px; width: auto;">
        </div>
        <p style="font-size: 0.84rem; color: #B8A99A; margin-bottom: 14px;">
          Haga clic en la hora de inicio y luego en la última hora que necesita (bloques continuos). Los horarios tachados ya están ocupados.
        </p>
        <div class="cal-grid-slots" id="modalSlotsContainer"></div>
        <div id="slotSelectionInfo" style="font-size: 0.84rem; color: var(--gold-warm); margin-top: 10px;"></div>
        <div style="max-width: 220px; margin-top: 12px;">${attendeesFieldHtml()}</div>
      </div>
    `;
    renderHourSlots();
  } else if (currentFilterType === "day") {
    container.innerHTML = `
      <div class="room-cal-matrix">
        <div class="cal-header-row">
          <span style="font-weight: 700; color: #FFFFFF; font-size: 0.96rem;">📅 Reserva por Jornadas Completas</span>
        </div>
        <p style="font-size: 0.84rem; color: #B8A99A; margin-bottom: 16px;">
          Acceso exclusivo al espacio de 08:00 a 18:00 durante las fechas seleccionadas (días consecutivos).
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
          <div class="field-group">
            <label class="field-label">Fecha de Inicio</label>
            <input type="date" id="dayStartDate" class="field-input" min="${today}" value="${selectedDate}">
          </div>
          <div class="field-group">
            <label class="field-label">Cantidad de Jornadas / Días</label>
            <select id="dayCountSelect" class="field-select">
              <option value="1">1 Jornada (Día Completo)</option>
              <option value="2">2 Jornadas</option>
              <option value="3">3 Jornadas</option>
              <option value="5">5 Jornadas</option>
              <option value="10">10 Jornadas</option>
            </select>
          </div>
          ${attendeesFieldHtml()}
        </div>
      </div>
    `;
    const daySelect = document.getElementById("dayCountSelect");
    daySelect.value = String(selectedDaysCount);
    daySelect.onchange = (e) => { selectedDaysCount = parseInt(e.target.value, 10); };
    document.getElementById("dayStartDate").onchange = (e) => { selectedDate = e.target.value; };
  } else { // Month
    container.innerHTML = `
      <div class="room-cal-matrix">
        <div class="cal-header-row">
          <span style="font-weight: 700; color: #FFFFFF; font-size: 0.96rem;">🏢 Membresía Mensual de Espacio</span>
        </div>
        <p style="font-size: 0.84rem; color: #B8A99A; margin-bottom: 16px;">
          Acceso continuo 24/7 con cerradura inteligente y domicilio comercial incluido (bloques de 30 días).
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
          <div class="field-group">
            <label class="field-label">Fecha de Inicio</label>
            <input type="date" id="monthStartDate" class="field-input" min="${today}" value="${selectedDate}">
          </div>
          <div class="field-group">
            <label class="field-label">Plazo de Contratación</label>
            <select id="monthPlanSelect" class="field-select">
              <option value="1">1 Mes Renovación Estándar</option>
              <option value="3">3 Meses (10% de descuento incluido)</option>
              <option value="6">6 Meses (15% de descuento corporativo)</option>
              <option value="12">12 Meses Anual (20% de descuento corporativo)</option>
            </select>
          </div>
          ${attendeesFieldHtml()}
        </div>
      </div>
    `;
    const mPlan = document.getElementById("monthPlanSelect");
    mPlan.value = String(selectedMonthPlan);
    mPlan.onchange = (e) => { selectedMonthPlan = parseInt(e.target.value, 10); };
    document.getElementById("monthStartDate").onchange = (e) => { selectedDate = e.target.value; };
  }
  bindAttendeesInput();
}

function isHourBooked(bookings, hour) {
  return !!nxFindOverlap(bookings, selectedSpace.id, selectedDate, selectedDate,
    nxMinToTime(hour * 60), nxMinToTime((hour + 1) * 60), null);
}

function isHourInPast(hour) {
  if (selectedDate !== nxToday()) return false;
  return hour < new Date().getHours() + 1; // se reserva desde la próxima hora completa
}

function renderHourSlots() {
  const container = document.getElementById("modalSlotsContainer");
  const dateInput = document.getElementById("bookingModalDate");
  const info = document.getElementById("slotSelectionInfo");
  if (!container || !selectedSpace) return;

  dateInput.value = selectedDate;
  dateInput.onchange = (e) => {
    selectedDate = e.target.value < nxToday() ? nxToday() : e.target.value;
    selectedStartHour = selectedEndHour = null;
    selectedTimeSlot = null;
    renderHourSlots();
  };

  const bookings = NexusStorage.getBookings();
  let html = "";
  for (let h = HOUR_SLOTS_START; h < HOUR_SLOTS_END; h++) {
    const label = `${nxMinToTime(h * 60)} - ${nxMinToTime((h + 1) * 60)}`;
    if (isHourBooked(bookings, h)) {
      html += `<button type="button" class="slot-btn booked" title="Espacio Ocupado" disabled>${label} (Ocupado)</button>`;
    } else if (isHourInPast(h)) {
      html += `<button type="button" class="slot-btn booked" title="Horario ya transcurrido" disabled>${label} (Pasado)</button>`;
    } else {
      const inRange = selectedStartHour !== null && h >= selectedStartHour && h < selectedEndHour;
      html += `<button type="button" class="slot-btn ${inRange ? 'selected' : ''}" data-hour="${h}">${label}</button>`;
    }
  }
  container.innerHTML = html;

  container.querySelectorAll(".slot-btn:not(.booked)").forEach(btn => {
    btn.addEventListener("click", () => {
      const h = parseInt(btn.getAttribute("data-hour"), 10);
      const singleSelected = selectedStartHour !== null && selectedEndHour === selectedStartHour + 1;
      if (singleSelected && h > selectedStartHour) {
        // Extender el rango si todas las horas intermedias están libres
        for (let x = selectedStartHour; x <= h; x++) {
          if (isHourBooked(bookings, x) || isHourInPast(x)) {
            showToast("⚠️ El rango incluye horarios ocupados. Elija un bloque continuo libre.", "warning");
            return;
          }
        }
        selectedEndHour = h + 1;
      } else {
        selectedStartHour = h;
        selectedEndHour = h + 1;
      }
      selectedTimeSlot = `${nxMinToTime(selectedStartHour * 60)} - ${nxMinToTime(selectedEndHour * 60)}`;
      renderHourSlots();
    });
  });

  if (info) {
    info.textContent = selectedTimeSlot
      ? `Seleccionado: ${selectedTimeSlot} (${selectedEndHour - selectedStartHour} h)`
      : "";
  }
}

function renderAddonsSelector() {
  const list = document.getElementById("addonsList");
  if (!list) return;

  list.innerHTML = NEXUS_DATA.addons.map(addon => `
    <div class="addon-item" data-addon-id="${addon.id}">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.35rem;">${addon.icon}</span>
        <div>
          <div style="font-weight: 600; color: #FFF; font-size: 0.92rem;">${nxEscape(addon.name)}</div>
          <div style="font-size: 0.76rem; color: var(--gold-warm);">+${nxFormatCRC(addon.price)} ($${addon.priceUSD}) ${nxEscape(addon.unit)}</div>
        </div>
      </div>
      <input type="checkbox" class="addon-checkbox" data-id="${addon.id}" style="width: 18px; height: 18px; accent-color: #E07A5F; cursor: pointer;">
    </div>
  `).join("");

  list.querySelectorAll(".addon-item").forEach(item => {
    const chk = item.querySelector(".addon-checkbox");
    item.addEventListener("click", (e) => {
      if (e.target !== chk) chk.checked = !chk.checked;
      const id = chk.getAttribute("data-id");
      if (chk.checked) {
        selectedAddons.add(id);
        item.classList.add("selected");
      } else {
        selectedAddons.delete(id);
        item.classList.remove("selected");
      }
    });
  });
}

// Rango de fechas/horas que ocupa la selección actual
function getRequestedRange() {
  if (currentFilterType === "hour") {
    return {
      date: selectedDate, endDate: selectedDate,
      timeStart: nxMinToTime(selectedStartHour * 60), timeEnd: nxMinToTime(selectedEndHour * 60),
      hours: selectedEndHour - selectedStartHour, billableDays: 1
    };
  }
  if (currentFilterType === "day") {
    return {
      date: selectedDate, endDate: nxAddDays(selectedDate, selectedDaysCount - 1),
      timeStart: "08:00", timeEnd: "18:00", hours: 10 * selectedDaysCount, billableDays: selectedDaysCount
    };
  }
  return {
    date: selectedDate, endDate: nxAddDays(selectedDate, 30 * selectedMonthPlan - 1),
    timeStart: "00:00", timeEnd: "23:59", hours: 0, billableDays: 22 * selectedMonthPlan
  };
}

function addonQuantity(addon, range) {
  if (addon.unitType === "person") return selectedAttendees;
  if (addon.unitType === "day") return range.billableDays;
  return 1;
}

window.validateStep1 = function() {
  if (currentFilterType === "hour" && (!selectedTimeSlot || selectedStartHour === null)) {
    showToast("⚠️ Por favor selecciona una franja horaria disponible.", "warning");
    return;
  }
  if (!selectedDate || selectedDate < nxToday()) {
    showToast("⚠️ La fecha de inicio no puede ser anterior a hoy.", "warning");
    return;
  }
  const range = getRequestedRange();
  const clash = nxFindOverlap(NexusStorage.getBookings(), selectedSpace.id, range.date, range.endDate, range.timeStart, range.timeEnd, null);
  if (clash) {
    showToast(`⚠️ El espacio ya está reservado el ${clash.date} de ${clash.timeStart} a ${clash.timeEnd}. Elija otras fechas.`, "warning");
    return;
  }

  const fields = { custName: "name", custIdNumber: "idNumber", custEmail: "email", custPhone: "phone", custCompany: "company", custEmergency: "emergencyContact" };
  Object.entries(fields).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (el) el.value = (currentUser && currentRole !== "admin" && currentUser[key]) ? currentUser[key] : "";
  });

  switchModalStep(2);
};

window.validateStep2 = function() {
  const name = document.getElementById("custName").value.trim();
  const idNum = document.getElementById("custIdNumber").value.trim();
  const email = document.getElementById("custEmail").value.trim();
  const phone = document.getElementById("custPhone").value.trim();

  if (!name || !idNum || !email || !phone) {
    showToast("⚠️ Por favor completa los campos requeridos del socio.", "warning");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("⚠️ El correo electrónico no es válido.", "warning");
    return;
  }

  const clients = NexusStorage.getClients();
  if (!currentUser || currentRole === "admin") {
    // Si el correo ya existe, se reutiliza el socio (conserva su nivel de fidelidad)
    const existing = clients.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
    currentUser = existing || {
      id: "cli-" + Date.now(),
      loyaltyTier: "Nuevo Socio",
      discountRate: 0.0,
      totalHoursBooked: 0,
      totalSpentCRC: 0,
      registeredSince: nxToday()
    };
    if (!existing) clients.unshift(currentUser);
  }
  Object.assign(currentUser, {
    name: name,
    idNumber: idNum,
    email: email,
    phone: phone,
    company: document.getElementById("custCompany").value.trim() || currentUser.company || "Independiente",
    emergencyContact: document.getElementById("custEmergency").value.trim()
  });
  const idx = clients.findIndex(c => c.id === currentUser.id);
  if (idx >= 0) clients[idx] = currentUser;
  NexusStorage.saveClients(clients);
  NexusStorage.setCurrentUser(currentUser);
  NexusStorage.setAuthRole("client");
  initUserBadge();

  switchModalStep(3);
};

function renderCheckoutSummary() {
  const summaryBox = document.getElementById("checkoutSummary");
  if (!summaryBox || !selectedSpace) return;

  const range = getRequestedRange();
  let baseRateCRC, baseRateUSD, durationLabel;

  if (currentFilterType === "day") {
    baseRateCRC = selectedSpace.priceDay * selectedDaysCount;
    baseRateUSD = selectedSpace.priceDayUSD * selectedDaysCount;
    durationLabel = `${selectedDaysCount} ${selectedDaysCount === 1 ? 'jornada completa' : 'jornadas completas'} · hasta ${range.endDate}`;
  } else if (currentFilterType === "month") {
    let termDiscount = 1;
    if (selectedMonthPlan === 3) termDiscount = 0.90;
    if (selectedMonthPlan === 6) termDiscount = 0.85;
    if (selectedMonthPlan === 12) termDiscount = 0.80;
    baseRateCRC = Math.round(selectedSpace.priceMonth * selectedMonthPlan * termDiscount);
    baseRateUSD = Math.round(selectedSpace.priceMonthUSD * selectedMonthPlan * termDiscount);
    durationLabel = `Plan de ${selectedMonthPlan} ${selectedMonthPlan === 1 ? 'mes' : 'meses'} · hasta ${range.endDate}`;
  } else {
    baseRateCRC = selectedSpace.priceHour * range.hours;
    baseRateUSD = selectedSpace.priceHourUSD * range.hours;
    durationLabel = `${selectedTimeSlot} · ${range.hours} h`;
  }
  calculatedHours = range.hours;

  let addonsTotalCRC = 0;
  let addonsTotalUSD = 0;
  const addonLines = NEXUS_DATA.addons.filter(a => selectedAddons.has(a.id)).map(a => {
    const qty = addonQuantity(a, range);
    addonsTotalCRC += a.price * qty;
    addonsTotalUSD += a.priceUSD * qty;
    return { a, qty };
  });

  const subtotalCRC = baseRateCRC + addonsTotalCRC;
  const discountRate = (currentUser && currentRole !== "admin") ? (currentUser.discountRate || 0) : 0;
  const discountCRC = Math.round(subtotalCRC * discountRate);
  calculatedTotalCRC = subtotalCRC - discountCRC;
  calculatedTotalUSD = Math.round((baseRateUSD + addonsTotalUSD) * (1 - discountRate));

  summaryBox.innerHTML = `
    <div class="summary-row">
      <span>Espacio: <strong>${nxEscape(selectedSpace.name)}</strong></span>
      <span>${nxFormatCRC(baseRateCRC)}</span>
    </div>
    <div class="summary-row">
      <span>Modalidad & Programación:</span>
      <span>${nxEscape(selectedDate)} (${nxEscape(durationLabel)})</span>
    </div>
    <div class="summary-row" style="font-size: 0.84rem; color: #B8A99A;">
      <span>Asistentes:</span><span>${selectedAttendees}</span>
    </div>
    ${addonLines.map(({ a, qty }) => `
      <div class="summary-row" style="font-size: 0.84rem; color: #B8A99A;">
        <span>+ ${nxEscape(a.name)}${qty > 1 ? ` × ${qty}` : ''}</span>
        <span>${nxFormatCRC(a.price * qty)}</span>
      </div>
    `).join("")}
    ${discountRate > 0 ? `
      <div class="summary-row" style="color: var(--gold-warm);">
        <span>Descuento de Socio (${nxEscape(currentUser.loyaltyTier)} - ${Math.round(discountRate * 100)}%):</span>
        <span>-${nxFormatCRC(discountCRC)}</span>
      </div>
    ` : ''}
    <div class="summary-row total">
      <span>Total a Pagar:</span>
      <span style="color: var(--terracotta);">${nxFormatCRC(calculatedTotalCRC)} <span style="font-size: 0.88rem; font-weight: normal; color: var(--gold-warm);">($${calculatedTotalUSD} USD)</span></span>
    </div>
  `;

  document.getElementById("sinpeTotalCRC").textContent = `${nxFormatCRC(calculatedTotalCRC)} CRC`;
}

window.selectPaymentTab = function(method) {
  currentPaymentMethod = method;
  document.querySelectorAll(".pay-tab").forEach(tab => tab.classList.remove("active"));
  const sinpe = document.getElementById("sinpeContainer");
  const card = document.getElementById("cardContainer");
  if (method === "sinpe") {
    document.getElementById("tabSinpe").classList.add("active");
    if (sinpe) sinpe.style.display = "block";
    if (card) card.style.display = "none";
  } else {
    document.getElementById("tabCard").classList.add("active");
    if (sinpe) sinpe.style.display = "none";
    if (card) card.style.display = "block";
  }
};

// Instant Demo SINPE Vouchers
window.loadDemoVoucher = function(type) {
  if (type === "bac") {
    uploadedVoucherUrl = "assets/voucher_bac.svg";
    document.getElementById("sinpeRefInput").value = "BAC-" + Math.floor(100000 + Math.random() * 900000);
    document.getElementById("sinpeUploadLabel").innerHTML = `
      <div style="color: var(--sage-green); font-weight: 700;">✓ Comprobante Demo BAC San José Vinculado</div>
      <div style="font-size: 0.8rem; color: #B8A99A;">transferencia_bac_verificada.svg</div>
    `;
  } else {
    uploadedVoucherUrl = "assets/voucher_bn.svg";
    document.getElementById("sinpeRefInput").value = "BNCR-" + Math.floor(100000 + Math.random() * 900000);
    document.getElementById("sinpeUploadLabel").innerHTML = `
      <div style="color: var(--sage-green); font-weight: 700;">✓ Comprobante Demo Banco Nacional Vinculado</div>
      <div style="font-size: 0.8rem; color: #B8A99A;">recibo_sinpe_bncr.svg</div>
    `;
  }
  showToast("✓ Comprobante bancario simulado cargado con éxito.", "success");
};

// Reduce la foto del comprobante (máx. 1200 px, JPEG) para no desbordar localStorage (~5 MB).
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function setupVoucherInput() {
  const voucherInput = document.getElementById("sinpeFile");
  if (!voucherInput) return;
  voucherInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const label = document.getElementById("sinpeUploadLabel");
    try {
      if (file.type === "application/pdf") {
        if (file.size > MAX_PDF_BYTES) {
          showToast("⚠️ El PDF supera 1.5 MB. Adjunte una captura (imagen) del comprobante.", "warning");
          voucherInput.value = "";
          return;
        }
        uploadedVoucherUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
      } else if (file.type.startsWith("image/")) {
        uploadedVoucherUrl = await compressImageFile(file);
      } else {
        showToast("⚠️ Formato no permitido. Use una imagen (PNG/JPG) o PDF.", "warning");
        voucherInput.value = "";
        return;
      }
      label.innerHTML = `
        <div style="color: var(--sage-green); font-weight: 700;">✓ Archivo cargado exitosamente</div>
        <div style="font-size: 0.8rem; color: #B8A99A;">${nxEscape(file.name)} (${(file.size / 1024).toFixed(1)} KB)</div>
      `;
    } catch (err) {
      uploadedVoucherUrl = null;
      showToast("⚠️ No se pudo leer el archivo. Intente con otra imagen.", "warning");
    }
  });
}

// Validación básica de tarjeta (demo): Luhn + vencimiento + CVC
function validateCardForm() {
  const num = (document.getElementById("cardNumber") || {}).value || "";
  const exp = (document.getElementById("cardExp") || {}).value || "";
  const cvc = (document.getElementById("cardCvc") || {}).value || "";
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return "Número de tarjeta inválido.";
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  if (sum % 10 !== 0) return "Número de tarjeta inválido.";
  const m = exp.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m || +m[1] < 1 || +m[1] > 12) return "Vencimiento inválido (MM/AA).";
  const expEnd = new Date(2000 + +m[2], +m[1], 1);
  if (expEnd <= new Date()) return "La tarjeta está vencida.";
  if (!/^\d{3,4}$/.test(cvc)) return "CVC inválido.";
  return null;
}

// Payment Execution
window.processBookingPayment = function() {
  const btn = document.getElementById("btnFinalizeBooking");
  if (btn && btn.disabled) return;
  const bookingId = "RES-" + Date.now().toString().slice(-6);

  let sinpeRef = null;
  let initialStatus = "confirmed";

  if (currentPaymentMethod === "sinpe") {
    sinpeRef = document.getElementById("sinpeRefInput").value.trim();
    if (!sinpeRef) {
      showToast("⚠️ Ingrese el número de referencia del comprobante SINPE.", "warning");
      return;
    }
    if (!uploadedVoucherUrl) {
      showToast("⚠️ Adjunte el comprobante SINPE (o use un comprobante demo).", "warning");
      return;
    }
    initialStatus = "pending_sinpe";
  } else {
    const cardError = validateCardForm();
    if (cardError) {
      showToast("⚠️ " + cardError, "warning");
      return;
    }
  }

  if (currentPaymentMethod === "card") {
    btn.innerHTML = "⏳ Procesando pago seguro...";
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = "Confirmar &amp; Finalizar Reserva ➔";
      btn.disabled = false;
      finalizeBookingCreation(bookingId, sinpeRef, initialStatus);
    }, 700);
  } else {
    finalizeBookingCreation(bookingId, sinpeRef, initialStatus);
  }
};

function finalizeBookingCreation(bookingId, sinpeRef, initialStatus) {
  const range = getRequestedRange();
  const nowIso = new Date().toISOString();
  const newBooking = {
    id: bookingId,
    spaceId: selectedSpace.id,
    spaceName: selectedSpace.name,
    clientId: currentUser ? currentUser.id : ("cli-" + Date.now()),
    clientName: currentUser ? currentUser.name : "Cliente Invitado",
    clientEmail: currentUser ? currentUser.email : "",
    clientPhone: currentUser ? currentUser.phone : "",
    company: currentUser ? currentUser.company : "",
    bookingType: currentFilterType,
    date: range.date,
    endDate: range.endDate,
    timeStart: range.timeStart,
    timeEnd: range.timeEnd,
    hours: range.hours,
    attendees: selectedAttendees,
    addons: Array.from(selectedAddons),
    totalCRC: calculatedTotalCRC,
    totalUSD: calculatedTotalUSD,
    paymentMethod: currentPaymentMethod,
    sinpeRef: sinpeRef,
    sinpeVoucherUrl: currentPaymentMethod === "sinpe" ? uploadedVoucherUrl : null,
    sinpeSubmittedAt: currentPaymentMethod === "sinpe" ? nowIso : null,
    status: initialStatus,
    qrCodeData: `NEXUS-${bookingId}-${selectedSpace.id}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    createdAt: nowIso,
    approvedAt: initialStatus === "confirmed" ? nowIso : null
  };

  // Verificación final contra los datos más recientes (otra pestaña pudo reservar mientras tanto)
  const res = NexusStorage.updateBookings(fresh => {
    const clash = nxFindOverlap(fresh, newBooking.spaceId, newBooking.date, newBooking.endDate, newBooking.timeStart, newBooking.timeEnd, null);
    if (clash) return clash;
    fresh.unshift(newBooking);
    return null;
  });
  if (res.result) {
    showToast("⚠️ Ese horario acaba de ser reservado por otra persona. Elija otro horario.", "warning");
    switchModalStep(1);
    renderBookingModeStep1();
    return;
  }
  if (!res.ok) {
    // No se pudo persistir (almacenamiento lleno): se revierte en memoria y se avisa.
    NexusStorage.updateBookings(fresh => {
      const i = fresh.findIndex(b => b.id === newBooking.id);
      if (i >= 0) fresh.splice(i, 1);
    });
    showToast("⚠️ No se pudo guardar la reserva: el almacenamiento del navegador está lleno. Use un comprobante más liviano.", "warning");
    return;
  }

  if (initialStatus === "pending_sinpe") {
    const notifs = NexusStorage.getNotifications();
    notifs.unshift({
      id: "notif-" + Date.now(),
      title: "Nuevo Pago SINPE Recibido",
      message: `Reserva ${bookingId} (${newBooking.clientName}) requiere validación. SLA de ${NX_SLA_DEADLINE_MIN}m activo.`,
      time: new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }),
      unread: true,
      link: "admin.html#secSla"
    });
    NexusStorage.saveNotifications(notifs);
  }

  showSuccessPass(newBooking);
  refreshFloorPlanStatus();
}

function showSuccessPass(booking) {
  document.querySelectorAll(".modal-step-content").forEach(el => el.style.display = "none");
  document.getElementById("modalStepSuccess").style.display = "block";

  const dateLabel = booking.endDate && booking.endDate !== booking.date ? `${booking.date} → ${booking.endDate}` : booking.date;
  document.getElementById("passBookingId").textContent = booking.id;
  document.getElementById("passSpaceName").textContent = booking.spaceName;
  document.getElementById("passDateTime").textContent = `${dateLabel} | ${booking.timeStart} - ${booking.timeEnd}`;
  document.getElementById("passClient").textContent = `${booking.clientName} (${booking.company || 'Particular'})`;

  const statusBadge = document.getElementById("passStatusBadge");
  const notice = document.getElementById("passStatusNotice");
  if (booking.status === "pending_sinpe") {
    statusBadge.className = "chip chip-pending";
    statusBadge.textContent = "⏳ Pendiente de Aprobación SINPE";
    notice.innerHTML = `
      <div style="background: rgba(233, 196, 106, 0.1); border: 1px solid rgba(233, 196, 106, 0.35); border-radius: 10px; padding: 14px; margin-top: 16px; font-size: 0.86rem; color: #F4E2D0;">
        <strong>Comprobante en validación concierge:</strong> Nuestro equipo confirmará la acreditación bancaria en máximo ${NX_SLA_DEADLINE_MIN} minutos (SLA activo). Recibirá confirmación por WhatsApp y correo electrónico.
      </div>
    `;
  } else if (booking.status === "cancelled") {
    statusBadge.className = "chip chip-cancelled";
    statusBadge.textContent = "✖ Cancelada";
    notice.innerHTML = booking.rejectReason ? `
      <div style="background: rgba(201, 90, 83, 0.12); border: 1px solid rgba(201, 90, 83, 0.35); border-radius: 10px; padding: 14px; margin-top: 16px; font-size: 0.86rem; color: #F4E2D0;">
        <strong>Motivo:</strong> ${nxEscape(booking.rejectReason)}
      </div>` : "";
  } else {
    statusBadge.className = "chip chip-confirmed";
    statusBadge.textContent = booking.status === "rescheduled" ? "🔄 Reprogramada & Pagada" : "✓ Confirmado & Pagado";
    notice.innerHTML = `
      <div style="background: rgba(129, 152, 112, 0.12); border: 1px solid rgba(129, 152, 112, 0.35); border-radius: 10px; padding: 14px; margin-top: 16px; font-size: 0.86rem; color: #E8F0E4;">
        <strong>¡Reserva Exitosa!</strong> Hemos enviado los accesos y la factura electrónica a <em>${nxEscape(booking.clientEmail)}</em>.
      </div>
    `;
  }

  renderQrCode("passQrCode", booking.qrCodeData);
  renderSpacesCatalog();
}

// Código QR ilustrativo (demo). En producción se genera con una librería QR a partir de qrCodeData.
function renderQrCode(containerId, codeData) {
  const container = document.getElementById(containerId);
  if (!container) return;
  // Patrón pseudoaleatorio determinístico a partir del código, para que cada pase se vea distinto
  let seed = 0;
  for (const ch of String(codeData)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let cells = "";
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (!inFinder && rnd() > 0.52) cells += `<rect x="${8 + x * 4}" y="${8 + y * 4}" width="4" height="4" fill="#241C18"/>`;
    }
  }
  const finder = (fx, fy) => `
    <rect x="${fx}" y="${fy}" width="28" height="28" fill="#241C18"/>
    <rect x="${fx + 4}" y="${fy + 4}" width="20" height="20" fill="#FBF8F4"/>
    <rect x="${fx + 8}" y="${fy + 8}" width="12" height="12" fill="#E07A5F"/>`;
  container.innerHTML = `
    <svg viewBox="0 0 100 100" width="100%" height="100%" style="border-radius: 8px;" aria-label="Pase de acceso ${nxEscape(codeData)}">
      <rect width="100" height="100" fill="#FBF8F4"/>
      ${cells}
      ${finder(8, 8)}${finder(64, 8)}${finder(8, 64)}
    </svg>
  `;
}

window.sendWhatsappConfirmation = function() {
  const clientDisplayName = currentUser ? currentUser.name : "estimado socio";
  const spaceName = selectedSpace ? selectedSpace.name : "NEXUS";
  alert("Simulación de Envío a WhatsApp:\n\n📱 Mensaje generado:\n'Hola " + clientDisplayName + ", tu reserva en NEXUS (" + spaceName + ") está agendada. Presenta tu código QR en recepción al llegar. Teléfono concierge: +506 8888-6398.'");
};

// ---------------------------------------------------------------------------
// Portal del cliente ("Mis Reservas")
// ---------------------------------------------------------------------------
function setupClientPortalEvents() {
  // El enlace del menú ya usa onclick="openClientPortalModal()" en el HTML;
  // no se agrega un segundo listener para no abrir el modal dos veces.
}

window.openClientPortalModal = function() {
  if (!currentUser || currentRole === "admin") {
    openAuthModal('login');
    showToast("Por favor inicie sesión o regístrese para ver sus reservas.", "info");
    return;
  }
  const modal = document.getElementById("portalModal");
  const container = document.getElementById("portalBookingsList");
  if (!modal || !container) return;

  const bookings = NexusStorage.getBookings().filter(b => b.clientId === currentUser.id);

  if (bookings.length === 0) {
    container.innerHTML = `<p style="color: #B8A99A; text-align: center; padding: 24px;">No tienes reservas activas por el momento.</p>`;
  } else {
    container.innerHTML = bookings.map(b => {
      let statusBadge = "";
      if (b.status === "confirmed") statusBadge = `<span class="chip chip-confirmed">✓ Confirmada</span>`;
      else if (b.status === "pending_sinpe") statusBadge = `<span class="chip chip-pending">⏳ Revisión SINPE</span>`;
      else if (b.status === "rescheduled") statusBadge = `<span class="chip chip-rescheduled">🔄 Reprogramada</span>`;
      else statusBadge = `<span class="chip chip-cancelled">✖ Cancelada</span>`;

      const canReschedule = nxIsActiveBooking(b) && b.bookingType === "hour" && nxBookingEndDate(b) >= nxToday();
      const dateLabel = b.endDate && b.endDate !== b.date ? `${b.date} → ${b.endDate}` : b.date;

      return `
        <div style="background: rgba(36, 29, 25, 0.45); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
              <span style="font-weight: 800; color: #FFF; font-size: 1.05rem; font-family: 'Syne', sans-serif;">${nxEscape(b.id)}</span>
              ${statusBadge}
              <span style="font-size: 0.82rem; color: var(--gold-warm);">${b.paymentMethod === 'sinpe' ? '📱 SINPE Móvil' : '💳 Tarjeta'}</span>
            </div>
            <div style="font-size: 0.98rem; font-weight: 600; color: #FFF;">${nxEscape(b.spaceName)}</div>
            <div style="font-size: 0.84rem; color: #B8A99A;">📅 Fecha: ${nxEscape(dateLabel)} | ⏰ Horario: ${nxEscape(b.timeStart)} - ${nxEscape(b.timeEnd)}</div>
            <div style="font-size: 0.84rem; color: var(--terracotta); font-weight: 600;">Total: ${nxFormatCRC(b.totalCRC)} ($${b.totalUSD})</div>
            ${b.rejectReason ? `<div style="font-size: 0.8rem; color: #E88F8A;">Motivo: ${nxEscape(b.rejectReason)}</div>` : ''}
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary btn-sm" onclick="viewDigitalPass('${nxEscape(b.id)}')">Ver Pase QR</button>
            ${canReschedule ? `<button class="btn btn-primary btn-sm" onclick="openRescheduleModal('${nxEscape(b.id)}')">Reprogramar 🔄</button>` : ''}
          </div>
        </div>
      `;
    }).join("");
  }

  modal.classList.add("open");
};

window.closePortalModal = function() {
  document.getElementById("portalModal").classList.remove("open");
};

window.viewDigitalPass = function(bookingId) {
  const booking = NexusStorage.getBookings().find(b => b.id === bookingId);
  if (!booking) return;
  closePortalModal();
  const spaces = NexusStorage.getSpaces();
  selectedSpace = spaces.find(s => s.id === booking.spaceId) || selectedSpace;
  const modal = document.getElementById("bookingModal");
  if (selectedSpace) {
    document.getElementById("modalSpaceTitle").textContent = selectedSpace.name;
    document.getElementById("modalSpaceMeta").textContent = `📍 ${selectedSpace.floor} | 👥 Capacidad: ${selectedSpace.capacity} pers.`;
  }
  showSuccessPass(booking);
  modal.classList.add("open");
};

// Reschedule Logic (reservas por horas; se conserva la duración original)
window.openRescheduleModal = function(bookingId) {
  currentRescheduleBookingId = bookingId;
  const booking = NexusStorage.getBookings().find(b => b.id === bookingId);
  if (!booking) return;

  document.getElementById("rescheduleBookingId").textContent = booking.id;
  document.getElementById("rescheduleSpaceName").textContent = booking.spaceName;
  document.getElementById("rescheduleCurrentSlot").textContent = `${booking.date} (${booking.timeStart} - ${booking.timeEnd})`;
  const dateInput = document.getElementById("newRescheduleDate");
  dateInput.min = nxToday();
  dateInput.value = booking.date < nxToday() ? nxToday() : booking.date;

  // Opciones de inicio con la misma duración que la reserva original
  const durMin = nxTimeToMin(booking.timeEnd) - nxTimeToMin(booking.timeStart);
  const select = document.getElementById("newRescheduleTime");
  let opts = "";
  for (let h = HOUR_SLOTS_START; h * 60 + durMin <= HOUR_SLOTS_END * 60; h++) {
    const s = nxMinToTime(h * 60), e = nxMinToTime(h * 60 + durMin);
    opts += `<option value="${s} - ${e}">${s} - ${e}</option>`;
  }
  select.innerHTML = opts;
  select.value = `${booking.timeStart} - ${booking.timeEnd}`;

  document.getElementById("rescheduleModal").classList.add("open");
};

window.closeRescheduleModal = function() {
  document.getElementById("rescheduleModal").classList.remove("open");
};

window.confirmReschedule = function() {
  const newDate = document.getElementById("newRescheduleDate").value;
  const newTime = document.getElementById("newRescheduleTime").value;

  if (!newDate || !newTime) {
    showToast("⚠️ Por favor seleccione fecha y franja horaria válida.", "warning");
    return;
  }
  if (newDate < nxToday()) {
    showToast("⚠️ No se puede reprogramar a una fecha pasada.", "warning");
    return;
  }
  const [ts, te] = newTime.split(" - ");
  if (newDate === nxToday() && nxTimeToMin(ts) <= new Date().getHours() * 60 + new Date().getMinutes()) {
    showToast("⚠️ Ese horario ya transcurrió hoy.", "warning");
    return;
  }

  const res = NexusStorage.updateBookings(fresh => {
    const b = fresh.find(x => x.id === currentRescheduleBookingId);
    if (!b) return "not_found";
    const clash = nxFindOverlap(fresh, b.spaceId, newDate, newDate, ts, te, b.id);
    if (clash) return "clash";
    b.date = newDate;
    b.endDate = newDate;
    b.timeStart = ts;
    b.timeEnd = te;
    if (b.status !== "pending_sinpe") b.status = "rescheduled";
    return "ok";
  });

  if (res.result === "clash") {
    showToast("⚠️ El nuevo horario no está disponible. Elija otro.", "warning");
    return;
  }
  if (res.result !== "ok") return;

  closeRescheduleModal();
  openClientPortalModal();
  renderSpacesCatalog();
  showToast(`✓ Reserva ${currentRescheduleBookingId} reprogramada con éxito para el ${newDate} a las ${newTime}.`, "success");
};

// ---------------------------------------------------------------------------
// AUTH MODAL & ROLE SWITCHING (LOGIN, SIGN UP, DEMO SHORTCUTS)
// Nota: autenticación simulada en el navegador; solo apta para demostración.
// ---------------------------------------------------------------------------
window.openAuthModal = function(initialTab = "login") {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  switchAuthTab(initialTab);
  modal.classList.add("open");
};

window.closeAuthModal = function() {
  const modal = document.getElementById("authModal");
  if (modal) modal.classList.remove("open");
};

window.switchAuthTab = function(tab) {
  const tabLogin = document.getElementById("authTabLogin");
  const tabSignup = document.getElementById("authTabSignup");
  const contentLogin = document.getElementById("authContentLogin");
  const contentSignup = document.getElementById("authContentSignup");
  const headerTitle = document.getElementById("authModalHeaderTitle");

  const signup = tab === "signup";
  if (tabLogin) tabLogin.classList.toggle("active", !signup);
  if (tabSignup) tabSignup.classList.toggle("active", signup);
  if (contentLogin) contentLogin.style.display = signup ? "none" : "block";
  if (contentSignup) contentSignup.style.display = signup ? "block" : "none";
  if (headerTitle) headerTitle.textContent = signup ? "Registro de Nuevo Cliente" : "Acceso de Clientes & Socios";
};

window.fillAdminCredentials = function() {
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPassword");
  if (emailInput) emailInput.value = "admin@nexusspaces.com";
  if (passInput) passInput.value = "admin123";
  showToast("👑 Credenciales administrativas cargadas.", "info");
};

function loginAsAdmin() {
  const adminObj = {
    id: "admin-01",
    name: "Lic. Roberto Alvarado",
    email: "admin@nexusspaces.com",
    role: "admin",
    loyaltyTier: "Gerencia General"
  };
  NexusStorage.setCurrentUser(adminObj);
  NexusStorage.setAuthRole("admin");
  currentUser = adminObj;
  currentRole = "admin";
  closeAuthModal();
  showToast("👑 Acceso concedido a Gerencia General. Redirigiendo al panel administrativo...", "success");
  setTimeout(() => { window.location.href = "admin.html"; }, 600);
}

window.handleUserLoginForm = function(event) {
  if (event) event.preventDefault();
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPassword");
  const rawVal = emailInput ? emailInput.value.trim() : "";
  const email = rawVal.toLowerCase();
  const password = passInput ? passInput.value.trim() : "";

  if (!email) {
    showToast("⚠️ Ingrese su correo electrónico.", "warning");
    return;
  }

  const isAdminUser = (email === "admin" || email === "admin@nexusspaces.com" || email === "gerencia@nexus.com" || email === "gerencia");
  if (isAdminUser) {
    if (password === "admin123" || password === "admin" || password === "nexus2026") {
      loginAsAdmin();
    } else {
      showToast("❌ Contraseña de gerencia incorrecta.", "warning");
    }
    return;
  }

  const clients = NexusStorage.getClients();
  let found = clients.find(c => c.email && c.email.toLowerCase() === email);

  if (!found) {
    found = {
      id: "cli-" + Date.now(),
      name: rawVal.split("@")[0].toUpperCase(),
      email: rawVal.includes("@") ? rawVal : (rawVal + "@empresa.com"),
      phone: "",
      idNumber: "",
      company: "Independiente",
      loyaltyTier: "Nuevo Socio",
      discountRate: 0.0,
      totalHoursBooked: 0,
      totalSpentCRC: 0,
      registeredSince: nxToday()
    };
    clients.unshift(found);
    NexusStorage.saveClients(clients);
  }

  NexusStorage.setCurrentUser(found);
  NexusStorage.setAuthRole("client");
  currentUser = found;
  currentRole = "client";
  initUserBadge();
  closeAuthModal();
  showToast(`✓ Bienvenido(a), ${found.name}. Sesión iniciada con éxito.`, "success");
};

window.handleUserRegisterForm = function(event) {
  if (event) event.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const idNumber = document.getElementById("regId").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const company = document.getElementById("regCompany").value.trim();

  if (!name || !email || !phone) {
    showToast("⚠️ Por favor completa los campos requeridos.", "warning");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("⚠️ El correo electrónico no es válido.", "warning");
    return;
  }

  const clients = NexusStorage.getClients();
  if (clients.some(c => c.email && c.email.toLowerCase() === email.toLowerCase())) {
    showToast("⚠️ Ya existe una cuenta con ese correo. Inicie sesión.", "warning");
    switchAuthTab("login");
    const loginEmail = document.getElementById("loginEmail");
    if (loginEmail) loginEmail.value = email;
    return;
  }

  const newClient = {
    id: "cli-" + Date.now(),
    name: name,
    idNumber: idNumber,
    email: email,
    phone: phone,
    company: company || "Independiente",
    emergencyContact: "",
    loyaltyTier: "Nuevo Socio",
    discountRate: 0.0,
    totalHoursBooked: 0,
    totalSpentCRC: 0,
    registeredSince: nxToday()
  };

  clients.unshift(newClient);
  NexusStorage.saveClients(clients);

  NexusStorage.setCurrentUser(newClient);
  NexusStorage.setAuthRole("client");
  currentUser = newClient;
  currentRole = "client";
  initUserBadge();
  closeAuthModal();
  showToast(`✓ ¡Bienvenido(a) a NEXUS, ${name}! Cuenta creada exitosamente.`, "success");
};

window.quickLoginAs = function(target) {
  if (target === "admin") {
    loginAsAdmin();
    return;
  }

  const clients = NexusStorage.getClients();
  const client = clients.find(c => c.id === target) || clients[0];
  if (client) {
    NexusStorage.setCurrentUser(client);
    NexusStorage.setAuthRole("client");
    currentUser = client;
    currentRole = "client";
    initUserBadge();
    closeAuthModal();
    showToast(`✓ Sesión activa como ${client.name} (${client.loyaltyTier}).`, "success");
  }
};

window.logoutUser = function() {
  NexusStorage.logout();
  currentUser = null;
  currentRole = null;
  initUserBadge();
  showToast("Has cerrado sesión.", "info");
};

// Los mensajes se insertan como texto (no HTML) para evitar inyección con nombres de usuario.
window.showToast = function(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  const span = document.createElement("span");
  span.textContent = message;
  toast.appendChild(span);
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
};
