/**
 * js/admin.js
 * -------------------------------------------------------------
 * CRUD real contra Supabase para las páginas del panel admin:
 *  - admin/dashboard.html    -> resumen + últimos dispositivos
 *  - admin/clientes.html     -> listar/crear clientes*
 *  - admin/dispositivos.html -> listar/crear/cambiar estado
 *  - admin/servicios.html    -> listar/crear servicios
 *  - admin/reparaciones.html -> listar/asignar servicios
 *
 * *Nota sobre clientes: como ahora usamos Supabase Auth, un admin
 * no puede crear un cliente con solo un INSERT (necesitaría crear
 * también su usuario de autenticación, lo cual requiere la
 * "service_role key" que NUNCA debe estar en el frontend). Por eso,
 * el formulario de "Registrar cliente" en este archivo usa
 * supabase.auth.signUp() igual que registro.html — funciona, pero
 * ten en cuenta que técnicamente loguea brevemente a ese cliente
 * en el navegador del admin. Para un flujo 100% correcto, lo ideal
 * es crear clientes desde una función de servidor (Fase 3).
 * -------------------------------------------------------------
 */

// Clase CSS del LED según el estado del dispositivo (usada en Dashboard y Reparaciones)
function claseLed(estado) {
    const mapa = {
        'Recibido': 'led-recibido',
        'En diagnóstico': 'led-diagnostico',
        'En espera': 'led-espera',
        'En mantenimiento': 'led-mantenimiento',
        'En pruebas': 'led-pruebas',
        'Listo para entregar': 'led-listo',
        'Entregado': 'led-entregado'
    };
    return mapa[estado] || 'led-recibido';
}

