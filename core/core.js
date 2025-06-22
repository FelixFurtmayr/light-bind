/*
LightBind Core with enhanced $parent and $elem references and Virtual DOM integration
*/

import { createDigestHandler } from './core_digest.js';
import { createExpressionHandler } from './core_expressions.js';
import { createBindingPathFinder } from './core_find_bindings.js';
import { deepClone, getNestedProperty, isEqual, setNestedProperty, log as utilLog } from './core_utils.js';

// Import modules
import createDialogHandler from './dialog.js';
import LightBindHttp from './http.js';
import LightBindNotification from './notification.js';
import LightStorage from './storage.js';

// Import Virtual DOM
import { createVirtualDOM } from './core_virtual_dom.js';

// Import directives
import { BindAttrDirective } from '../directives/bind-attr.js';
import { BindClassDirective } from '../directives/bind-class.js';
import { BindComponentDirective } from '../directives/bind-component.js';
import { BindDragDirective } from '../directives/bind-drag.js';
import { BindDropDirective } from '../directives/bind-drop.js';
import { BindHtmlDirective } from '../directives/bind-html.js';
import { BindIfDirective } from '../directives/bind-if.js';
import { BindRepeatDirective } from '../directives/bind-repeat.js';
import { BindStyleDirective } from '../directives/bind-style.js';
import { BindTextDirective } from '../directives/bind-text.js';
import { BindUploadDirective } from '../directives/bind-upload.js';
import { BindDirective } from '../directives/bind.js';

