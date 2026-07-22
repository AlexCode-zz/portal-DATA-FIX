/**
 * js/main.js
 * -------------------------------------------------------------
 * Comportamiento compartido por todas las páginas:
 * - Menú responsive (hamburguesa)
 * - Año dinámico en el footer
 * - Utilidades de formato (fecha) y sesión, usadas por varias páginas
 * -------------------------------------------------------------
 */

// Estados posibles de un dispositivo, en el orden real del flujo del taller.
// Coincide exactamente con el CHECK constraint de la tabla "dispositivos" en Supabase.
const ESTADOS_FLUJO = [
    'Recibido',
    'En diagnóstico',
    'En espera',
    'En mantenimiento',
    'En pruebas',
    'Listo para entregar',
    'Entregado'
];

/* ═══════════════════════════════════════════════════════════════════
   GESTIÓN DE TEMA (MODO CLARO / OSCURO)
   ═══════════════════════════════════════════════════════════════════ */
function obtenerTemaInicial() {
    const temaGuardado = localStorage.getItem('theme');
    if (temaGuardado) return temaGuardado;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('theme', tema);
    actualizarIconosTema(tema);
}

function actualizarIconosTema(tema) {
    document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
        const icono = btn.querySelector('i');
        if (icono) {
            if (tema === 'dark') {
                icono.className = 'bi bi-sun-fill';
                btn.setAttribute('title', 'Cambiar a modo claro');
                btn.setAttribute('aria-label', 'Cambiar a modo claro');
            } else {
                icono.className = 'bi bi-moon-stars-fill';
                btn.setAttribute('title', 'Cambiar a modo oscuro');
                btn.setAttribute('aria-label', 'Cambiar a modo oscuro');
            }
        }
    });
}

// Aplicar tema de inmediato para evitar parpadeos
aplicarTema(obtenerTemaInicial());

document.addEventListener('DOMContentLoaded', function () {

    /* ---------- INITIALIZAR BOTONES DE TEMA ---------- */
    const temaActual = document.documentElement.getAttribute('data-theme') || 'light';
    actualizarIconosTema(temaActual);

    document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
        btn.addEventListener('click', function () {
            const actual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            const nuevo = actual === 'dark' ? 'light' : 'dark';
            aplicarTema(nuevo);
        });
    });

    /* ---------- MENÚ RESPONSIVE — nuevo index (#btn-hamburger / #nav-menu) ---------- */
    const btnHamburger = document.getElementById('btn-hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navOverlay = document.getElementById('nav-overlay');

    if (btnHamburger && navMenu) {
        btnHamburger.addEventListener('click', () => {
            navMenu.classList.toggle('abierto');
            if (navOverlay) navOverlay.classList.toggle('activo');
        });
        if (navOverlay) {
            navOverlay.addEventListener('click', () => {
                navMenu.classList.remove('abierto');
                navOverlay.classList.remove('activo');
            });
        }
    }

    /* ---------- MENÚ RESPONSIVE — páginas internas (.navbar-toggle / .navbar-menu) ---------- */
    const toggle = document.querySelector('.navbar-toggle');
    const menu = document.querySelector('.navbar-menu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => menu.classList.toggle('mostrar'));
    }

    /* ---------- AÑO EN FOOTER ---------- */
    document.querySelectorAll('.anio-actual').forEach(el => {
        el.textContent = new Date().getFullYear();
    });

});

/**
 * Muestra un mensaje de éxito o error dentro de una caja de alerta
 * dentro de un formulario. Se usa en los formularios reales
 * conectados a Supabase (login, registro, agendar cita, admin...).
 */
function mostrarMensajeFormulario(caja, texto, ok) {
    if (!caja) { alert(texto); return; }
    caja.textContent = texto;
    caja.className = 'alerta ' + (ok ? 'alerta-exito' : 'alerta-info') + ' mensaje-formulario';
    caja.style.display = 'flex';
    caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


/**
 * Formatea una fecha "YYYY-MM-DD" a texto corto legible en español.
 * Ej: '2026-07-05' -> '05 jul 2026'
 */
function formatoFecha(fechaISO) {
    if (!fechaISO) return 'No definida';
    const soloFecha = fechaISO.split('T')[0].split(' ')[0];
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const partes = soloFecha.split('-');
    if (partes.length < 3) return fechaISO;
    const [anio, mes, dia] = partes;
    return `${dia} ${meses[parseInt(mes, 10) - 1]} ${anio}`;
}

/**
 * Devuelve las iniciales de un nombre completo. Ej: 'Ana Torres' -> 'AT'
 */
function iniciales(nombreCompleto) {
    return nombreCompleto
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');
}

/**
 * Lee un parámetro de la URL, ej: obtenerParametroURL('id')
 */
function obtenerParametroURL(nombre) {
    const params = new URLSearchParams(window.location.search);
    return params.get(nombre);
}
