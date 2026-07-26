/**
 * js/juego.js
 * -------------------------------------------------------------
 * Mini-juego "clicker" de 15 segundos. Cualquiera puede jugar,
 * con o sin cuenta. Si el jugador tiene sesión iniciada:
 *   - Se guarda su puntaje SOLO si superó su mejor marca anterior
 *   - Aparece en el ranking público (tabla clicker_puntajes)
 * Si NO tiene sesión, puede jugar igual, pero al final solo ve
 * una invitación a crear cuenta / iniciar sesión (su puntaje no
 * se guarda en ningún lado).
 *
 * El ranking (top 5) es visible para TODOS, tengan cuenta o no,
 * gracias a la política de RLS "publico_ve_ranking_clicker".
 * -------------------------------------------------------------
 */

const DURACION_JUEGO = 8; // segundos

let clics = 0;
let tiempoRestante = DURACION_JUEGO;
let intervaloTimer = null;
let juegoActivo = false;

document.addEventListener('DOMContentLoaded', function () {

    const boton = document.getElementById('boton-clicker');
    const marcadorPuntaje = document.getElementById('marcador-puntaje');
    const marcadorTiempo = document.getElementById('marcador-tiempo');
    const resultadoFinal = document.getElementById('resultado-final');
    const textoResultado = document.getElementById('texto-resultado');
    const zonaGuardado = document.getElementById('zona-guardado');
    const botonReintentar = document.getElementById('boton-reintentar');

    boton.addEventListener('click', function () {
        if (!juegoActivo) {
            iniciarJuego();
            return;
        }
        // Durante el juego, cada click al botón cuenta como un clic
        clics++;
        marcadorPuntaje.textContent = clics;
    });

    botonReintentar.addEventListener('click', function () {
        resultadoFinal.style.display = 'none';
        boton.style.display = 'flex';
        iniciarJuego();
    });

    function iniciarJuego() {
        clics = 0;
        tiempoRestante = DURACION_JUEGO;
        juegoActivo = true;

        marcadorPuntaje.textContent = '0';
        marcadorTiempo.textContent = tiempoRestante;
        boton.textContent = '¡CLIC!';
        resultadoFinal.style.display = 'none';

        intervaloTimer = setInterval(function () {
            tiempoRestante--;
            marcadorTiempo.textContent = tiempoRestante;
            if (tiempoRestante <= 0) {
                terminarJuego();
            }
        }, 1000);
    }

    async function terminarJuego() {
        clearInterval(intervaloTimer);
        juegoActivo = false;
        boton.style.display = 'none';
        resultadoFinal.style.display = 'block';
        textoResultado.textContent = `¡Hiciste ${clics} clics en ${DURACION_JUEGO} segundos!`;

        const sesion = await obtenerSesionActual();

        if (!sesion) {
            zonaGuardado.innerHTML = `
                <div class="alerta alerta-info" style="display:flex;">
                    <i class="bi bi-info-circle me-2"></i>
                    Crea una cuenta o inicia sesión para guardar este puntaje y aparecer en el ranking.
                </div>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:8px;">
                    <a href="login.html" class="btn btn-secondary btn-sm">Iniciar sesión</a>
                    <a href="registro.html" class="btn btn-primary btn-sm">Crear cuenta</a>
                </div>
            `;
            return;
        }

        await guardarPuntajeSiEsMejor(sesion.user.id, clics);
        cargarRanking();
    }

    async function guardarPuntajeSiEsMejor(idCliente, puntajeNuevo) {
        // 1. Revisar si ya tiene un puntaje guardado
        const { data: existente } = await supabaseClient
            .from('clicker_puntajes')
            .select('puntaje')
            .eq('id_cliente', idCliente)
            .maybeSingle();

        const puntajeAnterior = existente ? existente.puntaje : null;
        const esRecordNuevo = puntajeAnterior === null || puntajeNuevo > puntajeAnterior;

        if (!esRecordNuevo) {
            zonaGuardado.innerHTML = `<p style="color:var(--texto-sec); font-size:.9rem;">Tu mejor puntaje sigue siendo <strong>${puntajeAnterior}</strong>. ¡Sigue intentando!</p>`;
            return;
        }

        // 2. Traer el nombre del cliente para mostrarlo en el ranking
        const { data: perfil } = await supabaseClient
            .from('clientes')
            .select('nombre')
            .eq('id_cliente', idCliente)
            .single();

        const nombreMostrar = perfil?.nombre || 'Jugador';

        const { error } = await supabaseClient
            .from('clicker_puntajes')
            .upsert([{ id_cliente: idCliente, nombre_mostrar: nombreMostrar, puntaje: puntajeNuevo }]);

        if (error) {
            zonaGuardado.innerHTML = `<p style="color:var(--texto-sec); font-size:.9rem;">No se pudo guardar tu puntaje: ${error.message}</p>`;
        } else {
            zonaGuardado.innerHTML = `<p style="color:var(--verde); font-weight:600;">🎉 ¡Nuevo récord personal guardado!</p>`;
        }
    }

    async function cargarRanking() {
        const contenedor = document.getElementById('lista-ranking');

        const { data, error } = await supabaseClient
            .from('clicker_puntajes')
            .select('nombre_mostrar, puntaje')
            .order('puntaje', { ascending: false })
            .limit(5);

        if (error) {
            contenedor.innerHTML = `<p class="vacio">No se pudo cargar el ranking.</p>`;
            return;
        }

        if (!data || data.length === 0) {
            contenedor.innerHTML = `<p class="vacio">Todavía nadie ha jugado. ¡Sé el primero!</p>`;
            return;
        }

        const medallas = ['🥇', '🥈', '🥉', '4°', '5°'];

        contenedor.innerHTML = data.map((fila, i) => `
            <div class="fila-dato">
                <span class="etiqueta">${medallas[i]} ${fila.nombre_mostrar}</span>
                <span class="valor">${fila.puntaje} clics</span>
            </div>
        `).join('');
    }

    // Cargar el ranking apenas se abre la página (para invitados y logueados)
    cargarRanking();
});