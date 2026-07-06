/**
 * js/dashboard.js
 * -------------------------------------------------------------
 * Renderiza el panel del cliente (dashboard.html) con datos REALES
 * de Supabase: perfil, dispositivos y reparaciones del cliente
 * que tiene la sesión iniciada.
 * -------------------------------------------------------------
 */

// Clase CSS del LED según el estado
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

    // 1. Exigir sesión: si no hay nadie logueado, esto redirige a login.html
    const sesion = await requerirSesionCliente('login.html');
    if (!sesion) return;

    const idCliente = sesion.user.id;

    /* ---------- PERFIL DEL CLIENTE ---------- */
    const { data: perfil, error: errorPerfil } = await supabaseClient
        .from('clientes')
        .select('*')
        .eq('id_cliente', idCliente)
        .single();

    if (errorPerfil || !perfil) {
        document.querySelector('.contenedor').innerHTML = `
            <p class="vacio">No se encontró tu perfil de cliente. Contacta al administrador.</p>
        `;
        return;
    }

    document.getElementById('saludo-usuario').textContent = `Hola, ${perfil.nombre}`;

    document.getElementById('datos-perfil').innerHTML = `
        <div class="fila-dato"><span class="etiqueta">Nombre completo</span><span class="valor">${perfil.nombre} ${perfil.apellido}</span></div>
        <div class="fila-dato"><span class="etiqueta">Correo</span><span class="valor">${perfil.correo}</span></div>
        <div class="fila-dato"><span class="etiqueta">Teléfono</span><span class="valor">${perfil.telefono || 'No registrado'}</span></div>
        <div class="fila-dato"><span class="etiqueta">Cliente desde</span><span class="valor">${formatoFecha(perfil.fecha_registro?.slice(0, 10))}</span></div>
    `;

    /* ---------- DISPOSITIVOS DEL CLIENTE ---------- */
    const { data: dispositivos, error: errorDispositivos } = await supabaseClient
        .from('dispositivos')
        .select('*')
        .eq('id_cliente', idCliente)
        .order('fecha_ingreso', { ascending: false });

    const listaDispositivos = document.getElementById('lista-dispositivos');

    if (errorDispositivos) {
        listaDispositivos.innerHTML = `<p class="vacio">Error al cargar tus dispositivos: ${errorDispositivos.message}</p>`;
    } else if (!dispositivos || dispositivos.length === 0) {
        listaDispositivos.innerHTML = `<p class="vacio"><span class="icono-vacio">📭</span><br>Aún no tienes dispositivos registrados.</p>`;
    } else {
        listaDispositivos.innerHTML = dispositivos.map(d => `
            <div class="ticket">
                <div class="ticket-cabecera">
                    <div>
                        <div class="ticket-id mono">#${d.ticket || d.id_dispositivo.slice(0, 8)}</div>
                        <div class="ticket-tipo">${d.tipo_dispositivo} · ${d.marca || ''}</div>
                    </div>
                    <span class="led-estado ${claseLed(d.estado)}"><span class="punto"></span>${d.estado}</span>
                </div>
                <div class="ticket-perforado"></div>
                <div class="ticket-cuerpo">
                    <div class="ticket-fila"><span class="etq">Modelo</span><span class="val">${d.modelo || '—'}</span></div>
                    <div class="ticket-fila"><span class="etq">Ingreso</span><span class="val">${formatoFecha(d.fecha_ingreso)}</span></div>
                    <div class="ticket-fila"><span class="etq">Entrega estimada</span><span class="val">${formatoFecha(d.fecha_entrega_estimada)}</span></div>
                </div>
                <div class="ticket-acciones">
                    <a href="dispositivo-detalle.html?id=${d.id_dispositivo}" class="btn btn-secundario btn-sm btn-block">Ver detalle completo →</a>
                </div>
            </div>
        `).join('');
    }

    /* ---------- RESUMEN NUMÉRICO ---------- */
    const listaDisp = dispositivos || [];
    const enProceso = listaDisp.filter(d => d.estado !== 'Entregado').length;
    const listos = listaDisp.filter(d => d.estado === 'Listo para entregar').length;

    /* ---------- HISTORIAL (reparaciones + servicio, vía join) ---------- */
    const idsDispositivos = listaDisp.map(d => d.id_dispositivo);
    let reparaciones = [];

    if (idsDispositivos.length > 0) {
        const { data, error } = await supabaseClient
            .from('reparaciones')
            .select('*, servicios(nombre_servicio), dispositivos(ticket, tipo_dispositivo, marca, estado)')
            .in('id_dispositivo', idsDispositivos)
            .order('fecha_asignacion', { ascending: false });

        if (!error) reparaciones = data;
    }

    const totalGastado = reparaciones.reduce((suma, r) => suma + Number(r.costo_final || 0), 0);

    document.getElementById('resumen-grid').innerHTML = `
        <div class="resumen-card">
            <div class="top"><span class="icono">💻</span></div>
            <div class="numero">${listaDisp.length}</div>
            <div class="etiqueta">Dispositivos registrados</div>
        </div>
        <div class="resumen-card">
            <div class="top"><span class="icono">🔧</span></div>
            <div class="numero">${enProceso}</div>
            <div class="etiqueta">En proceso actualmente</div>
        </div>
        <div class="resumen-card">
            <div class="top"><span class="icono">✅</span></div>
            <div class="numero">${listos}</div>
            <div class="etiqueta">Listos para retirar</div>
        </div>
        <div class="resumen-card">
            <div class="top"><span class="icono">💵</span></div>
            <div class="numero">$${totalGastado.toFixed(2)}</div>
            <div class="etiqueta">Invertido en reparaciones</div>
        </div>
    `;

    const tablaHistorial = document.getElementById('tabla-historial');
    if (reparaciones.length === 0) {
        tablaHistorial.innerHTML = `<tr><td colspan="5" class="vacio">Aún no tienes servicios en tu historial.</td></tr>`;
    } else {
        tablaHistorial.innerHTML = reparaciones.map(r => `
            <tr>
                <td class="mono">${r.dispositivos?.ticket || '—'}</td>
                <td>${r.dispositivos?.tipo_dispositivo || ''} ${r.dispositivos?.marca || ''}</td>
                <td>${r.servicios?.nombre_servicio || '—'}</td>
                <td class="mono">$${Number(r.costo_final || 0).toFixed(2)}</td>
                <td><span class="led-estado ${claseLed(r.dispositivos?.estado)}"><span class="punto"></span>${r.dispositivos?.estado || '—'}</span></td>
            </tr>
        `).join('');
    }

    /* ---------- TABS ---------- */
    const tabButtons = document.querySelectorAll('.tabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('activo'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
            btn.classList.add('activo');
            document.getElementById(btn.dataset.tab).classList.add('activo');
        });
    });

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
