class BaseDirective {
  constructor(lightBind) {
    if (new.target === BaseDirective) {
      throw new Error('BaseDirective cannot be instantiated directly');
    }
    this.lightBind = lightBind;
  }

  process(element, value, component) {
    throw new Error('process() must be implemented by subclasses');
  }
  
  log(category, ...args) {
    if (this.lightBind.debug) {
      this.lightBind.log(category, `[${this.constructor.name}]`, ...args);
    }
  }
}

export { BaseDirective };