export function createLightBind(options = {}) {
  // Private state
  const components = new Map();
  const templateCache = new Map();
  const repeatMarkers = new Map();
  const elementToComponent = new WeakMap();
  const debug = options.debug || false;
  let digestScheduled = false;
  const dialogsPath = options.dialogsPath || '../dialogs';
  const componentsPath = options.componentsPath || '../components';
  let _initialized = false;
  
  // Create private log function
  const log = (category, ...args) => utilLog(debug, category, ...args);
  
  // Event mapping for directive processing
  const eventMap = {
    'on-click': 'click',
    'on-change': 'change',
    'on-input': 'input',
    'on-submit': 'submit',
    'on-blur': 'blur',
    'on-double-click': 'dblclick',
    'on-middle-click': 'auxclick',
    'on-right-click': 'contextmenu',
    'on-focus': 'focus',
    'on-keyup': 'keyup',
    'on-keydown': 'keydown',
    'on-keypress': 'keypress',
    'on-mouseover': 'mouseover',
    'on-mouseout': 'mouseout',
    'on-mouseenter': 'mouseenter',
    'on-mouseleave': 'mouseleave'
  };
  
  // Create the instance object with basic properties
  const instance = {
    components,
    templateCache,
    repeatMarkers,
    elementToComponent,
    debug,
    digestScheduled,
    dialogsPath,
    componentsPath,
    log,
    isEqual,
    deepClone,
    copy: deepClone,
    getNestedProperty,
    setNestedProperty,
    http: LightBindHttp(options),
    storage: LightStorage,
    notification: LightBindNotification,
    eventMap
  };

  // Create dialog handler
  instance.dialog = createDialogHandler(instance);
  
  // Merge in methods from handlers
  Object.assign(instance, 
    createExpressionHandler(instance), 
    createDigestHandler(instance)
  );
  
  // Create Virtual DOM as part of the instance
  instance.virtualDOM = createVirtualDOM(instance);
  
  // Create directives
  instance.directives = {
    'bind': new BindDirective(instance),
    'bind-attr': new BindAttrDirective(instance),
    'bind-class': new BindClassDirective(instance),
    'bind-component': new BindComponentDirective(instance),
    'bind-html': new BindHtmlDirective(instance),
    'bind-if': new BindIfDirective(instance),
    'bind-repeat': new BindRepeatDirective(instance),
    'bind-style': new BindStyleDirective(instance),
    'bind-text': new BindTextDirective(instance),
    'bind-drag': new BindDragDirective(instance),
    'bind-drop': new BindDropDirective(instance),
    'bind-upload': new BindUploadDirective(instance)
  };
  
  // Core functions
  
  function setGlobals() {
    const globals = {
      LightBind: instance,
      storage: instance.storage,
      http: instance.http,
      dialog: instance.dialog,
      notification: instance.notification
    };
    
    if (!JSON.copy) JSON.copy = instance.deepClone;
    Object.assign(window, globals);
    return instance;
  }
  
  function initComponents(rootElement) {
    if (!rootElement) {
      log('error', 'LightBind initialization failed: Root element not found');
      return;
    }
    
    log('init', 'LightBind initializing, searching for components');
    
    rootElement.querySelectorAll('[bind-function]').forEach(element => {
      log('init', 'Found initial component', element.getAttribute('bind-function'));
      initializeComponent(element);
    });
    
    window.renderComponent = instance.renderComponent;
    log('init', 'LightBind initialization complete');
  }
  
  function start(root) {
    if (!root) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          initComponents(document.body);
        });
        
        setTimeout(() => {
          if (!_initialized) {
            log('init', 'Using fallback initialization');
            initComponents(document.body);
            _initialized = true;
          }
        }, 4000);
      } else {
        initComponents(document.body);
      }
    } else {
      const rootElement = typeof root === 'string' ? document.querySelector(root) : root;
      initComponents(rootElement);
    }
    
    return instance;
  }
  
  function handleDOMChanges(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'bind-function') {
        initializeComponent(mutation.target);
      } else if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.hasAttribute('bind-function')) initializeComponent(node);
            node.querySelectorAll('[bind-function]').forEach(element => initializeComponent(element));
          }
        });
      }
    }
  }
  
  function findParentComponent(element) {
    let parent = element.parentElement;
    while (parent) {
      if (elementToComponent.has(parent)) return elementToComponent.get(parent);
      parent = parent.parentElement;
    }
    return null;
  }
  
  function findDirectComponentForElement(element) {
    if (elementToComponent.has(element)) return elementToComponent.get(element);
    
    for (const component of components.values()) {
      if (component.element === element) return component;
      
      if (component.isRepeatItem && component.elements) {
        if (component.elements.includes(element) || component.element.contains(element)) {
          return component;
        }
      }
    }
    
    return findParentComponent(element);
  }
  
  function setupAttributeBinding(element, attrName, attrValue, component) {
    if (!component.nodeBindings.has(element)) {
      component.nodeBindings.set(element, {});
    }
    
    const nodeBindings = component.nodeBindings.get(element);
    const parts = instance.parseInterpolatedString(attrValue);
    
    if (parts.some(p => p.expression)) {
      if (!nodeBindings.attributes) nodeBindings.attributes = {};
      
      nodeBindings.attributes[attrName] = {
        original: attrValue,
        parts: parts,
        lastValue: null
      };
      
      const updateAttr = () => {
        let newValue = '';
        parts.forEach(part => {
          if (part.expression) {
            const value = instance.evaluateExpression(part.text, component.scope);
            newValue += (value !== undefined && value !== null) ? value : '';
          } else {
            newValue += part.text;
          }
        });
        
        if (nodeBindings.attributes[attrName].lastValue !== newValue) {
          // Use the component helper instead of direct DOM manipulation
          component.updateProperty(element, attrName, newValue);
          nodeBindings.attributes[attrName].lastValue = newValue;
        }
      };
      
      parts.filter(p => p.expression).forEach(part => {
        instance.createWatcher(component, part.text, updateAttr);
      });
      
      updateAttr();
    }

    // Handle special input binding
    if (element.tagName === 'INPUT' && attrName === 'bind') {
      const varName = attrValue.trim();
      
      if (!(varName in component.scope)) {
        if (element.type === 'checkbox' || element.type === 'radio') {
          component.scope[varName] = element.checked;
        } else if (element.type === 'number') {
          const initialValue = element.value ? Number(element.value) : 0;
          component.scope[varName] = isNaN(initialValue) ? 0 : initialValue;
        } else {
          component.scope[varName] = element.value;
        }
      } 
      else if (element.type === 'number' && typeof component.scope[varName] !== 'number') {
        const numValue = Number(component.scope[varName]);
        component.scope[varName] = isNaN(numValue) ? 0 : numValue;
      }
      
      // Create a virtual node for this form element
      instance.virtualDOM.createFromDOM(element, component);
    }
  }
  
  function setupEventBinding(element, eventName, expression, component) {
    if (!component.nodeBindings.has(element)) {
      component.nodeBindings.set(element, {});
    }
    
    const nodeBindings = component.nodeBindings.get(element);
    const eventKey = `event_${eventName}_${expression}`;
    
    if (nodeBindings[eventKey]) return;
    
    const isInputControl = (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA');
    const isCheckboxOrRadio = isInputControl && (element.type === 'checkbox' || element.type === 'radio');
    const elementOwnerComponent = findDirectComponentForElement(element);
    
    const handleEvent = (event) => {
      let shouldProcessEvent = true;
      
      if ((eventName === 'input' || eventName === 'change') && isInputControl) {
        // Update the virtual DOM node when input changes
        const vNode = instance.virtualDOM.nodeMap.get(element);
        if (vNode) {
          vNode.value = isCheckboxOrRadio ? 
            { type: element.type, value: element.value, checked: element.checked } : 
            { type: element.type, value: element.value };
          vNode.isDirty = true;
        }
        
        const currentValue = isCheckboxOrRadio ? element.checked : element.value;
        
        if (currentValue === nodeBindings[`lastValue_${eventName}`]) {
          shouldProcessEvent = false;
        } else {
          nodeBindings[`lastValue_${eventName}`] = currentValue;
        }
      }
      
      if (shouldProcessEvent) {
        const componentScope = (elementOwnerComponent || component).scope;
        componentScope.$event = event;
        instance.parseEventHandler(expression, componentScope, event);
        instance.digest(elementOwnerComponent || component);
      }
    };
    
    if (isInputControl && (eventName === 'input' || eventName === 'change')) {
      nodeBindings[`lastValue_${eventName}`] = isCheckboxOrRadio ? element.checked : element.value;
    }
    
    element.addEventListener(eventName, handleEvent);
    nodeBindings[eventKey] = handleEvent;
  }
  
  function processElementAndChildren(element, component, skipChildren = false) {
    // Skip if already processed
    if (component.nodeBindings.has(element) && component.nodeBindings.get(element).processed) {
      return;
    }
    
    // Skip nested components
    const hasBindFunction = element.hasAttribute('bind-function') && element !== component.element;
    if (hasBindFunction) return;
    
    component.nodeBindings.set(element, { processed: true });
    
    let bindIfFound = false;
    let bindRepeatProcessed = false;
    component.bindings = component.bindings || [];
    
    // Process form elements for virtual DOM tracking
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
      instance.virtualDOM.createFromDOM(element, component);
    }
    
    // process bind-repeat first, so we have the scope over the attributes of the element
    if (element.hasAttribute('bind-repeat')) {
      const value = element.getAttribute('bind-repeat');
      const result = instance.directives['bind-repeat'].process(element, value, component);
      bindRepeatProcessed = true;
      
      if (result && result.scopes) {
        if (!component.repeatScopes) component.repeatScopes = [];
        component.repeatScopes.push(...result.scopes);
        
        // Add $parent and $elem references to repeat scopes
        if (result.items && result.items.length > 0) {
          result.scopes.forEach((scope, index) => {
            if (result.items[index]) {
              // Add $parent reference if not already present
              if (!Object.getOwnPropertyDescriptor(scope, '$parent')) {
                Object.defineProperty(scope, '$parent', {
                  value: component.scope,
                  enumerable: false,
                  configurable: true
                });
              }
              
              // Add $elem reference if not already present
              if (!Object.getOwnPropertyDescriptor(scope, '$elem')) {
                Object.defineProperty(scope, '$elem', {
                  value: result.items[index],
                  enumerable: false,
                  configurable: true
                });
              }
            }
          });
        }
      }
      
      if (result && result.skipChildren) {
        return; // Skip further processing for this element
      }
    }
    
    // Process all other attributes
    Array.from(element.attributes || []).forEach(attr => {
      const name = attr.name;
      const value = attr.value;
      
      // Already processed above
      if (name === 'bind-repeat') return;
      
      if (eventMap[name]) {
        setupEventBinding(element, eventMap[name], value, component);
      } 
      else if (instance.directives[name]) {
        const result = instance.directives[name].process(element, value, component);
        
        if (name === 'bind-if') {
          bindIfFound = result.skipChildren || false;
        }
      } 
      else if (value.includes('{{')) {
        setupAttributeBinding(element, name, value, component);
      }
    });
    
    component.nodeBindings.set(element, { processed: true, fullyProcessed: true });
    
    // Process children unless skipped
    if (!skipChildren && !bindIfFound) {
      Array.from(element.children).forEach(child => {
        if (!component.nodeBindings.has(child) || !component.nodeBindings.get(child).processed) {
          processElementAndChildren(child, component);
        }
      });
    }
  }
  
  function setupToggleVisibleWatcher(component, callback) {
    if (component.toggleVisibleWatcherCreated) return;
    
    let lastValue = component.scope.toggleVisible;
    const specialWatcher = () => {
      const currentValue = component.scope.toggleVisible;
      if (lastValue !== currentValue) {
        const oldValue = lastValue;
        lastValue = currentValue;
        callback(currentValue, oldValue);
        return true;
      }
      return false;
    };
    
    component.watchers.push(specialWatcher);
    component.toggleVisibleWatcherCreated = true;
  }
  
  function findComponentForScope(scope) {
    for (const component of components.values()) {
      if (component.scope === scope) return component;
      
      if (component.repeatScopes) {
        for (const repeatScope of component.repeatScopes) {
          if (repeatScope === scope) return component;
        }
      }
    }
    
    return null;
  }
  
  // Helper function to get all elements associated with a component
  function getAllBoundElements(component) {
    const result = [component.element];
    
    // For repeat directives, add all generated element instances
    if (component.elements && Array.isArray(component.elements)) {
      component.elements.forEach(el => {
        if (!result.includes(el)) result.push(el);
      });
    }
    
    // Use nodeBindings to find all other bound elements
    // Since nodeBindings is a WeakMap, we need to find elements from the DOM
    const collectElements = (rootElement) => {
      if (rootElement && component.nodeBindings.has(rootElement)) {
        if (!result.includes(rootElement)) result.push(rootElement);
      }
      
      if (rootElement.children) {
        Array.from(rootElement.children).forEach(collectElements);
      }
    };
    
    collectElements(component.element);
    
    return result;
  }
  
  // Enhanced initializeComponent function with $parent and $elem
  function initializeComponent(element, bindFunction, inputs = {}) {
    // Skip if already initialized
    if (elementToComponent.has(element)) {
      return elementToComponent.get(element);
    }
    
    const parentComponent = findParentComponent(element);
    const scope = {};
    
    // Create the component object with a destroy method
    const component = {
      element, 
      scope, 
      childComponents: [], 
      watchers: [], 
      parent: parentComponent,
      textBindings: new Map(),
      nodeBindings: new WeakMap(),
      
      // Component property management helper
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
          // Special handling for form element values
          if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.value = value;
          } else if (element.tagName === 'SELECT') {
            element.value = value;
            // Also update selectedIndex if needed
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
      },
      
      // Comprehensive destroy method
      destroy: function() {
        // Log destruction when debugging
        log('lifecycle', `Destroying component at ${element.tagName}#${element.id || 'unknown'}`);
        
        // 1. Destroy all child components first
        // Make a copy since the array will be modified during iteration
        const childrenToDestroy = [...this.childComponents];
        childrenToDestroy.forEach(child => {
          if (child && typeof child.destroy === 'function') {
            child.destroy();
          }
        });
        this.childComponents = [];
        
        // 2. Clean up all watchers
        this.watchers.forEach(watcher => {
          if (typeof watcher.unwatch === 'function') {
            watcher.unwatch();
          }
        });
        this.watchers = [];
        
        // 3. Get all elements bound to this component
        const boundElements = getAllBoundElements(this);
        
        // 4. Clean up event handlers and data bindings
        boundElements.forEach(el => {
          if (!el) return;
          
          const bindings = this.nodeBindings.get(el);
          if (bindings) {
            // Clean up event handlers
            for (const key in bindings) {
              if (key.startsWith('event_')) {
                const [_, eventName] = key.split('_', 2);
                if (typeof el.removeEventListener === 'function' && typeof bindings[key] === 'function') {
                  el.removeEventListener(eventName, bindings[key]);
                  log('cleanup', `Removed event handler ${eventName} from element`);
                }
              }
            }
          }
          
          // Clear the nodeBindings entry
          this.nodeBindings.delete(el);
          
          // Remove element reference from component maps
          elementToComponent.delete(el);
        });
        
        // 5. Clean up text bindings
        this.textBindings.clear();
        
        // 6. Clean up repeat markers if applicable
        if (this.isRepeatItem) {
          // Find and clean up repeat markers
          repeatMarkers.forEach((marker, comment) => {
            if (marker.instances && marker.instances.includes(this)) {
              const index = marker.instances.indexOf(this);
              if (index !== -1) marker.instances.splice(index, 1);
            }
          });
        }
        
        // 7. Remove from component maps
        components.delete(this.element);
        
        // 8. Remove from parent component if exists
        if (this.parent) {
          const index = this.parent.childComponents.indexOf(this);
          if (index !== -1) {
            this.parent.childComponents.splice(index, 1);
          }
        }
        
        // 9. Nullify scope references
        for (const key in this.scope) {
          this.scope[key] = null;
        }
        
        // 10. Execute any custom cleanup logic if provided
        if (typeof this.scope.$onDestroy === 'function') {
          try {
            this.scope.$onDestroy();
          } catch(e) {
            log('error', 'Error in $onDestroy callback:', e);
          }
        }
        
        // 11. Clean up virtual DOM resources
        instance.virtualDOM.cleanupComponent(this);
        
        log('lifecycle', `Component destroyed successfully.`);
      }
    };
    
    // Register component
    components.set(element, component);
    elementToComponent.set(element, component);
    
    if (parentComponent) {
      parentComponent.childComponents.push(component);
      Object.setPrototypeOf(scope, parentComponent.scope);
      
      // Add direct reference to parent scope
      Object.defineProperty(scope, '$parent', {
        value: parentComponent.scope,
        enumerable: false,
        configurable: true
      });
    }
    
    // Add direct reference to root element
    Object.defineProperty(scope, '$elem', {
        value: element,
        enumerable: false,
        configurable: true
    });
    
    // Add utility methods to scope
    scope.$render = (newData = {}) => {
      if (newData && typeof newData === 'object') {
        Object.assign(scope, newData);
      }
      instance.digest(component);
      return scope;
    };
    
    scope.$refresh = () => {
      instance.digest(component);
      if (parentComponent) instance.digest(parentComponent);
      return scope;
    };

    // Add lifecycle hook placeholders
    scope.$onInit = scope.$onInit || function() {};
    scope.$onDestroy = scope.$onDestroy || function() {};

    scope.$findBinding = createBindingPathFinder(element);
    
    // Get function name if not provided directly
    let functionName = bindFunction?.name || element.getAttribute('bind-function');
    if (!bindFunction && functionName && typeof window[functionName] === 'function') {
      bindFunction = window[functionName];
    }
    
    // Collect attributes from element
    const attrs = {};
    Array.from(element.attributes || []).forEach(attr => {
      attrs[attr.name] = attr.value;
    });
    
    // Set component strategy
    component.strategy = element.getAttribute('bind-strategy') || 'default';
    
    // Process DOM 
    processElementAndChildren(element, component);
    
    if (instance.directives['bind-text']) {
      instance.directives['bind-text'].process(element, '', component);
    }
    
    // Create virtual DOM node for this component
    instance.virtualDOM.createFromDOM(element, component);

    // if an input with a forbidden name is found, log a warning and rename it
    inputs = inputs || {};
    ['elem', 'attrs', 'bindings'].forEach(prop => {
      if (inputs[prop] ) {
        console.warn(`LightBind: Input property '${prop}' is reserved and will be renamed to '_${prop}'`);
        inputs['_' + prop] = inputs[prop];
        delete inputs[prop];
      }
    });
      
    // Call the bind function with basic information
    try {
      bindFunction(scope, {
        elem: element,
        attrs: attrs,
        bindings: component.bindings,
        ...inputs
      });
      
      // Call the $onInit hook if defined
      if (typeof scope.$onInit === 'function') {
        scope.$onInit();
      }

      element.classList.add('lb-initialized');

      setTimeout(() => {

        component.watchers.forEach(watcher => {
          try {
            watcher();
          } catch (e) {
            log('error', 'Error running initial watcher:', e);
          }
        });

        instance.digest(component);
      }, 0); // Allow DOM to settle
      

    } catch (error) {
      element.classList.add('lb-initialized');
      log('error', `Error executing function ${functionName}:`, error);
    }
    
    return component;
  }
  
  // Updated digest function focusing on form elements
  function digest(rootComponent = null) {
    if (digestScheduled) return;
    
    digestScheduled = true;
    
    queueMicrotask(() => {
      const startTime = performance.now();
      
      if (rootComponent) {
        // Update the virtual DOM for form elements
        instance.virtualDOM.updateComponent(rootComponent);
        
        // Run watchers (original behavior)
        const results = instance.updateComponentTree(rootComponent);
        
        // If parent exists and changes were detected
        if (rootComponent.parent && results.changesDetected > 0) {
          instance.virtualDOM.updateComponent(rootComponent.parent);
        }
      } else {
        // Global update for all components
        instance.components.forEach(component => {
          instance.virtualDOM.updateComponent(component);
          instance.updateComponent(component);
        });
      }
      
      // Apply virtual DOM changes to real DOM
      instance.virtualDOM.applyChanges();
      
      const duration = (performance.now() - startTime).toFixed(2);
      log('digest', `Digest cycle complete in ${duration}ms`);
      
      digestScheduled = false;
    });
  }
  
  // Override the digest method
  instance.digest = digest;
  
  // Attach methods to instance
  Object.assign(instance, {
    setGlobals,
    start,
    handleDOMChanges,
    initializeComponent,
    findParentComponent,
    processElementAndChildren,
    setupAttributeBinding,
    setupEventBinding,
    findDirectComponentForElement,
    setupToggleVisibleWatcher,
    findComponentForScope,
    getAllBoundElements
  });
  
  return instance;
}

// Export a constructor-like function for backward compatibility
export class LightBind {
  constructor(options = {}) {
    const instance = createLightBind(options);
    Object.assign(this, instance);
  }
}
