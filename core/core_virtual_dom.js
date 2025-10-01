import { getFormElementState, isFormElement, shouldUpdateFormElement, updateFormBinding } from './core_inputs.js';
import { VirtualNode } from './core_virtual_node.js';

export function createVirtualDOM(lightBind) {
  const vdom = {
    nodeMap: new WeakMap(),
    componentMap: new Map(),
    textNodeMap: new Map(), // Changed to Map to support forEach
  };
  
  vdom.createFromDOM = function(element, component) {
    if (!element || vdom.nodeMap.has(element)) {
      return vdom.nodeMap.get(element);
    }
    
    let vNode = null;
    
    if (component && element === component.element) {
      vNode = VirtualNode.create({ element, component, scope: component.scope });
      vdom.nodeMap.set(element, vNode);
      vdom.componentMap.set(component, vNode);
    } else if (isFormElement(element)) {
      vNode = VirtualNode.create({ element, component, scope: component.scope });
      vdom.nodeMap.set(element, vNode);
    }
    
    if (element.children?.length > 0) {
      Array.from(element.children).forEach(child => vdom.createFromDOM(child, component));
    }
    
    return vNode;
  };
  
  vdom.updateComponent = function(component) {
    if (!component) return;
    
    component.element.querySelectorAll('input, select, textarea').forEach(elem => {
      let vNode = vdom.nodeMap.get(elem);
      if (!vNode) {
        vNode = VirtualNode.create({ element: elem, component, scope: component.scope });
        vdom.nodeMap.set(elem, vNode);
      }
      
      const oldValue = vNode.value || {};
      const newValue = getFormElementState(elem);
      
      if (!lightBind.isEqual(oldValue, newValue)) {
        vNode.value = newValue;
        vNode.isDirty = true;
      }
    });
  };
  
  vdom.applyChanges = function() {
    // Process component form elements
    vdom.componentMap.forEach((rootNode, component) => {
      if (!component?.element) return;
      
      component.element.querySelectorAll('input, select, textarea').forEach(element => {
        const node = vdom.nodeMap.get(element);
        if (node?.isDirty) {
          VirtualNode.applyToDom(node);
          
          if (node.value && node.component && shouldUpdateFormElement(element, node.component)) {
            updateFormBinding(element, node.component.scope);
          }
        }
      });
    });
    
    // Process text nodes
    vdom.textNodeMap.forEach((vNode, textNode) => {
      if (vNode.isDirty) {
        VirtualNode.applyToDom(vNode);
      }
    });
  };
  
  vdom.getVirtualNode = function(element) {
    return vdom.nodeMap.get(element);
  };
  
  vdom.processTextNodes = function(element, component) {
    if (!element || !component) return;
    
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('{{')) {
        const parts = lightBind.parseInterpolatedString(node.nodeValue);
        
        if (parts.some(p => p.expression)) {
          const textData = {
            originalValue: node.nodeValue,
            parts: parts,
            lastValue: null
          };
          
          const vNode = VirtualNode.create({
            element: node,
            type: 'text',
            component: component,
            scope: component.scope,
            textData: textData
          });
          
          vdom.textNodeMap.set(node, vNode);
          
          // Create update function
          const updateText = () => {
            let newText = '';
            
            parts.forEach(part => {
              if (part.expression) {
                const value = lightBind.evaluateExpression(part.text, component.scope);
                let displayValue = '';
                
                if (value === null) {
                  displayValue = 'null';
                } else if (value === undefined) {
                  displayValue = '';
                } else if (typeof value === 'object') {
                  try {
                    displayValue = JSON.stringify(value);
                  } catch (e) {
                    displayValue = String(value);
                  }
                } else {
                  displayValue = String(value);
                }
                
                newText += displayValue;
              } else {
                newText += part.text;
              }
            });
            
            if (vNode.value.lastValue !== newText) {
              vNode.value.lastValue = newText;
              vNode.isDirty = true;
              // Apply immediately on first run
              if (vNode.value.lastValue !== null) {
                node.nodeValue = newText;
              }
            }
          };
          
          // Set up watchers
          // text nodes - not working for now
          // parts.filter(p => p.expression).forEach(part => {
          //   const deps = lightBind.extractPropertyPaths(part.text);
            
          //   deps.forEach(path => {
          //     if (!component.textNodeRegistry) component.textNodeRegistry = {};
          //     if (!component.textNodeRegistry[path]) {
          //       component.textNodeRegistry[path] = [];
          //     }
          //     component.textNodeRegistry[path].push({
          //       node: node,
          //       vNode: vNode,
          //       update: updateText
          //     });
          //   });
          // });

           parts.filter(p => p.expression).forEach(part => {
            lightBind.createWatcher(component, part.text, updateText);
          });
          
          // Initial update
          updateText();
          // Force immediate update on initialization
          if (vNode.isDirty && vNode.value.lastValue !== null) {
            node.nodeValue = vNode.value.lastValue;
            vNode.isDirty = false;
          }
        }
      }
    };
    
    // Process all text nodes in element
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip if parent has child-handling directives
          const parent = node.parentElement;
          if (parent && hasChildHandlingDirective(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      processNode(node);
    }
  };
  
  function hasChildHandlingDirective(element) {
    const childHandlingDirectives = ['bind-if', 'bind-repeat', 'bind-component', 'bind-html'];
    return Array.from(element.attributes || []).some(attr => 
      childHandlingDirectives.includes(attr.name)
    );
  }

  vdom.cleanupComponent = function(component) {
    if (!component) return;
    
    vdom.componentMap.delete(component);
    
    if (component.element) {
      vdom.nodeMap.delete(component.element);
      
      component.elements?.forEach(element => {
        if (element) vdom.nodeMap.delete(element);
      });
      
      component.element.querySelectorAll?.('input, select, textarea').forEach(element => {
        vdom.nodeMap.delete(element);
      });
      
      // Clean up text nodes
      const walker = document.createTreeWalker(
        component.element,
        NodeFilter.SHOW_TEXT
      );
      let node;
      while (node = walker.nextNode()) {
        vdom.textNodeMap.delete(node);
      }
    }
  };
  
  return vdom;
}
