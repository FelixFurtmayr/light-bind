export function createExpressionHandler(lightBind) {
  const log = (category, ...args) => lightBind.log(category, ...args);

  // Create a single expression cache
  const expressionCache = new Map();

  return {
    parseEventHandler,
    parseAttributeBindings,
    preprocessStrings,
    extractVariableNames,
    evaluateExpression,
    parseInterpolatedString,
    parseComplexExpression,
    parseExpression
  };


  function preprocessStrings(expression) {
    return expression.replace(/'((?:\\.|[^'\\])*)'/g, (match, content) => {
      return `"${content.replace(/"/g, '\\"')}"`;
    });
  }

  function extractVariableNames(expression) {
    const matches = expression.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g) || [];
    const jsKeywords = ['if', 'else', 'var', 'let', 'const', 'function', 'return', 'true', 'false', 'null', 'undefined', 'new', 'this'];
    return matches.filter(match => !jsKeywords.includes(match));
  }

  function parseInterpolatedString(text) {
    const parts = [];
    let lastIndex = 0;
    let startIndex;
    
    while ((startIndex = text.indexOf('{{', lastIndex)) !== -1) {
      if (startIndex > lastIndex) {
        parts.push({ text: text.substring(lastIndex, startIndex), expression: false });
      }
  
      const endIndex = text.indexOf('}}', startIndex + 2);
      if (endIndex === -1) break;
      
      parts.push({ text: text.substring(startIndex + 2, endIndex).trim(), expression: true });
      lastIndex = endIndex + 2;
    }
    
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), expression: false });
    }
    
    return parts;
  }

  function hasTernaryOperator(expression) {
    const result = { hasTernary: false, sections: [] };
    let inString = false;
    let stringChar = '';
    let parenLevel = 0;
    let questionMarkPos = -1;
    let lastIndex = 0;
    
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      
      // Handle strings
      if ((char === '"' || char === "'") && (i === 0 || expression[i-1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }
      
      if (!inString) {
        if (char === '(') parenLevel++;
        else if (char === ')') parenLevel--;
        
        if (char === '?' && parenLevel === 0) {
          questionMarkPos = i;
        }
        
        if (char === ':' && questionMarkPos !== -1 && parenLevel === 0) {
          result.hasTernary = true;
          result.sections.push({
            start: lastIndex,
            questionMark: questionMarkPos,
            colon: i,
            end: -1
          });
          questionMarkPos = -1;
          lastIndex = i + 1;
        }
      }
    }
    
    if (result.sections.length > 0) {
      result.sections[result.sections.length - 1].end = expression.length;
    }
    
    return result;
  }

  function evaluateExpression(expression, scope) {
    try {
      // Check if we have a cached function for this expression
      if (!expressionCache.has(expression)) {
        // Create a new function for this expression with better error handling
        const processedExpr = preprocessStrings(expression);
        const func = new Function('scope', `
          try {
            with(scope) {
              return ${processedExpr};
            }
          } catch(e) {
            if (e instanceof ReferenceError) {
              return undefined;
            }
            if (e instanceof TypeError && e.message.includes('undefined')) {
              return undefined;
            }
            throw e;
          }
        `);
        
        // Store the compiled function in the cache
        expressionCache.set(expression, func);
      }
      
      // Get the cached function
      const func = expressionCache.get(expression);
      
      // Auto-initialize variables if needed
      extractVariableNames(expression).forEach(varName => {
        if (!(varName in scope)) {
          scope[varName] = undefined;
        }
      });
      
      // Execute the function with the current scope
      return func(scope);
    } catch (error) {
      log('error', `Error evaluating expression '${expression}':`, error);
      return '';
    }
  }

  function parseEventHandler(expression, scope, event) {
    try {
      const eventScope = Object.create(scope);
      eventScope.$event = event;
      
      // Check if simple function call
      const funcMatch = expression.match(/^(\w+)\s*\((.*)\)$/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const argsStr = funcMatch[2];
        
        if (typeof scope[funcName] === 'function') {
          try {
            // Evaluate arguments
            const args = argsStr.trim() ? 
              argsStr.split(',').map(arg => evaluateExpression(arg.trim(), eventScope)) : 
              [];
            
            scope[funcName].apply(scope, args);
            return true;
          } catch (err) {
            log('error', `Error calling function ${funcName}: ${err.message}`);
          }
        }
      }
      
      // For more complex expressions, use with+eval
      // Track all variables before execution
      const trackedVars = {};
      for (const key in eventScope) {
        if (typeof key === 'string' && key !== '$event' && !key.startsWith(')')) {
          trackedVars[key] = eventScope[key];
        }
      }
      
      // Execute the expression
      const evalFunc = new Function('scope', 'event', `
        with(scope) {
          ${expression};
        }
      `);
      
      evalFunc(eventScope, eventScope.$event);
      
      // Update scope with changed values
      let hasChanges = false;
      for (const key in trackedVars) {
        if (eventScope[key] !== trackedVars[key]) {
          scope[key] = eventScope[key];
          hasChanges = true;
        }
      }
      
      return hasChanges || true;
    } catch (error) {
      log('error', `Error parsing event handler '${expression}':`, error);
      return false;
    }
  }

  function parseAttributeBindings(expression) {
    try {
      const result = [];
      let currentAttr = '';
      let currentExpr = '';
      let inExpression = false;
      let parenLevel = 0;
      let inString = false;
      let stringChar = '';
      let ternaryLevel = 0;
      
      for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        
        // String handling
        if ((char === '"' || char === "'") && (i === 0 || expression[i - 1] !== '\\')) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
          }
        }
        
        // Track nesting levels when not in string
        if (!inString) {
          if (char === '(') parenLevel++;
          if (char === ')') parenLevel--;
          if (char === '?') ternaryLevel++;
          if (char === ':' && ternaryLevel > 0) ternaryLevel--;
        }
        
        // Handle binding separators
        if (char === ':' && !inExpression && !inString && parenLevel === 0 && ternaryLevel === 0) {
          inExpression = true;
          continue;
        }
        
        if (char === ',' && !inString && parenLevel === 0 && ternaryLevel === 0) {
          if (currentAttr && currentExpr) {
            result.push({
              attribute: currentAttr.trim(),
              expression: currentExpr.trim()
            });
          }
          currentAttr = '';
          currentExpr = '';
          inExpression = false;
          continue;
        }
        
        // Add character to current segment
        if (inExpression) {
          currentExpr += char;
        } else {
          currentAttr += char;
        }
      }
      
      // Add final binding if exists
      if (currentAttr && currentExpr) {
        result.push({
          attribute: currentAttr.trim(),
          expression: currentExpr.trim()
        });
      }
      
      return result;
    } catch (error) {
      log('error', `Error parsing attribute bindings '${expression}':`, error);
      return [];
    }
  }

  function parseComplexExpression(expression) {
    const ternaryInfo = hasTernaryOperator(expression);
    const hasObjectNotation = /\w+\s*:/.test(expression);
    
    if (ternaryInfo.hasTernary) {
      return {
        type: 'complex',
        expression: expression.trim(),
        sections: ternaryInfo.sections
      };
    } 
    
    if (hasObjectNotation) {
      return {
        type: 'object',
        pairs: parseAttributeBindings(expression)
      };
    }
    
    return {
      type: 'simple',
      expression: expression.trim()
    };
  }

  // for external usage: parse a string with expression within a given scope
  function parseExpression(text, scope) {
    // console.log('parseExpression', text, scope);
    try {
      text = text || '';
      const parts = parseInterpolatedString(text);
      let result = '';
      
      for (const part of parts) {
        if (part.expression) {
          try {
            const value = evaluateExpression(part.text, scope);
            result += (value !== undefined && value !== null) ? value : '';
          } catch (error) {
            console.error(`Error evaluating expression '${part.text}':`, error);
            result += '';
          }
        } else {
          result += part.text;
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error parsing expression '${text}':`, error);
      return text;
    }
  }
}
