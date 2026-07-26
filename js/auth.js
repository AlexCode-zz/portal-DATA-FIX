/**
 * js/auth.js
 * -------------------------------------------------------------
 * Funciones de autenticación reutilizables, usando el sistema de
 * login integrado de Supabase (supabase.auth).
 * -------------------------------------------------------------
 */

/**
 * Registra un nuevo cliente:
 * 1. Crea el usuario en el sistema de auth de Supabase
 * 2. Crea su fila de perfil en la tabla "clientes"
 */
async function registrarCliente({ nombre, apellido, correo, telefono, contrasena }) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: correo,
            password: contrasena
        });

        if (error) return { ok: false, mensaje: traducirErrorAuth(error) };
        if (!data || !data.user) return { ok: false, mensaje: 'No se pudo crear la cuenta de usuario.' };

        const idUsuario = data.user.id;

        const { error: errorPerfil } = await supabaseClient
            .from('clientes')
            .insert([{ id_cliente: idUsuario, nombre, apellido, correo, telefono }]);

        if (errorPerfil) return { ok: false, mensaje: 'Cuenta creada, pero hubo un problema guardando tu perfil: ' + errorPerfil.message };

        return { ok: true, mensaje: '¡Cuenta creada! Ya puedes iniciar sesión.' };
    } catch (err) {
        return { ok: false, mensaje: traducirErrorAuth(err) };
    }
}

/**
 * Inicia sesión de un cliente (o de cualquier usuario en general).
 */
async function iniciarSesion({ correo, contrasena }) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: correo,
            password: contrasena
        });

        if (error) return { ok: false, mensaje: traducirErrorAuth(error) };
        return { ok: true, usuario: data.user };
    } catch (err) {
        return { ok: false, mensaje: traducirErrorAuth(err) };
    }
}

/**
 * Inicia sesión de administrador: primero valida credenciales con
 * Supabase Auth, y LUEGO verifica que ese usuario exista en la
 * tabla "administradores". Si no es admin, cierra la sesión.
 */
async function iniciarSesionAdmin({ correo, contrasena }) {
    try {
        const resultado = await iniciarSesion({ correo, contrasena });
        if (!resultado.ok) return resultado;

        const { data: admin, error } = await supabaseClient
            .from('administradores')
            .select('id_admin, nombre')
            .eq('id_admin', resultado.usuario.id)
            .maybeSingle();

        if (error || !admin) {
            await supabaseClient.auth.signOut();
            return { ok: false, mensaje: 'Esta cuenta no tiene permisos de administrador.' };
        }

        return { ok: true, usuario: resultado.usuario, admin };
    } catch (err) {
        return { ok: false, mensaje: traducirErrorAuth(err) };
    }
}

/**
 * Cierra la sesión actual (cliente o admin).
 */
async function cerrarSesion() {
    try {
        await supabaseClient.auth.signOut();
    } catch (err) {
        console.warn('Error al cerrar sesión:', err);
    }
}

/**
 * Devuelve la sesión activa actual, o null si no hay nadie logueado.
 */
async function obtenerSesionActual() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) return null;
        return data ? data.session : null;
    } catch (err) {
        console.warn('Error al obtener sesión actual:', err);
        return null;
    }
}

/**
 * Protege una página de CLIENTE: si no hay sesión, redirige al login.
 */
async function requerirSesionCliente(rutaLogin = 'login.html') {
    const sesion = await obtenerSesionActual();
    if (!sesion) {
        window.location.href = rutaLogin;
        return null;
    }
    return sesion;
}

/**
 * Protege una página de ADMIN: exige sesión Y que exista en "administradores".
 */
async function requerirSesionAdmin(rutaLogin = 'login.html') {
    const sesion = await obtenerSesionActual();
    if (!sesion) {
        window.location.href = rutaLogin;
        return null;
    }

    try {
        const { data: admin } = await supabaseClient
            .from('administradores')
            .select('id_admin, nombre')
            .eq('id_admin', sesion.user.id)
            .maybeSingle();

        if (!admin) {
            await cerrarSesion();
            window.location.href = rutaLogin;
            return null;
        }

        return { sesion, admin };
    } catch (err) {
        console.warn('Error al verificar admin:', err);
        window.location.href = rutaLogin;
        return null;
    }
}

/**
 * Traduce los mensajes de error más comunes de Supabase Auth al
 * español, para mostrarlos en los formularios.
 */
function traducirErrorAuth(error) {
    const mensaje = (error && (error.message || error.toString())) || '';
    if (mensaje.includes('already registered')) return 'Ya existe una cuenta con este correo.';
    if (mensaje.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (mensaje.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (mensaje.includes('Unable to validate email')) return 'El correo electrónico no es válido.';
    if (mensaje.includes('fetch') || mensaje.includes('NetworkError') || mensaje.includes('Failed to fetch') || mensaje.includes('network')) {
        return 'Error de conexión (NetworkError). Si estás abriendo la página como archivo local (file://), debes usar un servidor local HTTP (como Live Server de VS Code o npx serve).';
    }
    return mensaje || 'Ocurrió un error inesperado de conexión. Intenta de nuevo.';
}

