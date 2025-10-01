import { getEventType, getValue, setValue } from '../core/core_inputs.js';
import { BaseDirective } from './base-directive.js';

class BindDirective extends BaseDirective {

  process(element, expression, component) {
    const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT';
    
    if (!isInput) {
      this.log('warn', `Two-way binding can only be applied to input elements: ${element.tagName}`);
      return { success: false };
    }
    
    this.log('dom', `Setting up two-way binding for ${element.tagName} with "${expression}"`);
    
    const eventType = getEventType(element);
    const self = this;
    
    function updateHandler(event) {
      const newVal = getValue(element);
      try {
        self.log('event', `Two-way binding triggered, updating ${expression} to:`, newVal);
        self.lightBind.setNestedProperty(component.scope, expression, newVal);
        self.lightBind.digest(component);
      } catch (error) {
        self.log('error', `Error updating property ${expression}:`, error);
      }
    }
    
    element.addEventListener(eventType, updateHandler);
    
    function updateValue(newValue) {
      try {
        setValue(element, newValue);
      } catch (error) {
        self.log('error', `Error updating input element with ${newValue}:`, error);
      }
    }
    
    const initialValue = this.lightBind.getNestedProperty(component.scope, expression);
    updateValue(initialValue);
    
    this.lightBind.createWatcher(component, expression, updateValue);
    
    element.__lb_two_way_binding = true;
    this.log('dom', `Two-way binding established for "${expression}"`);
    
    return { success: true };
  }
}

export { BindDirective };
