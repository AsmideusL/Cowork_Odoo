# -*- coding: utf-8 -*-
from odoo import http, fields, _
from odoo.http import request
import base64
import json

class CoworkingWebsiteController(http.Controller):

    @http.route(['/coworking', '/coworking/spaces'], type='http', auth='public', website=True)
    def coworking_catalog(self, **kw):
        """Página principal de catálogo de espacios en el sitio web de Odoo"""
        spaces = request.env['coworking.space'].sudo().search([('active', '=', True)])
        addons = request.env['coworking.addon'].sudo().search([('active', '=', True)])
        values = {
            'spaces': spaces,
            'addons': addons,
            'page_name': 'coworking_catalog'
        }
        return request.render('website.page_404' if not spaces else 'coworking_management.website_spaces_catalog', values)

    @http.route('/coworking/api/check_availability', type='json', auth='public', methods=['POST'], csrf=False)
    def check_availability(self, space_id, date_start, date_end):
        """API para verificar disponibilidad de sala en tiempo real evitando double-booking"""
        try:
            overlapping = request.env['coworking.booking'].sudo().search([
                ('space_id', '=', int(space_id)),
                ('state', 'in', ['pending_sinpe', 'confirmed', 'rescheduled']),
                ('date_start', '<', date_end),
                ('date_end', '>', date_start),
            ], limit=1)

            if overlapping:
                return {
                    'available': False,
                    'message': _('El espacio no se encuentra disponible en este horario.'),
                    'overlapping_id': overlapping.name
                }
            return {'available': True, 'message': _('Espacio disponible.')}
        except Exception as e:
            return {'available': False, 'error': str(e)}

    @http.route('/coworking/book/submit', type='http', auth='user', methods=['POST'], website=True, csrf=True)
    def submit_booking(self, **post):
        """Procesa la reserva y comprobante SINPE enviado desde la web"""
        user = request.env.user
        partner = user.partner_id

        space_id = int(post.get('space_id'))
        date_start = post.get('date_start')
        date_end = post.get('date_end')
        booking_type = post.get('booking_type', 'hour')
        payment_method = post.get('payment_method', 'sinpe')
        sinpe_ref = post.get('sinpe_reference')

        # Archivo de comprobante adjunto
        voucher_file = post.get('sinpe_voucher')
        voucher_binary = False
        voucher_filename = False
        if voucher_file:
            voucher_binary = base64.b64encode(voucher_file.read())
            voucher_filename = voucher_file.filename

        booking_vals = {
            'partner_id': partner.id,
            'space_id': space_id,
            'booking_type': booking_type,
            'date_start': date_start,
            'date_end': date_end,
            'payment_method': payment_method,
            'sinpe_reference': sinpe_ref,
            'sinpe_voucher': voucher_binary,
            'sinpe_voucher_filename': voucher_filename,
            'state': 'pending_sinpe' if payment_method == 'sinpe' else 'confirmed',
            'sinpe_submitted_at': fields.Datetime.now() if payment_method == 'sinpe' else False
        }

        booking = request.env['coworking.booking'].sudo().create(booking_vals)

        if payment_method == 'card':
            booking.action_approve_sinpe() # Auto confirmation for card payments
        else:
            booking._send_manager_alert_email()

        return request.redirect(f'/coworking/booking/success/{booking.id}')

    @http.route('/coworking/booking/reschedule', type='json', auth='user', methods=['POST'])
    def reschedule_booking(self, booking_id, new_start, new_end):
        """Permite al cliente autenticado reprogramar su reserva sujeta a disponibilidad"""
        booking = request.env['coworking.booking'].sudo().browse(int(booking_id))
        if booking.partner_id.id != request.env.user.partner_id.id and not request.env.user.has_group('coworking_management.group_coworking_manager'):
            return {'success': False, 'message': _('No tiene permisos para modificar esta reserva.')}

        # Check availability
        overlapping = request.env['coworking.booking'].sudo().search([
            ('id', '!=', booking.id),
            ('space_id', '=', booking.space_id.id),
            ('state', 'in', ['pending_sinpe', 'confirmed', 'rescheduled']),
            ('date_start', '<', new_end),
            ('date_end', '>', new_start),
        ], limit=1)

        if overlapping:
            return {'success': False, 'message': _('El nuevo horario solicitado no está disponible.')}

        booking.action_reschedule(new_start, new_end)
        return {'success': True, 'message': _('Reserva reprogramada exitosamente.')}
