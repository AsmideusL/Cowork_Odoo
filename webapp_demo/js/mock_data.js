// Mock Data Store for NEXUS Coworking & Private Spaces Demo (Clean Unauthenticated Guest by Default)
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
      floor: "Piso 4 - Ala Este",
      status: "available",
      bookedSlots: [
        { date: "2026-09-29", start: "09:00", end: "11:00", client: "Intel Costa Rica", bookingId: "RES-9821" },
        { date: "2026-09-30", start: "14:00", end: "17:00", client: "Bac Credomatic", bookingId: "RES-9830" },
        { date: "2026-10-01", start: "10:00", end: "13:00", client: "Amazon CS", bookingId: "RES-9844" }
      ]
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
      floor: "Piso 4 - Suite 402",
      status: "available",
      bookedSlots: [
        { date: "2026-09-29", start: "13:00", end: "18:00", client: "Fintech Solutions CR", bookingId: "RES-9818" },
        { date: "2026-10-02", start: "08:00", end: "17:00", client: "Consultores Jurídicos", bookingId: "RES-9850" }
      ]
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
      floor: "Piso 4 - Galería Silenciosa",
      status: "busy",
      bookedSlots: [
        { date: "2026-09-29", start: "11:00", end: "13:00", client: "Sofía Méndez (Podcaster)", bookingId: "RES-9824" },
        { date: "2026-09-29", start: "15:00", end: "18:00", client: "Carlos Vargas", bookingId: "RES-9826" }
      ]
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
      floor: "Piso 4 - Open Lounge",
      status: "available",
      bookedSlots: [
        { date: "2026-09-29", start: "08:00", end: "17:00", client: "Startup Collective", bookingId: "RES-9811" }
      ]
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
      floor: "Piso 4 - Estudio Creativo",
      status: "available",
      bookedSlots: [
        { date: "2026-09-30", start: "09:00", end: "18:00", client: "Agencia Creativa Pulsar", bookingId: "RES-9835" }
      ]
    }
  ],

  addons: [
    { id: "add-1", name: "Servicio Barista & Catering de Autor", price: 4500, priceUSD: 8, unit: "por persona", icon: "☕" },
    { id: "add-2", name: "Proyector Láser 4K & Pantalla Motorizada", price: 6000, priceUSD: 11, unit: "por sesión", icon: "📽️" },
    { id: "add-3", name: "Parqueo Subterráneo con Vigilancia Privada", price: 3500, priceUSD: 6.5, unit: "por vehículo/día", icon: "🚗" },
    { id: "add-4", name: "Concierge Técnico In-Room para Streaming", price: 5000, priceUSD: 9.5, unit: "por reserva", icon: "💻" },
    { id: "add-5", name: "Créditos de Impresión Fina & Escáner (100 págs)", price: 3000, priceUSD: 5.5, unit: "por paquete", icon: "🖨️" }
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

  bookings: [
    {
      id: "RES-9844",
      spaceId: "sp-1",
      spaceName: "Sala Boardroom Horizon",
      clientId: "cli-101",
      clientName: "Mariana Rojas Solís",
      clientEmail: "mariana.rojas@techcr.io",
      clientPhone: "+506 8702-4411",
      company: "TechNova Costa Rica",
      bookingType: "hour",
      date: "2026-10-01",
      timeStart: "10:00",
      timeEnd: "13:00",
      hours: 3,
      addons: ["add-1", "add-2"],
      totalCRC: 55500,
      totalUSD: 105,
      paymentMethod: "sinpe",
      sinpeRef: "SINPE-992104-BN",
      sinpeVoucherUrl: "assets/voucher_bn.svg",
      sinpeSubmittedAt: "2026-09-29T12:20:00",
      status: "pending_sinpe",
      qrCodeData: "NEXUS-RES-9844-HORIZON-VALID",
      slaDeadlineMinutes: 30,
      createdAt: "2026-09-29T12:20:00"
    },
    {
      id: "RES-9830",
      spaceId: "sp-1",
      spaceName: "Sala Boardroom Horizon",
      clientId: "cli-102",
      clientName: "Alejandro Montero B.",
      clientEmail: "a.montero@monterolegal.com",
      clientPhone: "+506 8321-9900",
      company: "Montero & Asociados Law",
      bookingType: "hour",
      date: "2026-09-30",
      timeStart: "14:00",
      timeEnd: "17:00",
      hours: 3,
      addons: ["add-1"],
      totalCRC: 49500,
      totalUSD: 94,
      paymentMethod: "card",
      sinpeRef: null,
      sinpeVoucherUrl: null,
      status: "confirmed",
      qrCodeData: "NEXUS-RES-9830-CONFIRMED",
      createdAt: "2026-09-28T16:20:00"
    },
    {
      id: "RES-9824",
      spaceId: "sp-3",
      spaceName: "Focus Pod Oasis",
      clientId: "cli-103",
      clientName: "Esteban Mora Chaves",
      clientEmail: "esteban@pulsardigital.cr",
      clientPhone: "+506 8812-7744",
      company: "Pulsar Digital Studio",
      bookingType: "hour",
      date: "2026-09-29",
      timeStart: "11:00",
      timeEnd: "13:00",
      hours: 2,
      addons: [],
      totalCRC: 10000,
      totalUSD: 19,
      paymentMethod: "sinpe",
      sinpeRef: "SINPE-884210-BAC",
      sinpeVoucherUrl: "assets/voucher_bac.svg",
      sinpeSubmittedAt: "2026-09-29T12:05:00",
      status: "pending_sinpe",
      qrCodeData: "NEXUS-RES-9824-OASIS-PENDING",
      slaDeadlineMinutes: 30,
      createdAt: "2026-09-29T12:05:00"
    },
    {
      id: "RES-9818",
      spaceId: "sp-2",
      spaceName: "Private Office Alpha",
      clientId: "cli-101",
      clientName: "Mariana Rojas Solís",
      clientEmail: "mariana.rojas@techcr.io",
      clientPhone: "+506 8702-4411",
      company: "TechNova Costa Rica",
      bookingType: "day",
      date: "2026-09-29",
      timeStart: "08:00",
      timeEnd: "18:00",
      hours: 10,
      addons: ["add-3"],
      totalCRC: 78500,
      totalUSD: 149,
      paymentMethod: "card",
      sinpeRef: null,
      sinpeVoucherUrl: null,
      status: "confirmed",
      qrCodeData: "NEXUS-RES-9818-ALPHA-ACTIVE",
      createdAt: "2026-09-27T09:00:00"
    }
  ],

  notifications: [
    { id: "notif-1", title: "Nuevo Pago SINPE por Validar", message: "Reserva RES-9844 recibida con SLA de 30m.", time: "Hace 10 min", unread: true, link: "admin.html#secSla" },
    { id: "notif-2", title: "Reserva Confirmada", message: "Reserva RES-9830 confirmada y factura electrónica emitida.", time: "Hace 1 hora", unread: false, link: "admin.html#secBookings" }
  ],

  sinpeAccount: {
    phone: "8888-6398",
    holder: "Nexus Coworking SpA / S.A.",
    idNumber: "3-101-789012",
    bank: "Banco Nacional de Costa Rica / BAC San José",
    instructions: "Envíe el SINPE Móvil al 8888-6398 y coloque en el detalle su nombre y número de reserva. Luego adjunte el comprobante digital en esta pantalla."
  }
};

