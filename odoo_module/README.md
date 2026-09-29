# 📦 Módulo de Coworking para Odoo 19 (`coworking_management`)

Este paquete contiene la solución integral para Odoo 19 que implementa la reserva de espacios, calendarios individuales por sala, integración con pasarelas de pago, validación especializada para **SINPE Móvil** con SLA y emisión de facturas electrónicas.

---

## 🗂️ Estructura del Módulo

* **`coworking_management_odoo19.zip`**: Copia comprimida del módulo para descomprimir dentro de `addons_path` en el servidor (no usar *Aplicaciones → Importar módulo*: esa opción no admite módulos con código Python).
* **`coworking_management/`**: Código fuente modular completo:
  * `models/coworking_space.py`: Modelo de espacios, tarifas (horas/días/mes) y acción directa al calendario de la sala.
  * `models/coworking_booking.py`: Motor de reservas, validación de solapamiento (prevención de double-booking), SLA SINPE (15/30 min, refrescado por una acción planificada cada 5 min), factura de cliente en `account.move` con descuento de fidelidad y sincronización con el calendario nativo de Odoo (`calendar.event`).
  * `models/coworking_addon.py`: Servicios adicionales (catering, proyectores, parqueo VIP, soporte técnico).
  * `models/res_partner.py`: Extensión del cliente con cédula oficial, contacto de emergencia, niveles de fidelidad (Bronce, Plata, Oro, Platino) y horas acumuladas.
  * `views/`: Vistas Kanban, Lista, Formulario, **Calendario Visual** por sala y reportes Pivot/Gráficos de demanda.
  * `security/`: Reglas de acceso para Operador y Administrador / Gerente.
  * `data/`: Secuencia automática de reservas y plantillas de correo con Pase Digital QR.
  * `controllers/` + `views/website_templates.xml`: Catálogo `/coworking`, formulario de reserva, página de confirmación y API JSON-RPC de disponibilidad/reprogramación.

---

## ⚙️ Pasos de Instalación en Odoo 19

### Método 1: En Servidor Local o VPS (Docker / Linux / Windows)
> ⚠️ Requiere Odoo 19 **auto-hospedado u Odoo.sh**. Odoo Online (SaaS) no permite instalar módulos con código Python.

1. Copie la carpeta `coworking_management` (o descomprima `coworking_management_odoo19.zip`) dentro del directorio de addons de su instancia de Odoo:
   ```bash
   cp -r coworking_management /ruta/a/su/odoo/custom_addons/
   ```
2. Asegúrese de que el parámetro `addons_path` en su archivo `odoo.conf` incluya la carpeta donde colocó el módulo:
   ```ini
   addons_path = /odoo/odoo-server/addons,/odoo/custom_addons
   ```
3. Reinicie el servicio de Odoo:
   ```bash
   sudo systemctl restart odoo
   # o en Docker:
   docker restart odoo_container
   ```
4. Ingrese a Odoo con un usuario Administrador y active el **Modo Desarrollador** (*Ajustes -> Activar Modo Desarrollador*).
5. Vaya al menú **Aplicaciones** y haga clic en **"Actualizar lista de aplicaciones"** en la barra superior.
6. En la barra de búsqueda de Aplicaciones, elimine el filtro *"Aplicaciones"* y escriba `coworking_management` o `Coworking`.
7. Haga clic en **"Activar" (Instalar)**.

---

## 🎯 Verificación Rápida tras la Instalación

1. **Nuevo Menú Principal:** Verá el icono y menú **"Coworking & Espacios"**.
2. **Espacios Precargados:** El sistema incluirá 5 espacios de demostración (Sala Boardroom Horizon, Private Alpha, Focus Pod Oasis, Hot Desk Flex Lounge y Creative Studio Lab).
3. **Calendarios:** Ingrese a *Operaciones & Reservas -> Calendario Central de Espacios* para ver las reservas por sala con código de colores.
4. **Flujo SINPE Móvil:** Al registrarse una reserva con SINPE Móvil, aparecerá automáticamente en *Validación SINPE & SLA* con su semáforo de tiempo (Verde/Amarillo/Rojo). Al aprobarla, Odoo crea la factura (borrador, con el descuento aplicado) y envía el correo al cliente.
5. **Sitio web:** el menú *Coworking* del sitio lleva a `/coworking`, donde los clientes (con sesión iniciada) reservan y adjuntan el comprobante.

---

## 📌 Alcance y Pendientes Conocidos

* **Tarjeta de crédito:** no hay pasarela integrada. Las reservas con tarjeta/transferencia quedan en *Borrador / Pago Pendiente* y un gerente las confirma con **Confirmar Pago Verificado & Facturar**.
* **Factura electrónica CR:** la factura se crea en borrador; su validación y envío a Hacienda depende de la localización contable costarricense instalada.
* **Correos:** requieren un servidor de correo saliente configurado y el correo de la compañía definido (destino de las alertas SINPE).
