/**
 * js/nav-session.js
 * -------------------------------------------------------------
 * Se incluye en las páginas PÚBLICAS (index.html, servicios.html,
 * agendar-cita.html). Revisa si hay una sesión de cliente activa
 * y ajusta la navbar:
 *  - Sin sesión -> muestra "Iniciar sesión" / "Crear cuenta"
 *  - Con sesión -> muestra "Mi Panel" / "Cerrar sesión"
 *
 * Requiere que la navbar tenga un <li id="nav-invitado"> (con los
 * links de invitado) y un <li id="nav-usuario"> oculto por defecto
 * (con los links de usuario logueado). Ver estructura en el HTML.
 * -------------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await obtenerSesionActual();

    // 1. Manejo clásico de navbar por IDs (compatibilidad)
    const navInvitado = document.getElementById('nav-invitado');
    const navUsuario = document.getElementById('nav-usuario');

    if (sesion) {
        if (navInvitado) navInvitado.style.display = 'none';
        if (navUsuario) navUsuario.style.display = 'contents';
    } else {
        if (navInvitado) navInvitado.style.display = 'contents';
        if (navUsuario) navUsuario.style.display = 'none';
    }

    // 2. Manejo dinámico genérico por clases (.session-guest y .session-user)
    const elementsGuest = document.querySelectorAll('.session-guest');
    const elementsUser = document.querySelectorAll('.session-user');

    if (sesion) {
        elementsGuest.forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });
        elementsUser.forEach(el => {
            // Restaurar visualización adecuada según el tipo de elemento
            if (el.tagName === 'LI') {
                el.style.setProperty('display', 'contents', 'important');
            } else if (el.classList.contains('hero-acciones')) {
                el.style.setProperty('display', 'flex', 'important');
            } else if (el.classList.contains('caja')) {
                el.style.setProperty('display', 'block', 'important');
            } else {
                el.style.setProperty('display', 'inline-block', 'important');
            }
        });
    } else {
        elementsGuest.forEach(el => {
            if (el.tagName === 'LI') {
                el.style.setProperty('display', 'contents', 'important');
            } else if (el.classList.contains('hero-acciones')) {
                el.style.setProperty('display', 'flex', 'important');
            } else if (el.classList.contains('caja')) {
                el.style.setProperty('display', 'block', 'important');
            } else {
                el.style.setProperty('display', 'inline-block', 'important');
            }
        });
        elementsUser.forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });
    }

    // 3. Enlazar eventos de cerrar sesión
    const logoutIds = ['link-logout-publico', 'link-logout-footer'];
    logoutIds.forEach(id => {
        const linkLogout = document.getElementById(id);
        if (linkLogout) {
            linkLogout.addEventListener('click', async function (e) {
                e.preventDefault();
                await cerrarSesion();
                window.location.reload();
            });
        }
    });

});
