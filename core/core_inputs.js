// core_inputs.js
// Static form element value handling

// Get value from form element with type handling
export function getValue(element) {
  if (!element) return null;
  
  if (element.type === 'checkbox') return element.checked;
  if (element.type === 'number' || element.type === 'range') {
    const val = Number(element.value);
    return isNaN(val) ? 0 : val;
  }
  return element.value;
}

// Set value to form element with retry logic
export function setValue(element, value) {
  if (!element) return;
  
  if (element.type === 'checkbox') {
    element.checked = !!value;
  } else if (element.type === 'radio') {
    element.checked = element.value === String(value);
  } else if (element.tagName === 'SELECT') {
    element.value = value;
    
    // Retry logic for selects only if needed
    if (element.value !== String(value) && value != null && value !== '') {
      const retry = (element.__retry || 0) + 1;
      if (retry <= 3) {
        element.__retry = retry;
        setTimeout(() => setValue(element, value), 10 * retry);
      } else {
        delete element.__retry;
        console.warn(`Could not set select value to "${value}"`);
      }
    } else {
      delete element.__retry;
    }
  } else {
    // Prevent cursor jumping on active element
    if (document.activeElement !== element || element.value !== String(value ?? '')) {
      element.value = value ?? '';
    }
  }
}

// Get appropriate event type for element
export function getEventType(element) {
  if (!element) return 'input';
  
  if (element.type === 'checkbox' || 
      element.type === 'radio' || 
      element.tagName === 'SELECT') {
    return 'change';
  }
  return 'input';
}

// Check if element is a form element
export function isFormElement(element) {
  return element && ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
}

// Get form element state for virtual DOM
export function getFormElementState(element) {
  if (!isFormElement(element)) return null;
  
  const state = { 
    type: element.type || 'text',
    value: getValue(element)
  };
  
  if (element.type === 'checkbox' || element.type === 'radio') {
    state.checked = element.checked;
  }
  
  if (element.tagName === 'SELECT') {
    state.selectedIndex = element.selectedIndex;
    state.multiple = element.multiple;
  }
  
  return state;
}

// Check if virtual node should update real DOM (respecting managed properties)
export function shouldUpdateFormElement(element, component) {
  if (!component || !component.nodeBindings) return true;
  
  const nodeBindings = component.nodeBindings.get(element);
  if (!nodeBindings) return true;
  
  // Check if value/checked is managed by a directive
  if (element.type === 'checkbox' || element.type === 'radio') {
    return nodeBindings.managedProps?.checked === undefined;
  }
  
  return nodeBindings.managedProps?.value === undefined;
}

// Update form element from scope binding
export function updateFormBinding(element, scope) {
  const bindAttr = element.getAttribute('bind');
  if (!bindAttr || !scope) return;
  
  scope[bindAttr] = getValue(element);
}
