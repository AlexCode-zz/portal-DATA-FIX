/**
 * js/auth.js
 * -------------------------------------------------------------
 * Funciones de autenticación reutilizables, usando el sistema de
 * login integrado de Supabase (supabase.auth). Estas reemplazan
 * la lógica "mock" que teníamos antes en main.js para los
 * formularios de login/registro.
 * -------------------------------------------------------------
 */

/**
 * Registra un nuevo cliente:
 * 1. Crea el usuario en el sistema de auth de Supabase
 * 2. Crea su fila de perfil en la tabla "clientes"
 */
async function registrarCliente({ nombre, apellido, correo, telefono, contrasena }) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: correo,
        password: contrasena
    });

    if (error) return { ok: false, mensaje: traducirErrorAuth(error) };

    // Si el correo requiere confirmación, data.user existe pero sin sesión activa todavía
    const idUsuario = data.user.id;

    const { error: errorPerfil } = await supabaseClient
        .from('clientes')
        .insert([{ id_cliente: idUsuario, nombre, apellido, correo, telefono }]);

    if (errorPerfil) return { ok: false, mensaje: 'Cuenta creada, pero hubo un problema guardando tu perfil: ' + errorPerfil.message };

    return { ok: true, mensaje: '¡Cuenta creada! Ya puedes iniciar sesión.' };
}

/**
 * Inicia sesión de un cliente (o de cualquier usuario en general).
 */
async function iniciarSesion({ correo, contrasena }) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: correo,
        password: contrasena
    });

    if (error) return { ok: false, mensaje: traducirErrorAuth(error) };
    return { ok: true, usuario: data.user };
}

/**
 * Inicia sesión de administrador: primero valida credenciales con
 * Supabase Auth, y LUEGO verifica que ese usuario exista en la
 * tabla "administradores". Si no es admin, cierra la sesión y
 * avisa (para que no quede una sesión "a medias").
 */
async function iniciarSesionAdmin({ correo, contrasena }) {
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
}

/**
 * Cierra la sesión actual (cliente o admin).
 */
async function cerrarSesion() {
    await supabaseClient.auth.signOut();
}

/**
 * Devuelve la sesión activa actual, o null si no hay nadie logueado.
 */
async function obtenerSesionActual() {
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
}

/**
 * Protege una página de CLIENTE: si no hay sesión, redirige al login.
 * Se llama al inicio de páginas como dashboard.html.
 * Devuelve la sesión si todo está bien.
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
}

/**
 * Traduce los mensajes de error más comunes de Supabase Auth al
 * español, para mostrarlos en los formularios.
 */
function traducirErrorAuth(error) {
    const mensaje = error.message || '';
    if (mensaje.includes('already registered')) return 'Ya existe una cuenta con este correo.';
    if (mensaje.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (mensaje.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (mensaje.includes('Unable to validate email')) return 'El correo electrónico no es válido.';
    return mensaje || 'Ocurrió un error inesperado. Intenta de nuevo.';
}
