const validateDatabaseUrl = (value) => {
  if (!value || typeof value !== 'string') {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }

  // Strip leading and trailing quotes or whitespace commonly introduced during copy-paste into cloud dashboards
  const cleaned = value.trim().replace(/^["']+|["']+$/g, '');
  let parsed;

  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL. Copy the URI from Supabase Project Settings > Database and replace its placeholders locally.');
  }

  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol)
    || !parsed.hostname
    || !parsed.username
    || !parsed.password
  ) {
    throw new Error('DATABASE_URL must include a PostgreSQL scheme, host, username, and password. Copy the URI from Supabase Project Settings > Database.');
  }

  return cleaned;
};

module.exports = { validateDatabaseUrl };