-- ====================================================================
-- SCRIPT DE ACTUALIZACIÓN DE SERVICIOS - DATA FIX
-- Ejecutar en el Editor SQL de Supabase para renovar el catálogo completo
-- ====================================================================

-- 1. Eliminar servicios antiguos
DELETE FROM servicios;

-- 2. Insertar los 8 nuevos servicios con descripciones detalladas
INSERT INTO servicios (nombre_servicio, descripcion, precio, tipo, activo) VALUES
(
    'Implementación de medidas de ciberseguridad',
    'Servicio orientado a la protección preventiva de entornos informáticos en Windows. Comprende la configuración de defensas digitales, auditoría de puertos, protección de red y ajuste de parámetros de privacidad para resguardar la integridad de los datos frente a accesos no autorizados.',
    40.00,
    'ciberseguridad',
    true
),
(
    'Respaldo y recuperación de información en dispositivos móviles',
    'Solución técnica enfocada en la preservación de activos digitales en celulares utilizando el software especializado Dr.Fone Todo en Uno. Incluye la extracción, copia de seguridad y restauración de fotografías, contactos y documentos importantes en situaciones de fallo del sistema, cambio de dispositivo o pérdida accidental de datos.',
    35.00,
    'software',
    true
),
(
    'Recuperación de contraseñas y accesos bloqueados',
    'Asistencia técnica especializada en teléfonos y dispositivos móviles mediante el uso de Dr.Fone. Abarca el restablecimiento de accesos, remoción de patrones, PINs, contraseñas de pantalla y bypass de protección FRP (Factory Reset Protection / bloqueo de cuenta Google), garantizando siempre la verificación previa de la legítima propiedad del equipo.',
    30.00,
    'software',
    true
),
(
    'Diagnóstico y resolución de fallas de software',
    'Análisis detallado para identificar y corregir errores en el sistema operativo Windows. Abarca la solución de conflictos de controladores, reparación de archivos dañados del sistema y corrección de bloqueos o cierres inesperados de aplicaciones.',
    25.00,
    'software',
    true
),
(
    'Eliminación de virus, malware y programas no deseados',
    'Limpieza lógica profunda orientada a detectar y desinfectar archivos maliciosos, spyware y programas secundarios no deseados. Incluye la instalación y configuración de Norton Premium para proporcionar protección activa en tiempo real contra amenazas digitales.',
    30.00,
    'software',
    true
),
(
    'Optimización del rendimiento del equipo',
    'Acondicionamiento del sistema operativo para maximizar la velocidad de respuesta del computador. Incluye la aceleración del tiempo de arranque, limpieza de archivos temporales acumulados y depuración del registro de Windows.',
    25.00,
    'mantenimiento',
    true
),
(
    'Mantenimiento preventivo',
    'Revisión técnica periódica diseñada para anticipar fallas operativas. Contempla la comprobación del estado de salud del almacenamiento (disco duro/SSD), revisión general de componentes internos y verificación del rendimiento global del sistema.',
    20.00,
    'mantenimiento',
    true
),
(
    'Limpieza interna y externa',
    'Mantenimiento físico integral del hardware mediante el uso de herramientas e insumos especializados. Incluye la remoción de polvo interno con sopladora eléctrica RONIX, reemplazo de pasta térmica de alto rendimiento ARCTIC MX-4 y desinfección/limpieza del chasis y pantalla con paños 3M.',
    25.00,
    'hardware',
    true
);