document.addEventListener('DOMContentLoaded', function () {

    /* =========================================================
       DASHBOARD ADMIN
    ========================================================= */
    const resumenAdmin = document.getElementById('resumen-admin');
    if (resumenAdmin) {
        (async () => {
            const [
                { count: totalClientes },
                { data: todosDispositivos },
                { count: totalServicios },
                { count: citasPendientes },
                { data: todasReparaciones }
            ] = await Promise.all([
                supabaseClient.from('clientes').select('*', { count: 'exact', head: true }),
                supabaseClient.from('dispositivos').select('estado'),
                supabaseClient.from('servicios').select('*', { count: 'exact', head: true }).eq('activo', true),
                supabaseClient.from('citas').select('*', { count: 'exact', head: true }).eq('estado', 'Pendiente'),
                supabaseClient.from('reparaciones').select('costo_final, servicios(tipo)')
            ]);

            const totalClientesVal = totalClientes ?? 0;
            const totalServiciosVal = totalServicios ?? 0;
            const totalDispositivosVal = todosDispositivos ? todosDispositivos.length : 0;
            const citasPendientesVal = citasPendientes ?? 0;

            // Calcular dispositivos en proceso (taller) - no entregados
            const pendientes = todosDispositivos ? todosDispositivos.filter(d => d.estado !== 'Entregado').length : 0;

            // Calcular ventas totales
            const totalVentas = todasReparaciones ? todasReparaciones.reduce((suma, r) => suma + Number(r.costo_final || 0), 0) : 0;

            // Renderizar las 6 tarjetas en el Dashboard
            resumenAdmin.innerHTML = `
                <div class="resumen-card"><div class="top"><span class="icono">👥</span></div><div class="numero">${totalClientesVal}</div><div class="etiqueta">Clientes registrados</div></div>
                <div class="resumen-card"><div class="top"><span class="icono">💻</span></div><div class="numero">${totalDispositivosVal}</div><div class="etiqueta">Dispositivos totales</div></div>
                <div class="resumen-card"><div class="top"><span class="icono">🔧</span></div><div class="numero">${pendientes}</div><div class="etiqueta">En proceso taller</div></div>
                <div class="resumen-card"><div class="top"><span class="icono">🧰</span></div><div class="numero">${totalServiciosVal}</div><div class="etiqueta">Servicios activos</div></div>
                <div class="resumen-card"><div class="top"><span class="icono">💵</span></div><div class="numero">$${totalVentas.toFixed(2)}</div><div class="etiqueta">Ventas totales</div></div>
                <div class="resumen-card"><div class="top"><span class="icono">📅</span></div><div class="numero">${citasPendientesVal}</div><div class="etiqueta">Citas pendientes</div></div>
            `;

            // --- REPORTE 1: Distribución de Dispositivos por Estado ---
            const graficoDispositivos = document.getElementById('grafico-dispositivos');
            if (graficoDispositivos) {
                const estadosPosibles = [
                    { nombre: 'Recibido', color: 'var(--led-azul)' },
                    { nombre: 'En diagnóstico', color: 'var(--led-ambar)' },
                    { nombre: 'En espera', color: 'var(--led-rojo)' },
                    { nombre: 'En mantenimiento', color: 'var(--led-morado)' },
                    { nombre: 'En pruebas', color: '#14B8A6' },
                    { nombre: 'Listo para entregar', color: 'var(--led-verde)' },
                    { nombre: 'Entregado', color: 'var(--led-gris)' }
                ];

                const conteos = {};
                estadosPosibles.forEach(e => conteos[e.nombre] = 0);
                
                if (todosDispositivos) {
                    todosDispositivos.forEach(d => {
                        if (conteos[d.estado] !== undefined) {
                            conteos[d.estado]++;
                        }
                    });
                }

                graficoDispositivos.innerHTML = estadosPosibles.map(e => {
                    const cant = conteos[e.nombre];
                    const porcentaje = totalDispositivosVal > 0 ? ((cant / totalDispositivosVal) * 100).toFixed(1) : 0;
                    
                    return `
                        <div>
                            <div class="d-flex justify-content-between mb-1" style="font-size:0.86rem; font-weight:500;">
                                <span style="display:flex; align-items:center; gap:6px;">
                                    <span style="width:8px; height:8px; border-radius:50%; background:${e.color}; display:inline-block;"></span>
                                    ${e.nombre}
                                </span>
                                <span class="mono">${cant} <span style="color:var(--pizarra); font-size:0.78rem;">(${porcentaje}%)</span></span>
                            </div>
                            <div class="progress" style="height: 6px; background-color: var(--papel-alt); border-radius: 4px; overflow: hidden;">
                                <div class="progress-bar" style="width: ${porcentaje}%; background-color: ${e.color}; height: 100%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // --- REPORTE 2: Ventas por Categoría de Servicio ---
            const graficoVentas = document.getElementById('grafico-ventas-categoria');
            if (graficoVentas) {
                const categorias = [
                    { id: 'hardware', label: 'Hardware', color: 'var(--azul-senal)' },
                    { id: 'software', label: 'Software', color: 'var(--led-morado)' },
                    { id: 'mantenimiento', label: 'Mantenimiento', color: 'var(--led-ambar)' },
                    { id: 'otro', label: 'Otro / General', color: 'var(--led-gris)' }
                ];

                const ventasPorCat = {};
                categorias.forEach(c => ventasPorCat[c.id] = 0);

                if (todasReparaciones) {
                    todasReparaciones.forEach(r => {
                        const tipo = r.servicios?.tipo || 'otro';
                        const cat = ventasPorCat[tipo] !== undefined ? tipo : 'otro';
                        ventasPorCat[cat] += Number(r.costo_final || 0);
                    });
                }

                graficoVentas.innerHTML = categorias.map(c => {
                    const totalCat = ventasPorCat[c.id];
                    const porcentaje = totalVentas > 0 ? ((totalCat / totalVentas) * 100).toFixed(1) : 0;

                    return `
                        <div>
                            <div class="d-flex justify-content-between mb-1" style="font-size:0.86rem; font-weight:500;">
                                <span>${c.label}</span>
                                <span class="mono">$${totalCat.toFixed(2)} <span style="color:var(--pizarra); font-size:0.78rem;">(${porcentaje}%)</span></span>
                            </div>
                            <div class="progress" style="height: 6px; background-color: var(--papel-alt); border-radius: 4px; overflow: hidden;">
                                <div class="progress-bar" style="width: ${porcentaje}%; background-color: ${c.color}; height: 100%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        })();
    }

    const tablaDashboard = document.getElementById('tabla-dashboard');
    if (tablaDashboard) {
        (async () => {
            const { data, error } = await supabaseClient
                .from('dispositivos')
                .select('*, clientes(nombre, apellido)')
                .order('fecha_ingreso', { ascending: false })
                .limit(5);

            if (error || !data || data.length === 0) {
                tablaDashboard.innerHTML = `<tr><td colspan="6" class="vacio">No hay dispositivos registrados todavía.</td></tr>`;
                return;
            }

            tablaDashboard.innerHTML = data.map(d => `
                <tr>
                    <td class="mono">${d.ticket || d.id_dispositivo.slice(0, 8)}</td>
                    <td>${d.clientes?.nombre || ''} ${d.clientes?.apellido || ''}</td>
                    <td>${d.tipo_dispositivo} ${d.marca || ''}</td>
                    <td><span class="led-estado ${claseLed(d.estado)}"><span class="punto"></span>${d.estado}</span></td>
                    <td>${formatoFecha(d.fecha_ingreso)}</td>
                    <td class="acciones-tabla"><a href="dispositivos.html" class="btn btn-secondary btn-sm"><i class="bi bi-eye"></i> Ver</a></td>
                </tr>
            `).join('');
        })();
    }

    /* =========================================================
       CLIENTES
    ========================================================= */
    const tablaClientes = document.getElementById('tabla-clientes');
    if (tablaClientes) {

        async function renderClientes(filtro = '') {
            let consulta = supabaseClient
                .from('clientes')
                .select('*, dispositivos(count)')
                .order('fecha_registro', { ascending: false });

            const { data, error } = await consulta;

            if (error) {
                tablaClientes.innerHTML = `<tr><td colspan="6" class="vacio">Error: ${error.message}</td></tr>`;
                return;
            }

            const texto = filtro.toLowerCase();
            const filas = (data || []).filter(c =>
                `${c.nombre} ${c.apellido}`.toLowerCase().includes(texto) || c.correo.toLowerCase().includes(texto)
            );

            if (filas.length === 0) {
                tablaClientes.innerHTML = `<tr><td colspan="6" class="vacio">No se encontraron clientes.</td></tr>`;
                return;
            }

            tablaClientes.innerHTML = filas.map(c => `
                <tr>
                    <td><span class="avatar-inicial">${iniciales(c.nombre + ' ' + c.apellido)}</span>${c.nombre} ${c.apellido}</td>
                    <td>${c.correo}</td>
                    <td>${c.telefono || '—'}</td>
                    <td>${c.dispositivos?.[0]?.count ?? 0}</td>
                    <td>${formatoFecha(c.fecha_registro?.slice(0, 10))}</td>
                    <td class="acciones-tabla">
                        <button class="btn btn-danger btn-sm" onclick="eliminarCliente('${c.id_cliente}')"><i class="bi bi-trash"></i> Eliminar</button>
                    </td>
                </tr>
            `).join('');
        }

        renderClientes();

        const buscadorClientes = document.getElementById('buscador-clientes');
        if (buscadorClientes) buscadorClientes.addEventListener('input', e => renderClientes(e.target.value));

        const formCrearCliente = document.getElementById('form-crear-cliente');
        if (formCrearCliente) {
            formCrearCliente.addEventListener('submit', async function (e) {
                e.preventDefault();
                const caja = formCrearCliente.querySelector('.mensaje-formulario') || crearCajaMensaje(formCrearCliente);
                const fd = new FormData(formCrearCliente);
                const [nombre, apellido] = [fd.get('nombre').trim(), ''];

                // Nota: el form solo pide "Nombre completo" en un campo;
                // lo separamos en nombre/apellido por la primera palabra.
                const partes = fd.get('nombre').trim().split(' ');
                const nombreReal = partes[0];
                const apellidoReal = partes.slice(1).join(' ') || '-';

                const resultado = await registrarCliente({
                    nombre: nombreReal,
                    apellido: apellidoReal,
                    correo: fd.get('correo').trim(),
                    telefono: fd.get('telefono').trim(),
                    contrasena: fd.get('contrasena')
                });

                mostrarMensaje(caja, resultado.mensaje, resultado.ok);
                if (resultado.ok) {
                    formCrearCliente.reset();
                    renderClientes();
                }
            });
        }
    }

    /* =========================================================
       DISPOSITIVOS
    ========================================================= */
    const tablaDispositivosAdmin = document.getElementById('tabla-dispositivos-admin');
    const selectClienteDispositivo = document.getElementById('select-cliente-dispositivo');

    if (tablaDispositivosAdmin) {

        async function cargarClientesEnSelect() {
            if (!selectClienteDispositivo) return;
            const { data } = await supabaseClient.from('clientes').select('id_cliente, nombre, apellido').order('nombre');
            (data || []).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id_cliente;
                opt.textContent = `${c.nombre} ${c.apellido}`;
                selectClienteDispositivo.appendChild(opt);
            });
        }

        async function renderDispositivosAdmin(filtro = '') {
            const { data, error } = await supabaseClient
                .from('dispositivos')
                .select('*, clientes(nombre, apellido)')
                .order('fecha_ingreso', { ascending: false });

            if (error) {
                tablaDispositivosAdmin.innerHTML = `<tr><td colspan="7" class="vacio">Error: ${error.message}</td></tr>`;
                return;
            }

            const texto = filtro.toLowerCase();
            const filas = (data || []).filter(d =>
                (d.ticket || '').toLowerCase().includes(texto) ||
                `${d.clientes?.nombre} ${d.clientes?.apellido}`.toLowerCase().includes(texto)
            );

            if (filas.length === 0) {
                tablaDispositivosAdmin.innerHTML = `<tr><td colspan="7" class="vacio">No se encontraron dispositivos.</td></tr>`;
                return;
            }

            tablaDispositivosAdmin.innerHTML = filas.map(d => `
                <tr>
                    <td class="mono">${d.ticket || d.id_dispositivo.slice(0, 8)}</td>
                    <td>${d.clientes?.nombre || ''} ${d.clientes?.apellido || ''}</td>
                    <td>${d.tipo_dispositivo} ${d.marca || ''}</td>
                    <td>${formatoFecha(d.fecha_ingreso)}</td>
                    <td>${formatoFecha(d.fecha_entrega_estimada)}</td>
                    <td>
                        <select class="select-estado" data-id="${d.id_dispositivo}" data-estado-anterior="${d.estado}">
                            ${ESTADOS_FLUJO.map(e => `<option value="${e}" ${e === d.estado ? 'selected' : ''}>${e}</option>`).join('')}
                        </select>
                    </td>
                    <td class="acciones-tabla">
                        <a href="../pages/dispositivo-detalle.html?id=${d.id_dispositivo}" class="btn btn-secondary btn-sm"><i class="bi bi-eye"></i> Ver</a>
                        <button class="btn btn-danger btn-sm" onclick="eliminarDispositivo('${d.id_dispositivo}')"><i class="bi bi-trash"></i> Eliminar</button>
                    </td>
                </tr>
            `).join('');

            tablaDispositivosAdmin.querySelectorAll('.select-estado').forEach(select => {
                select.addEventListener('change', async function () {
                    const idDispositivo = this.dataset.id;
                    const estadoAnterior = this.dataset.estadoAnterior;
                    const estadoNuevo = this.value;

                    const { error: errorUpdate } = await supabaseClient
                        .from('dispositivos')
                        .update({ estado: estadoNuevo })
                        .eq('id_dispositivo', idDispositivo);

                    if (errorUpdate) {
                        mostrarToast('Error al actualizar: ' + errorUpdate.message);
                        return;
                    }

                    await supabaseClient.from('historial_estados').insert([{
                        id_dispositivo: idDispositivo,
                        estado_anterior: estadoAnterior,
                        estado_nuevo: estadoNuevo
                    }]);

                    this.dataset.estadoAnterior = estadoNuevo;
                    mostrarToast(`Estado actualizado a "${estadoNuevo}"`);
                });
            });
        }

        cargarClientesEnSelect();
        renderDispositivosAdmin();

        const buscadorDispositivos = document.getElementById('buscador-dispositivos');
        if (buscadorDispositivos) buscadorDispositivos.addEventListener('input', e => renderDispositivosAdmin(e.target.value));

        const formCrearDispositivo = document.getElementById('form-crear-dispositivo');
        if (formCrearDispositivo) {
            formCrearDispositivo.addEventListener('submit', async function (e) {
                e.preventDefault();
                const caja = formCrearDispositivo.querySelector('.mensaje-formulario') || crearCajaMensaje(formCrearDispositivo);
                const fd = new FormData(formCrearDispositivo);

                const ticket = 'TF-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

                const { error } = await supabaseClient.from('dispositivos').insert([{
                    id_cliente: fd.get('cliente'),
                    ticket,
                    tipo_dispositivo: fd.get('tipo'),
                    marca: fd.get('marca'),
                    modelo: fd.get('modelo'),
                    descripcion_problema: fd.get('problema'),
                    fecha_ingreso: fd.get('fecha_ingreso'),
                    fecha_entrega_estimada: fd.get('fecha_estimada') || null,
                    estado: 'Recibido'
                }]);

                mostrarMensaje(caja, error ? error.message : `Dispositivo registrado con ticket ${ticket}.`, !error);
                if (!error) {
                    formCrearDispositivo.reset();
                    renderDispositivosAdmin();
                }
            });
        }
    }

    /* =========================================================
       SERVICIOS
    ========================================================= */
    const gridServiciosAdmin = document.getElementById('grid-servicios-admin');
    if (gridServiciosAdmin) {

        async function renderServiciosAdmin() {
            const { data, error } = await supabaseClient.from('servicios').select('*').order('tipo');

            if (error) {
                gridServiciosAdmin.innerHTML = `<p class="vacio">Error: ${error.message}</p>`;
                return;
            }

            if (!data || data.length === 0) {
                gridServiciosAdmin.innerHTML = `<p class="vacio">Aún no hay servicios registrados.</p>`;
                return;
            }

            const ICONOS = {
                ciberseguridad: '<i class="bi bi-shield-check"></i>',
                hardware: '<i class="bi bi-cpu"></i>',
                software: '<i class="bi bi-floppy"></i>',
                mantenimiento: '<i class="bi bi-brush"></i>',
                otro: '<i class="bi bi-tools"></i>'
            };

            gridServiciosAdmin.innerHTML = data.map(s => `
                <div class="tarjeta-servicio">
                    <div class="icono-servicio">${ICONOS[s.tipo] || '<i class="bi bi-tools"></i>'}</div>
                    <span class="etiqueta-tipo">${s.tipo}${s.activo ? '' : ' · inactivo'}</span>
                    <h3>${s.nombre_servicio}</h3>
                    <p>${s.descripcion ?? ''}</p>
                    <div class="pie-servicio">
                        <span class="precio">$${Number(s.precio).toFixed(2)}</span>
                        <div class="acciones-tabla">
                            <button class="btn btn-danger btn-sm" onclick="eliminarServicio('${s.id_servicio}')"><i class="bi bi-trash"></i> Eliminar</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        renderServiciosAdmin();

        const formCrearServicio = document.getElementById('form-crear-servicio');
        if (formCrearServicio) {
            formCrearServicio.addEventListener('submit', async function (e) {
                e.preventDefault();
                const caja = formCrearServicio.querySelector('.mensaje-formulario') || crearCajaMensaje(formCrearServicio);
                const fd = new FormData(formCrearServicio);

                const { error } = await supabaseClient.from('servicios').insert([{
                    nombre_servicio: fd.get('nombre'),
                    descripcion: fd.get('descripcion'),
                    precio: parseFloat(fd.get('precio')),
                    tipo: fd.get('tipo')
                }]);

                mostrarMensaje(caja, error ? error.message : 'Servicio creado correctamente.', !error);
                if (!error) {
                    formCrearServicio.reset();
                    renderServiciosAdmin();
                }
            });
        }
    }

    /* =========================================================
       REPARACIONES
    ========================================================= */
    const tablaReparaciones = document.getElementById('tabla-reparaciones');
    const selectDispositivoReparacion = document.getElementById('select-dispositivo-reparacion');
    const selectServicioReparacion = document.getElementById('select-servicio-reparacion');

    if (tablaReparaciones) {

        async function cargarSelectsReparacion() {
            const [{ data: dispositivos }, { data: servicios }] = await Promise.all([
                supabaseClient.from('dispositivos').select('id_dispositivo, ticket, tipo_dispositivo, marca, clientes(nombre, apellido)').order('fecha_ingreso', { ascending: false }),
                supabaseClient.from('servicios').select('id_servicio, nombre_servicio, precio').eq('activo', true).order('nombre_servicio')
            ]);

            (dispositivos || []).forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id_dispositivo;
                opt.textContent = `#${d.ticket || d.id_dispositivo.slice(0, 8)} · ${d.tipo_dispositivo} ${d.marca || ''} — ${d.clientes?.nombre || ''} ${d.clientes?.apellido || ''}`;
                selectDispositivoReparacion.appendChild(opt);
            });

            (servicios || []).forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id_servicio;
                opt.dataset.precio = s.precio;
                opt.textContent = `${s.nombre_servicio} ($${Number(s.precio).toFixed(2)})`;
                selectServicioReparacion.appendChild(opt);
            });
        }

        async function renderReparaciones(filtro = '') {
            const { data, error } = await supabaseClient
                .from('reparaciones')
                .select('*, servicios(nombre_servicio), dispositivos(ticket, tipo_dispositivo, marca, estado, clientes(nombre, apellido))')
                .order('fecha_asignacion', { ascending: false });

            if (error) {
                tablaReparaciones.innerHTML = `<tr><td colspan="7" class="vacio">Error: ${error.message}</td></tr>`;
                return;
            }

            const texto = filtro.toLowerCase();
            const filas = (data || []).filter(r =>
                (r.dispositivos?.ticket || '').toLowerCase().includes(texto) ||
                `${r.dispositivos?.clientes?.nombre} ${r.dispositivos?.clientes?.apellido}`.toLowerCase().includes(texto)
            );

            if (filas.length === 0) {
                tablaReparaciones.innerHTML = `<tr><td colspan="7" class="vacio">No se encontraron reparaciones.</td></tr>`;
                return;
            }

            tablaReparaciones.innerHTML = filas.map(r => `
                <tr>
                    <td class="mono">${r.dispositivos?.ticket || '—'}</td>
                    <td>${r.dispositivos?.clientes?.nombre || ''} ${r.dispositivos?.clientes?.apellido || ''}</td>
                    <td>${r.dispositivos?.tipo_dispositivo || ''} ${r.dispositivos?.marca || ''}</td>
                    <td>${r.servicios?.nombre_servicio || '—'}</td>
                    <td class="mono">$${Number(r.costo_final || 0).toFixed(2)}</td>
                    <td><span class="led-estado ${claseLed(r.dispositivos?.estado)}"><span class="punto"></span>${r.dispositivos?.estado || '—'}</span></td>
                    <td class="acciones-tabla">
                        <button class="btn btn-danger btn-sm" onclick="eliminarReparacion('${r.id_reparacion}')"><i class="bi bi-trash"></i> Eliminar</button>
                    </td>
                </tr>
            `).join('');
        }

        cargarSelectsReparacion();
        renderReparaciones();

        const buscadorReparaciones = document.getElementById('buscador-reparaciones');
        if (buscadorReparaciones) buscadorReparaciones.addEventListener('input', e => renderReparaciones(e.target.value));

        const formCrearReparacion = document.getElementById('form-crear-reparacion');
        if (formCrearReparacion) {
            formCrearReparacion.addEventListener('submit', async function (e) {
                e.preventDefault();
                const caja = formCrearReparacion.querySelector('.mensaje-formulario') || crearCajaMensaje(formCrearReparacion);
                const fd = new FormData(formCrearReparacion);

                const opcionServicio = selectServicioReparacion.selectedOptions[0];
                const precioBase = opcionServicio ? parseFloat(opcionServicio.dataset.precio) : 0;

                const { error } = await supabaseClient.from('reparaciones').insert([{
                    id_dispositivo: fd.get('dispositivo'),
                    id_servicio: fd.get('servicio'),
                    observaciones: fd.get('observaciones'),
                    costo_final: precioBase
                }]);

                mostrarMensaje(caja, error ? error.message : 'Servicio asignado correctamente.', !error);
                if (!error) {
                    formCrearReparacion.reset();
                    renderReparaciones();
                }
            });
        }
    }

    /* =========================================================
       CITAS
    ========================================================= */
    const tablaCitas = document.getElementById('tabla-citas');
    if (tablaCitas) {

        let filtroEstadoActual = 'todas';

        async function renderCitas(filtroTexto = '') {
            const { data, error } = await supabaseClient
                .from('citas')
                .select('*')
                .order('fecha_creacion', { ascending: false });

            if (error) {
                tablaCitas.innerHTML = `<tr><td colspan="6" class="vacio">Error: ${error.message}</td></tr>`;
                return;
            }

            const texto = filtroTexto.toLowerCase();
            const filas = (data || []).filter(c => {
                const coincideTexto = c.nombre.toLowerCase().includes(texto) || c.correo.toLowerCase().includes(texto);
                const coincideEstado = filtroEstadoActual === 'todas' || c.estado === filtroEstadoActual;
                return coincideTexto && coincideEstado;
            });

            if (filas.length === 0) {
                tablaCitas.innerHTML = `<tr><td colspan="6" class="vacio">No hay citas en esta categoría.</td></tr>`;
                return;
            }

            const CLASE_ESTADO_CITA = {
                'Pendiente': 'led-diagnostico',
                'Confirmada': 'led-listo',
                'Atendida': 'led-entregado',
                'Cancelada': 'led-espera'
            };

            tablaCitas.innerHTML = filas.map(c => {
                const mensajeWpp = `Hola ${c.nombre}, te escribo de TechFix por tu solicitud de cita para el ${formatoFecha(c.fecha_preferida)} a las ${c.hora_preferida}.`;
                const linkWpp = construirLinkWhatsApp(c.telefono, mensajeWpp);

                return `
                <tr>
                    <td>${c.nombre}</td>
                    <td>${c.telefono}<br><span style="color:var(--pizarra); font-size:0.8rem;">${c.correo}</span></td>
                    <td>${c.tipo_dispositivo}${c.servicio_interes ? '<br><span style="color:var(--pizarra); font-size:0.8rem;">' + c.servicio_interes + '</span>' : ''}</td>
                    <td>${formatoFecha(c.fecha_preferida)}<br><span style="color:var(--pizarra); font-size:0.8rem;">${c.hora_preferida}</span></td>
                    <td>
                        <select class="select-estado" data-id="${c.id_cita}">
                            ${['Pendiente','Confirmada','Atendida','Cancelada'].map(e => `<option value="${e}" ${e === c.estado ? 'selected' : ''}>${e}</option>`).join('')}
                        </select>
                    </td>
                    <td class="acciones-tabla">
                        <a href="${linkWpp}" target="_blank" class="btn btn-secondary btn-sm"><i class="bi bi-whatsapp"></i> WhatsApp</a>
                        <button class="btn btn-danger btn-sm" onclick="eliminarCita('${c.id_cita}')"><i class="bi bi-trash"></i> Eliminar</button>
                    </td>
                </tr>
                `;
            }).join('');

            tablaCitas.querySelectorAll('.select-estado').forEach(select => {
                select.addEventListener('change', async function () {
                    const { error: errorUpdate } = await supabaseClient
                        .from('citas')
                        .update({ estado: this.value })
                        .eq('id_cita', this.dataset.id);

                    if (errorUpdate) {
                        mostrarToast('Error al actualizar: ' + errorUpdate.message);
                        return;
                    }
                    mostrarToast(`Cita marcada como "${this.value}"`);
                });
            });
        }

        renderCitas();

        document.querySelectorAll('[data-filtro-estado]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-filtro-estado]').forEach(b => b.classList.remove('activo'));
                btn.classList.add('activo');
                filtroEstadoActual = btn.dataset.filtroEstado;
                renderCitas(document.getElementById('buscador-citas')?.value || '');
            });
        });

        const buscadorCitas = document.getElementById('buscador-citas');
        if (buscadorCitas) buscadorCitas.addEventListener('input', e => renderCitas(e.target.value));
    }

});

