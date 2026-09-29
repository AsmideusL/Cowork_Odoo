# -*- coding: utf-8 -*-
{
    'name': 'Gestión Integral de Coworking & Reserva de Espacios (Odoo 19)',
    'version': '19.0.1.0.0',
    'summary': 'Reserva web de oficinas y salas por horas/días/mes, calendarios por espacio, pagos directos, validación SINPE Móvil con SLA y portal de clientes.',
    'description': """
Módulo Integral de Coworking para Odoo 19
=========================================
Características clave:
* Catálogo web de oficinas, salas ejecutivas y cabinas acústicas.
* Calendario individual de disponibilidad por espacio en tiempo real.
* Reserva por horas, días o mensualidades.
* Pasarela de pagos con tarjeta y flujo especializado para SINPE Móvil (Costa Rica).
* Bandeja de validación de comprobantes SINPE con alerta de SLA (< 15-30 min).
* Generación automática de factura electrónica y asientos contables.
* Pases digitales con Códigos QR para control de acceso y check-in en recepción.
* Portal de clientes para autogestión y reprogramación de reservas sujeta a disponibilidad.
* Informes gerenciales, gráficos de salas más solicitadas y métricas de fidelidad de clientes.
    """,
    'category': 'Sales/Coworking',
    'author': 'Flowing Rivers Technologies',
    'website': 'https://flowingrivers.com',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'web',
        'mail',
        'calendar',
        'website',
        'sale_management',
        'account',
        'payment',
    ],
    'data': [
        'security/security.xml',
        'security/ir.model.access.csv',
        'data/coworking_data.xml',
        'data/mail_template_data.xml',
        'views/coworking_space_views.xml',
        'views/coworking_booking_views.xml',
        'views/coworking_addon_views.xml',
        'views/res_partner_views.xml',
        'views/coworking_menus.xml',
    ],
    'demo': [],
    'installable': True,
    'application': True,
    'auto_install': False,
}
