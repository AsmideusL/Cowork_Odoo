# -*- coding: utf-8 -*-
from odoo import models, fields

class CoworkingAddon(models.Model):
    _name = 'coworking.addon'
    _description = 'Servicio Adicional / Upselling'
    _order = 'name asc'

    name = fields.Char(string='Nombre del Servicio', required=True)
    icon = fields.Char(string='Icono / Emoji', default='☕')
    currency_id = fields.Many2one(
        'res.currency', string='Moneda', 
        default=lambda self: self.env.company.currency_id.id
    )
    price = fields.Monetary(string='Precio Unitario', currency_field='currency_id', required=True)
    billing_unit = fields.Selection([
        ('per_person', 'Por persona'),
        ('per_session', 'Por sesión/reserva'),
        ('per_day', 'Por día'),
        ('per_pack', 'Por paquete')
    ], string='Unidad de Cobro', default='per_session', required=True)

    description = fields.Text(string='Detalle')
    active = fields.Boolean(default=True)
