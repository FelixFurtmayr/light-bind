import { getFormElementState, setValue, shouldUpdateFormElement } from './core_inputs.js';

function createVirtualNode(options = {}) {
  const node = {
    element: options.element || null,
    type: options.type || 'element', // 'element' or 'text'
    component: options.component || null,
    scope: options.scope || (options.component ? options.component.scope : null),
    value: null,
    isDirty: false,
    isRemoved: false,
    parent: options.parent || null,
    watchers: []
  };
  
  // Set initial value based on type
  if (node.type === 'text' && options.textData) {
    node.value = options.textData; // { parts, originalValue, lastValue }
  } else if (node.type === 'element' && options.element) {
    node.value = getFormElementState(options.element);
  }
  
  return node;
}

function cloneVirtualNode(node) {
  if (!node) return null;
  
  const newNode = createVirtualNode({
    element: null,
    component: node.component,
    scope: node.scope,
    parent: null
  });
  
  if (node.value) {
    try {
      newNode.value = JSON.parse(JSON.stringify(node.value));
    } catch (e) {
      newNode.value = {...node.value};
    }
  }
  
  return newNode;
}

function applyNodeToDom(node) {
  if (!node.element || !node.isDirty) return;
  
  if (node.isRemoved) {
    if (node.element.parentNode) {
      node.element.parentNode.removeChild(node.element);
    }
    return;
  }
  
  // Handle text nodes
  if (node.type === 'text' && node.value && node.value.lastValue !== undefined) {
    node.element.nodeValue = node.value.lastValue;
    node.isDirty = false;
    return;
  }
  
  // Handle form elements
  if (node.value && shouldUpdateFormElement(node.element, node.component)) {
    setValue(node.element, node.value.value);
  }
  
  node.isDirty = false;
}

function removeNodeFromDOM(node) {
  if (!node.element || !node.element.parentNode) return;
  node.element.parentNode.removeChild(node.element);
  node.isRemoved = true;
}

export const VirtualNode = {
  create: createVirtualNode,
  clone: cloneVirtualNode,
  applyToDom: applyNodeToDom,
  removeFromDOM: removeNodeFromDOM,
  getElementValue: getFormElementState
};
