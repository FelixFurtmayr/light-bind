// core_virtual_dom.js
// Simplified Virtual DOM implementation for LightBind focusing on form elements

import { VirtualNode } from './core_virtual_node.js';

// Create virtual DOM manager
export function createVirtualDOM(lightBind) {
  const vdom = {
    nodeMap: new WeakMap(),       // Maps DOM nodes to virtual nodes
    componentMap: new Map(),      // Maps components to their root virtual nodes
  };
  
  // Only create virtual nodes for component roots and form elements
  vdom.createFromDOM = function(element, component) {
    if (!element) return null;
    
    // Check if node already exists
    if (vdom.nodeMap.has(element)) {
      return vdom.nodeMap.get(element);
    }
    
    let vNode = null;
    
    // Create a node for the root component element
    if (component && element === component.element) {
      vNode = VirtualNode.create({
        element, 
        component,
        scope: component.scope
      });
      vdom.nodeMap.set(element, vNode);
      vdom.componentMap.set(component, vNode);
    }
    // Create nodes for form elements
    else if (isFormElement(element)) {
      vNode = VirtualNode.create({
        element, 
        component,
        scope: component.scope
      });
      vdom.nodeMap.set(element, vNode);
    }
    
    // For other elements, search the children recursively for form elements
    if (element.children && element.children.length > 0) {
      Array.from(element.children).forEach(child => {
        vdom.createFromDOM(child, component);
      });
    }
    
    return vNode;
  };
  
  // Update to focus on form value changes
  vdom.updateComponent = function(component) {
    if (!component) return;
    
    // Find all form elements in this component
    component.element.querySelectorAll('input, select, textarea').forEach(elem => {
      // Get or create virtual node for this form element
      let vNode = vdom.nodeMap.get(elem);
      if (!vNode) {
        vNode = VirtualNode.create({
          element: elem, 
          component,
          scope: component.scope
        });
        vdom.nodeMap.set(elem, vNode);
      }
      
      // Check if form value has changed
      const oldValue = vNode.value || {};
      const newValue = VirtualNode.getElementValue(elem);
      
      // Mark as dirty if changed
      if (!lightBind.isEqual(oldValue, newValue)) {
        vNode.value = newValue;
        vNode.isDirty = true;
      }
    });
  };
  
  
  // Apply changes - focus on form elements
  vdom.applyChanges = function() {
    // Update each component's form elements
    vdom.componentMap.forEach((rootNode, component) => {
      if (!component || !component.element) return;
      
      // Find all form elements and update if dirty
      component.element.querySelectorAll('input, select, textarea').forEach(element => {
        const node = vdom.nodeMap.get(element);
        if (node && node.isDirty) {
          VirtualNode.applyToDom(node);
          
          // Update scope bindings if needed
          if (node.value && node.component) {
            updateBindings(node, element);
          }
        }
      });
    });
  };
  
  // Helper to update scope from form element
  function updateBindings(node, element) {
    const bindAttr = element.getAttribute('bind');
    if (!bindAttr || !node.component || !node.component.scope) return;
    
    // Skip if explicitly managed by a directive
    const nodeBindings = node.component.nodeBindings.get(element);
    if (nodeBindings?.managedProps?.value !== undefined) return;
    
    if (element.type === 'checkbox' || element.type === 'radio') {
      node.component.scope[bindAttr] = element.checked;
    } else {
      node.component.scope[bindAttr] = element.value;
    }
  }
  
  // Helper to check if element is a form element
  function isFormElement(element) {
    return element && element.tagName && 
           ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
  }
  
  // Get a virtual node for an element
  vdom.getVirtualNode = function(element) {
    return vdom.nodeMap.get(element);
  };

  vdom.cleanupComponent = function(component) {
    if (!component) return;
    
    // Clean up component in the component map
    vdom.componentMap.delete(component);
    
    // Since nodeMap is a WeakMap without forEach, we can't iterate directly
    // Instead, we need to find and clean elements from the DOM
    
    // Start with the component's root element
    if (component.element) {
      vdom.nodeMap.delete(component.element);
      
      // If the component has elements array (like in repeat directives)
      if (component.elements && Array.isArray(component.elements)) {
        component.elements.forEach(element => {
          if (element) vdom.nodeMap.delete(element);
        });
      }
      
      // Clean up all form elements within this component
      if (component.element.querySelectorAll) {
        const formElements = component.element.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
          vdom.nodeMap.delete(element);
        });
      }
    }
  };
  
  
  return vdom;
}
