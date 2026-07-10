/**
 * js/dispositivo.js
 * -------------------------------------------------------------
 * Renderiza el detalle de UN dispositivo en dispositivo-detalle.html
 * usando datos reales de Supabase. Lee el "id" desde la URL (?id=...)
 * y trae ese dispositivo + sus reparaciones + su historial de estados.
 *
 * La seguridad de que un cliente no pueda ver el dispositivo de
 * otro está garantizada DOS VECES:
 *  1. Aquí filtramos explícitamente por id_cliente = sesión actual.
 *  2. La política de RLS en Supabase también lo bloquea aunque
 *     alguien intente saltarse este filtro manipulando el JS.
 * -------------------------------------------------------------
 */

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

document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await requerirSesionCliente('login.html');
    if (!sesion) return;

    const idDispositivo = obtenerParametroURL('id');

    if (!idDispositivo) {
        window.location.href = 'dashboard.html';
        return;
    }

    /* ---------- BUSCAR EL DISPOSITIVO (validando dueño) ---------- */
    const { data: dispositivo, error } = await supabaseClient
        .from('dispositivos')
        .select('*')
        .eq('id_dispositivo', idDispositivo)
        .eq('id_cliente', sesion.user.id)
        .maybeSingle();

    if (error || !dispositivo) {
        document.querySelector('.contenedor').innerHTML = `
            <p class="vacio"><span class="icono-vacio text-muted" style="font-size: 2rem;"><i class="bi bi-search"></i></span><br>No se encontró el dispositivo o no tienes acceso a él.</p>
            <div class="texto-centro"><a href="dashboard.html" class="btn btn-secondary"><i class="bi bi-arrow-left me-1"></i> Volver a mis dispositivos</a></div>
        `;
        return;
    }

    /* ---------- ENCABEZADO ---------- */
    document.getElementById('detalle-ticket').textContent = `#${dispositivo.ticket || dispositivo.id_dispositivo.slice(0, 8)}`;
    document.getElementById('detalle-titulo').textContent = `${dispositivo.tipo_dispositivo} — ${dispositivo.marca || ''} ${dispositivo.modelo || ''}`;

    const led = document.getElementById('detalle-led');
    led.classList.add(claseLed(dispositivo.estado));
    document.getElementById('detalle-estado-texto').textContent = dispositivo.estado;

    /* ---------- BARRA DE PROGRESO ---------- */
    const indiceActual = ESTADOS_FLUJO.indexOf(dispositivo.estado);
    document.getElementById('progreso-estados').innerHTML = ESTADOS_FLUJO.map((estado, i) => {
        let clase = '';
        if (i < indiceActual) clase = 'completado';
        else if (i === indiceActual) clase = 'actual';
        return `
            <div class="progreso-item ${clase}">
                <div class="progreso-punto"></div>
                <span class="etq">${estado}</span>
            </div>
        `;
    }).join('');

    /* ---------- INFORMACIÓN GENERAL ---------- */
    document.getElementById('info-general').innerHTML = `
        <div class="fila-dato"><span class="etiqueta">Número de serie</span><span class="valor">${dispositivo.numero_serie || 'No registrado'}</span></div>
        <div class="fila-dato"><span class="etiqueta">Problema reportado</span><span class="valor" style="font-family:inherit; font-weight:400;">${dispositivo.descripcion_problema || 'Sin descripción'}</span></div>
        <div class="fila-dato"><span class="etiqueta">Fecha de ingreso</span><span class="valor">${formatoFecha(dispositivo.fecha_ingreso)}</span></div>
        <div class="fila-dato"><span class="etiqueta">Entrega estimada</span><span class="valor">${formatoFecha(dispositivo.fecha_entrega_estimada)}</span></div>
        ${dispositivo.fecha_entrega_real ? `<div class="fila-dato"><span class="etiqueta">Fecha de entrega real</span><span class="valor">${formatoFecha(dispositivo.fecha_entrega_real)}</span></div>` : ''}
    `;

    /* ---------- SERVICIOS APLICADOS ---------- */
    const { data: reparaciones } = await supabaseClient
        .from('reparaciones')
        .select('*, servicios(nombre_servicio)')
        .eq('id_dispositivo', dispositivo.id_dispositivo)
        .order('fecha_asignacion', { ascending: false });

    const contenedorServicios = document.getElementById('servicios-aplicados');
    if (!reparaciones || reparaciones.length === 0) {
        contenedorServicios.innerHTML = `<p class="vacio">Aún no se han asignado servicios a este dispositivo.</p>`;
    } else {
        contenedorServicios.innerHTML = reparaciones.map(r => `
            <div class="fila-dato" style="flex-direction:column; align-items:flex-start; gap:4px;">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <strong>${r.servicios?.nombre_servicio || 'Servicio'}</strong>
                    <span class="valor">$${Number(r.costo_final || 0).toFixed(2)}</span>
                </div>
                ${r.observaciones ? `<span class="etiqueta" style="font-family:inherit;">${r.observaciones}</span>` : ''}
            </div>
        `).join('');
    }

    /* ---------- LÍNEA DE TIEMPO ---------- */
    const { data: historial } = await supabaseClient
        .from('historial_estados')
        .select('*')
        .eq('id_dispositivo', dispositivo.id_dispositivo)
        .order('fecha_cambio', { ascending: true });

    const timelineContenedor = document.getElementById('timeline-estados');
    if (!historial || historial.length === 0) {
        timelineContenedor.innerHTML = `<p class="vacio">Sin historial de cambios registrado.</p>`;
    } else {
        timelineContenedor.innerHTML = historial.map(h => `
            <div class="timeline-item">
                <strong>${h.estado_nuevo}</strong>
                <div class="fecha-timeline">${formatoFecha(h.fecha_cambio?.slice(0, 10))}</div>
            </div>
        `).join('');
    }

    /* ---------- CERRAR SESIÓN ---------- */
    const linkLogout = document.getElementById('link-logout');
    if (linkLogout) {
        linkLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            await cerrarSesion();
            window.location.href = 'login.html';
        });
    }

});
