import { BaseDirective } from './base-directive.js';

class BindTextDirective extends BaseDirective {
  process(element, expression, component) {
    // Process text nodes in this element
    this.processTextNodesInElement(element, component);
    // Process child elements recursively, unless they have their own directives
    this.processChildElements(element, component);
    return { success: true };
  }
  
  processTextNodesInElement(element, component) {
    Array.from(element.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('{{')) {
        this.setupTextBinding(node, component);
      }
    });
  }
  
processChildElements(element, component) {
  const childElements = element.children;
  if (!childElements || childElements.length === 0) return;
  
  Array.from(childElements).forEach(child => {
    // Always process text nodes in all elements
    this.processTextNodesInElement(child, component);
    
    // Only skip recursive processing for components or child-handling directives
    if (this.lightBind.elementToComponent.has(child) || this.hasChildHandlingDirectives(child)) {
      return;
    }
    
    // Continue recursion for other elements
    this.processChildElements(child, component);
  });
}
  
  setupTextBinding(textNode, component) {
    const originalValue = textNode.nodeValue;
    const parts = this.lightBind.parseInterpolatedString(originalValue);
    
    if (parts.some(p => p.expression)) {
      // Ensure the textBindings collection exists
      if (!component.textBindings) {
        component.textBindings = new Map();
      }
      
      // Store binding information
      component.textBindings.set(textNode, { 
        originalValue, 
        parts,
        lastValue: null // Initial state
      });
      
      // Create the update function
      const updateText = () => {
        let newText = '';
        
        // Build new text by evaluating each part
        parts.forEach(part => {
          if (part.expression) {
            // Evaluate expressions in current scope
            const value = this.lightBind.evaluateExpression(part.text, component.scope);
            
            // Handle different value types appropriately
            let displayValue = '';
            
            try {
              if (value === null) {
                displayValue = 'null';
              } else if (value === undefined) {
                displayValue = '';
              } else if (typeof value === 'object') {
                // Try to stringify objects
                try {
                  displayValue = JSON.stringify(value);
                } catch (e) {
                  // If stringify fails, use toString or a fallback
                  displayValue = String(value);
                }
              } else {
                // For simple types, just convert to string
                displayValue = String(value);
              }
            } catch (error) {
              this.log('error', `Error formatting value for display: ${error.message}`);
              displayValue = String(value);
            }
            
            newText += displayValue;
          } else {
            // Static text parts
            newText += part.text;
          }
        });
        
        // Update the DOM node only if the value changed
        const binding = component.textBindings.get(textNode);
        if (binding.lastValue !== newText) {
          textNode.nodeValue = newText;
          binding.lastValue = newText;
          
          this.log('dom', `Updated text binding: ${originalValue} -> ${newText}`);
        }
      };
      
      // Set up watchers for each expression
      parts.filter(p => p.expression).forEach(part => {
        this.lightBind.createWatcher(component, part.text, updateText);
      });
      
      // Apply initial update
      updateText();
    }
  }

  hasChildHandlingDirectives(element) {
    if (!element.hasAttributes()) return false;
    
    // Specific list of directives that handle their own children
    const childHandlingDirectives = [
      'bind-if',       // Conditional rendering, manages its children
      'bind-repeat',   // Iterative rendering, manages its children
      'bind-component', // Loads external components
      'bind-html'      // Renders HTML content
    ];
    
    return Array.from(element.attributes).some(attr => 
      childHandlingDirectives.includes(attr.name)
    );
  }
}

export { BindTextDirective };