// RESILIENT SAFE STORAGE LAYER (Supports LocalStorage, file:// protocol, and Private Browsing)
const _memCache = {};
function _safeGet(key) {
  try {
    const val = localStorage.getItem(key);
    if (val !== null && val !== undefined) return val;
  } catch(e) {}
  return _memCache[key] || null;
}
function _safeSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch(e) {}
  _memCache[key] = val;
}
function _safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch(e) {}
  delete _memCache[key];
}

const NexusStorage = {
  getSpaces: () => {
    try {
      const data = _safeGet("nexus_spaces_v6");
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].priceHour && parsed[0].image) {
          return parsed;
        }
      }
    } catch(e) {}
    NexusStorage.saveSpaces(NEXUS_DATA.spaces);
    return NEXUS_DATA.spaces;
  },
  saveSpaces: (spaces) => {
    _safeSet("nexus_spaces_v6", JSON.stringify(spaces));
  },
  getBookings: () => {
    try {
      const data = _safeGet("nexus_bookings_v6");
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    NexusStorage.saveBookings(NEXUS_DATA.bookings);
    return NEXUS_DATA.bookings;
  },
  saveBookings: (bookings) => {
    _safeSet("nexus_bookings_v6", JSON.stringify(bookings));
  },
  getClients: () => {
    try {
      const data = _safeGet("nexus_clients_v6");
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    NexusStorage.saveClients(NEXUS_DATA.clients);
    return NEXUS_DATA.clients;
  },
  saveClients: (clients) => {
    _safeSet("nexus_clients_v6", JSON.stringify(clients));
  },
  getCurrentUser: () => {
    try {
      const user = _safeGet("nexus_current_user_v6");
      return user ? JSON.parse(user) : null;
    } catch(e) {
      return null;
    }
  },
  setCurrentUser: (user) => {
    if (user) {
      _safeSet("nexus_current_user_v6", JSON.stringify(user));
    } else {
      _safeRemove("nexus_current_user_v6");
    }
  },
  getAuthRole: () => {
    return _safeGet("nexus_auth_role_v6") || null;
  },
  setAuthRole: (role) => {
    if (role) {
      _safeSet("nexus_auth_role_v6", role);
    } else {
      _safeRemove("nexus_auth_role_v6");
    }
  },
  logout: () => {
    _safeRemove("nexus_current_user_v6");
    _safeRemove("nexus_auth_role_v6");
  },
  getNotifications: () => {
    try {
      const data = _safeGet("nexus_notifications_v6");
      if (data) return JSON.parse(data);
    } catch(e) {}
    return NEXUS_DATA.notifications;
  },
  saveNotifications: (notifs) => {
    _safeSet("nexus_notifications_v6", JSON.stringify(notifs));
  }
};

// Initial Seed with error protection
try {
  if (!_safeGet("nexus_spaces_v6")) {
    NexusStorage.saveSpaces(NEXUS_DATA.spaces);
    NexusStorage.saveBookings(NEXUS_DATA.bookings);
    NexusStorage.saveClients(NEXUS_DATA.clients);
    NexusStorage.saveNotifications(NEXUS_DATA.notifications);
  }
} catch(e) {}
