# -*- coding: utf-8 -*-
import base64
from datetime import datetime
from urllib.parse import quote

import pytz

from odoo import http, fields, _
from odoo.exceptions import ValidationError, UserError
from odoo.http import request

DEFAULT_TZ = 'America/Costa_Rica'
MAX_VOUCHER_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_VOUCHER_EXT = ('.png', '.jpg', '.jpeg', '.webp', '.pdf')


def _user_tz():
    return pytz.timezone(request.env.user.tz or request.env.context.get('tz') or DEFAULT_TZ)


def _parse_local_datetime(value):
    """Convierte 'YYYY-MM-DDTHH:MM' (input datetime-local, hora local del cliente) a datetime UTC naive,
    que es como Odoo almacena los campos Datetime."""
    if not value:
        return None
    value = value.strip().replace('T', ' ')
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'):
        try:
            local_dt = datetime.strptime(value, fmt)
            break
        except ValueError:
            continue
    else:
        return None
    return _user_tz().localize(local_dt).astimezone(pytz.UTC).replace(tzinfo=None)


class CoworkingWebsiteController(http.Controller):

    # ------------------------------------------------------------------
    # Páginas públicas
    # ------------------------------------------------------------------
    @http.route(['/coworking', '/coworking/spaces'], type='http', auth='public', website=True, sitemap=True)
    def coworking_catalog(self, **kw):
        """Catálogo de espacios en el sitio web de Odoo"""
        spaces = request.env['coworking.space'].sudo().search([('active', '=', True), ('state', '!=', 'maintenance')])
        return request.render('coworking_management.website_spaces_catalog', {
            'spaces': spaces,
            'page_name': 'coworking_catalog',
        })

    @http.route('/coworking/book/<int:space_id>', type='http', auth='user', website=True)
    def coworking_booking_form(self, space_id, **kw):
        """Formulario de reserva de un espacio (requiere inicio de sesión: cliente/portal)"""
        space = request.env['coworking.space'].sudo().browse(space_id).exists()
        if not space or not space.active:
            return request.not_found()
        return request.render('coworking_management.website_booking_form', {
            'space': space,
            'addons': space.addon_ids.filtered('active'),
            'error': kw.get('error'),
            'page_name': 'coworking_booking',
        })

    # ------------------------------------------------------------------
    # API de disponibilidad
    # ------------------------------------------------------------------
    @http.route('/coworking/api/check_availability', type='jsonrpc', auth='public', methods=['POST'])
    def check_availability(self, space_id, date_start, date_end):
        """Verifica disponibilidad de sala en tiempo real (fechas en hora local del usuario)."""
        start = _parse_local_datetime(date_start)
        end = _parse_local_datetime(date_end)
        if not start or not end or end <= start:
            return {'available': False, 'message': _('Rango de fechas inválido.')}
        try:
            space_id = int(space_id)
        except (TypeError, ValueError):
            return {'available': False, 'message': _('Espacio inválido.')}
        overlapping = request.env['coworking.booking']._find_overlapping(space_id, start, end)
        if overlapping:
            # No se exponen datos de otros clientes; solo el rango ocupado.
            return {'available': False, 'message': _('El espacio no se encuentra disponible en este horario.')}
        return {'available': True, 'message': _('Espacio disponible.')}

    # ------------------------------------------------------------------
    # Envío de reserva
    # ------------------------------------------------------------------
    @http.route('/coworking/book/submit', type='http', auth='user', methods=['POST'], website=True, csrf=True)
    def submit_booking(self, **post):
        """Procesa la reserva y el comprobante SINPE enviado desde la web"""
        partner = request.env.user.partner_id
        try:
            space_id = int(post.get('space_id') or 0)
        except ValueError:
            return request.not_found()
        space = request.env['coworking.space'].sudo().browse(space_id).exists()
        if not space:
            return request.not_found()

        def back(msg):
            return request.redirect(f'/coworking/book/{space.id}?error={quote(str(msg))}')

        date_start = _parse_local_datetime(post.get('date_start'))
        date_end = _parse_local_datetime(post.get('date_end'))
        if not date_start or not date_end or date_end <= date_start:
            return back(_('Indique un horario válido (el fin debe ser posterior al inicio).'))

        booking_type = post.get('booking_type') if post.get('booking_type') in ('hour', 'day', 'month') else 'hour'
        payment_method = post.get('payment_method') if post.get('payment_method') in ('sinpe', 'card', 'transfer') else 'sinpe'
        try:
            attendees = max(1, int(post.get('attendees') or 1))
        except ValueError:
            attendees = 1
        addon_ids = [int(a) for a in request.httprequest.form.getlist('addon_ids') if str(a).isdigit()]
        addon_ids = space.addon_ids.filtered(lambda a: a.id in addon_ids).ids  # solo add-ons del espacio

        sinpe_ref = (post.get('sinpe_reference') or '').strip()
        voucher_file = post.get('sinpe_voucher')
        voucher_binary = False
        voucher_filename = False
        if voucher_file and getattr(voucher_file, 'filename', None):
            content = voucher_file.read()
            if len(content) > MAX_VOUCHER_BYTES:
                return back(_('El comprobante supera 5 MB.'))
            if not voucher_file.filename.lower().endswith(ALLOWED_VOUCHER_EXT):
                return back(_('Formato de comprobante no permitido (use imagen o PDF).'))
            voucher_binary = base64.b64encode(content)
            voucher_filename = voucher_file.filename

        if payment_method == 'sinpe' and not (sinpe_ref or voucher_binary):
            return back(_('Indique la referencia SINPE o adjunte el comprobante.'))

        is_sinpe = payment_method == 'sinpe'
        booking_vals = {
            'partner_id': partner.id,
            'space_id': space.id,
            'booking_type': booking_type,
            'date_start': date_start,
            'date_end': date_end,
            'attendees': attendees,
            'addon_ids': [(6, 0, addon_ids)],
            'payment_method': payment_method,
            'sinpe_reference': sinpe_ref or False,
            'sinpe_voucher': voucher_binary,
            'sinpe_voucher_filename': voucher_filename,
            # Tarjeta/transferencia quedan en borrador hasta que el pago se verifique
            # (no se confirma nada sin cobro real; ver README: integración de pasarela).
            'state': 'pending_sinpe' if is_sinpe else 'draft',
            'sinpe_submitted_at': fields.Datetime.now() if is_sinpe else False,
        }

        try:
            booking = request.env['coworking.booking'].sudo().create(booking_vals)
        except (ValidationError, UserError) as e:
            return back(str(e.args[0] if e.args else e))

        if is_sinpe:
            booking._send_manager_alert_email()

        return request.redirect(f'/coworking/booking/success/{booking.id}?token={booking.qr_code_token}')

    @http.route('/coworking/booking/success/<int:booking_id>', type='http', auth='user', website=True)
    def booking_success(self, booking_id, token=None, **kw):
        booking = request.env['coworking.booking'].sudo().browse(booking_id).exists()
        if not booking or booking.partner_id != request.env.user.partner_id or booking.qr_code_token != token:
            return request.not_found()
        return request.render('coworking_management.website_booking_success', {
            'booking': booking,
            'tz': str(_user_tz()),
            'page_name': 'coworking_success',
        })

    # ------------------------------------------------------------------
    # Reprogramación
    # ------------------------------------------------------------------
    @http.route('/coworking/booking/reschedule', type='jsonrpc', auth='user', methods=['POST'])
    def reschedule_booking(self, booking_id, new_start, new_end):
        """Permite al cliente autenticado reprogramar su reserva sujeta a disponibilidad.
        new_start / new_end en hora local del usuario ('YYYY-MM-DD HH:MM')."""
        user = request.env.user
        booking = request.env['coworking.booking'].sudo().browse(int(booking_id)).exists()
        if not booking:
            return {'success': False, 'message': _('Reserva no encontrada.')}
        if booking.partner_id != user.partner_id and not user.has_group('coworking_management.group_coworking_manager'):
            return {'success': False, 'message': _('No tiene permisos para modificar esta reserva.')}

        start = _parse_local_datetime(new_start)
        end = _parse_local_datetime(new_end)
        if not start or not end or end <= start:
            return {'success': False, 'message': _('El nuevo horario no es válido.')}
        if booking._find_overlapping(booking.space_id.id, start, end, exclude_ids=[booking.id]):
            return {'success': False, 'message': _('El nuevo horario solicitado no está disponible.')}
        try:
            booking.action_reschedule(start, end)
        except (ValidationError, UserError) as e:
            return {'success': False, 'message': str(e.args[0] if e.args else e)}
        return {'success': True, 'message': _('Reserva reprogramada exitosamente.')}
