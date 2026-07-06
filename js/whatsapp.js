/**
 * js/whatsapp.js
 * -------------------------------------------------------------
 * Configuración y función auxiliar para generar links de WhatsApp
 * con mensaje pre-llenado.
 * -------------------------------------------------------------
 */

// 👉 CAMBIA ESTO por el número de WhatsApp real del taller.
// Formato: código de país + número, TODO JUNTO, sin espacios,
// sin "+", sin guiones. Ejemplo El Salvador: '503' + 8 dígitos:
const WHATSAPP_NEGOCIO = '50376599530';

/**
 * Genera un link de WhatsApp (wa.me) con un mensaje pre-llenado.
 * @param {string} numero - número de teléfono (con o sin formato, se limpia solo)
 * @param {string} mensaje - texto que aparecerá ya escrito en el chat
 */
function construirLinkWhatsApp(numero, mensaje) {
    const numeroLimpio = (numero || '').replace(/\D/g, '');
    const texto = encodeURIComponent(mensaje);
    return `https://wa.me/${numeroLimpio}?text=${texto}`;
}
