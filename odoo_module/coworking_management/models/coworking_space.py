# -*- coding: utf-8 -*-
from odoo import models, fields, api

class CoworkingSpace(models.Model):
    _name = 'coworking.space'
    _description = 'Espacio u Oficina de Coworking'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name asc'

    name = fields.Char(string='Nombre del Espacio', required=True, tracking=True)
    code = fields.Char(string='Código de Sala', copy=False)
    space_type = fields.Selection([
        ('meeting', 'Sala de Juntas Ejecutiva'),
        ('private', 'Oficina Privada'),
        ('pod', 'Cabina Acústica'),
        ('coworking', 'Puesto Compartido (Hot Desk)'),
        ('workshop', 'Taller / Laboratorio Creativo')
    ], string='Tipo de Espacio', required=True, default='meeting', tracking=True)

    capacity = fields.Integer(string='Capacidad (Personas)', default=1, required=True)
    floor_location = fields.Char(string='Ubicación / Piso', default='Piso 4')
    
    currency_id = fields.Many2one(
        'res.currency', string='Moneda', 
        default=lambda self: self.env.company.currency_id.id
    )
    price_hour = fields.Monetary(string='Tarifa por Hora', currency_field='currency_id', required=True)
    price_day = fields.Monetary(string='Tarifa por Día', currency_field='currency_id', required=True)
    price_month = fields.Monetary(string='Tarifa Mensual', currency_field='currency_id', required=True)

    state = fields.Selection([
        ('available', 'Disponible'),
        ('occupied', 'En Uso / Ocupado'),
        ('maintenance', 'En Mantenimiento')
    ], string='Estado Operativo', default='available', tracking=True)

    image_1920 = fields.Image(string='Fotografía del Espacio', max_width=1920, max_height=1920)
    description = fields.Text(string='Descripción y Equipamiento')
    active = fields.Boolean(default=True)

    addon_ids = fields.Many2many('coworking.addon', string='Servicios Disponibles')
    booking_ids = fields.One2many('coworking.booking', 'space_id', string='Historial de Reservas')
    
    booking_count = fields.Integer(string='Total de Reservas', compute='_compute_booking_metrics')
    total_revenue = fields.Monetary(string='Ingresos Acumulados', currency_field='currency_id', compute='_compute_booking_metrics')

    @api.depends('booking_ids.state', 'booking_ids.amount_total')
    def _compute_booking_metrics(self):
        for rec in self:
            confirmed_bookings = rec.booking_ids.filtered(lambda b: b.state in ('confirmed', 'done', 'rescheduled'))
            rec.booking_count = len(confirmed_bookings)
            rec.total_revenue = sum(confirmed_bookings.mapped('amount_total'))

    def action_view_space_calendar(self):
        """Abre la vista de calendario dedicada únicamente a este espacio u oficina"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Calendario: {self.name}',
            'res_model': 'coworking.booking',
            'view_mode': 'calendar,list,form',
            'domain': [('space_id', '=', self.id)],
            'context': {
                'default_space_id': self.id,
                'search_default_space_id': self.id,
            },
        }
