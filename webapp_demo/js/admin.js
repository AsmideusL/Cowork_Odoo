// NEXUS COWORKING - EXECUTIVE CONCIERGE & ADMIN DASHBOARD LOGIC
document.addEventListener("DOMContentLoaded", () => {
  let activeCalendarSpaceId = "all";
  let bookings = NexusStorage.getBookings();
  let spaces = NexusStorage.getSpaces();

  // Initialize
  initAdminDashboard();
  setupAdminTabs();
  startSlaTimers();

  function initAdminDashboard() {
    bookings = NexusStorage.getBookings();
    spaces = NexusStorage.getSpaces();

    renderKpiCards();
    renderSlaVerificationQueue();
    renderAdminBookingsTable();
    renderRoomCalendarViewer();
    initCharts();
    renderTopClientsList();
  }

  // Admin Top Navigation Tabs
  function setupAdminTabs() {
    const tabs = document.querySelectorAll(".admin-nav-item");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const targetSection = tab.getAttribute("data-target");

        document.querySelectorAll(".admin-section").forEach(sec => sec.style.display = "none");
        const activeSec = document.getElementById(targetSection);
        if (activeSec) activeSec.style.display = "block";
      });
    });
  }

  // Render KPIs
  function renderKpiCards() {
    const totalBookings = bookings.length;
    const pendingSinpe = bookings.filter(b => b.status === "pending_sinpe").length;
    
    let totalRevenueCRC = 0;
    bookings.forEach(b => {
      if (b.status === "confirmed" || b.status === "rescheduled") {
        totalRevenueCRC += b.totalCRC;
      }
    });

    document.getElementById("kpiTotalBookings").textContent = totalBookings;
    document.getElementById("kpiTotalRevenue").textContent = `₡${(totalRevenueCRC / 1000).toFixed(0)}K`;
    document.getElementById("kpiPendingSinpe").textContent = pendingSinpe;
    document.getElementById("kpiOccupancyRate").textContent = "86%";
    document.getElementById("kpiAvgSla").textContent = "7.4 min";
  }

  // Render Pending SINPE Approvals Queue with SLA Clock
  function renderSlaVerificationQueue() {
    const container = document.getElementById("slaQueueContainer");
    if (!container) return;

    const pending = bookings.filter(b => b.status === "pending_sinpe");

    if (pending.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 26px; color: #819870; font-weight: 600;">
          ✓ ¡Bandeja al día! No hay comprobantes de SINPE pendientes de verificación.
        </div>
      `;
      return;
    }

    container.innerHTML = pending.map(item => {
      const submittedTime = new Date(item.sinpeSubmittedAt || item.createdAt).getTime();
      const now = new Date().getTime();
      const elapsedMin = Math.max(1, Math.floor((now - submittedTime) / (1000 * 60)));
      
      let slaBadgeClass = "sla-green";
      let slaStatusText = `En tiempo (${elapsedMin}m / 30m)`;
      if (elapsedMin > 20) {
        slaBadgeClass = "sla-red";
        slaStatusText = `¡URGENTE! (${elapsedMin}m / 30m)`;
      } else if (elapsedMin > 10) {
        slaBadgeClass = "sla-amber";
        slaStatusText = `Atención requerida (${elapsedMin}m / 30m)`;
      }

      return `
        <div class="sla-item-card" style="background: rgba(36, 29, 25, 0.45); border: 1px solid rgba(212, 163, 115, 0.2); border-radius: 14px; padding: 20px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 18px;">
          <div style="display: flex; align-items: center; gap: 18px;">
            <img src="${item.sinpeVoucherUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'}" 
                 class="voucher-thumb" 
                 onclick="openVoucherModal('${item.id}', '${item.sinpeVoucherUrl}')" 
                 title="Haga clic para ampliar comprobante">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                <span style="font-weight: 800; color: #FFF; font-family: 'Syne', sans-serif;">${item.id}</span>
                <span class="sla-badge-timer ${slaBadgeClass}">⏱️ ${slaStatusText}</span>
              </div>
              <div style="font-size: 0.96rem; font-weight: 700; color: #FFF;">${item.clientName} · <span style="font-weight: normal; color: #B8A99A;">${item.company || 'Particular'}</span></div>
              <div style="font-size: 0.84rem; color: #B8A99A;">
                📍 ${item.spaceName} | 📅 ${item.date} (${item.timeStart} - ${item.timeEnd})
              </div>
              <div style="font-size: 0.84rem; color: var(--gold-warm); font-family: 'Syne', sans-serif;">
                Ref SINPE: <strong>${item.sinpeRef || 'N/A'}</strong> | Monto: <strong>₡${item.totalCRC.toLocaleString()}</strong> ($${item.totalUSD})
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary btn-sm" onclick="openVoucherModal('${item.id}', '${item.sinpeVoucherUrl}')">🔍 Ver Recibo</button>
            <button class="btn btn-primary btn-sm" onclick="approveSinpeBooking('${item.id}')">✓ Validar &amp; Aprobar</button>
            <button class="btn btn-secondary btn-sm" style="color: #E88F8A; border-color: rgba(201,90,83,0.3);" onclick="rejectSinpeBooking('${item.id}')">✖ Rechazar</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function startSlaTimers() {
    setInterval(() => {
      renderSlaVerificationQueue();
    }, 30000);
  }

  // Open Fullscreen Voucher Inspection Modal
  window.openVoucherModal = function(bookingId, voucherUrl) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.getElementById("voucherModal");
    document.getElementById("modalVoucherImg").src = voucherUrl || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80";
    document.getElementById("modalVoucherDetails").innerHTML = `
      <h3 style="color: #FFF; margin-bottom: 8px;">Comprobante de Reserva ${booking.id}</h3>
      <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 4px;"><strong>Socio:</strong> ${booking.clientName} (${booking.clientPhone})</p>
      <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 4px;"><strong>Referencia Bancaria:</strong> ${booking.sinpeRef}</p>
      <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 4px;"><strong>Monto esperado:</strong> ₡${booking.totalCRC.toLocaleString()}</p>
      <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 18px;"><strong>Sala solicitada:</strong> ${booking.spaceName}</p>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-primary btn-block" onclick="approveSinpeBooking('${booking.id}'); closeVoucherModal();">✓ Aprobar Pago &amp; Emitir Factura Electrónica</button>
      </div>
    `;

    modal.classList.add("open");
  };

  window.closeVoucherModal = function() {
    document.getElementById("voucherModal").classList.remove("open");
  };

  // Approve SINPE Booking
  window.approveSinpeBooking = function(bookingId) {
    const target = bookings.find(b => b.id === bookingId);
    if (target) {
      target.status = "confirmed";
      NexusStorage.saveBookings(bookings);
      initAdminDashboard();
      showToast(`✓ Pago SINPE de la reserva ${bookingId} validado. Factura electrónica emitida y notificada al socio por email.`, "success");
    }
  };

  // Reject SINPE Booking
  window.rejectSinpeBooking = function(bookingId) {
    const reason = prompt("Indique el motivo del rechazo del comprobante (ej: Fondos no recibidos en cuenta, comprobante ilegible):", "Monto transferido no coincide con el total de la reserva.");
    if (reason) {
      const target = bookings.find(b => b.id === bookingId);
      if (target) {
        target.status = "cancelled";
        target.rejectReason = reason;
        NexusStorage.saveBookings(bookings);
        initAdminDashboard();
        showToast(`❌ Reserva ${bookingId} cancelada. Notificación con motivo enviada al socio.`, "warning");
      }
    }
  };

  // Render Master Admin Bookings Table
  function renderAdminBookingsTable() {
    const tbody = document.getElementById("adminBookingsTbody");
    if (!tbody) return;

    tbody.innerHTML = bookings.map(b => {
      let statusBadge = "";
      if (b.status === "confirmed") {
        statusBadge = `<span class="chip chip-confirmed">✓ Confirmada</span>`;
      } else if (b.status === "pending_sinpe") {
        statusBadge = `<span class="chip chip-pending">⏳ Pendiente SINPE</span>`;
      } else if (b.status === "rescheduled") {
        statusBadge = `<span class="chip chip-rescheduled">🔄 Reprogramada</span>`;
      } else {
        statusBadge = `<span class="chip chip-cancelled">✖ Cancelada</span>`;
      }

      return `
        <tr>
          <td><strong style="color: #FFF; font-family: 'Syne', sans-serif;">${b.id}</strong></td>
          <td>
            <div style="font-weight: 700; color: #FFF;">${b.clientName}</div>
            <div style="font-size: 0.78rem; color: #B8A99A;">${b.company || 'Particular'} · ${b.clientPhone}</div>
          </td>
          <td>${b.spaceName}</td>
          <td>
            <div>${b.date}</div>
            <div style="font-size: 0.78rem; color: #B8A99A;">${b.timeStart} - ${b.timeEnd}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--terracotta);">₡${b.totalCRC.toLocaleString()}</div>
            <div style="font-size: 0.78rem; color: var(--gold-warm);">${b.paymentMethod === 'sinpe' ? '📱 SINPE' : '💳 Tarjeta'}</div>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="adminOpenReschedule('${b.id}')" title="Reprogramar reserva">🔄</button>
              <button class="btn btn-secondary btn-sm" onclick="adminCancelBooking('${b.id}')" title="Cancelar reserva" style="color: #E88F8A;">✖</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Admin Reschedule & Cancel actions
  window.adminOpenReschedule = function(bookingId) {
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;

    const newDate = prompt(`Reprogramar reserva ${b.id} (${b.spaceName}). Ingrese nueva fecha (YYYY-MM-DD):`, b.date);
    if (!newDate) return;
    const newTimes = prompt(`Ingrese nuevo horario (ej. 14:00 - 16:00):`, `${b.timeStart} - ${b.timeEnd}`);
    if (!newTimes) return;

    const times = newTimes.split(" - ");
    b.date = newDate;
    b.timeStart = times[0];
    b.timeEnd = times[1];
    b.status = "rescheduled";
    NexusStorage.saveBookings(bookings);
    initAdminDashboard();
    showToast(`✓ Reserva ${b.id} reprogramada administrativamente con notificación al socio.`, "success");
  };

  window.adminCancelBooking = function(bookingId) {
    if (confirm(`¿Está seguro de cancelar la reserva ${bookingId}? Se liberará el espacio en el calendario.`)) {
      const b = bookings.find(x => x.id === bookingId);
      if (b) {
        b.status = "cancelled";
        NexusStorage.saveBookings(bookings);
        initAdminDashboard();
        showToast(`Reserva ${bookingId} cancelada.`, "warning");
      }
    }
  };

  // Individual Room Calendar Viewer
  function renderRoomCalendarViewer() {
    const selector = document.getElementById("adminRoomCalendarSelect");
    const container = document.getElementById("adminRoomCalendarView");
    if (!selector || !container) return;

    selector.innerHTML = `<option value="all">Todas las salas / Vista General</option>` + 
      spaces.map(s => `<option value="${s.id}" ${activeCalendarSpaceId === s.id ? 'selected' : ''}>${s.name}</option>`).join("");

    selector.onchange = (e) => {
      activeCalendarSpaceId = e.target.value;
      renderRoomCalendarViewer();
    };

    const filteredBookings = activeCalendarSpaceId === "all" 
      ? bookings.filter(b => b.status !== "cancelled")
      : bookings.filter(b => b.spaceId === activeCalendarSpaceId && b.status !== "cancelled");

    const days = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); gap: 18px;">
        ${days.map(d => {
          const dayBookings = filteredBookings.filter(b => b.date === d);
          return `
            <div style="background: rgba(36, 29, 25, 0.4); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px;">
              <div style="font-weight: 700; color: #FFF; font-size: 0.98rem; margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
                📅 ${d} ${d === '2026-09-29' ? '<span style="color:var(--terracotta); font-size:0.78rem;">(HOY)</span>' : ''}
              </div>
              ${dayBookings.length === 0 ? `<div style="font-size: 0.82rem; color: #7D6F63; text-align: center; padding: 20px 0;">Sin reservas agendadas</div>` : ''}
              ${dayBookings.map(b => `
                <div style="background: rgba(224, 122, 95, 0.09); border-left: 3px solid var(--terracotta); border-radius: 6px; padding: 10px 12px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; color: #FFF;">
                    <span>⏰ ${b.timeStart} - ${b.timeEnd}</span>
                    <span style="color: var(--gold-warm); font-family: 'Syne', sans-serif;">${b.id}</span>
                  </div>
                  <div style="font-size: 0.86rem; color: #FFF;">${b.spaceName}</div>
                  <div style="font-size: 0.78rem; color: #B8A99A;">👤 ${b.clientName}</div>
                </div>
              `).join("")}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  // Render Charts with Warm Palette in Chart.js
  let roomsChartInstance = null;
  let revenueChartInstance = null;

  function initCharts() {
    const ctxRooms = document.getElementById("chartRoomsDemand");
    const ctxRevenue = document.getElementById("chartRevenueMix");

    if (ctxRooms && window.Chart) {
      if (roomsChartInstance) roomsChartInstance.destroy();
      roomsChartInstance = new Chart(ctxRooms, {
        type: 'bar',
        data: {
          labels: ['Boardroom Horizon', 'Private Alpha', 'Pod Oasis', 'Hot Desk Flex', 'Creative Lab'],
          datasets: [{
            label: 'Horas Reservadas este Mes',
            data: [142, 98, 76, 185, 64],
            backgroundColor: [
              'rgba(224, 122, 95, 0.75)',  // Warm Terracotta
              'rgba(212, 163, 115, 0.75)', // Champagne Gold
              'rgba(233, 196, 106, 0.75)', // Warm Amber
              'rgba(129, 152, 112, 0.75)', // Sage Green
              'rgba(201, 90, 83, 0.75)'    // Rosewood
            ],
            borderColor: [
              '#E07A5F', '#D4A373', '#E9C46A', '#819870', '#C95A53'
            ],
            borderWidth: 1.5,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { grid: { color: 'rgba(224, 196, 172, 0.08)' }, ticks: { color: '#B8A99A' } },
            x: { grid: { display: false }, ticks: { color: '#B8A99A' } }
          }
        }
      });
    }

    if (ctxRevenue && window.Chart) {
      if (revenueChartInstance) revenueChartInstance.destroy();
      revenueChartInstance = new Chart(ctxRevenue, {
        type: 'doughnut',
        data: {
          labels: ['Por Horas', 'Por Jornadas', 'Planes Mensuales'],
          datasets: [{
            data: [35, 25, 40],
            backgroundColor: ['#E07A5F', '#D4A373', '#819870'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#B8A99A', font: { family: 'Plus Jakarta Sans' } } }
          }
        }
      });
    }
  }

  // Render Top Frequent Clients
  function renderTopClientsList() {
    const list = document.getElementById("topClientsList");
    if (!list) return;

    const clients = NexusStorage.getClients();
    list.innerHTML = clients.map((c, index) => {
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border-bottom: 1px solid rgba(224, 196, 172, 0.08);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-weight: 800; color: var(--gold-warm); font-size: 1.15rem; font-family: 'Syne', sans-serif;">#${index + 1}</span>
            <div>
              <div style="font-weight: 700; color: #FFF; font-size: 0.98rem;">${c.name}</div>
              <div style="font-size: 0.78rem; color: #B8A99A;">${c.company} · Céd: ${c.idNumber}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: var(--terracotta); font-size: 0.94rem; font-family: 'Syne', sans-serif;">₡${c.totalSpentCRC.toLocaleString()}</div>
            <div style="font-size: 0.78rem; color: var(--gold-warm);">⭐ ${c.loyaltyTier} (${c.totalHoursBooked} hrs)</div>
          </div>
        </div>
      `;
    }).join("");
  }
});