/* =========================================================
   FUNCIONES DE ELIMINACIÓN (llamadas desde botones inline)
========================================================= */
async function eliminarCliente(id) {
    if (!confirm('¿Eliminar a este cliente? También se eliminarán sus dispositivos.')) return;
    const { error } = await supabaseClient.from('clientes').delete().eq('id_cliente', id);
    if (error) { mostrarToast('Error: ' + error.message); return; }
    document.getElementById('tabla-clientes')?.closest('table').dispatchEvent(new Event('recargar'));
    location.reload();
}

async function eliminarDispositivo(id) {
    if (!confirm('¿Eliminar este dispositivo? También se eliminará su historial.')) return;
    const { error } = await supabaseClient.from('dispositivos').delete().eq('id_dispositivo', id);
    if (error) { mostrarToast('Error: ' + error.message); return; }
    location.reload();
}

async function eliminarServicio(id) {
    if (!confirm('¿Eliminar este servicio?')) return;
    const { error } = await supabaseClient.from('servicios').delete().eq('id_servicio', id);
    if (error) {
        // Si ya fue usado en una reparación, mejor lo desactivamos en vez de borrarlo
        await supabaseClient.from('servicios').update({ activo: false }).eq('id_servicio', id);
        mostrarToast('Ese servicio ya fue usado en reparaciones: se desactivó en vez de eliminarse.');
        location.reload();
        return;
    }
    location.reload();
}

