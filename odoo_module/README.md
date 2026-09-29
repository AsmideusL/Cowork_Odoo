# 📦 Módulo de Coworking para Odoo 19 (`coworking_management`)

Este paquete contiene la solución integral para Odoo 19 que implementa la reserva de espacios, calendarios individuales por sala, integración con pasarelas de pago, validación especializada para **SINPE Móvil** con SLA y emisión de facturas electrónicas.

---

## 🗂️ Estructura del Módulo

* **`coworking_management_odoo19.zip`**: Archivo comprimido listo para subir o descomprimir en el servidor Odoo.
* **`coworking_management/`**: Código fuente modular completo:
  * `models/coworking_space.py`: Modelo de espacios, tarifas (horas/días/mes) y acción directa al calendario de la sala.
  * `models/coworking_booking.py`: Motor de reservas, validación de solapamiento (prevención de double-booking), cálculo de SLA para SINPE, facturación automática en `account.move` y sincronización con el calendario nativo de Odoo (`calendar.event`).
  * `models/coworking_addon.py`: Servicios adicionales (catering, proyectores, parqueo VIP, soporte técnico).
  * `models/res_partner.py`: Extensión del cliente con cédula oficial, contacto de emergencia, niveles de fidelidad (Bronce, Plata, Oro, Platino) y horas acumuladas.
  * `views/`: Vistas Kanban, Lista, Formulario, **Calendario Visual** por sala y reportes Pivot/Gráficos de demanda.
  * `security/`: Reglas de acceso para Operador y Administrador / Gerente.
  * `data/`: Secuencia automática de reservas y plantillas de correo con Pase Digital QR.
  * `controllers/`: Endpoints web y API para disponibilidad y reservas.

---

## ⚙️ Pasos de Instalación en Odoo 19

### Método 1: En Servidor Local o VPS (Docker / Linux / Windows)
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
2. **Espacios Precargados:** El sistema incluirá 4 espacios de demostración listos (Sala Boardroom Horizon, Private Alpha, Focus Pod Oasis y Hot Desk Flex Lounge).
3. **Calendarios:** Ingrese a *Operaciones & Reservas -> Calendario Central de Espacios* para ver las reservas por sala con código de colores.
4. **Flujo SINPE Móvil:** Al registrarse una reserva con SINPE Móvil, aparecerá automáticamente en *Validación SINPE & SLA* con su semáforo de tiempo (Verde/Amarillo/Rojo). Al aprobarla, Odoo generará la factura y enviará el correo al cliente.
