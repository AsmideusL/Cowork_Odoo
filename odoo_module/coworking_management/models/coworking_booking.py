# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError
from datetime import datetime, timedelta

class CoworkingBooking(models.Model):
    _name = 'coworking.booking'
    _description = 'Reserva de Espacio de Coworking'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_start desc, id desc'

    name = fields.Char(string='Código de Reserva', required=True, copy=False, readonly=True, default=lambda self: _('Nuevo'))
    
    partner_id = fields.Many2one(
        'res.partner', string='Cliente Registrado', 
        required=True, tracking=True
    )
    partner_phone = fields.Char(related='partner_id.phone', string='Teléfono / WhatsApp', readonly=True)
    partner_email = fields.Char(related='partner_id.email', string='Correo Electrónico', readonly=True)
    partner_vat = fields.Char(related='partner_id.vat', string='Cédula / Identificación', readonly=True)
    
    space_id = fields.Many2one(
        'coworking.space', string='Espacio / Oficina', 
        required=True, tracking=True
    )
    
    booking_type = fields.Selection([
        ('hour', 'Por Horas'),
        ('day', 'Por Días'),
        ('month', 'Mensual')
    ], string='Modalidad de Reserva', default='hour', required=True, tracking=True)

    date_start = fields.Datetime(string='Fecha y Hora de Inicio', required=True, tracking=True)
    date_end = fields.Datetime(string='Fecha y Hora de Fin', required=True, tracking=True)
    duration_hours = fields.Float(string='Duración (Horas)', compute='_compute_duration', store=True)

    addon_ids = fields.Many2many('coworking.addon', string='Servicios Adicionales')

    currency_id = fields.Many2one(
        'res.currency', string='Moneda', 
        default=lambda self: self.env.company.currency_id.id
    )
    amount_space = fields.Monetary(string='Monto del Espacio', currency_field='currency_id', compute='_compute_amounts', store=True)
    amount_addons = fields.Monetary(string='Monto Servicios Extra', currency_field='currency_id', compute='_compute_amounts', store=True)
    amount_discount = fields.Monetary(string='Descuento Fidelidad', currency_field='currency_id', compute='_compute_amounts', store=True)
    amount_total = fields.Monetary(string='Total a Pagar', currency_field='currency_id', compute='_compute_amounts', store=True, tracking=True)

    # Métodos de Pago y Validación SINPE Móvil
    payment_method = fields.Selection([
        ('card', 'Tarjeta de Crédito / Pasarela Web'),
        ('sinpe', 'SINPE Móvil (Validación Manual)'),
        ('transfer', 'Transferencia Bancaria')
    ], string='Método de Pago', default='sinpe', required=True, tracking=True)

    sinpe_reference = fields.Char(string='Referencia / Comprobante SINPE', tracking=True)
    sinpe_voucher = fields.Binary(string='Archivo de Comprobante SINPE', attachment=True)
    sinpe_voucher_filename = fields.Char(string='Nombre Archivo Comprobante')
    sinpe_submitted_at = fields.Datetime(string='Hora de Envío de Comprobante')

    # SLA de Aprobación
    sla_deadline = fields.Datetime(string='Fecha Límite SLA', compute='_compute_sla', store=True)
    sla_status = fields.Selection([
        ('on_time', 'En Tiempo (< 15m)'),
        ('warning', 'Alerta (< 30m)'),
        ('breached', 'SLA Vencido (> 30m)')
    ], string='Estado de SLA', compute='_compute_sla', store=True)
    approved_by_id = fields.Many2one('res.users', string='Aprobado por', readonly=True)
    approval_date = fields.Datetime(string='Fecha de Aprobación', readonly=True)

    # Estado del Flujo
    state = fields.Selection([
        ('draft', 'Borrador'),
        ('pending_sinpe', 'Pendiente Validación SINPE'),
        ('confirmed', 'Confirmada & Pagada'),
        ('rescheduled', 'Reprogramada'),
        ('done', 'Finalizada'),
        ('cancelled', 'Cancelada')
    ], string='Estado', default='draft', tracking=True)

    # Integración con Calendario & Facturación
    calendar_event_id = fields.Many2one('calendar.event', string='Evento en Calendario Odoo', readonly=True)
    invoice_id = fields.Many2one('account.move', string='Factura Electrónica', readonly=True)
    qr_code_token = fields.Char(string='Token Código QR de Acceso', copy=False, readonly=True)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('Nuevo')) == _('Nuevo'):
                vals['name'] = self.env['ir.sequence'].next_by_code('coworking.booking') or _('COW-RESERVA')
            if not vals.get('qr_code_token'):
                vals['qr_code_token'] = f"NX-ACCESS-{vals.get('name')}-{fields.Datetime.now().strftime('%Y%m%d%H%M')}"
        return super(CoworkingBooking, self).create(vals_list)

    @api.depends('date_start', 'date_end')
    def _compute_duration(self):
        for rec in self:
            if rec.date_start and rec.date_end:
                delta = rec.date_end - rec.date_start
                rec.duration_hours = max(0.5, delta.total_seconds() / 3600.0)
            else:
                rec.duration_hours = 0.0

    @api.depends('booking_type', 'duration_hours', 'space_id', 'addon_ids', 'partner_id.coworking_discount_rate')
    def _compute_amounts(self):
        for rec in self:
            space_price = 0.0
            if rec.space_id:
                if rec.booking_type == 'hour':
                    space_price = rec.space_id.price_hour * rec.duration_hours
                elif rec.booking_type == 'day':
                    days = max(1.0, rec.duration_hours / 24.0)
                    space_price = rec.space_id.price_day * days
                else: # month
                    space_price = rec.space_id.price_month

            addons_price = sum(rec.addon_ids.mapped('price'))
            subtotal = space_price + addons_price
            discount = subtotal * (rec.partner_id.coworking_discount_rate if rec.partner_id else 0.0)

            rec.amount_space = space_price
            rec.amount_addons = addons_price
            rec.amount_discount = discount
            rec.amount_total = subtotal - discount

    @api.depends('sinpe_submitted_at', 'state')
    def _compute_sla(self):
        now = fields.Datetime.now()
        for rec in self:
            if rec.sinpe_submitted_at and rec.state == 'pending_sinpe':
                rec.sla_deadline = rec.sinpe_submitted_at + timedelta(minutes=30)
                diff_minutes = (now - rec.sinpe_submitted_at).total_seconds() / 60.0
                if diff_minutes <= 15:
                    rec.sla_status = 'on_time'
                elif diff_minutes <= 30:
                    rec.sla_status = 'warning'
                else:
                    rec.sla_status = 'breached'
            else:
                rec.sla_deadline = False
                rec.sla_status = 'on_time'

    # Validación de no solapamiento (Evita Double-Booking)
    @api.constrains('space_id', 'date_start', 'date_end', 'state')
    def _check_space_availability(self):
        for rec in self:
            if rec.state not in ('cancelled', 'draft'):
                domain = [
                    ('id', '!=', rec.id),
                    ('space_id', '=', rec.space_id.id),
                    ('state', 'in', ['pending_sinpe', 'confirmed', 'rescheduled']),
                    ('date_start', '<', rec.date_end),
                    ('date_end', '>', rec.date_start),
                ]
                overlapping = self.search(domain, limit=1)
                if overlapping:
                    raise ValidationError(_(
                        'El espacio "%s" ya cuenta con una reserva activa en ese rango de horario '
                        '(Reserva %s: desde %s hasta %s). Por favor elija otro horario.'
                    ) % (rec.space_id.name, overlapping.name, overlapping.date_start, overlapping.date_end))

    # Acciones de Flujo
    def action_submit_for_sinpe_approval(self):
        """El cliente envía el comprobante SINPE y pasa a revisión de gerencia"""
        self.ensure_one()
        if not self.sinpe_voucher and not self.sinpe_reference:
            raise UserError(_('Debe adjuntar el archivo de comprobante o indicar el número de referencia SINPE.'))
        self.write({
            'state': 'pending_sinpe',
            'sinpe_submitted_at': fields.Datetime.now()
        })
        self._send_manager_alert_email()

    def action_approve_sinpe(self):
        """Gerencia / Administración aprueba el comprobante y confirma la reserva"""
        self.ensure_one()
        self.write({
            'state': 'confirmed',
            'approved_by_id': self.env.user.id,
            'approval_date': fields.Datetime.now()
        })
        # Sincroniza con el calendario nativo de Odoo
        self._sync_calendar_event()
        # Genera la factura electrónica / venta
        self._create_invoice()
        # Envía correo de confirmación con pase QR al cliente
        self._send_confirmation_email()

    def action_reject_sinpe(self):
        """Gerencia rechaza el comprobante y cancela la reserva con notificación"""
        self.ensure_one()
        self.write({'state': 'cancelled'})
        template = self.env.ref('coworking_management.email_template_booking_rejected', raise_if_not_found=False)
        if template:
            template.send_mail(self.id, force_send=True)

    def action_reschedule(self, new_start, new_end):
        """Permite a administración o cliente cambiar fecha/hora sujeto a disponibilidad"""
        self.ensure_one()
        self.write({
            'date_start': new_start,
            'date_end': new_end,
            'state': 'rescheduled'
        })
        self._sync_calendar_event()
        self._send_confirmation_email()

    def _sync_calendar_event(self):
        """Crea o actualiza el evento en el calendario de Odoo"""
        for rec in self:
            calendar_vals = {
                'name': f"Reserva {rec.name}: {rec.space_id.name} - {rec.partner_id.name}",
                'start': rec.date_start,
                'stop': rec.date_end,
                'description': f"Cliente: {rec.partner_id.name}\nTeléfono: {rec.partner_phone}\nTotal: {rec.amount_total}",
            }
            if rec.calendar_event_id:
                rec.calendar_event_id.write(calendar_vals)
            else:
                event = self.env['calendar.event'].create(calendar_vals)
                rec.calendar_event_id = event.id

    def _create_invoice(self):
        """Genera el borrador o factura electrónica validada en account.move"""
        for rec in self:
            if not rec.invoice_id and rec.amount_total > 0:
                invoice_vals = {
                    'move_type': 'out_invoice',
                    'partner_id': rec.partner_id.id,
                    'invoice_date': fields.Date.today(),
                    'invoice_line_ids': [
                        (0, 0, {
                            'name': f"Reserva de Espacio: {rec.space_id.name} ({rec.booking_type})",
                            'quantity': 1,
                            'price_unit': rec.amount_space,
                        }),
                    ]
                }
                for addon in rec.addon_ids:
                    invoice_vals['invoice_line_ids'].append((0, 0, {
                        'name': f"Servicio Adicional: {addon.name}",
                        'quantity': 1,
                        'price_unit': addon.price,
                    }))
                invoice = self.env['account.move'].create(invoice_vals)
                rec.invoice_id = invoice.id

    def _send_confirmation_email(self):
        template = self.env.ref('coworking_management.email_template_booking_confirmed', raise_if_not_found=False)
        if template:
            template.send_mail(self.id, force_send=True)

    def _send_manager_alert_email(self):
        template = self.env.ref('coworking_management.email_template_sinpe_pending_alert', raise_if_not_found=False)
        if template:
            template.send_mail(self.id, force_send=True)
