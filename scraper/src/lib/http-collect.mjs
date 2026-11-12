// Canonical Edge implementation, including ALDI probe mode and safe diagnostics.
// Re-export rather than duplicate code so Node and Deno cannot silently diverge.
export {collect,getHtml,getResource} from '../../../supabase/functions/catalogue-collect/http-collect.mjs';