async function eliminarReparacion(id) {
    if (!confirm('¿Eliminar este registro de reparación?')) return;
    const { error } = await supabaseClient.from('reparaciones').delete().eq('id_reparacion', id);
    if (error) { mostrarToast('Error: ' + error.message); return; }
    location.reload();
}

async function eliminarCita(id) {
    if (!confirm('¿Eliminar esta cita?')) return;
    const { error } = await supabaseClient.from('citas').delete().eq('id_cita', id);
    if (error) { mostrarToast('Error: ' + error.message); return; }
    location.reload();
}

/* =========================================================
   HELPERS DE MENSAJES
========================================================= */
function crearCajaMensaje(form) {
    const caja = document.createElement('div');
    caja.className = 'alerta mensaje-formulario';
    caja.style.display = 'none';
    form.prepend(caja);
    return caja;
}

function mostrarMensaje(caja, texto, ok) {
    caja.textContent = texto;
    caja.className = 'alerta ' + (ok ? 'alerta-exito' : 'alerta-info') + ' mensaje-formulario';
    caja.style.display = 'flex';
}

function mostrarToast(mensaje) {
    let toast = document.getElementById('toast-admin');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-admin';
        toast.style.cssText = `
            position: fixed; bottom: 24px; right: 24px;
            background-color: #0B1220; color: #fff;
            padding: 12px 18px; border-radius: 8px;
            font-size: 0.86rem; font-family: 'Inter', sans-serif;
            box-shadow: 0 8px 24px rgba(0,0,0,0.25);
            z-index: 999; opacity: 0; transition: opacity 0.25s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.style.opacity = '1';
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}z