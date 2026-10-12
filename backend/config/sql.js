const expandArrayParameter = (value, values) => {
  if (value.length > 0 && Array.isArray(value[0])) {
    return value.map((row) => `(${row.map((item) => {
      values.push(item);
      return `$${values.length}`;
    }).join(', ')})`).join(', ');
  }

  if (value.length === 0) return 'NULL';
  return value.map((item) => {
    values.push(item);
    return `$${values.length}`;
  }).join(', ');
};

const translateSql = (sql, params = []) => {
  const values = [];
  let text = '';
  let paramIndex = 0;
  let quote = null;

  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index];

    if (quote) {
      text += current;
      if (current === quote) {
        if (sql[index + 1] === quote) {
          text += sql[index + 1];
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (current === "'" || current === '"') {
      quote = current;
      text += current;
      continue;
    }

    if (current !== '?') {
      text += current;
      continue;
    }

    if (paramIndex >= params.length) {
      throw new Error('SQL contains more placeholders than provided parameters.');
    }

    const value = params[paramIndex];
    paramIndex += 1;
    if (Array.isArray(value)) {
      text += expandArrayParameter(value, values);
    } else {
      values.push(value);
      text += `$${values.length}`;
    }
  }

  if (paramIndex !== params.length) {
    throw new Error(`SQL parameter count mismatch: expected ${paramIndex}, received ${params.length}.`);
  }

  text = text.replace(/\bSTART TRANSACTION\b/gi, 'BEGIN');
  text = text.replace(/\b(is_active|is_primary)\s*=\s*1\b/gi, '$1 = TRUE');
  text = text.replace(/\b(is_active|is_primary)\s*=\s*0\b/gi, '$1 = FALSE');

  if (/^\s*INSERT\b/i.test(text) && !/\bRETURNING\b/i.test(text)) {
    text = `${text.trim().replace(/;$/, '')} RETURNING id`;
  }

  return { text, values };
};

const formatResult = (sql, result) => {
  if (/^\s*(SELECT|WITH)\b/i.test(sql)) return result.rows;
  return {
    insertId: result.rows?.[0]?.id ?? null,
    affectedRows: result.rowCount,
    rows: result.rows,
  };
};

module.exports = { translateSql, formatResult };