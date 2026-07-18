/**
 * js/reportes.js
 * -------------------------------------------------------------
 * Pantalla de reportes del panel admin (admin/reportes.html).
 *
 * Trae de Supabase las reparaciones y dispositivos de UN MES
 * seleccionado, y arma en el propio navegador (sin backend):
 *   1. Servicios más solicitados + dinero recaudado por servicio
 *   2. Dispositivos que más ingresan (por tipo)
 *   3. Resumen general del mes
 *
 * También permite descargar todo el reporte como PDF usando la
 * librería html2pdf.js (cargada por CDN en el HTML).
 * -------------------------------------------------------------
 */

/* Instancias activas de Chart.js (se destruyen y recrean cada vez que cambia el mes) */
let graficaServicios = null;
let graficaDispositivos = null;

document.addEventListener('DOMContentLoaded', function () {

    /* ---------- SELECTOR DE MES ---------- */
    const selectorMes = document.getElementById('selector-mes');
    llenarSelectorDeMeses(selectorMes);

    selectorMes.addEventListener('change', () => cargarReporte(selectorMes.value));

    /* ---------- BOTÓN DESCARGAR PDF ---------- */
    document.getElementById('btn-descargar-pdf').addEventListener('click', () => {
        const [anio, mes] = selectorMes.value.split('-');
        const nombreMes = nombreDelMes(parseInt(mes, 10));
        const elemento = document.getElementById('contenido-reporte');

        html2pdf().set({
            margin: 10,
            filename: `reporte-techfix-${nombreMes.toLowerCase()}-${anio}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(elemento).save();
    });

    // Carga inicial: el mes seleccionado por defecto en el selector
    cargarReporte(selectorMes.value);
});

/**
 * Llena el <select> con meses desde ENERO 2026 hasta el mes actual
 * del sistema (o hasta diciembre 2026, lo que sea menor).
 */
function llenarSelectorDeMeses(select) {
    const meses = [];
    const inicio = new Date(2026, 0, 1); // enero 2026
    const hoy = new Date();
    const limite = new Date(Math.min(new Date(2026, 11, 1).getTime(), new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime()));
    // Si estamos antes de 2026, igual mostramos al menos enero 2026
    const finalLimite = limite < inicio ? inicio : limite;

    let cursor = new Date(inicio);
    while (cursor <= finalLimite) {
        const anio = cursor.getFullYear();
        const mes = cursor.getMonth() + 1;
        meses.push(`${anio}-${String(mes).padStart(2, '0')}`);
        cursor.setMonth(cursor.getMonth() + 1);
    }

    select.innerHTML = meses.map(m => {
        const [a, mm] = m.split('-');
        return `<option value="${m}">${nombreDelMes(parseInt(mm, 10))} ${a}</option>`;
    }).join('');

    // Selecciona por defecto el último mes disponible (el más reciente)
    select.value = meses[meses.length - 1];
}

function nombreDelMes(numeroMes) {
    const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return nombres[numeroMes - 1];
}

/**
 * Carga y renderiza todo el reporte para el mes "YYYY-MM" indicado.
 */
async function cargarReporte(mesSeleccionado) {
    const [anioStr, mesStr] = mesSeleccionado.split('-');
    const anio = parseInt(anioStr, 10);
    const mes = parseInt(mesStr, 10);

    const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const fechaFinExclusiva = mes === 12
        ? `${anio + 1}-01-01`
        : `${anio}-${String(mes + 1).padStart(2, '0')}-01`;

    document.getElementById('titulo-mes-reporte').textContent = `${nombreDelMes(mes)} ${anio}`;

    /* ---------- REPARACIONES DEL MES (servicios + dinero) ---------- */
    const { data: reparaciones, error: errorRep } = await supabaseClient
        .from('reparaciones')
        .select('costo_final, fecha_asignacion, servicios(nombre_servicio)')
        .gte('fecha_asignacion', fechaInicio)
        .lt('fecha_asignacion', fechaFinExclusiva);

    if (errorRep) {
        document.getElementById('tabla-servicios-mes').innerHTML =
            `<tr><td colspan="3" class="vacio">Error: ${errorRep.message}</td></tr>`;
        return;
    }

    /* ---------- DISPOSITIVOS INGRESADOS EN EL MES ---------- */
    const { data: dispositivos, error: errorDisp } = await supabaseClient
        .from('dispositivos')
        .select('tipo_dispositivo, fecha_ingreso')
        .gte('fecha_ingreso', fechaInicio)
        .lt('fecha_ingreso', fechaFinExclusiva);

    if (errorDisp) {
        document.getElementById('tabla-dispositivos-mes').innerHTML =
            `<tr><td colspan="2" class="vacio">Error: ${errorDisp.message}</td></tr>`;
        return;
    }

    /* ---------- AGREGACIÓN: por servicio (cantidad + dinero) ---------- */
    const porServicio = {};
    (reparaciones || []).forEach(r => {
        const nombre = r.servicios?.nombre_servicio || 'Sin especificar';
        if (!porServicio[nombre]) porServicio[nombre] = { cantidad: 0, total: 0 };
        porServicio[nombre].cantidad += 1;
        porServicio[nombre].total += Number(r.costo_final || 0);
    });

    const filasServicios = Object.entries(porServicio)
        .map(([nombre, datos]) => ({ nombre, ...datos }))
        .sort((a, b) => b.cantidad - a.cantidad);

    /* ---------- AGREGACIÓN: por tipo de dispositivo ---------- */
    const porTipoDispositivo = {};
    (dispositivos || []).forEach(d => {
        const tipo = d.tipo_dispositivo || 'Sin especificar';
        porTipoDispositivo[tipo] = (porTipoDispositivo[tipo] || 0) + 1;
    });

    const filasDispositivos = Object.entries(porTipoDispositivo)
        .map(([tipo, cantidad]) => ({ tipo, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

    /* ---------- RESUMEN GENERAL ---------- */
    const totalReparaciones = reparaciones?.length || 0;
    const totalRecaudado = filasServicios.reduce((suma, f) => suma + f.total, 0);
    const servicioTop = filasServicios[0]?.nombre || '—';
    const dispositivoTop = filasDispositivos[0]?.tipo || '—';

    document.getElementById('resumen-reporte').innerHTML = `
        <div class="resumen-card">
            <div class="top"><span class="icono">🔧</span></div>
            <div class="numero">${totalReparaciones}</div>
            <div class="etiqueta">Reparaciones del mes</div>
        </div>
        <div class="resumen-card">
            <div class="top"><span class="icono">💵</span></div>
            <div class="numero">$${totalRecaudado.toFixed(2)}</div>
            <div class="etiqueta">Total recaudado</div>
        </div>
        <div class="resumen-card">
            <div class="top"><span class="icono">⭐</span></div>
            <div class="numero" style="font-size:1rem;">${servicioTop}</div>
            <div class="etiqueta">Servicio más solicitado</div>
        </div>
        <div class="resumen-card">
            <div class="top"><span class="icono">💻</span></div>
            <div class="numero" style="font-size:1rem;">${dispositivoTop}</div>
            <div class="etiqueta">Dispositivo que más ingresa</div>
        </div>
    `;

    /* ---------- GRÁFICAS ---------- */
    renderGraficaServicios(filasServicios);
    renderGraficaDispositivos(filasDispositivos);

    /* ---------- TABLA: servicios más solicitados + dinero ---------- */
    const tablaServicios = document.getElementById('tabla-servicios-mes');
    if (filasServicios.length === 0) {
        tablaServicios.innerHTML = `<tr><td colspan="3" class="vacio">No hay reparaciones registradas este mes.</td></tr>`;
    } else {
        tablaServicios.innerHTML = filasServicios.map(f => `
            <tr>
                <td>${f.nombre}</td>
                <td class="mono">${f.cantidad}</td>
                <td class="mono">$${f.total.toFixed(2)}</td>
            </tr>
        `).join('');
    }

    /* ---------- TABLA: dispositivos que más ingresan ---------- */
    const tablaDispositivos = document.getElementById('tabla-dispositivos-mes');
    if (filasDispositivos.length === 0) {
        tablaDispositivos.innerHTML = `<tr><td colspan="2" class="vacio">No hay dispositivos ingresados este mes.</td></tr>`;
    } else {
        tablaDispositivos.innerHTML = filasDispositivos.map(f => `
            <tr>
                <td>${f.tipo}</td>
                <td class="mono">${f.cantidad}</td>
            </tr>
        `).join('');
    }
}

/**
 * Lee las variables de color definidas en estilos.css para que las
 * gráficas usen siempre la misma paleta que el resto del panel.
 */
function coloresDelTema() {
    const raiz = getComputedStyle(document.documentElement);
    const leer = (v) => raiz.getPropertyValue(v).trim();
    return {
        azul: leer('--azul'),
        verde: leer('--verde'),
        naranja: leer('--naranja'),
        rojo: leer('--rojo'),
        morado: leer('--led-morado') || '#8B5CF6',
        gris400: leer('--gris-400'),
        gris300: leer('--gris-300'),
        texto: leer('--texto'),
        textoSec: leer('--texto-sec'),
        blanco: leer('--blanco')
    };
}

/**
 * Gráfica combinada (barras + línea) de servicios: cantidad de
 * reparaciones vs. dinero recaudado por servicio.
 */
function renderGraficaServicios(filas) {
    const canvas = document.getElementById('grafica-servicios');
    const wrapper = document.getElementById('grafica-servicios-wrapper');
    if (!canvas) return;

    if (graficaServicios) {
        graficaServicios.destroy();
        graficaServicios = null;
    }

    wrapper.classList.toggle('vacia', filas.length === 0);
    if (filas.length === 0) return;

    const c = coloresDelTema();

    graficaServicios = new Chart(canvas, {
        data: {
            labels: filas.map(f => f.nombre),
            datasets: [
                {
                    type: 'bar',
                    label: 'Cantidad de reparaciones',
                    data: filas.map(f => f.cantidad),
                    backgroundColor: c.azul,
                    borderRadius: 6,
                    yAxisID: 'yCantidad'
                },
                {
                    type: 'line',
                    label: 'Total recaudado ($)',
                    data: filas.map(f => f.total),
                    borderColor: c.verde,
                    backgroundColor: c.verde,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: c.verde,
                    yAxisID: 'yDinero'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: c.texto } }
            },
            scales: {
                x: {
                    ticks: { color: c.textoSec, autoSkip: false, maxRotation: 35, minRotation: 0 },
                    grid: { display: false }
                },
                yCantidad: {
                    position: 'left',
                    beginAtZero: true,
                    ticks: { color: c.textoSec, precision: 0 },
                    grid: { color: c.gris300 },
                    title: { display: true, text: 'Cantidad', color: c.textoSec }
                },
                yDinero: {
                    position: 'right',
                    beginAtZero: true,
                    ticks: { color: c.textoSec, callback: (v) => '$' + v },
                    grid: { display: false },
                    title: { display: true, text: 'Recaudado', color: c.textoSec }
                }
            }
        }
    });
}

/**
 * Gráfica de dona con la proporción de dispositivos ingresados por tipo.
 */
function renderGraficaDispositivos(filas) {
    const canvas = document.getElementById('grafica-dispositivos');
    const wrapper = document.getElementById('grafica-dispositivos-wrapper');
    if (!canvas) return;

    if (graficaDispositivos) {
        graficaDispositivos.destroy();
        graficaDispositivos = null;
    }

    wrapper.classList.toggle('vacia', filas.length === 0);
    if (filas.length === 0) return;

    const c = coloresDelTema();
    const paleta = [c.azul, c.naranja, c.verde, c.rojo, c.morado, c.gris400];

    graficaDispositivos = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: filas.map(f => f.tipo),
            datasets: [{
                data: filas.map(f => f.cantidad),
                backgroundColor: filas.map((_, i) => paleta[i % paleta.length]),
                borderColor: c.blanco,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: c.texto } }
            }
        }
    });
}