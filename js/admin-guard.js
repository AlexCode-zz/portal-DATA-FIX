/**
 * js/admin-guard.js
 * -------------------------------------------------------------
 * Se incluye en TODAS las páginas del panel admin (excepto login.html).
 * Hace dos cosas:
 *  1. Exige una sesión de administrador válida (si no hay, redirige
 *     a login.html). Usa requerirSesionAdmin() de auth.js, que
 *     verifica tanto la sesión de Supabase Auth como que ese usuario
 *     exista en la tabla "administradores".
 *  2. Muestra el nombre REAL del administrador logueado en la navbar.
 * -------------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', async function () {

    const resultado = await requerirSesionAdmin('login.html');
    if (!resultado) return; // ya redirigió a login.html

    const nombreEl = document.getElementById('nombre-admin-actual');
    const inicialesEl = document.getElementById('iniciales-admin-actual');

    if (nombreEl) nombreEl.textContent = resultado.admin.nombre;
    if (inicialesEl) inicialesEl.textContent = iniciales(resultado.admin.nombre);

    const linkLogout = document.getElementById('link-logout-admin');
    if (linkLogout) {
        linkLogout.addEventListener('click', async function (e) {
            e.preventDefault();
            await cerrarSesion();
            window.location.href = 'login.html';
        });
    }

});
