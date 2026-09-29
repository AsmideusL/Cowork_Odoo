// NEXUS COWORKING - FRONTEND CLIENT APPLICATION LOGIC (ENTERPRISE DEMO SUITE)
document.addEventListener("DOMContentLoaded", () => {
  let currentFilterType = "hour";
  let selectedSpace = null;
  let selectedDate = new Date().toISOString().split("T")[0];
  let selectedTimeSlot = null;
  let selectedDaysCount = 1;
  let selectedMonthPlan = 1;
  let selectedAddons = new Set();
  let currentUser = NexusStorage.getCurrentUser();
  let currentRole = NexusStorage.getAuthRole();

  // Initialize UI
  initUserBadge();
  initNotificationBell();
  renderSpacesCatalog();
  setupFloorPlanInteractions();
  setupSearchEvents();
  setupClientPortalEvents();

  // Sync user display in navbar & Admin indicator
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
    if (navMyReservationsItem) navMyReservationsItem.style.display = "block";

    if (!userBadgeEl) return;

    if (currentRole === "admin") {
      userBadgeEl.innerHTML = `
        <div class="user-avatar" style="background: var(--grad-gold);">👑</div>
        <div style="text-align: left;">
          <div style="font-size: 0.85rem; font-weight: 700; color: #FFF; line-height: 1.2;">Lic. Roberto Alvarado</div>
          <span class="user-tier-badge" style="background: rgba(224, 122, 95, 0.2); color: var(--champagne);">Gerencia General</span>
        </div>
      `;
    } else {
      const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U";
      userBadgeEl.innerHTML = `
        <div class="user-avatar">${initial}</div>
        <div style="text-align: left;">
          <div style="font-size: 0.85rem; font-weight: 700; color: #FFF; line-height: 1.2;">${currentUser.name}</div>
          <span class="user-tier-badge">⭐ ${currentUser.loyaltyTier || 'Socio'}</span>
        </div>
      `;
    }
    userBadgeEl.onclick = () => openAuthModal('login');
  }

  // Notification Bell
  function initNotificationBell() {
    const bellBtn = document.getElementById("notifBellBtn");
    const dropdown = document.getElementById("notifDropdown");
    const container = document.getElementById("notifItemsContainer");
    const badge = document.getElementById("notifCountBadge");

    if (!bellBtn || !dropdown) return;

  window.toggleNotifDropdown = function(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById("notifDropdown");
    if (dropdown) dropdown.classList.toggle("open");
  };

  bellBtn.onclick = (e) => {
    window.toggleNotifDropdown(e);
  };

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== bellBtn) {
        dropdown.classList.remove("open");
      }
    });

    const notifs = NexusStorage.getNotifications();
    const unreadCount = notifs.filter(n => n.unread).length;
    if (badge) badge.textContent = unreadCount;

    if (container) {
      container.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="window.location.href='${n.link}'">
          <div class="notif-title">${n.title}</div>
          <div class="notif-desc">${n.message}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      `).join("");
    }
  }

  window.markAllNotifsRead = function() {
    const notifs = NexusStorage.getNotifications();
    notifs.forEach(n => n.unread = false);
    NexusStorage.saveNotifications(notifs);
    initNotificationBell();
    showToast("✓ Todas las notificaciones marcadas como leídas", "info");
  };

  // Render Spaces in Catalog with Accurate Category & Capacity Filters
  window.renderSpacesCatalog = function(filterCategory = "all", minCapacity = "all") {
    const grid = document.getElementById("spacesGrid");
    if (!grid) return;
    const spaces = NexusStorage.getSpaces();

    const filtered = spaces.filter(sp => {
      // Category filter
      if (filterCategory !== "all" && sp.category !== filterCategory) return false;

      // Capacity filter
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
      const priceHour = sp.priceHour || 15000;
      const priceHourUSD = sp.priceHourUSD || 28;
      const priceDay = sp.priceDay || 95000;
      const priceDayUSD = sp.priceDayUSD || 180;
      const priceMonth = sp.priceMonth || 1200000;
      const priceMonthUSD = sp.priceMonthUSD || 2300;

      let priceDisplay = "";
      if (currentFilterType === "hour") {
        priceDisplay = `₡${priceHour.toLocaleString()} <span class="price-sub">/ hora ($${priceHourUSD})</span>`;
      } else if (currentFilterType === "day") {
        priceDisplay = `₡${priceDay.toLocaleString()} <span class="price-sub">/ jornada ($${priceDayUSD})</span>`;
      } else {
        priceDisplay = `₡${priceMonth.toLocaleString()} <span class="price-sub">/ mes ($${priceMonthUSD})</span>`;
      }

      const statusBadge = sp.status === "available" 
        ? `<div class="status-dot-badge"><span class="dot-free"></span> Disponible hoy</div>`
        : `<div class="status-dot-badge"><span class="dot-busy"></span> Con reservas</div>`;

      const safeImg = sp.image || "assets/room_horizon.svg";

      return `
        <div class="space-card" data-space-id="${sp.id}" onclick="openBookingModal('${sp.id}')" style="cursor: pointer;">
          <div class="card-img-wrap">
            <img src="${safeImg}" alt="${sp.name}" class="card-img" onerror="this.src='assets/room_horizon.svg'">
            <span class="card-badge ${getBadgeClass(sp.badge)}">${sp.badge}</span>
            ${statusBadge}
          </div>
          <div class="card-body">
            <h3 class="card-title">${sp.name}</h3>
            <div class="card-meta">
              <span>👥 Capacidad: ${sp.capacity} ${sp.capacity === 1 ? 'persona' : 'personas'}</span>
              <span>📍 ${sp.floor}</span>
            </div>
            <p class="card-desc">${sp.description}</p>
            <div class="amenities-tags">
              ${sp.amenities.map(a => `<span class="tag">✓ ${a}</span>`).join("")}
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

  // Interactive 2D Floor Plan
  function setupFloorPlanInteractions() {
    const zones = document.querySelectorAll(".fp-zone");
    const previewDrawer = document.getElementById("fpPreviewDrawer");
    const spaces = NexusStorage.getSpaces();

    zones.forEach(zone => {
      const zoneId = zone.getAttribute("id");
      const space = spaces.find(s => s.zoneId === zoneId);

      if (space) {
        if (space.status === "available") {
          zone.classList.add("zone-available");
        } else {
          zone.classList.add("zone-busy");
        }

        zone.addEventListener("mouseenter", () => {
          if (!previewDrawer) return;
          previewDrawer.style.display = "block";
          previewDrawer.innerHTML = `
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 10px;">
              <img src="${space.image || 'assets/room_horizon.svg'}" onerror="this.src='assets/room_horizon.svg'" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-gold);">
              <div>
                <h4 style="color: #FFF; font-size: 0.98rem;">${space.name}</h4>
                <span style="font-size: 0.78rem; color: var(--sage-green);">● ${space.status === 'available' ? 'Disponible para agendar' : 'Horarios tomados hoy'}</span>
              </div>
            </div>
            <p style="font-size: 0.82rem; color: #B8A99A; margin-bottom: 14px;">${space.description.slice(0, 88)}...</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; color: var(--champagne); font-size: 0.95rem; font-family: 'Plus Jakarta Sans', sans-serif;">₡${(space.priceHour || 15000).toLocaleString()} / hr</span>
              <button class="btn btn-primary btn-sm" id="fpQuickBookBtn">Reservar</button>
            </div>
          `;
          document.getElementById("fpQuickBookBtn").onclick = () => openBookingModal(space.id);
        });

        zone.addEventListener("click", () => {
          openBookingModal(space.id);
        });
      }
    });
  }

  // Filter application handlers
  window.applyFilters = function() {
    const categorySelect = document.getElementById("searchCategory");
    const capacitySelect = document.getElementById("searchCapacity");
    const cat = categorySelect ? categorySelect.value : "all";
    const cap = capacitySelect ? capacitySelect.value : "all";
    renderSpacesCatalog(cat, cap);
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
    if (type === "hour" && document.getElementById("pillHour")) document.getElementById("pillHour").classList.add("active");
    if (type === "day" && document.getElementById("pillDay")) document.getElementById("pillDay").classList.add("active");
    if (type === "month" && document.getElementById("pillMonth")) document.getElementById("pillMonth").classList.add("active");
    applyFilters();
  };

  // Search Bar Filter Events
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

  // Individual Room Calendar Inspection Modal
  window.openRoomCalendarModal = function(spaceId) {
    const space = NexusStorage.getSpaces().find(s => s.id === spaceId);
    if (!space) return;

    const modal = document.getElementById("roomCalendarModal");
    document.getElementById("roomCalModalTitle").textContent = space.name;
    document.getElementById("roomCalModalSub").textContent = `📍 ${space.floor} · Capacidad: ${space.capacity} personas · ${space.badge}`;

    const container = document.getElementById("roomCalModalGridContainer");
    const bookings = NexusStorage.getBookings().filter(b => b.spaceId === space.id && b.status !== "cancelled");

    const days = [
      { date: "2026-09-29", label: "Hoy (29 Sep)" },
      { date: "2026-09-30", label: "Mañana (30 Sep)" },
      { date: "2026-10-01", label: "Jueves (01 Oct)" },
      { date: "2026-10-02", label: "Viernes (02 Oct)" }
    ];

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        ${days.map(d => {
          const dayB = bookings.filter(b => b.date === d.date);
          return `
            <div style="background: rgba(36,29,25,0.45); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 12px;">
              <div style="font-weight: 700; color: #FFF; font-size: 0.88rem; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">
                ${d.label}
              </div>
              ${dayB.length === 0 ? `<div style="font-size: 0.78rem; color: var(--sage-green);">✓ Todo el día libre</div>` : ''}
              ${dayB.map(b => `
                <div style="background: rgba(201, 90, 83, 0.15); border-left: 2px solid var(--rosewood); padding: 6px 8px; border-radius: 4px; margin-bottom: 6px;">
                  <div style="font-size: 0.75rem; font-weight: 700; color: #FFF;">⏰ ${b.timeStart} - ${b.timeEnd}</div>
                  <div style="font-size: 0.72rem; color: #B8A99A;">${b.clientName}</div>
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

  // Booking Modal Logic (Adapts to Hour, Day, or Month Mode)
  window.openBookingModal = function(spaceId) {
    const spaces = NexusStorage.getSpaces();
    selectedSpace = spaces.find(s => s.id === spaceId);
    if (!selectedSpace) return;

    selectedAddons.clear();
    selectedTimeSlot = null;

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

    if (stepNum === 3) {
      renderCheckoutSummary();
    }
  };

  // Render Step 1 depending on whether it's Hour, Day, or Month
  function renderBookingModeStep1() {
    const container = document.getElementById("bookingModeContainer");
    if (!container || !selectedSpace) return;

    if (currentFilterType === "hour") {
      container.innerHTML = `
        <div class="room-cal-matrix">
          <div class="cal-header-row">
            <span style="font-weight: 700; color: #FFFFFF; font-size: 0.96rem;">📅 Reserva por Horas: Disponibilidad de la Sala</span>
            <input type="date" id="bookingModalDate" class="field-input" value="${selectedDate}" style="padding: 6px 14px; width: auto;">
          </div>
          <p style="font-size: 0.84rem; color: #B8A99A; margin-bottom: 14px;">
            Seleccione la franja horaria que desea reservar. Los horarios tachados ya están ocupados.
          </p>
          <div class="cal-grid-slots" id="modalSlotsContainer"></div>
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
            Acceso exclusivo al espacio de 08:00 a 18:00 durante las fechas seleccionadas.
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="field-group">
              <label class="field-label">Fecha de Inicio</label>
              <input type="date" id="dayStartDate" class="field-input" value="${selectedDate}">
            </div>
            <div class="field-group">
              <label class="field-label">Cantidad de Jornadas / Días</label>
              <select id="dayCountSelect" class="field-select">
                <option value="1">1 Jornada (Día Completo)</option>
                <option value="2">2 Jornadas</option>
                <option value="3">3 Jornadas</option>
                <option value="5">5 Jornadas (Semana Laboral)</option>
                <option value="10">10 Jornadas</option>
              </select>
            </div>
          </div>
        </div>
      `;
      const daySelect = document.getElementById("dayCountSelect");
      daySelect.onchange = (e) => {
        selectedDaysCount = parseInt(e.target.value, 10);
      };
      const dayStart = document.getElementById("dayStartDate");
      dayStart.onchange = (e) => {
        selectedDate = e.target.value;
      };
    } else { // Month
      container.innerHTML = `
        <div class="room-cal-matrix">
          <div class="cal-header-row">
            <span style="font-weight: 700; color: #FFFFFF; font-size: 0.96rem;">🏢 Membresía Mensual de Espacio</span>
          </div>
          <p style="font-size: 0.84rem; color: #B8A99A; margin-bottom: 16px;">
            Acceso continuo 24/7 con cerradura inteligente y domicilio comercial incluido.
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="field-group">
              <label class="field-label">Mes de Inicio</label>
              <input type="date" id="monthStartDate" class="field-input" value="${selectedDate}">
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
          </div>
        </div>
      `;
      const mPlan = document.getElementById("monthPlanSelect");
      mPlan.onchange = (e) => {
        selectedMonthPlan = parseInt(e.target.value, 10);
      };
      const mStart = document.getElementById("monthStartDate");
      mStart.onchange = (e) => {
        selectedDate = e.target.value;
      };
    }
  }

  function renderHourSlots() {
    const container = document.getElementById("modalSlotsContainer");
    const dateInput = document.getElementById("bookingModalDate");
    if (!container || !selectedSpace) return;

    dateInput.value = selectedDate;
    dateInput.onchange = (e) => {
      selectedDate = e.target.value;
      renderHourSlots();
    };

    const timeSlots = [
      "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
      "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00",
      "16:00 - 17:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00"
    ];

    const bookings = NexusStorage.getBookings().filter(b => 
      b.spaceId === selectedSpace.id && 
      b.date === selectedDate && 
      b.status !== "cancelled"
    );

    container.innerHTML = timeSlots.map(slot => {
      const slotStart = slot.split(" - ")[0];
      const isBooked = bookings.some(b => slotStart >= b.timeStart && slotStart < b.timeEnd);

      if (isBooked) {
        return `<button type="button" class="slot-btn booked" title="Espacio Ocupado">${slot} (Ocupado)</button>`;
      } else {
        const isSelected = selectedTimeSlot === slot;
        return `<button type="button" class="slot-btn ${isSelected ? 'selected' : ''}" data-slot="${slot}">${slot}</button>`;
      }
    }).join("");

    container.querySelectorAll(".slot-btn:not(.booked)").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedTimeSlot = btn.getAttribute("data-slot");
      });
    });
  }

  function renderAddonsSelector() {
    const list = document.getElementById("addonsList");
    if (!list) return;

    list.innerHTML = NEXUS_DATA.addons.map(addon => {
      return `
        <div class="addon-item" data-addon-id="${addon.id}">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.35rem;">${addon.icon}</span>
            <div>
              <div style="font-weight: 600; color: #FFF; font-size: 0.92rem;">${addon.name}</div>
              <div style="font-size: 0.76rem; color: var(--gold-warm);">+₡${addon.price.toLocaleString()} ($${addon.priceUSD}) ${addon.unit}</div>
            </div>
          </div>
          <input type="checkbox" class="addon-checkbox" data-id="${addon.id}" style="width: 18px; height: 18px; accent-color: #E07A5F; cursor: pointer;">
        </div>
      `;
    }).join("");

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

  window.validateStep1 = function() {
    if (currentFilterType === "hour" && !selectedTimeSlot) {
      showToast("⚠️ Por favor selecciona una franja horaria disponible.", "warning");
      return;
    }
    if (currentUser) {
      document.getElementById("custName").value = currentUser.name || "";
      document.getElementById("custIdNumber").value = currentUser.idNumber || "";
      document.getElementById("custEmail").value = currentUser.email || "";
      document.getElementById("custPhone").value = currentUser.phone || "";
      document.getElementById("custCompany").value = currentUser.company || "";
      document.getElementById("custEmergency").value = currentUser.emergencyContact || "";
    } else {
      document.getElementById("custName").value = "";
      document.getElementById("custIdNumber").value = "";
      document.getElementById("custEmail").value = "";
      document.getElementById("custPhone").value = "";
      document.getElementById("custCompany").value = "";
      document.getElementById("custEmergency").value = "";
    }

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

    if (!currentUser) {
      currentUser = {
        id: "cli-" + Date.now(),
        name: name,
        idNumber: idNum,
        email: email,
        phone: phone,
        company: document.getElementById("custCompany").value.trim() || "Independiente",
        emergencyContact: document.getElementById("custEmergency").value.trim(),
        loyaltyTier: "Nuevo Socio",
        discountRate: 0.0,
        registeredSince: new Date().toISOString().split("T")[0]
      };
      const clients = NexusStorage.getClients();
      clients.unshift(currentUser);
      NexusStorage.saveClients(clients);
    } else {
      currentUser.name = name;
      currentUser.idNumber = idNum;
      currentUser.email = email;
      currentUser.phone = phone;
      currentUser.company = document.getElementById("custCompany").value.trim();
      currentUser.emergencyContact = document.getElementById("custEmergency").value.trim();
    }
    NexusStorage.setCurrentUser(currentUser);
    NexusStorage.setAuthRole("client");
    initUserBadge();

    switchModalStep(3);
  };

  let calculatedTotalCRC = 0;
  let calculatedTotalUSD = 0;

  function renderCheckoutSummary() {
    const summaryBox = document.getElementById("checkoutSummary");
    if (!summaryBox || !selectedSpace) return;

    let baseRateCRC = selectedSpace.priceHour;
    let baseRateUSD = selectedSpace.priceHourUSD;
    let durationLabel = "";

    if (currentFilterType === "day") {
      baseRateCRC = selectedSpace.priceDay * selectedDaysCount;
      baseRateUSD = selectedSpace.priceDayUSD * selectedDaysCount;
      durationLabel = `${selectedDaysCount} ${selectedDaysCount === 1 ? 'jornada completa' : 'jornadas completas'}`;
    } else if (currentFilterType === "month") {
      let termDiscount = 1;
      if (selectedMonthPlan === 3) termDiscount = 0.90;
      if (selectedMonthPlan === 6) termDiscount = 0.85;
      if (selectedMonthPlan === 12) termDiscount = 0.80;
      baseRateCRC = (selectedSpace.priceMonth * selectedMonthPlan) * termDiscount;
      baseRateUSD = Math.round((selectedSpace.priceMonthUSD * selectedMonthPlan) * termDiscount);
      durationLabel = `Plan de ${selectedMonthPlan} ${selectedMonthPlan === 1 ? 'mes' : 'meses'}`;
    } else {
      durationLabel = selectedTimeSlot || "1 hora";
    }

    let addonsTotalCRC = 0;
    let addonsTotalUSD = 0;
    const selectedAddonObjs = NEXUS_DATA.addons.filter(a => selectedAddons.has(a.id));
    selectedAddonObjs.forEach(a => {
      addonsTotalCRC += a.price;
      addonsTotalUSD += a.priceUSD;
    });

    const subtotalCRC = baseRateCRC + addonsTotalCRC;
    const discountRate = currentUser ? (currentUser.discountRate || 0) : 0;
    const discountCRC = subtotalCRC * discountRate;
    calculatedTotalCRC = subtotalCRC - discountCRC;

    const subtotalUSD = baseRateUSD + addonsTotalUSD;
    const discountUSD = subtotalUSD * discountRate;
    calculatedTotalUSD = Math.round(subtotalUSD - discountUSD);

    summaryBox.innerHTML = `
      <div class="summary-row">
        <span>Espacio: <strong>${selectedSpace.name}</strong></span>
        <span>₡${baseRateCRC.toLocaleString()}</span>
      </div>
      <div class="summary-row">
        <span>Modalidad & Programación:</span>
        <span>${selectedDate} (${durationLabel})</span>
      </div>
      ${selectedAddonObjs.map(a => `
        <div class="summary-row" style="font-size: 0.84rem; color: #B8A99A;">
          <span>+ ${a.name}</span>
          <span>₡${a.price.toLocaleString()}</span>
        </div>
      `).join("")}
      ${discountRate > 0 ? `
        <div class="summary-row" style="color: var(--gold-warm);">
          <span>Descuento de Socio (${currentUser ? currentUser.loyaltyTier : ''} - ${Math.round(discountRate * 100)}%):</span>
          <span>-₡${Math.round(discountCRC).toLocaleString()}</span>
        </div>
      ` : ''}
      <div class="summary-row total">
        <span>Total a Pagar:</span>
        <span style="color: var(--terracotta);">₡${calculatedTotalCRC.toLocaleString()} <span style="font-size: 0.88rem; font-weight: normal; color: var(--gold-warm);">($${calculatedTotalUSD} USD)</span></span>
      </div>
    `;

    document.getElementById("sinpeTotalCRC").textContent = `₡${calculatedTotalCRC.toLocaleString()} CRC`;
  }

  let currentPaymentMethod = "sinpe";
  window.selectPaymentTab = function(method) {
    currentPaymentMethod = method;
    document.querySelectorAll(".pay-tab").forEach(tab => tab.classList.remove("active"));
    if (method === "sinpe") {
      document.getElementById("tabSinpe").classList.add("active");
      document.getElementById("sinpeContainer").style.display = "block";
      document.getElementById("cardContainer").style.display = "none";
    } else {
      document.getElementById("tabCard").classList.add("active");
      document.getElementById("sinpeContainer").style.display = "none";
      document.getElementById("cardContainer").style.display = "block";
    }
  };

  // Instant Demo SINPE Vouchers
  let uploadedVoucherUrl = "assets/voucher_bn.svg";
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

  const voucherInput = document.getElementById("sinpeFile");
  if (voucherInput) {
    voucherInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadedVoucherUrl = event.target.result;
          document.getElementById("sinpeUploadLabel").innerHTML = `
            <div style="color: var(--sage-green); font-weight: 700;">✓ Archivo cargado exitosamente</div>
            <div style="font-size: 0.8rem; color: #B8A99A;">${file.name} (${(file.size / 1024).toFixed(1)} KB)</div>
          `;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Payment Execution
  window.processBookingPayment = function() {
    const btn = document.getElementById("btnFinalizeBooking");
    const bookingId = "RES-" + Math.floor(1000 + Math.random() * 9000);
    const times = selectedTimeSlot ? selectedTimeSlot.split(" - ") : ["08:00", "18:00"];

    let sinpeRef = null;
    let initialStatus = "confirmed";

    if (currentPaymentMethod === "sinpe") {
      sinpeRef = document.getElementById("sinpeRefInput").value.trim();
      if (!sinpeRef) {
        showToast("⚠️ Ingrese el número de referencia del comprobante SINPE.", "warning");
        return;
      }
      initialStatus = "pending_sinpe";
    }

    if (currentPaymentMethod === "card") {
      btn.innerHTML = "⏳ Procesando pago seguro...";
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = "Confirmar &amp; Finalizar Reserva ➔";
        btn.disabled = false;
        finalizeBookingCreation(bookingId, times, sinpeRef, initialStatus);
      }, 700);
    } else {
      finalizeBookingCreation(bookingId, times, sinpeRef, initialStatus);
    }
  };

  function finalizeBookingCreation(bookingId, times, sinpeRef, initialStatus) {
    const newBooking = {
      id: bookingId,
      spaceId: selectedSpace.id,
      spaceName: selectedSpace.name,
      clientId: currentUser ? currentUser.id : ("cli-" + Date.now()),
      clientName: currentUser ? currentUser.name : "Cliente Invitado",
      clientEmail: currentUser ? currentUser.email : "contacto@empresa.com",
      clientPhone: currentUser ? currentUser.phone : "+506 8888-0000",
      company: currentUser ? currentUser.company : "",
      bookingType: currentFilterType,
      date: selectedDate,
      timeStart: times[0],
      timeEnd: times[1],
      hours: 1,
      addons: Array.from(selectedAddons),
      totalCRC: calculatedTotalCRC,
      totalUSD: calculatedTotalUSD,
      paymentMethod: currentPaymentMethod,
      sinpeRef: sinpeRef,
      sinpeVoucherUrl: currentPaymentMethod === "sinpe" ? uploadedVoucherUrl : null,
      sinpeSubmittedAt: new Date().toISOString(),
      status: initialStatus,
      qrCodeData: `NEXUS-${bookingId}-${selectedSpace.id}-VERIFIED`,
      slaDeadlineMinutes: 30,
      createdAt: new Date().toISOString()
    };

    const bookings = NexusStorage.getBookings();
    bookings.unshift(newBooking);
    NexusStorage.saveBookings(bookings);

    // Add alert notification for Admin
    if (initialStatus === "pending_sinpe") {
      const notifs = NexusStorage.getNotifications();
      const clientDisplayName = currentUser ? currentUser.name : "Cliente Invitado";
      notifs.unshift({
        id: "notif-" + Date.now(),
        title: "Nuevo Pago SINPE Recibido",
        message: `Reserva ${bookingId} (${clientDisplayName}) requiere validación. SLA de 30m activo.`,
        time: "Justo ahora",
        unread: true,
        link: "admin.html#secSla"
      });
      NexusStorage.saveNotifications(notifs);
      initNotificationBell();
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate === todayStr) {
      const spaces = NexusStorage.getSpaces();
      const s = spaces.find(x => x.id === selectedSpace.id);
      if (s) {
        s.status = "busy";
        NexusStorage.saveSpaces(spaces);
      }
    }

    showSuccessPass(newBooking);
  }

  function showSuccessPass(booking) {
    document.querySelectorAll(".modal-step-content").forEach(el => el.style.display = "none");
    document.getElementById("modalStepSuccess").style.display = "block";

    document.getElementById("passBookingId").textContent = booking.id;
    document.getElementById("passSpaceName").textContent = booking.spaceName;
    document.getElementById("passDateTime").textContent = `${booking.date} | ${booking.timeStart} - ${booking.timeEnd}`;
    document.getElementById("passClient").textContent = `${booking.clientName} (${booking.company || 'Particular'})`;

    const statusBadge = document.getElementById("passStatusBadge");
    if (booking.status === "pending_sinpe") {
      statusBadge.className = "chip chip-pending";
      statusBadge.innerHTML = "⏳ Pendiente de Aprobación SINPE";
      document.getElementById("passStatusNotice").innerHTML = `
        <div style="background: rgba(233, 196, 106, 0.1); border: 1px solid rgba(233, 196, 106, 0.35); border-radius: 10px; padding: 14px; margin-top: 16px; font-size: 0.86rem; color: #F4E2D0;">
          <strong>Comprobante en validación concierge:</strong> Nuestro equipo confirmará la acreditación bancaria en menos de 15 minutos (SLA activo). Recibirá confirmación inmediata por WhatsApp y correo electrónico.
        </div>
      `;
    } else {
      statusBadge.className = "chip chip-confirmed";
      statusBadge.innerHTML = "✓ Confirmado &amp; Pagado";
      document.getElementById("passStatusNotice").innerHTML = `
        <div style="background: rgba(129, 152, 112, 0.12); border: 1px solid rgba(129, 152, 112, 0.35); border-radius: 10px; padding: 14px; margin-top: 16px; font-size: 0.86rem; color: #E8F0E4;">
          <strong>¡Reserva Exitosa!</strong> Hemos enviado los accesos biométricos y la factura electrónica oficial a <em>${booking.clientEmail}</em>.
        </div>
      `;
    }

    renderQrCode("passQrCode", booking.qrCodeData);
    showToast(`🎉 Reserva ${booking.id} generada exitosamente.`, "success");
    renderSpacesCatalog();
  }

  function renderQrCode(containerId, codeData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <svg viewBox="0 0 100 100" width="100%" height="100%" style="border-radius: 8px;">
        <rect width="100" height="100" fill="#FBF8F4"/>
        <rect x="10" y="10" width="22" height="22" fill="#241C18"/>
        <rect x="14" y="14" width="14" height="14" fill="#FBF8F4"/>
        <rect x="17" y="17" width="8" height="8" fill="#E07A5F"/>

        <rect x="68" y="10" width="22" height="22" fill="#241C18"/>
        <rect x="72" y="14" width="14" height="14" fill="#FBF8F4"/>
        <rect x="75" y="17" width="8" height="8" fill="#E07A5F"/>

        <rect x="10" y="68" width="22" height="22" fill="#241C18"/>
        <rect x="14" y="72" width="14" height="14" fill="#FBF8F4"/>
        <rect x="17" y="75" width="8" height="8" fill="#E07A5F"/>

        <rect x="38" y="12" width="6" height="6" fill="#241C18"/>
        <rect x="48" y="18" width="6" height="6" fill="#241C18"/>
        <rect x="38" y="26" width="8" height="6" fill="#241C18"/>
        <rect x="52" y="32" width="6" height="12" fill="#241C18"/>
        <rect x="12" y="42" width="8" height="8" fill="#241C18"/>
        <rect x="28" y="42" width="6" height="6" fill="#D4A373"/>
        <rect x="40" y="44" width="10" height="10" fill="#241C18"/>
        <rect x="62" y="44" width="8" height="6" fill="#241C18"/>
        <rect x="76" y="42" width="14" height="6" fill="#241C18"/>
        <rect x="38" y="64" width="6" height="8" fill="#241C18"/>
        <rect x="52" y="62" width="8" height="6" fill="#241C18"/>
        <rect x="68" y="68" width="8" height="8" fill="#D4A373"/>
        <rect x="80" y="78" width="10" height="10" fill="#241C18"/>
        <rect x="40" y="78" width="18" height="8" fill="#241C18"/>
      </svg>
    `;
  }

  window.sendWhatsappConfirmation = function() {
    const clientDisplayName = currentUser ? currentUser.name : "estimado socio";
    alert("Simulación de Envío a WhatsApp:\n\n📱 Mensaje generado:\n'Hola " + clientDisplayName + ", tu reserva en NEXUS (" + selectedSpace.name + ") está agendada. Presenta tu código QR en recepción al llegar. Teléfono concierge: +506 8888-6398.'");
  };

  // Setup Client Portal Events
  function setupClientPortalEvents() {
    const navReservations = document.getElementById("navMyReservations");
    if (navReservations) {
      navReservations.addEventListener("click", openClientPortalModal);
    }
  }

  window.openClientPortalModal = function() {
    if (!currentUser) {
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
        if (b.status === "confirmed") {
          statusBadge = `<span class="chip chip-confirmed">✓ Confirmada</span>`;
        } else if (b.status === "pending_sinpe") {
          statusBadge = `<span class="chip chip-pending">⏳ Revisión SINPE</span>`;
        } else if (b.status === "rescheduled") {
          statusBadge = `<span class="chip chip-rescheduled">🔄 Reprogramada</span>`;
        } else {
          statusBadge = `<span class="chip chip-cancelled">✖ Cancelada</span>`;
        }

        return `
          <div style="background: rgba(36, 29, 25, 0.45); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                <span style="font-weight: 800; color: #FFF; font-size: 1.05rem; font-family: 'Syne', sans-serif;">${b.id}</span>
                ${statusBadge}
                <span style="font-size: 0.82rem; color: var(--gold-warm);">${b.paymentMethod === 'sinpe' ? '📱 SINPE Móvil' : '💳 Tarjeta'}</span>
              </div>
              <div style="font-size: 0.98rem; font-weight: 600; color: #FFF;">${b.spaceName}</div>
              <div style="font-size: 0.84rem; color: #B8A99A;">📅 Fecha: ${b.date} | ⏰ Horario: ${b.timeStart} - ${b.timeEnd}</div>
              <div style="font-size: 0.84rem; color: var(--terracotta); font-weight: 600;">Total: ₡${b.totalCRC.toLocaleString()} ($${b.totalUSD})</div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm" onclick="viewDigitalPass('${b.id}')">Ver Pase QR</button>
              <button class="btn btn-primary btn-sm" onclick="openRescheduleModal('${b.id}')">Reprogramar 🔄</button>
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
    const modal = document.getElementById("bookingModal");
    showSuccessPass(booking);
    modal.classList.add("open");
  };

  // Reschedule Logic
  let currentRescheduleBookingId = null;
  window.openRescheduleModal = function(bookingId) {
    currentRescheduleBookingId = bookingId;
    const booking = NexusStorage.getBookings().find(b => b.id === bookingId);
    if (!booking) return;

    document.getElementById("rescheduleBookingId").textContent = booking.id;
    document.getElementById("rescheduleSpaceName").textContent = booking.spaceName;
    document.getElementById("rescheduleCurrentSlot").textContent = `${booking.date} (${booking.timeStart} - ${booking.timeEnd})`;
    document.getElementById("newRescheduleDate").value = booking.date;

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

    const bookings = NexusStorage.getBookings();
    const b = bookings.find(x => x.id === currentRescheduleBookingId);
    if (b) {
      const times = newTime.split(" - ");
      b.date = newDate;
      b.timeStart = times[0];
      b.timeEnd = times[1];
      b.status = "rescheduled";
      NexusStorage.saveBookings(bookings);

      closeRescheduleModal();
      openClientPortalModal();
      showToast(`✓ Reserva ${b.id} reprogramada con éxito para el ${newDate} a las ${newTime}.`, "success");
    }
  };

  // AUTH MODAL & ROLE SWITCHING (LOGIN, SIGN UP, DEMO SHORTCUTS)
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

    if (tab === "signup") {
      if (tabLogin) tabLogin.classList.remove("active");
      if (tabSignup) tabSignup.classList.add("active");
      if (contentLogin) contentLogin.style.display = "none";
      if (contentSignup) contentSignup.style.display = "block";
      if (headerTitle) headerTitle.textContent = "Registro de Nuevo Cliente";
    } else {
      if (tabSignup) tabSignup.classList.remove("active");
      if (tabLogin) tabLogin.classList.add("active");
      if (contentSignup) contentSignup.style.display = "none";
      if (contentLogin) contentLogin.style.display = "block";
      if (headerTitle) headerTitle.textContent = "Acceso de Clientes & Socios";
    }
  };

  window.fillAdminCredentials = function() {
    const emailInput = document.getElementById("loginEmail");
    const passInput = document.getElementById("loginPassword");
    if (emailInput) emailInput.value = "admin@nexusspaces.com";
    if (passInput) passInput.value = "admin123";
    showToast("👑 Credenciales administrativas cargadas.", "info");
  };

  window.handleUserLoginForm = function(event) {
    if (event) event.preventDefault();
    const emailInput = document.getElementById("loginEmail");
    const passInput = document.getElementById("loginPassword");
    const rawVal = emailInput ? emailInput.value.trim() : "";
    const email = rawVal.toLowerCase();
    const password = passInput ? passInput.value.trim() : "";

    // 1. Check if logging in as Gerencia / Admin
    const isAdminUser = (email === "admin" || email === "admin@nexusspaces.com" || email === "gerencia@nexus.com" || email === "gerencia");
    if (isAdminUser) {
      if (password === "admin123" || password === "admin" || password === "nexus2026") {
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
        setTimeout(() => {
          window.location.href = "admin.html";
        }, 600);
        return;
      } else {
        showToast("❌ Contraseña de gerencia incorrecta.", "warning");
        return;
      }
    }

    // 2. Client Login
    const clients = NexusStorage.getClients();
    let found = clients.find(c => c.email && c.email.toLowerCase() === email);

    if (!found) {
      found = {
        id: "cli-" + Date.now(),
        name: rawVal ? rawVal.split("@")[0].toUpperCase() : "Cliente Socio",
        email: rawVal.includes("@") ? rawVal : (rawVal + "@empresa.com"),
        phone: "+506 8888-0000",
        idNumber: "1-0000-0000",
        loyaltyTier: "Nuevo Socio",
        discountRate: 0.0
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

    const newClient = {
      id: "cli-" + Date.now(),
      name: name,
      idNumber: idNumber || "1-9999-9999",
      email: email,
      phone: phone,
      company: company || "Independiente",
      emergencyContact: "+506 8888-0000",
      loyaltyTier: "Nuevo Socio",
      discountRate: 0.0,
      registeredSince: new Date().toISOString().split("T")[0]
    };

    const clients = NexusStorage.getClients();
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
      const adminObj = {
        id: "admin-01",
        name: "Lic. Roberto Alvarado",
        email: "admin@nexusspaces.com",
        role: "admin",
        loyaltyTier: "Gerencia General"
      };
      NexusStorage.setCurrentUser(adminObj);
      NexusStorage.setAuthRole("admin");
      closeAuthModal();
      showToast("👑 Sesión de Gerencia General iniciada. Redirigiendo...", "success");
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 500);
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

  window.showToast = function(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4200);
  };
});
