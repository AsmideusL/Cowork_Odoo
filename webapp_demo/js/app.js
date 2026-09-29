// NEXUS COWORKING - FRONTEND CLIENT APPLICATION LOGIC (BOUTIQUE LUXURY EDITION)
document.addEventListener("DOMContentLoaded", () => {
  let currentFilterType = "hour";
  let selectedSpace = null;
  let selectedDate = new Date().toISOString().split("T")[0];
  let selectedTimeSlot = null;
  let selectedAddons = new Set();
  let currentUser = NexusStorage.getCurrentUser();

  // Initialize UI
  initUserBadge();
  renderSpacesCatalog();
  setupFloorPlanInteractions();
  setupSearchEvents();
  setupClientPortalEvents();

  // Sync user display in navbar
  function initUserBadge() {
    const userBadgeEl = document.getElementById("navUserBadge");
    if (!userBadgeEl) return;
    userBadgeEl.innerHTML = `
      <div class="user-avatar">${currentUser.name.charAt(0)}</div>
      <div style="text-align: left;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #FFF; line-height: 1.2;">${currentUser.name}</div>
        <span class="user-tier-badge">⭐ ${currentUser.loyaltyTier}</span>
      </div>
    `;
    userBadgeEl.onclick = openClientProfileModal;
  }

  // Render Spaces in Catalog
  function renderSpacesCatalog(filterCategory = "all") {
    const grid = document.getElementById("spacesGrid");
    if (!grid) return;
    const spaces = NexusStorage.getSpaces();

    const filtered = spaces.filter(sp => {
      if (filterCategory !== "all" && sp.category !== filterCategory) return false;
      return true;
    });

    grid.innerHTML = filtered.map(sp => {
      let priceDisplay = "";
      if (currentFilterType === "hour") {
        priceDisplay = `₡${sp.priceHour.toLocaleString()} <span class="price-sub">/ hora ($${sp.priceHourUSD})</span>`;
      } else if (currentFilterType === "day") {
        priceDisplay = `₡${sp.priceDay.toLocaleString()} <span class="price-sub">/ jornada ($${sp.priceDayUSD})</span>`;
      } else {
        priceDisplay = `₡${sp.priceMonth.toLocaleString()} <span class="price-sub">/ mes ($${sp.priceMonthUSD})</span>`;
      }

      const statusBadge = sp.status === "available" 
        ? `<div class="status-dot-badge"><span class="dot-free"></span> Disponible hoy</div>`
        : `<div class="status-dot-badge"><span class="dot-busy"></span> Con reservas</div>`;

      return `
        <div class="space-card" data-space-id="${sp.id}">
          <div class="card-img-wrap">
            <img src="${sp.image}" alt="${sp.name}" class="card-img" loading="lazy">
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
                <span class="price-amount">${priceDisplay}</span>
              </div>
              <button class="btn btn-primary btn-sm btn-book-space" data-id="${sp.id}">
                Reservar ➔
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".btn-book-space").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        openBookingModal(id);
      });
    });

    document.querySelectorAll(".space-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-space-id");
        openBookingModal(id);
      });
    });
  }

  function getBadgeClass(badge) {
    if (badge.includes("VIP")) return "badge-vip";
    if (badge.includes("Suite") || badge.includes("Privada")) return "badge-private";
    if (badge.includes("Acústica")) return "badge-pod";
    return "badge-flex";
  }

  // Interactive 2D Architectural Floor Plan
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
              <img src="${space.image}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border-gold);">
              <div>
                <h4 style="color: #FFF; font-size: 0.98rem;">${space.name}</h4>
                <span style="font-size: 0.78rem; color: var(--sage-green);">● ${space.status === 'available' ? 'Disponible para agendar' : 'Horarios tomados hoy'}</span>
              </div>
            </div>
            <p style="font-size: 0.82rem; color: #B8A99A; margin-bottom: 14px;">${space.description.slice(0, 88)}...</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; color: var(--champagne); font-size: 0.95rem; font-family: 'Syne', sans-serif;">₡${space.priceHour.toLocaleString()} / hr</span>
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

  function setupSearchEvents() {
    document.querySelectorAll(".booking-type-toggle .toggle-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".booking-type-toggle .toggle-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        currentFilterType = pill.getAttribute("data-type");
        renderSpacesCatalog();
      });
    });

    const categorySelect = document.getElementById("searchCategory");
    if (categorySelect) {
      categorySelect.addEventListener("change", (e) => {
        renderSpacesCatalog(e.target.value);
      });
    }

    const dateFilter = document.getElementById("searchDate");
    if (dateFilter) {
      dateFilter.value = selectedDate;
      dateFilter.addEventListener("change", (e) => {
        selectedDate = e.target.value;
      });
    }
  }

  // Booking Modal Logic
  window.openBookingModal = function(spaceId) {
    const spaces = NexusStorage.getSpaces();
    selectedSpace = spaces.find(s => s.id === spaceId);
    if (!selectedSpace) return;

    selectedAddons.clear();
    selectedTimeSlot = null;

    const modal = document.getElementById("bookingModal");
    const title = document.getElementById("modalSpaceTitle");
    const meta = document.getElementById("modalSpaceMeta");

    title.textContent = selectedSpace.name;
    meta.textContent = `📍 ${selectedSpace.floor} | 👥 Capacidad: ${selectedSpace.capacity} pers. | ⭐ ${selectedSpace.badge}`;

    switchModalStep(1);
    renderCalendarSlots();
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

  function renderCalendarSlots() {
    const container = document.getElementById("modalSlotsContainer");
    const dateInput = document.getElementById("bookingModalDate");
    if (!container || !selectedSpace) return;

    dateInput.value = selectedDate;
    dateInput.onchange = (e) => {
      selectedDate = e.target.value;
      renderCalendarSlots();
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
      const isBooked = bookings.some(b => {
        return slotStart >= b.timeStart && slotStart < b.timeEnd;
      });

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
    if (!selectedTimeSlot && currentFilterType === "hour") {
      showToast("⚠️ Por favor selecciona una franja horaria en el calendario.", "warning");
      return;
    }
    document.getElementById("custName").value = currentUser.name;
    document.getElementById("custIdNumber").value = currentUser.idNumber;
    document.getElementById("custEmail").value = currentUser.email;
    document.getElementById("custPhone").value = currentUser.phone;
    document.getElementById("custCompany").value = currentUser.company;
    document.getElementById("custEmergency").value = currentUser.emergencyContact;

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

    currentUser.name = name;
    currentUser.idNumber = idNum;
    currentUser.email = email;
    currentUser.phone = phone;
    currentUser.company = document.getElementById("custCompany").value.trim();
    currentUser.emergencyContact = document.getElementById("custEmergency").value.trim();
    NexusStorage.setCurrentUser(currentUser);
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

    if (currentFilterType === "day") {
      baseRateCRC = selectedSpace.priceDay;
      baseRateUSD = selectedSpace.priceDayUSD;
    } else if (currentFilterType === "month") {
      baseRateCRC = selectedSpace.priceMonth;
      baseRateUSD = selectedSpace.priceMonthUSD;
    }

    let addonsTotalCRC = 0;
    let addonsTotalUSD = 0;
    const selectedAddonObjs = NEXUS_DATA.addons.filter(a => selectedAddons.has(a.id));
    selectedAddonObjs.forEach(a => {
      addonsTotalCRC += a.price;
      addonsTotalUSD += a.priceUSD;
    });

    const subtotalCRC = baseRateCRC + addonsTotalCRC;
    const discountCRC = subtotalCRC * currentUser.discountRate;
    calculatedTotalCRC = subtotalCRC - discountCRC;

    const subtotalUSD = baseRateUSD + addonsTotalUSD;
    const discountUSD = subtotalUSD * currentUser.discountRate;
    calculatedTotalUSD = Math.round(subtotalUSD - discountUSD);

    summaryBox.innerHTML = `
      <div class="summary-row">
        <span>Espacio: <strong>${selectedSpace.name}</strong></span>
        <span>₡${baseRateCRC.toLocaleString()}</span>
      </div>
      <div class="summary-row">
        <span>Fecha & Horario:</span>
        <span>${selectedDate} (${selectedTimeSlot || 'Jornada Completa'})</span>
      </div>
      ${selectedAddonObjs.map(a => `
        <div class="summary-row" style="font-size: 0.84rem; color: #B8A99A;">
          <span>+ ${a.name}</span>
          <span>₡${a.price.toLocaleString()}</span>
        </div>
      `).join("")}
      <div class="summary-row" style="color: var(--gold-warm);">
        <span>Descuento de Membresía (${currentUser.loyaltyTier} - ${currentUser.discountRate * 100}%):</span>
        <span>-₡${discountCRC.toLocaleString()}</span>
      </div>
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

  let uploadedVoucherUrl = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80";
  const voucherInput = document.getElementById("sinpeFile");
  if (voucherInput) {
    voucherInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadedVoucherUrl = event.target.result;
          document.getElementById("sinpeUploadLabel").innerHTML = `
            <div style="color: var(--sage-green); font-weight: 700;">✓ Comprobante cargado exitosamente</div>
            <div style="font-size: 0.8rem; color: #B8A99A;">${file.name} (${(file.size / 1024).toFixed(1)} KB)</div>
          `;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  window.processBookingPayment = function() {
    const bookingId = "RES-" + Math.floor(1000 + Math.random() * 9000);
    const times = selectedTimeSlot ? selectedTimeSlot.split(" - ") : ["08:00", "17:00"];

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

    const newBooking = {
      id: bookingId,
      spaceId: selectedSpace.id,
      spaceName: selectedSpace.name,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientEmail: currentUser.email,
      clientPhone: currentUser.phone,
      company: currentUser.company,
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
  };

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
        <!-- Corner Markers in Warm Terracotta & Deep Charcoal -->
        <rect x="10" y="10" width="22" height="22" fill="#241C18"/>
        <rect x="14" y="14" width="14" height="14" fill="#FBF8F4"/>
        <rect x="17" y="17" width="8" height="8" fill="#E07A5F"/>

        <rect x="68" y="10" width="22" height="22" fill="#241C18"/>
        <rect x="72" y="14" width="14" height="14" fill="#FBF8F4"/>
        <rect x="75" y="17" width="8" height="8" fill="#E07A5F"/>

        <rect x="10" y="68" width="22" height="22" fill="#241C18"/>
        <rect x="14" y="72" width="14" height="14" fill="#FBF8F4"/>
        <rect x="17" y="75" width="8" height="8" fill="#E07A5F"/>

        <!-- Warm Data blocks -->
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

  function setupClientPortalEvents() {
    const navReservations = document.getElementById("navMyReservations");
    if (navReservations) {
      navReservations.addEventListener("click", openClientPortalModal);
    }
  }

  window.openClientPortalModal = function() {
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

  function openClientProfileModal() {
    const modal = document.getElementById("profileModal");
    if (!modal) return;
    document.getElementById("profName").value = currentUser.name;
    document.getElementById("profId").value = currentUser.idNumber;
    document.getElementById("profEmail").value = currentUser.email;
    document.getElementById("profPhone").value = currentUser.phone;
    document.getElementById("profCompany").value = currentUser.company;
    document.getElementById("profTier").value = currentUser.loyaltyTier;
    document.getElementById("profHours").textContent = `${currentUser.totalHoursBooked} horas acumuladas`;

    modal.classList.add("open");
  }

  window.closeProfileModal = function() {
    document.getElementById("profileModal").classList.remove("open");
  };

  window.saveClientProfile = function() {
    currentUser.name = document.getElementById("profName").value.trim();
    currentUser.idNumber = document.getElementById("profId").value.trim();
    currentUser.email = document.getElementById("profEmail").value.trim();
    currentUser.phone = document.getElementById("profPhone").value.trim();
    currentUser.company = document.getElementById("profCompany").value.trim();
    NexusStorage.setCurrentUser(currentUser);
    initUserBadge();
    closeProfileModal();
    showToast("✓ Perfil de socio actualizado.", "success");
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
