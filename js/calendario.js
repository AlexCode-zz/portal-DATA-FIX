/**
 * js/calendario.js
 * -------------------------------------------------------------
 * Calendario del panel admin (admin/calendario.html).
 *
 * Dos vistas ("modos"):
 *  - "dispositivos": marca en el día el/los ingreso(s) (fecha_ingreso)
 *    y entrega(s) real(es) (fecha_entrega_real) de los dispositivos.
 *  - "reparaciones": marca en el día las reparaciones asignadas
 *    (fecha_asignacion) en la tabla "reparaciones".
 *
 * Cada modo tiene además un selector para ver "Todos" o filtrar
 * por un dispositivo/ticket específico.
 *
 * Depende de: supabaseClient (supabase-client.js), formatoFecha
 * y claseLed (main.js / admin.js), que ya se cargan antes que
 * este script en admin/calendario.html.
 * -------------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', function () {

    const contCalendario = document.getElementById('calendario-grid');
    if (!contCalendario) return; // este script solo aplica a admin/calendario.html

    /* ---------- ESTADO ---------- */
    let fechaVista = new Date();
    fechaVista.setDate(1);

    let modoActual = 'dispositivos'; // 'dispositivos' | 'reparaciones'
    let filtroId = 'todos';
    let filtroTicket = ''; // texto del buscador de ticket

    let dispositivos = [];
    let reparaciones = [];

    let indiceDispositivos = {}; // 'YYYY-MM-DD' -> { ingresos: [...], entregas: [...] }
    let indiceReparaciones = {}; // 'YYYY-MM-DD' -> [...]

    const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    /* ---------- HELPERS ---------- */
    function soloFecha(iso) {
        if (!iso) return null;
        return iso.split('T')[0].split(' ')[0];
    }

    function coincideTicket(ticket) {
        if (!filtroTicket) return true;
        return (ticket || '').toLowerCase().includes(filtroTicket.toLowerCase());
    }

    function construirIndices() {
        indiceDispositivos = {};
        indiceReparaciones = {};

        dispositivos.forEach(d => {
            const fIngreso = soloFecha(d.fecha_ingreso);
            if (fIngreso) {
                if (!indiceDispositivos[fIngreso]) indiceDispositivos[fIngreso] = { ingresos: [], entregas: [] };
                indiceDispositivos[fIngreso].ingresos.push(d);
            }
            const fEntrega = soloFecha(d.fecha_entrega_real);
            if (fEntrega) {
                if (!indiceDispositivos[fEntrega]) indiceDispositivos[fEntrega] = { ingresos: [], entregas: [] };
                indiceDispositivos[fEntrega].entregas.push(d);
            }
        });

        reparaciones.forEach(r => {
            const f = soloFecha(r.fecha_asignacion);
            if (f) {
                if (!indiceReparaciones[f]) indiceReparaciones[f] = [];
                indiceReparaciones[f].push(r);
            }
        });
    }

    /* ---------- CARGA DE DATOS ---------- */
    async function cargarDatos() {
        const [{ data: dataDisp, error: errDisp }, { data: dataRep, error: errRep }] = await Promise.all([
            supabaseClient
                .from('dispositivos')
                .select('id_dispositivo, ticket, tipo_dispositivo, marca, estado, fecha_ingreso, fecha_entrega_estimada, fecha_entrega_real, clientes(nombre, apellido)')
                .order('fecha_ingreso', { ascending: true }),
            supabaseClient
                .from('reparaciones')
                .select('id_reparacion, costo_final, fecha_asignacion, observaciones, servicios(nombre_servicio, tipo), dispositivos(id_dispositivo, ticket, tipo_dispositivo, marca, estado, clientes(nombre, apellido))')
                .order('fecha_asignacion', { ascending: true })
        ]);

        if (errDisp || errRep) {
            contCalendario.innerHTML = `<p class="sin-datos">Error al cargar el calendario: ${(errDisp || errRep).message}</p>`;
            return;
        }

        dispositivos = dataDisp || [];
        reparaciones = dataRep || [];

        construirIndices();
        llenarSelectFiltro();
        renderCalendario();
    }

    /* ---------- SELECT DE FILTRO (por categoría, no por persona) ---------- */
    // Mismas categorías de servicio usadas en el dashboard (admin.js)
    const CATEGORIAS_SERVICIO = [
        { valor: 'hardware', label: 'Hardware' },
        { valor: 'software', label: 'Software' },
        { valor: 'mantenimiento', label: 'Mantenimiento' },
        { valor: 'otro', label: 'Otro / General' }
    ];

    // Normaliza "tipo_dispositivo" para que "Laptop", "laptop" y "LAPTOP "
    // caigan todas en la misma categoría (el dato en Supabase es texto libre
    // y no siempre se guardó con el mismo formato).
    function normalizarTipoDispositivo(texto) {
        if (!texto) return '';
        return texto
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase()
            .replace(/(^|\s)\p{L}/gu, letra => letra.toUpperCase());
    }

    function llenarSelectFiltro() {
        const select = document.getElementById('select-filtro-calendario');
        if (!select) return;

        if (modoActual === 'dispositivos') {
            select.innerHTML = `<option value="todos">Todos los dispositivos</option>`;

            const categorias = [...new Set(dispositivos.map(d => normalizarTipoDispositivo(d.tipo_dispositivo)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
            if (categorias.length) {
                const grupo = document.createElement('optgroup');
                grupo.label = 'Por categoría de dispositivo';
                categorias.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    grupo.appendChild(opt);
                });
                select.appendChild(grupo);
            }
        } else {
            select.innerHTML = `<option value="todos">Todas las reparaciones</option>`;

            const tiposPresentes = new Set(reparaciones.map(r => r.servicios?.tipo).filter(Boolean));
            const categoriasDisponibles = CATEGORIAS_SERVICIO.filter(c => tiposPresentes.has(c.valor));
            if (categoriasDisponibles.length) {
                const grupo = document.createElement('optgroup');
                grupo.label = 'Por categoría de servicio';
                categoriasDisponibles.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.valor;
                    opt.textContent = c.label;
                    grupo.appendChild(opt);
                });
                select.appendChild(grupo);
            }
        }

        select.value = 'todos';
        filtroId = 'todos';
    }

    /* ---------- RENDER DEL GRID ---------- */
    function renderCalendario() {
        const anio = fechaVista.getFullYear();
        const mes = fechaVista.getMonth();

        const etiqueta = document.getElementById('etiqueta-mes-calendario');
        if (etiqueta) etiqueta.textContent = `${MESES_LARGO[mes]} ${anio}`;

        const primerDiaSemana = new Date(anio, mes, 1).getDay();
        const diasEnMes = new Date(anio, mes + 1, 0).getDate();
        const diasMesAnterior = new Date(anio, mes, 0).getDate();

        const hoy = new Date();
        const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

        let celdas = [];

        for (let i = primerDiaSemana - 1; i >= 0; i--) {
            celdas.push({ dia: diasMesAnterior - i, fueraDeMes: true, fechaISO: null });
        }
        for (let d = 1; d <= diasEnMes; d++) {
            const fechaISO = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            celdas.push({ dia: d, fueraDeMes: false, fechaISO });
        }
        let relleno = 1;
        while (celdas.length % 7 !== 0) {
            celdas.push({ dia: relleno++, fueraDeMes: true, fechaISO: null });
        }

        const cabecera = DIAS_SEMANA.map(d => `<div class="calendario-dia-nombre">${d}</div>`).join('');

        const cuerpo = celdas.map(c => {
            if (c.fueraDeMes) {
                return `<div class="dia-celda dia-fuera-mes"><span class="dia-numero">${c.dia}</span></div>`;
            }

            const esHoy = c.fechaISO === hoyISO;
            let contenidoEventos = '';
            let tieneEventos = false;

            if (modoActual === 'dispositivos') {
                const info = indiceDispositivos[c.fechaISO];
                let ingresos = info?.ingresos || [];
                let entregas = info?.entregas || [];
                if (filtroId !== 'todos') {
                    ingresos = ingresos.filter(d => normalizarTipoDispositivo(d.tipo_dispositivo) === filtroId);
                    entregas = entregas.filter(d => normalizarTipoDispositivo(d.tipo_dispositivo) === filtroId);
                }
                if (filtroTicket) {
                    ingresos = ingresos.filter(d => coincideTicket(d.ticket));
                    entregas = entregas.filter(d => coincideTicket(d.ticket));
                }
                if (ingresos.length) {
                    tieneEventos = true;
                    contenidoEventos += `<div class="evento-etiqueta evento-ingreso"><span class="punto"></span>${ingresos.length} ingreso${ingresos.length > 1 ? 's' : ''}</div>`;
                }
                if (entregas.length) {
                    tieneEventos = true;
                    contenidoEventos += `<div class="evento-etiqueta evento-entrega"><span class="punto"></span>${entregas.length} entrega${entregas.length > 1 ? 's' : ''}</div>`;
                }
            } else {
                let reps = indiceReparaciones[c.fechaISO] || [];
                if (filtroId !== 'todos') {
                    reps = reps.filter(r => r.servicios?.tipo === filtroId);
                }
                if (filtroTicket) {
                    reps = reps.filter(r => coincideTicket(r.dispositivos?.ticket));
                }
                if (reps.length) {
                    tieneEventos = true;
                    contenidoEventos += `<div class="evento-etiqueta evento-reparacion"><span class="punto"></span>${reps.length} reparación${reps.length > 1 ? 'es' : ''}</div>`;
                }
            }

            return `
                <div class="dia-celda ${esHoy ? 'dia-hoy' : ''} ${tieneEventos ? 'dia-con-eventos' : ''}" data-fecha="${c.fechaISO}">
                    <span class="dia-numero">${c.dia}</span>
                    <div class="dia-eventos">${contenidoEventos}</div>
                </div>
            `;
        }).join('');

        contCalendario.innerHTML = `<div class="calendario-cabecera">${cabecera}</div><div class="calendario-cuerpo">${cuerpo}</div>`;

        contCalendario.querySelectorAll('.dia-celda[data-fecha]').forEach(celda => {
            celda.addEventListener('click', () => abrirDetalleDia(celda.dataset.fecha));
        });
    }

    /* ---------- MODAL DE DETALLE DEL DÍA ---------- */
    function abrirDetalleDia(fechaISO) {
        const modal = document.getElementById('modal-dia-calendario');
        const cuerpoModal = document.getElementById('modal-dia-cuerpo');
        const tituloModal = document.getElementById('modal-dia-titulo');
        if (!modal) return;

        tituloModal.textContent = formatoFecha(fechaISO);

        let html = '';

        if (modoActual === 'dispositivos') {
            const info = indiceDispositivos[fechaISO];
            let ingresos = info?.ingresos || [];
            let entregas = info?.entregas || [];
            if (filtroId !== 'todos') {
                ingresos = ingresos.filter(d => normalizarTipoDispositivo(d.tipo_dispositivo) === filtroId);
                entregas = entregas.filter(d => normalizarTipoDispositivo(d.tipo_dispositivo) === filtroId);
            }
            if (filtroTicket) {
                ingresos = ingresos.filter(d => coincideTicket(d.ticket));
                entregas = entregas.filter(d => coincideTicket(d.ticket));
            }

            if (ingresos.length) {
                html += `<h4 class="modal-dia-subtitulo"><i class="bi bi-box-arrow-in-down"></i> Ingresos (${ingresos.length})</h4>`;
                html += ingresos.map(filaDispositivoModal).join('');
            }
            if (entregas.length) {
                html += `<h4 class="modal-dia-subtitulo"><i class="bi bi-box-arrow-up"></i> Entregas (${entregas.length})</h4>`;
                html += entregas.map(filaDispositivoModal).join('');
            }
            if (!ingresos.length && !entregas.length) {
                html = `<p class="sin-datos">No hay dispositivos registrados este día.</p>`;
            }
        } else {
            let reps = indiceReparaciones[fechaISO] || [];
            if (filtroId !== 'todos') {
                reps = reps.filter(r => r.servicios?.tipo === filtroId);
            }
            if (filtroTicket) {
                reps = reps.filter(r => coincideTicket(r.dispositivos?.ticket));
            }
            html = reps.length
                ? reps.map(filaReparacionModal).join('')
                : `<p class="sin-datos">No hay reparaciones registradas este día.</p>`;
        }

        cuerpoModal.innerHTML = html;
        modal.style.display = 'flex';
    }

    function filaDispositivoModal(d) {
        return `
            <div class="fila-evento-modal">
                <div>
                    <strong class="mono">#${d.ticket || d.id_dispositivo.slice(0, 8)}</strong>
                    <span> — ${d.clientes?.nombre || ''} ${d.clientes?.apellido || ''}</span>
                    <div style="color:var(--texto-sec); font-size:.85rem;">${d.tipo_dispositivo} ${d.marca || ''}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="led-estado ${claseLed(d.estado)}"><span class="punto"></span>${d.estado}</span>
                    <a href="../pages/dispositivo-detalle.html?id=${d.id_dispositivo}" class="btn btn-secondary btn-sm"><i class="bi bi-eye"></i></a>
                </div>
            </div>
        `;
    }

    function filaReparacionModal(r) {
        return `
            <div class="fila-evento-modal">
                <div>
                    <strong class="mono">#${r.dispositivos?.ticket || '—'}</strong>
                    <span> — ${r.dispositivos?.clientes?.nombre || ''} ${r.dispositivos?.clientes?.apellido || ''}</span>
                    <div style="color:var(--texto-sec); font-size:.85rem;">${r.servicios?.nombre_servicio || '—'}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="mono">$${Number(r.costo_final || 0).toFixed(2)}</span>
                    <span class="led-estado ${claseLed(r.dispositivos?.estado)}"><span class="punto"></span>${r.dispositivos?.estado || '—'}</span>
                </div>
            </div>
        `;
    }

    /* ---------- BÚSQUEDA POR TICKET ---------- */
    function buscarPorTicket(texto) {
        filtroTicket = texto.trim();
        const infoEl = document.getElementById('info-busqueda-calendario');

        if (!filtroTicket) {
            if (infoEl) infoEl.style.display = 'none';
            renderCalendario();
            return;
        }

        // Buscamos entre los dispositivos (el ticket vive en la tabla dispositivos,
        // tanto para la vista de Dispositivos como para la de Reparaciones).
        const coincidencias = dispositivos.filter(d => coincideTicket(d.ticket));

        if (infoEl) {
            infoEl.style.display = 'block';
            if (coincidencias.length === 0) {
                infoEl.textContent = `No se encontró ningún ticket que contenga "${filtroTicket}".`;
            } else if (coincidencias.length === 1) {
                const d = coincidencias[0];
                infoEl.textContent = `Mostrando #${d.ticket} — ${d.clientes?.nombre || ''} ${d.clientes?.apellido || ''}.`;
            } else {
                infoEl.textContent = `${coincidencias.length} dispositivos coinciden con "${filtroTicket}".`;
            }
        }

        // Si hay una sola coincidencia, saltamos directo al mes en que ingresó
        if (coincidencias.length === 1) {
            const fIngreso = soloFecha(coincidencias[0].fecha_ingreso);
            if (fIngreso) {
                const [anio, mes] = fIngreso.split('-').map(Number);
                fechaVista = new Date(anio, mes - 1, 1);
            }
        }

        renderCalendario();
    }

    /* ---------- EVENTOS DE NAVEGACIÓN Y CONTROLES ---------- */
    document.getElementById('btn-mes-anterior').addEventListener('click', () => {
        fechaVista.setMonth(fechaVista.getMonth() - 1);
        renderCalendario();
    });

    document.getElementById('btn-mes-siguiente').addEventListener('click', () => {
        fechaVista.setMonth(fechaVista.getMonth() + 1);
        renderCalendario();
    });

    document.getElementById('btn-hoy-calendario').addEventListener('click', () => {
        fechaVista = new Date();
        fechaVista.setDate(1);
        renderCalendario();
    });

    document.querySelectorAll('[data-modo-calendario]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-modo-calendario]').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            modoActual = btn.dataset.modoCalendario;

            document.getElementById('leyenda-dispositivos').style.display = modoActual === 'dispositivos' ? 'flex' : 'none';
            document.getElementById('leyenda-reparaciones').style.display = modoActual === 'reparaciones' ? 'flex' : 'none';

            llenarSelectFiltro();
            renderCalendario();
        });
    });

    const selectFiltro = document.getElementById('select-filtro-calendario');
    if (selectFiltro) {
        selectFiltro.addEventListener('change', function () {
            filtroId = this.value;
            renderCalendario();
        });
    }

    const buscadorTicket = document.getElementById('buscador-ticket-calendario');
    if (buscadorTicket) {
        buscadorTicket.addEventListener('input', function () {
            buscarPorTicket(this.value);
        });
    }

    const btnCerrarModal = document.getElementById('btn-cerrar-modal-dia');
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', () => {
            document.getElementById('modal-dia-calendario').style.display = 'none';
        });
    }

    const modalDia = document.getElementById('modal-dia-calendario');
    if (modalDia) {
        modalDia.addEventListener('click', function (e) {
            if (e.target === this) this.style.display = 'none';
        });
    }

    cargarDatos();
});