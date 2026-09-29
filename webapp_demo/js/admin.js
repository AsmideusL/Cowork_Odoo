// NEXUS COWORKING - EXECUTIVE CONCIERGE & ADMIN DASHBOARD LOGIC (ENTERPRISE EDITION)
var activeCalendarSpaceId = "all";
var bookings = [];
var spaces = [];

// Guardia de acceso (demo): solo la sesión de Gerencia puede ver el panel.
// Nota: es una protección de interfaz; en producción el control de acceso lo hace el servidor (Odoo).
if (NexusStorage.getAuthRole() !== "admin") {
  window.location.replace("index.html#login");
}

function refreshData() {
  bookings = NexusStorage.getBookings();
  spaces = NexusStorage.getSpaces();
}

// Aplica un cambio sobre los datos MÁS RECIENTES y vuelve a pintar el panel.
// Evita sobrescribir reservas creadas en otra pestaña mientras el panel estaba abierto.
function mutateBookings(mutator) {
  const res = NexusStorage.updateBookings(mutator);
  if (!res.ok) showToast("⚠️ No se pudo guardar el cambio (almacenamiento del navegador lleno).", "warning");
  initAdminDashboard();
  return res.result;
}

function initNexusAdmin() {
  if (NexusStorage.getAuthRole() !== "admin") return;
  setupAdminTabs();
  setupAdminFilters();
  initAdminNotificationBell();
  startSlaTimers();
  initAdminDashboard();

  // Sincronización en vivo con el portal abierto en otra pestaña
  window.addEventListener("storage", (e) => {
    if (e.key && (e.key.startsWith("nexus_bookings") || e.key.startsWith("nexus_notifications") || e.key.startsWith("nexus_clients"))) {
      initAdminDashboard();
    }
  });

  if (window.location.hash) {
    switchAdminSection(window.location.hash.substring(1));
  }
  window.addEventListener("hashchange", () => {
    if (window.location.hash) switchAdminSection(window.location.hash.substring(1));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNexusAdmin);
} else {
  initNexusAdmin();
}

// Cada bloque se protege por separado: un dato corrupto en una sección no debe tumbar todo el panel.
function safeRender(label, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[NEXUS admin] Error al renderizar ${label}:`, err);
  }
}

function initAdminDashboard() {
  refreshData();
  const searchInput = document.getElementById("adminSearchInput");
  const statusFilter = document.getElementById("adminStatusFilter");

  safeRender("KPIs", renderKpiCards);
  safeRender("bandeja SLA", renderSlaVerificationQueue);
  safeRender("tabla de reservas", () => renderAdminBookingsTable(searchInput ? searchInput.value : "", statusFilter ? statusFilter.value : "all"));
  safeRender("calendario", renderRoomCalendarViewer);
  safeRender("gráficos", initCharts);
  safeRender("clientes frecuentes", renderTopClientsList);
  safeRender("notificaciones", renderAdminNotificationBell);
}

// Admin Top Navigation Tabs
window.switchAdminSection = function(targetSection) {
  const target = document.getElementById(targetSection);
  if (!target || !target.classList.contains("admin-section")) return;

  document.querySelectorAll(".admin-nav-item").forEach(t => {
    t.classList.toggle("active", t.getAttribute("data-target") === targetSection);
  });
  document.querySelectorAll(".admin-section").forEach(sec => sec.style.display = "none");
  target.style.display = "block";

  if (targetSection === "secAnalytics") safeRender("gráficos", initCharts);
};

function setupAdminTabs() {
  // Los botones de pestañas ya llaman switchAdminSection() desde el HTML (onclick).
}

function setupAdminFilters() {
  const searchInput = document.getElementById("adminSearchInput");
  const statusFilter = document.getElementById("adminStatusFilter");
  const rerender = () => renderAdminBookingsTable(searchInput ? searchInput.value : "", statusFilter ? statusFilter.value : "all");
  if (searchInput) searchInput.addEventListener("input", rerender);
  if (statusFilter) statusFilter.addEventListener("change", rerender);
}

// ---------------------------------------------------------------------------
// KPIs (calculados a partir de los datos reales del demo)
// ---------------------------------------------------------------------------
function renderKpiCards() {
  const active = bookings.filter(nxIsActiveBooking);
  const pendingSinpe = bookings.filter(b => b.status === "pending_sinpe").length;
  const revenueCRC = bookings
    .filter(b => b.status === "confirmed" || b.status === "rescheduled" || b.status === "done")
    .reduce((s, b) => s + (Number(b.totalCRC) || 0), 0);

  // Ocupación de hoy: horas reservadas / horas disponibles (08:00 - 20:00) en todas las salas
  const today = nxToday();
  const openMin = nxTimeToMin(NX_DAY_OPEN), closeMin = nxTimeToMin(NX_DAY_CLOSE);
  let bookedMin = 0;
  spaces.forEach(sp => {
    const covered = new Array(closeMin - openMin).fill(false);
    active.filter(b => b.spaceId === sp.id && nxBookingCoversDate(b, today)).forEach(b => {
      const s = Math.max(openMin, nxTimeToMin(b.timeStart)), e = Math.min(closeMin, nxTimeToMin(b.timeEnd));
      for (let m = s; m < e; m++) covered[m - openMin] = true;
    });
    bookedMin += covered.filter(Boolean).length;
  });
  const capacityMin = spaces.length * (closeMin - openMin);
  const occupancy = capacityMin ? Math.round((bookedMin / capacityMin) * 100) : 0;

  // SLA promedio: minutos entre envío del comprobante y aprobación
  const approvals = bookings.filter(b => b.paymentMethod === "sinpe" && b.sinpeSubmittedAt && b.approvedAt);
  const avgSla = approvals.length
    ? approvals.reduce((s, b) => s + (new Date(b.approvedAt) - new Date(b.sinpeSubmittedAt)) / 60000, 0) / approvals.length
    : null;

  setText("kpiTotalBookings", active.length);
  setText("kpiTotalBookingsNote", `${bookings.length} registradas · ${bookings.filter(b => b.status === "cancelled").length} canceladas`);
  setText("kpiTotalRevenue", revenueCRC >= 1000000 ? `₡${(revenueCRC / 1000000).toFixed(2)}M` : `₡${Math.round(revenueCRC / 1000)}K`);
  setText("kpiPendingSinpe", pendingSinpe);
  setText("kpiOccupancyRate", `${occupancy}%`);
  setText("kpiAvgSla", avgSla === null ? "—" : `${avgSla.toFixed(1)} min`);
  const slaNote = document.getElementById("kpiAvgSlaNote");
  if (slaNote) {
    if (avgSla === null) {
      slaNote.textContent = "Sin aprobaciones SINPE aún";
      slaNote.style.color = "var(--champagne)";
    } else {
      const ok = avgSla <= NX_SLA_WARNING_MIN;
      slaNote.textContent = ok ? `✓ Objetivo < ${NX_SLA_WARNING_MIN} min cumplido` : `⚠ Sobre el objetivo de ${NX_SLA_WARNING_MIN} min`;
      slaNote.style.color = ok ? "var(--sage-green)" : "var(--rosewood)";
    }
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---------------------------------------------------------------------------
// Bandeja SINPE con SLA
// ---------------------------------------------------------------------------
function slaInfo(item) {
  const submitted = new Date(item.sinpeSubmittedAt || item.createdAt).getTime();
  const elapsedMin = Math.max(0, Math.floor((Date.now() - submitted) / 60000));
  if (elapsedMin > NX_SLA_DEADLINE_MIN) return { cls: "sla-red", text: `¡SLA VENCIDO! (${elapsedMin}m / ${NX_SLA_DEADLINE_MIN}m)` };
  if (elapsedMin > NX_SLA_WARNING_MIN) return { cls: "sla-amber", text: `Atención requerida (${elapsedMin}m / ${NX_SLA_DEADLINE_MIN}m)` };
  return { cls: "sla-green", text: `En tiempo (${elapsedMin}m / ${NX_SLA_DEADLINE_MIN}m)` };
}

function voucherThumb(url) {
  if (!url) return `<div class="voucher-thumb" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#B8A99A;">Sin archivo</div>`;
  if (url.startsWith("data:application/pdf")) return `<div class="voucher-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;">📄</div>`;
  return `<img src="${nxEscape(url)}" onerror="this.onerror=null;this.src='assets/voucher_bac.svg'" class="voucher-thumb" alt="Comprobante">`;
}

function renderSlaVerificationQueue() {
  const container = document.getElementById("slaQueueContainer");
  if (!container) return;

  const pending = bookings
    .filter(b => b.status === "pending_sinpe")
    .sort((a, b) => new Date(a.sinpeSubmittedAt || a.createdAt) - new Date(b.sinpeSubmittedAt || b.createdAt));

  if (pending.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 26px; color: #819870; font-weight: 600;">
        ✓ ¡Bandeja al día! No hay comprobantes de SINPE pendientes de verificación.
      </div>
    `;
    return;
  }

  container.innerHTML = pending.map(item => {
    const sla = slaInfo(item);
    const id = nxEscape(item.id);
    return `
      <div class="sla-item-card" style="background: rgba(36, 29, 25, 0.45); border: 1px solid rgba(212, 163, 115, 0.2); border-radius: 14px; padding: 20px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 18px;">
        <div style="display: flex; align-items: center; gap: 18px;">
          <div onclick="openVoucherModal('${id}')" title="Haga clic para ampliar comprobante" style="cursor: zoom-in;">${voucherThumb(item.sinpeVoucherUrl)}</div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <span style="font-weight: 800; color: #FFF; font-family: 'Syne', sans-serif;">${id}</span>
              <span class="sla-badge-timer ${sla.cls}">⏱️ ${sla.text}</span>
            </div>
            <div style="font-size: 0.96rem; font-weight: 700; color: #FFF;">${nxEscape(item.clientName)} · <span style="font-weight: normal; color: #B8A99A;">${nxEscape(item.company || 'Particular')}</span></div>
            <div style="font-size: 0.84rem; color: #B8A99A;">
              📍 ${nxEscape(item.spaceName)} | 📅 ${nxEscape(item.date)}${item.endDate && item.endDate !== item.date ? ' → ' + nxEscape(item.endDate) : ''} (${nxEscape(item.timeStart)} - ${nxEscape(item.timeEnd)})
            </div>
            <div style="font-size: 0.84rem; color: var(--gold-warm); font-family: 'Syne', sans-serif;">
              Ref SINPE: <strong>${nxEscape(item.sinpeRef || 'N/A')}</strong> | Monto: <strong>${nxFormatCRC(item.totalCRC)}</strong> ($${Number(item.totalUSD) || 0})
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary btn-sm" onclick="openVoucherModal('${id}')">🔍 Ver Recibo</button>
          <button class="btn btn-primary btn-sm" onclick="approveSinpeBooking('${id}')">✓ Validar &amp; Aprobar</button>
          <button class="btn btn-secondary btn-sm" style="color: #E88F8A; border-color: rgba(201,90,83,0.3);" onclick="rejectSinpeBooking('${id}')">✖ Rechazar</button>
        </div>
      </div>
    `;
  }).join("");
}

function startSlaTimers() {
  // Relee el almacenamiento y actualiza semáforos y KPIs periódicamente
  setInterval(() => {
    refreshData();
    safeRender("KPIs", renderKpiCards);
    safeRender("bandeja SLA", renderSlaVerificationQueue);
    safeRender("notificaciones", renderAdminNotificationBell);
  }, 15000);
}

// Open Fullscreen Voucher Inspection Modal
window.openVoucherModal = function(bookingId) {
  refreshData();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const modal = document.getElementById("voucherModal");
  const img = document.getElementById("modalVoucherImg");
  const pdfBox = document.getElementById("modalVoucherPdf");
  const url = booking.sinpeVoucherUrl;

  if (url && url.startsWith("data:application/pdf")) {
    img.style.display = "none";
    if (pdfBox) {
      pdfBox.style.display = "block";
      pdfBox.innerHTML = `<iframe src="${nxEscape(url)}" style="width:100%;height:400px;border:0;border-radius:10px;background:#fff;"></iframe>
        <a href="${nxEscape(url)}" download="comprobante_${nxEscape(booking.id)}.pdf" class="btn btn-secondary btn-sm" style="margin-top:8px;">📥 Descargar PDF</a>`;
    }
  } else {
    if (pdfBox) { pdfBox.style.display = "none"; pdfBox.innerHTML = ""; }
    img.style.display = url ? "inline-block" : "none";
    img.src = url || "";
  }

  const pending = booking.status === "pending_sinpe";
  document.getElementById("modalVoucherDetails").innerHTML = `
    <h3 style="color: #FFF; margin-bottom: 8px;">Comprobante de Reserva ${nxEscape(booking.id)}</h3>
    ${url ? "" : `<p style="color:#E88F8A;font-size:0.9rem;margin-bottom:8px;">El cliente no adjuntó archivo; verifique solo con la referencia bancaria.</p>`}
    <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 4px;"><strong>Socio:</strong> ${nxEscape(booking.clientName)} (${nxEscape(booking.clientPhone || 'sin teléfono')})</p>
    <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 4px;"><strong>Referencia Bancaria:</strong> ${nxEscape(booking.sinpeRef || 'N/A')}</p>
    <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 4px;"><strong>Monto esperado:</strong> ${nxFormatCRC(booking.totalCRC)}</p>
    <p style="color: #B8A99A; font-size: 0.9rem; margin-bottom: 18px;"><strong>Sala solicitada:</strong> ${nxEscape(booking.spaceName)}</p>
    ${pending ? `
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-primary btn-block" onclick="approveSinpeBooking('${nxEscape(booking.id)}'); closeVoucherModal();">✓ Aprobar Pago &amp; Emitir Factura Electrónica</button>
    </div>` : ""}
  `;

  modal.classList.add("open");
};

window.closeVoucherModal = function() {
  document.getElementById("voucherModal").classList.remove("open");
};

// Approve SINPE Booking
window.approveSinpeBooking = function(bookingId) {
  const result = mutateBookings(fresh => {
    const target = fresh.find(b => b.id === bookingId);
    if (!target) return "not_found";
    if (target.status !== "pending_sinpe") return "not_pending";
    target.status = "confirmed";
    target.approvedAt = new Date().toISOString();
    return "ok";
  });
  if (result === "ok") {
    showToast(`✓ Pago SINPE de la reserva ${bookingId} validado. Factura electrónica emitida (simulada).`, "success");
  } else if (result === "not_pending") {
    showToast(`La reserva ${bookingId} ya no está pendiente de validación.`, "info");
  }
};

// Reject SINPE Booking
window.rejectSinpeBooking = function(bookingId) {
  const reason = prompt("Indique el motivo del rechazo del comprobante (ej: Fondos no recibidos en cuenta, comprobante ilegible):", "Monto transferido no coincide con el total de la reserva.");
  if (!reason) return;
  const result = mutateBookings(fresh => {
    const target = fresh.find(b => b.id === bookingId);
    if (!target || target.status !== "pending_sinpe") return "skip";
    target.status = "cancelled";
    target.rejectReason = reason.trim();
    return "ok";
  });
  if (result === "ok") showToast(`❌ Reserva ${bookingId} cancelada. Notificación con motivo enviada al socio.`, "warning");
};

// ---------------------------------------------------------------------------
// Tabla de reservas
// ---------------------------------------------------------------------------
function statusChip(status) {
  if (status === "confirmed") return `<span class="chip chip-confirmed">✓ Confirmada</span>`;
  if (status === "pending_sinpe") return `<span class="chip chip-pending">⏳ Pendiente SINPE</span>`;
  if (status === "rescheduled") return `<span class="chip chip-rescheduled">🔄 Reprogramada</span>`;
  return `<span class="chip chip-cancelled">✖ Cancelada</span>`;
}

function renderAdminBookingsTable(searchTerm = "", statusFilter = "all") {
  const tbody = document.getElementById("adminBookingsTbody");
  if (!tbody) return;

  let filtered = bookings;
  if (statusFilter !== "all") filtered = filtered.filter(b => b.status === statusFilter);

  if ((searchTerm || "").trim() !== "") {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(b =>
      String(b.id || "").toLowerCase().includes(q) ||
      String(b.clientName || "").toLowerCase().includes(q) ||
      String(b.spaceName || "").toLowerCase().includes(q) ||
      String(b.company || "").toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #B8A99A; padding: 24px;">No se encontraron reservas con los criterios especificados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    const id = nxEscape(b.id);
    const active = nxIsActiveBooking(b);
    const pm = b.paymentMethod === 'sinpe' ? '📱 SINPE' : (b.paymentMethod === 'transfer' ? '🏦 Transferencia' : '💳 Tarjeta');
    return `
      <tr>
        <td><strong style="color: #FFF; font-family: 'Syne', sans-serif;">${id}</strong></td>
        <td>
          <div style="font-weight: 700; color: #FFF;">${nxEscape(b.clientName)}</div>
          <div style="font-size: 0.78rem; color: #B8A99A;">${nxEscape(b.company || 'Particular')} · ${nxEscape(b.clientPhone || '')}</div>
        </td>
        <td>${nxEscape(b.spaceName)}</td>
        <td>
          <div>${nxEscape(b.date)}${b.endDate && b.endDate !== b.date ? ' → ' + nxEscape(b.endDate) : ''}</div>
          <div style="font-size: 0.78rem; color: #B8A99A;">${nxEscape(b.timeStart)} - ${nxEscape(b.timeEnd)}</div>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--terracotta);">${nxFormatCRC(b.totalCRC)}</div>
          <div style="font-size: 0.78rem; color: var(--gold-warm);">${pm}</div>
        </td>
        <td>${statusChip(b.status)}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            ${active ? `<button class="btn btn-secondary btn-sm" onclick="adminOpenReschedule('${id}')" title="Reprogramar reserva">🔄</button>
            <button class="btn btn-secondary btn-sm" onclick="adminCancelBooking('${id}')" title="Cancelar reserva" style="color: #E88F8A;">✖</button>` : '<span style="color:#7D6F63;font-size:0.8rem;">—</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Admin Reschedule & Cancel actions
window.adminOpenReschedule = function(bookingId) {
  refreshData();
  const b = bookings.find(x => x.id === bookingId);
  if (!b) return;

  const newDate = prompt(`Reprogramar reserva ${b.id} (${b.spaceName}). Ingrese nueva fecha de inicio (AAAA-MM-DD):`, b.date);
  if (!newDate) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || isNaN(new Date(newDate + "T00:00").getTime())) {
    showToast("⚠️ Fecha inválida. Use el formato AAAA-MM-DD.", "warning");
    return;
  }
  const newTimes = prompt(`Ingrese nuevo horario (ej. 14:00 - 16:00):`, `${b.timeStart} - ${b.timeEnd}`);
  if (!newTimes) return;
  const m = newTimes.match(/^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/);
  if (!m) {
    showToast("⚠️ Horario inválido. Use el formato HH:MM - HH:MM.", "warning");
    return;
  }
  const ts = `${m[1].padStart(2, "0")}:${m[2]}`, te = `${m[3].padStart(2, "0")}:${m[4]}`;
  if (nxTimeToMin(te) <= nxTimeToMin(ts) || nxTimeToMin(te) > 24 * 60) {
    showToast("⚠️ La hora de fin debe ser posterior a la de inicio.", "warning");
    return;
  }

  const result = mutateBookings(fresh => {
    const t = fresh.find(x => x.id === bookingId);
    if (!t) return "not_found";
    // Se conserva la cantidad de días de la reserva original
    const spanDays = Math.round((new Date(nxBookingEndDate(t) + "T00:00") - new Date(t.date + "T00:00")) / 86400000);
    const newEnd = nxAddDays(newDate, spanDays);
    if (nxFindOverlap(fresh, t.spaceId, newDate, newEnd, ts, te, t.id)) return "clash";
    t.date = newDate;
    t.endDate = newEnd;
    t.timeStart = ts;
    t.timeEnd = te;
    if (t.status !== "pending_sinpe") t.status = "rescheduled";
    return "ok";
  });
  if (result === "clash") showToast("⚠️ El espacio ya está ocupado en ese horario. No se reprogramó.", "warning");
  else if (result === "ok") showToast(`✓ Reserva ${bookingId} reprogramada administrativamente con notificación al socio.`, "success");
};

window.adminCancelBooking = function(bookingId) {
  if (!confirm(`¿Está seguro de cancelar la reserva ${bookingId}? Se liberará el espacio en el calendario.`)) return;
  const result = mutateBookings(fresh => {
    const b = fresh.find(x => x.id === bookingId);
    if (!b) return "not_found";
    b.status = "cancelled";
    return "ok";
  });
  if (result === "ok") showToast(`Reserva ${bookingId} cancelada.`, "warning");
};

// ---------------------------------------------------------------------------
// Reserva / bloqueo manual
// ---------------------------------------------------------------------------
window.openManualBookingModal = function() {
  refreshData();
  const modal = document.getElementById("manualBookingModal");
  const spaceSelect = document.getElementById("manSpaceSelect");
  const dateInput = document.getElementById("manDate");
  if (!modal || !spaceSelect) return;

  spaceSelect.innerHTML = spaces.map(s => `<option value="${s.id}">${nxEscape(s.name)} (${nxEscape(s.floor)})</option>`).join("");
  dateInput.min = nxToday();
  dateInput.value = nxToday();
  modal.classList.add("open");
};

window.closeManualBookingModal = function() {
  document.getElementById("manualBookingModal").classList.remove("open");
};

window.confirmManualBooking = function() {
  const spaceId = document.getElementById("manSpaceSelect").value;
  const clientName = document.getElementById("manClientName").value.trim() || "Bloqueo Interno Gerencial";
  const date = document.getElementById("manDate").value;
  const [timeStart, timeEnd] = document.getElementById("manTimeSlot").value.split(" - ");
  const space = spaces.find(s => s.id === spaceId);
  if (!space || !date) {
    showToast("⚠️ Seleccione sala y fecha.", "warning");
    return;
  }
  const hours = (nxTimeToMin(timeEnd) - nxTimeToMin(timeStart)) / 60;
  const isFullDay = timeStart === "08:00" && timeEnd === "18:00";
  const totalCRC = isFullDay ? space.priceDay : space.priceHour * hours;
  const totalUSD = isFullDay ? space.priceDayUSD : space.priceHourUSD * hours;
  const newId = "MAN-" + Date.now().toString().slice(-6);

  const result = mutateBookings(fresh => {
    const clash = nxFindOverlap(fresh, space.id, date, date, timeStart, timeEnd, null);
    if (clash) return clash;
    fresh.unshift({
      id: newId,
      spaceId: space.id,
      spaceName: space.name,
      clientId: "admin-1",
      clientName: clientName,
      clientEmail: "admin@nexusspaces.com",
      clientPhone: "+506 8888-6398",
      company: "Gestión Interna NEXUS",
      bookingType: isFullDay ? "day" : "hour",
      date: date,
      endDate: date,
      timeStart: timeStart,
      timeEnd: timeEnd,
      hours: hours,
      attendees: 1,
      addons: [],
      totalCRC: totalCRC,
      totalUSD: totalUSD,
      paymentMethod: "transfer",
      sinpeRef: "ADMIN-OVERRIDE",
      sinpeVoucherUrl: null,
      status: "confirmed",
      qrCodeData: `MANUAL-${space.id}-${date}-${timeStart}`,
      createdAt: new Date().toISOString()
    });
    return null;
  });

  if (result) {
    showToast(`⚠️ ${space.name} ya está ocupada ese día (${result.timeStart} - ${result.timeEnd}, ${result.id}).`, "warning");
    return;
  }
  closeManualBookingModal();
  showToast(`✓ Sala ${space.name} bloqueada/reservada con éxito para el ${date}.`, "success");
};

// Export Bookings to CSV (con BOM para que Excel respete tildes y ñ)
window.exportBookingsToCSV = function() {
  refreshData();
  const q = v => `"${String(v === null || v === undefined ? "" : v).replace(/"/g, '""')}"`;
  let csv = "ID Reserva,Socio,Empresa,Espacio,Fecha Inicio,Fecha Fin,Inicio,Fin,Total CRC,Total USD,Metodo Pago,Estado\n";
  bookings.forEach(b => {
    csv += [q(b.id), q(b.clientName), q(b.company || "N/A"), q(b.spaceName), q(b.date), q(nxBookingEndDate(b)),
            q(b.timeStart), q(b.timeEnd), Number(b.totalCRC) || 0, Number(b.totalUSD) || 0, q(b.paymentMethod), q(b.status)].join(",") + "\n";
  });

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte_reservas_nexus_${nxToday()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast("📥 Reporte gerencial exportado en formato CSV.", "success");
};

// ---------------------------------------------------------------------------
// Calendario por sala (hoy + 3 días, dinámico)
// ---------------------------------------------------------------------------
function renderRoomCalendarViewer() {
  const selector = document.getElementById("adminRoomCalendarSelect");
  const container = document.getElementById("adminRoomCalendarView");
  if (!selector || !container) return;

  selector.innerHTML = `<option value="all">Todas las salas / Vista General</option>` +
    spaces.map(s => `<option value="${s.id}" ${activeCalendarSpaceId === s.id ? 'selected' : ''}>${nxEscape(s.name)}</option>`).join("");

  selector.onchange = (e) => {
    activeCalendarSpaceId = e.target.value;
    renderRoomCalendarViewer();
  };

  const filteredBookings = bookings.filter(b => nxIsActiveBooking(b) && (activeCalendarSpaceId === "all" || b.spaceId === activeCalendarSpaceId));
  const today = nxToday();
  const days = [0, 1, 2, 3].map(i => nxAddDays(today, i));

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); gap: 18px;">
      ${days.map(d => {
        const dayBookings = filteredBookings.filter(b => nxBookingCoversDate(b, d)).sort((a, b) => a.timeStart.localeCompare(b.timeStart));
        return `
          <div style="background: rgba(36, 29, 25, 0.4); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px;">
            <div style="font-weight: 700; color: #FFF; font-size: 0.98rem; margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
              📅 ${nxEscape(nxFormatDayLabel(d))}
            </div>
            ${dayBookings.length === 0 ? `<div style="font-size: 0.82rem; color: #7D6F63; text-align: center; padding: 20px 0;">Sin reservas agendadas</div>` : ''}
            ${dayBookings.map(b => `
              <div style="background: rgba(224, 122, 95, 0.09); border-left: 3px solid ${b.status === 'pending_sinpe' ? 'var(--gold-warm)' : 'var(--terracotta)'}; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; color: #FFF;">
                  <span>⏰ ${nxEscape(b.timeStart)} - ${nxEscape(b.timeEnd)}</span>
                  <span style="color: var(--gold-warm); font-family: 'Syne', sans-serif;">${nxEscape(b.id)}</span>
                </div>
                <div style="font-size: 0.86rem; color: #FFF;">${nxEscape(b.spaceName)}</div>
                <div style="font-size: 0.78rem; color: #B8A99A;">👤 ${nxEscape(b.clientName)}${b.status === 'pending_sinpe' ? ' · ⏳ SINPE' : ''}</div>
              </div>
            `).join("")}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Gráficos (datos calculados a partir de las reservas)
// ---------------------------------------------------------------------------
let roomsChartInstance = null;
let revenueChartInstance = null;
const CHART_COLORS = ['#E07A5F', '#D4A373', '#E9C46A', '#819870', '#C95A53', '#8E7DBE', '#5FA8D3'];

function bookingHours(b) {
  if (b.bookingType === "month") return 0; // membresías no suman horas puntuales
  const perDay = Math.max(0, nxTimeToMin(b.timeEnd) - nxTimeToMin(b.timeStart)) / 60;
  const days = Math.round((new Date(nxBookingEndDate(b) + "T00:00") - new Date(b.date + "T00:00")) / 86400000) + 1;
  return perDay * days;
}

function getChartData() {
  const counted = bookings.filter(b => b.status !== "cancelled");
  const rooms = spaces.map(sp => ({
    label: sp.name,
    short: sp.name.split(" ").slice(-1)[0],
    hours: Math.round(counted.filter(b => b.spaceId === sp.id).reduce((s, b) => s + bookingHours(b), 0))
  }));
  const paid = bookings.filter(b => b.status === "confirmed" || b.status === "rescheduled" || b.status === "done");
  const byType = { hour: 0, day: 0, month: 0 };
  paid.forEach(b => { byType[b.bookingType in byType ? b.bookingType : "hour"] += Number(b.totalCRC) || 0; });
  const totalRev = byType.hour + byType.day + byType.month;
  const mix = [
    { label: 'Por Horas', val: byType.hour },
    { label: 'Por Jornadas', val: byType.day },
    { label: 'Planes Mensuales', val: byType.month }
  ].map(s => ({ ...s, pct: totalRev ? Math.round((s.val / totalRev) * 100) : 0 }));
  return { rooms, mix, totalRev };
}

function drawNativeBarChart(canvas, rooms) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 420;
  const w = canvas.width = Math.max(340, parentW - 30);
  const h = canvas.height = 230;
  ctx.clearRect(0, 0, w, h);

  const values = rooms.map(r => r.hours);
  const maxVal = Math.max(1, ...values) * 1.15;
  const padLeft = 40, padRight = 20, padTop = 30, padBottom = 35;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const colW = chartW / Math.max(1, values.length);
  const barW = Math.min(36, Math.max(20, colW - 20));

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
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, barW, barH);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(v + 'h', x + barW / 2, y - 6);
    ctx.fillStyle = '#B8A99A';
    ctx.font = '11px sans-serif';
    ctx.fillText(rooms[i].short, x + barW / 2, h - padBottom + 18);
  });
}

function drawNativeDonutChart(canvas, mix, totalRev) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 340;
  const w = canvas.width = Math.max(280, parentW - 30);
  const h = canvas.height = 230;
  ctx.clearRect(0, 0, w, h);

  const colors = ['#E07A5F', '#D4A373', '#819870'];
  const centerX = w / 2;
  const centerY = (h - 40) / 2;
  const outerR = Math.min(centerX, centerY) - 15;
  const innerR = outerR * 0.58;

  let start = -Math.PI / 2;
  if (totalRev > 0) {
    mix.forEach((s, i) => {
      const angle = (s.val / totalRev) * 2 * Math.PI;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerR, start, start + angle);
      ctx.arc(centerX, centerY, innerR, start + angle, start, true);
      ctx.closePath();
      ctx.fill();
      start += angle;
    });
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(totalRev > 0 ? 'Mix Ingresos' : 'Sin ingresos', centerX, centerY + 4);

  const legendY = h - 16;
  const spacing = w / mix.length;
  mix.forEach((s, idx) => {
    const lx = idx * spacing + 10;
    ctx.fillStyle = colors[idx];
    ctx.fillRect(lx, legendY - 8, 8, 8);
    ctx.fillStyle = '#B8A99A';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${s.label} (${s.pct}%)`, lx + 12, legendY);
  });
}

function initCharts() {
  const ctxRooms = document.getElementById("chartRoomsDemand");
  const ctxRevenue = document.getElementById("chartRevenueMix");
  const { rooms, mix, totalRev } = getChartData();

  if (window.Chart) {
    if (ctxRooms) {
      if (roomsChartInstance) roomsChartInstance.destroy();
      roomsChartInstance = new Chart(ctxRooms, {
        type: 'bar',
        data: {
          labels: rooms.map(r => r.label),
          datasets: [{
            label: 'Horas reservadas (activas)',
            data: rooms.map(r => r.hours),
            backgroundColor: rooms.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'BF'),
            borderColor: rooms.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderWidth: 1.5,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(224, 196, 172, 0.08)' }, ticks: { color: '#B8A99A' } },
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
          labels: mix.map(m => m.label),
          datasets: [{
            data: mix.map(m => m.val),
            backgroundColor: ['#E07A5F', '#D4A373', '#819870'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          aspectRatio: 1.6,
          cutout: '58%',
          plugins: {
            legend: { position: 'bottom', labels: { color: '#B8A99A', font: { family: 'Plus Jakarta Sans' } } },
            tooltip: { callbacks: { label: (c) => `${c.label}: ${nxFormatCRC(c.parsed)} (${mix[c.dataIndex].pct}%)` } }
          }
        }
      });
    }
  } else {
    // Offline fallback: Direct HTML5 Canvas drawing
    drawNativeBarChart(ctxRooms, rooms);
    drawNativeDonutChart(ctxRevenue, mix, totalRev);
  }
}

// ---------------------------------------------------------------------------
// Clientes frecuentes (tolera clientes nuevos sin histórico)
// ---------------------------------------------------------------------------
function renderTopClientsList() {
  const list = document.getElementById("topClientsList");
  if (!list) return;

  const clients = NexusStorage.getClients().map(c => {
    // Suma al histórico las reservas pagadas hechas en el demo (las semilla ya están incluidas)
    const own = bookings.filter(b => b.clientId === c.id && !b.seed && (b.status === "confirmed" || b.status === "rescheduled" || b.status === "done"));
    return {
      ...c,
      spent: (Number(c.totalSpentCRC) || 0) + own.reduce((s, b) => s + (Number(b.totalCRC) || 0), 0),
      hours: (Number(c.totalHoursBooked) || 0) + Math.round(own.reduce((s, b) => s + bookingHours(b), 0))
    };
  }).sort((a, b) => b.spent - a.spent);

  if (clients.length === 0) {
    list.innerHTML = `<div style="padding: 16px; text-align: center; color: #B8A99A;">Aún no hay clientes registrados.</div>`;
    return;
  }

  list.innerHTML = clients.map((c, index) => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border-bottom: 1px solid rgba(224, 196, 172, 0.08);">
      <div style="display: flex; align-items: center; gap: 14px;">
        <span style="font-weight: 800; color: var(--gold-warm); font-size: 1.15rem; font-family: 'Syne', sans-serif;">#${index + 1}</span>
        <div>
          <div style="font-weight: 700; color: #FFF; font-size: 0.98rem;">${nxEscape(c.name || 'Sin nombre')}</div>
          <div style="font-size: 0.78rem; color: #B8A99A;">${nxEscape(c.company || 'Independiente')} · Céd: ${nxEscape(c.idNumber || 'N/D')}</div>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 700; color: var(--terracotta); font-size: 0.94rem; font-family: 'Syne', sans-serif;">${nxFormatCRC(c.spent)}</div>
        <div style="font-size: 0.78rem; color: var(--gold-warm);">⭐ ${nxEscape(c.loyaltyTier || 'Nuevo Socio')} (${c.hours} hrs)</div>
      </div>
    </div>
  `).join("");
}

// Los mensajes se insertan como texto (no HTML)
function showToast(message, type = "info") {
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
}

// ---------------------------------------------------------------------------
// Campana de notificaciones
// ---------------------------------------------------------------------------
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
  // El botón ya tiene onclick="toggleAdminNotifDropdown(event)" en el HTML; solo se cierra al hacer clic fuera.
  document.addEventListener("click", (e) => {
    if (dropdown && !dropdown.contains(e.target) && bellBtn && !bellBtn.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });
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
        <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="handleNotifClick('${nxEscape(n.id)}', '${nxEscape(n.link || 'secSla')}')">
          <div class="notif-title">${nxEscape(n.title)}</div>
          <div class="notif-desc">${nxEscape(n.message)}</div>
          <div class="notif-time">⏱️ ${nxEscape(n.time)}</div>
        </div>
      `).join("");
    }
  }
}

window.handleNotifClick = function(notifId, targetSection) {
  const notifs = NexusStorage.getNotifications();
  const n = notifs.find(x => x.id === notifId);
  if (n && n.unread) {
    n.unread = false;
    NexusStorage.saveNotifications(notifs);
  }
  const cleanSec = targetSection.includes("#") ? targetSection.split("#")[1] : targetSection;
  if (cleanSec) switchAdminSection(cleanSec);
  const dropdown = document.getElementById("adminNotifDropdown");
  if (dropdown) dropdown.classList.remove("open");
  renderAdminNotificationBell();
};

window.logoutAdmin = function() {
  NexusStorage.logout();
  showToast("Sesión de gerencia cerrada exitosamente.", "info");
  setTimeout(() => { window.location.href = "index.html"; }, 350);
};
