const path = require('path');
if (!process.env.SUPABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
}
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xuoedlqfzlukddpspuls.supabase.co';
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_plDpsHl5s_Or2WNCmFKgjw_hljeSC4a';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.warn('[Supabase] Warning: SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL is not set.');
}

// Server-side admin client with service/secret key for privileged DB & Auth actions (falls back to publishable key if secret key not set)
const adminKey = supabaseSecretKey || supabasePublishableKey;
const supabaseAdmin = (supabaseUrl && adminKey)
  ? createClient(supabaseUrl, adminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Public/anon client for standard user context operations
const supabaseAnon = (supabaseUrl && supabasePublishableKey)
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    })
  : null;

// Default export uses admin client if available, else anon
const supabase = supabaseAdmin || supabaseAnon;

module.exports = {
  supabase,
  supabaseAdmin,
  supabaseAnon,
  supabaseUrl,
  supabasePublishableKey,
  supabaseSecretKey,
  jwksUrl: process.env.SUPABASE_JWKS_URL || (supabaseUrl ? `${supabaseUrl}/auth/v1/.well-known/jwks.json` : null),
};
