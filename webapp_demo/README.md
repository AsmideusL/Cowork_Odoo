# 🚀 NEXUS Coworking & Spaces - Web App Demo

Prototipo interactivo de alta fidelidad para el sistema de reserva y administración de coworking, diseñado con estética ejecutiva moderna y listo para demostración en vivo.

---

## 🌟 Características Destacadas en el Demo

1. **Plano 2D Interactivo de Instalaciones (Floor Plan):**
   * Vista de croquis con zonas reactivas (verde = disponible, rojo = ocupado).
   * Al hacer clic en cualquier sala del plano, se abre directamente el flujo de reserva.
2. **Calendario Dinámico e Individual por Sala:**
   * Franjas horarias en tiempo real por horas, días o mensual.
   * Detección de horarios ya ocupados para prevenir *double-booking*.
3. **Flujo de Pago Mixto:**
   * **Tarjeta de Crédito / Débito:** Simulación instantánea con emisión de recibo.
   * **SINPE Móvil (Costa Rica):** Muestra teléfono oficial (8888-6398), titular, monto a pagar, solicitud de número de referencia y carga de archivo de comprobante digital.
4. **Bandeja de Aprobación de SINPE con SLA (Admin):**
   * Monitoreo de tiempo transcurrido (Verde &lt; 10 min, Amarillo &lt; 20 min, Rojo &gt; 20 min).
   * Modal de inspección de comprobante con zoom.
   * Aprobación con 1 clic (emite factura electrónica simulada) o rechazo con motivo para el cliente.
5. **Generador de Pase Digital de Acceso con Código QR:**
   * Genera el QR dinámico único para apertura de cerraduras inteligentes o check-in en recepción.
6. **Portal del Cliente ("Mis Reservas"):**
   * Historial de reservas y herramienta de **Reprogramación de Fecha/Hora** sujeta a disponibilidad.
7. **Panel Gerencial con Informes & Gráficos (Chart.js):**
   * Gráfico de barras de salas más demandadas.
   * Gráfico de dona de distribución de ingresos (horas vs días vs meses).
   * Ranking de clientes frecuentes con identificación y horas acumuladas.

---

## ⚡ Cómo Desplegar en Netlify (Demostración en Línea)

Puedes alojar este demo gratuitamente en [Netlify](https://www.netlify.com/) en menos de 1 minuto:

### Opción 1: Arrastrar y Soltar (Sin Git / 30 Segundos)
1. Inicia sesión en tu cuenta de [Netlify](https://app.netlify.com/).
2. Ve a la pestaña **"Sites"**.
3. Arrastra directamente la carpeta `webapp_demo` y suéltala en el recuadro que dice **"Drag and drop your site output folder here"**.
4. ¡Listo! Netlify te dará una URL pública (ejemplo: `https://nexus-coworking-demo.netlify.app`).

### Opción 2: Conectar mediante GitHub / Git
1. Sube este repositorio a tu GitHub.
2. En Netlify, crea un "New Site from Git".
3. En **Base directory**, coloca: `webapp_demo`
4. En **Publish directory**, déjalo en blanco o coloca: `.`
5. Haz clic en **Deploy Site**.

---

## 💻 Cómo Probarlo Localmente

No requiere instalar Node.js ni bases de datos para el demo:
* Simplemente haz doble clic en `webapp_demo/index.html` para abrirlo en tu navegador favorito (Chrome, Edge, Safari).
* Para acceder al panel de administración, haz clic en el botón superior **"⚡ Panel Admin & SLA"** o abre directamente `webapp_demo/admin.html`.
