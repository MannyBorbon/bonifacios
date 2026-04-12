# SoftRestaurant Database Schema

## Tablas y Columnas de SoftRestaurant

### 1. cheques (Tickets Cerrados/Pagados)
Tabla principal de ventas históricas.

- **folio** (El número del ticket)
- **fecha** (Fecha y hora de la venta)
- **total** (Total bruto de la cuenta)
- **subtotal** (Total antes de impuestos)
- **totalimpuesto1** (Impuestos / IVA)
- **propina** (Propina registrada en el sistema)
- **descuentoimporte** (Monto descontado)
- **idmesero** (ID del mesero)
- **mesa** (Número o nombre de la mesa)
- **nopersonas** (Cantidad de comensales)
- **pagado** (Estatus: 1 = cerrado/pagado, 0 = abierto)
- **efectivo** (Monto pagado en efectivo)
- **tarjeta** (Monto pagado con tarjeta)
- **vales** (Monto pagado con vales)
- **otros** (Monto pagado por transferencia u otros)

### 2. tempcheques (Mesas Abiertas / Tiempo Real)
Tabla idéntica a cheques, pero aloja solo las cuentas activas.

- **folio**
- **fecha**
- **total**
- **subtotal**
- **totalimpuesto1**
- **propina**
- **descuentoimporte**
- **idmesero**
- **mesa**
- **nopersonas**
- (Nota: Aquí no importan efectivo/tarjeta porque la cuenta aún no se cobra)

### 3. movtoscaja (Movimientos y Propinas)
Tabla para movimientos de caja y pagos de propinas.

- **folio** (ID único del movimiento)
- **foliomovto** (Folio secundario de control interno)
- **tipo** (Tipo de movimiento, ej. 1)
- **idturno** (ID del turno de la caja)
- **concepto** (Descripción, ej. "PAGO PROPINA A MESERO...")
- **referencia** (Notas, ej. folios de los tickets pagados)
- **importe** (Cantidad de dinero. Positivo = Entrada, Negativo = Salida)
- **fecha** (Fecha y hora exacta del movimiento)
- **cancelado** (0 = Válido, 1 = Cancelado)
- **usuariocancelo** (Usuario que lo anuló, si aplica)
- **pagodepropina** (1 = Es pago de propinas, 0 = Es otra cosa)
- **idempresa** (ID de tu sucursal)

### 4. cancelaciones (Tickets Anulados)
Para auditoría de cuentas que se mataron.

- **folio** (El ticket cancelado)
- **fecha** (Cuándo se canceló)
- **total** (Monto del ticket cancelado)
- **usuario** (Quién lo canceló)
- **motivo** (La justificación escrita)

### 5. mesas (Mapa del Restaurante)
Para saber la ocupación.

- **idmesa** (Nombre/ID de la mesa, ej. "Terraza 1")
- **personas** (Capacidad de sillas)
- **estatus_ocupacion** (1 = Ocupada, 0 = Libre)

### 6. registroasistencias (Reloj Checador)
Para el control de tu personal.

- **idempleado** (Número del trabajador)
- **entrada** (Fecha y hora en que registró su llegada)
- **salida** (Fecha y hora en que registró su salida; NULL si sigue en turno)

## Mapeo a Nuestra Base de Datos

### sr_sales (corresponde a cheques)
- sr_ticket_id = folio
- folio = folio
- sale_datetime = fecha
- total = total
- subtotal = subtotal
- tax = totalimpuesto1
- tip = propina
- discount = descuentoimporte
- employee_id = idmesero
- table_id = mesa
- covers = nopersonas
- status = pagado (1=closed, 0=open)
- cash_amount = efectivo
- card_amount = tarjeta
- voucher_amount = vales
- other_amount = otros

### sr_cash_movements (corresponde a movtoscaja)
- movement_id = folio
- folio_movto = foliomovto
- movement_type = tipo (mapear a withdrawal/deposit/tip_payment/other)
- shift_id = idturno
- concept = concepto
- reference = referencia
- amount = importe
- amount_signed = importe
- movement_datetime = fecha
- is_cancelled = cancelado
- user_cancel = usuariocancelo
- is_tip_payment = pagodepropina
- company_id = idempresa

### sr_cancellations (corresponde a cancelaciones)
- sr_ticket_id = folio
- cancel_date = fecha
- total = total
- user = usuario
- reason = motivo
