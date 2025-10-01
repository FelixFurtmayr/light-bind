import { BaseDirective } from './base-directive.js';

class BindIfDirective extends BaseDirective {
  process(element, expression, component) {
    const parent = element.parentNode;
    const comment = document.createComment(`bind-if: ${expression}`);
    
    const template = element.cloneNode(true);
    template.removeAttribute('bind-if');

    parent.insertBefore(comment, element);
    parent.removeChild(element);
    
    const state = {
      isVisible: false,
      instance: null
    };

    this.lightBind.createWatcher(component, expression, (value) => {
      const shouldShow = !!value;
      
      if (state.isVisible !== shouldShow) {
        this.log('debug', `bind-if visibility changed to ${shouldShow}`);
        
        if (shouldShow) {
          // Show the element
          const clone = template.cloneNode(true);
          parent.insertBefore(clone, comment.nextSibling);
          state.instance = clone;
          
          this.log('debug', 'Processing newly shown bind-if content');
          this.lightBind.processElementAndChildren(clone, component);
          
          // Process text nodes in the newly visible element
          this.log('debug', 'Processing text bindings in conditionally visible element');
          this.lightBind.virtualDOM.processTextNodes(clone, component);
          
          // Run a digest to update all bindings
          queueMicrotask(() => {
            this.lightBind.digest(component);
          });
        }else {
          // Hide the element
          if (state.instance && state.instance.parentNode) {
            parent.removeChild(state.instance);
            state.instance = null;
          }
        }
        
        state.isVisible = shouldShow;
      } else if (shouldShow && state.instance) {
        // Element is already visible but the condition was re-evaluated
        // Schedule a digest to update all bindings
        queueMicrotask(() => {
          this.lightBind.digest(component);
        });
      }
    });
    
    return {
      success: true,
      skipChildren: true
    };
  }
}

export { BindIfDirective };
