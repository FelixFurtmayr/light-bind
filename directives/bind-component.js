import { BaseDirective } from './base-directive.js';

class BindComponentDirective extends BaseDirective {
  constructor(lightBind) {
    super(lightBind);
    this.templateCache = new Map();
  }

  process(element, expression, component) {
    const componentName = this.lightBind.evaluateExpression(expression, component.scope);
    if (!componentName) {
      this.log('error', `Invalid component name: ${expression}`);
      return { success: false };
    }
    
    const dataAttr = element.getAttribute('data');
    let componentData = {};
    
    if (dataAttr) {
      componentData = this.lightBind.evaluateExpression(dataAttr, component.scope) || {};
    }
    
    if (!component.nodeBindings.has(element)) {
      component.nodeBindings.set(element, {});
    }
    component.nodeBindings.get(element).componentProcessed = true;
    
    this.loadComponent(componentName, element, componentData, component);
    
    return { success: true, skipChildren: true };
  }
  
  async loadComponent(name, container, data, parentComponent) {
    try {
      const template = await this.getComponentTemplate(name);
      
      container.innerHTML = template;
      
      const componentId = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const templateElement = container.querySelector('template');
      if (templateElement) {
        const bindFunction = templateElement.getAttribute('bind-function');
        const content = templateElement.innerHTML;
        
        container.innerHTML = '';
        if (bindFunction) {
          container.setAttribute('bind-function', bindFunction);
        }
        container.setAttribute('data-component-id', componentId);
        container.setAttribute('data-component-name', name);
        container.innerHTML = content;
        
        this.processComponentStyles(name, templateElement);
        
        if (bindFunction) {
          const componentInstance = this.lightBind.initializeComponent(container);
          
          if (componentInstance && componentInstance.scope) {
            Object.assign(componentInstance.scope, data);
            this.lightBind.digest(componentInstance);
          }
          
          return componentInstance;
        } else {
          this.lightBind.processElementAndChildren(container, parentComponent);
        }
      } else {
        const bindFunctionElement = container.querySelector('[bind-function]');
        if (bindFunctionElement) {
          const componentInstance = this.lightBind.initializeComponent(bindFunctionElement);
          
          if (componentInstance && componentInstance.scope) {
            Object.assign(componentInstance.scope, data);
            this.lightBind.digest(componentInstance);
          }
          
          return componentInstance;
        } else {
          this.lightBind.processElementAndChildren(container, parentComponent);
        }
      }
    } catch (error) {
      this.log('error', `Error loading component ${name}:`, error);
      container.innerHTML = `<div class="component-error">Error loading component: ${name}</div>`;
      return null;
    }
  }
  
  processComponentStyles(name, templateElement) {
    const componentsPath = this.lightBind.componentsPath || './components';
    
    const styleElements = templateElement.querySelectorAll('style');
    for (const styleEl of styleElements) {
      const styleId = `lb-component-style-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (!document.getElementById(styleId)) {
        const newStyle = document.createElement('style');
        newStyle.id = styleId;
        newStyle.textContent = styleEl.textContent;
        document.head.appendChild(newStyle);
      }
    }
    
    const linkElements = templateElement.querySelectorAll('link[rel="stylesheet"]');
    for (const linkEl of linkElements) {
      const href = linkEl.getAttribute('href');
      if (href) {
        const fullHref = href.startsWith('http') || href.startsWith('/') 
          ? href 
          : `${componentsPath}/${name}/${href}`;
          
        const linkId = `lb-component-link-${fullHref.replace(/[^\w]/g, '_')}`;
        if (!document.getElementById(linkId)) {
          const newLink = document.createElement('link');
          newLink.id = linkId;
          newLink.rel = 'stylesheet';
          newLink.href = fullHref;
          document.head.appendChild(newLink);
        }
      }
    }
  }
  
  async getComponentTemplate(name) {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name);
    }
    
    try {
      const normalizedName = name.replace(/\\/g, '/');
      const componentsPath = this.lightBind.componentsPath || './components';
      
      const possibleFiles = [
        `${componentsPath}/${normalizedName}/template.html`,
        `${componentsPath}/${normalizedName}/component.html`
      ];
      
      let response;
      
      for (const url of possibleFiles) {
        try {
          response = await fetch(url);
          if (response.ok) break;
        } catch (e) {}
      }
      
      if (!response || !response.ok) {
        throw new Error(`Component not found: ${name}`);
      }
      
      const html = await response.text();
      this.templateCache.set(name, html);
      return html;
    } catch (error) {
      this.log('error', `Failed to load component template: ${name}`, error);
      throw error;
    }
  }

  clearCache() {
    this.templateCache.clear();
  }
}

export { BindComponentDirective };
