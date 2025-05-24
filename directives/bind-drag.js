import { BaseDirective } from './base-directive.js';
 
class BindDragDirective extends BaseDirective {
  process(element, expression, component) {
    this.lightBind.log('debug', `Setting up bind-drag: ${expression}`);

    console.warn(element.hasAttribute('draggable'));
    
    // Ensure the element is draggable
    if (!element.hasAttribute('draggable')) {
      console.warn('Element is not draggable. Setting draggable attribute to true.');
      element.setAttribute('draggable', 'true');
    }
    
    // Extract optional parameter attributes
    let indexExpr = element.getAttribute('index');
    let nameExpr = element.getAttribute('name');
    
    const dragStartHandler = (event) => {
      event.dataTransfer.clearData('text');
      event.dataTransfer.effectAllowed = 'move';
      
      // Prepare data object
      const data = {};
      
      // Get main data
      if (expression) {
        if (typeof component.scope[expression] === 'function') {
          data.data = component.scope[expression]();
        } else {
          data.data = this.lightBind.evaluateExpression(expression, component.scope);
        }
      }
      
      // Add optional parameters
      if (indexExpr) {
        data.index = this.lightBind.evaluateExpression(indexExpr, component.scope);
      }
      
      if (nameExpr) {
        data.name = this.lightBind.evaluateExpression(nameExpr, component.scope);
      }
      
      // Set data on event
      event.dataTransfer.setData('text', JSON.stringify(data));
      element.classList.add('dragging');
    };
    
    const dragEndHandler = () => {
      element.classList.remove('dragging');
    };
    
    // Attach event listeners
    element.addEventListener('dragstart', dragStartHandler);
    element.addEventListener('dragend', dragEndHandler);
    
    return { success: true };
  }
}

export { BindDragDirective };
