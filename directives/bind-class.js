import { BaseDirective } from './base-directive.js';

// Updated bind-class.js directive that preserves initial classes
class BindClassDirective extends BaseDirective {
  process(element, expression, component) {
    this.log('debug', `Processing bind-class: ${expression}`);
    
    // Find the owning component for this element
    const elementOwnerComponent = this.findOwnerComponent(element, component);
    const scopeToUse = elementOwnerComponent ? elementOwnerComponent.scope : component.scope;
    
    // Store the original class attribute
    const originalClasses = element.getAttribute('class') || '';
    
    // Initialize nodeBindings for this element if needed
    if (!component.nodeBindings.has(element)) {
      component.nodeBindings.set(element, {});
    }
    
    const nodeBindings = component.nodeBindings.get(element);
    
    // Store original classes in the node bindings
    nodeBindings.originalClasses = originalClasses;
    
    const updateClasses = () => {
      try {
        const result = this.lightBind.evaluateExpression(expression, scopeToUse);
        let dynamicClasses = '';
        
        if (typeof result === 'string') {
          dynamicClasses = result;
        } else if (typeof result === 'object' && result !== null) {
          dynamicClasses = Object.entries(result)
            .filter(([_, active]) => active)
            .map(([cls]) => cls)
            .join(' ');
        }
        
        // Combine original and dynamic classes
        const combinedClasses = this.combineClasses(nodeBindings.originalClasses, dynamicClasses);
        
        // Use component helper for DOM manipulation
        component.updateProperty(element, 'class', combinedClasses);
      } catch (error) {
        this.log('error', `Error updating classes for ${expression}:`, error);
      }
    };
    
    this.lightBind.createWatcher(elementOwnerComponent || component, expression, updateClasses);
    
    // Run once initially to set up classes
    updateClasses();
    
    return { success: true };
  }
  
  // Helper to combine class strings without duplicates
  combineClasses(original, dynamic) {
    if (!original && !dynamic) return '';
    if (!original) return dynamic;
    if (!dynamic) return original;
    
    // Convert class strings to arrays and filter out empty items
    const originalClasses = original.split(/\s+/).filter(c => c.length > 0);
    const dynamicClasses = dynamic.split(/\s+/).filter(c => c.length > 0);
    
    // Combine without duplicates using Set
    const combinedSet = new Set([...originalClasses, ...dynamicClasses]);
    
    return Array.from(combinedSet).join(' ');
  }
  
  findOwnerComponent(element, defaultComponent) {
    // Try to find repeat item component that owns this element
    for (const component of this.lightBind.components.values()) {
      // Check if this is a repeat item component
      if (component.isRepeatItem && component.elements) {
        // Check if this element is part of this component
        if (component.elements.includes(element) ||
            (component.element && component.element.contains(element))) {
          return component;
        }
      }
    }
    
    // Try the element itself
    if (this.lightBind.elementToComponent.has(element)) {
      return this.lightBind.elementToComponent.get(element);
    }
    
    // Try parent elements
    let parent = element.parentElement;
    while (parent) {
      if (this.lightBind.elementToComponent.has(parent)) {
        return this.lightBind.elementToComponent.get(parent);
      }
      if (parent === defaultComponent.element) {
        break;
      }
      parent = parent.parentElement;
    }
    
    return defaultComponent;
  }
}

export { BindClassDirective };
