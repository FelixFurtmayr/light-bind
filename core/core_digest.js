export function createDigestHandler(lightBind) {
  const log = (category, ...args) => lightBind.log(category, ...args);

  // Helper function to extract property paths from expressions
  function extractPropertyPaths(expression) {
    const paths = new Set();
    
    // Match property access patterns like 'user.name' or 'items[0].value'
    const regex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g;
    const matches = expression.match(regex) || [];
    
    matches.forEach(match => {
      const parts = match.split('.');
      let currentPath = '';
      
      parts.forEach(part => {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        paths.add(currentPath);
      });
    });
    
    return Array.from(paths);
  }

  return {
    digest,
    updateComponent,
    runWatchers,
    createWatcher,
    renderComponent,
    destroyComponent,
    updateComponentTree,
    extractPropertyPaths
  };

  // Determine if component inputs have changed for onPush strategy
  function hasInputsChanged(component) {
    // Skip checking if component doesn't use onPush strategy
    if (component.strategy !== 'onPush') {
      return true;
    }
    
    // First time this component is being checked
    if (!component.previousInputs) {
      // Initialize the previous inputs store
      component.previousInputs = captureCurrentInputs(component);
      return true;
    }
    
    // Capture current state of inputs
    const currentInputs = captureCurrentInputs(component);
    
    // Compare with previous state
    const hasChanged = !lightBind.isEqual(currentInputs, component.previousInputs);
    
    // Update previous inputs for next check
    if (hasChanged) component.previousInputs = currentInputs;
    
    return hasChanged;
  }
  
  // Capture current state of component inputs for onPush
  function captureCurrentInputs(component) {
    const inputs = {};
    
    // 1. Check explicitly marked @Input properties if component uses them
    if (component.inputProperties) {
      component.inputProperties.forEach(propName => {
        inputs[propName] = lightBind.deepClone(component.scope[propName]);
      });
    }
    
    // 2. Check parent properties referenced in this component
    const vNode = lightBind.virtualDOM.componentMap.get(component);
    if (vNode) {
      const references = lightBind.virtualDOM.getScopeReferences(vNode);
      references.forEach(propName => {
        inputs[propName] = lightBind.deepClone(
          lightBind.getNestedProperty(component.scope, propName)
        );
      });
    }
    
    return inputs;
  }

  // Run all watchers for a component
  function runWatchers(component) {
    let watchersRun = 0;
    let changesDetected = 0;
    
    if (!component.watcherRegistry) return { watchersRun, changesDetected };
    
    const executed = new Set(); // Avoid running same watcher twice
    
    Object.values(component.watcherRegistry).forEach(callbacks => {
      callbacks.forEach(watcher => {
        if (!executed.has(watcher)) {
          executed.add(watcher);
          try {
            watchersRun++;
            const changed = watcher();
            if (changed) changesDetected++;
          } catch (error) {
            log('error', `Error in watcher:`, error);
          }
        }
      });
    });
    
    log('debug', `Ran ${watchersRun} watchers for component, ${changesDetected} changes detected`);
    
    return { watchersRun, changesDetected };
  }

  // Update a single component
  function updateComponent(component) {
    // Skip update if using onPush strategy and inputs haven't changed
    if (component.strategy === 'onPush' && !hasInputsChanged(component)) {
      return { watchersRun: 0, changesDetected: 0 };
    }
    
    // Run watchers to detect changes
    return runWatchers(component);
  }

  // Update a component and all its children
  function updateComponentTree(component) {
    const results = updateComponent(component);
    
    component.childComponents.forEach(child => {
      const childResults = updateComponentTree(child);
      results.watchersRun += childResults.watchersRun;
      results.changesDetected += childResults.changesDetected;
    });
    
    return results;
  }

  // Main digest function - now primarily focuses on the virtual DOM
  function digest(rootComponent = null) {
    if (lightBind.digestScheduled) return;
    
    lightBind.digestScheduled = true;
    
    queueMicrotask(() => {
      const startTime = performance.now();
      
      if (rootComponent) {
        // Update the virtual DOM tree for this component
        lightBind.virtualDOM.updateComponent(rootComponent);
        
        // Run legacy watchers for compatibility
        const results = updateComponentTree(rootComponent);
        
        // Update parent if changes detected
        if (results.changesDetected > 0 && rootComponent.parent) {
          lightBind.virtualDOM.updateComponent(rootComponent.parent);
        }
      } else {
        // Global update for all components
        lightBind.components.forEach(component => {
          lightBind.virtualDOM.updateComponent(component);
          updateComponent(component);
        });
      }
      
      // Apply all virtual DOM changes to the real DOM in a batch
      lightBind.virtualDOM.applyChanges();
      
      const duration = (performance.now() - startTime).toFixed(2);
      log('digest', `Digest cycle complete in ${duration}ms`);
      
      lightBind.digestScheduled = false;
    });
  }

  function createWatcher(component, expression, callback) {
    // Initialize registry if needed
    if (!component.watcherRegistry) component.watcherRegistry = {};
    
    // Extract property paths from expression
    const paths = extractPropertyPaths(expression);
    
    let lastValue;
    let firstRun = true;
    
    const checkForChanges = () => {
      try {
        // Evaluate with better handling of undefined variables
        const newValue = lightBind.evaluateExpression(expression, component.scope);
        
        // On first run or if value changed
        if (firstRun || !lightBind.isEqual(newValue, lastValue)) {
          const oldValue = lastValue;
          
          // Clone the value to avoid reference issues
          try {
            lastValue = lightBind.deepClone(newValue);
          } catch (e) {
            // If cloning fails (e.g., for circular references), just use the value as is
            lastValue = newValue;
          }
          
          // Callback might throw if it tries to work with undefined
          try {
            callback(newValue, oldValue);
          } catch (callbackError) {
            // Log but don't break the whole watch system
            log('error', `Error in watcher callback for '${expression}':`, callbackError);
          }
          
          firstRun = false;
          return true;
        }
        
        firstRun = false;
        return false;
      } catch (error) {
        // Log but continue
        log('error', `Error checking for changes in watcher '${expression}':`, error);
        firstRun = false;
        return false;
      }
    };
    
    // Register watcher on each path
    paths.forEach(path => {
      if (!component.watcherRegistry[path]) {
        component.watcherRegistry[path] = [];
      }
      // Check if this exact callback already exists to avoid duplicates
      if (!component.watcherRegistry[path].includes(checkForChanges)) {
        component.watcherRegistry[path].push(checkForChanges);
      }
    });
    
    // Run once to establish initial value
    try {
      checkForChanges();
    } catch (e) {
      // If initial run fails, log but continue
      log('error', `Error during initial watcher run for '${expression}':`, e);
    }
    
    return {
      expression,
      unwatch: () => {
        // Remove from registry
        paths.forEach(path => {
          if (component.watcherRegistry[path]) {
            const index = component.watcherRegistry[path].indexOf(checkForChanges);
            if (index !== -1) {
              component.watcherRegistry[path].splice(index, 1);
            }
          }
        });
      }
    };
  }

  // Render new data to a component
  function renderComponent(data, componentSelector = null) {
    if (!data || typeof data !== 'object') {
      log('error', 'Invalid data for component rendering');
      return;
    }
    
    if (componentSelector) {
      const element = document.querySelector(componentSelector);
      if (!element) {
        log('error', `Component not found: ${componentSelector}`);
        return;
      }
      
      const component = lightBind.elementToComponent.get(element) || 
                        lightBind.components.get(element);
      
      if (component) {
        Object.assign(component.scope, data);
        digest(component);
        return;
      }
    }
    
    // Global update if no specific component found
    lightBind.components.forEach(component => {
      Object.assign(component.scope, data);
    });
    
    digest();
  }

  // Destroy a component and clean up resources
  function destroyComponent(component) {
    // Clean up virtual DOM
    lightBind.virtualDOM.cleanupComponent(component);
    
    // Clear watcher registry
    component.watcherRegistry = {};
    
    // Recursively destroy children
    component.childComponents.forEach(destroyComponent);
    
    // Remove from component maps
    lightBind.components.delete(component.element);
    lightBind.elementToComponent.delete(component.element);
    
    // Remove from parent if exists
    if (component.parent) {
      const childIndex = component.parent.childComponents.indexOf(component);
      if (childIndex !== -1) {
        component.parent.childComponents.splice(childIndex, 1);
      }
    }
  }
}
