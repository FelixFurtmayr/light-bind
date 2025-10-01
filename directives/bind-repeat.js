import { BaseDirective } from './base-directive.js';

class BindRepeatDirective extends BaseDirective {
  // Add proxy for array mutation methods that will trigger refresh
  proxyArrayMethods(array, component, arrayName) {
    if (!array || !Array.isArray(array) || array.__methodsProxied) return array;
    
    const mutationMethods = ['splice', 'push', 'pop', 'shift', 'unshift', 'sort', 'reverse'];
    
    mutationMethods.forEach(method => {
      const originalMethod = array[method];
      if (typeof originalMethod === 'function') {
        array[method] = function(...args) {
          const result = originalMethod.apply(this, args);
          
          // Trigger a refresh after mutation
          if (component && component.scope && typeof component.scope.$refresh === 'function') {
            setTimeout(() => component.scope.$refresh(), 0);
          }
          
          return result;
        };
      }
    });
    
    array.__methodsProxied = true;
    this.log('debug', `Proxied mutation methods for array ${arrayName}`);
    
    return array;
  }

  // Helper to manually create a component with minimal overhead
  createRepeatItemComponent(element, scope, parentComponent, index, repeatId) {
    const self = this;
    this.log('debug', `Creating repeat item component for index ${index}`);
    
    const component = {
      element,
      scope,
      bindings: [],
      watcherRegistry: {},
      childComponents: [],
      parent: parentComponent,
      nodeBindings: new WeakMap(),
      isRepeatItem: true,
      repeatIndex: index,
      repeatId: repeatId,
      elements: [element],
      
      updateProperty: function(element, property, value) {
        if (!this.nodeBindings.has(element)) {
          this.nodeBindings.set(element, {});
        }
        
        const bindings = this.nodeBindings.get(element);
        
        if (!bindings.managedProps) bindings.managedProps = {};
        bindings.managedProps[property] = value;
        
        // Update the DOM directly based on property type
        if (property === 'class') {
          element.className = value;
        } else if (property === 'style' && typeof value === 'object') {
          Object.entries(value).forEach(([prop, val]) => {
            element.style[prop] = val;
          });
        } else if (property === 'value') {
          if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.value = value;
          } else if (element.tagName === 'SELECT') {
            element.value = value;
          }
        } else if (property === 'checked' && element.tagName === 'INPUT') {
          element.checked = !!value;
        } else {
          element.setAttribute(property, value);
        }
        
        return this;
      },
      
      destroy: function() {
        if (this.parent && this.parent.childComponents) {
          const index = this.parent.childComponents.indexOf(this);
          if (index !== -1) {
            this.parent.childComponents.splice(index, 1);
          }
        }
        
        self.lightBind.components.delete(this.element);
        self.lightBind.elementToComponent.delete(this.element);
        
        if (self.lightBind.virtualDOM) {
          self.lightBind.virtualDOM.cleanupComponent(this);
        }
        
        this.watcherRegistry = {};
        this.nodeBindings = new WeakMap();
      }
    };
    
