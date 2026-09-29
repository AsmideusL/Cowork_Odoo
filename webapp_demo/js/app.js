// NEXUS COWORKING - FRONTEND CLIENT APPLICATION LOGIC
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
        priceDisplay = `₡${sp.priceDay.toLocaleString()} <span class="price-sub">/ día ($${sp.priceDayUSD})</span>`;
      } else {
        priceDisplay = `₡${sp.priceMonth.toLocaleString()} <span class="price-sub">/ mes ($${sp.priceMonthUSD})</span>`;
      }

      const statusBadge = sp.status === "available" 
        ? `<div class="status-dot-badge"><span class="dot-free"></span> Libre hoy</div>`
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

    // Attach event listeners to book buttons
    document.querySelectorAll(".btn-book-space").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        openBookingModal(id);
      });
    });

    // Make card clickable
    document.querySelectorAll(".space-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-space-id");
        openBookingModal(id);
      });
    });
  }

  function getBadgeClass(badge) {
    if (badge.includes("VIP")) return "badge-vip";
    if (badge.includes("Privada")) return "badge-private";
    if (badge.includes("Acústica")) return "badge-pod";
    return "badge-flex";
  }

  // Interactive 2D Floor Plan logic
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

        // Mouse hover
        zone.addEventListener("mouseenter", (e) => {
          if (!previewDrawer) return;
          previewDrawer.style.display = "block";
          previewDrawer.innerHTML = `
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 8px;">
              <img src="${space.image}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
              <div>
                <h4 style="color: #FFF; font-size: 0.95rem;">${space.name}</h4>
                <span style="font-size: 0.75rem; color: #10B981;">● ${space.status === 'available' ? 'Disponible para reservar' : 'Con horarios reservados'}</span>
              </div>
            </div>
            <p style="font-size: 0.8rem; color: #9CA3AF; margin-bottom: 12px;">${space.description.slice(0, 85)}...</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; color: #FFF; font-size: 0.9rem;">₡${space.priceHour.toLocaleString()} / hr</span>
              <button class="btn btn-primary btn-sm" id="fpQuickBookBtn">Reservar</button>
            </div>
          `;
          document.getElementById("fpQuickBookBtn").onclick = () => openBookingModal(space.id);
        });

        // Click on zone opens booking modal directly
        zone.addEventListener("click", () => {
          openBookingModal(space.id);
        });
      }
    });
  }

  // Filter Buttons
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

    // Render Steps
    switchModalStep(1);
    renderCalendarSlots();
    renderAddonsSelector();
    modal.classList.add("open");
  };

  window.closeModal = function() {
    document.getElementById("bookingModal").classList.remove("open");
  };

  // Switch Wizard steps inside modal
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

  // Render Time Slots for Selected Room
  function renderCalendarSlots() {
    const container = document.getElementById("modalSlotsContainer");
    const dateInput = document.getElementById("bookingModalDate");
    if (!container || !selectedSpace) return;

    dateInput.value = selectedDate;
    dateInput.onchange = (e) => {
      selectedDate = e.target.value;
      renderCalendarSlots();
    };

    // Typical coworking hours: 08:00 to 18:00
    const timeSlots = [
      "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
      "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00",
      "16:00 - 17:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00"
    ];

    // Check booked slots from mock data and local storage bookings
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

  // Render Addon Services list
  function renderAddonsSelector() {
    const list = document.getElementById("addonsList");
    if (!list) return;

    list.innerHTML = NEXUS_DATA.addons.map(addon => {
      return `
        <div class="addon-item" data-addon-id="${addon.id}">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3rem;">${addon.icon}</span>
            <div>
              <div style="font-weight: 600; color: #FFF; font-size: 0.9rem;">${addon.name}</div>
              <div style="font-size: 0.75rem; color: #9CA3AF;">+₡${addon.price.toLocaleString()} ($${addon.priceUSD}) ${addon.unit}</div>
            </div>
          </div>
          <input type="checkbox" class="addon-checkbox" data-id="${addon.id}" style="width: 18px; height: 18px; accent-color: #10B981; cursor: pointer;">
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

  // Pre-checkout validation and go to Step 2 (Client Confirmation)
  window.validateStep1 = function() {
    if (!selectedTimeSlot && currentFilterType === "hour") {
      showToast("⚠️ Por favor selecciona una franja horaria en el calendario.", "warning");
      return;
    }
    // Prefill user form
    document.getElementById("custName").value = currentUser.name;
    document.getElementById("custIdNumber").value = currentUser.idNumber;
    document.getElementById("custEmail").value = currentUser.email;
    document.getElementById("custPhone").value = currentUser.phone;
    document.getElementById("custCompany").value = currentUser.company;
    document.getElementById("custEmergency").value = currentUser.emergencyContact;

    switchModalStep(2);
  };

  // Step 2 to Step 3 (Payment)
  window.validateStep2 = function() {
    const name = document.getElementById("custName").value.trim();
    const idNum = document.getElementById("custIdNumber").value.trim();
    const email = document.getElementById("custEmail").value.trim();
    const phone = document.getElementById("custPhone").value.trim();

    if (!name || !idNum || !email || !phone) {
      showToast("⚠️ Por favor completa los campos requeridos del cliente.", "warning");
      return;
    }

    // Update currentUser in case changed
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

  // Render Checkout Summary
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
        <div class="summary-row" style="font-size: 0.82rem; color: #9CA3AF;">
          <span>+ ${a.name}</span>
          <span>₡${a.price.toLocaleString()}</span>
        </div>
      `).join("")}
      <div class="summary-row" style="color: #F59E0B;">
        <span>Descuento Fidelidad (${currentUser.loyaltyTier} - ${currentUser.discountRate * 100}%):</span>
        <span>-₡${discountCRC.toLocaleString()}</span>
      </div>
      <div class="summary-row total">
        <span>Total a Pagar:</span>
        <span style="color: #10B981;">₡${calculatedTotalCRC.toLocaleString()} <span style="font-size: 0.85rem; font-weight: normal; color: #9CA3AF;">($${calculatedTotalUSD} USD)</span></span>
      </div>
    `;

    document.getElementById("sinpeTotalCRC").textContent = `₡${calculatedTotalCRC.toLocaleString()} CRC`;
  }

  // Toggle Payment Methods (Card vs SINPE)
  let currentPaymentMethod = "sinpe"; // default
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

  // Mock File Upload for SINPE Receipt
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
            <div style="color: #10B981; font-weight: 700;">✓ Comprobante cargado exitosamente</div>
            <div style="font-size: 0.8rem; color: #9CA3AF;">${file.name} (${(file.size / 1024).toFixed(1)} KB)</div>
          `;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Complete Booking Transaction
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

    // Save into state
    const bookings = NexusStorage.getBookings();
    bookings.unshift(newBooking);
    NexusStorage.saveBookings(bookings);

    // Update space status if booked today
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate === todayStr) {
      const spaces = NexusStorage.getSpaces();
      const s = spaces.find(x => x.id === selectedSpace.id);
      if (s) {
        s.status = "busy";
        NexusStorage.saveSpaces(spaces);
      }
    }

    // Show Success Pass Screen
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
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 12px; margin-top: 14px; font-size: 0.85rem; color: #FBBF24;">
          <strong>Comprobante en revisión administrativa:</strong> Nuestro equipo validará el comprobante bancario en menos de 15 minutos (SLA activo). Recibirá una confirmación a su correo y WhatsApp.
        </div>
      `;
    } else {
      statusBadge.className = "chip chip-confirmed";
      statusBadge.innerHTML = "✓ Confirmado & Pagado";
      document.getElementById("passStatusNotice").innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px; margin-top: 14px; font-size: 0.85rem; color: #34D399;">
          <strong>¡Reserva Exitosa!</strong> Hemos enviado los accesos biométricos y la factura electrónica a <em>${booking.clientEmail}</em>.
        </div>
      `;
    }

    // Render QR Code (SVG generator)
    renderQrCode("passQrCode", booking.qrCodeData);
    showToast(`🎉 Reserva ${booking.id} generada exitosamente.`, "success");
    renderSpacesCatalog();
  }

  // QR Code SVG Generator helper
  function renderQrCode(containerId, codeData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    // Generate high-contrast SVG QR pattern
    container.innerHTML = `
      <svg viewBox="0 0 100 100" width="100%" height="100%" style="border-radius: 6px;">
        <rect width="100" height="100" fill="#FFFFFF"/>
        <!-- Corner Markers -->
        <rect x="10" y="10" width="22" height="22" fill="#0F172A"/>
        <rect x="14" y="14" width="14" height="14" fill="#FFFFFF"/>
        <rect x="17" y="17" width="8" height="8" fill="#10B981"/>

        <rect x="68" y="10" width="22" height="22" fill="#0F172A"/>
        <rect x="72" y="14" width="14" height="14" fill="#FFFFFF"/>
        <rect x="75" y="17" width="8" height="8" fill="#10B981"/>

        <rect x="10" y="68" width="22" height="22" fill="#0F172A"/>
        <rect x="14" y="72" width="14" height="14" fill="#FFFFFF"/>
        <rect x="17" y="75" width="8" height="8" fill="#10B981"/>

        <!-- Mock Matrix data blocks -->
        <rect x="38" y="12" width="6" height="6" fill="#0F172A"/>
        <rect x="48" y="18" width="6" height="6" fill="#0F172A"/>
        <rect x="38" y="26" width="8" height="6" fill="#0F172A"/>
        <rect x="52" y="32" width="6" height="12" fill="#0F172A"/>
        <rect x="12" y="42" width="8" height="8" fill="#0F172A"/>
        <rect x="28" y="42" width="6" height="6" fill="#10B981"/>
        <rect x="40" y="44" width="10" height="10" fill="#0F172A"/>
        <rect x="62" y="44" width="8" height="6" fill="#0F172A"/>
        <rect x="76" y="42" width="14" height="6" fill="#0F172A"/>
        <rect x="38" y="64" width="6" height="8" fill="#0F172A"/>
        <rect x="52" y="62" width="8" height="6" fill="#0F172A"/>
        <rect x="68" y="68" width="8" height="8" fill="#10B981"/>
        <rect x="80" y="78" width="10" height="10" fill="#0F172A"/>
        <rect x="40" y="78" width="18" height="8" fill="#0F172A"/>
      </svg>
    `;
  }

  // Setup Client Portal Events & Modal
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
      container.innerHTML = `<p style="color: #9CA3AF; text-align: center; padding: 20px;">No tienes reservas activas por el momento.</p>`;
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
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                <span style="font-weight: 800; color: #FFF; font-size: 1rem;">${b.id}</span>
                ${statusBadge}
                <span style="font-size: 0.8rem; color: #06B6D4;">${b.paymentMethod === 'sinpe' ? '📱 SINPE Móvil' : '💳 Tarjeta'}</span>
              </div>
              <div style="font-size: 0.95rem; font-weight: 600; color: #FFF;">${b.spaceName}</div>
              <div style="font-size: 0.82rem; color: #9CA3AF;">📅 Fecha: ${b.date} | ⏰ Horario: ${b.timeStart} - ${b.timeEnd}</div>
              <div style="font-size: 0.82rem; color: #10B981; font-weight: 600;">Total: ₡${b.totalCRC.toLocaleString()} ($${b.totalUSD})</div>
            </div>
            <div style="display: flex; gap: 8px;">
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

  // View Existing Digital Pass from portal
  window.viewDigitalPass = function(bookingId) {
    const booking = NexusStorage.getBookings().find(b => b.id === bookingId);
    if (!booking) return;
    closePortalModal();
    const modal = document.getElementById("bookingModal");
    showSuccessPass(booking);
    modal.classList.add("open");
  };

  // Reschedule Modal Logic
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

  // Switch / Edit Client Profile Modal
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
    showToast("✓ Perfil de cliente actualizado.", "success");
  };

  // Toast Notification helper
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
    }, 4000);
  };
});
