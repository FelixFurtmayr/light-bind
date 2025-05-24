import { BaseDirective } from './base-directive.js';

class BindAttrDirective extends BaseDirective {
  process(element, expression, component) {
    const parsed = this.lightBind.parseComplexExpression(expression);
    
    if (parsed.type === 'object') {
      parsed.pairs.forEach(pair => {
        const { attribute: attr, expression: attrExpr } = pair;
        this.lightBind.createWatcher(component, attrExpr, (newVal) => {
          component.updateProperty(element, attr, newVal);
        });
      });
    } 
    else {
      this.log('warn', 'bind-attr should be an object', expression);
      
      this.lightBind.createWatcher(component, expression, (newVal) => {
        try {
          if (typeof newVal === 'object' && newVal !== null) {
            Object.entries(newVal).forEach(([key, value]) => {
              component.updateProperty(element, key, value);
            });
          }
        } catch (error) {
          this.log('error', 'Error setting attributes', error);
        }
      });
    }
    
    return { success: true };
  }
}

export { BindAttrDirective };
