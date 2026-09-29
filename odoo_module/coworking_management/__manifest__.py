# -*- coding: utf-8 -*-
{
    'name': 'Gestión Integral de Coworking & Reserva de Espacios (Odoo 19)',
    'version': '19.0.1.1.0',
    'summary': 'Reserva web de oficinas y salas por horas/días/mes, calendarios por espacio, pagos directos, validación SINPE Móvil con SLA y portal de clientes.',
    'description': """
Módulo Integral de Coworking para Odoo 19
=========================================
Características clave:
* Catálogo web de oficinas, salas ejecutivas y cabinas acústicas.
* Calendario individual de disponibilidad por espacio en tiempo real.
* Reserva por horas, días o mensualidades.
* Flujo especializado para SINPE Móvil (Costa Rica) y confirmación manual de tarjeta/transferencia.
* Bandeja de validación de comprobantes SINPE con alerta de SLA (< 15-30 min).
* Generación automática de factura de cliente (borrador) con descuento de fidelidad.
* Token digital de acceso para check-in en recepción.
* Catálogo y formulario de reserva en el sitio web; API de reprogramación sujeta a disponibilidad.
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
        'account',
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
        'views/website_templates.xml',
        'views/coworking_menus.xml',
    ],
    'demo': [],
    'installable': True,
    'application': True,
    'auto_install': False,
}
