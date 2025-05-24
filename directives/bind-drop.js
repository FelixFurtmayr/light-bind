import { BaseDirective } from './base-directive.js';

class BindDropDirective extends BaseDirective {
    process(element, expression, component) {
      this.lightBind.log('debug', `Setting up bind-drop: ${expression}`);
      
      // Extract optional drop-data attribute
      const dropDataExpr = element.getAttribute('drop-data');
      
      const dropHandler = (event) => {
        event.preventDefault();
        
        // Get the transferred data
        const data = JSON.parse(event.dataTransfer.getData('text'));
        
        // Add drop-data if specified
        if (dropDataExpr) {
          data.dropData = this.lightBind.evaluateExpression(dropDataExpr, component.scope);
        }
        
        // Call the drop handler
        if (data && expression && component.scope[expression]) {
          component.scope[expression](data);
          this.lightBind.digest(component);
        }
        
        element.classList.remove('dragover');
      };
      
      const dragOverHandler = (event) => {
        event.preventDefault();
        element.classList.add('dragover');
      };
      
      const dragLeaveHandler = () => {
        element.classList.remove('dragover');
      };
      
      // Attach event listeners
      element.addEventListener('drop', dropHandler);
      element.addEventListener('dragover', dragOverHandler);
      element.addEventListener('dragleave', dragLeaveHandler);
      
      return { success: true };
    }
}

export { BindDropDirective };
