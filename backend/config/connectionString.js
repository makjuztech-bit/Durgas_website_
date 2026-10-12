const validateDatabaseUrl = (value) => {
  let parsed;

  try {
    parsed = new URL(value);
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

  return value;
};

module.exports = { validateDatabaseUrl };