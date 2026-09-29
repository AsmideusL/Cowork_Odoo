// NEXUS COWORKING - EXECUTIVE CONCIERGE & ADMIN DASHBOARD LOGIC (ENTERPRISE EDITION)
var activeCalendarSpaceId = "all";
var bookings = [];
var spaces = [];

function initNexusAdmin() {
  bookings = NexusStorage.getBookings();
  spaces = NexusStorage.getSpaces();
  initAdminDashboard();
  setupAdminTabs();
  setupAdminFilters();
  startSlaTimers();
  initAdminNotificationBell();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNexusAdmin);
} else {
  initNexusAdmin();
}

  function initAdminDashboard() {
    bookings = NexusStorage.getBookings();
    spaces = NexusStorage.getSpaces();

    renderKpiCards();
    renderSlaVerificationQueue();
    renderAdminBookingsTable();
    renderRoomCalendarViewer();
    initCharts();
    renderTopClientsList();
    renderAdminNotificationBell();
  }

  // Admin Top Navigation Tabs
  window.switchAdminSection = function(targetSection) {
    document.querySelectorAll(".admin-nav-item").forEach(t => {
      if (t.getAttribute("data-target") === targetSection) t.classList.add("active");
      else t.classList.remove("active");
    });

    document.querySelectorAll(".admin-section").forEach(sec => sec.style.display = "none");
    const activeSec = document.getElementById(targetSection);
    if (activeSec) activeSec.style.display = "block";

    if (targetSection === "secAnalytics") {
      initCharts();
    }
  };

  function setupAdminTabs() {
    const tabs = document.querySelectorAll(".admin-nav-item");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const targetSection = tab.getAttribute("data-target");
        switchAdminSection(targetSection);
      });
    });

    // Check hash in URL if provided (e.g. #secSla or #secBookings)
    if (window.location.hash) {
      const targetHash = window.location.hash.substring(1);
      switchAdminSection(targetHash);
    }
  }

  // Search & Filter controls for Bookings Table
  function setupAdminFilters() {
    const searchInput = document.getElementById("adminSearchInput");
    const statusFilter = document.getElementById("adminStatusFilter");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderAdminBookingsTable(searchInput.value, statusFilter.value);
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        renderAdminBookingsTable(searchInput ? searchInput.value : "", statusFilter.value);
      });
    }
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
            <img src="${item.sinpeVoucherUrl || 'assets/voucher_bac.svg'}" 
                 onerror="this.src='assets/voucher_bac.svg'"
                 class="voucher-thumb" 
                 onclick="openVoucherModal('${item.id}', '${item.sinpeVoucherUrl || 'assets/voucher_bac.svg'}')" 
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
    }, 25000);
  }

  // Open Fullscreen Voucher Inspection Modal
  window.openVoucherModal = function(bookingId, voucherUrl) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.getElementById("voucherModal");
    const safeVoucher = voucherUrl || "assets/voucher_bac.svg";
    document.getElementById("modalVoucherImg").src = safeVoucher;
    document.getElementById("modalVoucherDetails").innerHTML = `
      <h3 style="color: #FFF; margin-bottom: 8px;">Comprobante de Reserva ${booking.id}</h3>
      <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 4px;"><strong>Socio:</strong> ${booking.clientName} (${booking.clientPhone})</p>
      <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 4px;"><strong>Referencia Bancaria:</strong> ${booking.sinpeRef || 'SINPE-DEMO'}</p>
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
      showToast(`✓ Pago SINPE de la reserva ${bookingId} validado. Factura electrónica emitida exitosamente.`, "success");
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

  // Render Master Admin Bookings Table with Search & Status filters
  function renderAdminBookingsTable(searchTerm = "", statusFilter = "all") {
    const tbody = document.getElementById("adminBookingsTbody");
    if (!tbody) return;

    let filtered = bookings;

    if (statusFilter !== "all") {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.id.toLowerCase().includes(q) || 
        b.clientName.toLowerCase().includes(q) || 
        b.spaceName.toLowerCase().includes(q) ||
        (b.company && b.company.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #B8A99A; padding: 24px;">No se encontraron reservas con los criterios especificados.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(b => {
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

  // Manual Room Reservation / Block by Admin
  window.openManualBookingModal = function() {
    const modal = document.getElementById("manualBookingModal");
    const spaceSelect = document.getElementById("manSpaceSelect");
    const dateInput = document.getElementById("manDate");
    if (!modal || !spaceSelect) return;

    spaceSelect.innerHTML = spaces.map(s => `<option value="${s.id}">${s.name} (${s.floor})</option>`).join("");
    dateInput.value = new Date().toISOString().split("T")[0];
    modal.classList.add("open");
  };

  window.closeManualBookingModal = function() {
    document.getElementById("manualBookingModal").classList.remove("open");
  };

  window.confirmManualBooking = function() {
    const spaceId = document.getElementById("manSpaceSelect").value;
    const clientName = document.getElementById("manClientName").value.trim() || "Bloqueo Interno Gerencial";
    const date = document.getElementById("manDate").value;
    const timeSlot = document.getElementById("manTimeSlot").value;
    const times = timeSlot.split(" - ");
    const space = spaces.find(s => s.id === spaceId);

    const newBooking = {
      id: "MAN-" + Math.floor(1000 + Math.random() * 9000),
      spaceId: space.id,
      spaceName: space.name,
      clientId: "admin-1",
      clientName: clientName,
      clientEmail: "admin@nexusspaces.com",
      clientPhone: "+506 8888-6398",
      company: "Gestión Interna NEXUS",
      bookingType: "hour",
      date: date,
      timeStart: times[0],
      timeEnd: times[1],
      hours: 4,
      addons: [],
      totalCRC: space.priceHour * 4,
      totalUSD: space.priceHourUSD * 4,
      paymentMethod: "transfer",
      sinpeRef: "ADMIN-OVERRIDE",
      sinpeVoucherUrl: null,
      status: "confirmed",
      qrCodeData: `MANUAL-${space.id}-${date}`,
      createdAt: new Date().toISOString()
    };

    bookings.unshift(newBooking);
    NexusStorage.saveBookings(bookings);
    closeManualBookingModal();
    initAdminDashboard();
    showToast(`✓ Sala ${space.name} bloqueada/reservada con éxito para el ${date}.`, "success");
  };

  // Export Bookings to CSV
  window.exportBookingsToCSV = function() {
    let csv = "ID Reserva,Socio,Empresa,Espacio,Fecha,Inicio,Fin,Total CRC,Total USD,Metodo Pago,Estado\n";
    bookings.forEach(b => {
      csv += `"${b.id}","${b.clientName}","${b.company || 'N/A'}","${b.spaceName}","${b.date}","${b.timeStart}","${b.timeEnd}",${b.totalCRC},${b.totalUSD},"${b.paymentMethod}","${b.status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_reservas_nexus_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    showToast("📥 Reporte gerencial exportado en formato CSV.", "success");
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

  // Render Charts
  let roomsChartInstance = null;
  let revenueChartInstance = null;

  function drawNativeBarChart(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 420;
    const w = canvas.width = Math.max(340, parentW - 30);
    const h = canvas.height = 230;
    ctx.clearRect(0, 0, w, h);

    const labels = ['Horizon', 'Alpha', 'Oasis', 'Flex', 'Creative'];
    const values = [142, 98, 76, 185, 64];
    const colors = ['#E07A5F', '#D4A373', '#E9C46A', '#819870', '#C95A53'];
    const maxVal = 200;
    const padLeft = 40;
    const padRight = 20;
    const padTop = 30;
    const padBottom = 35;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;
    const colW = chartW / values.length;
    const barW = Math.min(36, Math.max(20, colW - 20));

    // Base horizontal grid line
    ctx.strokeStyle = 'rgba(224, 196, 172, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, h - padBottom);
    ctx.lineTo(w - padRight, h - padBottom);
    ctx.stroke();

    values.forEach((v, i) => {
      const x = padLeft + i * colW + (colW - barW) / 2;
      const barH = (v / maxVal) * chartH;
      const y = h - padBottom - barH;

      ctx.fillStyle = colors[i];
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, barW, barH);
      }

      // Value label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(v + 'h', x + barW / 2, y - 6);

      // Category label
      ctx.fillStyle = '#B8A99A';
      ctx.font = '11px sans-serif';
      ctx.fillText(labels[i], x + barW / 2, h - padBottom + 18);
    });
  }

  function drawNativeDonutChart(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 340;
    const w = canvas.width = Math.max(280, parentW - 30);
    const h = canvas.height = 230;
    ctx.clearRect(0, 0, w, h);

    const slices = [
      { label: 'Por Horas', pct: '35%', val: 35, color: '#E07A5F' },
      { label: 'Por Jornada', pct: '25%', val: 25, color: '#D4A373' },
      { label: 'Planes Mensuales', pct: '40%', val: 40, color: '#819870' }
    ];
    const total = 100;
    const centerX = w / 2;
    const centerY = (h - 40) / 2;
    const outerR = Math.min(centerX, centerY) - 15;
    const innerR = outerR * 0.58;

    let start = -Math.PI / 2;
    slices.forEach(s => {
      const angle = (s.val / total) * 2 * Math.PI;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerR, start, start + angle);
      ctx.arc(centerX, centerY, innerR, start + angle, start, true);
      ctx.closePath();
      ctx.fill();
      start += angle;
    });

    // Center text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mix Ingresos', centerX, centerY + 4);

    // Legend
    const legendY = h - 16;
    const spacing = w / slices.length;
    slices.forEach((s, idx) => {
      const lx = idx * spacing + 10;
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, legendY - 8, 8, 8);
      ctx.fillStyle = '#B8A99A';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${s.label} (${s.pct})`, lx + 12, legendY);
    });
  }

  function initCharts() {
    const ctxRooms = document.getElementById("chartRoomsDemand");
    const ctxRevenue = document.getElementById("chartRevenueMix");

    if (window.Chart) {
      if (ctxRooms) {
        if (roomsChartInstance) roomsChartInstance.destroy();
        roomsChartInstance = new Chart(ctxRooms, {
          type: 'bar',
          data: {
            labels: ['Boardroom Horizon', 'Private Alpha', 'Pod Oasis', 'Hot Desk Flex', 'Creative Lab'],
            datasets: [{
              label: 'Horas Reservadas este Mes',
              data: [142, 98, 76, 185, 64],
              backgroundColor: [
                'rgba(224, 122, 95, 0.75)',
                'rgba(212, 163, 115, 0.75)',
                'rgba(233, 196, 106, 0.75)',
                'rgba(129, 152, 112, 0.75)',
                'rgba(201, 90, 83, 0.75)'
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
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: 'rgba(224, 196, 172, 0.08)' }, ticks: { color: '#B8A99A' } },
              x: { grid: { display: false }, ticks: { color: '#B8A99A' } }
            }
          }
        });
      }

      if (ctxRevenue) {
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
    } else {
      // Offline fallback: Direct HTML5 Canvas drawing
      drawNativeBarChart(ctxRooms);
      drawNativeDonutChart(ctxRevenue);
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

  function showToast(message, type = "info") {
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
  }

  // Admin Notification Bell Logic
  window.toggleAdminNotifDropdown = function(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById("adminNotifDropdown");
    if (dropdown) dropdown.classList.toggle("open");
  };

  window.markAllAdminNotifsRead = function() {
    const notifs = NexusStorage.getNotifications();
    notifs.forEach(n => n.unread = false);
    NexusStorage.saveNotifications(notifs);
    renderAdminNotificationBell();
    showToast("✓ Todas las alertas administrativas marcadas como leídas.", "info");
  };

  function initAdminNotificationBell() {
    const bellBtn = document.getElementById("adminNotifBellBtn");
    const dropdown = document.getElementById("adminNotifDropdown");

    if (bellBtn) {
      bellBtn.onclick = (e) => {
        window.toggleAdminNotifDropdown(e);
      };
    }

    document.addEventListener("click", (e) => {
      if (dropdown && !dropdown.contains(e.target) && e.target !== bellBtn) {
        dropdown.classList.remove("open");
      }
    });

    renderAdminNotificationBell();
  }

  function renderAdminNotificationBell() {
    const container = document.getElementById("adminNotifItemsContainer");
    const badge = document.getElementById("adminNotifCountBadge");
    const notifs = NexusStorage.getNotifications();
    const unreadCount = notifs.filter(n => n.unread).length;

    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? "flex" : "none";
    }

    if (container) {
      if (notifs.length === 0) {
        container.innerHTML = `<div style="padding: 16px; text-align: center; color: #B8A99A; font-size: 0.82rem;">No hay alertas pendientes</div>`;
      } else {
        container.innerHTML = notifs.map(n => `
          <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="handleNotifClick('${n.link || 'secSla'}')">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.message}</div>
            <div class="notif-time">⏱️ ${n.time}</div>
          </div>
        `).join("");
      }
    }
  }

  window.handleNotifClick = function(targetSection) {
    const cleanSec = targetSection.includes("#") ? targetSection.split("#")[1] : targetSection;
    if (cleanSec) {
      switchAdminSection(cleanSec);
    }
    const dropdown = document.getElementById("adminNotifDropdown");
    if (dropdown) dropdown.classList.remove("open");
  };

  window.logoutAdmin = function() {
    NexusStorage.setAuthRole("guest");
    NexusStorage.setCurrentUser(null);
    showToast("Sesión de gerencia cerrada exitosamente.", "info");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 350);
  };
