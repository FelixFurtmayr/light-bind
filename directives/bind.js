import { setValue } from '../core/core_inputs.js';
import { BaseDirective } from './base-directive.js';

class BindDirective extends BaseDirective {
  process(element, expression, component) {
    const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT';

    let self = this;

    function log(){
      self.log.apply(self, arguments);
    }

    if (!isInput) {
      log('warn', `Two-way binding can only be applied to input elements: ${element.tagName}`);
      return { success: false };
    }

    log('dom', `Setting up two-way binding for ${element.tagName} with "${expression}"`);

    function updateValue(newValue) {
      try {
        log('debug', 'updateValue called:', expression, 'value:', newValue);
        setValue(element, newValue);
        log('debug', 'after setValue, element.value:', element.value);
      } catch (error) {
        log('debug', `Error updating input:`, error);
      }
    }

    const initialValue = this.lightBind.getNestedProperty(component.scope, expression);
    log('component.scope', component.scope);
    log('BIND:', expression, '-> initialValue:', initialValue, '| element:', element.tagName, element.id);
    updateValue(initialValue);

    this.lightBind.createWatcher(component, expression, updateValue);

    element.__lb_two_way_binding = true;
    log('dom', `Two-way binding established for "${expression}"`);

    return { success: true };
  }
}

export { BindDirective };
