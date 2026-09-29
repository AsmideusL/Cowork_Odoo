// Mock Data Store for NEXUS Coworking & Private Spaces Demo (Clean Unauthenticated Guest by Default)

// ---------------------------------------------------------------------------
// Utilidades compartidas (cliente y admin)
// ---------------------------------------------------------------------------
const NX_SLA_WARNING_MIN = 15;   // Amarillo a partir de 15 min (igual que Odoo)
const NX_SLA_DEADLINE_MIN = 30;  // Rojo / vencido a partir de 30 min
const NX_DAY_OPEN = "08:00";
const NX_DAY_CLOSE = "20:00";

function _pad2(n) { return String(n).padStart(2, "0"); }

// Fecha LOCAL (no UTC) en formato YYYY-MM-DD. toISOString() usa UTC y en Costa Rica
// después de las 6 p.m. devolvía el día siguiente.
function nxDateStr(d) {
  return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`;
}
function nxToday() { return nxDateStr(new Date()); }
function nxAddDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return nxDateStr(dt);
}
function nxMinutesAgoISO(min) { return new Date(Date.now() - min * 60000).toISOString(); }
function nxTimeToMin(t) {
  const [h, m] = String(t || "00:00").split(":").map(Number);
  return h * 60 + (m || 0);
}
function nxMinToTime(min) { return `${_pad2(Math.floor(min / 60))}:${_pad2(min % 60)}`; }
function nxFormatDayLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const label = dt.toLocaleDateString("es-CR", { weekday: "long", day: "2-digit", month: "short" });
  const rel = dateStr === nxToday() ? "Hoy" : (dateStr === nxAddDays(nxToday(), 1) ? "Mañana" : null);
  return rel ? `${rel} (${label})` : label.charAt(0).toUpperCase() + label.slice(1);
}

// Escapa texto antes de insertarlo con innerHTML (evita inyección de HTML/JS).
function nxEscape(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function nxFormatCRC(n) { return "₡" + Math.round(Number(n) || 0).toLocaleString("es-CR"); }

// Una reserva ocupa el rango [date, endDate] (inclusive) y, cada día, [timeStart, timeEnd).
function nxBookingEndDate(b) { return b.endDate || b.date; }
function nxBookingCoversDate(b, dateStr) {
  return b.date <= dateStr && dateStr <= nxBookingEndDate(b);
}
function nxIsActiveBooking(b) {
  return b.status === "pending_sinpe" || b.status === "confirmed" || b.status === "rescheduled";
}

// Devuelve la primera reserva activa que choca con el rango solicitado (o null).
function nxFindOverlap(bookings, spaceId, dateStart, dateEnd, timeStart, timeEnd, excludeId) {
  const s = nxTimeToMin(timeStart), e = nxTimeToMin(timeEnd);
  return bookings.find(b =>
    b.spaceId === spaceId &&
    b.id !== excludeId &&
    nxIsActiveBooking(b) &&
    b.date <= dateEnd && nxBookingEndDate(b) >= dateStart &&
    nxTimeToMin(b.timeStart) < e && nxTimeToMin(b.timeEnd) > s
  ) || null;
}

// ¿El espacio está ocupado en este momento?
function nxIsSpaceBusyNow(bookings, spaceId) {
  const now = new Date();
  const hhmm = `${_pad2(now.getHours())}:${_pad2(now.getMinutes())}`;
  const end = nxMinToTime(Math.min(nxTimeToMin(hhmm) + 1, 24 * 60 - 1));
  return !!nxFindOverlap(bookings, spaceId, nxToday(), nxToday(), hhmm, end, null);
}

// ---------------------------------------------------------------------------
// Datos semilla (las fechas se calculan relativas a HOY para que el demo nunca quede desfasado)
// ---------------------------------------------------------------------------
const _D0 = nxToday();
const _D1 = nxAddDays(_D0, 1);
const _D2 = nxAddDays(_D0, 2);
const _D3 = nxAddDays(_D0, 3);

const NEXUS_DATA = {
  adminUser: {
    id: "admin-1",
    name: "Lic. Roberto Alvarado",
    email: "admin@nexusspaces.com",
    role: "admin",
    roleLabel: "Gerente de Operaciones",
    avatar: "R"
  },

  spaces: [
    {
      id: "sp-1",
      name: "Sala Boardroom Horizon",
      category: "meeting",
      badge: "VIP Ejecutiva",
      capacity: 12,
      priceHour: 15000,
      priceDay: 95000,
      priceMonth: 1200000,
      priceHourUSD: 28,
      priceDayUSD: 180,
      priceMonthUSD: 2300,
      image: "assets/room_horizon.svg",
      description: "Mesa artesanal de nogal macizo, iluminación indirecta cálida regulable, videoconferencia Polycom 4K y ventanales con vista a la cordillera.",
      amenities: ["Pantalla 4K 85\" OLED", "Videoconferencia Polycom", "Pizarra de Cristal Templado", "Café de Especialidad Nespresso", "WiFi 6 Dedicado 1Gbps", "Climatización Silenciosa"],
      zoneId: "zone-horizon",
      floor: "Piso 4 - Ala Este"
    },
    {
      id: "sp-2",
      name: "Private Office Alpha",
      category: "private",
      badge: "Suite Privada",
      capacity: 5,
      priceHour: 12000,
      priceDay: 75000,
      priceMonth: 850000,
      priceHourUSD: 22,
      priceDayUSD: 140,
      priceMonthUSD: 1600,
      image: "assets/room_alpha.svg",
      description: "Suite corporativa privada con sillas ergonómicas de cuero, acceso biométrico Smart PIN 24/7 y acabados en roble y bronce cepillado.",
      amenities: ["5 Puestos Ergonómicos", "Acceso Cerradura Smart PIN", "Pizarra Magnética", "Mini-bar Ejecutivo", "Línea Telefónica IP", "Servicio Concierge"],
      zoneId: "zone-alpha",
      floor: "Piso 4 - Suite 402"
    },
    {
      id: "sp-3",
      name: "Focus Pod Oasis",
      category: "pod",
      badge: "Cabina Acústica",
      capacity: 1,
      priceHour: 5000,
      priceDay: 28000,
      priceMonth: 320000,
      priceHourUSD: 9,
      priceDayUSD: 52,
      priceMonthUSD: 600,
      image: "assets/room_oasis.svg",
      description: "Cabina individual con tapicería acústica de fieltro nórdico (-35dB), luz fotográfica LED de temperatura regulable y ventilación suave.",
      amenities: ["Insonorización -35dB", "Luz Facial Fotográfica", "Conexión Ethernet Gigabit", "Ventilación Filtrada", "Cargador Rápido Qi"],
      zoneId: "zone-oasis",
      floor: "Piso 4 - Galería Silenciosa"
    },
    {
      id: "sp-4",
      name: "Hot Desk Flex Lounge",
      category: "coworking",
      badge: "Puesto Nómada",
      capacity: 25,
      priceHour: 3000,
      priceDay: 16000,
      priceMonth: 180000,
      priceHourUSD: 6,
      priceDayUSD: 30,
      priceMonthUSD: 340,
      image: "assets/room_lounge.svg",
      description: "Área abierta con luz natural abundante, plantas interiores, acceso a la barra barista con café de origen y terraza ajardinada al aire libre.",
      amenities: ["Escritorios Compartidos", "Cafetería & Snacks Artesanales", "Terraza & Jardín Zen", "Eventos de Networking", "Casilleros con Clave"],
      zoneId: "zone-lounge",
      floor: "Piso 4 - Open Lounge"
    },
    {
      id: "sp-5",
      name: "Creative Studio Lab",
      category: "workshop",
      badge: "Laboratorio Creativo",
      capacity: 18,
      priceHour: 18000,
      priceDay: 110000,
      priceMonth: 1400000,
      priceHourUSD: 34,
      priceDayUSD: 210,
      priceMonthUSD: 2650,
      image: "assets/room_creative.svg",
      description: "Espacio dinámico modular para sesiones de Design Thinking y workshops estratégicos. Paredes continuas de cristal escribible y proyector láser.",
      amenities: ["Muro de Vidrio Escribible", "Proyector Láser Tiro Corto", "Kits de Facilitación", "Mobiliario Modular Reconfigurable", "Sonido Hi-Fi Inalámbrico"],
      zoneId: "zone-creative",
      floor: "Piso 4 - Estudio Creativo"
    }
  ],

  // unitType: person = × asistentes · day = × jornadas · session/pack = una vez
  addons: [
    { id: "add-1", name: "Servicio Barista & Catering de Autor", price: 4500, priceUSD: 8, unit: "por persona", unitType: "person", icon: "☕" },
    { id: "add-2", name: "Proyector Láser 4K & Pantalla Motorizada", price: 6000, priceUSD: 11, unit: "por sesión", unitType: "session", icon: "📽️" },
    { id: "add-3", name: "Parqueo Subterráneo con Vigilancia Privada", price: 3500, priceUSD: 6.5, unit: "por vehículo/día", unitType: "day", icon: "🚗" },
    { id: "add-4", name: "Concierge Técnico In-Room para Streaming", price: 5000, priceUSD: 9.5, unit: "por reserva", unitType: "session", icon: "💻" },
    { id: "add-5", name: "Créditos de Impresión Fina & Escáner (100 págs)", price: 3000, priceUSD: 5.5, unit: "por paquete", unitType: "pack", icon: "🖨️" }
  ],

  clients: [
    {
      id: "cli-101",
      name: "Mariana Rojas Solís",
      idNumber: "1-1452-0892",
      email: "mariana.rojas@techcr.io",
      phone: "+506 8702-4411",
      company: "TechNova Costa Rica",
      loyaltyTier: "Oro (Frecuente)",
      discountRate: 0.10,
      totalHoursBooked: 84,
      totalSpentCRC: 1250000,
      emergencyContact: "Carlos Rojas (Hermano) - 8899-1122"
    },
    {
      id: "cli-102",
      name: "Alejandro Montero B.",
      idNumber: "2-0678-0431",
      email: "a.montero@monterolegal.com",
      phone: "+506 8321-9900",
      company: "Montero & Asociados Law",
      loyaltyTier: "Platino (VIP)",
      discountRate: 0.15,
      totalHoursBooked: 142,
      totalSpentCRC: 2180000,
      emergencyContact: "Lorena Benavides - 8333-2211"
    },
    {
      id: "cli-103",
      name: "Esteban Mora Chaves",
      idNumber: "1-1823-0119",
      email: "esteban@pulsardigital.cr",
      phone: "+506 8812-7744",
      company: "Pulsar Digital Studio",
      loyaltyTier: "Plata",
      discountRate: 0.05,
      totalHoursBooked: 36,
      totalSpentCRC: 495000,
      emergencyContact: "Diana Soto - 8765-4321"
    }
  ],

  // Todas las ocupaciones viven aquí (antes había una segunda lista "bookedSlots" que el
  // calendario ignoraba y dejaba horarios ocupados como libres).
  // seed:true = sus montos ya están incluidos en los totales históricos del cliente.
  bookings: [
    {
      id: "RES-9844", seed: true,
      spaceId: "sp-1", spaceName: "Sala Boardroom Horizon",
      clientId: "cli-101", clientName: "Mariana Rojas Solís", clientEmail: "mariana.rojas@techcr.io",
      clientPhone: "+506 8702-4411", company: "TechNova Costa Rica",
      bookingType: "hour", date: _D2, endDate: _D2, timeStart: "10:00", timeEnd: "13:00", hours: 3, attendees: 8,
      addons: ["add-1", "add-2"], totalCRC: 55500, totalUSD: 105,
      paymentMethod: "sinpe", sinpeRef: "SINPE-992104-BN", sinpeVoucherUrl: "assets/voucher_bn.svg",
      sinpeSubmittedAt: nxMinutesAgoISO(6), status: "pending_sinpe",
      qrCodeData: "NEXUS-RES-9844-HORIZON-VALID", createdAt: nxMinutesAgoISO(6)
    },
    {
      id: "RES-9830", seed: true,
      spaceId: "sp-1", spaceName: "Sala Boardroom Horizon",
      clientId: "cli-102", clientName: "Alejandro Montero B.", clientEmail: "a.montero@monterolegal.com",
      clientPhone: "+506 8321-9900", company: "Montero & Asociados Law",
      bookingType: "hour", date: _D1, endDate: _D1, timeStart: "14:00", timeEnd: "17:00", hours: 3, attendees: 6,
      addons: ["add-1"], totalCRC: 49500, totalUSD: 94,
      paymentMethod: "card", sinpeRef: null, sinpeVoucherUrl: null, status: "confirmed",
      qrCodeData: "NEXUS-RES-9830-CONFIRMED", createdAt: nxMinutesAgoISO(60 * 26)
    },
    {
      id: "RES-9824", seed: true,
      spaceId: "sp-3", spaceName: "Focus Pod Oasis",
      clientId: "cli-103", clientName: "Esteban Mora Chaves", clientEmail: "esteban@pulsardigital.cr",
      clientPhone: "+506 8812-7744", company: "Pulsar Digital Studio",
      bookingType: "hour", date: _D0, endDate: _D0, timeStart: "11:00", timeEnd: "13:00", hours: 2, attendees: 1,
      addons: [], totalCRC: 10000, totalUSD: 19,
      paymentMethod: "sinpe", sinpeRef: "SINPE-884210-BAC", sinpeVoucherUrl: "assets/voucher_bac.svg",
      sinpeSubmittedAt: nxMinutesAgoISO(18), status: "pending_sinpe",
      qrCodeData: "NEXUS-RES-9824-OASIS-PENDING", createdAt: nxMinutesAgoISO(18)
    },
    {
      id: "RES-9818", seed: true,
      spaceId: "sp-2", spaceName: "Private Office Alpha",
      clientId: "cli-101", clientName: "Mariana Rojas Solís", clientEmail: "mariana.rojas@techcr.io",
      clientPhone: "+506 8702-4411", company: "TechNova Costa Rica",
      bookingType: "day", date: _D0, endDate: _D0, timeStart: "08:00", timeEnd: "18:00", hours: 10, attendees: 4,
      addons: ["add-3"], totalCRC: 78500, totalUSD: 149,
      paymentMethod: "card", sinpeRef: null, sinpeVoucherUrl: null, status: "confirmed",
      qrCodeData: "NEXUS-RES-9818-ALPHA-ACTIVE", createdAt: nxMinutesAgoISO(60 * 50),
      approvedAt: nxMinutesAgoISO(60 * 50)
    },
    // Reservas corporativas (antes solo existían en "bookedSlots")
    {
      id: "RES-9821", seed: true, spaceId: "sp-1", spaceName: "Sala Boardroom Horizon",
      clientId: "corp-intel", clientName: "Intel Costa Rica", clientEmail: "facilities@intel.example", clientPhone: "+506 2298-0000", company: "Intel Costa Rica",
      bookingType: "hour", date: _D0, endDate: _D0, timeStart: "09:00", timeEnd: "11:00", hours: 2, attendees: 10,
      addons: [], totalCRC: 30000, totalUSD: 56, paymentMethod: "transfer", sinpeRef: null, sinpeVoucherUrl: null,
      status: "confirmed", qrCodeData: "NEXUS-RES-9821", createdAt: nxMinutesAgoISO(60 * 72)
    },
    {
      id: "RES-9826", seed: true, spaceId: "sp-3", spaceName: "Focus Pod Oasis",
      clientId: "corp-cv", clientName: "Carlos Vargas", clientEmail: "cvargas@correo.example", clientPhone: "+506 8700-0000", company: "Particular",
      bookingType: "hour", date: _D0, endDate: _D0, timeStart: "15:00", timeEnd: "18:00", hours: 3, attendees: 1,
      addons: [], totalCRC: 15000, totalUSD: 27, paymentMethod: "card", sinpeRef: null, sinpeVoucherUrl: null,
      status: "confirmed", qrCodeData: "NEXUS-RES-9826", createdAt: nxMinutesAgoISO(60 * 30)
    },
    {
      id: "RES-9811", seed: true, spaceId: "sp-4", spaceName: "Hot Desk Flex Lounge",
      clientId: "corp-sc", clientName: "Startup Collective", clientEmail: "hola@startup.example", clientPhone: "+506 8600-0000", company: "Startup Collective",
      bookingType: "day", date: _D0, endDate: _D0, timeStart: "08:00", timeEnd: "17:00", hours: 9, attendees: 20,
      addons: [], totalCRC: 16000, totalUSD: 30, paymentMethod: "transfer", sinpeRef: null, sinpeVoucherUrl: null,
      status: "confirmed", qrCodeData: "NEXUS-RES-9811", createdAt: nxMinutesAgoISO(60 * 96)
    },
    {
      id: "RES-9835", seed: true, spaceId: "sp-5", spaceName: "Creative Studio Lab",
      clientId: "corp-pulsar", clientName: "Agencia Creativa Pulsar", clientEmail: "studio@pulsar.example", clientPhone: "+506 8500-0000", company: "Agencia Creativa Pulsar",
      bookingType: "day", date: _D1, endDate: _D1, timeStart: "09:00", timeEnd: "18:00", hours: 9, attendees: 15,
      addons: [], totalCRC: 110000, totalUSD: 210, paymentMethod: "card", sinpeRef: null, sinpeVoucherUrl: null,
      status: "confirmed", qrCodeData: "NEXUS-RES-9835", createdAt: nxMinutesAgoISO(60 * 40)
    },
    {
      id: "RES-9850", seed: true, spaceId: "sp-2", spaceName: "Private Office Alpha",
      clientId: "corp-cj", clientName: "Consultores Jurídicos", clientEmail: "admin@cj.example", clientPhone: "+506 8400-0000", company: "Consultores Jurídicos",
      bookingType: "day", date: _D3, endDate: _D3, timeStart: "08:00", timeEnd: "17:00", hours: 9, attendees: 5,
      addons: [], totalCRC: 75000, totalUSD: 140, paymentMethod: "card", sinpeRef: null, sinpeVoucherUrl: null,
      status: "confirmed", qrCodeData: "NEXUS-RES-9850", createdAt: nxMinutesAgoISO(60 * 20)
    }
  ],

  notifications: [
    { id: "notif-1", title: "Nuevo Pago SINPE por Validar", message: "Reserva RES-9844 recibida con SLA de 30m.", time: "Hace 6 min", unread: true, link: "admin.html#secSla" },
    { id: "notif-2", title: "Reserva Confirmada", message: "Reserva RES-9830 confirmada y factura electrónica emitida.", time: "Ayer", unread: false, link: "admin.html#secBookings" }
  ],

  sinpeAccount: {
    phone: "8888-6398",
    holder: "Nexus Coworking SpA / S.A.",
    idNumber: "3-101-789012",
    bank: "Banco Nacional de Costa Rica / BAC San José",
    instructions: "Envíe el SINPE Móvil al 8888-6398 y coloque en el detalle su nombre y número de reserva. Luego adjunte el comprobante digital en esta pantalla."
  }
};

// ---------------------------------------------------------------------------
// RESILIENT SAFE STORAGE LAYER (Supports LocalStorage, file:// protocol, and Private Browsing)
// ---------------------------------------------------------------------------
const NX_STORAGE_VERSION = "_v11";
const _memCache = {};
function _safeGet(key) {
  try {
    const val = localStorage.getItem(key);
    if (val !== null && val !== undefined) return val;
  } catch (e) {}
  return Object.prototype.hasOwnProperty.call(_memCache, key) ? _memCache[key] : null;
}
// Devuelve true si se guardó de forma persistente. Si localStorage está lleno (p. ej. por un
// comprobante muy pesado) devuelve false para que la interfaz avise en vez de perder datos en silencio.
function _safeSet(key, val) {
  _memCache[key] = val;
  try {
    localStorage.setItem(key, val);
    return true;
  } catch (e) {
    if (typeof console !== "undefined") console.warn("[NEXUS] No se pudo guardar en localStorage:", e && e.name);
    return false;
  }
}
function _safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
  delete _memCache[key];
}

// Purge any stale storage keys from older test builds
try {
  if (typeof localStorage !== "undefined") {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("nexus_") && !k.endsWith(NX_STORAGE_VERSION)) {
        localStorage.removeItem(k);
      }
    }
  }
} catch (e) {}

function _getArray(key, fallback) {
  try {
    const data = _safeGet(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(fallback));
}

const NexusStorage = {
  getSpaces: () => _getArray("nexus_spaces" + NX_STORAGE_VERSION, NEXUS_DATA.spaces),
  saveSpaces: (spaces) => _safeSet("nexus_spaces" + NX_STORAGE_VERSION, JSON.stringify(spaces)),
  getBookings: () => _getArray("nexus_bookings" + NX_STORAGE_VERSION, NEXUS_DATA.bookings),
  saveBookings: (bookings) => _safeSet("nexus_bookings" + NX_STORAGE_VERSION, JSON.stringify(bookings)),
  getClients: () => _getArray("nexus_clients" + NX_STORAGE_VERSION, NEXUS_DATA.clients),
  saveClients: (clients) => _safeSet("nexus_clients" + NX_STORAGE_VERSION, JSON.stringify(clients)),

  // Lee → modifica → guarda sobre los datos MÁS RECIENTES del almacenamiento. Así una pestaña
  // (p. ej. el panel admin) no pisa reservas creadas en otra pestaña mientras estaba abierta.
  updateBookings: (mutator) => {
    const fresh = NexusStorage.getBookings();
    const result = mutator(fresh);
    const ok = NexusStorage.saveBookings(fresh);
    return { ok, bookings: fresh, result };
  },

  getCurrentUser: () => {
    try {
      const user = _safeGet("nexus_current_user" + NX_STORAGE_VERSION);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },
  setCurrentUser: (user) => {
    if (user) _safeSet("nexus_current_user" + NX_STORAGE_VERSION, JSON.stringify(user));
    else _safeRemove("nexus_current_user" + NX_STORAGE_VERSION);
  },
  getAuthRole: () => _safeGet("nexus_auth_role" + NX_STORAGE_VERSION) || null,
  setAuthRole: (role) => {
    if (role) _safeSet("nexus_auth_role" + NX_STORAGE_VERSION, role);
    else _safeRemove("nexus_auth_role" + NX_STORAGE_VERSION);
  },
  logout: () => {
    _safeRemove("nexus_current_user" + NX_STORAGE_VERSION);
    _safeRemove("nexus_auth_role" + NX_STORAGE_VERSION);
  },
  getNotifications: () => _getArray("nexus_notifications" + NX_STORAGE_VERSION, NEXUS_DATA.notifications),
  saveNotifications: (notifs) => _safeSet("nexus_notifications" + NX_STORAGE_VERSION, JSON.stringify(notifs)),

  // Vuelve a sembrar los datos de demostración (se hace automáticamente una vez por día).
  resetDemo: () => {
    NexusStorage.saveSpaces(NEXUS_DATA.spaces);
    NexusStorage.saveBookings(NEXUS_DATA.bookings);
    NexusStorage.saveClients(NEXUS_DATA.clients);
    NexusStorage.saveNotifications(NEXUS_DATA.notifications);
    _safeSet("nexus_seed_date" + NX_STORAGE_VERSION, nxToday());
  }
};

// Siembra inicial y re-siembra diaria: las reservas demo usan fechas relativas a "hoy",
// así el calendario y la bandeja SLA siempre muestran datos vigentes durante una presentación.
try {
  if (_safeGet("nexus_seed_date" + NX_STORAGE_VERSION) !== nxToday() || !_safeGet("nexus_spaces" + NX_STORAGE_VERSION)) {
    NexusStorage.resetDemo();
  }
} catch (e) {}
