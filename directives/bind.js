import { BaseDirective } from './base-directive.js';

/**
 * Direktive für Two-Way-Binding von Eingabefeldern
 */
class BindDirective extends BaseDirective {

  process(element, expression, component) {
    const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT';
    
    if (!isInput) {
      this.log('warn', `Two-way binding can only be applied to input elements: ${element.tagName}`);
      return { success: false };
    }
    
    this.log('dom', `Setting up two-way binding for ${element.tagName} with "${expression}"`);
    
    const eventType = element.type === 'checkbox' || element.type === 'radio' || element.tagName === 'SELECT' 
      ? 'change' 
      : 'input';
    
    const updateHandler = (event) => {
      const newVal = this.getInputValue(element);
      try {
        this.log('event', `Two-way binding triggered, updating ${expression} to:`, newVal);
        this.lightBind.setNestedProperty(component.scope, expression, newVal);
        this.lightBind.digest(component);
      } catch (error) {
        this.log('error', `Error updating property ${expression}:`, error);
      }
    };
    
    element.addEventListener(eventType, updateHandler);
    
    const updateValue = (newValue) => {
      try {
        this.setInputValue(element, newValue);
      } catch (error) {
        this.log('error', `Error updating input element with ${newValue}:`, error);
      }
    };
    
    const initialValue = this.lightBind.getNestedProperty(component.scope, expression);
    updateValue(initialValue);
    
    this.lightBind.createWatcher(component, expression, updateValue);
    
    element.__lb_two_way_binding = true;
    this.log('dom', `Two-way binding established for "${expression}"`);
    
    return { success: true };
  }
  
  getInputValue(element) {
    if (element.type === 'checkbox') {
      return element.checked;
    } else if (element.type === 'number' || element.type === 'range') {
      return Number(element.value);
    } else {
      return element.value;
    }
  }
  
  setInputValue(element, value) {
    if (element.type === 'checkbox') {
      element.checked = !!value;
    } else if (value !== undefined && value !== null) {
      // Verhindern von Cursor-Sprüngen bei Textfeldern
      if (document.activeElement !== element) {
        element.value = value;
      } else if (element.value !== String(value)) {
        element.value = value;
      }
    } else {
      element.value = '';
    }
  }
}

export { BindDirective };
