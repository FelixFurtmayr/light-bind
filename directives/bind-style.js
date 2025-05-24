import { BaseDirective } from './base-directive.js';

// Updated bind-style.js directive using component helper
class BindStyleDirective extends BaseDirective {
  process(element, expression, component) {
    const parsed = this.lightBind.parseComplexExpression(expression);
    
    if (parsed.type === 'object') {
      // Track all style properties to update
      const styleProperties = {};
      
      parsed.pairs.forEach(pair => {
        const { attribute: property, expression: styleExpr } = pair;
        
        this.lightBind.createWatcher(component, styleExpr, (newVal) => {
          // Safety check - provide default values
          const safeValue = (newVal === undefined || newVal === null) ? '' : newVal;
          
          // Update our style tracking object
          styleProperties[property] = safeValue;
          
          // Update the element using component helper
          component.updateProperty(element, 'style', styleProperties);
        });
      });
    } 
    else {
      this.log('warn', 'bind-style should be an object', expression);
      
      this.lightBind.createWatcher(component, expression, (newVal) => {
        try {
          if (typeof newVal === 'object' && newVal !== null) {
            // Update using component helper
            component.updateProperty(element, 'style', newVal);
          } else if (newVal === undefined || newVal === null) {
            // Handle undefined/null case by setting empty styles
            component.updateProperty(element, 'style', {});
          }
        } catch (error) {
          this.log('error', 'Error setting styles', error);
        }
      });
    }
    
    return { success: true };
  }
}

export { BindStyleDirective };

