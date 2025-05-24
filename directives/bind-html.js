import { BaseDirective } from './base-directive.js';

/**
 * Directive for binding HTML content to an element
 */
class BindHtmlDirective extends BaseDirective {
  process(element, expression, component) {
    this.log('dom', `Setting up HTML binding for element with "${expression}"`);
    
    // Create a watcher to update the HTML content when the variable changes
    this.lightBind.createWatcher(component, expression, (newValue) => {
      try {
        // Set the innerHTML of the element with the value from the expression
        if (newValue !== undefined && newValue !== null) {
          element.innerHTML = newValue;
        } else {
          element.innerHTML = '';
        }
        this.log('dom', `Updated HTML content for "${expression}" with:`, newValue);
      } catch (error) {
        this.log('error', `Error updating HTML content with ${expression}:`, error);
      }
    });
    
    // Store binding information in the component's nodeBindings
    if (!component.nodeBindings.has(element)) {
      component.nodeBindings.set(element, {});
    }
    
    const nodeBindings = component.nodeBindings.get(element);
    nodeBindings.htmlBinding = { expression };
    
    this.log('dom', `HTML binding established for "${expression}"`);
    
    return { success: true };
  }
}

export { BindHtmlDirective };
