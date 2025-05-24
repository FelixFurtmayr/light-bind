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

export function getNestedProperty(obj, path) {
  try {
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return value;
  } catch (error) {
    console.error(`Error getting nested property ${path}:`, error);
    return undefined;
  }
}

export function setNestedProperty(obj, path, value) {
  try {
    const parts = path.split('.');
    const lastPart = parts.pop();
    let current = obj;
    
    for (const part of parts) {
      if (current[part] === undefined || current[part] === null) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[lastPart] = value;
    return true;
  } catch (error) {
    console.error(`Error setting nested property ${path}:`, error);
    return false;
  }
}
