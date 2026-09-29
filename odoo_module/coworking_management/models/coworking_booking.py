# -*- coding: utf-8 -*-
import math
import uuid
from datetime import timedelta

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError

# Umbrales del SLA de validación SINPE (minutos). Deben coincidir con el demo web.
SLA_WARNING_MINUTES = 15
SLA_DEADLINE_MINUTES = 30

ACTIVE_STATES = ('pending_sinpe', 'confirmed', 'rescheduled')


class CoworkingBooking(models.Model):
    _name = 'coworking.booking'
    _description = 'Reserva de Espacio de Coworking'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_start desc, id desc'

    name = fields.Char(string='Código de Reserva', required=True, copy=False, readonly=True, default=lambda self: _('Nuevo'))
    company_id = fields.Many2one(
        'res.company', string='Compañía', required=True, index=True,
        default=lambda self: self.env.company
    )

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
    attendees = fields.Integer(string='Número de Asistentes', default=1, required=True)

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
    reject_reason = fields.Text(string='Motivo de Rechazo', tracking=True)

    # SLA de Aprobación (se refresca con el cron "Coworking: Actualizar SLA SINPE")
    sla_deadline = fields.Datetime(string='Fecha Límite SLA', compute='_compute_sla', store=True)
    sla_status = fields.Selection([
        ('on_time', 'En Tiempo (< 15m)'),
        ('warning', 'Alerta (15-30m)'),
        ('breached', 'SLA Vencido (> 30m)')
    ], string='Estado de SLA', compute='_compute_sla', store=True)
    approved_by_id = fields.Many2one('res.users', string='Aprobado por', readonly=True)
    approval_date = fields.Datetime(string='Fecha de Aprobación', readonly=True)

    # Estado del Flujo
    state = fields.Selection([
        ('draft', 'Borrador / Pago Pendiente'),
        ('pending_sinpe', 'Pendiente Validación SINPE'),
        ('confirmed', 'Confirmada & Pagada'),
        ('rescheduled', 'Reprogramada'),
        ('done', 'Finalizada'),
        ('cancelled', 'Cancelada')
    ], string='Estado', default='draft', tracking=True)

    # Integración con Calendario & Facturación
    calendar_event_id = fields.Many2one('calendar.event', string='Evento en Calendario Odoo', readonly=True, copy=False)
    invoice_id = fields.Many2one('account.move', string='Factura Electrónica', readonly=True, copy=False)
    qr_code_token = fields.Char(string='Token Código QR de Acceso', copy=False, readonly=True)

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------
    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('Nuevo')) == _('Nuevo'):
                vals['name'] = self.env['ir.sequence'].next_by_code('coworking.booking') or _('COW-RESERVA')
            if not vals.get('qr_code_token'):
                # Token no adivinable: el código de reserva + un sufijo aleatorio
                vals['qr_code_token'] = f"NX-{vals.get('name')}-{uuid.uuid4().hex[:10].upper()}"
        return super().create(vals_list)

    # ------------------------------------------------------------------
    # Cómputos
    # ------------------------------------------------------------------
    @api.depends('date_start', 'date_end')
    def _compute_duration(self):
        for rec in self:
            if rec.date_start and rec.date_end and rec.date_end > rec.date_start:
                delta = rec.date_end - rec.date_start
                rec.duration_hours = max(0.5, delta.total_seconds() / 3600.0)
            else:
                rec.duration_hours = 0.0

    def _get_billable_days(self):
        """Número de jornadas cubiertas por la reserva (mínimo 1)."""
        self.ensure_one()
        if not self.date_start or not self.date_end:
            return 1
        return max(1, math.ceil(self.duration_hours / 24.0))

    def _get_billable_months(self):
        """Número de meses (de 30 días) cubiertos por la reserva (mínimo 1)."""
        self.ensure_one()
        return max(1, math.ceil(self.duration_hours / (24.0 * 30)))

    def _get_addon_quantity(self, addon):
        """Cantidad a cobrar de un servicio adicional según su unidad de cobro."""
        self.ensure_one()
        if addon.billing_unit == 'per_person':
            return max(1, self.attendees or 1)
        if addon.billing_unit == 'per_day':
            return self._get_billable_days()
        return 1  # per_session / per_pack

    @api.depends('booking_type', 'duration_hours', 'space_id', 'space_id.price_hour',
                 'space_id.price_day', 'space_id.price_month', 'addon_ids', 'addon_ids.price',
                 'addon_ids.billing_unit', 'attendees', 'partner_id.coworking_loyalty_tier')
    def _compute_amounts(self):
        for rec in self:
            space_price = 0.0
            if rec.space_id:
                if rec.booking_type == 'hour':
                    space_price = rec.space_id.price_hour * rec.duration_hours
                elif rec.booking_type == 'day':
                    space_price = rec.space_id.price_day * rec._get_billable_days()
                else:  # month
                    space_price = rec.space_id.price_month * rec._get_billable_months()

            addons_price = sum(a.price * rec._get_addon_quantity(a) for a in rec.addon_ids)
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
                rec.sla_deadline = rec.sinpe_submitted_at + timedelta(minutes=SLA_DEADLINE_MINUTES)
                diff_minutes = (now - rec.sinpe_submitted_at).total_seconds() / 60.0
                if diff_minutes <= SLA_WARNING_MINUTES:
                    rec.sla_status = 'on_time'
                elif diff_minutes <= SLA_DEADLINE_MINUTES:
                    rec.sla_status = 'warning'
                else:
                    rec.sla_status = 'breached'
            else:
                rec.sla_deadline = False
                rec.sla_status = 'on_time'

    @api.model
    def _cron_refresh_sla(self):
        """Recalcula el semáforo del SLA de las reservas SINPE pendientes.
        El campo es almacenado (para poder filtrar/agrupar), por lo que necesita refresco periódico."""
        pending = self.search([('state', '=', 'pending_sinpe')])
        pending._compute_sla()

    # ------------------------------------------------------------------
    # Validaciones
    # ------------------------------------------------------------------
    @api.constrains('date_start', 'date_end')
    def _check_dates(self):
        for rec in self:
            if rec.date_start and rec.date_end and rec.date_end <= rec.date_start:
                raise ValidationError(_('La fecha/hora de fin debe ser posterior a la de inicio.'))

    @api.constrains('attendees', 'space_id')
    def _check_attendees(self):
        for rec in self:
            if rec.attendees < 1:
                raise ValidationError(_('Debe indicar al menos 1 asistente.'))
            if rec.space_id and rec.space_id.capacity and rec.attendees > rec.space_id.capacity:
                raise ValidationError(_(
                    'El espacio "%(space)s" admite máximo %(cap)s personas.',
                    space=rec.space_id.name, cap=rec.space_id.capacity))

    @api.model
    def _find_overlapping(self, space_id, date_start, date_end, exclude_ids=None):
        """Devuelve la primera reserva activa que se solapa con el rango indicado."""
        domain = [
            ('space_id', '=', space_id),
            ('state', 'in', list(ACTIVE_STATES)),
            ('date_start', '<', date_end),
            ('date_end', '>', date_start),
        ]
        if exclude_ids:
            domain.append(('id', 'not in', list(exclude_ids)))
        return self.sudo().search(domain, limit=1)

    # Validación de no solapamiento (Evita Double-Booking)
    @api.constrains('space_id', 'date_start', 'date_end', 'state')
    def _check_space_availability(self):
        for rec in self:
            if rec.state in ACTIVE_STATES:
                overlapping = self._find_overlapping(rec.space_id.id, rec.date_start, rec.date_end, exclude_ids=[rec.id])
                if overlapping:
                    raise ValidationError(_(
                        'El espacio "%(space)s" ya cuenta con una reserva activa en ese rango de horario '
                        '(Reserva %(ref)s: desde %(start)s hasta %(end)s). Por favor elija otro horario.',
                        space=rec.space_id.name, ref=overlapping.name,
                        start=overlapping.date_start, end=overlapping.date_end))

    # ------------------------------------------------------------------
    # Acciones de Flujo
    # ------------------------------------------------------------------
    def action_submit_for_sinpe_approval(self):
        """El cliente envía el comprobante SINPE y pasa a revisión de gerencia"""
        self.ensure_one()
        if self.state != 'draft' or self.payment_method != 'sinpe':
            raise UserError(_('Solo se pueden enviar a revisión reservas en borrador con pago SINPE.'))
        if not self.sinpe_voucher and not self.sinpe_reference:
            raise UserError(_('Debe adjuntar el archivo de comprobante o indicar el número de referencia SINPE.'))
        self.write({
            'state': 'pending_sinpe',
            'sinpe_submitted_at': fields.Datetime.now()
        })
        self._send_manager_alert_email()

    def _confirm_paid_booking(self):
        """Confirma la reserva como pagada: calendario, factura y correo con pase QR."""
        self.ensure_one()
        self.write({
            'state': 'confirmed',
            'approved_by_id': self.env.user.id,
            'approval_date': fields.Datetime.now()
        })
        self._sync_calendar_event()
        self._create_invoice()
        self._send_confirmation_email()

    def action_approve_sinpe(self):
        """Gerencia / Administración aprueba el comprobante SINPE y confirma la reserva"""
        self.ensure_one()
        if self.state != 'pending_sinpe':
            raise UserError(_('Solo se pueden aprobar reservas pendientes de validación SINPE.'))
        self._confirm_paid_booking()

    def action_confirm_payment(self):
        """Gerencia confirma manualmente un pago con tarjeta o transferencia ya verificado."""
        self.ensure_one()
        if self.state != 'draft' or self.payment_method == 'sinpe':
            raise UserError(_('Esta acción aplica a reservas en borrador pagadas con tarjeta o transferencia.'))
        self._confirm_paid_booking()

    def action_reject_sinpe(self):
        """Gerencia rechaza el comprobante y cancela la reserva con notificación"""
        self.ensure_one()
        if self.state != 'pending_sinpe':
            raise UserError(_('Solo se pueden rechazar reservas pendientes de validación SINPE.'))
        self.write({'state': 'cancelled'})
        template = self.env.ref('coworking_management.email_template_booking_rejected', raise_if_not_found=False)
        if template:
            template.send_mail(self.id, force_send=True)

    def action_cancel(self):
        for rec in self:
            if rec.state in ('done', 'cancelled'):
                continue
            rec.write({'state': 'cancelled'})
            if rec.calendar_event_id:
                rec.calendar_event_id.sudo().unlink()

    def action_reschedule(self, new_start, new_end):
        """Permite a administración o cliente cambiar fecha/hora sujeto a disponibilidad"""
        self.ensure_one()
        if self.state not in ('confirmed', 'rescheduled', 'pending_sinpe'):
            raise UserError(_('Solo se pueden reprogramar reservas activas.'))
        new_start = fields.Datetime.to_datetime(new_start)
        new_end = fields.Datetime.to_datetime(new_end)
        if not new_start or not new_end or new_end <= new_start:
            raise UserError(_('El nuevo horario no es válido.'))
        new_state = 'pending_sinpe' if self.state == 'pending_sinpe' else 'rescheduled'
        self.write({
            'date_start': new_start,
            'date_end': new_end,
            'state': new_state,
        })
        if new_state == 'rescheduled':
            self._sync_calendar_event()
            self._send_confirmation_email()

    def action_view_invoice(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Factura'),
            'res_model': 'account.move',
            'view_mode': 'form',
            'res_id': self.invoice_id.id,
        }

    # ------------------------------------------------------------------
    # Integraciones
    # ------------------------------------------------------------------
    def _sync_calendar_event(self):
        """Crea o actualiza el evento en el calendario de Odoo"""
        for rec in self:
            calendar_vals = {
                'name': f"Reserva {rec.name}: {rec.space_id.name} - {rec.partner_id.name}",
                'start': rec.date_start,
                'stop': rec.date_end,
                'allday': False,
                'description': f"Cliente: {rec.partner_id.name}\nTeléfono: {rec.partner_phone or ''}\nTotal: {rec.amount_total}",
            }
            if rec.calendar_event_id:
                rec.calendar_event_id.sudo().write(calendar_vals)
            else:
                event = self.env['calendar.event'].sudo().create(calendar_vals)
                rec.calendar_event_id = event.id

    def _create_invoice(self):
        """Genera la factura de cliente (borrador) en account.move, con el descuento de fidelidad aplicado."""
        for rec in self:
            if rec.invoice_id or rec.amount_total <= 0:
                continue
            discount_pct = (rec.partner_id.coworking_discount_rate or 0.0) * 100.0
            type_label = dict(self._fields['booking_type'].selection).get(rec.booking_type)
            lines = [(0, 0, {
                'name': f"Reserva de Espacio: {rec.space_id.name} ({type_label}) - {rec.name}",
                'quantity': 1,
                'price_unit': rec.amount_space,
                'discount': discount_pct,
            })]
            for addon in rec.addon_ids:
                lines.append((0, 0, {
                    'name': f"Servicio Adicional: {addon.name}",
                    'quantity': rec._get_addon_quantity(addon),
                    'price_unit': addon.price,
                    'discount': discount_pct,
                }))
            invoice = self.env['account.move'].sudo().with_company(rec.company_id).create({
                'move_type': 'out_invoice',
                'partner_id': rec.partner_id.id,
                'currency_id': rec.currency_id.id,
                'invoice_date': fields.Date.context_today(rec),
                'invoice_origin': rec.name,
                'invoice_line_ids': lines,
            })
            rec.invoice_id = invoice.id

    def _send_confirmation_email(self):
        template = self.env.ref('coworking_management.email_template_booking_confirmed', raise_if_not_found=False)
        if template:
            for rec in self:
                template.send_mail(rec.id, force_send=True)

    def _send_manager_alert_email(self):
        template = self.env.ref('coworking_management.email_template_sinpe_pending_alert', raise_if_not_found=False)
        if template:
            for rec in self:
                template.send_mail(rec.id, force_send=True)