    return component;
  }

  process(element, expression, component) {
    this.log('debug', `Starting bind-repeat for: ${expression}`);
    
    const matchArray = expression.match(/^\s*(?:(\w+),\s*(\w+)\s+in\s+|\s*(\w+)\s+in\s+)(.+?)(?:\s+track\s+by\s+(.+))?$/);
    const matchObject = expression.match(/^\s*\((\w+),\s*(\w+)\)\s+in\s+(.+?)(?:\s+track\s+by\s+(.+))?$/);
    
    if (!matchArray && !matchObject) {
      this.log('error', `Invalid bind-repeat syntax: ${expression}`);
      return { success: false, skipChildren: false };
    }
    
    let itemName, indexName, itemsExpr, trackByExpr, isObjectIteration;
    
    if (matchArray) {
      itemName = matchArray[1] || matchArray[3];
      indexName = matchArray[2] || '$index';
      itemsExpr = matchArray[4];
      trackByExpr = matchArray[5];
      isObjectIteration = false;
    } else {
      indexName = matchObject[1];
      itemName = matchObject[2];
      itemsExpr = matchObject[3];
      trackByExpr = matchObject[4];
      isObjectIteration = true;
    }
    
    this.log('debug', `Parsing: itemName=${itemName}, indexName=${indexName}, itemsExpr=${itemsExpr}, trackBy=${trackByExpr}`);
    
    // Proxy array methods at initialization
    const arrayName = itemsExpr.trim();
    const originalArray = component.scope[arrayName];
    
    if (Array.isArray(originalArray)) {
      this.proxyArrayMethods(originalArray, component, arrayName);
    }
    
    const parent = element.parentNode;
    const template = element.cloneNode(true);
    template.removeAttribute('bind-repeat');
    
    const filterExpr = element.getAttribute('filter');
    const sortExpr = element.getAttribute('sort');
    
    if (filterExpr) template.removeAttribute('filter');
    if (sortExpr) template.removeAttribute('sort');
    
    // Store repeat info
    const repeatId = `repeat_${Date.now()}_${Math.random()}`;
    const repeatState = {
      parent,
      template,
      instances: [], // Simple array of instances by index
      element: element,
      repeatId,
      itemName,
      indexName,
      isObjectIteration
    };
    
    // Remove original element
    parent.removeChild(element);
    
    // Store reference on component for cleanup
    if (!component._repeatStates) component._repeatStates = [];
    component._repeatStates.push(repeatState);
    
    const watcher = this.lightBind.createWatcher(component, itemsExpr, (newItems) => {
      this.log('debug', `Watcher triggered for ${itemsExpr}: ${newItems ? (Array.isArray(newItems) ? newItems.length : 'not array') : 'undefined'} items`);
      
      // Handle undefined or null values
      if (newItems === undefined || newItems === null) {
        this.log('debug', `Warning: Expression "${itemsExpr}" returned ${newItems === undefined ? 'undefined' : 'null'}. Using empty array instead.`);
        newItems = [];
      }
      
      let items;
      
      // Convert object to array if needed
      if (isObjectIteration && typeof newItems === 'object' && !Array.isArray(newItems)) {
        items = [];
        for (const key in newItems) {
          if (newItems.hasOwnProperty(key) && !key.startsWith('$')) {
            items.push({
              __key: key,
              __value: newItems[key],
              __isObjectEntry: true
            });
          }
        }
      } else {
        // Ensure it's an array
        if (!Array.isArray(newItems)) {
          this.log('debug', `Warning: Expression "${itemsExpr}" must return an array, got ${typeof newItems}. Converting to array.`);
          items = Array.isArray(newItems) ? newItems : (newItems ? [newItems] : []);
        } else {
          items = newItems;
        }
        
        // Ensure new array also has proxy methods
        this.proxyArrayMethods(items, component, arrayName);
      }
      
      // Apply filters and sorting
      if (filterExpr) {
        items = this.applyFilter(items, filterExpr, component, isObjectIteration);
      }
      
      if (sortExpr) {
        items = this.applySort(items, sortExpr, component, isObjectIteration);
      }
      
      // Perform efficient DOM update using index tracking
      this.updateDOM(repeatState, items, component, itemName, indexName, isObjectIteration, arrayName);
      
      // Trigger a digest to ensure changes propagate
      if (this.lightBind.digest && typeof this.lightBind.digest === 'function') {
        setTimeout(() => this.lightBind.digest(component), 0);
      }
      
      return {
        success: true,
        skipChildren: true
      };
    });
    
    return { success: true, skipChildren: true };
  }
  
  updateDOM(repeatState, items, component, itemName, indexName, isObjectIteration, arrayName) {
    const { parent, template, instances } = repeatState;
    const newLength = items.length;
    const oldLength = instances.length;
    
    // Update existing instances
    const minLength = Math.min(newLength, oldLength);
    for (let i = 0; i < minLength; i++) {
      const instance = instances[i];
      const item = items[i];
      
      // Update scope
      this.updateItemScope(instance.component.scope, item, i, itemName, indexName, isObjectIteration, items.length);
    }
    
    // Remove extra instances
    if (oldLength > newLength) {
      for (let i = oldLength - 1; i >= newLength; i--) {
        const instance = instances[i];
        if (instance.component && instance.component.destroy) {
          instance.component.destroy();
        }
        if (instance.element && instance.element.parentNode) {
          instance.element.parentNode.removeChild(instance.element);
        }
        instances.pop();
      }
    }
    
    // Add new instances
    if (newLength > oldLength) {
      const fragment = document.createDocumentFragment();
      
      for (let i = oldLength; i < newLength; i++) {
        const item = items[i];
        const itemScope = this.createItemScope(component, item, i, itemName, indexName, isObjectIteration, arrayName, items.length);
        
        // Clone template
        const clone = template.cloneNode(true);
        
        // Create component
        const itemComponent = this.createRepeatItemComponent(clone, itemScope, component, i, repeatState.repeatId);
        
        // Set up component references
        this.lightBind.components.set(clone, itemComponent);
        this.lightBind.elementToComponent.set(clone, itemComponent);
        component.childComponents.push(itemComponent);
        
        // Process bindings
        this.lightBind.processElementAndChildren(clone, itemComponent);
        
        // Process text nodes
        if (this.lightBind.virtualDOM) {
          this.lightBind.virtualDOM.processTextNodes(clone, itemComponent, itemScope);
        }
        
        // Store instance
        instances.push({
          element: clone,
          component: itemComponent
        });
        
        // Add to fragment
        fragment.appendChild(clone);
      }
      
      // Insert all new elements at once
      parent.appendChild(fragment);
    }
  }
  
  createItemScope(component, item, index, itemName, indexName, isObjectIteration, arrayName, totalLength) {
    const itemScope = Object.create(component.scope);
    
    if (isObjectIteration && item.__isObjectEntry) {
      itemScope[indexName] = item.__key;
      itemScope[itemName] = item.__value;
      itemScope.$index = index;
    } else {
      itemScope[itemName] = item;
      itemScope[indexName] = index;
      itemScope.$index = index;
    }
    
    // Add position helpers
    itemScope.$first = index === 0;
    itemScope.$last = index === totalLength - 1;
    itemScope.$middle = !itemScope.$first && !itemScope.$last;
    itemScope.$even = index % 2 === 0;
    itemScope.$odd = !itemScope.$even;
    
    this.log('debug', `Created scope for item ${index}, $index=${itemScope.$index}, ${indexName}=${itemScope[indexName]}`);
    
    // Define parent relationship
    Object.defineProperties(itemScope, {
      $parentComponent: {
        value: component,
        enumerable: false,
        configurable: true
      },
      $parent: {
        value: component.scope,
        enumerable: false,
        configurable: true
      },
      $sourceArray: {
        value: arrayName,
        enumerable: true,
        configurable: true
      }
    });
    
    return itemScope;
  }
  
  updateItemScope(scope, item, index, itemName, indexName, isObjectIteration, totalLength) {
    if (isObjectIteration && item.__isObjectEntry) {
      scope[indexName] = item.__key;
      scope[itemName] = item.__value;
      scope.$index = index;
    } else {
      scope[itemName] = item;
      scope[indexName] = index;
      scope.$index = index;
    }
    
    // Update position helpers
    scope.$first = index === 0;
    scope.$last = index === totalLength - 1;
    scope.$middle = !scope.$first && !scope.$last;
    scope.$even = index % 2 === 0;
    scope.$odd = !scope.$even;
  }
  
  applyFilter(entries, filterExpr, component, isObjectIteration) {
    if (typeof component.scope[filterExpr] === 'function') {
      return entries.filter(item => {
        try {
          if (isObjectIteration && item.__isObjectEntry) {
            return !!component.scope[filterExpr](item.__value, item.__key);
          } else {
            return !!component.scope[filterExpr](item);
          }
        } catch (error) {
          this.log('error', `Error executing filter function: ${error.message}`);
          return true;
        }
      });
    } else {
      return entries.filter(item => {
        try {
          const tempScope = { ...component.scope };
          
          if (isObjectIteration && item.__isObjectEntry) {
            tempScope.key = item.__key;
            tempScope.value = item.__value;
            tempScope.item = item.__value;
          } else {
            tempScope.item = item;
          }
          
          return !!this.lightBind.evaluateExpression(filterExpr, tempScope);
        } catch (error) {
          this.log('error', `Error evaluating filter expression: ${error.message}`);
          return true;
        }
      });
    }
  }
  
  applySort(entries, sortExpr, component, isObjectIteration) {
    const itemsToSort = [...entries];
    
    if (typeof component.scope[sortExpr] === 'function') {
      return itemsToSort.sort((a, b) => {
        try {
          if (isObjectIteration) {
            return component.scope[sortExpr](a.__value, b.__value, a.__key, b.__key);
          } else {
            return component.scope[sortExpr](a, b);
          }
        } catch (error) {
          this.log('error', `Error executing sort function: ${error.message}`);
          return 0;
        }
      });
    }
    
    if (typeof component.scope[sortExpr] === 'object' && component.scope[sortExpr] !== null) {
      return itemsToSort.sort((a, b) => {
        return this.compareByCriteria(
          isObjectIteration ? a.__value : a,
          isObjectIteration ? b.__value : b,
          component.scope[sortExpr]
        );
      });
    }
    
    const sortCriteria = this.parseSortCriteria(sortExpr);
    
    if (Object.keys(sortCriteria).length > 0) {
      return itemsToSort.sort((a, b) => {
        return this.compareByCriteria(
          isObjectIteration ? a.__value : a,
          isObjectIteration ? b.__value : b,
          sortCriteria
        );
      });
    }
    
    return itemsToSort;
  }
  
  compareByCriteria(a, b, criteria) {
    const sortedCriteria = Object.entries(criteria)
      .sort((x, y) => Math.abs(x[1]) - Math.abs(y[1]));
    
    for (const [key, value] of sortedCriteria) {
      const aValue = this.lightBind.getNestedProperty(a, key);
      const bValue = this.lightBind.getNestedProperty(b, key);
      
      if (aValue !== bValue) {
        return value < 0 ? 
          this.compareValues(bValue, aValue) : 
          this.compareValues(aValue, bValue);
      }
    }
    
    return 0;
  }
  
  compareValues(a, b) {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  
  parseSortCriteria(criteriaString) {
    const result = {};
    
    try {
      const parts = criteriaString.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
      
      for (const part of parts) {
        const [key, value] = part.split(':').map(s => s.trim());
        
        if (key && value) {
          const numValue = parseInt(value, 10);
          if (!isNaN(numValue)) {
            result[key] = numValue;
          }
        }
      }
    } catch (error) {
      this.log('error', `Error parsing sort criteria: ${error.message}`);
    }
    
    return result;
  }
}

export { BindRepeatDirective };
