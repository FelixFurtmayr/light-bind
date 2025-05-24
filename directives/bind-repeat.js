import { BaseDirective } from './base-directive.js';

class BindRepeatDirective extends BaseDirective {
  // Add proxy for array mutation methods that will trigger refresh
  proxyArrayMethods(array, component, arrayName) {
    if (!array || !Array.isArray(array) || array.__methodsProxied) return array;
    
    // Array methods that modify the array structure
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

  // Helper to manually create a component 
  createManualComponent(element, scope, parentComponent, index, arrayName) {
    this.log('debug', `Creating manual component for index ${index}`);
    
    return {
      element,
      scope,
      bindings: [],
      watchers: [],
      childComponents: [],
      parent: parentComponent,
      textBindings: new Map(),
      nodeBindings: new WeakMap(),
      isRepeatItem: true,
      repeatIndex: index,
      repeatArray: arrayName,
      elements: [element],
      
      updateProperty: function(element, property, value) {
        // Initialize nodeBindings for this element if needed
        if (!this.nodeBindings.has(element)) {
          this.nodeBindings.set(element, {});
        }
        
        const bindings = this.nodeBindings.get(element);
        
        // Track managed properties
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
            // Update selectedIndex if needed
            for (let i = 0; i < element.options.length; i++) {
              if (element.options[i].value === value) {
                element.selectedIndex = i;
                break;
              }
            }
          }
        } else if (property === 'checked' && element.tagName === 'INPUT') {
          element.checked = !!value;
        } else {
          // Default - set as attribute
          element.setAttribute(property, value);
        }
        
        return this; // For chaining
      }
    };
  }

  process(element, expression, component) {
    this.log('debug', `Starting bind-repeat for: ${expression}`);
    
    const matchArray = expression.match(/^\s*(?:(\w+),\s*(\w+)\s+in\s+|\s*(\w+)\s+in\s+)(.+)$/);
    const matchObject = expression.match(/^\s*\((\w+),\s*(\w+)\)\s+in\s+(.+)$/);
    
    if (!matchArray && !matchObject) {
      this.log('error', `Invalid bind-repeat syntax: ${expression}`);
      return { success: false, skipChildren: false };
    }
    
    let itemName, indexName, itemsExpr, isObjectIteration;
    
    if (matchArray) {
      itemName = matchArray[1] || matchArray[3];
      indexName = matchArray[2] || '$index';
      itemsExpr = matchArray[4];
      isObjectIteration = false;
    } else {
      indexName = matchObject[1];
      itemName = matchObject[2];
      itemsExpr = matchObject[3];
      isObjectIteration = true;
    }
    
    this.log('debug', `Parsing: itemName=${itemName}, indexName=${indexName}, itemsExpr=${itemsExpr}`);
    
    // Proxy array methods at initialization
    const arrayName = itemsExpr.trim();
    const originalArray = component.scope[arrayName];
    
    if (Array.isArray(originalArray)) {
      this.proxyArrayMethods(originalArray, component, arrayName);
    }
    
    const parent = element.parentNode;
    const comment = document.createComment(`bind-repeat: ${expression}`);
    
    const template = element.cloneNode(true);
    template.removeAttribute('bind-repeat');
    
    const filterExpr = element.getAttribute('filter');
    const sortExpr = element.getAttribute('sort');
    
    if (filterExpr) template.removeAttribute('filter');
    if (sortExpr) template.removeAttribute('sort');
    
    parent.insertBefore(comment, element);
    parent.removeChild(element);
    
    const instances = [];
    const markers = { 
      start: comment, 
      template: template,
      instances,
      lastItems: null,
      lastItemsKeys: null
    };
    
    this.lightBind.repeatMarkers.set(comment, markers);
    
    const watcher = this.lightBind.createWatcher(component, itemsExpr, (newItems) => {
      this.log('debug', `Watcher triggered for ${itemsExpr}: ${newItems ? (Array.isArray(newItems) ? newItems.length : 'not array') : 'undefined'} items`);
      
      // Better handling of undefined or null values
      if (newItems === undefined || newItems === null) {
        this.log('debug', `Warning: Expression "${itemsExpr}" returned ${newItems === undefined ? 'undefined' : 'null'}. Using empty array instead.`);
        // Use an empty array instead of throwing an error
        newItems = [];
        // Don't need to clean up instances immediately, as they might be populated later
        // Just update the state
        markers.lastItems = [];
        markers.lastItemsKeys = '';
      }
      
      if (isObjectIteration) {
        if (typeof newItems !== 'object' || newItems === null) {
          this.log('debug', `Warning: Expression "${itemsExpr}" must return an object for object iteration, got ${typeof newItems}. Using empty object.`);
          newItems = {};
        }
      } else {
        if (!Array.isArray(newItems)) {
          this.log('debug', `Warning: Expression "${itemsExpr}" must return an array, got ${typeof newItems}. Converting to array.`);
          // Try to convert to array if possible or use empty array
          newItems = Array.isArray(newItems) ? newItems : 
                    (newItems ? [newItems] : []);
        }
        
        // Ensure new array also has proxy methods
        this.proxyArrayMethods(newItems, component, arrayName);
      }
      
      if (isObjectIteration) {
        if (typeof newItems !== 'object' || newItems === null) {
          this.log('error', `Error: Expression "${itemsExpr}" must return an object, not ${typeof newItems}`);
          this.cleanupInstances(instances);
          instances.length = 0;
          return { success: false, error: 'invalid_data_type' };
        }
      } else {
        if (!Array.isArray(newItems)) {
          this.log('error', `Error: Expression "${itemsExpr}" must return an array, not ${typeof newItems}`);
          this.cleanupInstances(instances);
          instances.length = 0;
          return { success: false, error: 'invalid_data_type' };
        }
        
        // Ensure new array also has proxy methods
        this.proxyArrayMethods(newItems, component, arrayName);
      }
      
      let entries = [];
      
      if (isObjectIteration) {
        entries = Object.keys(newItems)
          .filter(key => !key.startsWith('$'))
          .map((key, index) => ({
            __key: key,
            __value: newItems[key],
            __index: index,
            __isObjectEntry: true
          }));
      } else {
        entries = Array.isArray(newItems) ? [...newItems] : [];
        // Log the array data for debugging
        this.log('debug', `Array data: ${JSON.stringify(entries).substring(0, 100)}...`);
      }
      
      if (filterExpr) {
        entries = this.applyFilter(entries, filterExpr, component, isObjectIteration);
      }
      
      if (sortExpr) {
        entries = this.applySort(entries, sortExpr, component, isObjectIteration);
      }
      
      const didEntriesChange = this.didEntriesChange(entries, markers.lastItems, markers.lastItemsKeys, isObjectIteration);
      
      if (!didEntriesChange) {
        return { success: true, unchanged: true };
      }
      
      markers.lastItems = [...entries];
      markers.lastItemsKeys = this.generateEntriesKey(entries, isObjectIteration);
      
      if (entries.length === 0) {
        this.cleanupInstances(instances);
        return { success: true, isEmpty: true };
      }
      
      const parentFunctions = {};
      for (const key in component.scope) {
        if (typeof component.scope[key] === 'function') {
          parentFunctions[key] = component.scope[key];
        }
      }
      
      const newInstances = [];
      const scopes = [];
      const items = [];
      
      // Use document fragment for better performance
      const fragment = document.createDocumentFragment();
      
      // Calculate if we should rebuild or update existing instances
      const shouldRebuild = instances.length === 0 || 
                        Math.abs(entries.length - instances.length) > entries.length * 0.3;
      
      if (shouldRebuild) {
        this.cleanupInstances(instances);
        instances.length = 0;
      }
      
      let previousElement = null;
      
      entries.forEach((item, index) => {
        let itemComponent, itemScope, clone;
        
        if (!shouldRebuild && index < instances.length) {
          itemComponent = instances[index];
          itemScope = itemComponent.scope;
          clone = itemComponent.elements[0];
          
          if (isObjectIteration && item.__isObjectEntry) {
            itemScope[indexName] = item.__key;
            itemScope[itemName] = item.__value;
            itemScope.$index = item.__index;
          } else {
            itemScope[itemName] = item;
            itemScope[indexName] = index;
            itemScope.$index = index;
            itemScope.$first = index === 0;
            itemScope.$last = index === entries.length - 1;
          }
          
          this.log('debug', `Updated scope for item ${index}, $index=${itemScope.$index}, ${indexName}=${itemScope[indexName]}`);
          
          newInstances.push(itemComponent);
          scopes.push(itemScope);
          items.push(clone);
          
          if (shouldRebuild) {
            fragment.appendChild(clone);
          } else if (previousElement && clone.previousSibling !== previousElement) {
            parent.insertBefore(clone, previousElement.nextSibling);
          }
          
          previousElement = clone;
          return;
        }
        
        // Create new instance
        itemScope = Object.create(component.scope);
        
        if (isObjectIteration && item.__isObjectEntry) {
          itemScope[indexName] = item.__key;
          itemScope[itemName] = item.__value;
          itemScope.$index = item.__index;
        } else {
          itemScope[itemName] = item;
          itemScope[indexName] = index;
          itemScope.$index = index;
          itemScope.$first = index === 0;
          itemScope.$last = index === entries.length - 1;
        }
        
        this.log('debug', `Created new scope for item ${index}, $index=${itemScope.$index}, ${indexName}=${itemScope[indexName]}`);

        // For direct reference to bound variables
        Object.defineProperty(itemScope, '__getBoundVars', {
          value: function() { 
            return {
              $index: this.$index,
              [indexName]: this[indexName],
              [itemName]: this[itemName]
            };
          },
          enumerable: false,
          configurable: true
        });
        
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
        
        // Copy parent functions
        for (const funcName in parentFunctions) {
          itemScope[funcName] = parentFunctions[funcName];
        }
        
        // Create clone of template
        clone = template.cloneNode(true);
        
        // Handle auto-text for empty cells
        const currentText = clone.textContent.trim();
        
        if (currentText === '' || (currentText.includes(':') && !clone.textContent.includes('{{'))) {
          if (itemName === 'col' && itemsExpr === 'columns') {
            clone.textContent = `{{${itemName}.name}}`;
            this.log('debug', `Added {{${itemName}.name}} to header`);
          } else if (isObjectIteration) {
            clone.textContent = `{{${itemName}}}`;
            this.log('debug', `Added {{${itemName}}} to cell`);
          }
        }
              
        const instance = {
          scope: itemScope,
          elements: [clone],
          parentComponent: component
        };
        
        newInstances.push(instance);
        scopes.push(itemScope);
        
        if (shouldRebuild) {
          fragment.appendChild(clone);
        } else {
          parent.insertBefore(clone, previousElement ? previousElement.nextSibling : comment.nextSibling);
        }
        previousElement = clone;
        
        // Create the component - for now using our manual method which is known to work
        itemComponent = this.createManualComponent(clone, itemScope, component, index, arrayName);
        
        // Set up element reference in the scope
        Object.defineProperty(itemScope, '$elem', {
          value: clone,
          enumerable: false,
          configurable: true
        });
        
        this.lightBind.components.set(clone, itemComponent);
        this.lightBind.elementToComponent.set(clone, itemComponent);
        
        // Create a virtual DOM node for this element
        if (this.lightBind.virtualDOM) {
          this.lightBind.virtualDOM.createFromDOM(clone, itemComponent);
        }
        
        this.lightBind.processElementAndChildren(clone, itemComponent);

        if (this.lightBind.directives['bind-text']) {
          this.lightBind.directives['bind-text'].process(clone, '', itemComponent);
        }
        
        component.watchers.push(...itemComponent.watchers);
        
        items.push(clone);
        
        if (!component.__allItemScopes) component.__allItemScopes = [];
        component.__allItemScopes.push(itemScope);
      });
      
      // If using a document fragment, append it all at once
      if (shouldRebuild && fragment.childNodes.length > 0) {
        // Insert after the comment marker
        if (comment.nextSibling) {
          parent.insertBefore(fragment, comment.nextSibling);
        } else {
          parent.appendChild(fragment);
        }
      }
      
      // Clean up any extra instances
      if (newInstances.length < instances.length) {
        for (let i = newInstances.length; i < instances.length; i++) {
          if (instances[i]) {
            const elementsToRemove = instances[i].elements || [];
            elementsToRemove.forEach(el => {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el);
              }
            });
          }
        }
      }
      
      instances.length = 0;
      instances.push(...newInstances);
      
      if (!component.__repeatScopes) {
        component.__repeatScopes = [];
      }
      
      const oldScopes = component.__repeatScopes;
      component.__repeatScopes = component.__repeatScopes.filter(s => 
        !oldScopes.includes(s) || scopes.includes(s));
      component.__repeatScopes.push(...scopes.filter(s => !component.__repeatScopes.includes(s)));
      
      this.log('debug', `Finished repeat update for ${itemsExpr}, created ${entries.length} items`);
      
      // Trigger a digest to ensure changes propagate
      if (this.lightBind.digest && typeof this.lightBind.digest === 'function') {
        setTimeout(() => this.lightBind.digest(component), 0);
      }
      
      return {
        success: true,
        skipChildren: true,
        scopes: scopes,
        items: items
      };
    });
    
    return { success: true, skipChildren: true };
  }
    
  generateEntriesKey(entries, isObjectIteration) {
    if (isObjectIteration) {
      return entries.map(item => `${item.__key}:${JSON.stringify(item.__value)}`).join('|');
    } else {
      try {
        return JSON.stringify(entries);
      } catch (e) {
        return entries.length.toString();
      }
    }
  }
  
  didEntriesChange(newEntries, lastEntries, lastEntriesKey, isObjectIteration) {
    if (!lastEntries || !lastEntriesKey) return true;
    if (newEntries.length !== lastEntries.length) return true;
    const newKey = this.generateEntriesKey(newEntries, isObjectIteration);
    return newKey !== lastEntriesKey;
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
          
          return !!this.lightBind.evaluateWithScope(filterExpr, tempScope, { safeMode: true });
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
  
  cleanupInstances(instances) {
    instances.forEach(instance => {
      if (instance.elements) {
        instance.elements.forEach(el => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      }
    });
  }
}

export { BindRepeatDirective };
