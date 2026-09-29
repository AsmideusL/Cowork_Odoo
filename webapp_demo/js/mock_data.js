// Mock Data Store for NEXUS Coworking & Spaces Demo
const NEXUS_DATA = {
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
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80",
      description: "Nuestra sala insigne con mesa de nogal macizo, sistema de videoconferencia 4K Polycom, audio envolvente y vista panorámica a la ciudad.",
      amenities: ["Pantalla 4K 85\"", "Videoconferencia Polycom", "Pizarra de Cristal", "Café Premium Nespresso", "WiFi 6 Dedicado 1Gbps", "Climatización Inteligente"],
      zoneId: "zone-horizon",
      floor: "Piso 4 - Ala Este",
      status: "available", // available, busy, maintenance
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
      badge: "Oficina Privada",
      capacity: 5,
      priceHour: 12000,
      priceDay: 75000,
      priceMonth: 850000,
      priceHourUSD: 22,
      priceDayUSD: 140,
      priceMonthUSD: 1600,
      image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=80",
      description: "Oficina privada completamente amoblada con escritorios ergonómicos Herman Miller, acceso biométrico 24/7 y control de luz natural.",
      amenities: ["5 Puestos Ergonómicos", "Acceso Cerradura Smart PIN", "Pizarra Magnética", "Mini-bar Ejecutivo", "Línea Telefónica IP", "Limpieza Diaria"],
      zoneId: "zone-alpha",
      floor: "Piso 4 - Oficina 402",
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
      image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=80",
      description: "Cabina individual con aislamiento acústico de nivel estudio (-35dB), iluminación fotográfica LED regulable y ventilación activa continua.",
      amenities: ["Aislamiento -35dB", "Luz de Anillo LED Regulable", "Conexión Ethernet Gigabit", "Ventilación Silenciosa", "Cargador Inalámbrico Qi"],
      zoneId: "zone-oasis",
      floor: "Piso 4 - Zona Silenciosa",
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
      image: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1000&q=80",
      description: "Área abierta de coworking vibrante y colaborativa, con iluminación natural, acceso a barra de café barista ilimitado y terraza lounge al aire libre.",
      amenities: ["Escritorios Compartidos", "Cafetería & Snacks Libres", "Terraza & Jardín Zen", "Eventos de Networking", "Casilleros con Clave"],
      zoneId: "zone-lounge",
      floor: "Piso 4 - Open Space",
      status: "available",
      bookedSlots: [
        { date: "2026-09-29", start: "08:00", end: "17:00", client: "Startup Collective", bookingId: "RES-9811" }
      ]
    },
    {
      id: "sp-5",
      name: "Creative Studio Lab",
      category: "workshop",
      badge: "Innovación & Talleres",
      capacity: 18,
      priceHour: 18000,
      priceDay: 110000,
      priceMonth: 1400000,
      priceHourUSD: 34,
      priceDayUSD: 210,
      priceMonthUSD: 2650,
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80",
      description: "Espacio dinámico modular para workshops de Design Thinking, hackathons y sesiones de brainstorming. Mobiliario reconfigurable sobre ruedas.",
      amenities: ["Pared de Cristal Escribible", "Proyector Tiro Corto", "Post-its & Kits de Diseño", "Mobiliario Modular con Ruedas", "Audio JBL Bluetooth"],
      zoneId: "zone-creative",
      floor: "Piso 4 - Laboratorio",
      status: "available",
      bookedSlots: [
        { date: "2026-09-30", start: "09:00", end: "18:00", client: "Agencia Creativa Pulsar", bookingId: "RES-9835" }
      ]
    }
  ],

  addons: [
    { id: "add-1", name: "Servicio Barista & Catering Gourmet", price: 4500, priceUSD: 8, unit: "por persona", icon: "☕" },
    { id: "add-2", name: "Proyector Láser 4K & Pantalla Motorizada", price: 6000, priceUSD: 11, unit: "por sesión", icon: "📽️" },
    { id: "add-3", name: "Espacio de Parqueo Subterráneo VIP", price: 3500, priceUSD: 6.5, unit: "por vehículo/día", icon: "🚗" },
    { id: "add-4", name: "Asistencia Técnica In-Room Dedicada", price: 5000, priceUSD: 9.5, unit: "por reserva", icon: "💻" },
    { id: "add-5", name: "Créditos de Impresión Láser & Escáner (100 págs)", price: 3000, priceUSD: 5.5, unit: "por paquete", icon: "🖨️" }
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
      sinpeVoucherUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
      sinpeSubmittedAt: "2026-09-29T11:35:00",
      status: "pending_sinpe", // pending_sinpe, confirmed, completed, cancelled, rescheduled
      qrCodeData: "NEXUS-RES-9844-HORIZON-VALID",
      slaDeadlineMinutes: 30,
      createdAt: "2026-09-29T11:35:00"
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
      sinpeVoucherUrl: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80",
      sinpeSubmittedAt: "2026-09-29T10:15:00",
      status: "pending_sinpe",
      qrCodeData: "NEXUS-RES-9824-OASIS-PENDING",
      slaDeadlineMinutes: 30,
      createdAt: "2026-09-29T10:15:00"
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

  sinpeAccount: {
    phone: "8888-6398", // 8888-NEXUS
    holder: "Nexus Coworking SpA / S.A.",
    idNumber: "3-101-789012",
    bank: "Banco Nacional de Costa Rica / BAC San José",
    instructions: "Envíe el SINPE Móvil al 8888-6398 y coloque en el detalle su nombre y número de reserva. Luego adjunte el comprobante digital en esta pantalla."
  }
};

// LocalStorage Helper to keep demo state interactive across tabs
const NexusStorage = {
  getSpaces: () => {
    const data = localStorage.getItem("nexus_spaces");
    return data ? JSON.parse(data) : NEXUS_DATA.spaces;
  },
  saveSpaces: (spaces) => {
    localStorage.setItem("nexus_spaces", JSON.stringify(spaces));
  },
  getBookings: () => {
    const data = localStorage.getItem("nexus_bookings");
    return data ? JSON.parse(data) : NEXUS_DATA.bookings;
  },
  saveBookings: (bookings) => {
    localStorage.setItem("nexus_bookings", JSON.stringify(bookings));
  },
  getClients: () => {
    const data = localStorage.getItem("nexus_clients");
    return data ? JSON.parse(data) : NEXUS_DATA.clients;
  },
  saveClients: (clients) => {
    localStorage.setItem("nexus_clients", JSON.stringify(clients));
  },
  getCurrentUser: () => {
    const user = localStorage.getItem("nexus_current_user");
    return user ? JSON.parse(user) : NEXUS_DATA.clients[0];
  },
  setCurrentUser: (user) => {
    localStorage.setItem("nexus_current_user", JSON.stringify(user));
  },
  resetData: () => {
    localStorage.removeItem("nexus_spaces");
    localStorage.removeItem("nexus_bookings");
    localStorage.removeItem("nexus_clients");
    localStorage.removeItem("nexus_current_user");
  }
};

// Initialize if not present
if (!localStorage.getItem("nexus_spaces")) {
  NexusStorage.saveSpaces(NEXUS_DATA.spaces);
  NexusStorage.saveBookings(NEXUS_DATA.bookings);
  NexusStorage.saveClients(NEXUS_DATA.clients);
  NexusStorage.setCurrentUser(NEXUS_DATA.clients[0]);
}
