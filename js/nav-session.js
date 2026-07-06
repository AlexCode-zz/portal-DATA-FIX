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

    const navInvitado = document.getElementById('nav-invitado');
    const navUsuario = document.getElementById('nav-usuario');
    if (!navInvitado || !navUsuario) return;

    const sesion = await obtenerSesionActual();

    if (sesion) {
        navInvitado.style.display = 'none';
        navUsuario.style.display = 'contents';

        const linkLogout = document.getElementById('link-logout-publico');
        if (linkLogout) {
            linkLogout.addEventListener('click', async function (e) {
                e.preventDefault();
                await cerrarSesion();
                window.location.reload();
            });
        }
    }

});
