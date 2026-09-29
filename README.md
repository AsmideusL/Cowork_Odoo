# 🏢 NEXUS Coworking & Spaces Ecosystem (Odoo 19 & Web App Demo)

Bienvenido al proyecto integral de gestión de reservas de coworking para clientes ejecutivos y corporativos.

---

## 📁 Estructura del Proyecto

```text
Coworking/
│
├── webapp_demo/                         # 👉 LISTO PARA DEMOSTRACIÓN EN VIVO & NETLIFY
│   ├── index.html                      # Portal Web Público (Catálogo, Croquis 2D, Checkout, QR)
│   ├── admin.html                      # Panel Gerencial (SLA SINPE, Calendarios por Sala, Gráficos)
│   ├── css/
│   │   └── style.css                   # Sistema de diseño de lujo (Glassmorphism & Cyber-Executive)
│   ├── js/
│   │   ├── app.js                      # Motor interactivo de cliente y reservas
│   │   ├── admin.js                    # Motor administrativo, temporizadores SLA y analíticas
│   │   └── mock_data.js                # Base de datos interactiva (Local Storage)
│   ├── netlify.toml                    # Configuración para despliegue en Netlify con 1 clic
│   └── README.md                       # Guía de uso y despliegue rápido
│
└── odoo_module/                        # 👉 MÓDULO LISTO PARA INSTALAR EN ODOO 19
    ├── coworking_management/           # Código fuente del módulo Odoo 19
    │   ├── __manifest__.py
    │   ├── models/                     # Espacios, Reservas con SLA, Addons y Clientes
    │   ├── views/                      # Calendario visual, Formularios, Kanban, Reportes
    │   ├── security/                   # Permisos de Operador y Administrador
    │   ├── controllers/                # Endpoints de disponibilidad y reservas web
    │   └── data/                       # Espacios demo y plantillas de correo con QR
    ├── coworking_management_odoo19.zip # Instalador comprimido para Odoo
    └── README.md                       # Manual técnico de instalación en Odoo 19
```

---

## ⚡ ¿Cómo usar cada parte?

1. **Para la Demostración Rápida al Cliente:**
   * Abre `webapp_demo/index.html` en cualquier navegador web para probarlo localmente.
   * O arrastra la carpeta `webapp_demo` en [Netlify Drop](https://app.netlify.com/drop) para tenerlo en línea con URL pública en 30 segundos.
2. **Para la Implementación en el Servidor Odoo 19:**
   * Toma el archivo `odoo_module/coworking_management_odoo19.zip` y sigue los pasos detallados en [odoo_module/README.md](file:///c:/Users/FRT/OneDrive%20-%20Flowing%20Rivers%20Technologies/Escritorio/Proyectos%20Clientes/Coworking/odoo_module/README.md).
