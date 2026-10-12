const { supabase, supabaseAdmin } = require('../config/supabaseClient');

/**
 * Cookie options helper for session cookies
 */
function getCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  };
}

/**
 * Helper to set Supabase session cookies on response
 */
function setSessionCookies(res, session) {
  if (!session) return;
  const isProd = process.env.NODE_ENV === 'production';
  const cookieFlags = `Path=/; SameSite=Lax${isProd ? '; Secure' : ''}; HttpOnly`;

  if (session.access_token) {
    const expires = new Date(Date.now() + (session.expires_in || 3600) * 1000).toUTCString();
    res.append('Set-Cookie', `sb-access-token=${session.access_token}; ${cookieFlags}; Expires=${expires}`);
  }
  if (session.refresh_token) {
    const refreshExpires = new Date(Date.now() + 60 * 60 * 24 * 30 * 1000).toUTCString(); // 30 days
    res.append('Set-Cookie', `sb-refresh-token=${session.refresh_token}; ${cookieFlags}; Expires=${refreshExpires}`);
  }
}

/**
 * Global or route middleware to keep Supabase user sessions refreshed
 */
async function supabaseSessionMiddleware(req, res, next) {
  if (!supabase) return next();

  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const accessToken = bearerToken || req.cookies?.['sb-access-token'] || req.cookies?.['supabase-access-token'];
    const refreshToken = req.cookies?.['sb-refresh-token'] || req.cookies?.['supabase-refresh-token'];

    // 1. If we have an access token, try to verify it
    if (accessToken) {
      const client = supabaseAdmin || supabase;
      const { data: { user }, error } = await client.auth.getUser(accessToken);

      if (user && !error) {
        req.supabaseUser = user;
        req.user = req.user || {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || user.role || 'customer',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        };
        return next();
      }
    }

    // 2. If access token is missing or expired, but we have a refresh token, refresh it
    if (refreshToken) {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (!error && data?.session && data?.user) {
        setSessionCookies(res, data.session);
        req.supabaseUser = data.user;
        req.user = req.user || {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || data.user.role || 'customer',
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email,
        };
      }
    }
  } catch (err) {
    // Session refresh errors should not crash request processing
    console.warn('[supabaseAuth] Session refresh notice:', err.message);
  }

  next();
}

/**
 * Strict authentication guard middleware
 */
async function requireSupabaseAuth(req, res, next) {
  // If user is already authenticated via session middleware
  if (req.supabaseUser || req.user) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && !req.cookies?.['sb-access-token']) {
    return res.status(401).json({ message: 'Authentication required. Please sign in.' });
  }

  const accessToken = token || req.cookies?.['sb-access-token'];
  const client = supabaseAdmin || supabase;

  try {
    const { data: { user }, error } = await client.auth.getUser(accessToken);
    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired session. Please sign in again.' });
    }

    req.supabaseUser = user;
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || user.role || 'customer',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Authentication verification failed.' });
  }
}

module.exports = {
  supabaseSessionMiddleware,
  requireSupabaseAuth,
  setSessionCookies,
};
