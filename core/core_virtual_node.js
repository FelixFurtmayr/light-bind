// core_virtual_node.js
// Simplified Virtual Node implementation for LightBind

// Create a virtual node focused on element values
function createVirtualNode(options = {}) {
  // Default values
  const node = {
    // Essential references
    element: options.element || null,             // Reference to actual DOM element
    component: options.component || null,         // Reference to component
    scope: options.scope || 
           (options.component ? options.component.scope : null),
    
    // Input value tracking
    value: options.element ? getElementValue(options.element) : null,
    
    // Minimal state tracking for diffing
    isDirty: false,
    isRemoved: false,
    
    // Tree structure (minimal)
    parent: options.parent || null,
    
    // Watcher references for cleanup
    watchers: []
  };
  
  return node;
}

// Helper to get element value state (focusing on form controls)
function getElementValue(element) {
  if (!element || !element.tagName) return null;
  
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
    const state = { type: element.type || 'text' };
    
    if (element.tagName === 'INPUT') {
      if (element.type === 'checkbox' || element.type === 'radio') {
        state.checked = element.checked;
        state.value = element.value;
      } else {
        state.value = element.value;
      }
    } else if (element.tagName === 'SELECT') {
      state.value = element.value;
      state.selectedIndex = element.selectedIndex;
      state.multiple = element.multiple;
    } else { // TEXTAREA
      state.value = element.value;
    }
    
    return state;
  }
  
  return null;
}

// Clone a node (for creating templates)
function cloneVirtualNode(node) {
  if (!node) return null;
  
  const newNode = createVirtualNode({
    element: null,
    component: node.component,
    scope: node.scope,
    parent: null
  });
  
  // Deep copy value if it exists
  if (node.value) {
    try {
      newNode.value = JSON.parse(JSON.stringify(node.value));
    } catch (e) {
      // Fallback to shallow copy if JSON serialization fails
      newNode.value = {...node.value};
    }
  }
  
  return newNode;
}

// Update real DOM form elements based on virtual node state
function applyNodeToDom(node) {
  if (!node.element || !node.isDirty) return;
  
  // Skip if the node is marked for removal
  if (node.isRemoved) {
    if (node.element.parentNode) {
      node.element.parentNode.removeChild(node.element);
    }
    return;
  }
  
  // Only focus on form elements' values
  if (node.value && ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.element.tagName)) {
    const value = node.value;
    
    if (node.element.tagName === 'INPUT') {
      if (node.element.type === 'checkbox' || node.element.type === 'radio') {
        // Don't update if explicitly managed by component
        const nodeBindings = node.component?.nodeBindings?.get(node.element);
        const isDirectiveManaged = nodeBindings?.managedProps?.checked !== undefined;
        
        if (!isDirectiveManaged && node.element.checked !== value.checked) {
          node.element.checked = value.checked;
        }
      } else {
        // Don't update if explicitly managed by component
        const nodeBindings = node.component?.nodeBindings?.get(node.element);
        const isDirectiveManaged = nodeBindings?.managedProps?.value !== undefined;
        
        if (!isDirectiveManaged && node.element.value !== value.value) {
          node.element.value = value.value;
        }
      }
    } else if (node.element.tagName === 'SELECT') {
      // Don't update if explicitly managed by component
      const nodeBindings = node.component?.nodeBindings?.get(node.element);
      const isDirectiveManaged = nodeBindings?.managedProps?.value !== undefined;
      
      if (!isDirectiveManaged && node.element.value !== value.value) {
        node.element.value = value.value;
      }
    } else if (node.element.tagName === 'TEXTAREA') {
      // Don't update if explicitly managed by component
      const nodeBindings = node.component?.nodeBindings?.get(node.element);
      const isDirectiveManaged = nodeBindings?.managedProps?.value !== undefined;
      
      if (!isDirectiveManaged && node.element.value !== value.value) {
        node.element.value = value.value;
      }
    }
  }
  
  // Mark as clean
  node.isDirty = false;
}

// Remove a node from the DOM
function removeNodeFromDOM(node) {
  if (!node.element || !node.element.parentNode) return;
  
  node.element.parentNode.removeChild(node.element);
  node.isRemoved = true;
}

// Export virtual node functions
export const VirtualNode = {
  create: createVirtualNode,
  clone: cloneVirtualNode,
  applyToDom: applyNodeToDom,
  removeFromDOM: removeNodeFromDOM,
  getElementValue
};
