# -*- coding: utf-8 -*-
from odoo import models, fields, api

class ResPartner(models.Model):
    _inherit = 'res.partner'

    identification_number = fields.Char(string='Cédula / Identificación Oficial')
    emergency_contact = fields.Char(string='Contacto de Emergencia')
    
    coworking_loyalty_tier = fields.Selection([
        ('standard', 'Estándar'),
        ('silver', 'Plata (5% Descuento)'),
        ('gold', 'Oro (10% Descuento)'),
        ('platinum', 'Platino VIP (15% Descuento)')
    ], string='Nivel de Fidelidad Coworking', default='standard', tracking=True)

    coworking_discount_rate = fields.Float(string='% Descuento', compute='_compute_discount_rate')
    coworking_total_hours = fields.Float(string='Horas Acumuladas Reservadas', compute='_compute_coworking_stats')
    coworking_booking_ids = fields.One2many('coworking.booking', 'partner_id', string='Reservas Coworking')

    @api.depends('coworking_loyalty_tier')
    def _compute_discount_rate(self):
        tier_map = {
            'standard': 0.0,
            'silver': 0.05,
            'gold': 0.10,
            'platinum': 0.15
        }
        for partner in self:
            partner.coworking_discount_rate = tier_map.get(partner.coworking_loyalty_tier, 0.0)

    @api.depends('coworking_booking_ids.state', 'coworking_booking_ids.duration_hours')
    def _compute_coworking_stats(self):
        for partner in self:
            confirmed = partner.coworking_booking_ids.filtered(lambda b: b.state in ('confirmed', 'done', 'rescheduled'))
            partner.coworking_total_hours = sum(confirmed.mapped('duration_hours'))
