# Esquema de SoftRestaurant

- Servidor: `100.84.227.35\NATIONALSOFT`
- Base de datos: `softrestaurant8pro`
- Generado: `2026-05-04 11:15:06`
- Total de tablas: `210`
- Total de columnas: `3179`

## Tablas

- [dbo.actualizaciones](#dbo-actualizaciones)
- [dbo.almacen](#dbo-almacen)
- [dbo.areas](#dbo-areas)
- [dbo.areasdetalle](#dbo-areasdetalle)
- [dbo.areasrestaurant](#dbo-areasrestaurant)
- [dbo.areasrestaurantdetalle](#dbo-areasrestaurantdetalle)
- [dbo.azbar_log](#dbo-azbar-log)
- [dbo.bancos](#dbo-bancos)
- [dbo.bitacoraEnvioVentas](#dbo-bitacoraenvioventas)
- [dbo.bitacorafiscal](#dbo-bitacorafiscal)
- [dbo.bitacorasistema](#dbo-bitacorasistema)
- [dbo.bitacoratarjetacredito](#dbo-bitacoratarjetacredito)
- [dbo.bitacoratransacciones](#dbo-bitacoratransacciones)
- [dbo.cancela](#dbo-cancela)
- [dbo.cheqdet](#dbo-cheqdet)
- [dbo.cheqdetf](#dbo-cheqdetf)
- [dbo.cheqdetfeliminados](#dbo-cheqdetfeliminados)
- [dbo.cheqpedidos](#dbo-cheqpedidos)
- [dbo.cheques](#dbo-cheques)
- [dbo.chequesf](#dbo-chequesf)
- [dbo.chequespagos](#dbo-chequespagos)
- [dbo.chequespagosf](#dbo-chequespagosf)
- [dbo.clientes](#dbo-clientes)
- [dbo.clientestitularsecundario](#dbo-clientestitularsecundario)
- [dbo.codigosdeserviciocfdi](#dbo-codigosdeserviciocfdi)
- [dbo.colonias](#dbo-colonias)
- [dbo.comandas](#dbo-comandas)
- [dbo.comandosimpresion](#dbo-comandosimpresion)
- [dbo.comentarios](#dbo-comentarios)
- [dbo.comisionistas](#dbo-comisionistas)
- [dbo.compras](#dbo-compras)
- [dbo.comprasmovtos](#dbo-comprasmovtos)
- [dbo.conceptos](#dbo-conceptos)
- [dbo.configuracion](#dbo-configuracion)
- [dbo.configuracion_kds](#dbo-configuracion-kds)
- [dbo.configuracion_ws](#dbo-configuracion-ws)
- [dbo.consumodiarioinsumos](#dbo-consumodiarioinsumos)
- [dbo.cortesiasmonedero](#dbo-cortesiasmonedero)
- [dbo.cortesiasmonederodetalle](#dbo-cortesiasmonederodetalle)
- [dbo.cortesiasmonederotarjetas](#dbo-cortesiasmonederotarjetas)
- [dbo.costos](#dbo-costos)
- [dbo.cuentas](#dbo-cuentas)
- [dbo.cuentas_procesar](#dbo-cuentas-procesar)
- [dbo.cuentascontables](#dbo-cuentascontables)
- [dbo.cuentaspagos](#dbo-cuentaspagos)
- [dbo.cuentasporcobrar](#dbo-cuentasporcobrar)
- [dbo.cuentasporcobrarpagos](#dbo-cuentasporcobrarpagos)
- [dbo.deptosventa](#dbo-deptosventa)
- [dbo.deptosventagrupos](#dbo-deptosventagrupos)
- [dbo.deptosventagruposinsumos](#dbo-deptosventagruposinsumos)
- [dbo.destinatarioantifraude](#dbo-destinatarioantifraude)
- [dbo.destinatariocorte](#dbo-destinatariocorte)
- [dbo.destinatarioscorreo](#dbo-destinatarioscorreo)
- [dbo.detallescuentas](#dbo-detallescuentas)
- [dbo.direccionesdomicilio](#dbo-direccionesdomicilio)
- [dbo.elaborados](#dbo-elaborados)
- [dbo.empresa_proveedor](#dbo-empresa-proveedor)
- [dbo.empresas](#dbo-empresas)
- [dbo.empresas_regalias_config](#dbo-empresas-regalias-config)
- [dbo.empresasvi](#dbo-empresasvi)
- [dbo.empresasvp](#dbo-empresasvp)
- [dbo.encuestas](#dbo-encuestas)
- [dbo.estaciones](#dbo-estaciones)
- [dbo.estacionesalmacen](#dbo-estacionesalmacen)
- [dbo.estacionesareas](#dbo-estacionesareas)
- [dbo.estados](#dbo-estados)
- [dbo.etiquetaslenguaje](#dbo-etiquetaslenguaje)
- [dbo.facturas](#dbo-facturas)
- [dbo.facturascfdipendientesregistrar](#dbo-facturascfdipendientesregistrar)
- [dbo.facturasmovtos](#dbo-facturasmovtos)
- [dbo.folios](#dbo-folios)
- [dbo.foliosalmacen](#dbo-foliosalmacen)
- [dbo.foliosfacturados](#dbo-foliosfacturados)
- [dbo.foliosfacturas](#dbo-foliosfacturas)
- [dbo.formasdepago](#dbo-formasdepago)
- [dbo.formatofacturas](#dbo-formatofacturas)
- [dbo.formatos](#dbo-formatos)
- [dbo.formatosvarios](#dbo-formatosvarios)
- [dbo.gastos](#dbo-gastos)
- [dbo.gastosmovtos](#dbo-gastosmovtos)
- [dbo.grupoformasdepago](#dbo-grupoformasdepago)
- [dbo.grupoformasdepagodet](#dbo-grupoformasdepagodet)
- [dbo.grupos](#dbo-grupos)
- [dbo.gruposdeproductosvisibles](#dbo-gruposdeproductosvisibles)
- [dbo.gruposi](#dbo-gruposi)
- [dbo.gruposiclasificacion](#dbo-gruposiclasificacion)
- [dbo.gruposmodificadores](#dbo-gruposmodificadores)
- [dbo.gruposmodificadoresproductos](#dbo-gruposmodificadoresproductos)
- [dbo.grupossubgrupos](#dbo-grupossubgrupos)
- [dbo.HORARIOCORTE](#dbo-horariocorte)
- [dbo.horariosturnos](#dbo-horariosturnos)
- [dbo.hotelmovtos](#dbo-hotelmovtos)
- [dbo.huellaclientes](#dbo-huellaclientes)
- [dbo.huellameseros](#dbo-huellameseros)
- [dbo.huellausuarios](#dbo-huellausuarios)
- [dbo.idiomas](#dbo-idiomas)
- [dbo.idiomasticket](#dbo-idiomasticket)
- [dbo.impfiscalnotacreditolog](#dbo-impfiscalnotacreditolog)
- [dbo.imprimefiscalpendientes](#dbo-imprimefiscalpendientes)
- [dbo.impuestos](#dbo-impuestos)
- [dbo.insumos](#dbo-insumos)
- [dbo.insumoscostoproveedor](#dbo-insumoscostoproveedor)
- [dbo.insumosdetalle](#dbo-insumosdetalle)
- [dbo.insumospresentaciones](#dbo-insumospresentaciones)
- [dbo.insumospresentacionesdetalle](#dbo-insumospresentacionesdetalle)
- [dbo.inventariopendiente](#dbo-inventariopendiente)
- [dbo.invfisico](#dbo-invfisico)
- [dbo.invfisicomovtos](#dbo-invfisicomovtos)
- [dbo.lectores](#dbo-lectores)
- [dbo.logcambioprecios](#dbo-logcambioprecios)
- [dbo.mapa_mesas](#dbo-mapa-mesas)
- [dbo.menu](#dbo-menu)
- [dbo.menucomedor](#dbo-menucomedor)
- [dbo.menucomedorproductos](#dbo-menucomedorproductos)
- [dbo.menuproductos](#dbo-menuproductos)
- [dbo.mesas](#dbo-mesas)
- [dbo.mesasasignadas](#dbo-mesasasignadas)
- [dbo.mesasbillar](#dbo-mesasbillar)
- [dbo.meseros](#dbo-meseros)
- [dbo.modificadores](#dbo-modificadores)
- [dbo.monedasmesero](#dbo-monedasmesero)
- [dbo.monitoresproduccion](#dbo-monitoresproduccion)
- [dbo.monitorprodestaciones](#dbo-monitorprodestaciones)
- [dbo.motivoscancelacion](#dbo-motivoscancelacion)
- [dbo.movsinv](#dbo-movsinv)
- [dbo.movsinvcancelados](#dbo-movsinvcancelados)
- [dbo.movtosalmacen](#dbo-movtosalmacen)
- [dbo.movtosalmacencancelados](#dbo-movtosalmacencancelados)
- [dbo.movtosbillar](#dbo-movtosbillar)
- [dbo.movtoscaja](#dbo-movtoscaja)
- [dbo.movtospatines](#dbo-movtospatines)
- [dbo.ncomprobantesfiscales](#dbo-ncomprobantesfiscales)
- [dbo.notificaciones_antifraudes](#dbo-notificaciones-antifraudes)
- [dbo.numerostarjetas](#dbo-numerostarjetas)
- [dbo.objetos_mapa](#dbo-objetos-mapa)
- [dbo.ordenescompra](#dbo-ordenescompra)
- [dbo.ordenescompramov](#dbo-ordenescompramov)
- [dbo.pacs](#dbo-pacs)
- [dbo.pagosproveedores](#dbo-pagosproveedores)
- [dbo.paises](#dbo-paises)
- [dbo.paquetes](#dbo-paquetes)
- [dbo.parametros](#dbo-parametros)
- [dbo.parametros2](#dbo-parametros2)
- [dbo.parametros3](#dbo-parametros3)
- [dbo.patines](#dbo-patines)
- [dbo.pedidos](#dbo-pedidos)
- [dbo.pedidosdetalle](#dbo-pedidosdetalle)
- [dbo.productos](#dbo-productos)
- [dbo.productosdetalle](#dbo-productosdetalle)
- [dbo.productosenproduccion](#dbo-productosenproduccion)
- [dbo.productosmonedero](#dbo-productosmonedero)
- [dbo.productosmonitores](#dbo-productosmonitores)
- [dbo.promociones](#dbo-promociones)
- [dbo.promocionesdescargar](#dbo-promocionesdescargar)
- [dbo.promocionesmenuelectronico](#dbo-promocionesmenuelectronico)
- [dbo.promoproductos](#dbo-promoproductos)
- [dbo.proveedores](#dbo-proveedores)
- [dbo.proveedorespredet](#dbo-proveedorespredet)
- [dbo.puntos](#dbo-puntos)
- [dbo.puntosgruposdeproductos](#dbo-puntosgruposdeproductos)
- [dbo.recetasalmacenes](#dbo-recetasalmacenes)
- [dbo.regionempresa](#dbo-regionempresa)
- [dbo.regiones](#dbo-regiones)
- [dbo.registro_dispositivos](#dbo-registro-dispositivos)
- [dbo.registro_enlacesrm](#dbo-registro-enlacesrm)
- [dbo.registro_licencias](#dbo-registro-licencias)
- [dbo.registroasistencias](#dbo-registroasistencias)
- [dbo.renta](#dbo-renta)
- [dbo.reservaciones](#dbo-reservaciones)
- [dbo.saldosclientes](#dbo-saldosclientes)
- [dbo.serviciominutospatin](#dbo-serviciominutospatin)
- [dbo.sincronizacion](#dbo-sincronizacion)
- [dbo.stockinsumos](#dbo-stockinsumos)
- [dbo.subgrupos](#dbo-subgrupos)
- [dbo.subgruposproductos](#dbo-subgruposproductos)
- [dbo.sucursalescallcenter](#dbo-sucursalescallcenter)
- [dbo.tablaaux](#dbo-tablaaux)
- [dbo.tempbitacoratarjetacredito](#dbo-tempbitacoratarjetacredito)
- [dbo.tempbitacoratransacciones](#dbo-tempbitacoratransacciones)
- [dbo.tempcancela](#dbo-tempcancela)
- [dbo.tempcheqdet](#dbo-tempcheqdet)
- [dbo.tempcheqpedidos](#dbo-tempcheqpedidos)
- [dbo.tempcheques](#dbo-tempcheques)
- [dbo.tempchequespagos](#dbo-tempchequespagos)
- [dbo.tempfoliosfacturados](#dbo-tempfoliosfacturados)
- [dbo.tempnumerostarjetas](#dbo-tempnumerostarjetas)
- [dbo.tipoclientes](#dbo-tipoclientes)
- [dbo.tipocomisionistas](#dbo-tipocomisionistas)
- [dbo.tipodescuento](#dbo-tipodescuento)
- [dbo.tipoempresa](#dbo-tipoempresa)
- [dbo.tipogastos](#dbo-tipogastos)
- [dbo.tipomenuclientes](#dbo-tipomenuclientes)
- [dbo.tipopedido](#dbo-tipopedido)
- [dbo.tipoproveedores](#dbo-tipoproveedores)
- [dbo.tiporeservaciones](#dbo-tiporeservaciones)
- [dbo.tiposdemesa](#dbo-tiposdemesa)
- [dbo.tiposdemesadetalles](#dbo-tiposdemesadetalles)
- [dbo.traspasosalmacen](#dbo-traspasosalmacen)
- [dbo.turnos](#dbo-turnos)
- [dbo.turnosf](#dbo-turnosf)
- [dbo.udsmedida](#dbo-udsmedida)
- [dbo.udsmedidaequivale](#dbo-udsmedidaequivale)
- [dbo.usuarios](#dbo-usuarios)
- [dbo.usuariosdescargar](#dbo-usuariosdescargar)
- [dbo.usuariosperfiles](#dbo-usuariosperfiles)
- [dbo.usuariosperfilescatalogo](#dbo-usuariosperfilescatalogo)
- [dbo.ws_cloud](#dbo-ws-cloud)
- [dbo.zonasdomicilio](#dbo-zonasdomicilio)
- [dbo.zonasdomiciliodescargar](#dbo-zonasdomiciliodescargar)
- [dbo.zonasdomiciliosucursales](#dbo-zonasdomiciliosucursales)

## dbo.actualizaciones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | sistema | varchar(250) | YES | - |
| 2 | zip | varbinary(max) | YES | - |
| 3 | fecha | varchar(250) | YES | - |
| 4 | cambios | text | YES | - |

## dbo.almacen

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idalmacen | varchar(5) | NO | - |
| 2 | nombre | varchar(30) | YES | - |
| 3 | ultimofolio | numeric(10,0) | YES | - |
| 4 | idempresa | varchar(15) | YES | - |
| 5 | tipo | numeric(1,0) | YES | - |

## dbo.areas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idarea | varchar(4) | NO | - |
| 2 | nombre | varchar(30) | YES | - |

## dbo.areasdetalle

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idarea | varchar(4) | NO | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | descargar | bit | YES | - |

## dbo.areasrestaurant

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idarearestaurant | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | idtiposervicio | numeric(1,0) | YES | - |

## dbo.areasrestaurantdetalle

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idarearestaurant | varchar(5) | YES | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | descargar | bit | YES | - |

## dbo.azbar_log

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idazbarlog | int | YES | - |
| 2 | fecha | datetime | YES | - |
| 3 | hora | datetime | YES | - |
| 4 | idturno | int | YES | - |
| 5 | quantity | int | YES | - |
| 6 | number | int | YES | - |
| 7 | size | int | YES | - |
| 8 | usuario | int | YES | - |
| 9 | price | int | YES | - |
| 10 | activetable | varchar(10) | YES | - |

## dbo.bancos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idbanco | varchar(5) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |

## dbo.bitacoraEnvioVentas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idbitacora | bigint | NO | - |
| 2 | fechaapertura | datetime | YES | - |
| 3 | enviado | bit | YES | - |
| 4 | fechaenviado | datetime | YES | - |
| 5 | usuarioenvio | varchar(30) | YES | - |
| 6 | offline | bit | YES | - |

## dbo.bitacorafiscal

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | fecha | datetime | YES | - |
| 2 | fechainicial | datetime | YES | - |
| 3 | fechafinal | datetime | YES | - |
| 4 | cuentastotal | numeric(6,0) | YES | - |
| 5 | cuentasmodificadas | numeric(6,0) | YES | - |
| 6 | importeanterior | money | YES | - |
| 7 | importenuevo | money | YES | - |
| 8 | diferencia | numeric(5,2) | YES | - |
| 9 | tipo | varchar(10) | YES | - |
| 10 | modificaventareal | bit | YES | - |
| 11 | idempresa | varchar(15) | YES | - |

## dbo.bitacorasistema

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | fecha | datetime | YES | - |
| 2 | usuario | varchar(15) | YES | - |
| 3 | evento | varchar(50) | YES | - |
| 4 | valores | varchar(254) | YES | - |
| 5 | estacion | varchar(40) | YES | - |
| 6 | idempresa | varchar(15) | YES | - |

## dbo.bitacoratarjetacredito

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | bigint | YES | - |
| 2 | autorizacion | varchar(15) | YES | - |
| 3 | cuenta | varchar(20) | YES | - |
| 4 | vencimiento | varchar(4) | YES | - |
| 5 | importe | money | YES | - |
| 6 | fecha | datetime | YES | - |
| 7 | reimpresiones | numeric(3,0) | YES | - |
| 8 | mensajederespuesta | varchar(250) | YES | - |
| 9 | procedimiento | varchar(20) | YES | - |
| 10 | afiliacion | varchar(20) | YES | - |
| 11 | statustransaccion | numeric(1,0) | YES | - |
| 12 | idtransaccion | varchar(30) | YES | - |
| 13 | numerooperacion | varchar(10) | YES | - |
| 14 | informaciontarjeta | varchar(50) | YES | - |
| 15 | tipotarjeta | numeric(1,0) | YES | - |
| 16 | arqc | varchar(30) | YES | - |
| 17 | apn | varchar(30) | YES | - |
| 18 | apnlabel | varchar(30) | YES | - |

## dbo.bitacoratransacciones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | numeric(10,0) | YES | - |
| 2 | autorizacion | varchar(15) | YES | - |
| 3 | referencia | varchar(15) | YES | - |
| 4 | importe | money | YES | - |
| 5 | fecha | datetime | YES | - |
| 6 | reimpresiones | numeric(1,0) | YES | - |
| 7 | procedimiento | varchar(15) | YES | - |
| 8 | datosenvio | varchar(254) | YES | - |
| 9 | datosrespuesta | varchar(254) | YES | - |
| 10 | medusafol_prov | varchar(15) | YES | - |
| 11 | medusafol_ope | numeric(8,0) | YES | - |

## dbo.cancela

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliocheque | bigint | NO | - |
| 2 | comanda | varchar(8) | YES | - |
| 3 | cantidad | numeric(11,3) | YES | - |
| 4 | clave | varchar(15) | YES | - |
| 5 | razon | varchar(100) | YES | - |
| 6 | fecha | datetime | YES | - |
| 7 | usuario | varchar(15) | YES | - |
| 8 | precio | money | YES | - |

## dbo.cheqdet

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliodet | bigint | YES | - |
| 2 | movimiento | numeric(3,0) | YES | - |
| 3 | comanda | varchar(8) | YES | - |
| 4 | cantidad | numeric(14,6) | YES | - |
| 5 | idproducto | varchar(15) | YES | - |
| 6 | descuento | numeric(6,2) | YES | - |
| 7 | precio | money | YES | - |
| 8 | impuesto1 | numeric(5,2) | YES | - |
| 9 | impuesto2 | numeric(5,2) | YES | - |
| 10 | impuesto3 | numeric(5,2) | YES | - |
| 11 | preciosinimpuestos | money | YES | - |
| 12 | tiempo | varchar(20) | YES | - |
| 13 | hora | datetime | YES | - |
| 14 | modificador | bit | YES | - |
| 15 | mitad | numeric(1,0) | YES | - |
| 16 | comentario | varchar(60) | YES | - |
| 17 | idestacion | varchar(40) | YES | - |
| 18 | usuariodescuento | varchar(15) | YES | - |
| 19 | comentariodescuento | varchar(60) | YES | - |
| 20 | idtipodescuento | varchar(5) | YES | - |
| 21 | horaproduccion | datetime | YES | - |
| 22 | idproductocompuesto | varchar(15) | YES | - |
| 23 | productocompuestoprincipal | bit | YES | - |
| 24 | preciocatalogo | money | YES | - |
| 25 | marcar | bit | YES | - |
| 26 | idmeseroproducto | varchar(4) | YES | - |
| 27 | prioridadproduccion | varchar(1) | YES | - |
| 28 | estatuspatin | numeric(1,0) | YES | - |
| 29 | idcortesia | varchar(5) | YES | - |
| 30 | numerotarjeta | varchar(16) | YES | - |
| 31 | estadomonitor | numeric(1,0) | YES | - |
| 32 | llavemovto | varchar(100) | YES | - |

## dbo.cheqdetf

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliodet | bigint | YES | - |
| 2 | movimiento | numeric(3,0) | YES | - |
| 3 | comanda | varchar(8) | YES | - |
| 4 | cantidad | numeric(14,6) | YES | - |
| 5 | idproducto | varchar(15) | YES | - |
| 6 | descuento | numeric(6,2) | YES | - |
| 7 | precio | money | YES | - |
| 8 | impuesto1 | numeric(5,2) | YES | - |
| 9 | impuesto2 | numeric(5,2) | YES | - |
| 10 | impuesto3 | numeric(5,2) | YES | - |
| 11 | preciosinimpuestos | money | YES | - |
| 12 | tiempo | varchar(20) | YES | - |
| 13 | hora | datetime | YES | - |
| 14 | modificador | bit | YES | - |
| 15 | mitad | numeric(1,0) | YES | - |
| 16 | comentario | varchar(60) | YES | - |
| 17 | idestacion | varchar(40) | YES | - |
| 18 | usuariodescuento | varchar(15) | YES | - |
| 19 | comentariodescuento | varchar(60) | YES | - |
| 20 | idtipodescuento | varchar(5) | YES | - |
| 21 | horaproduccion | datetime | YES | - |
| 22 | idproductocompuesto | varchar(15) | YES | - |
| 23 | productocompuestoprincipal | bit | YES | - |
| 24 | preciocatalogo | money | YES | - |
| 25 | marcar | bit | YES | - |
| 26 | idmeseroproducto | varchar(4) | YES | - |
| 27 | prioridadproduccion | varchar(1) | YES | - |
| 28 | estatuspatin | numeric(1,0) | YES | - |
| 29 | idcortesia | varchar(5) | YES | - |
| 30 | numerotarjeta | varchar(16) | YES | - |
| 31 | llavemovto | varchar(100) | YES | - |

## dbo.cheqdetfeliminados

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliodet | numeric(8,0) | YES | - |
| 2 | cantidad | numeric(12,4) | YES | - |
| 3 | idproducto | varchar(15) | YES | - |
| 4 | descuento | numeric(6,2) | YES | - |
| 5 | precio | money | YES | - |

## dbo.cheqpedidos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliocheque | bigint | YES | - |
| 2 | idpedido | bigint | YES | - |

## dbo.cheques

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | bigint | NO | - |
| 2 | seriefolio | varchar(15) | YES | - |
| 3 | numcheque | numeric(8,0) | YES | - |
| 4 | fecha | datetime | YES | - |
| 5 | salidarepartidor | datetime | YES | - |
| 6 | arriborepartidor | datetime | YES | - |
| 7 | cierre | datetime | YES | - |
| 8 | mesa | varchar(15) | YES | - |
| 9 | nopersonas | numeric(3,0) | YES | - |
| 10 | idmesero | varchar(4) | YES | - |
| 11 | pagado | bit | YES | - |
| 12 | cancelado | bit | YES | - |
| 13 | impreso | bit | YES | - |
| 14 | impresiones | numeric(6,0) | YES | - |
| 15 | cambio | money | YES | - |
| 16 | descuento | numeric(8,4) | YES | - |
| 17 | reabiertas | numeric(4,0) | YES | - |
| 18 | razoncancelado | varchar(100) | YES | - |
| 19 | orden | numeric(6,0) | YES | - |
| 20 | facturado | bit | YES | - |
| 21 | idcliente | varchar(15) | YES | - |
| 22 | idarearestaurant | varchar(5) | YES | - |
| 23 | idempresa | varchar(15) | YES | - |
| 24 | tipodeservicio | numeric(1,0) | YES | - |
| 25 | idturno | numeric(6,0) | YES | - |
| 26 | usuariocancelo | varchar(15) | YES | - |
| 27 | comentariodescuento | varchar(60) | YES | - |
| 28 | estacion | varchar(40) | YES | - |
| 29 | cambiorepartidor | money | YES | - |
| 30 | usuariodescuento | varchar(15) | YES | - |
| 31 | fechacancelado | datetime | YES | - |
| 32 | idtipodescuento | varchar(5) | YES | - |
| 33 | numerotarjeta | varchar(30) | YES | - |
| 34 | folionotadeconsumo | numeric(8,0) | YES | - |
| 35 | notadeconsumo | bit | YES | - |
| 36 | propinapagada | bit | YES | - |
| 37 | propinafoliomovtocaja | numeric(8,0) | YES | - |
| 38 | puntosmonederogenerados | money | YES | - |
| 39 | propinaincluida | money | YES | - |
| 40 | tarjetadescuento | varchar(30) | YES | - |
| 41 | porcentajefac | numeric(8,4) | YES | - |
| 42 | usuariopago | varchar(15) | YES | - |
| 43 | propinamanual | bit | YES | - |
| 44 | observaciones | varchar(250) | YES | - |
| 45 | idclientedomicilio | varchar(15) | YES | - |
| 46 | iddireccion | varchar(15) | YES | - |
| 47 | idclientefacturacion | varchar(15) | YES | - |
| 48 | telefonousadodomicilio | varchar(15) | YES | - |
| 49 | totalarticulos | numeric(11,2) | YES | - |
| 50 | subtotal | money | YES | - |
| 51 | subtotalsinimpuestos | money | YES | - |
| 52 | total | money | YES | - |
| 53 | totalconpropina | money | YES | - |
| 54 | totalsinimpuestos | money | YES | - |
| 55 | totalsindescuentosinimpuesto | money | YES | - |
| 56 | totalimpuesto1 | money | YES | - |
| 57 | totalalimentosconimpuestos | money | YES | - |
| 58 | totalbebidasconimpuestos | money | YES | - |
| 59 | totalotrosconimpuestos | money | YES | - |
| 60 | totalalimentossinimpuestos | money | YES | - |
| 61 | totalbebidassinimpuestos | money | YES | - |
| 62 | totalotrossinimpuestos | money | YES | - |
| 63 | totaldescuentossinimpuestos | money | YES | - |
| 64 | totaldescuentosconimpuestos | money | YES | - |
| 65 | totaldescuentoalimentosconimpuesto | money | YES | - |
| 66 | totaldescuentobebidasconimpuesto | money | YES | - |
| 67 | totaldescuentootrosconimpuesto | money | YES | - |
| 68 | totaldescuentoalimentossinimpuesto | money | YES | - |
| 69 | totaldescuentobebidassinimpuesto | money | YES | - |
| 70 | totaldescuentootrossinimpuesto | money | YES | - |
| 71 | totalcortesiassinimpuestos | money | YES | - |
| 72 | totalcortesiasconimpuestos | money | YES | - |
| 73 | totalcortesiaalimentosconimpuesto | money | YES | - |
| 74 | totalcortesiabebidasconimpuesto | money | YES | - |
| 75 | totalcortesiaotrosconimpuesto | money | YES | - |
| 76 | totalcortesiaalimentossinimpuesto | money | YES | - |
| 77 | totalcortesiabebidassinimpuesto | money | YES | - |
| 78 | totalcortesiaotrossinimpuesto | money | YES | - |
| 79 | totaldescuentoycortesiasinimpuesto | money | YES | - |
| 80 | totaldescuentoycortesiaconimpuesto | money | YES | - |
| 81 | cargo | money | YES | - |
| 82 | totalconcargo | money | YES | - |
| 83 | totalconpropinacargo | money | YES | - |
| 84 | descuentoimporte | money | YES | - |
| 85 | efectivo | money | YES | - |
| 86 | tarjeta | money | YES | - |
| 87 | vales | money | YES | - |
| 88 | otros | money | YES | - |
| 89 | propina | money | YES | - |
| 90 | propinatarjeta | money | YES | - |
| 91 | totalalimentossinimpuestossindescuentos | money | YES | - |
| 92 | totalbebidassinimpuestossindescuentos | money | YES | - |
| 93 | totalotrossinimpuestossindescuentos | money | YES | - |
| 94 | campoadicional1 | varchar(30) | YES | - |
| 95 | idreservacion | varchar(15) | YES | - |
| 96 | idcomisionista | varchar(5) | YES | - |
| 97 | importecomision | money | YES | - |
| 98 | comisionpagada | bit | YES | - |
| 99 | fechapagocomision | datetime | YES | - |
| 100 | foliopagocomision | numeric(8,0) | YES | - |
| 101 | tipoventarapida | numeric(1,0) | YES | - |
| 102 | callcenter | bit | YES | - |
| 103 | idordencompra | bigint | YES | - |
| 104 | totalsindescuento | money | YES | - |
| 105 | totalalimentos | money | YES | - |
| 106 | totalbebidas | money | YES | - |
| 107 | totalotros | money | YES | - |
| 108 | totaldescuentos | money | YES | - |
| 109 | totaldescuentoalimentos | money | YES | - |
| 110 | totaldescuentobebidas | money | YES | - |
| 111 | totaldescuentootros | money | YES | - |
| 112 | totalcortesias | money | YES | - |
| 113 | totalcortesiaalimentos | money | YES | - |
| 114 | totalcortesiabebidas | money | YES | - |
| 115 | totalcortesiaotros | money | YES | - |
| 116 | totaldescuentoycortesia | money | YES | - |
| 117 | totalalimentossindescuentos | money | YES | - |
| 118 | totalbebidassindescuentos | money | YES | - |
| 119 | totalotrossindescuentos | money | YES | - |
| 120 | descuentocriterio | numeric(1,0) | YES | - |
| 121 | descuentomonedero | money | YES | - |
| 122 | idmenucomedor | varchar(15) | YES | - |
| 123 | subtotalcondescuento | money | YES | - |
| 124 | comisionpax | money | YES | - |
| 125 | procesadointerfaz | bit | YES | - |
| 126 | domicilioprogramado | bit | YES | - |
| 127 | fechadomicilioprogramado | datetime | YES | - |
| 128 | enviado | bit | YES | - |
| 129 | ncf | varchar(19) | YES | - |
| 130 | numerocuenta | varchar(20) | YES | - |
| 131 | codigo_unico_af | varchar(30) | YES | - |
| 132 | estatushub | int | YES | - |
| 133 | idfoliohub | numeric(8,0) | YES | - |
| 134 | EnviadoRW | bit | YES | - |
| 135 | autorizacionfolio | varchar(50) | YES | - |
| 136 | fechalimiteemision | datetime | YES | - |

## dbo.chequesf

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | bigint | NO | - |
| 2 | seriefolio | varchar(15) | YES | - |
| 3 | numcheque | bigint | YES | - |
| 4 | fecha | datetime | YES | - |
| 5 | salidarepartidor | datetime | YES | - |
| 6 | arriborepartidor | datetime | YES | - |
| 7 | cierre | datetime | YES | - |
| 8 | mesa | varchar(15) | YES | - |
| 9 | nopersonas | int | YES | - |
| 10 | idmesero | varchar(4) | YES | - |
| 11 | pagado | bit | YES | - |
| 12 | cancelado | bit | YES | - |
| 13 | impreso | bit | YES | - |
| 14 | impresiones | int | YES | - |
| 15 | cambio | money | YES | - |
| 16 | descuento | money | YES | - |
| 17 | reabiertas | int | YES | - |
| 18 | razoncancelado | varchar(100) | YES | - |
| 19 | orden | bigint | YES | - |
| 20 | facturado | bit | YES | - |
| 21 | idcliente | varchar(15) | YES | - |
| 22 | idarearestaurant | varchar(5) | YES | - |
| 23 | claveempresav | varchar(5) | YES | - |
| 24 | tipodeservicio | int | YES | - |
| 25 | idturno | bigint | YES | - |
| 26 | usuariocancelo | varchar(15) | YES | - |
| 27 | comentariodescuento | varchar(60) | YES | - |
| 28 | estacion | varchar(40) | YES | - |
| 29 | cambiorepartidor | money | YES | - |
| 30 | usuariodescuento | varchar(15) | YES | - |
| 31 | fechacancelado | datetime | YES | - |
| 32 | idtipodescuento | varchar(5) | YES | - |
| 33 | numerotarjeta | varchar(30) | YES | - |
| 34 | folionotadeconsumo | bigint | YES | - |
| 35 | notadeconsumo | bit | YES | - |
| 36 | propinapagada | bit | YES | - |
| 37 | propinafoliomovtocaja | bigint | YES | - |
| 38 | puntosmonederogenerados | money | YES | - |
| 39 | propinaincluida | money | YES | - |
| 40 | tarjetadescuento | varchar(30) | YES | - |
| 41 | porcentajefac | numeric(8,4) | YES | - |
| 42 | propinamanual | bit | YES | - |
| 43 | usuariopago | varchar(15) | YES | - |
| 44 | idclientefacturacion | varchar(15) | YES | - |
| 45 | cuentaenuso | bit | YES | - |
| 46 | observaciones | varchar(250) | YES | - |
| 47 | idclientedomicilio | varchar(15) | YES | - |
| 48 | iddireccion | varchar(15) | YES | - |
| 49 | telefonousadodomicilio | varchar(15) | YES | - |
| 50 | totalarticulos | numeric(11,2) | YES | - |
| 51 | subtotal | money | YES | - |
| 52 | subtotalsinimpuestos | money | YES | - |
| 53 | total | money | YES | - |
| 54 | totalconpropina | money | YES | - |
| 55 | totalimpuesto1 | money | YES | - |
| 56 | cargo | money | YES | - |
| 57 | totalconcargo | money | YES | - |
| 58 | totalconpropinacargo | money | YES | - |
| 59 | descuentoimporte | money | YES | - |
| 60 | efectivo | money | YES | - |
| 61 | tarjeta | money | YES | - |
| 62 | vales | money | YES | - |
| 63 | otros | money | YES | - |
| 64 | propina | money | YES | - |
| 65 | propinatarjeta | money | YES | - |
| 66 | campoadicional1 | varchar(30) | YES | - |
| 67 | idreservacion | varchar(15) | YES | - |
| 68 | idcomisionista | varchar(5) | YES | - |
| 69 | importecomision | money | YES | - |
| 70 | comisionpagada | bit | YES | - |
| 71 | fechapagocomision | datetime | YES | - |
| 72 | foliopagocomision | numeric(8,0) | YES | - |
| 73 | tipoventarapida | numeric(1,0) | YES | - |
| 74 | callcenter | bit | YES | - |
| 75 | idordencompra | bigint | YES | - |
| 76 | idempresa | varchar(15) | YES | - |
| 77 | totalsindescuento | money | YES | - |
| 78 | totalalimentos | money | YES | - |
| 79 | totalbebidas | money | YES | - |
| 80 | totalotros | money | YES | - |
| 81 | totaldescuentos | money | YES | - |
| 82 | totaldescuentoalimentos | money | YES | - |
| 83 | totaldescuentobebidas | money | YES | - |
| 84 | totaldescuentootros | money | YES | - |
| 85 | totalcortesias | money | YES | - |
| 86 | totalcortesiaalimentos | money | YES | - |
| 87 | totalcortesiabebidas | money | YES | - |
| 88 | totalcortesiaotros | money | YES | - |
| 89 | totaldescuentoycortesia | money | YES | - |
| 90 | totalalimentossindescuentos | money | YES | - |
| 91 | totalbebidassindescuentos | money | YES | - |
| 92 | totalotrossindescuentos | money | YES | - |
| 93 | descuentocriterio | numeric(1,0) | YES | - |
| 94 | descuentomonedero | money | YES | - |
| 95 | idmenucomedor | varchar(15) | YES | - |
| 96 | subtotalcondescuento | money | YES | - |
| 97 | comisionpax | money | YES | - |
| 98 | procesadointerfaz | bit | YES | - |
| 99 | domicilioprogramado | bit | YES | - |
| 100 | fechadomicilioprogramado | datetime | YES | - |
| 101 | numerocuenta | varchar(20) | YES | - |
| 102 | codigo_unico_af | varchar(30) | YES | - |
| 103 | modificado | numeric(1,0) | YES | - |
| 104 | EnviadoRW | bit | YES | - |
| 105 | autorizacionfolio | varchar(50) | YES | - |
| 106 | fechalimiteemision | datetime | YES | - |

## dbo.chequespagos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | bigint | NO | - |
| 2 | idformadepago | varchar(5) | YES | - |
| 3 | importe | money | YES | - |
| 4 | propina | money | YES | - |
| 5 | tipodecambio | money | YES | - |
| 6 | referencia | varchar(80) | YES | - |

## dbo.chequespagosf

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | numeric(9,0) | NO | - |
| 2 | idformadepago | varchar(5) | YES | - |
| 3 | importe | money | YES | - |
| 4 | propina | money | YES | - |
| 5 | tipodecambio | money | YES | - |
| 6 | referencia | varchar(80) | YES | - |

## dbo.clientes

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcliente | varchar(15) | NO | - |
| 2 | nombre | varchar(160) | YES | - |
| 3 | direccion | varchar(160) | YES | - |
| 4 | codigopostal | varchar(15) | YES | - |
| 5 | poblacion | varchar(60) | YES | - |
| 6 | estado | varchar(25) | YES | - |
| 7 | pais | varchar(25) | YES | - |
| 8 | email | varchar(60) | YES | - |
| 9 | rfc | varchar(15) | YES | - |
| 10 | curp | varchar(20) | YES | - |
| 11 | cumpleaños | datetime | YES | - |
| 12 | limitedecredito | money | YES | - |
| 13 | limitecreditodiario | money | YES | - |
| 14 | descuento | numeric(5,2) | YES | - |
| 15 | notas | varchar(254) | YES | - |
| 16 | foliofiscal | varchar(15) | YES | - |
| 17 | idtipodescuento | varchar(5) | YES | - |
| 18 | tipofacturacion | int | YES | - |
| 19 | procesadoweb | bit | YES | - |
| 20 | nocobrarimpuestos | bit | YES | - |
| 21 | contacto | varchar(150) | YES | - |
| 22 | tarjetamonedero | varchar(20) | YES | - |
| 23 | telefono1 | varchar(15) | YES | - |
| 24 | telefono2 | varchar(15) | YES | - |
| 25 | telefono3 | varchar(15) | YES | - |
| 26 | telefono4 | varchar(15) | YES | - |
| 27 | telefono5 | varchar(15) | YES | - |
| 28 | femextipocliente | numeric(1,0) | YES | - |
| 29 | giro | varchar(60) | YES | - |
| 30 | tipocredito | numeric(1,0) | YES | - |
| 31 | idtipocliente | varchar(5) | YES | - |
| 32 | idtipomenu | varchar(5) | YES | - |
| 33 | fotografia | image | YES | - |
| 34 | fechaalta | datetime | YES | - |
| 35 | retenerimpuesto | bit | YES | - |
| 36 | tipocuenta | numeric(1,0) | YES | - |
| 37 | tipoclientencf | numeric(1,0) | YES | - |

## dbo.clientestitularsecundario

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcliente | varchar(15) | YES | - |
| 2 | idsecundario | varchar(15) | YES | - |

## dbo.codigosdeserviciocfdi

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcodigo | int | YES | - |
| 2 | codigoservicio | varchar(20) | YES | - |
| 3 | folios | varchar(50) | YES | - |
| 4 | usuarioregistro | varchar(50) | YES | - |
| 5 | fecharegistro | datetime | YES | - |
| 6 | idempresa | varchar(15) | YES | - |

## dbo.colonias

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcolonia | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | idzona | varchar(5) | YES | - |

## dbo.comandas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmesero | varchar(4) | YES | - |
| 2 | folio | varchar(8) | YES | - |
| 3 | usado | bit | YES | - |

## dbo.comandosimpresion

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcomando | varchar(5) | NO | - |
| 2 | descripcion | varchar(20) | YES | - |
| 3 | comando | varchar(30) | YES | - |

## dbo.comentarios

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | descripcion | varchar(60) | YES | - |

## dbo.comisionistas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcomisionista | varchar(15) | NO | - |
| 2 | idtipocomisionista | varchar(5) | YES | - |
| 3 | nombre | varchar(80) | YES | - |
| 4 | razonsocial | varchar(120) | YES | - |
| 5 | direccion | varchar(120) | YES | - |
| 6 | codigopostal | varchar(15) | YES | - |
| 7 | registrofiscal | varchar(15) | YES | - |
| 8 | contacto | varchar(60) | YES | - |
| 9 | observaciones | varchar(150) | YES | - |
| 10 | telefono | varchar(30) | YES | - |
| 11 | email | varchar(80) | YES | - |
| 12 | paginaweb | varchar(100) | YES | - |
| 13 | poblacion | varchar(60) | YES | - |
| 14 | estado | varchar(25) | YES | - |
| 15 | pais | varchar(25) | YES | - |
| 16 | fechaalta | datetime | YES | - |
| 17 | tipocomision | numeric(1,0) | YES | - |
| 18 | comisionporcentaje | numeric(5,0) | YES | - |
| 19 | comisionimporte | money | YES | - |
| 20 | puesto | varchar(20) | YES | - |
| 21 | nacimiento | datetime | YES | - |
| 22 | aniversario | datetime | YES | - |
| 23 | cuentabancaria | varchar(120) | YES | - |
| 24 | pagopax | varchar(8) | YES | - |
| 25 | idbanco | varchar(5) | YES | - |

## dbo.compras

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcompra | bigint | NO | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | folio | varchar(15) | YES | - |
| 4 | fechaaplicacion | datetime | YES | - |
| 5 | idproveedor | varchar(15) | YES | - |
| 6 | foliofactura | varchar(15) | YES | - |
| 7 | fechafactura | datetime | YES | - |
| 8 | cancelado | bit | YES | - |
| 9 | fechavencimiento | datetime | YES | - |
| 10 | usuariocancelo | varchar(15) | YES | - |
| 11 | usuario | varchar(15) | YES | - |
| 12 | referencia | varchar(50) | YES | - |
| 13 | descuento | numeric(5,2) | YES | - |
| 14 | subtotal | money | YES | - |
| 15 | impuesto1 | money | YES | - |
| 16 | impuesto2 | money | YES | - |
| 17 | impuesto3 | money | YES | - |
| 18 | total | money | YES | - |
| 19 | fiscal | bit | YES | - |

## dbo.comprasmovtos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcompra | bigint | YES | - |
| 2 | idinsumo | varchar(15) | YES | - |
| 3 | costo | money | YES | - |
| 4 | descuento | numeric(5,2) | YES | - |
| 5 | impuesto1 | numeric(5,2) | YES | - |
| 6 | impuesto1importe | money | YES | - |
| 7 | impuesto2 | numeric(5,2) | YES | - |
| 8 | impuesto2importe | money | YES | - |
| 9 | impuesto3 | numeric(5,2) | YES | - |
| 10 | impuesto3importe | money | YES | - |
| 11 | importesinimpuestos | money | YES | - |
| 12 | importeconimpuestos | money | YES | - |
| 13 | idalmacen | varchar(5) | YES | - |
| 14 | idordencompra | numeric(10,0) | YES | - |
| 15 | cantidad | numeric(14,4) | YES | - |

## dbo.conceptos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idconcepto | varchar(5) | NO | - |
| 2 | descripcion | varchar(40) | YES | - |
| 3 | tipo | numeric(1,0) | YES | - |
| 4 | autorizacion | bit | YES | - |
| 5 | visible | bit | YES | - |

## dbo.configuracion

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | reindexado | datetime | YES | - |
| 2 | respaldo | datetime | YES | - |
| 3 | idencuesta | varchar(3) | YES | - |
| 4 | encuestainicio | varchar(11) | YES | - |
| 5 | encuestafin | varchar(11) | YES | - |
| 6 | ivadesglosado | bit | YES | - |
| 7 | impnotadeconsumo | bit | YES | - |
| 8 | cancelaciones | bit | YES | - |
| 9 | reabrir | bit | YES | - |
| 10 | descuentos | bit | YES | - |
| 11 | incluirpropina | bit | YES | - |
| 12 | reimprimir | bit | YES | - |
| 13 | cambiarproductodemesa | bit | YES | - |
| 14 | cambiodemesa | bit | YES | - |
| 15 | juntarmesas | bit | YES | - |
| 16 | seguridadprecioabierto | bit | YES | - |
| 17 | cambiarcomandas | varchar(10) | YES | - |
| 18 | agruparcomandas | bit | YES | - |
| 19 | lineascomedor | numeric(2,0) | YES | - |
| 20 | lineasdomicilio | numeric(2,0) | YES | - |
| 21 | lineasrapido | numeric(2,0) | YES | - |
| 22 | sugerirefectivo | bit | YES | - |
| 23 | redondearcheque | bit | YES | - |
| 24 | propinaincluida | bit | YES | - |
| 25 | porcentajepropina | numeric(5,2) | YES | - |
| 26 | registrocontribuyente | varchar(10) | YES | - |
| 27 | monedanacional | varchar(25) | YES | - |
| 28 | usarcomandas | bit | YES | - |
| 29 | resumirconsumocuenta | bit | YES | - |
| 30 | propinabarra | numeric(6,3) | YES | - |
| 31 | propinacocina | numeric(6,3) | YES | - |
| 32 | propinagarrotero | numeric(6,3) | YES | - |
| 33 | propinacapitan | numeric(6,3) | YES | - |
| 34 | propinastaff | numeric(6,3) | YES | - |
| 35 | propinacaja | numeric(6,3) | YES | - |
| 36 | propinaempaque | numeric(6,3) | YES | - |
| 37 | ultimatransferencia | datetime | YES | - |
| 38 | imprimirtituloscomedor | bit | YES | - |
| 39 | imprimirtitulosdomicilio | bit | YES | - |
| 40 | imprimirtitulosrapido | bit | YES | - |
| 41 | imprimirtitulosnotadeconsumo | bit | YES | - |
| 42 | usarproduccion | bit | YES | - |
| 43 | comanderoimprimir | bit | YES | - |
| 44 | comanderopagar | bit | YES | - |
| 45 | contraseñainventarios | varchar(30) | YES | - |
| 46 | timercomandero | numeric(2,0) | YES | - |
| 47 | conceptoentradaprod | varchar(5) | YES | - |
| 48 | conceptosalidaprod | varchar(5) | YES | - |
| 49 | conceptoentradatransferencia | varchar(5) | YES | - |
| 50 | conceptosalidatransferencia | varchar(5) | YES | - |
| 51 | conceptodesperdicio | varchar(5) | YES | - |
| 52 | conceptoentradafisico | varchar(5) | YES | - |
| 53 | conceptosalidafisico | varchar(5) | YES | - |
| 54 | avisarvariaciondecostos | bit | YES | - |
| 55 | porcentajevariaciondecostos | numeric(5,2) | YES | - |
| 56 | versiondb | varchar(10) | YES | - |
| 57 | revisiondb | varchar(2) | YES | - |
| 58 | copiasticketcomedor | numeric(2,0) | YES | - |
| 59 | copiasticketdomicilio | numeric(2,0) | YES | - |
| 60 | copiasticketrapido | numeric(2,0) | YES | - |
| 61 | copiasnotadeconsumo | numeric(2,0) | YES | - |
| 62 | copiasfacturas | numeric(2,0) | YES | - |
| 63 | cortezinicio | varchar(11) | YES | - |
| 64 | cortezfin | varchar(11) | YES | - |
| 65 | cortezfindiasiguiente | bit | YES | - |
| 66 | ocultartiempos | bit | YES | - |
| 67 | ocultarmitades | bit | YES | - |
| 68 | ocultarcantidades | bit | YES | - |
| 69 | permitirrespaldarturnoabierto | bit | YES | - |
| 70 | cambiovales | bit | YES | - |
| 71 | conceptofacturacion | varchar(50) | YES | - |
| 72 | fondofijocaja | money | YES | - |
| 73 | comanderopuedevermesas | bit | YES | - |
| 74 | ccsobrantesdebe | varchar(5) | YES | - |
| 75 | ccsobranteshaber | varchar(5) | YES | - |
| 76 | ccfaltantes | varchar(5) | YES | - |
| 77 | ccivagastos | varchar(5) | YES | - |
| 78 | ccivaventas | varchar(5) | YES | - |
| 79 | ccdescontarfaltante | varchar(5) | YES | - |
| 80 | ccespecialdescuento | varchar(5) | YES | - |
| 81 | ccespecialidcliente | varchar(15) | YES | - |
| 82 | ccdescontargastos | varchar(5) | YES | - |
| 83 | ccdescontarsobrante | varchar(5) | YES | - |
| 84 | ccretiroscaja | varchar(5) | YES | - |
| 85 | ccdepositoscaja | varchar(5) | YES | - |
| 86 | ccaplicarmovtoscaja | varchar(5) | YES | - |
| 87 | ccpolizaventasap | varchar(5) | YES | - |
| 88 | ccpolizatipopagosap | varchar(5) | YES | - |
| 89 | ccsapacreedoresdebe | varchar(5) | YES | - |
| 90 | ccsapacreedoreshaber | varchar(5) | YES | - |
| 91 | ccpuntosmonederogenerados | varchar(5) | YES | - |
| 92 | ccdescontarpropinasdebe | varchar(5) | YES | - |
| 93 | infofinmoneda | varchar(5) | YES | - |
| 94 | infofindescripcionpoliza | varchar(75) | YES | - |
| 95 | descripcionpolizacompras | varchar(25) | YES | - |
| 96 | sapsociedad | varchar(4) | YES | - |
| 97 | polizanumdivision | varchar(5) | YES | - |
| 98 | simbolomoneda | varchar(4) | YES | - |
| 99 | idfpefpagoagrupado | varchar(5) | YES | - |
| 100 | idfptcpagoagrupado | varchar(5) | YES | - |
| 101 | solicitarcomanda | bit | YES | - |
| 102 | descontarcomisionpropinas | bit | YES | - |
| 103 | ultimacompra | numeric(10,0) | YES | - |
| 104 | ultimaordencompra | numeric(10,0) | YES | - |
| 105 | ultimomovtoinsumo | numeric(10,0) | YES | - |
| 106 | ultimotraspaso | numeric(10,0) | YES | - |
| 107 | usarpantallapequeñamodificador | bit | YES | - |
| 108 | vercambiomonex | bit | YES | - |
| 109 | vercambioclavemonex | varchar(5) | YES | - |
| 110 | autocapturarformadepago | bit | YES | - |
| 111 | autocapturaridformadepago | varchar(5) | YES | - |
| 112 | nopermitircerrarturnocuentasabiertas | bit | YES | - |
| 113 | ultimofolioalmacen | numeric(10,0) | YES | - |
| 114 | ultimomovtopresentacion | numeric(10,0) | YES | - |
| 115 | nombrepropina | varchar(15) | YES | - |
| 116 | decimalespdv | smallint | YES | - |
| 117 | nopermitirarchivopoliza | bit | YES | - |
| 118 | nopermitircompraspreciosmayores | bit | YES | - |
| 119 | solicitarfacturacion | bit | YES | - |
| 120 | meserosclavenumerica | bit | YES | - |
| 121 | desglosarpaquetecomanda | bit | YES | - |
| 122 | comanderoverventa | bit | YES | - |
| 123 | imprimirdecimalespdv | bit | YES | - |
| 124 | tipoconceptofacturacion | numeric(1,0) | YES | - |
| 125 | tipodeimpresioncompra | numeric(1,0) | YES | - |
| 126 | ididiomaticket | numeric(1,0) | YES | - |
| 127 | idclientepublico | varchar(15) | YES | - |
| 128 | totalizarproductosfactura | bit | YES | - |
| 129 | capturaventasteclado | bit | YES | - |
| 130 | condtran | varchar(4) | YES | - |
| 131 | suc | varchar(4) | YES | - |
| 132 | pos | varchar(4) | YES | - |
| 133 | oper | varchar(4) | YES | - |
| 134 | osec | varchar(4) | YES | - |
| 135 | puntos | numeric(12,0) | YES | - |
| 136 | plan | varchar(2) | YES | - |
| 137 | ean | numeric(13,0) | YES | - |
| 138 | ref | numeric(12,0) | YES | - |
| 139 | numaut | numeric(6,0) | YES | - |
| 140 | oip | varchar(13) | YES | - |
| 141 | port | varchar(15) | YES | - |
| 142 | otrans | bit | YES | - |
| 143 | olog | bit | YES | - |
| 144 | otimeout | numeric(2,0) | YES | - |
| 145 | solicitarnotadeconsumo | bit | YES | - |
| 146 | folioindependientenotadeconsumo | bit | YES | - |
| 147 | solicitarimportecompra | bit | YES | - |
| 148 | mitadesusarpreciomasalto | bit | YES | - |
| 149 | urlregistrosweb | varchar(120) | YES | - |
| 150 | ftpregistrowebdireccion | varchar(60) | YES | - |
| 151 | ftpregistrowebusuario | varchar(40) | YES | - |
| 152 | ftpregistrowebcontraseña | varchar(20) | YES | - |
| 153 | pagoenlineatarjeta | bit | YES | - |
| 154 | posip | varchar(15) | YES | - |
| 155 | pospuerto | varchar(6) | YES | - |
| 156 | posidsucursal | varchar(30) | YES | - |
| 157 | posnumafiliacion | varchar(15) | YES | - |
| 158 | posnumpuntodeventa | varchar(15) | YES | - |
| 159 | posnumterminalprosa | varchar(15) | YES | - |
| 160 | pospostracenumber | varchar(15) | YES | - |
| 161 | poscopiasvoucher | numeric(1,0) | YES | - |
| 162 | postimeout | numeric(3,0) | YES | - |
| 163 | archivoexportacionpoliza | numeric(1,0) | YES | - |
| 164 | nocancelarfolioscuentas | bit | YES | - |
| 165 | noimpprodpreciocero | bit | YES | - |
| 166 | nopermitircomentprepescrito | bit | YES | - |
| 167 | polizanodesglosarimpuestos | bit | YES | - |
| 168 | forzarmotivocancela | bit | YES | - |
| 169 | solicitarcomentariopagarservrapido | bit | YES | - |
| 170 | usarpantallapequeñamodificador0 | bit | YES | - |
| 171 | hotelversionsistema | numeric(1,0) | YES | - |
| 172 | hotelrutadb | varchar(80) | YES | - |
| 173 | hotelpassworddb | varchar(30) | YES | - |
| 174 | hotelidconcepto | varchar(15) | YES | - |
| 175 | generararchivoprodsvendidoscorte | bit | YES | - |
| 176 | nodescargarinventario | bit | YES | - |
| 177 | conceptoentradatraspasosreporte | varchar(5) | YES | - |
| 178 | conceptosalidatraspasoreporte | varchar(5) | YES | - |
| 179 | solicitarcantidadproducto | bit | YES | - |
| 180 | formatocortedecajaresumido | numeric(1,0) | YES | - |
| 181 | obtenerfechahoraremota | numeric(1,0) | YES | - |
| 182 | estacionfechahora | varchar(40) | YES | - |
| 183 | formatofecha | numeric(1,0) | YES | - |
| 184 | productocompuestousarmultiplicador | bit | YES | - |
| 185 | tipogenerarpuntosmonedero | numeric(1,0) | YES | - |
| 186 | ipmonedero | varchar(40) | YES | - |
| 187 | bdmonedero | varchar(40) | YES | - |
| 188 | contrasenamonedero | varchar(20) | YES | - |
| 189 | usuariomonedero | varchar(20) | YES | - |
| 190 | clavemonederocliente | varchar(15) | YES | - |
| 191 | seguridaddividircuentas | bit | YES | - |
| 192 | sysdatabase | varchar(100) | YES | - |
| 193 | tiempovisualizapromo | numeric(4,0) | YES | - |
| 194 | caducidadpuntos | numeric(4,0) | YES | - |
| 195 | ccmonederoacreedor | varchar(5) | YES | - |
| 196 | cccertificadoregalo | varchar(5) | YES | - |
| 197 | pagarsinimprimir | bit | YES | - |
| 198 | passmanttoventas | varchar(5) | YES | - |
| 199 | imprimircredito | bit | YES | - |
| 200 | tipocomandero | numeric(1,0) | YES | - |
| 201 | agruparalimentoscomedor | bit | YES | - |
| 202 | agruparbebidascomedor | bit | YES | - |
| 203 | agruparotroscomedor | bit | YES | - |
| 204 | agruparalimentosdomicilio | bit | YES | - |
| 205 | agruparbebidasdomicilio | bit | YES | - |
| 206 | agruparotrosdomicilio | bit | YES | - |
| 207 | agruparalimentosrapido | bit | YES | - |
| 208 | agruparbebidasrapido | bit | YES | - |
| 209 | agruparotrosrapido | bit | YES | - |
| 210 | porcentajeaumentarcostotraspasos | numeric(4,2) | YES | - |
| 211 | motordepagotarjeta | numeric(1,0) | YES | - |
| 212 | payworksurl | varchar(50) | YES | - |
| 213 | payworksmode | numeric(1,0) | YES | - |
| 214 | payworksclienteid | varchar(30) | YES | - |
| 215 | payworksname | varchar(30) | YES | - |
| 216 | payworkspassword | varchar(30) | YES | - |
| 217 | payworksclienteiddolar | varchar(30) | YES | - |
| 218 | payworksnamedolar | varchar(30) | YES | - |
| 219 | payworkspassworddolar | varchar(30) | YES | - |
| 220 | payworksclienteiddiferido | varchar(30) | YES | - |
| 221 | payworksnamediferido | varchar(30) | YES | - |
| 222 | payworkspassworddiferido | varchar(30) | YES | - |
| 223 | fiscalmodificaventareal | bit | YES | - |
| 224 | payworksafiliacion | varchar(50) | YES | - |
| 225 | payworksafiliaciondolar | varchar(50) | YES | - |
| 226 | payworksafiliaciondiferido | varchar(50) | YES | - |
| 227 | tiempologout | numeric(3,0) | YES | - |
| 228 | formulatrackii | varchar(30) | YES | - |
| 229 | abrircapturaporclaves | bit | YES | - |
| 230 | confirmarfolionotaconsumo | bit | YES | - |
| 231 | nocantidaddecimalventa | bit | YES | - |
| 232 | nomensajesescritos | bit | YES | - |
| 233 | facturaslineasmaximo | numeric(4,0) | YES | - |
| 234 | autorizacioncierrecomandero | bit | YES | - |
| 235 | autorizacioncancelaproductorapido | bit | YES | - |
| 236 | hotelpropina | varchar(15) | YES | - |
| 237 | hotelbasededatos | varchar(40) | YES | - |
| 238 | idsucursalmonedero | varchar(15) | YES | - |
| 239 | autorizaciondeslizartarjeta | bit | YES | - |
| 240 | autorizacioncambiarmesero | bit | YES | - |
| 241 | tipopuntoselectronicos | numeric(2,0) | YES | - |
| 242 | autorizacioncargo | bit | YES | - |
| 243 | iva | numeric(5,2) | YES | - |
| 244 | autorizacionacumularpuntos | bit | YES | - |
| 245 | autorizacionpagoconpuntos | bit | YES | - |
| 246 | autorizaciongruposcaptura | bit | YES | - |
| 247 | autorizacionventacredito | bit | YES | - |
| 248 | deshabilitarmesa | bit | YES | - |
| 249 | payworksvaruserid | varchar(250) | YES | - |
| 250 | payworksvarorderid | varchar(250) | YES | - |
| 251 | payworksvaruseriddolar | varchar(250) | YES | - |
| 252 | payworksvarorderiddolar | varchar(250) | YES | - |
| 253 | payworksvaruseriddiferido | varchar(250) | YES | - |
| 254 | payworksvarorderiddiferido | varchar(250) | YES | - |

## dbo.configuracion_kds

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | kdscolorfuentenormal | numeric(4,0) | YES | - |
| 2 | kdscolorfondonormal | numeric(4,0) | YES | - |
| 3 | kdscolorfuentefoco | numeric(4,0) | YES | - |
| 4 | kdscolorfondofoco | numeric(4,0) | YES | - |
| 5 | kdscolorfuentealerta | numeric(4,0) | YES | - |
| 6 | kdscolorfondoalerta | numeric(4,0) | YES | - |
| 7 | kdscolorfuenteatrasado | numeric(4,0) | YES | - |
| 8 | kdscolorfondoatrasado | numeric(4,0) | YES | - |
| 9 | kdscolorfuentecan | numeric(4,0) | YES | - |
| 10 | kdscolorfondocan | numeric(4,0) | YES | - |
| 11 | kdsnumcuadros | numeric(4,0) | YES | - |
| 12 | kdstiemporefresco | numeric(4,0) | YES | - |
| 13 | kdstimerenabled | bit | YES | - |
| 14 | kdskeyboardenabled | bit | YES | - |
| 15 | imprimircomanda | bit | YES | - |
| 16 | autocuttercomanda | bit | YES | - |
| 17 | impresoracomanda | varchar(100) | YES | - |

## dbo.configuracion_ws

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | configuracion_vigencia | int | YES | - |
| 2 | configuracion_actualizacion | int | YES | - |
| 3 | configuracion_icono | bit | YES | - |
| 4 | configuracion_codigos | int | YES | - |
| 5 | configuracion_url_personalizada | varchar(100) | YES | - |
| 6 | configuracion_cierre_fiscal | bit | YES | - |
| 7 | configuracion_cierre_mensual | bit | YES | - |
| 8 | ws_usuario | varchar(150) | YES | - |
| 9 | ws_password | varchar(150) | YES | - |
| 10 | autofactura_enabled | bit | YES | - |
| 11 | reportes_enabled | bit | YES | - |
| 12 | configuracion_timeout | int | YES | - |
| 13 | configuracion_timeout_reportes | int | YES | - |
| 14 | configuracion_actualizacion_reportes | int | YES | - |
| 15 | autofactura_webservice | varchar(200) | YES | - |
| 16 | reportes_webservice | varchar(200) | YES | - |
| 17 | archivos_CFDI_enviados | bit | YES | - |
| 18 | activacion_dias | varchar(150) | YES | - |
| 19 | activacion_estatus | varchar(150) | YES | - |
| 20 | ws_dias_reportes | varchar(150) | YES | - |
| 21 | ws_estado_reportes | varchar(150) | YES | - |
| 22 | autofactura_fecha | varchar(150) | YES | - |
| 23 | reportes_fecha | varchar(150) | YES | - |
| 24 | serie_factura | varchar(6) | YES | - |
| 25 | Ultima_descarga | datetime | NO | - |
| 26 | Horas_entre_descargas | int | NO | - |
| 27 | fecha_instalacion_AF | datetime | NO | - |
| 28 | ManttoVentasActivo | bit | NO | - |

## dbo.consumodiarioinsumos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idempresa | varchar(15) | YES | - |
| 2 | idinsumo | varchar(15) | YES | - |
| 3 | consumopromdiario | numeric(12,4) | YES | - |

## dbo.cortesiasmonedero

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcortesia | varchar(5) | NO | - |
| 2 | descripcion | varchar(40) | YES | - |
| 3 | status | numeric(1,0) | YES | - |
| 4 | diasvigencia | numeric(3,0) | YES | - |

## dbo.cortesiasmonederodetalle

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcortesia | varchar(5) | YES | - |
| 2 | idproducto | varchar(15) | YES | - |
| 3 | cantidad | numeric(12,4) | YES | - |

## dbo.cortesiasmonederotarjetas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcortesia | varchar(5) | YES | - |
| 2 | numerotarjeta | varchar(16) | YES | - |
| 3 | status | numeric(1,0) | YES | - |
| 4 | fechainicio | datetime | YES | - |
| 5 | fechafin | datetime | YES | - |

## dbo.costos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | idinsumo | varchar(15) | YES | - |
| 3 | cantidad | numeric(12,4) | YES | - |
| 4 | idempresa | varchar(15) | YES | - |

## dbo.cuentas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | clavemesero | varchar(15) | YES | - |
| 2 | clavemesa | varchar(15) | YES | - |
| 3 | numeropersonas | numeric(3,0) | YES | - |
| 4 | clavearea | varchar(5) | YES | - |
| 5 | imprimir | bit | YES | - |
| 6 | estacion | varchar(80) | YES | - |
| 7 | prueba | numeric(1,0) | YES | - |
| 8 | tiposervicio | numeric(1,0) | YES | - |
| 9 | total | money | YES | - |
| 10 | formadepago | varchar(15) | YES | - |
| 11 | cantidad | money | YES | - |
| 12 | cambio | money | YES | - |
| 13 | impresoraBT | bit | YES | - |
| 14 | idmesa | nvarchar(50) | YES | - |
| 15 | editado | bit | YES | - |
| 16 | enviadosr | bit | YES | - |
| 17 | foliocuenta | numeric(10,0) | YES | - |
| 18 | descuento | money | YES | - |
| 19 | subtotal | money | YES | - |
| 20 | totalimpuesto1 | money | YES | - |
| 21 | descuentoimporte | money | YES | - |
| 22 | procesado | numeric(1,0) | YES | - |
| 23 | comentariodescuento | varchar(60) | YES | - |
| 24 | idtipodescuento | varchar(5) | YES | - |
| 25 | usuariodescuento | varchar(15) | YES | - |
| 26 | usuariopago | varchar(15) | YES | - |
| 27 | propina | money | YES | - |
| 28 | propinaincluida | money | YES | - |
| 29 | cargo | money | YES | - |
| 30 | efectivo | money | YES | - |
| 31 | tarjeta | money | YES | - |
| 32 | vales | money | YES | - |
| 33 | otros | money | YES | - |
| 34 | propinatarjeta | money | YES | - |
| 35 | numerocuenta | varchar(20) | YES | - |
| 36 | motivocancelado | varchar(100) | YES | - |
| 37 | fecha | datetime | YES | - |
| 38 | datosimpresion | varchar(max) | NO | - |
| 39 | mesaorigen | varchar(50) | NO | - |

## dbo.cuentas_procesar

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | id | int | NO | - |
| 2 | idcuenta | varchar(50) | NO | - |
| 3 | idcomanda | int | NO | - |
| 4 | productos | int | NO | - |
| 5 | contador | int | NO | - |

## dbo.cuentascontables

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcuentacontable | varchar(5) | NO | - |
| 2 | descripcion | varchar(50) | YES | - |
| 3 | tipo | numeric(1,0) | YES | - |
| 4 | clavecontable | varchar(2) | YES | - |
| 5 | clasifpoliza | numeric(1,0) | YES | - |
| 6 | indicadorimpuesto | varchar(2) | YES | - |
| 7 | cuenta | varchar(10) | YES | - |
| 8 | subcuenta | varchar(10) | YES | - |
| 9 | subsubcuenta | varchar(10) | YES | - |
| 10 | auxiliar | varchar(10) | YES | - |
| 11 | moneda | varchar(3) | YES | - |
| 12 | tipodecambio | money | YES | - |
| 13 | polizatienenumdivision | bit | YES | - |
| 14 | polizatipocentro | numeric(1,0) | YES | - |
| 15 | polizasolicitareferencia | bit | YES | - |
| 16 | usarenoperacion | numeric(2,0) | YES | - |

## dbo.cuentaspagos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | bigint | YES | - |
| 2 | idformadepago | varchar(5) | YES | - |
| 3 | importe | money | YES | - |
| 4 | propina | money | YES | - |
| 5 | tipodecambio | money | YES | - |
| 6 | referencia | varchar(80) | YES | - |

## dbo.cuentasporcobrar

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliocxc | int | NO | - |
| 2 | fecha | datetime | YES | - |
| 3 | idturno | int | YES | - |
| 4 | idcliente | varchar(15) | YES | - |
| 5 | importe | money | YES | - |
| 6 | foliocuenta | varchar(25) | YES | - |
| 7 | nota | varchar(100) | YES | - |
| 8 | cancelado | bit | YES | - |
| 9 | usuariocancelo | varchar(15) | YES | - |
| 10 | pagada | bit | YES | - |
| 11 | idempresa | varchar(15) | YES | - |
| 12 | folio | int | YES | - |
| 13 | idsecundario | varchar(15) | YES | - |

## dbo.cuentasporcobrarpagos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliocxc | numeric(9,0) | YES | - |
| 2 | idformadepago | varchar(5) | YES | - |
| 3 | importe | money | YES | - |
| 4 | propina | money | YES | - |
| 5 | tipodecambio | money | YES | - |
| 6 | referencia | varchar(80) | YES | - |
| 7 | idempresa | varchar(15) | YES | - |

## dbo.deptosventa

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | iddeptoventa | varchar(5) | NO | - |
| 2 | descripcion | varchar(50) | YES | - |
| 3 | idcuentacontable | varchar(5) | YES | - |
| 4 | idcuentacontablecostodebe | varchar(5) | YES | - |
| 5 | idcuentacontablecostohaber | varchar(5) | YES | - |

## dbo.deptosventagrupos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | iddeptoventa | varchar(5) | YES | - |
| 2 | idgrupo | varchar(5) | YES | - |

## dbo.deptosventagruposinsumos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | iddeptoventa | varchar(5) | YES | - |
| 2 | idgruposi | varchar(5) | YES | - |

## dbo.destinatarioantifraude

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | destinatario | varchar(60) | NO | - |
| 2 | tipocorreo | int | NO | - |

## dbo.destinatariocorte

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | destinatario | varchar(60) | NO | - |
| 2 | tipocorreo | int | NO | - |

## dbo.destinatarioscorreo

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | destinatario | varchar(60) | YES | - |
| 2 | tipocorreo | int | YES | - |

## dbo.detallescuentas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | clavemesa | varchar(22) | YES | - |
| 2 | clave | varchar(15) | YES | - |
| 3 | descripcion | varchar(60) | YES | - |
| 4 | nombrecorto | varchar(10) | YES | - |
| 5 | precio | money | YES | - |
| 6 | cantidad | numeric(12,4) | YES | - |
| 7 | comentario | varchar(200) | YES | - |
| 8 | tiempo | varchar(20) | YES | - |
| 9 | modificador | bit | YES | - |
| 10 | estacion | varchar(80) | YES | - |
| 11 | mitad | numeric(1,0) | YES | - |
| 12 | tiposerviciodet | numeric(1,0) | YES | - |
| 13 | enviadosr | bit | YES | - |
| 14 | descuento | numeric(6,2) | YES | - |
| 15 | movimiento | int | YES | - |
| 16 | separador | bit | YES | - |
| 17 | comentariodescuento | varchar(60) | YES | - |
| 18 | idtipodescuento | varchar(5) | YES | - |
| 19 | procesado | numeric(1,0) | YES | - |
| 20 | usuariodescuento | varchar(15) | YES | - |
| 21 | motivocancelado | varchar(100) | YES | - |
| 22 | cantidadcancelado | numeric(12,4) | YES | - |
| 23 | usuariocancelar | varchar(15) | YES | - |
| 24 | hora | datetime | YES | - |
| 25 | idproductocompuesto | varchar(15) | YES | - |
| 26 | productocompuestoprincipal | bit | YES | - |
| 27 | nivel | numeric(1,0) | YES | - |
| 28 | idcomanda | int | YES | - |
| 29 | comanda | varchar(10) | NO | - |

## dbo.direccionesdomicilio

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | iddireccion | varchar(15) | NO | - |
| 2 | idcliente | varchar(15) | YES | - |
| 3 | idcolonia | varchar(5) | YES | - |
| 4 | delegacion | varchar(60) | YES | - |
| 5 | calle | varchar(80) | YES | - |
| 6 | cruzamiento1 | varchar(100) | YES | - |
| 7 | cruzamiento2 | varchar(100) | YES | - |
| 8 | numeroexterior | varchar(10) | YES | - |
| 9 | numerointerior | varchar(10) | YES | - |
| 10 | codigopostal | varchar(15) | YES | - |
| 11 | ciudad | varchar(60) | YES | - |
| 12 | estado | varchar(30) | YES | - |
| 13 | pais | varchar(30) | YES | - |
| 14 | referencia | varchar(250) | YES | - |

## dbo.elaborados

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idelaborado | varchar(15) | YES | - |
| 2 | idinsumo | varchar(15) | YES | - |
| 3 | cantidad | numeric(12,4) | YES | - |

## dbo.empresa_proveedor

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idempresa | varchar(15) | YES | - |
| 2 | idproveedor | varchar(15) | YES | - |
| 3 | descarga | bit | YES | - |

## dbo.empresas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idempresa | varchar(15) | NO | - |
| 2 | nombre | varchar(60) | YES | - |
| 3 | razonsocial | varchar(200) | YES | - |
| 4 | direccion | varchar(120) | YES | - |
| 5 | sucursal | varchar(120) | YES | - |
| 6 | rfc | varchar(15) | YES | - |
| 7 | curp | varchar(20) | YES | - |
| 8 | telefono | varchar(60) | YES | - |
| 9 | giro | varchar(60) | YES | - |
| 10 | contacto | varchar(60) | YES | - |
| 11 | fax | varchar(30) | YES | - |
| 12 | email | varchar(60) | YES | - |
| 13 | fechacompra | datetime | YES | - |
| 14 | distribuidor | varchar(80) | YES | - |
| 15 | numerofactura | varchar(10) | YES | - |
| 16 | numerodecontrol | varchar(60) | YES | - |
| 17 | contrasenacontrol | varchar(30) | YES | - |
| 18 | idhardware | varchar(40) | YES | - |
| 19 | licenciaprincipal | varchar(30) | YES | - |
| 20 | licenciamonederoelectronico | varchar(30) | YES | - |
| 21 | licenciamonitorproduccion | varchar(30) | YES | - |
| 22 | licenciasrmovil | varchar(30) | YES | - |
| 23 | licenciamanttoventas | varchar(30) | YES | - |
| 24 | licenciapagoenlinea | varchar(30) | YES | - |
| 25 | licenciahuelladigital | varchar(30) | YES | - |
| 26 | licenciabillar | varchar(30) | YES | - |
| 27 | franquicia | bit | YES | - |
| 28 | web | varchar(50) | YES | - |
| 29 | ciudad | varchar(30) | YES | - |
| 30 | estado | varchar(30) | YES | - |
| 31 | pais | varchar(30) | YES | - |
| 32 | ciudadsucursal | varchar(30) | YES | - |
| 33 | estadosucursal | varchar(30) | YES | - |
| 34 | passwordempresa | varchar(15) | YES | - |
| 35 | escedis | bit | YES | - |
| 36 | idproveedor | varchar(15) | YES | - |
| 37 | escorporativo | bit | YES | - |
| 38 | codigopostal | varchar(15) | YES | - |
| 39 | ventapedidocedis | bit | YES | - |
| 40 | descuentocedis | numeric(6,2) | YES | - |
| 41 | idtipoempresa | varchar(15) | YES | - |
| 42 | idregionempresa | varchar(15) | YES | - |
| 43 | idestado | varchar(15) | YES | - |
| 44 | idpais | varchar(15) | YES | - |
| 45 | claveunicaempresa | varchar(50) | YES | - |
| 46 | regimen | varchar(100) | YES | - |
| 47 | idempresahub | varchar(50) | YES | - |
| 48 | logohub | image | YES | - |
| 49 | logoempresa | varchar(max) | NO | - |
| 50 | logoempresaext | varchar(10) | NO | - |
| 51 | prefijoempresa | varchar(3) | NO | - |

## dbo.empresas_regalias_config

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idempresa | varchar(15) | NO | - |
| 2 | aplicarregalias | bit | YES | - |
| 3 | aplicarcannon | bit | YES | - |
| 4 | montocannon | decimal(18,0) | YES | - |
| 5 | aplicarroyalties | bit | YES | - |
| 6 | esquema | smallint | YES | - |
| 7 | monto | decimal(18,0) | YES | - |
| 8 | porcentaje | decimal(18,0) | YES | - |

## dbo.empresasvi

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idempresavi | varchar(15) | NO | - |
| 2 | nombre | varchar(60) | YES | - |
| 3 | idcuentacontable | varchar(5) | YES | - |

## dbo.empresasvp

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idempresavp | varchar(15) | NO | - |
| 2 | nombre | varchar(60) | YES | - |
| 3 | rangoinicial | numeric(15,0) | YES | - |
| 4 | rangofinal | numeric(15,0) | YES | - |
| 5 | idcuentacontable | varchar(5) | YES | - |

## dbo.encuestas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idencuesta | varchar(3) | NO | - |
| 2 | titulo | varchar(50) | YES | - |
| 3 | pregunta1 | varchar(50) | YES | - |
| 4 | resp11 | varchar(30) | YES | - |
| 5 | resp12 | varchar(30) | YES | - |
| 6 | resp13 | varchar(30) | YES | - |
| 7 | pregunta2 | varchar(50) | YES | - |
| 8 | resp21 | varchar(30) | YES | - |
| 9 | resp22 | varchar(30) | YES | - |
| 10 | resp23 | varchar(30) | YES | - |
| 11 | pregunta3 | varchar(50) | YES | - |
| 12 | resp31 | varchar(30) | YES | - |
| 13 | resp32 | varchar(30) | YES | - |
| 14 | resp33 | varchar(30) | YES | - |
| 15 | pregunta4 | varchar(50) | YES | - |
| 16 | resp41 | varchar(30) | YES | - |
| 17 | resp42 | varchar(30) | YES | - |
| 18 | resp43 | varchar(30) | YES | - |
| 19 | pregunta5 | varchar(50) | YES | - |
| 20 | resp51 | varchar(30) | YES | - |
| 21 | resp52 | varchar(30) | YES | - |
| 22 | resp53 | varchar(30) | YES | - |
| 23 | pregunta6 | varchar(50) | YES | - |
| 24 | resp61 | varchar(30) | YES | - |
| 25 | resp62 | varchar(30) | YES | - |
| 26 | resp63 | varchar(30) | YES | - |

## dbo.estaciones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idestacion | varchar(40) | NO | - |
| 2 | descripcion | varchar(50) | YES | - |
| 3 | serie | varchar(30) | YES | - |
| 4 | ip | varchar(200) | YES | - |
| 5 | estado | varchar(200) | YES | - |
| 6 | seriefolio | varchar(15) | YES | - |
| 7 | bloqueararearestaurant | bit | YES | - |
| 8 | idarearestaurant | varchar(4) | YES | - |
| 9 | mostrarcumpleaños | bit | YES | - |
| 10 | esconderescritorio | bit | YES | - |
| 11 | esconderbarra | bit | YES | - |
| 12 | impresoracheques | varchar(50) | YES | - |
| 13 | impresoranotas | varchar(50) | YES | - |
| 14 | impresorafacturas | varchar(50) | YES | - |
| 15 | saltosimpresoracheques | int | YES | - |
| 16 | saltosimpresoranotas | int | YES | - |
| 17 | usacutterimpresoracheques | bit | YES | - |
| 18 | usacutterimpresoranotas | bit | YES | - |
| 19 | usacajondedinero | bit | YES | - |
| 20 | cajonascii | varchar(20) | YES | - |
| 21 | cajonpuerto | int | YES | - |
| 22 | cajontipo | int | YES | - |
| 23 | cajontiempo | int | YES | - |
| 24 | cajonimpresora | varchar(50) | YES | - |
| 25 | cajontipoconexion | int | YES | - |
| 26 | cajacomandero | varchar(80) | YES | - |
| 27 | impventasempezar1 | varchar(3) | YES | - |
| 28 | impventasempezar2 | varchar(3) | YES | - |
| 29 | impventasempezar3 | varchar(3) | YES | - |
| 30 | impventasempezar4 | varchar(3) | YES | - |
| 31 | impventasempezar5 | varchar(8) | YES | - |
| 32 | impventasfinalizar1 | varchar(3) | YES | - |
| 33 | impventasfinalizar2 | varchar(3) | YES | - |
| 34 | impventasfinalizar3 | varchar(3) | YES | - |
| 35 | impventasfinalizar4 | varchar(3) | YES | - |
| 36 | impventasfinalizar5 | varchar(3) | YES | - |
| 37 | impnotasempezar1 | varchar(3) | YES | - |
| 38 | impnotasempezar2 | varchar(3) | YES | - |
| 39 | impnotasempezar3 | varchar(3) | YES | - |
| 40 | impnotasempezar4 | varchar(3) | YES | - |
| 41 | impnotasempezar5 | varchar(3) | YES | - |
| 42 | impnotasfinalizar1 | varchar(3) | YES | - |
| 43 | impnotasfinalizar2 | varchar(3) | YES | - |
| 44 | impnotasfinalizar3 | varchar(3) | YES | - |
| 45 | impnotasfinalizar4 | varchar(3) | YES | - |
| 46 | impnotasfinalizar5 | varchar(3) | YES | - |
| 47 | impfacempezar1 | varchar(3) | YES | - |
| 48 | impfacempezar2 | varchar(3) | YES | - |
| 49 | impfacempezar3 | varchar(3) | YES | - |
| 50 | impfacempezar4 | varchar(3) | YES | - |
| 51 | impfacempezar5 | varchar(3) | YES | - |
| 52 | impfacfinalizar1 | varchar(3) | YES | - |
| 53 | impfacfinalizar2 | varchar(3) | YES | - |
| 54 | impfacfinalizar3 | varchar(3) | YES | - |
| 55 | impfacfinalizar4 | varchar(3) | YES | - |
| 56 | impfacfinalizar5 | varchar(3) | YES | - |
| 57 | idformatofacturafiscal | int | YES | - |
| 58 | idformatofacturapublico | int | YES | - |
| 59 | estacionpocket | bit | YES | - |
| 60 | colorbotones | numeric(10,0) | YES | - |
| 61 | colorpantallas | numeric(10,0) | YES | - |
| 62 | colorcuadrosdetexto | numeric(10,0) | YES | - |
| 63 | tipodeimpresionfactura | int | YES | - |
| 64 | seriefacturacion | varchar(15) | YES | - |
| 65 | usarturnoestacion | int | YES | - |
| 66 | buscaractualizaciones | bit | YES | - |
| 67 | directorioactualizaciones | varchar(150) | YES | - |
| 68 | nombrearchivoexportacion | varchar(80) | YES | - |
| 69 | directoriorespaldo | varchar(150) | YES | - |
| 70 | directoriopoliza | varchar(150) | YES | - |
| 71 | directorioexportacion | varchar(150) | YES | - |
| 72 | numeroestacion | int | YES | - |
| 73 | nombrepuntodeventa | varchar(40) | YES | - |
| 74 | serieimpresoracuentas | varchar(40) | YES | - |
| 75 | posnoterminal | varchar(15) | YES | - |
| 76 | rutasonido | varchar(150) | YES | - |
| 77 | sonidomonitor | bit | YES | - |
| 78 | usarbascula | bit | YES | - |
| 79 | basculapuerto | int | YES | - |
| 80 | basculabitsegundo | varchar(10) | YES | - |
| 81 | basculabitdatos | varchar(10) | YES | - |
| 82 | basculaparidad | varchar(10) | YES | - |
| 83 | basculabitdeparada | varchar(10) | YES | - |
| 84 | facturaslineasencabezado | int | YES | - |
| 85 | facturaslineaspiedepagina | int | YES | - |
| 86 | facturassumarlineascuerpoapie | bit | YES | - |
| 87 | autorizacionacceso | int | YES | - |
| 88 | autorizacioneventos | int | YES | - |
| 89 | autorizacioncomandero | int | YES | - |
| 90 | ejecutararchivocierre | bit | YES | - |
| 91 | nombrearchivoejecutarcierre | varchar(150) | YES | - |
| 92 | enlacesoftencuestas | bit | YES | - |
| 93 | impresorafiscal | bit | YES | - |
| 94 | fiscalport | int | YES | - |
| 95 | paridadxsegfiscal | int | YES | - |
| 96 | idcallactivo | bit | YES | - |
| 97 | idcallpuerto | int | YES | - |
| 98 | idcallbitsegundo | varchar(10) | YES | - |
| 99 | idcallbitdatos | varchar(10) | YES | - |
| 100 | idcallparidad | varchar(10) | YES | - |
| 101 | idcallbitdeparada | varchar(50) | YES | - |
| 102 | paisimpresorafiscal | int | YES | - |
| 103 | visorinstalado | bit | YES | - |
| 104 | visorpuerto | int | YES | - |
| 105 | visormensaje | bit | YES | - |
| 106 | mensajeespera | varchar(40) | YES | - |
| 107 | idcallnorma | int | YES | - |
| 108 | monitorteclaarriba | varchar(5) | YES | - |
| 109 | monitorteclafinalizar | varchar(5) | YES | - |
| 110 | monitorteclaregresar | varchar(5) | YES | - |
| 111 | monitorteclaprimero | varchar(5) | YES | - |
| 112 | monitorteclaabajo | varchar(5) | YES | - |
| 113 | monitorteclaultimo | varchar(5) | YES | - |
| 114 | monitorteclaactualizar | varchar(5) | YES | - |
| 115 | monitorteclaadmonanterior | varchar(5) | YES | - |
| 116 | monitorteclaadmonsiguiente | varchar(5) | YES | - |
| 117 | monitorteclaadmonizquierda | varchar(5) | YES | - |
| 118 | monitorteclaadmonderecha | varchar(5) | YES | - |
| 119 | monitorteclaadmonactualizar | varchar(5) | YES | - |
| 120 | monitorteclaadmonconsultaorden | varchar(5) | YES | - |
| 121 | monitorteclaadmoncerrarconsulta | varchar(5) | YES | - |
| 122 | monitorteclaadmonfinorden | varchar(5) | YES | - |
| 123 | intervalosonidoexcedidomonitor | numeric(4,1) | YES | - |
| 124 | monitorimprimircomanda | bit | YES | - |
| 125 | monitorimpresoracomandas | varchar(60) | YES | - |
| 126 | monitorimpresoraautocutter | bit | YES | - |
| 127 | monitoriniciarmodulo | int | YES | - |
| 128 | monitorordenamientoproductos | int | YES | - |
| 129 | tarjetacredito | bit | YES | - |
| 130 | tipodispositivo | int | YES | - |
| 131 | pinpadpuertocom | varchar(10) | YES | - |
| 132 | pinpadbitsxsegundo | varchar(10) | YES | - |
| 133 | pinpadparidad | varchar(1) | YES | - |
| 134 | pinpadbitsdeparada | varchar(3) | YES | - |
| 135 | pinpadbitsdedatos | varchar(1) | YES | - |
| 136 | tipoimpresoracuentas | int | YES | - |
| 137 | tipoimpresoranotas | int | YES | - |
| 138 | fiscalimpcambio | int | YES | - |
| 139 | fiscalimpcantximporte | int | YES | - |
| 140 | sonidomonitortiempoexcedido | bit | YES | - |
| 141 | rutasonidotiempoexcedido | varchar(150) | YES | - |
| 142 | tipoimpresioncomandamonitor | int | YES | - |
| 143 | idempresa | varchar(15) | YES | - |
| 144 | usartipoventarapida | numeric(1,0) | YES | - |
| 145 | actualizarcatalogos | bit | YES | - |
| 146 | enviarcomandosdeimpresion | numeric(1,0) | YES | - |
| 147 | comandoantesimprimir1 | varchar(30) | YES | - |
| 148 | comandoantesimprimir2 | varchar(30) | YES | - |
| 149 | comandoantescopia1 | varchar(30) | YES | - |
| 150 | comandoantescopia2 | varchar(30) | YES | - |
| 151 | actualizaclientes | bit | YES | - |
| 152 | rutatemporal | varchar(255) | YES | - |
| 153 | fenombreformatopublico | varchar(50) | YES | - |
| 154 | fenombreformatoempresa | varchar(50) | YES | - |
| 155 | feimpresoragrafico | varchar(250) | YES | - |
| 156 | lectordehuellainstalado | int | YES | - |
| 157 | autorizacioncuentasporcobrar | numeric(1,0) | YES | - |
| 158 | logofiscal | numeric(4,0) | YES | - |
| 159 | densidadlogo | numeric(4,0) | YES | - |
| 160 | idarearestaurantrapido | varchar(5) | YES | - |
| 161 | idarearestaurantdomicilio | varchar(5) | YES | - |
| 162 | monprodincluirtodas | bit | YES | - |
| 163 | impfiscalvalidaitems | bit | YES | - |
| 164 | monitorimprimircomandamoduloadmin | bit | YES | - |
| 165 | tipo | varchar(100) | YES | - |
| 166 | serieimpresora | varchar(10) | YES | - |
| 167 | fecharev | varchar(10) | YES | - |
| 168 | rev | varchar(4) | YES | - |
| 169 | accesocentral | bit | YES | - |
| 170 | bloquearteclado | bit | YES | - |
| 171 | servidoraplicacionessucursal | bit | YES | - |
| 172 | servidoraplicaciones | bit | YES | - |
| 173 | actualizarcatalogosmovil | bit | YES | - |
| 174 | ejecarchnvacta | int | NO | - |
| 175 | archejecnvacta | varchar(200) | NO | - |
| 176 | paramejecnvacta | varchar(60) | NO | - |
| 177 | ejecarchreimpresioncta | int | NO | - |
| 178 | archejecreimpresioncta | varchar(200) | NO | - |
| 179 | paramejecreimpresioncta | varchar(60) | NO | - |
| 180 | ejecarchcancelcta | int | NO | - |
| 181 | archejeccancelcta | varchar(200) | NO | - |
| 182 | paramejeccancelcta | varchar(60) | NO | - |
| 183 | ejecarchreabrircta | int | NO | - |
| 184 | archejecreabrircta | varchar(200) | NO | - |
| 185 | paramejecreabrircta | varchar(60) | NO | - |

## dbo.estacionesalmacen

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | NO | - |
| 2 | idestacion | varchar(40) | NO | - |
| 3 | idalmacen | varchar(5) | NO | - |

## dbo.estacionesareas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idestacion | varchar(40) | YES | - |
| 2 | idarea | varchar(4) | YES | - |
| 3 | impresora | varchar(60) | YES | - |
| 4 | imprimir | bit | YES | - |
| 5 | saltos | numeric(2,0) | YES | - |
| 6 | autocutter | bit | YES | - |
| 7 | empezarimp1 | varchar(3) | YES | - |
| 8 | empezarimp2 | varchar(3) | YES | - |
| 9 | empezarimp3 | varchar(3) | YES | - |
| 10 | empezarimp4 | varchar(3) | YES | - |
| 11 | empezarimp5 | varchar(3) | YES | - |
| 12 | finalizarimp1 | varchar(3) | YES | - |
| 13 | finalizarimp2 | varchar(3) | YES | - |
| 14 | finalizarimp3 | varchar(3) | YES | - |
| 15 | finalizarimp4 | varchar(3) | YES | - |
| 16 | finalizarimp5 | varchar(3) | YES | - |
| 17 | impresion | numeric(1,0) | YES | - |
| 18 | comedor | bit | YES | - |
| 19 | domicilio | bit | YES | - |
| 20 | rapido | bit | YES | - |
| 21 | tipodeimpresioncomanda | varchar(1) | YES | - |
| 22 | nombrereportecomanda | varchar(150) | YES | - |
| 23 | copias | numeric(2,0) | YES | - |

## dbo.estados

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idestado | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |
| 3 | idpais | varchar(15) | YES | - |

## dbo.etiquetaslenguaje

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | id | numeric(10,0) | NO | - |
| 2 | ididioma | numeric(2,0) | YES | - |
| 3 | idetiqueta | numeric(10,0) | YES | - |
| 4 | valor | varchar(255) | YES | - |
| 5 | descripcion | varchar(255) | YES | - |

## dbo.facturas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idfactura | numeric(10,0) | NO | - |
| 2 | serie | varchar(15) | YES | - |
| 3 | folio | numeric(10,0) | YES | - |
| 4 | fecha | datetime | YES | - |
| 5 | idcliente | varchar(15) | YES | - |
| 6 | nota | text | YES | - |
| 7 | cancelada | bit | YES | - |
| 8 | subtotal | money | YES | - |
| 9 | impuesto | money | YES | - |
| 10 | propina | money | YES | - |
| 11 | total | money | YES | - |
| 12 | concepto | varchar(180) | YES | - |
| 13 | usuariocancelo | varchar(15) | YES | - |
| 14 | idturno | numeric(6,0) | YES | - |
| 15 | impresiones | numeric(3,0) | YES | - |
| 16 | codigocontrolbolivia | varchar(30) | YES | - |
| 17 | propinafacturada | bit | YES | - |
| 18 | idempresa | varchar(15) | YES | - |
| 19 | femexelectronico | bit | YES | - |
| 20 | femextipocliente | numeric(1,0) | YES | - |
| 21 | femexxmlvalido | text | YES | - |
| 22 | femexcadenaoriginal | text | YES | - |
| 23 | femexsello | text | YES | - |
| 24 | femexnumcertificado | varchar(50) | YES | - |
| 25 | femexanioaprobacion | numeric(4,0) | YES | - |
| 26 | femexnumaprobacion | varchar(30) | YES | - |
| 27 | fechacancelacion | smalldatetime | YES | - |
| 28 | femexdeclarado | bit | YES | - |
| 29 | femexdeclaradocancelado | bit | YES | - |
| 30 | femexmodogenerado | numeric(1,0) | YES | - |
| 31 | femexrfc | varchar(20) | YES | - |
| 32 | femexcbb | image | YES | - |
| 33 | tipoesquema | numeric(1,0) | YES | - |
| 34 | uidtimbre | text | YES | - |
| 35 | TimbrenoCertificadoSAT | text | YES | - |
| 36 | TimbreFechaTimbrado | char(25) | YES | - |
| 37 | TimbreselloCFD | text | YES | - |
| 38 | TimbreselloSAT | text | YES | - |
| 39 | TimbreCadenaOriginal | text | YES | - |
| 40 | ImagenCFDI | image | YES | - |
| 41 | femexretencion1 | money | YES | - |
| 42 | femexretencion2 | money | YES | - |
| 43 | femexretencion3 | money | YES | - |
| 44 | ncf | varchar(19) | YES | - |
| 45 | regimen | varchar(100) | YES | - |
| 46 | formapago | varchar(200) | YES | - |
| 47 | numerocuenta | varchar(20) | YES | - |
| 48 | expedidoen | varchar(200) | YES | - |
| 49 | idunidad | varchar(200) | YES | - |
| 50 | pac_reprocesado | numeric(1,0) | YES | - |
| 51 | pac_enviado | numeric(1,0) | YES | - |
| 52 | folios_central | bit | YES | - |
| 53 | pac | int | NO | - |
| 54 | acusecancelacion | text | NO | - |
| 55 | RIFDetallado | bit | NO | - |

## dbo.facturascfdipendientesregistrar

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | id | int | NO | - |
| 2 | idfactura | numeric(10,0) | YES | - |
| 3 | procesado | numeric(1,0) | YES | - |
| 4 | fecha | datetime | YES | - |
| 5 | fechaprocesado | datetime | YES | - |
| 6 | observaciones | varchar(250) | YES | - |

## dbo.facturasmovtos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idfactura | numeric(10,0) | YES | - |
| 2 | cantidad | numeric(12,4) | YES | - |
| 3 | idproducto | varchar(15) | YES | - |
| 4 | precio | money | YES | - |
| 5 | descuento | numeric(5,2) | YES | - |
| 6 | impuesto | numeric(5,2) | YES | - |
| 7 | descripcion | varchar(200) | YES | - |
| 8 | retencion1 | numeric(5,2) | YES | - |
| 9 | retencion2 | numeric(5,2) | YES | - |
| 10 | retencion3 | numeric(5,2) | YES | - |
| 11 | idunidad | varchar(50) | YES | - |

## dbo.folios

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | serie | varchar(15) | YES | - |
| 2 | ultimofolio | numeric(10,0) | YES | - |
| 3 | ultimaorden | numeric(6,0) | YES | - |
| 4 | ultimofolionotadeconsumo | numeric(10,0) | YES | - |
| 5 | ultimofolioproduccion | numeric(6,0) | YES | - |
| 6 | autorizacion | varchar(50) | YES | - |
| 7 | fechalimite | datetime | YES | - |
| 8 | rangoautinicio | numeric(8,0) | YES | - |
| 9 | rangoautfin | numeric(8,0) | YES | - |

## dbo.foliosalmacen

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | bigint | NO | - |
| 2 | idalmacen | varchar(5) | YES | - |
| 3 | folioalmacen | numeric(10,0) | YES | - |
| 4 | foliomovto | numeric(10,0) | YES | - |
| 5 | fecha | datetime | YES | - |
| 6 | cancelado | bit | YES | - |
| 7 | usuariocancelo | varchar(15) | YES | - |
| 8 | usuario | varchar(15) | YES | - |
| 9 | nota | varchar(150) | YES | - |
| 10 | idempresa | varchar(15) | YES | - |

## dbo.foliosfacturados

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idfactura | numeric(10,0) | YES | - |
| 2 | folio | bigint | YES | - |
| 3 | porcentajefac | numeric(5,2) | YES | - |

## dbo.foliosfacturas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | serie | varchar(15) | YES | - |
| 2 | ultimofolio | numeric(10,0) | YES | - |
| 3 | electronico | bit | YES | - |
| 4 | consecutivoinicio | numeric(10,0) | YES | - |
| 5 | consecutivofin | numeric(10,0) | YES | - |
| 6 | anioaprobacion | numeric(4,0) | YES | - |
| 7 | numaprobacion | varchar(30) | YES | - |
| 8 | estatus | bit | YES | - |
| 9 | cbb | image | YES | - |
| 10 | tipoesquema | numeric(1,0) | YES | - |
| 11 | idempresa | varchar(15) | YES | - |
| 12 | fechaaprobacion | varchar(10) | YES | - |
| 13 | ultimofoliocentral | varchar(250) | YES | - |

## dbo.formasdepago

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idformadepago | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | tipo | numeric(1,0) | YES | - |
| 4 | tipodecambio | money | YES | - |
| 5 | solicitareferencia | bit | YES | - |
| 6 | prioridadboton | numeric(2,0) | YES | - |
| 7 | cuentacontableimporte | varchar(5) | YES | - |
| 8 | cuentacontablecomision | varchar(5) | YES | - |
| 9 | cuentacontableivacomision | varchar(5) | YES | - |
| 10 | comision | numeric(5,2) | YES | - |
| 11 | visible | bit | YES | - |
| 12 | aceptapropina | bit | YES | - |
| 13 | subtipo | numeric(1,0) | YES | - |
| 14 | prefijo1 | varchar(3) | YES | - |
| 15 | prefijo2 | varchar(3) | YES | - |
| 16 | codigodeprefijoconsulta | varchar(10) | YES | - |
| 17 | codigodeprefijoacumred | varchar(10) | YES | - |
| 18 | generapuntos | bit | YES | - |
| 19 | formatoimpresion | numeric(2,0) | YES | - |
| 20 | idfpagofiscal | numeric(10,0) | YES | - |
| 21 | pagoenlinea | numeric(1,0) | YES | - |
| 22 | tipotarjeta | numeric(1,0) | YES | - |
| 23 | imagen | image | YES | - |
| 24 | nofacturable | bit | YES | - |
| 25 | comisionreporte1 | numeric(5,2) | YES | - |
| 26 | comisionreporte2 | numeric(5,2) | YES | - |

## dbo.formatofacturas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idformato | numeric(3,0) | YES | - |
| 2 | fila | numeric(3,0) | YES | - |
| 3 | columna | numeric(3,0) | YES | - |
| 4 | campo | varchar(250) | YES | - |
| 5 | tipo | numeric(1,0) | YES | - |

## dbo.formatos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | formato | numeric(1,0) | YES | - |
| 2 | tipo | numeric(1,0) | YES | - |
| 3 | campo | numeric(3,0) | YES | - |
| 4 | linea | numeric(3,0) | YES | - |
| 5 | columna | numeric(3,0) | YES | - |
| 6 | caracteres | numeric(3,0) | YES | - |
| 7 | leyenda | varchar(250) | YES | - |
| 8 | idcomando | varchar(5) | YES | - |
| 9 | alineacion | varchar(5) | YES | - |

## dbo.formatosvarios

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idformato | numeric(3,0) | YES | - |
| 2 | fila | numeric(3,0) | YES | - |
| 3 | columna | numeric(3,0) | YES | - |
| 4 | campo | varchar(200) | YES | - |

## dbo.gastos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idgasto | numeric(7,0) | NO | - |
| 2 | fecha | datetime | YES | - |
| 3 | idcuentacontable | varchar(5) | YES | - |
| 4 | referencia | varchar(50) | YES | - |
| 5 | descuento | numeric(5,2) | YES | - |
| 6 | usuario | varchar(15) | YES | - |
| 7 | cancelado | bit | YES | - |
| 8 | usuariocancelo | varchar(15) | YES | - |
| 9 | idcompra | bigint | YES | - |
| 10 | Idtipogasto | varchar(5) | YES | - |
| 11 | idempresa | varchar(15) | YES | - |

## dbo.gastosmovtos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idgasto | numeric(7,0) | YES | - |
| 2 | cantidad | numeric(8,3) | YES | - |
| 3 | descripcion | varchar(50) | YES | - |
| 4 | costo | money | YES | - |
| 5 | descuento | numeric(5,2) | YES | - |
| 6 | iva | numeric(5,2) | YES | - |

## dbo.grupoformasdepago

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idgrupoformadepago | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |

## dbo.grupoformasdepagodet

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | iddetalle | numeric(11,0) | NO | - |
| 2 | idgrupoformadepago | varchar(5) | YES | - |
| 3 | idformadepago | varchar(5) | YES | - |

## dbo.grupos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idgrupo | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | clasificacion | numeric(1,0) | YES | - |
| 4 | prioridad | numeric(4,0) | YES | - |
| 5 | color | numeric(10,0) | YES | - |
| 6 | colorletra | numeric(10,0) | YES | - |
| 7 | prioridadimpresion | numeric(4,0) | YES | - |
| 8 | cambiacolorcuenta | bit | YES | - |
| 9 | colorcuenta | numeric(10,0) | YES | - |
| 10 | colorletracuenta | numeric(10,0) | YES | - |
| 11 | solicitaautorizacion | bit | YES | - |
| 12 | imagenmenuelectronico | image | YES | - |
| 13 | extmenu | varchar(5) | YES | - |

## dbo.gruposdeproductosvisibles

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idestacion | varchar(40) | YES | - |
| 2 | idgrupo | varchar(5) | YES | - |
| 3 | visible | bit | YES | - |
| 4 | visiblesiempre | bit | YES | - |
| 5 | lunesinicio | varchar(11) | YES | - |
| 6 | lunesfin | varchar(11) | YES | - |
| 7 | lunesdiafin | numeric(1,0) | YES | - |
| 8 | martesinicio | varchar(11) | YES | - |
| 9 | martesfin | varchar(11) | YES | - |
| 10 | martesdiafin | numeric(1,0) | YES | - |
| 11 | miercolesinicio | varchar(11) | YES | - |
| 12 | miercolesfin | varchar(11) | YES | - |
| 13 | miercolesdiafin | numeric(1,0) | YES | - |
| 14 | juevesinicio | varchar(11) | YES | - |
| 15 | juevesfin | varchar(11) | YES | - |
| 16 | juevesdiafin | numeric(1,0) | YES | - |
| 17 | viernesinicio | varchar(11) | YES | - |
| 18 | viernesfin | varchar(11) | YES | - |
| 19 | viernesdiafin | numeric(1,0) | YES | - |
| 20 | sabadoinicio | varchar(11) | YES | - |
| 21 | sabadofin | varchar(11) | YES | - |
| 22 | sabadodiafin | numeric(1,0) | YES | - |
| 23 | domingoinicio | varchar(11) | YES | - |
| 24 | domingofin | varchar(11) | YES | - |
| 25 | domingodiafin | numeric(1,0) | YES | - |
| 26 | aplicalunes | bit | YES | - |
| 27 | aplicamartes | bit | YES | - |
| 28 | aplicamiercoles | bit | YES | - |
| 29 | aplicajueves | bit | YES | - |
| 30 | aplicaviernes | bit | YES | - |
| 31 | aplicasabado | bit | YES | - |
| 32 | aplicadomingo | bit | YES | - |

## dbo.gruposi

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idgruposi | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | idgruposiclasificacion | varchar(5) | YES | - |
| 4 | idcuentacontable | varchar(5) | YES | - |
| 5 | idtipopedido | varchar(5) | YES | - |

## dbo.gruposiclasificacion

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idgruposiclasificacion | varchar(5) | NO | - |
| 2 | descripcion | varchar(20) | YES | - |
| 3 | clasificacionventa | numeric(1,0) | YES | - |

## dbo.gruposmodificadores

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idgruposmodificadores | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |

## dbo.gruposmodificadoresproductos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | idgruposmodificadores | varchar(5) | YES | - |
| 3 | incluidos | numeric(5,1) | YES | - |
| 4 | prioridad | numeric(2,0) | YES | - |
| 5 | forzarcaptura | bit | YES | - |
| 6 | maximomodificadores | smallint | YES | - |
| 7 | idempresa | varchar(15) | YES | - |

## dbo.grupossubgrupos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idgrupo | varchar(5) | YES | - |
| 2 | idsubgrupo | varchar(4) | YES | - |

## dbo.HORARIOCORTE

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | horainicial | varchar(11) | YES | - |
| 2 | horafinal | varchar(11) | YES | - |
| 3 | horaenvio | varchar(11) | YES | - |
| 4 | diasiguiente | bit | YES | - |

## dbo.horariosturnos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idhorarioturno | int | YES | - |
| 2 | descripcionturno | varchar(30) | YES | - |
| 3 | horainicial | varchar(11) | YES | - |
| 4 | horafinal | varchar(11) | YES | - |
| 5 | diasiguiente | bit | YES | - |

## dbo.hotelmovtos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | fecha | datetime | YES | - |
| 2 | referencia | varchar(15) | YES | - |
| 3 | habitacion | varchar(15) | YES | - |
| 4 | subtotal | money | YES | - |
| 5 | impuesto | money | YES | - |
| 6 | propina | money | YES | - |
| 7 | total | money | YES | - |
| 8 | cancelado | bit | YES | - |
| 9 | idmovtosh | numeric(10,0) | YES | - |

## dbo.huellaclientes

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcliente | varchar(15) | YES | - |
| 2 | huella | text | YES | - |
| 3 | huella2 | text | YES | - |
| 4 | pic | image | YES | - |
| 5 | tipolector | int | YES | - |

## dbo.huellameseros

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmesero | varchar(4) | YES | - |
| 2 | huella | text | YES | - |
| 3 | huella2 | text | YES | - |
| 4 | pic | image | YES | - |
| 5 | tipolector | int | YES | - |

## dbo.huellausuarios

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | usuario | varchar(15) | YES | - |
| 2 | huella | text | YES | - |
| 3 | huella2 | text | YES | - |
| 4 | pic | image | YES | - |
| 5 | tipolector | int | YES | - |

## dbo.idiomas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | ididioma | numeric(2,0) | NO | - |
| 2 | descripcion | varchar(50) | YES | - |
| 3 | idiomadefault | bit | YES | - |

## dbo.idiomasticket

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | ididioma | numeric(1,0) | YES | - |
| 2 | idcampo | numeric(3,0) | YES | - |
| 3 | valor | varchar(15) | YES | - |

## dbo.impfiscalnotacreditolog

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idnota | numeric(10,0) | YES | - |
| 2 | fecha | datetime | YES | - |
| 3 | descripcion | text | YES | - |
| 4 | importe | money | YES | - |
| 5 | idturno | numeric(10,0) | YES | - |
| 6 | estacion | varchar(30) | YES | - |

## dbo.imprimefiscalpendientes

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | cheque | numeric(10,0) | YES | - |
| 2 | movimiento | numeric(10,0) | YES | - |
| 3 | tipo | numeric(10,0) | YES | - |
| 4 | estacion | varchar(100) | YES | - |

## dbo.impuestos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idinsumo | varchar(15) | NO | - |
| 2 | idregion | varchar(5) | NO | - |
| 3 | impuesto1 | numeric(7,2) | NO | - |
| 4 | impuesto2 | numeric(7,2) | NO | - |
| 5 | impuesto3 | numeric(7,2) | NO | - |

## dbo.insumos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idinsumo | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |
| 3 | idgruposi | varchar(5) | YES | - |
| 4 | unidad | varchar(10) | YES | - |
| 5 | elaborado | bit | YES | - |
| 6 | rendimientoelaborado | numeric(10,4) | YES | - |

## dbo.insumoscostoproveedor

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproveedor | varchar(15) | YES | - |
| 2 | idpresentacion | varchar(15) | YES | - |
| 3 | costo | money | YES | - |

## dbo.insumosdetalle

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idinsumo | varchar(15) | NO | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | inventariable | numeric(1,0) | YES | - |
| 4 | costo | money | YES | - |
| 5 | costopromedio | money | YES | - |
| 6 | impuesto1 | numeric(5,2) | YES | - |
| 7 | impuesto2 | numeric(5,2) | YES | - |
| 8 | impuesto3 | numeric(5,2) | YES | - |
| 9 | costoconimpuestos | money | YES | - |
| 10 | merma | numeric(5,2) | YES | - |
| 11 | descargar | bit | YES | - |

## dbo.insumospresentaciones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idinsumospresentaciones | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |
| 3 | idinsumo | varchar(15) | YES | - |
| 4 | idgruposi | varchar(5) | YES | - |
| 5 | rendimiento | numeric(12,4) | YES | - |

## dbo.insumospresentacionesdetalle

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idinsumospresentaciones | varchar(15) | NO | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | costo | money | YES | - |
| 4 | costopromedio | money | YES | - |
| 5 | idproveedor | varchar(15) | YES | - |
| 6 | impuesto1 | numeric(5,2) | YES | - |
| 7 | impuesto2 | numeric(5,2) | YES | - |
| 8 | impuesto3 | numeric(5,2) | YES | - |
| 9 | indicadorimpuesto | varchar(2) | YES | - |
| 10 | stockminimogeneral | numeric(12,4) | YES | - |
| 11 | stockmaximogeneral | numeric(12,4) | YES | - |
| 12 | estatus | numeric(1,0) | YES | - |
| 13 | descargar | bit | YES | - |
| 14 | ubicacion | varchar(150) | YES | - |

## dbo.inventariopendiente

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | fecha | datetime | YES | - |
| 2 | idconcepto | varchar(5) | YES | - |
| 3 | idinsumo | varchar(15) | YES | - |
| 4 | costo | money | YES | - |
| 5 | cantidad | numeric(12,4) | YES | - |
| 6 | idalmacen | varchar(5) | YES | - |
| 7 | idturno | numeric(6,0) | YES | - |

## dbo.invfisico

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | numeric(10,0) | NO | - |
| 2 | fecha | datetime | YES | - |
| 3 | idalmacen1 | varchar(5) | YES | - |
| 4 | idalmacen2 | varchar(5) | YES | - |
| 5 | inventarioteorico1 | money | YES | - |
| 6 | inventariofisico1 | money | YES | - |
| 7 | diferenciafisico1 | money | YES | - |
| 8 | inventarioteorico2 | money | YES | - |
| 9 | inventariofisico2 | money | YES | - |
| 10 | diferenciafisico2 | money | YES | - |
| 11 | cancelado | bit | YES | - |
| 12 | usuariocancelo | varchar(15) | YES | - |
| 13 | idempresa | varchar(15) | YES | - |
| 14 | idinventario | numeric(8,0) | YES | - |

## dbo.invfisicomovtos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | numeric(10,0) | YES | - |
| 2 | idinsumo | varchar(15) | YES | - |
| 3 | idpresentacion | varchar(15) | YES | - |
| 4 | costo | money | YES | - |
| 5 | existenciaalmacen1 | numeric(12,2) | YES | - |
| 6 | fisicoalmacen1 | numeric(12,2) | YES | - |
| 7 | diferenciaalmacen1 | numeric(12,2) | YES | - |
| 8 | existenciaalmacen2 | numeric(12,2) | YES | - |
| 9 | fisicoalmacen2 | numeric(12,2) | YES | - |
| 10 | diferenciaalmacen2 | numeric(12,2) | YES | - |

## dbo.lectores

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | clave | varchar(20) | YES | - |
| 2 | llave | varchar(20) | YES | - |
| 3 | seriefabricante | varchar(20) | YES | - |

## dbo.logcambioprecios

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | precioanterior | money | YES | - |
| 3 | precionuevo | money | YES | - |
| 4 | fecha | datetime | YES | - |
| 5 | usuario | varchar(15) | YES | - |
| 6 | idempresa | varchar(15) | YES | - |

## dbo.mapa_mesas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmapa | varchar(5) | NO | - |
| 2 | mapa | varchar(50) | NO | - |
| 3 | idarearestaurante | varchar(5) | NO | - |
| 4 | mapa_actual | smallint | NO | - |
| 5 | color_fondo | numeric(10,0) | YES | - |
| 6 | tipo_fondo | bit | YES | - |
| 7 | textura_fondo | smallint | YES | - |
| 8 | idempresa | varchar(15) | YES | - |
| 9 | idmapasistema | bigint | NO | - |

## dbo.menu

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmenu | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |

## dbo.menucomedor

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmenucomedor | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |
| 3 | idtipomenu | varchar(5) | YES | - |
| 4 | estatus | numeric(1,0) | YES | - |
| 5 | lunesinicio | varchar(11) | YES | - |
| 6 | lunesfin | varchar(11) | YES | - |
| 7 | martesinicio | varchar(11) | YES | - |
| 8 | martesfin | varchar(11) | YES | - |
| 9 | miercolesinicio | varchar(11) | YES | - |
| 10 | miercolesfin | varchar(11) | YES | - |
| 11 | juevesinicio | varchar(11) | YES | - |
| 12 | juevesfin | varchar(11) | YES | - |
| 13 | viernesinicio | varchar(11) | YES | - |
| 14 | viernesfin | varchar(11) | YES | - |
| 15 | sabadoinicio | varchar(11) | YES | - |
| 16 | sabadofin | varchar(11) | YES | - |
| 17 | domingoinicio | varchar(11) | YES | - |
| 18 | domingofin | varchar(11) | YES | - |
| 19 | aplicalunes | bit | YES | - |
| 20 | aplicamartes | bit | YES | - |
| 21 | aplicamiercoles | bit | YES | - |
| 22 | aplicajueves | bit | YES | - |
| 23 | aplicaviernes | bit | YES | - |
| 24 | aplicasabado | bit | YES | - |
| 25 | aplicadomingo | bit | YES | - |
| 26 | lunesdiasalida | numeric(1,0) | YES | - |
| 27 | martesdiasalida | numeric(1,0) | YES | - |
| 28 | miercolesdiasalida | numeric(1,0) | YES | - |
| 29 | juevesdiasalida | numeric(1,0) | YES | - |
| 30 | viernesdiasalida | numeric(1,0) | YES | - |
| 31 | sabadodiasalida | numeric(1,0) | YES | - |
| 32 | domingodiasalida | numeric(1,0) | YES | - |

## dbo.menucomedorproductos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmenucomedor | varchar(15) | YES | - |
| 2 | iddia | numeric(1,0) | YES | - |
| 3 | idproducto | varchar(15) | YES | - |
| 4 | cantidad | numeric(10,2) | YES | - |

## dbo.menuproductos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmenu | varchar(15) | YES | - |
| 2 | idproducto | varchar(15) | YES | - |

## dbo.mesas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmesa | varchar(15) | NO | - |
| 2 | idarearestaurant | varchar(5) | YES | - |
| 3 | personas | numeric(3,0) | YES | - |
| 4 | fumar | numeric(1,0) | YES | - |
| 5 | estatus_ocupacion | smallint | YES | - |
| 6 | idtipomesa | varchar(15) | YES | - |
| 7 | idempresa | varchar(15) | YES | - |
| 8 | idmesasistema | bigint | NO | - |

## dbo.mesasasignadas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmesaasignada | int | NO | - |
| 2 | idmesa | varchar(15) | YES | - |
| 3 | folio | bigint | YES | - |
| 4 | activo | smallint | YES | - |
| 5 | idmesero | varchar(4) | YES | - |

## dbo.mesasbillar

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmesa | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | estatus | bit | YES | - |

## dbo.meseros

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmeserointerno | bigint | NO | - |
| 2 | idmesero | varchar(4) | NO | - |
| 3 | nombre | varchar(60) | YES | - |
| 4 | contraseña | varchar(30) | YES | - |
| 5 | tipo | int | YES | - |
| 6 | fotografia | image | YES | - |
| 7 | visible | numeric(1,0) | YES | - |
| 8 | idempresa | varchar(15) | YES | - |
| 9 | tipoacceso | bit | YES | - |
| 10 | capturarestringidamesas | bit | YES | - |
| 11 | perfil | varchar(15) | YES | - |

## dbo.modificadores

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | idmodificador | varchar(15) | YES | - |
| 3 | precio | money | YES | - |
| 4 | idgruposmodificadores | varchar(5) | YES | - |
| 5 | idempresa | varchar(15) | YES | - |

## dbo.monedasmesero

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | denominacion | money | YES | - |

## dbo.monitoresproduccion

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmonitor | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | ipaddress | varchar(15) | YES | - |
| 4 | port | varchar(4) | YES | - |
| 5 | nummonitor | varchar(2) | YES | - |

## dbo.monitorprodestaciones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmonitor | varchar(15) | YES | - |
| 2 | idestacion | varchar(15) | YES | - |

## dbo.motivoscancelacion

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | descripcion | varchar(100) | YES | - |

## dbo.movsinv

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | fecha | datetime | YES | - |
| 2 | foliocheque | numeric(8,0) | YES | - |
| 3 | movto | numeric(8,0) | YES | - |
| 4 | idcompra | numeric(10,0) | YES | - |
| 5 | traspaso | numeric(8,0) | YES | - |
| 6 | invfisico | numeric(8,0) | YES | - |
| 7 | idconcepto | varchar(5) | YES | - |
| 8 | idinsumo | varchar(15) | YES | - |
| 9 | costo | money | YES | - |
| 10 | cantidad | numeric(14,4) | YES | - |
| 11 | idalmacen | varchar(5) | YES | - |
| 12 | idturno | numeric(6,0) | YES | - |
| 13 | presentaciondestino | varchar(15) | YES | - |
| 14 | idpedido | numeric(8,2) | YES | - |

## dbo.movsinvcancelados

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | fecha | datetime | YES | - |
| 2 | foliocheque | numeric(8,0) | YES | - |
| 3 | movto | numeric(8,0) | YES | - |
| 4 | idcompra | numeric(10,0) | YES | - |
| 5 | traspaso | numeric(8,0) | YES | - |
| 6 | invfisico | numeric(8,0) | YES | - |
| 7 | idconcepto | varchar(5) | YES | - |
| 8 | idinsumo | varchar(15) | YES | - |
| 9 | costo | money | YES | - |
| 10 | cantidad | numeric(14,4) | YES | - |
| 11 | idalmacen | varchar(5) | YES | - |
| 12 | idturno | numeric(6,0) | YES | - |
| 13 | presentaciondestino | varchar(15) | YES | - |
| 14 | idpedido | numeric(8,2) | YES | - |

## dbo.movtosalmacen

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | fecha | datetime | YES | - |
| 2 | movto | numeric(8,0) | YES | - |
| 3 | idcompra | numeric(10,0) | YES | - |
| 4 | traspaso | numeric(8,0) | YES | - |
| 5 | invfisico | numeric(8,0) | YES | - |
| 6 | idconcepto | varchar(5) | YES | - |
| 7 | idinsumospresentaciones | varchar(15) | YES | - |
| 8 | costo | money | YES | - |
| 9 | cantidad | numeric(14,4) | YES | - |
| 10 | idalmacen | varchar(5) | YES | - |
| 11 | idpedido | numeric(10,0) | YES | - |

## dbo.movtosalmacencancelados

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | fecha | datetime | YES | - |
| 2 | movto | numeric(8,0) | YES | - |
| 3 | idcompra | numeric(10,0) | YES | - |
| 4 | traspaso | numeric(8,0) | YES | - |
| 5 | invfisico | numeric(8,0) | YES | - |
| 6 | idconcepto | varchar(5) | YES | - |
| 7 | idinsumospresentaciones | varchar(15) | YES | - |
| 8 | costo | money | YES | - |
| 9 | cantidad | numeric(14,4) | YES | - |
| 10 | idalmacen | varchar(5) | YES | - |
| 11 | idpedido | numeric(10,0) | YES | - |

## dbo.movtosbillar

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmovto | numeric(6,0) | YES | - |
| 2 | idmesa | varchar(5) | YES | - |
| 3 | hrainicio | datetime | YES | - |
| 4 | hrafinal | datetime | YES | - |
| 5 | precio | money | YES | - |
| 6 | estatus | int | YES | - |

## dbo.movtoscaja

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | numeric(8,0) | NO | - |
| 2 | foliomovto | numeric(8,0) | YES | - |
| 3 | tipo | numeric(1,0) | YES | - |
| 4 | idturno | numeric(6,0) | YES | - |
| 5 | concepto | varchar(60) | YES | - |
| 6 | referencia | varchar(60) | YES | - |
| 7 | importe | money | YES | - |
| 8 | fecha | datetime | YES | - |
| 9 | cancelado | bit | YES | - |
| 10 | usuariocancelo | varchar(15) | YES | - |
| 11 | pagodepropina | bit | YES | - |
| 12 | idempresa | varchar(15) | YES | - |

## dbo.movtospatines

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmovto | numeric(10,0) | YES | - |
| 2 | folio | varchar(10) | YES | - |
| 3 | idpatin | varchar(15) | YES | - |
| 4 | idservicio | varchar(15) | YES | - |
| 5 | inicio | datetime | YES | - |
| 6 | fin | datetime | YES | - |
| 7 | estatus | numeric(10,0) | YES | - |

## dbo.ncomprobantesfiscales

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | tiponcf | numeric(1,0) | YES | - |
| 2 | fijo | varchar(11) | YES | - |
| 3 | secini | varchar(8) | YES | - |
| 4 | secfin | varchar(8) | YES | - |
| 5 | consecutivo | varchar(8) | YES | - |
| 6 | consecutivomin | numeric(6,0) | YES | - |
| 7 | agotado | bit | YES | - |
| 8 | habilitado | bit | YES | - |

## dbo.notificaciones_antifraudes

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | fecha | datetime | NO | - |
| 2 | turno | bigint | YES | - |
| 3 | usuario | varchar(15) | YES | - |
| 4 | idestacion | varchar(40) | YES | - |
| 5 | reimpresiones | int | YES | - |
| 6 | reimpresionesmax | int | YES | - |
| 7 | enviarreimpresiones | bit | YES | - |
| 8 | cancelacionescuenta | int | YES | - |
| 9 | cancelacionescuentamax | int | YES | - |
| 10 | enviarcancelacionescuenta | bit | YES | - |
| 11 | cancelacionesprod | int | YES | - |
| 12 | cancelacionesprodmax | int | YES | - |
| 13 | enviarcancelacionesprod | bit | YES | - |
| 14 | reaperturacuenta | int | YES | - |
| 15 | reaperturacuentamax | int | YES | - |
| 16 | enviarreaperturacuenta | bit | YES | - |
| 17 | reaperturamismacuenta | int | YES | - |
| 18 | reaperturamismacuentamax | int | YES | - |
| 19 | enviarreaperturamismacuenta | bit | YES | - |
| 20 | descuentocuenta | money | YES | - |
| 21 | descuentocuentamax | money | YES | - |
| 22 | enviardescuentocuenta | bit | YES | - |
| 23 | descuentoproductos | money | YES | - |
| 24 | descuentoprodmax | money | YES | - |
| 25 | enviardescuentoprod | bit | YES | - |
| 26 | enviado | bit | YES | - |

## dbo.numerostarjetas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliocuenta | numeric(8,0) | YES | - |
| 2 | idformadepago | varchar(10) | YES | - |
| 3 | numerotarjeta | varchar(20) | YES | - |
| 4 | importe | money | YES | - |

## dbo.objetos_mapa

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idobjetomapa | int | NO | - |
| 2 | idmapa | varchar(5) | YES | - |
| 3 | coordenadax | int | YES | - |
| 4 | coordenaday | int | YES | - |
| 5 | ancho | int | YES | - |
| 6 | alto | int | YES | - |
| 7 | tipoobjeto | int | YES | - |
| 8 | color | numeric(10,0) | YES | - |
| 9 | idobjeto | varchar(15) | YES | - |
| 10 | rotacion | int | YES | - |
| 11 | textoobjeto | varchar(25) | YES | - |
| 12 | color2 | numeric(10,0) | YES | - |
| 13 | tipoaccesorio | smallint | YES | - |
| 14 | idempresa | varchar(15) | YES | - |

## dbo.ordenescompra

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idordencompra | bigint | NO | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | folio | varchar(15) | YES | - |
| 4 | fechacaptura | datetime | YES | - |
| 5 | idproveedor | varchar(15) | YES | - |
| 6 | fecharecepcion | datetime | YES | - |
| 7 | descuento | numeric(5,2) | YES | - |
| 8 | cancelado | bit | YES | - |
| 9 | usuario | varchar(15) | YES | - |
| 10 | usuariocancelo | varchar(15) | YES | - |
| 11 | aplicada | bit | YES | - |
| 12 | foliocompra | numeric(10,0) | YES | - |
| 13 | entregara | varchar(100) | YES | - |
| 14 | impuesto1 | money | YES | - |
| 15 | impuesto2 | money | YES | - |
| 16 | impuesto3 | money | YES | - |
| 17 | subtotal | money | YES | - |
| 18 | total | money | YES | - |
| 19 | statusenviado | bit | YES | - |
| 20 | fechahoraenviado | datetime | YES | - |
| 21 | usuarioenvio | varchar(15) | YES | - |
| 22 | ordensurtido | bit | YES | - |

## dbo.ordenescompramov

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idordencompra | bigint | NO | - |
| 2 | idinsumo | varchar(15) | YES | - |
| 3 | costo | money | YES | - |
| 4 | cantidad | numeric(12,2) | YES | - |
| 5 | idalmacen | varchar(5) | YES | - |
| 6 | descuento | numeric(5,2) | YES | - |
| 7 | importesinimpuestos | money | YES | - |
| 8 | impuesto1 | numeric(5,2) | YES | - |
| 9 | impuesto1importe | money | YES | - |
| 10 | impuesto2 | numeric(5,2) | YES | - |
| 11 | impuesto2importe | money | YES | - |
| 12 | impuesto3 | numeric(5,2) | YES | - |
| 13 | impuesto3importe | money | YES | - |
| 14 | importeconimpuestos | money | YES | - |
| 15 | idpedido | numeric(10,0) | YES | - |
| 16 | idempresapedido | varchar(15) | YES | - |

## dbo.pacs

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | id | int | NO | - |
| 2 | pac | int | NO | - |
| 3 | nombrepac | varchar(100) | NO | - |

## dbo.pagosproveedores

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliocompra | numeric(10,0) | YES | - |
| 2 | fecha | datetime | YES | - |
| 3 | abono | money | YES | - |
| 4 | referencia | varchar(40) | YES | - |

## dbo.paises

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idpais | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |

## dbo.paquetes

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | cantidad | numeric(12,4) | YES | - |
| 3 | idproductopaquete | varchar(15) | YES | - |
| 4 | idempresa | varchar(15) | YES | - |

## dbo.parametros

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | prioridadimpresiongruposproductos | bit | YES | - |
| 2 | precioencomanda | bit | YES | - |
| 3 | comandaencomanda | bit | YES | - |
| 4 | bloqueartraspasosproductos | bit | YES | - |
| 5 | mitclavecompania | varchar(5) | YES | - |
| 6 | mitclavesucursal | varchar(8) | YES | - |
| 7 | mitpais | varchar(8) | YES | - |
| 8 | mitusuario | varchar(10) | YES | - |
| 9 | mitclave | varchar(15) | YES | - |
| 10 | mitnumeroafiliacion | varchar(10) | YES | - |
| 11 | mittipooperacion | varchar(10) | YES | - |
| 12 | miturl | varchar(150) | YES | - |
| 13 | mitclavecompaniadolar | varchar(5) | YES | - |
| 14 | mitclavesucursaldolar | varchar(8) | YES | - |
| 15 | mitpaisdolar | varchar(8) | YES | - |
| 16 | mitusuariodolar | varchar(10) | YES | - |
| 17 | mitclavedolar | varchar(15) | YES | - |
| 18 | mitnumeroafiliaciondolar | varchar(10) | YES | - |
| 19 | mittipooperaciondolar | varchar(10) | YES | - |
| 20 | mitclavecompaniadiferido | varchar(5) | YES | - |
| 21 | mitclavesucursaldiferido | varchar(8) | YES | - |
| 22 | mitpaisdiferido | varchar(8) | YES | - |
| 23 | mitusuariodiferido | varchar(10) | YES | - |
| 24 | mitclavediferido | varchar(15) | YES | - |
| 25 | mitnumeroafiliaciondiferido | varchar(10) | YES | - |
| 26 | mittipooperaciondiferido | varchar(10) | YES | - |
| 27 | mitreferencia | varchar(150) | YES | - |
| 28 | mitreferenciadolar | varchar(150) | YES | - |
| 29 | mitreferenciadiferido | varchar(150) | YES | - |
| 30 | inicializarventasalcierre | bit | YES | - |
| 31 | monitorcolorfondoantes | numeric(10,0) | YES | - |
| 32 | monitorcolorletraantes | numeric(10,0) | YES | - |
| 33 | monitorcolorfondodespues | numeric(10,0) | YES | - |
| 34 | monitorcolorletradespues | numeric(10,0) | YES | - |
| 35 | monitortiempoactualizacion | numeric(3,0) | YES | - |
| 36 | monitorcolorseparador | numeric(10,0) | YES | - |
| 37 | mitnumeroafiliacionamex | varchar(10) | YES | - |
| 38 | mitnumeroafiliaciondolaramex | varchar(10) | YES | - |
| 39 | mitnumeroafiliaciondiferidoamex | varchar(10) | YES | - |
| 40 | nombreidpoblacion | varchar(10) | YES | - |
| 41 | nombreimpuesto1 | varchar(10) | YES | - |
| 42 | impuesto1 | numeric(5,2) | YES | - |
| 43 | nombreimpuesto2 | varchar(10) | YES | - |
| 44 | impuesto2 | numeric(5,2) | YES | - |
| 45 | nombreimpuesto3 | varchar(50) | YES | - |
| 46 | impuesto3 | numeric(5,2) | YES | - |
| 47 | solicitarnotaofactura | bit | YES | - |
| 48 | fechainicialfoliocortez | datetime | YES | - |
| 49 | folioinicialcortez | numeric(6,0) | YES | - |
| 50 | numautorizacionbolivia | varchar(30) | YES | - |
| 51 | llavedosificacionbolivia | varchar(254) | YES | - |
| 52 | decimalesinventario | numeric(1,0) | YES | - |
| 53 | messenger | varchar(60) | YES | - |
| 54 | correosoporte | varchar(60) | YES | - |
| 55 | telefonooficinas | varchar(60) | YES | - |
| 56 | correoventas | varchar(60) | YES | - |
| 57 | polizatiposistema | varchar(10) | YES | - |
| 58 | vecesimprimirformatoconcuenta | numeric(3,0) | YES | - |
| 59 | ultimofolioimprimirformatoconcuenta | numeric(12,0) | YES | - |
| 60 | descuentosinivaencorte | bit | YES | - |
| 61 | minutosbillar | int | YES | - |
| 62 | costobillar | money | YES | - |
| 63 | costoinicialbillar | money | YES | - |
| 64 | conceptobillar | varchar(15) | YES | - |
| 65 | reabrircancelarcuenta | bit | YES | - |
| 66 | valesnogeneranotaconsumo | bit | YES | - |
| 67 | facturasumarpropina | bit | YES | - |
| 68 | cancelarcuentaalcancelarfactura | bit | YES | - |
| 69 | passwordmonedero | varchar(6) | YES | - |
| 70 | logtarjetacredito | bit | YES | - |
| 71 | imprimircomandadecancelacion | bit | YES | - |
| 72 | comandaindividualseparador | bit | YES | - |
| 73 | monitornivelprioridad | numeric(2,0) | YES | - |
| 74 | monitorprioridadactual | numeric(2,0) | YES | - |
| 75 | minutossegundotiempomonitor | numeric(3,0) | YES | - |
| 76 | minutostercertiempomonitor | numeric(3,0) | YES | - |
| 77 | usarsecuenciatiemposmonitor | bit | YES | - |
| 78 | forzartipodescuento | bit | YES | - |
| 79 | conceptoentradarepcostos | varchar(5) | YES | - |
| 80 | conceptosalidarepcostos | varchar(5) | YES | - |
| 81 | mintoleranciap | int | YES | - |
| 82 | servextrapatin | varchar(15) | YES | - |
| 83 | ciudaddefault | varchar(30) | YES | - |
| 84 | estadodefault | varchar(30) | YES | - |
| 85 | paisdefault | varchar(30) | YES | - |
| 86 | passwordsalirsistema | bit | YES | - |
| 87 | idccivacompras | varchar(15) | YES | - |
| 88 | patinestipofoliobusqueda | numeric(1,0) | YES | - |
| 89 | prefijopolizadecompras | varchar(5) | YES | - |
| 90 | comandaporproducto | bit | YES | - |
| 91 | mitventadirecta | bit | YES | - |
| 92 | clientesdomicilioanchoclave | numeric(2,0) | YES | - |
| 93 | idproductoabonorestcard | varchar(15) | YES | - |
| 94 | serviciorapidomesero | bit | YES | - |
| 95 | serviciorapidomeseropassword | bit | YES | - |
| 96 | formatocomedorcomentario | bit | YES | - |
| 97 | formatodomiciliocomentario | bit | YES | - |
| 98 | formatorapidocomentario | bit | YES | - |
| 99 | costopromedioformula | numeric(1,0) | YES | - |
| 100 | inventarionegativoventa | bit | YES | - |
| 101 | servidormail | varchar(120) | YES | - |
| 102 | puerto | varchar(20) | YES | - |
| 103 | autentificacion | numeric(1,0) | YES | - |
| 104 | email | varchar(60) | YES | - |
| 105 | passwordemail | varchar(30) | YES | - |
| 106 | nombredesplegado | varchar(100) | YES | - |
| 107 | asunto | varchar(120) | YES | - |
| 108 | eliminarprodfiscal | bit | YES | - |
| 109 | titulocortez | varchar(30) | YES | - |
| 110 | campoadicionalcortez | varchar(200) | YES | - |
| 111 | meserospuedereservaciones | bit | YES | - |
| 112 | mostrarventafacturadacorte | bit | YES | - |
| 113 | pagarcuentaautomatico | bit | YES | - |
| 114 | idautoasignarrepartidor | varchar(5) | YES | - |
| 115 | mantovtasminimoproductos | numeric(3,0) | YES | - |
| 116 | reservahorasbloquear | numeric(3,0) | YES | - |
| 117 | consultareportes | numeric(1,0) | YES | - |
| 118 | versiondb | varchar(5) | YES | - |
| 119 | cambio | numeric(5,0) | YES | - |
| 120 | seriecompra | varchar(5) | YES | - |
| 121 | foliocompra | varchar(10) | YES | - |
| 122 | serieordencompra | varchar(5) | YES | - |
| 123 | folioordencompra | varchar(10) | YES | - |
| 124 | seriepedido | varchar(5) | YES | - |
| 125 | foliopedido | varchar(10) | YES | - |
| 126 | nopregtardescargacatalogos | bit | YES | - |
| 127 | diasbuscarupd | numeric(8,0) | YES | - |
| 128 | reservaetiquetatiporeserva | varchar(30) | YES | - |
| 129 | reservaetiquetacomisionistas | varchar(30) | YES | - |
| 130 | reservacionprioridadcliente | numeric(1,0) | YES | - |
| 131 | reservatipoid | numeric(1,0) | YES | - |
| 132 | tipocalculocomision | numeric(1,0) | YES | - |
| 133 | femex | bit | YES | - |
| 134 | femextipo | numeric(1,0) | YES | - |
| 135 | femexrutaarchivokey | varchar(250) | YES | - |
| 136 | femexrutaarchivocer | varchar(250) | YES | - |
| 137 | femexclavekey | varchar(50) | YES | - |
| 138 | femexolrutaservicio | varchar(250) | YES | - |
| 139 | femexolclaveempresa | varchar(50) | YES | - |
| 140 | femexolcontrasenia | varchar(30) | YES | - |
| 141 | femexolusuario | varchar(50) | YES | - |
| 142 | femexolgenerar | bit | YES | - |
| 143 | foliosrestantesavisofe | numeric(10,0) | YES | - |
| 144 | femextipoesquema | numeric(1,0) | YES | - |
| 145 | facturaventaimpuestoagrupada | bit | YES | - |
| 146 | cortemovtostarjetas | bit | YES | - |
| 147 | ocultarusuarioslogin | bit | YES | - |
| 148 | kdscolorfuentenormal | int | YES | - |
| 149 | kdscolorfondonormal | int | YES | - |
| 150 | kdscolorfuentefoco | int | YES | - |
| 151 | kdscolorfondofoco | int | YES | - |
| 152 | kdscolorfuentealerta | int | YES | - |
| 153 | kdscolorfondoalerta | int | YES | - |
| 154 | kdscolorfuenteatrasado | int | YES | - |
| 155 | kdscolorfondoatrasado | int | YES | - |
| 156 | kdscolorfuentecan | int | YES | - |
| 157 | kdscolorfondocan | int | YES | - |
| 158 | kdsnumcuadros | int | YES | - |
| 159 | kdstiemporefresco | int | YES | - |
| 160 | kdstimerenabled | bit | YES | - |
| 161 | kdskeyboardenabled | bit | YES | - |
| 162 | kdsactivo | bit | YES | - |
| 163 | costoautilizar | int | YES | - |
| 164 | ultimoturno | bigint | YES | - |
| 165 | impuestosmonedero | numeric(1,0) | YES | - |
| 166 | maxdiarioacumularpuntos | numeric(2,0) | YES | - |
| 167 | redondeopropinas | numeric(1,0) | NO | - |
| 168 | redondeodescuentos | numeric(1,0) | YES | - |
| 169 | monederopaisdefault | varchar(10) | YES | - |
| 170 | monederoestadodefault | varchar(10) | YES | - |
| 171 | monederociudaddefault | varchar(20) | YES | - |
| 172 | asignarpatinesrapido | bit | YES | - |
| 173 | comandadirecciondomicilio | bit | YES | - |
| 174 | serviciorapidocuentaspendientes | bit | YES | - |
| 175 | serviciorapidodrivependiente | bit | YES | - |
| 176 | serviciorapidomesa | bit | YES | - |
| 177 | tipocalcularpropina | numeric(1,0) | YES | - |
| 178 | acumularproductoscondescuento | bit | YES | - |
| 179 | visualizarproductosdirecto | bit | YES | - |
| 180 | permitirdomicilioprogramado | bit | YES | - |
| 181 | minutosactivarpedido | numeric(3,0) | YES | - |
| 182 | ftpenviorespaldo | bit | YES | - |
| 183 | ftprespaldo | varchar(254) | YES | - |
| 184 | ftprespaldousuario | varchar(50) | YES | - |
| 185 | ftprespaldocontraseña | varchar(50) | YES | - |
| 186 | ftprespaldopuerto | varchar(10) | YES | - |
| 187 | ftprespaldodirectorio | varchar(254) | YES | - |
| 188 | comandacomentarioalado | bit | YES | - |
| 189 | propinasinventa | bit | YES | - |
| 190 | pagomonederocuentaimpresa | bit | YES | - |
| 191 | nombreconsumiraqui | varchar(30) | YES | - |
| 192 | nombreparallevar | varchar(30) | YES | - |
| 193 | nombredrivethru | varchar(30) | YES | - |
| 194 | nombredomicilio | varchar(30) | YES | - |
| 195 | comedorobligarcliente | bit | YES | - |
| 196 | comandacdoencabezado1 | varchar(5) | YES | - |
| 197 | comandacdoencabezado2 | varchar(5) | YES | - |
| 198 | comandacdoencabezado3 | varchar(5) | YES | - |
| 199 | comandacdoencabezado4 | varchar(5) | YES | - |
| 200 | comandacdocuerpo | varchar(5) | YES | - |
| 201 | idproductocargoadicional | varchar(15) | YES | - |
| 202 | tipocapturadirecciones | numeric(1,0) | YES | - |
| 203 | juntarmesasmismomesero | bit | YES | - |
| 204 | passwordserviciocfdi | text | YES | - |
| 205 | urlservicioutileriascfdi | text | YES | - |
| 206 | rutacertificadocfdi | text | YES | - |
| 207 | verificarcfdirestantes | numeric(1,0) | YES | - |
| 208 | urlmanifiestocfdi | varchar(250) | YES | - |
| 209 | manifiestocfdifirmado | numeric(1,0) | YES | - |
| 210 | urlregistronatsoftcfdi | varchar(250) | YES | - |
| 211 | urlserviciocfdi | text | YES | - |
| 212 | comisionpagada | bit | YES | - |
| 213 | mostrarautorizacion | bit | YES | - |
| 214 | reimprimircuentascan | bit | YES | - |
| 215 | multiidiomahabilitado | bit | YES | - |
| 216 | notificarreimpresion | bit | YES | - |
| 217 | notificarcancelcuenta | bit | YES | - |
| 218 | notificarcancelprod | bit | YES | - |
| 219 | notificarreaperturacuenta | bit | YES | - |
| 220 | notificarreaperturamismacta | bit | YES | - |
| 221 | reimpresionemaximas | int | YES | - |
| 222 | cancelacioncuentamax | int | YES | - |
| 223 | cencelacionprodmax | int | YES | - |
| 224 | reaperturactamax | int | YES | - |
| 225 | reaperturamismactamax | int | YES | - |
| 226 | nombredesplegadoAntiFraudes | varchar(100) | YES | - |
| 227 | asuntoAntiFraudes | varchar(120) | YES | - |
| 228 | notificardescuentocuenta | bit | YES | - |
| 229 | notificardescuentoprod | bit | YES | - |
| 230 | descuentomax | money | YES | - |
| 231 | descuentoprodmax | money | YES | - |
| 232 | nopermitircierreventascedis | bit | YES | - |
| 233 | generarnuevopedidocedis | bit | YES | - |
| 234 | conceptodevolucioncedis | varchar(5) | YES | - |
| 235 | reservaciones_tiempo_inicial_bloqueo_mesa | smallint | YES | - |
| 236 | asistencia_para_acceso_comandero | bit | YES | - |
| 237 | modousoinv | smallint | YES | - |
| 238 | enviamovtoscierre | bit | YES | - |
| 239 | retenerimpuesto | bit | YES | - |
| 240 | retencion1 | numeric(5,2) | YES | - |
| 241 | retencion2 | numeric(5,2) | YES | - |
| 242 | retencion3 | numeric(5,2) | YES | - |
| 243 | ingreso_reservaciones | smallint | YES | - |
| 244 | conceptoenviocedis | varchar(5) | YES | - |
| 245 | nousarpendientes | bit | YES | - |
| 246 | generarventacedis | bit | YES | - |
| 247 | conceptorecepcioncedis | varchar(5) | YES | - |
| 248 | usarprovpredeterminado | bit | YES | - |
| 249 | saludo | varchar(60) | YES | - |
| 250 | mensaje | varchar(100) | YES | - |
| 251 | despedida | varchar(60) | YES | - |

## dbo.parametros2

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | enviarordencompra | numeric(1,0) | YES | - |
| 2 | cifradossl | numeric(1,0) | YES | - |
| 3 | foliocxc | int | YES | - |
| 4 | foliomovtoscaja | numeric(8,0) | YES | - |
| 5 | descargaactualizacionesinicio | bit | YES | - |
| 6 | permitirenviocentralalexportar | bit | YES | - |
| 7 | autorizacioncancelarproductos | bit | YES | - |
| 8 | autorizacioncancelarcompras | bit | YES | - |
| 9 | autorizacioncancelartraspasos | bit | YES | - |
| 10 | autorizacioncancelarmovtosalmacen | bit | YES | - |
| 11 | autorizacioncambiarfechaalmacen | bit | YES | - |
| 12 | nousarcoloniasdomcilio | bit | YES | - |
| 13 | reabrircuentapagada | bit | YES | - |
| 14 | femexnocer | varchar(50) | YES | - |
| 15 | hotelusuariodb | varchar(50) | YES | - |
| 16 | cargarproductosfavoritos | bit | YES | - |
| 17 | baseordenarproductos | numeric(1,0) | YES | - |
| 18 | idunidaddeffault | varchar(50) | YES | - |
| 19 | solicitarunidad | bit | YES | - |
| 20 | formapagodefault | varchar(50) | YES | - |
| 21 | usarformapagodefault | bit | YES | - |
| 22 | usuariopac | varchar(200) | YES | - |
| 23 | passwordpac | varchar(200) | YES | - |
| 24 | permitircambiarcuentafac | bit | YES | - |
| 25 | percontacto | varchar(50) | YES | - |
| 26 | nombreimplementador | varchar(50) | YES | - |
| 27 | correoimplementador | varchar(50) | YES | - |
| 28 | telefonoimplementador | varchar(50) | YES | - |
| 29 | imprimirformatocompramonex | bit | YES | - |
| 30 | idformadepagocompramonex | varchar(15) | YES | - |
| 31 | procesadocfdi | bit | YES | - |
| 32 | mostrarmonitortimbres | bit | YES | - |
| 33 | autorizacionmodoinventario | bit | YES | - |
| 34 | cuentahub | varchar(200) | YES | - |
| 35 | actualizacionpedidohub | numeric(3,0) | YES | - |
| 36 | confirmarpedido | bit | YES | - |
| 37 | basedatoshub | varchar(200) | YES | - |
| 38 | facturascentral | bit | YES | - |
| 39 | cierrediarioaperturarturno | bit | YES | - |
| 40 | tipocuentabierta | int | YES | - |
| 41 | mostrarcorte | bit | YES | - |
| 42 | criteriodescargarecetas | numeric(1,0) | YES | - |
| 43 | imprimirordenproduccion | bit | YES | - |
| 44 | idprodrmplmtovtas | varchar(15) | YES | - |
| 45 | rmpultprodmtovta | bit | YES | - |
| 46 | permitirmovtosexistencianegativa | bit | YES | - |
| 47 | enviarcorreocorte | bit | YES | - |
| 48 | opcionenviocorte | smallint | YES | - |
| 49 | cifradosslinv | numeric(1,0) | YES | - |
| 50 | cifradosslantifraude | numeric(1,0) | YES | - |
| 51 | cifradosslcortecorreo | numeric(1,0) | YES | - |
| 52 | nombredesplegadoInv | varchar(100) | YES | - |
| 53 | nombredesplegadoCorte | varchar(100) | YES | - |
| 54 | asuntoInv | varchar(120) | YES | - |
| 55 | asuntoCorte | varchar(120) | YES | - |
| 56 | servidormailnv | varchar(120) | YES | - |
| 57 | servidormailAntiFraude | varchar(120) | YES | - |
| 58 | servidormailCorte | varchar(120) | YES | - |
| 59 | puertoInv | varchar(20) | YES | - |
| 60 | puertoAntiFraude | varchar(20) | YES | - |
| 61 | puertoCorte | varchar(20) | YES | - |
| 62 | autentificacionInv | numeric(1,0) | YES | - |
| 63 | autentificacionAntiFraude | numeric(1,0) | YES | - |
| 64 | autentificacionCorte | numeric(1,0) | YES | - |
| 65 | emailInv | varchar(60) | YES | - |
| 66 | emailAntiFraude | varchar(60) | YES | - |
| 67 | emailCorte | varchar(60) | YES | - |
| 68 | passwordemailInv | varchar(30) | YES | - |
| 69 | passwordemailAntiFraude | varchar(30) | YES | - |
| 70 | passwordemailCorte | varchar(30) | YES | - |
| 71 | habilitacoiner | bit | YES | - |
| 72 | idestablecimientocoiner | varchar(10) | YES | - |
| 73 | porcentajecoiner | numeric(5,2) | YES | - |
| 74 | dominiocoiner | varchar(150) | YES | - |
| 75 | llaveencriptacioncoiner | varchar(150) | YES | - |
| 76 | minutosactualizacion | numeric(12,0) | YES | - |
| 77 | tipodoctoenviocorte | numeric(1,0) | YES | - |
| 78 | propinasinventa | bit | YES | - |
| 79 | contrasenameserodestino | bit | YES | - |
| 80 | pac | int | NO | - |
| 81 | urlregistrocfdi | varchar(200) | NO | - |
| 82 | cfdiv32migrado | bit | YES | - |
| 83 | paconline | int | NO | - |
| 84 | imprimirlogocomedor | int | NO | - |
| 85 | imprimirlogodomicilio | int | NO | - |
| 86 | imprimirlogorapido | int | NO | - |
| 87 | imprimirlogonotadeconsumo | int | NO | - |
| 88 | webapiregistrado | int | NO | - |
| 89 | femexarchivokey | varchar(max) | NO | - |
| 90 | femexarchivocer | varchar(max) | NO | - |
| 91 | femexarchivokey_pem | varchar(max) | NO | - |
| 92 | femexarchivocer_pem | varchar(max) | NO | - |
| 93 | archivoscerkeyprocesados | int | NO | - |
| 94 | serviciorapidoimprimirpagar | bit | NO | - |
| 95 | forzarcapturamesa | int | YES | - |
| 96 | propinasmantto | bit | NO | - |
| 97 | tipopagodomicilio | bit | NO | - |
| 98 | RIFDetallado | bit | NO | - |
| 99 | fenombreformatorif | varchar(50) | NO | - |
| 100 | propinaesconcepto | bit | NO | - |
| 101 | facturarapida | bit | NO | - |
| 102 | resumiragruparmodificadores | bit | NO | - |
| 103 | ticketsalfabetico | bit | NO | - |
| 104 | continuarcapturaproductocompuesto | bit | NO | - |

## dbo.parametros3

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | pagarcuentacapitan | bit | NO | - |
| 2 | imprimircuentacapitan | bit | NO | - |

## dbo.patines

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idpatin | varchar(15) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | estatus | int | YES | - |
| 4 | colorpatin | varchar(30) | YES | - |
| 5 | talla | varchar(10) | YES | - |

## dbo.pedidos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idpedido | bigint | NO | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | folio | varchar(15) | YES | - |
| 4 | fechacaptura | datetime | YES | - |
| 5 | fecharecepcion | datetime | YES | - |
| 6 | descuento | numeric(5,2) | YES | - |
| 7 | status | numeric(1,0) | YES | - |
| 8 | cancelado | bit | YES | - |
| 9 | usuario | varchar(15) | YES | - |
| 10 | usuariocancelo | varchar(15) | YES | - |
| 11 | foliopedido | numeric(10,0) | YES | - |
| 12 | entregara | varchar(100) | YES | - |
| 13 | impuesto1 | money | YES | - |
| 14 | impuesto2 | money | YES | - |
| 15 | impuesto3 | money | YES | - |
| 16 | subtotal | money | YES | - |
| 17 | total | money | YES | - |
| 18 | fechahoraautorizado | datetime | YES | - |
| 19 | usuarioautorizo | varchar(15) | YES | - |
| 20 | fechahoraenviado | datetime | YES | - |
| 21 | idproveedor | varchar(15) | YES | - |
| 22 | ventagenerada | bit | YES | - |
| 23 | idtipopedido | varchar(5) | YES | - |

## dbo.pedidosdetalle

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idpedido | bigint | YES | - |
| 2 | idinsumo | varchar(15) | YES | - |
| 3 | costo | money | YES | - |
| 4 | cantidad | numeric(12,2) | YES | - |
| 5 | idalmacen | varchar(5) | YES | - |
| 6 | descuento | numeric(5,2) | YES | - |
| 7 | importesinimpuestos | money | YES | - |
| 8 | impuesto1 | numeric(5,2) | YES | - |
| 9 | impuesto1importe | money | YES | - |
| 10 | impuesto2 | numeric(5,2) | YES | - |
| 11 | impuesto2importe | money | YES | - |
| 12 | impuesto3 | numeric(5,2) | YES | - |
| 13 | impuesto3importe | money | YES | - |
| 14 | importeconimpuestos | money | YES | - |
| 15 | cantidadsurtida | numeric(12,2) | YES | - |
| 16 | cantidadrecibida | numeric(12,2) | YES | - |
| 17 | surtirpendiente | bit | YES | - |
| 18 | comentarios | varchar(100) | YES | - |
| 19 | fechahoraenviado | datetime | YES | - |
| 20 | cantidaddevuelta | numeric(12,2) | YES | - |
| 21 | idalmacendescarga | varchar(5) | YES | - |

## dbo.productos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |
| 3 | idgrupo | varchar(5) | YES | - |
| 4 | nombrecorto | varchar(20) | YES | - |
| 5 | plu | varchar(15) | YES | - |
| 6 | imagen | image | YES | - |
| 7 | nofacturable | bit | YES | - |
| 8 | comentario | varchar(254) | YES | - |
| 9 | usarcomedor | bit | YES | - |
| 10 | usardomicilio | bit | YES | - |
| 11 | usarrapido | bit | YES | - |
| 12 | usarcedis | bit | YES | - |
| 13 | idinsumospresentaciones | varchar(15) | YES | - |
| 14 | imagenmenuelectronico | image | YES | - |
| 15 | descripcionmenuelectronico | varchar(255) | YES | - |
| 16 | usarmenuelectronico | bit | YES | - |
| 17 | extmenu | varchar(5) | YES | - |

## dbo.productosdetalle

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | precio | money | YES | - |
| 4 | impuesto1 | numeric(5,2) | YES | - |
| 5 | impuesto2 | numeric(5,2) | YES | - |
| 6 | impuesto3 | numeric(5,2) | YES | - |
| 7 | preciosinimpuestos | money | YES | - |
| 8 | bloqueado | bit | YES | - |
| 9 | precioabierto | numeric(1,0) | YES | - |
| 10 | canjeablepuntos | bit | YES | - |
| 11 | preciopuntos | money | YES | - |
| 12 | puntoscanje | money | YES | - |
| 13 | puntosextras | money | YES | - |
| 14 | lunesinicio | varchar(11) | YES | - |
| 15 | lunesfin | varchar(11) | YES | - |
| 16 | preciolunes | money | YES | - |
| 17 | lunesdiasalida | numeric(1,0) | YES | - |
| 18 | martesinicio | varchar(11) | YES | - |
| 19 | martesfin | varchar(11) | YES | - |
| 20 | preciomartes | money | YES | - |
| 21 | martesdiasalida | numeric(1,0) | YES | - |
| 22 | miercolesinicio | varchar(11) | YES | - |
| 23 | miercolesfin | varchar(11) | YES | - |
| 24 | preciomiercoles | money | YES | - |
| 25 | miercolesdiasalida | numeric(1,0) | YES | - |
| 26 | juevesinicio | varchar(11) | YES | - |
| 27 | juevesfin | varchar(11) | YES | - |
| 28 | preciojueves | money | YES | - |
| 29 | juevesdiasalida | numeric(1,0) | YES | - |
| 30 | viernesinicio | varchar(11) | YES | - |
| 31 | viernesfin | varchar(11) | YES | - |
| 32 | precioviernes | money | YES | - |
| 33 | viernesdiasalida | numeric(1,0) | YES | - |
| 34 | sabadoinicio | varchar(11) | YES | - |
| 35 | sabadofin | varchar(11) | YES | - |
| 36 | preciosabado | money | YES | - |
| 37 | sabadodiasalida | numeric(1,0) | YES | - |
| 38 | domingoinicio | varchar(11) | YES | - |
| 39 | domingofin | varchar(11) | YES | - |
| 40 | preciodomingo | money | YES | - |
| 41 | domingodiasalida | numeric(1,0) | YES | - |
| 42 | aplicalunes | bit | YES | - |
| 43 | aplicamartes | bit | YES | - |
| 44 | aplicamiercoles | bit | YES | - |
| 45 | aplicajueves | bit | YES | - |
| 46 | aplicaviernes | bit | YES | - |
| 47 | aplicasabado | bit | YES | - |
| 48 | aplicadomingo | bit | YES | - |
| 49 | excentoimpuestos | bit | YES | - |
| 50 | secuenciacompuesto | bit | YES | - |
| 51 | finalizarsecuenciacompuesto | bit | YES | - |
| 52 | heredarmonitormodificadores | bit | YES | - |
| 53 | comisionvendedor | numeric(6,2) | YES | - |
| 54 | eliminarfiscal | bit | YES | - |
| 55 | enviarproduccionsimodificador | bit | YES | - |
| 56 | cargoadicional | numeric(5,0) | YES | - |
| 57 | afectacomensales | bit | YES | - |
| 58 | comensalesafectados | numeric(2,0) | YES | - |
| 59 | descargar | bit | YES | - |
| 60 | usarmultiplicadorprodcomp | bit | YES | - |
| 61 | rentabilidadcedis | numeric(6,2) | YES | - |
| 62 | idarea | varchar(4) | YES | - |
| 63 | permitirprodcompenmodif | bit | YES | - |
| 64 | politicapuntos | numeric(1,0) | YES | - |
| 65 | favorito | bit | YES | - |
| 66 | idunidad | varchar(50) | YES | - |

## dbo.productosenproduccion

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | idmonitor | varchar(5) | YES | - |
| 3 | folio | numeric(8,0) | YES | - |
| 4 | movimiento | numeric(3,0) | YES | - |
| 5 | cantidad | numeric(11,3) | YES | - |
| 6 | comentario | varchar(60) | YES | - |
| 7 | tiempo | varchar(20) | YES | - |
| 8 | hora | datetime | YES | - |
| 9 | modificador | bit | YES | - |
| 10 | estadomonitor | numeric(1,0) | YES | - |
| 11 | idproductocompuesto | varchar(15) | YES | - |
| 12 | productocompuestoprincipal | bit | YES | - |
| 13 | minutospreparacion | numeric(4,1) | YES | - |
| 14 | minutosalerta | numeric(4,1) | YES | - |
| 15 | horaproduccion | datetime | YES | - |
| 16 | cancelado | bit | YES | - |
| 17 | prioridad | varchar(1) | YES | - |
| 18 | enviadomonitor | bit | YES | - |

## dbo.productosmonedero

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | idarearestaurant | varchar(5) | YES | - |
| 3 | idempresa | varchar(15) | YES | - |
| 4 | activo | bit | YES | - |
| 5 | lunesaplica | bit | YES | - |
| 6 | lunesinicio | varchar(11) | YES | - |
| 7 | lunesfin | varchar(11) | YES | - |
| 8 | lunesdiasalida | numeric(1,0) | YES | - |
| 9 | martesaplica | bit | YES | - |
| 10 | martesinicio | varchar(11) | YES | - |
| 11 | martesfin | varchar(11) | YES | - |
| 12 | martesdiasalida | numeric(1,0) | YES | - |
| 13 | miercolesaplica | bit | YES | - |
| 14 | miercolesinicio | varchar(11) | YES | - |
| 15 | miercolesfin | varchar(11) | YES | - |
| 16 | miercolesdiasalida | numeric(1,0) | YES | - |
| 17 | juevesaplica | bit | YES | - |
| 18 | juevesinicio | varchar(11) | YES | - |
| 19 | juevesfin | varchar(11) | YES | - |
| 20 | juevesdiasalida | numeric(1,0) | YES | - |
| 21 | viernesaplica | bit | YES | - |
| 22 | viernesinicio | varchar(11) | YES | - |
| 23 | viernesfin | varchar(11) | YES | - |
| 24 | viernesdiasalida | numeric(1,0) | YES | - |
| 25 | sabadoaplica | bit | YES | - |
| 26 | sabadoinicio | varchar(11) | YES | - |
| 27 | sabadofin | varchar(11) | YES | - |
| 28 | sabadodiasalida | numeric(1,0) | YES | - |
| 29 | domingoaplica | bit | YES | - |
| 30 | domingoinicio | varchar(11) | YES | - |
| 31 | domingofin | varchar(11) | YES | - |
| 32 | domingodiasalida | numeric(1,0) | YES | - |
| 33 | porcentaje | numeric(5,2) | YES | - |
| 34 | multiplo | money | YES | - |
| 35 | puntosmultiplo | money | YES | - |

## dbo.productosmonitores

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | idmonitor | varchar(5) | YES | - |
| 3 | minutosalerta | numeric(4,1) | YES | - |
| 4 | minutospreparacion | numeric(4,1) | YES | - |

## dbo.promociones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idpromocion | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | status | numeric(1,0) | YES | - |
| 4 | tipopromocion | numeric(1,0) | YES | - |
| 5 | lunesinicio | varchar(11) | YES | - |
| 6 | lunesfin | varchar(11) | YES | - |
| 7 | aplicalunes | bit | YES | - |
| 8 | lunesdiasalida | numeric(1,0) | YES | - |
| 9 | martesinicio | varchar(11) | YES | - |
| 10 | martesfin | varchar(11) | YES | - |
| 11 | aplicamartes | bit | YES | - |
| 12 | martesdiasalida | numeric(1,0) | YES | - |
| 13 | miercolesinicio | varchar(11) | YES | - |
| 14 | miercolesfin | varchar(11) | YES | - |
| 15 | aplicamiercoles | bit | YES | - |
| 16 | miercolesdiasalida | numeric(1,0) | YES | - |
| 17 | juevesinicio | varchar(11) | YES | - |
| 18 | juevesfin | varchar(11) | YES | - |
| 19 | aplicajueves | bit | YES | - |
| 20 | juevesdiasalida | numeric(1,0) | YES | - |
| 21 | viernesinicio | varchar(11) | YES | - |
| 22 | viernesfin | varchar(11) | YES | - |
| 23 | aplicaviernes | bit | YES | - |
| 24 | viernesdiasalida | numeric(1,0) | YES | - |
| 25 | sabadoinicio | varchar(11) | YES | - |
| 26 | sabadofin | varchar(11) | YES | - |
| 27 | aplicasabado | bit | YES | - |
| 28 | domingoinicio | varchar(11) | YES | - |
| 29 | sabadodiasalida | numeric(1,0) | YES | - |
| 30 | domingofin | varchar(11) | YES | - |
| 31 | aplicadomingo | bit | YES | - |
| 32 | domingodiasalida | numeric(1,0) | YES | - |
| 33 | fotografia | image | YES | - |
| 34 | visualizar | bit | YES | - |
| 35 | Relacionuno | numeric(3,0) | YES | - |
| 36 | Relaciondos | numeric(3,0) | YES | - |
| 37 | forzarporproducto | bit | YES | - |
| 38 | aplicamodificadores | bit | NO | - |

## dbo.promocionesdescargar

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idpromocion | varchar(5) | YES | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | descargar | bit | YES | - |

## dbo.promocionesmenuelectronico

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idpromocion | varchar(5) | NO | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | idproducto | varchar(15) | NO | - |
| 4 | descripcion | varchar(30) | YES | - |
| 5 | estatus | numeric(1,0) | YES | - |
| 6 | ubicacion | numeric(1,0) | YES | - |
| 7 | fotografia | image | YES | - |

## dbo.promoproductos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idpromocion | varchar(5) | YES | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | idproducto | varchar(15) | YES | - |
| 4 | preciopromocion | money | YES | - |
| 5 | idtipodescuento | varchar(5) | YES | - |
| 6 | descuento | numeric(5,2) | YES | - |

## dbo.proveedores

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproveedor | varchar(15) | NO | - |
| 2 | nombre | varchar(50) | YES | - |
| 3 | razonsocial | varchar(100) | YES | - |
| 4 | direccion | varchar(150) | YES | - |
| 5 | codigopostal | varchar(15) | YES | - |
| 6 | telefono | varchar(20) | YES | - |
| 7 | fax | varchar(20) | YES | - |
| 8 | email | varchar(40) | YES | - |
| 9 | rfc | varchar(15) | YES | - |
| 10 | credito | numeric(3,0) | YES | - |
| 11 | usarcostosasignados | bit | YES | - |
| 12 | usarenpoliza | bit | YES | - |
| 13 | idtipoproveedor | varchar(5) | YES | - |
| 14 | idcuentacontable | varchar(5) | YES | - |
| 15 | nombrebanco | varchar(100) | YES | - |
| 16 | nocuenta | varchar(100) | YES | - |
| 17 | cuentaclave | varchar(100) | YES | - |
| 18 | estatus | numeric(1,0) | YES | - |

## dbo.proveedorespredet

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idempresa | varchar(15) | NO | - |
| 2 | idproveedor | varchar(15) | NO | - |

## dbo.puntos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | tipodeservicio | numeric(1,0) | YES | - |
| 2 | activo | bit | YES | - |
| 3 | lunesaplica | bit | YES | - |
| 4 | lunesinicio | varchar(11) | YES | - |
| 5 | lunesfin | varchar(11) | YES | - |
| 6 | lunesdiasalida | numeric(1,0) | YES | - |
| 7 | martesaplica | bit | YES | - |
| 8 | martesinicio | varchar(11) | YES | - |
| 9 | martesfin | varchar(11) | YES | - |
| 10 | martesdiasalida | numeric(1,0) | YES | - |
| 11 | miercolesaplica | bit | YES | - |
| 12 | miercolesinicio | varchar(11) | YES | - |
| 13 | miercolesfin | varchar(11) | YES | - |
| 14 | miercolesdiasalida | numeric(1,0) | YES | - |
| 15 | juevesaplica | bit | YES | - |
| 16 | juevesinicio | varchar(11) | YES | - |
| 17 | juevesfin | varchar(11) | YES | - |
| 18 | juevesdiasalida | numeric(1,0) | YES | - |
| 19 | viernesaplica | bit | YES | - |
| 20 | viernesinicio | varchar(11) | YES | - |
| 21 | viernesfin | varchar(11) | YES | - |
| 22 | viernesdiasalida | numeric(1,0) | YES | - |
| 23 | sabadoaplica | bit | YES | - |
| 24 | sabadoinicio | varchar(11) | YES | - |
| 25 | sabadofin | varchar(11) | YES | - |
| 26 | sabadodiasalida | numeric(1,0) | YES | - |
| 27 | domingoaplica | bit | YES | - |
| 28 | domingoinicio | varchar(11) | YES | - |
| 29 | domingofin | varchar(11) | YES | - |
| 30 | domingodiasalida | numeric(1,0) | YES | - |

## dbo.puntosgruposdeproductos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idarearestaurant | varchar(5) | YES | - |
| 2 | idgrupoproducto | varchar(5) | YES | - |
| 3 | porcentaje | numeric(5,2) | YES | - |
| 4 | tipodeservicio | numeric(1,0) | YES | - |
| 5 | multiplo | money | YES | - |
| 6 | puntosmultiplo | money | YES | - |

## dbo.recetasalmacenes

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idproducto | varchar(15) | YES | - |
| 2 | idarearestaurant | varchar(5) | YES | - |
| 3 | idalmacen | varchar(5) | YES | - |
| 4 | idempresa | varchar(15) | YES | - |
| 5 | idinsumo | varchar(15) | YES | - |

## dbo.regionempresa

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idregionempresa | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |

## dbo.regiones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idregion | varchar(5) | NO | - |
| 2 | descripcion | varchar(50) | YES | - |

## dbo.registro_dispositivos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | int | NO | - |
| 2 | id_dispositivo | varchar(60) | NO | - |
| 3 | nombre_dispositivo | varchar(100) | NO | - |
| 4 | numerocontrol | varchar(60) | NO | - |
| 5 | contraseniacontrol | varchar(30) | NO | - |
| 6 | fecha | datetime | NO | - |

## dbo.registro_enlacesrm

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idestacion | varchar(50) | NO | - |
| 2 | ultimo_acceso | datetime | NO | - |
| 3 | activo | bit | NO | - |

## dbo.registro_licencias

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idregistros | numeric(4,0) | YES | - |
| 2 | tipomodulo | numeric(1,0) | YES | - |
| 3 | nombre | varchar(60) | YES | - |
| 4 | fechacompra | datetime | YES | - |
| 5 | numerofactura | varchar(20) | YES | - |
| 6 | distribuidor | varchar(80) | YES | - |
| 7 | numerocontrol | varchar(60) | YES | - |
| 8 | contraseniacontrol | varchar(30) | YES | - |
| 9 | tipolicencia | numeric(1,0) | YES | - |
| 10 | mesanio | varchar(6) | YES | - |
| 11 | licencia | varchar(50) | YES | - |
| 12 | estaciones | numeric(5,0) | YES | - |
| 13 | idempresa | varchar(15) | YES | - |
| 14 | fecharegistro | datetime | YES | - |
| 15 | foliosusadosfe | varchar(50) | YES | - |
| 16 | limitefoliosfe | varchar(50) | YES | - |
| 17 | foliosrestantescfdi | varchar(50) | YES | - |

## dbo.registroasistencias

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idmovto | varchar(15) | YES | - |
| 2 | idempleado | varchar(15) | YES | - |
| 3 | entrada | datetime | YES | - |
| 4 | salida | datetime | YES | - |
| 5 | tipo | smallint | YES | - |

## dbo.renta

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | mesaño | varchar(10) | YES | - |
| 2 | licencia | varchar(80) | YES | - |
| 3 | modulo | varchar(30) | YES | - |
| 4 | idempresa | varchar(15) | YES | - |

## dbo.reservaciones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idreservacion | varchar(25) | NO | - |
| 2 | idtiporeservacion | varchar(5) | YES | - |
| 3 | idarearestaurant | varchar(5) | YES | - |
| 4 | idcomisionista | varchar(15) | YES | - |
| 5 | idcliente | varchar(15) | YES | - |
| 6 | estatus | numeric(1,0) | YES | - |
| 7 | motivocancelacion | varchar(150) | YES | - |
| 8 | usuariocancelo | varchar(15) | YES | - |
| 9 | fechacancelacion | datetime | YES | - |
| 10 | observaciones | varchar(150) | YES | - |
| 11 | pax | numeric(3,0) | YES | - |
| 12 | fechaaltareserva | datetime | YES | - |
| 13 | fechareserva | datetime | YES | - |
| 14 | mesareservada | varchar(150) | YES | - |
| 15 | usuarioreserva | varchar(15) | YES | - |
| 16 | folio | bigint | YES | - |
| 17 | fumar | numeric(1,0) | YES | - |

## dbo.saldosclientes

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idcliente | varchar(15) | NO | - |
| 2 | saldo | money | YES | - |

## dbo.serviciominutospatin

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idservicio | varchar(15) | YES | - |
| 2 | tiempo | int | YES | - |

## dbo.sincronizacion

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idsincronizacion | int | NO | - |
| 2 | tabla | varchar(50) | YES | - |
| 3 | idtabla | varchar(50) | YES | - |
| 4 | valoridtabla | varchar(100) | YES | - |
| 5 | status | int | YES | - |
| 6 | fechamovto | datetime | YES | - |
| 7 | usuariomovto | varchar(20) | YES | - |
| 8 | proceso | int | YES | - |
| 9 | fechaactualizacion | datetime | YES | - |
| 10 | usuarioactualizacion | varchar(20) | YES | - |
| 11 | idempresa | varchar(15) | YES | - |
| 12 | idtabla2 | varchar(50) | YES | - |
| 13 | valoridtabla2 | varchar(100) | YES | - |
| 14 | offline | bit | YES | - |

## dbo.stockinsumos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idinsumo | varchar(15) | YES | - |
| 2 | idinsumospresentaciones | varchar(15) | YES | - |
| 3 | idalmacen | varchar(5) | YES | - |
| 4 | stockminimo | numeric(12,4) | YES | - |
| 5 | stockideal | numeric(12,4) | YES | - |
| 6 | stockmaximo | numeric(12,4) | YES | - |
| 7 | idempresa | varchar(15) | YES | - |

## dbo.subgrupos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idsubgrupo | varchar(4) | NO | - |
| 2 | descripcion | varchar(40) | YES | - |
| 3 | imagenmenuelectronico | image | YES | - |

## dbo.subgruposproductos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idsubgrupo | varchar(4) | YES | - |
| 2 | idproducto | varchar(15) | YES | - |

## dbo.sucursalescallcenter

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idsucursal | varchar(5) | NO | - |
| 2 | descripcion | varchar(40) | YES | - |
| 3 | direccion | varchar(120) | YES | - |
| 4 | activa | bit | YES | - |
| 5 | lunestrabaja | bit | YES | - |
| 6 | martestrabaja | bit | YES | - |
| 7 | miercolestrabaja | bit | YES | - |
| 8 | juevestrabaja | bit | YES | - |
| 9 | viernestrabaja | bit | YES | - |
| 10 | sabadotrabaja | bit | YES | - |
| 11 | domingotrabaja | bit | YES | - |
| 12 | lunesinicio | varchar(11) | YES | - |
| 13 | lunesfin | varchar(11) | YES | - |
| 14 | lunesdiafin | int | YES | - |
| 15 | martesinicio | varchar(11) | YES | - |
| 16 | martesfin | varchar(11) | YES | - |
| 17 | martesdiafin | int | YES | - |
| 18 | miercolesinicio | varchar(11) | YES | - |
| 19 | miercolesfin | varchar(11) | YES | - |
| 20 | miercolesdiafin | int | YES | - |
| 21 | juevesinicio | varchar(11) | YES | - |
| 22 | juevesfin | varchar(11) | YES | - |
| 23 | juevesdiafin | int | YES | - |
| 24 | viernesinicio | varchar(11) | YES | - |
| 25 | viernesfin | varchar(11) | YES | - |
| 26 | viernesdiafin | int | YES | - |
| 27 | sabadoinicio | varchar(11) | YES | - |
| 28 | sabadofin | varchar(11) | YES | - |
| 29 | sabadodiafin | int | YES | - |
| 30 | domingoinicio | varchar(11) | YES | - |
| 31 | domingofin | varchar(11) | YES | - |
| 32 | domingodiafin | int | YES | - |

## dbo.tablaaux

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | tabla | varchar(100) | YES | - |
| 2 | valor | varchar(250) | YES | - |
| 3 | movimiento | varchar(50) | YES | - |
| 4 | aplicacion | varchar(250) | YES | - |
| 5 | estacion | varchar(250) | YES | - |
| 6 | fecha | datetime | YES | - |

## dbo.tempbitacoratarjetacredito

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | bigint | YES | - |
| 2 | autorizacion | varchar(15) | YES | - |
| 3 | cuenta | varchar(20) | YES | - |
| 4 | vencimiento | varchar(4) | YES | - |
| 5 | importe | money | YES | - |
| 6 | fecha | datetime | YES | - |
| 7 | reimpresiones | numeric(3,0) | YES | - |
| 8 | mensajederespuesta | varchar(250) | YES | - |
| 9 | procedimiento | varchar(20) | YES | - |
| 10 | afiliacion | varchar(20) | YES | - |
| 11 | statustransaccion | numeric(1,0) | YES | - |
| 12 | idtransaccion | varchar(30) | YES | - |
| 13 | numerooperacion | varchar(50) | YES | - |
| 14 | informaciontarjeta | varchar(50) | YES | - |
| 15 | tipotarjeta | numeric(1,0) | YES | - |
| 16 | arqc | varchar(30) | YES | - |
| 17 | apn | varchar(30) | YES | - |
| 18 | apnlabel | varchar(30) | YES | - |

## dbo.tempbitacoratransacciones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | numeric(10,0) | YES | - |
| 2 | autorizacion | varchar(15) | YES | - |
| 3 | referencia | varchar(15) | YES | - |
| 4 | importe | money | YES | - |
| 5 | fecha | datetime | YES | - |
| 6 | reimpresiones | numeric(1,0) | YES | - |
| 7 | procedimiento | varchar(15) | YES | - |
| 8 | datosenvio | varchar(254) | YES | - |
| 9 | datosrespuesta | varchar(254) | YES | - |
| 10 | medusafol_prov | varchar(15) | YES | - |
| 11 | medusafol_ope | numeric(8,0) | YES | - |

## dbo.tempcancela

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliocheque | bigint | YES | - |
| 2 | comanda | varchar(8) | YES | - |
| 3 | cantidad | numeric(11,3) | YES | - |
| 4 | clave | varchar(15) | YES | - |
| 5 | razon | varchar(100) | YES | - |
| 6 | fecha | datetime | YES | - |
| 7 | usuario | varchar(15) | YES | - |
| 8 | precio | money | YES | - |

## dbo.tempcheqdet

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliodet | bigint | YES | - |
| 2 | movimiento | numeric(3,0) | YES | - |
| 3 | comanda | varchar(8) | YES | - |
| 4 | cantidad | numeric(14,6) | YES | - |
| 5 | idproducto | varchar(15) | YES | - |
| 6 | descuento | numeric(6,2) | YES | - |
| 7 | precio | money | YES | - |
| 8 | impuesto1 | numeric(5,2) | YES | - |
| 9 | impuesto2 | numeric(5,2) | YES | - |
| 10 | impuesto3 | numeric(5,2) | YES | - |
| 11 | preciosinimpuestos | money | YES | - |
| 12 | tiempo | varchar(20) | YES | - |
| 13 | hora | datetime | YES | - |
| 14 | modificador | bit | YES | - |
| 15 | mitad | numeric(1,0) | YES | - |
| 16 | comentario | varchar(60) | YES | - |
| 17 | idestacion | varchar(40) | YES | - |
| 18 | usuariodescuento | varchar(15) | YES | - |
| 19 | comentariodescuento | varchar(60) | YES | - |
| 20 | idtipodescuento | varchar(5) | YES | - |
| 21 | horaproduccion | datetime | YES | - |
| 22 | idproductocompuesto | varchar(15) | YES | - |
| 23 | productocompuestoprincipal | bit | YES | - |
| 24 | preciocatalogo | money | YES | - |
| 25 | marcar | bit | YES | - |
| 26 | idmeseroproducto | varchar(4) | YES | - |
| 27 | prioridadproduccion | varchar(1) | YES | - |
| 28 | estatuspatin | numeric(1,0) | YES | - |
| 29 | idcortesia | varchar(5) | YES | - |
| 30 | numerotarjeta | varchar(16) | YES | - |
| 31 | estadomonitor | numeric(1,0) | YES | - |
| 32 | llavemovto | varchar(100) | YES | - |
| 33 | folioproduccion | smallint | YES | - |
| 34 | nivel | numeric(1,0) | YES | - |

## dbo.tempcheqpedidos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliocheque | bigint | YES | - |
| 2 | idpedido | bigint | YES | - |

## dbo.tempcheques

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | bigint | NO | - |
| 2 | seriefolio | varchar(15) | YES | - |
| 3 | numcheque | bigint | YES | - |
| 4 | fecha | datetime | YES | - |
| 5 | salidarepartidor | datetime | YES | - |
| 6 | arriborepartidor | datetime | YES | - |
| 7 | cierre | datetime | YES | - |
| 8 | mesa | varchar(15) | YES | - |
| 9 | nopersonas | int | YES | - |
| 10 | idmesero | varchar(4) | YES | - |
| 11 | pagado | bit | YES | - |
| 12 | cancelado | bit | YES | - |
| 13 | impreso | bit | YES | - |
| 14 | impresiones | int | YES | - |
| 15 | cambio | money | YES | - |
| 16 | descuento | money | YES | - |
| 17 | reabiertas | int | YES | - |
| 18 | razoncancelado | varchar(100) | YES | - |
| 19 | orden | numeric(6,0) | YES | - |
| 20 | facturado | bit | YES | - |
| 21 | idcliente | varchar(15) | YES | - |
| 22 | idarearestaurant | varchar(5) | YES | - |
| 23 | idempresa | varchar(15) | YES | - |
| 24 | tipodeservicio | int | YES | - |
| 25 | idturno | bigint | YES | - |
| 26 | usuariocancelo | varchar(15) | YES | - |
| 27 | comentariodescuento | varchar(60) | YES | - |
| 28 | estacion | varchar(40) | YES | - |
| 29 | cambiorepartidor | money | YES | - |
| 30 | usuariodescuento | varchar(15) | YES | - |
| 31 | fechacancelado | datetime | YES | - |
| 32 | idtipodescuento | varchar(5) | YES | - |
| 33 | numerotarjeta | varchar(30) | YES | - |
| 34 | folionotadeconsumo | bigint | YES | - |
| 35 | notadeconsumo | bit | YES | - |
| 36 | propinapagada | bit | YES | - |
| 37 | propinafoliomovtocaja | bigint | YES | - |
| 38 | puntosmonederogenerados | money | YES | - |
| 39 | propinaincluida | money | YES | - |
| 40 | tarjetadescuento | varchar(30) | YES | - |
| 41 | porcentajefac | numeric(8,4) | YES | - |
| 42 | propinamanual | bit | YES | - |
| 43 | usuariopago | varchar(15) | YES | - |
| 44 | idclientefacturacion | varchar(15) | YES | - |
| 45 | cuentaenuso | bit | YES | - |
| 46 | observaciones | varchar(250) | YES | - |
| 47 | idclientedomicilio | varchar(15) | YES | - |
| 48 | iddireccion | varchar(15) | YES | - |
| 49 | telefonousadodomicilio | varchar(15) | YES | - |
| 50 | totalarticulos | numeric(11,2) | YES | - |
| 51 | subtotal | money | YES | - |
| 52 | subtotalsinimpuestos | money | YES | - |
| 53 | total | money | YES | - |
| 54 | totalconpropina | money | YES | - |
| 55 | totalimpuesto1 | money | YES | - |
| 56 | cargo | money | YES | - |
| 57 | totalconcargo | money | YES | - |
| 58 | totalconpropinacargo | money | YES | - |
| 59 | descuentoimporte | money | YES | - |
| 60 | efectivo | money | YES | - |
| 61 | tarjeta | money | YES | - |
| 62 | vales | money | YES | - |
| 63 | otros | money | YES | - |
| 64 | propina | money | YES | - |
| 65 | propinatarjeta | money | YES | - |
| 66 | campoadicional1 | varchar(30) | YES | - |
| 67 | idreservacion | varchar(15) | YES | - |
| 68 | idcomisionista | varchar(5) | YES | - |
| 69 | importecomision | money | YES | - |
| 70 | comisionpagada | bit | YES | - |
| 71 | fechapagocomision | datetime | YES | - |
| 72 | foliopagocomision | numeric(8,0) | YES | - |
| 73 | tipoventarapida | numeric(1,0) | YES | - |
| 74 | callcenter | bit | YES | - |
| 75 | idordencompra | bigint | YES | - |
| 76 | totalsindescuento | money | YES | - |
| 77 | totalalimentos | money | YES | - |
| 78 | totalbebidas | money | YES | - |
| 79 | totalotros | money | YES | - |
| 80 | totaldescuentos | money | YES | - |
| 81 | totaldescuentoalimentos | money | YES | - |
| 82 | totaldescuentobebidas | money | YES | - |
| 83 | totaldescuentootros | money | YES | - |
| 84 | totalcortesias | money | YES | - |
| 85 | totalcortesiaalimentos | money | YES | - |
| 86 | totalcortesiabebidas | money | YES | - |
| 87 | totalcortesiaotros | money | YES | - |
| 88 | totaldescuentoycortesia | money | YES | - |
| 89 | totalalimentossindescuentos | money | YES | - |
| 90 | totalbebidassindescuentos | money | YES | - |
| 91 | totalotrossindescuentos | money | YES | - |
| 92 | descuentocriterio | numeric(1,0) | YES | - |
| 93 | descuentomonedero | money | YES | - |
| 94 | idmenucomedor | varchar(15) | YES | - |
| 95 | subtotalcondescuento | money | YES | - |
| 96 | comisionpax | money | YES | - |
| 97 | procesadointerfaz | bit | YES | - |
| 98 | domicilioprogramado | bit | YES | - |
| 99 | fechadomicilioprogramado | datetime | YES | - |
| 100 | enviado | bit | YES | - |
| 101 | ncf | varchar(19) | YES | - |
| 102 | numerocuenta | varchar(20) | YES | - |
| 103 | codigo_unico_af | varchar(30) | YES | - |
| 104 | estatushub | int | YES | - |
| 105 | idfoliohub | numeric(8,0) | YES | - |
| 106 | EnviadoRW | bit | YES | - |
| 107 | autorizacionfolio | varchar(50) | YES | - |
| 108 | fechalimiteemision | datetime | YES | - |

## dbo.tempchequespagos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | bigint | YES | - |
| 2 | idformadepago | varchar(5) | YES | - |
| 3 | importe | money | YES | - |
| 4 | propina | money | YES | - |
| 5 | tipodecambio | money | YES | - |
| 6 | referencia | varchar(80) | YES | - |

## dbo.tempfoliosfacturados

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idfactura | numeric(10,0) | YES | - |
| 2 | folio | bigint | YES | - |
| 3 | porcentajefac | numeric(5,2) | YES | - |

## dbo.tempnumerostarjetas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | foliocuenta | bigint | YES | - |
| 2 | idformadepago | varchar(5) | YES | - |
| 3 | numerotarjeta | varchar(20) | YES | - |
| 4 | importe | money | YES | - |

## dbo.tipoclientes

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idtipocliente | varchar(5) | YES | - |
| 2 | descripcion | varchar(40) | YES | - |

## dbo.tipocomisionistas

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idtipocomisionista | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |

## dbo.tipodescuento

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idtipodescuento | varchar(5) | NO | - |
| 2 | desc_tipodescuento | varchar(30) | YES | - |
| 3 | descuento | numeric(6,2) | YES | - |
| 4 | Visible | bit | YES | - |

## dbo.tipoempresa

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idtipoempresa | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |

## dbo.tipogastos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | Idtipogasto | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |

## dbo.tipomenuclientes

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idtipomenu | varchar(5) | YES | - |
| 2 | descripcion | varchar(30) | YES | - |

## dbo.tipopedido

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idtipopedido | varchar(5) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |

## dbo.tipoproveedores

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idtipoproveedor | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |

## dbo.tiporeservaciones

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idtiporeservacion | varchar(5) | NO | - |
| 2 | descripcion | varchar(30) | YES | - |
| 3 | solicitacomisionista | bit | YES | - |
| 4 | descuento | numeric(5,2) | YES | - |

## dbo.tiposdemesa

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idtipomesa | varchar(15) | NO | - |
| 2 | tipodemesa | varchar(20) | YES | - |
| 3 | personas | numeric(3,0) | YES | - |
| 4 | tipo_imagen | smallint | YES | - |

## dbo.tiposdemesadetalles

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idempresa | varchar(15) | YES | - |
| 2 | idtipomesa | varchar(15) | YES | - |
| 3 | descargar | bit | YES | - |

## dbo.traspasosalmacen

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | folio | numeric(10,0) | NO | - |
| 2 | fecha | datetime | YES | - |
| 3 | almacenorigen | varchar(5) | YES | - |
| 4 | almacendestino | varchar(5) | YES | - |
| 5 | cancelado | bit | YES | - |
| 6 | usuario | varchar(15) | YES | - |
| 7 | usuariocancelo | varchar(15) | YES | - |
| 8 | nota | varchar(150) | YES | - |
| 9 | idempresa | varchar(15) | YES | - |
| 10 | idempresaorigen | varchar(15) | YES | - |
| 11 | idempresadestino | varchar(15) | YES | - |

## dbo.turnos

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idturnointerno | bigint | NO | - |
| 2 | idturno | bigint | YES | - |
| 3 | fondo | money | YES | - |
| 4 | apertura | datetime | YES | - |
| 5 | cierre | datetime | YES | - |
| 6 | idestacion | varchar(40) | YES | - |
| 7 | cajero | varchar(15) | YES | - |
| 8 | efectivo | money | YES | - |
| 9 | tarjeta | money | YES | - |
| 10 | vales | money | YES | - |
| 11 | credito | money | YES | - |
| 12 | procesadoweb | bit | YES | - |
| 13 | idempresa | varchar(15) | YES | - |

## dbo.turnosf

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idturnointerno | bigint | NO | - |
| 2 | idturno | bigint | YES | - |
| 3 | fondo | money | YES | - |
| 4 | apertura | datetime | YES | - |
| 5 | cierre | datetime | YES | - |
| 6 | idestacion | varchar(40) | YES | - |
| 7 | cajero | varchar(15) | YES | - |
| 8 | efectivo | money | YES | - |
| 9 | tarjeta | money | YES | - |
| 10 | vales | money | YES | - |
| 11 | credito | money | YES | - |
| 12 | procesadoweb | bit | YES | - |
| 13 | idempresa | varchar(15) | YES | - |

## dbo.udsmedida

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idunidad | varchar(50) | NO | - |

## dbo.udsmedidaequivale

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idunidad | varchar(50) | NO | - |
| 2 | cantidad | numeric(10,2) | YES | - |
| 3 | unidadequivale | varchar(50) | NO | - |

## dbo.usuarios

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | usuario | varchar(15) | NO | - |
| 2 | nombre | varchar(30) | YES | - |
| 3 | contraseña | varchar(150) | YES | - |
| 4 | administrador | bit | YES | - |
| 5 | perfil | varchar(15) | YES | - |
| 6 | barraherramientas | int | YES | - |
| 7 | idempresa | varchar(15) | YES | - |
| 8 | accesomodulo | numeric(1,0) | YES | - |
| 9 | estatuslogin | numeric(1,0) | YES | - |

## dbo.usuariosdescargar

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | usuario | varchar(15) | YES | - |
| 2 | idempresa | varchar(15) | YES | - |
| 3 | descargar | bit | YES | - |

## dbo.usuariosperfiles

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idusuariosperfiles | varchar(15) | NO | - |
| 2 | descripcion | varchar(60) | YES | - |
| 3 | autorizadoseguridad | bit | YES | - |
| 4 | puedeeditaralmacen | bit | YES | - |
| 5 | productos | bit | YES | - |
| 6 | meseros | bit | YES | - |
| 7 | clientes | bit | YES | - |
| 8 | insumos | bit | YES | - |
| 9 | almacenes | bit | YES | - |
| 10 | conceptosmovtos | bit | YES | - |
| 11 | proveedores | bit | YES | - |
| 12 | promocionesdescuentos | bit | YES | - |
| 13 | comisionistasreservaciones | bit | YES | - |
| 14 | gastos | bit | YES | - |
| 15 | cuentasporcobrarconsulta | bit | YES | - |
| 16 | cuentasporpagar | bit | YES | - |
| 17 | reservaciones | bit | YES | - |
| 18 | pagodecomisiones | bit | YES | - |
| 19 | cierrediario | bit | YES | - |
| 20 | pedidos | bit | YES | - |
| 21 | ordenesdecompra | bit | YES | - |
| 22 | compras | bit | YES | - |
| 23 | movtosalmacen | bit | YES | - |
| 24 | traspasos | bit | YES | - |
| 25 | inventariofisico | bit | YES | - |
| 26 | elaboracion | bit | YES | - |
| 27 | desperdicios | bit | YES | - |
| 28 | explosioninsumos | bit | YES | - |
| 29 | costosinsumosproveedor | bit | YES | - |
| 30 | recepciondearchivoproductos | bit | YES | - |
| 31 | monitordeventas | bit | YES | - |
| 32 | consultarturnos | bit | YES | - |
| 33 | consultadeprecios | bit | YES | - |
| 34 | consultarturnosabiertos | bit | YES | - |
| 35 | consultadecuentas | bit | YES | - |
| 36 | consultadefacturas | bit | YES | - |
| 37 | consultaderetirosdepositos | bit | YES | - |
| 38 | consultasaldotarjetas | bit | YES | - |
| 39 | consultabitacorahotel | bit | YES | - |
| 40 | reportesadmon | bit | YES | - |
| 41 | reportesventas | bit | YES | - |
| 42 | reportescaja | bit | YES | - |
| 43 | reportescompras | bit | YES | - |
| 44 | reportesalmacen | bit | YES | - |
| 45 | reportescostos | bit | YES | - |
| 46 | reportescuentasporpagar | bit | YES | - |
| 47 | manttoexportarimportar | bit | YES | - |
| 48 | manttoherramientasadmin | bit | YES | - |
| 49 | aperturacierreturno | bit | YES | - |
| 50 | pagarpropinas | bit | YES | - |
| 51 | retirosdepositos | bit | YES | - |
| 52 | cortedecaja | bit | YES | - |
| 53 | serviciocomedor | bit | YES | - |
| 54 | serviciodomicilio | bit | YES | - |
| 55 | serviciorapido | bit | YES | - |
| 56 | facturacion | bit | YES | - |
| 57 | cuentasporcobrar | bit | YES | - |
| 58 | imprimirnotadeconsumonueva | bit | YES | - |
| 59 | traspasodesdecentrodeconsumo | bit | YES | - |
| 60 | inventariofisicociego | bit | YES | - |
| 61 | configuracion | bit | YES | - |
| 62 | consultaimpresorafiscal | bit | YES | - |
| 63 | consultahabitacion | bit | YES | - |
| 64 | cortedecajaz | bit | YES | - |
| 65 | repartidores | bit | YES | - |
| 66 | reportescontabilidad | bit | YES | - |
| 67 | cambiodeusuario | bit | YES | - |
| 68 | tipodescuento | bit | YES | - |
| 69 | abonarsaldotarjeta | bit | YES | - |
| 70 | bdreindexado | bit | YES | - |
| 71 | bdrespaldorecuperacion | bit | YES | - |
| 72 | bdinicializar | bit | YES | - |
| 73 | bdaccesar | bit | YES | - |
| 74 | bdarreglar | bit | YES | - |
| 75 | patinescontrol | bit | YES | - |
| 76 | patinescatalogo | bit | YES | - |
| 77 | patinesreporte | bit | YES | - |
| 78 | billarcontrol | bit | YES | - |
| 79 | billarcatalogo | bit | YES | - |
| 80 | billarreporte | bit | YES | - |
| 81 | cancelaciones | bit | YES | - |
| 82 | reabrir | bit | YES | - |
| 83 | descuentos | bit | YES | - |
| 84 | incluirpropina | bit | YES | - |
| 85 | reimprimir | bit | YES | - |
| 86 | cambiarproductodemesa | bit | YES | - |
| 87 | cambiodemesa | bit | YES | - |
| 88 | juntarmesas | bit | YES | - |
| 89 | seguridadprecioabierto | bit | YES | - |
| 90 | seguridaddividircuentas | bit | YES | - |
| 91 | autorizacioncancelaproductorapido | bit | YES | - |
| 92 | autorizacioncierrecomandero | bit | YES | - |
| 93 | autorizaciondeslizartarjeta | bit | YES | - |
| 94 | autorizacioncambiarmesero | bit | YES | - |
| 95 | autorizacioncargo | bit | YES | - |
| 96 | autorizarpedidos | bit | YES | - |
| 97 | enviarordenesemail | bit | YES | - |
| 98 | abrircajon | bit | YES | - |
| 99 | nuevo | bit | YES | - |
| 100 | editar | bit | YES | - |
| 101 | eliminar | bit | YES | - |
| 102 | autorizacionacumularpuntos | bit | YES | - |
| 103 | autorizacionpagoconpuntos | bit | YES | - |
| 104 | autorizaciongruposcaptura | bit | YES | - |
| 105 | autorizacionventacredito | bit | YES | - |
| 106 | comedorempleados | bit | YES | - |
| 107 | vercostocompra | bit | YES | - |
| 108 | mapademesas | bit | YES | - |
| 109 | bitacorasinc | bit | YES | - |
| 110 | licenciasreg | bit | YES | - |
| 111 | cortesiamonedero | bit | YES | - |
| 112 | reimprimirfoliospagados | bit | YES | - |
| 113 | tarjetadecredito | bit | YES | - |
| 114 | conexionservidor | bit | YES | - |
| 115 | actualizarsistemas | bit | YES | - |
| 116 | cedis | bit | YES | - |
| 117 | abonomonedero | bit | YES | - |
| 118 | inventariopendiente | bit | YES | - |
| 119 | empresas | bit | YES | - |
| 120 | sucursalescallcenter | bit | YES | - |
| 121 | areaventa | bit | YES | - |
| 122 | descuentomaximopermitido | numeric(6,2) | YES | - |
| 123 | autorizacioncancelarproductos | bit | YES | - |
| 124 | autorizacioncancelarcompras | bit | YES | - |
| 125 | autorizacioncancelartraspasos | bit | YES | - |
| 126 | autorizacioncancelarmovtosalmacen | bit | YES | - |
| 127 | autorizacioncambiarfechaalmacen | bit | YES | - |
| 128 | passwordsalirsistema | bit | YES | - |
| 129 | reabrircuentapagada | bit | YES | - |
| 130 | paises | bit | YES | - |
| 131 | estados | bit | YES | - |
| 132 | empresascentral | bit | YES | - |
| 133 | facturacionmexico | bit | YES | - |
| 134 | reporteconsolidado | bit | YES | - |
| 135 | sincronizacioncatalogos | bit | YES | - |
| 136 | autorizacionmodoinventario | bit | YES | - |
| 137 | sincronizacion | bit | YES | - |
| 138 | descargacatalogos | bit | YES | - |
| 139 | cargacatalogos | bit | YES | - |
| 140 | enviarorden | bit | NO | - |
| 141 | editarfechacompras | bit | NO | - |

## dbo.usuariosperfilescatalogo

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idusuariosperfiles | varchar(15) | NO | - |
| 2 | catalogo | varchar(100) | YES | - |
| 3 | nuevo | bit | YES | - |
| 4 | editar | bit | YES | - |
| 5 | eliminar | bit | YES | - |

## dbo.ws_cloud

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | ID | int | NO | - |
| 2 | WSUsuario | nvarchar(50) | NO | - |
| 3 | WSUrl | nvarchar(500) | NO | - |
| 4 | WSContrasena | nvarchar(50) | NO | - |
| 5 | Version | nvarchar(10) | NO | - |
| 6 | RecordarUsuario | bit | NO | - |
| 7 | RWActivo | bit | NO | - |
| 8 | RWTimer | int | NO | - |
| 9 | WSIDSistema | int | YES | - |

## dbo.zonasdomicilio

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idzona | varchar(5) | NO | - |
| 2 | descripcion | varchar(150) | YES | - |
| 3 | idproducto | varchar(15) | YES | - |

## dbo.zonasdomiciliodescargar

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idempresa | varchar(15) | YES | - |
| 2 | descargar | bit | NO | - |
| 3 | idzona | varchar(5) | YES | - |

## dbo.zonasdomiciliosucursales

| # | Columna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | idzona | varchar(5) | NO | - |
| 2 | idsucursal | varchar(5) | YES | - |
| 3 | prioridad | int | YES | - |
