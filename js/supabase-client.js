/**
 * js/supabase-client.js
 * -------------------------------------------------------------
 * Configuración de conexión a Supabase.
 *
 * 👉 REEMPLAZA estos dos valores con los tuyos:
 *    Los encuentras en: Supabase → tu proyecto → Project Settings → API
 *
 * Este archivo debe cargarse DESPUÉS de la librería de Supabase
 * (el <script> del CDN) y ANTES de cualquier otro script que use
 * "supabaseClient".
 * -------------------------------------------------------------
 */

const SUPABASE_URL = 'https://tanuwxjbzphymdhokqwk.supabase.co';       // <-- cambia esto
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhbnV3eGpienBoeW1kaG9rcXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMjcwNzMsImV4cCI6MjA5ODcwMzA3M30.PgsDYr0HvIEsUwAbXRNtLWy2-kFJxcyYXYvztC_cCTs';                   // <-- cambia esto

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
