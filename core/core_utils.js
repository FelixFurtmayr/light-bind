export function log(debug, category, ...args) {
  if (debug) {
    category = category || 'default';
    const timestamp = new Date().toISOString().substring(11, 23);
    const prefix = `[LightBind][${timestamp}][${category}]`;
    const style = {
      event: 'color: #9933cc',
      digest: 'color: #33cc33',
      dom: 'color: #3399ff',
      init: 'color: #ff9900; font-weight: bold',
      debug: 'color: #33ccff'
    }[category] || 'color: #666666';
    if (category === 'error') {
      console.error(prefix, ...args);
      if (args.length > 0 && args[args.length - 1] instanceof Error) {
        console.error(args[args.length - 1].stack);
      } else {
        console.error(new Error().stack);
      }
    } else if (category === 'warn') {
      console.warn(prefix, ...args);
    } else {
      console.log(`%c${prefix}`, style, ...args);
    }
  }
}

export function isEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA !== typeB) return false;
  if (typeA !== 'object') return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (!Array.isArray(a) && !Array.isArray(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!b.hasOwnProperty(key) || !isEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

export function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item));
  }
  const result = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = deepClone(value[key]);
    }
  }
  return result;
}

// Tokenizes a path like "invoice[f.key]" or "items[0].value" into segments.
// Bracket content is marked dynamic: true, since it may be a literal index/key
// or an expression that needs to be evaluated against the scope (e.g. "f.key").
export function parsePropertyPath(path) {
  const segments = [];
  let current = '';
  let i = 0;

  while (i < path.length) {
    const char = path[i];

    if (char === '.') {
      if (current) { segments.push({ key: current, dynamic: false }); current = ''; }
      i++;
    } else if (char === '[') {
      if (current) { segments.push({ key: current, dynamic: false }); current = ''; }
      let depth = 1;
      let inner = '';
      i++;
      while (i < path.length && depth > 0) {
        if (path[i] === '[') depth++;
        else if (path[i] === ']') { depth--; if (depth === 0) break; }
        inner += path[i];
        i++;
      }
      segments.push({ key: inner, dynamic: true });
      i++; // skip closing ']'
    } else {
      current += char;
      i++;
    }
  }

  if (current) segments.push({ key: current, dynamic: false });
  return segments;
}

// Resolves a single dynamic segment to a concrete key: numeric literal,
// quoted string literal, or (if evaluateFn given) an evaluated expression.
export function resolvePathKey(segment, root, evaluateFn) {
  if (!segment.dynamic) return segment.key;
  const key = segment.key.trim();
  if (/^\d+$/.test(key)) return Number(key);
  if (/^(['"]).*\1$/.test(key)) return key.slice(1, -1);
  if (evaluateFn) return evaluateFn(key, root);
  return key;
}

export function getNestedProperty(obj, path, evaluateFn) {
  try {
    const segments = parsePropertyPath(path);
    let value = obj;

    for (const segment of segments) {
      if (value === null || value === undefined) return undefined;
      const key = resolvePathKey(segment, obj, evaluateFn);
      value = value[key];
    }

    return value;
  } catch (error) {
    console.error(`Error getting nested property ${path}:`, error);
    return undefined;
  }
}


// https://techoverflow.net/2018/03/30/copying-strings-to-the-clipboard-using-pure-javascript/
export function copyToClipboard (str) {
  // Create new element
  var el = document.createElement('textarea');
  // Set value (string to be copied)
  el.value = str;
  // Set non-editable to avoid focus and move outside of view
  el.setAttribute('readonly', '');
  el.style = {position: 'absolute', left: '-9999px'};
  document.body.appendChild(el);
  // Select text inside element
  el.select();
  // Copy text to clipboard
  document.execCommand('copy');
  // Remove temporary element
  document.body.removeChild(el);
}
