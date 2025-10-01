// Import the styles from the separate file
import { DIALOG_STYLES } from './dialog-styles.js';

// Confirm dialog template stored inline
const CONFIRM_DIALOG_TEMPLATE = `
<div class="dialog dialog-medium" bind-function="confirmDialog" style="padding: 10px;">
   <div>
      {{text}}
   </div>
   <div class="dialog-actions">
      <button on-click="closeDialog()" class="btn btn-secondary">Cancel</button>
      <button on-click="continue()" class="btn btn-primary">Continue</button>
   </div>
</div>
`;

export default function createDialogHandler(lightBind) {
  const log = (category, ...args) => lightBind.log(category, ...args);
  
  let activeDialog = null;
  let dialogOverlay = null;
  let isInitialized = false;
  let dialogStylesInjected = false;
  let templateCache = new Map();
  let functionRegistry = new Map();

  const DEFAULTOPTIONS = {
    title: '',
    size: 'small',
    forceCloseButton: false,
    showCloseButton: true,
    showHeader: true,
    animationDuration: 300
  };

  function parseDialogConfig(html) {
    // Check if html starts with dialog-config
    const configMatch = html.match(/^\s*<dialog-config([^>]*)\/>\s*/i);

    if (!configMatch) return { parsed: {}, html: html };
    
    let parsed = {}, match;
    const attributesString = configMatch[1];
    const attrRegex = /([a-z-]+)="([^"]*)"/gi;
    
    while ((match = attrRegex.exec(attributesString)) !== null) {
      const key = match[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = match[2];
      
      if (key in DEFAULTOPTIONS) {
        const expectedType = typeof DEFAULTOPTIONS[key];
        
        if (expectedType === 'boolean') {
          parsed[key] = value === 'true';
        } else if (expectedType === 'number') {
          const num = parseInt(value);
          if (isNaN(num)) {
            console.warn(`Dialog config: '${key}' expects number, got '${value}'. Using default: ${DEFAULTOPTIONS[key]}`);
          } else {
            parsed[key] = num;
          }
        } else {
          parsed[key] = value;
        }
      } else {
        console.warn(`Dialog config: Unknown option '${key}'`);
      }
    }
    
    // Remove the dialog-config tag from html
    const cleanHtml = html.substring(configMatch[0].length);
    return { parsed, html: cleanHtml };
  }

  function extractFirstFunction(scriptContent) {
    try {
      const trimmedContent = scriptContent.trim();
      
      const functionMatch = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*{/.exec(trimmedContent);
      
      if (!functionMatch) {
        throw new Error("No function declaration found in the script content");
      }
      
      const functionName = functionMatch[1];
      const params = functionMatch[2].split(',').map(p => p.trim());
      const startIndex = functionMatch.index;
      
      const openingBracePos = trimmedContent.indexOf('{', startIndex);
      if (openingBracePos === -1) {
        throw new Error(`Opening brace not found for function '${functionName}'`);
      }
      
      let braceCount = 1;
      let position = openingBracePos + 1;
      
      while (braceCount > 0 && position < trimmedContent.length) {
        const char = trimmedContent[position];
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
        position++;
      }
      
      if (braceCount !== 0) {
        throw new Error(`Function '${functionName}' appears to be incomplete - missing closing brace`);
      }
      
      const fullFunction = trimmedContent.substring(startIndex, position);
      const body = trimmedContent.substring(openingBracePos + 1, position - 1);
      
      return {
        name: functionName,
        params: params,
        body: body,
        fullFunction: fullFunction
      };
    } catch (error) {
      if (error.message.includes('Function')) {
        throw error;
      } else {
        throw new Error(`Error extracting function: ${error.message}`);
      }
    }
  }

  function injectStyles() {
    if (dialogStylesInjected) return;
    const styleElement = document.createElement('style');
    styleElement.textContent = DIALOG_STYLES;
    document.head.appendChild(styleElement);
    dialogStylesInjected = true;
  }

  function init() {
    if (isInitialized) return;
    injectStyles();
    
    if (!dialogOverlay) {
      dialogOverlay = document.createElement('div');
      dialogOverlay.className = 'dialog-overlay';
      dialogOverlay.style.display = 'none';
      document.body.appendChild(dialogOverlay);
    }
    
    document.addEventListener('keydown', handleKeyDown);
    isInitialized = true;
    
    functionRegistry.set('confirm', function confirmDialog(data, { onSuccess, text }) {
      data.continue = function () {
        if (onSuccess) onSuccess();
        data.closeDialog('confirmed');
      };
      data.text = text || 'Are you sure you want to proceed?';
    });
    
    templateCache.set('confirm', CONFIRM_DIALOG_TEMPLATE);
  }

  function getDialogFunction(dialogId) {
    return functionRegistry.has(dialogId) ? functionRegistry.get(dialogId) : null;
  }

  function open(dialogName, optionsOrCallback = {}, callback = null) {
    init();
    log('dialog', `Opening dialog: ${dialogName}`);

    if (activeDialog && dialogName !== 'confirm') {
      throw new Error(`Cannot open dialog '${dialogName}' while another dialog is active`);
    }

    let dynamicOptions = {};
    if (typeof optionsOrCallback === 'function') {
      callback = optionsOrCallback;
    } else {
      dynamicOptions = optionsOrCallback;
    }

    if (callback) dynamicOptions.onSuccess = callback;

    let previousDialog = null;
    if (dialogName === 'confirm' && activeDialog) {
      previousDialog = activeDialog;
    } else if (activeDialog) {
      closeDialogInternal();
    }

    fetchDialogTemplate(dialogName)
      .then(html => {
        const { parsed: configOptions, html: cleanHtml } = parseDialogConfig(html);
        const finalOptions = { ...DEFAULTOPTIONS, ...configOptions, ...dynamicOptions };
        
        // Auto-generate title if not provided
        if (!finalOptions.title && !configOptions.title) {
          finalOptions.title = dialogName.replace(/[-_/\\]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
        }

        const dialogContainer = document.createElement('div');
        dialogContainer.className = `dialog-container dialog-${finalOptions.size || 'small'}`;
        dialogContainer.dataset.dialogName = dialogName;
        dialogContainer.dataset.forceClose = finalOptions.forceCloseButton.toString();
        
        if (dialogName === 'confirm' && previousDialog) {
          dialogContainer.style.zIndex = "9002";
        }

        if (finalOptions.showHeader) {
          const dialogHeader = document.createElement('div');
          dialogHeader.className = 'dialog-header';

          if (finalOptions.title) {
            const dialogTitle = document.createElement('h2');
            dialogTitle.className = 'dialog-title';
            dialogTitle.textContent = finalOptions.title;
            dialogHeader.appendChild(dialogTitle);
          }

          if (finalOptions.showCloseButton) {
            const closeButton = document.createElement('button');
            closeButton.className = 'dialog-close-btn';
            closeButton.innerHTML = '&times;';
            closeButton.setAttribute('aria-label', 'Close dialog');
            closeButton.addEventListener('click', () => close());
            dialogHeader.appendChild(closeButton);
          }

          dialogContainer.appendChild(dialogHeader);
        }

        const dialogContent = document.createElement('div');
        dialogContent.className = 'dialog-content';
        dialogContainer.appendChild(dialogContent);

        dialogOverlay.style.display = 'block';
        document.body.appendChild(dialogContainer);
        dialogOverlay.addEventListener('click', handleOverlayClick);

        activeDialog = {
          container: dialogContainer,
          content: dialogContent,
          name: dialogName,
          options: finalOptions,
          resources: { js: [], css: [] },
          component: null,
          scope: {},
          previousDialog: previousDialog
        };

        processDialogContent(cleanHtml, dialogName, dialogContent);

        setTimeout(() => {
          dialogOverlay.classList.add('dialog-overlay-visible');
          dialogContainer.classList.add('dialog-container-visible');
        }, 10);

        setTimeout(() => {
          dialogContainer.focus();
          const focusable = dialogContainer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (focusable) focusable.focus();
        }, 50);
      })
      .catch(error => {
        console.error('Failed to open dialog:', error);
      });

    return null;
  }

  function fetchDialogTemplate(dialogId) {
    const normalizedDialogId = dialogId.replace(/\\/g, '/');
    
    if (normalizedDialogId === 'confirm') {
      return Promise.resolve(templateCache.get('confirm'));
    }
    
    if (templateCache.has(normalizedDialogId)) {
      return Promise.resolve(templateCache.get(normalizedDialogId));
    }
    
    const paths = [
      `${lightBind.dialogsPath}/${normalizedDialogId}/template.html`,
      `${lightBind.dialogsPath}/${normalizedDialogId}.html`
    ];
    
    return tryNextPath(0);
    
    function tryNextPath(index) {
      if (index >= paths.length) {
        return Promise.reject(new Error(`Failed to load dialog ${dialogId}`));
      }
      
      return fetch(paths[index])
        .then(response => {
          if (response.ok) {
            return response.text().then(text => {
              templateCache.set(normalizedDialogId, text);
              return text;
            });
          }
          return tryNextPath(index + 1);
        })
        .catch(() => tryNextPath(index + 1));
    }
  }

  function processDialogContent(html, dialogId, contentElement) {
    contentElement.innerHTML = html;
    
    const normalizedDialogId = dialogId.replace(/\\/g, '/');
    const basePath = getDialogPath(normalizedDialogId);
    
    const cssPromises = processCss(dialogId, contentElement, basePath);
    const jsPromises = processJs(dialogId, contentElement, basePath);
    
    Promise.all([...cssPromises, ...jsPromises])
      .then(() => initializeLightBind(dialogId, contentElement))
      .catch(() => initializeLightBind(dialogId, contentElement));
  }

  function processCss(dialogId, contentElement, basePath) {
    const promises = [];
    let stylesFound = false;
    
    function addStyle(css, source) {
      const style = document.createElement('style');
      style.textContent = css;
      style.dataset.dialogCss = dialogId;
      style.dataset.cssSource = source;
      document.head.appendChild(style);
      activeDialog.resources.css.push(style);
      return style;
    }
    
    const embeddedStyles = contentElement.querySelectorAll('style');
    if (embeddedStyles.length > 0) {
      stylesFound = true;
      embeddedStyles.forEach((styleEl, i) => addStyle(styleEl.textContent, `embedded-${i}`));
    }
    
    const linkElements = contentElement.querySelectorAll('link[rel="stylesheet"]');
    if (linkElements.length > 0) {
      stylesFound = true;
      linkElements.forEach((linkEl, i) => {
        const href = linkEl.getAttribute('href');
        if (href) {
          promises.push(
            fetch(href)
              .then(r => r.ok ? r.text() : null)
              .then(css => css && addStyle(css, `linked-${i}`))
              .catch(() => {})
          );
        }
      });
    }
    
    if (!stylesFound) {
      promises.push(
        fetch(`${basePath}/style.css`)
          .then(r => r.ok ? r.text() : null)
          .then(css => css && addStyle(css, 'external'))
          .catch(() => {})
      );
    }
    
    return promises;
  }

  function processJs(dialogId, contentElement, basePath) {
    const promises = [];
    let scriptsFound = false;
    
    if (dialogId === 'confirm') {
      return promises;
    }
    
    const inlineScripts = contentElement.querySelectorAll('script:not([src])');
    if (inlineScripts.length > 0) {
      scriptsFound = true;
      inlineScripts.forEach(script => {
        if (script.textContent) {
          executeScriptContent(script.textContent, dialogId);
        }
        script.parentNode.removeChild(script);
      });
    }
    
    const srcScripts = contentElement.querySelectorAll('script[src]');
    if (srcScripts.length > 0) {
      scriptsFound = true;
      srcScripts.forEach(script => {
        const src = script.getAttribute('src');
        if (src) {
          promises.push(
            fetch(src)
              .then(r => r.ok ? r.text() : null)
              .then(js => js && executeScriptContent(js, dialogId))
              .catch(() => {})
          );
          script.parentNode.removeChild(script);
        }
      });
    }
    
    if (!scriptsFound) {
      promises.push(
        fetch(`${basePath}/script.js`)
          .then(r => r.ok ? r.text() : null)
          .then(js => js && executeScriptContent(js, dialogId))
          .catch(() => {})
      );
    }
    
    return promises;
  }
 
  function executeScriptContent(js, dialogId) {
    try {
      const extracted = extractFirstFunction(js);
      if (extracted) {
        // const fn = eval(`(${extracted.fullFunction})`);
        const fn = new Function('return (' + extracted.fullFunction + ')')();
        functionRegistry.set(dialogId, fn);
      }
    } catch (error) {
      log('error', 'Error processing dialog script:', error);
    }
  }

  function initializeLightBind(dialogId, contentElement) {
    function setupComponent(element) {
      if (!lightBind.initializeComponent) return null;

      const dialogFunction = getDialogFunction(dialogId);
      if (!dialogFunction) return null;
      
      const component = lightBind.initializeComponent(element, dialogFunction, activeDialog.options);
      if (!component || !component.scope || !activeDialog) return null;
      
      component.scope.closeDialog = (result) => close(result);
      component.scope.getDialogContainer = () => activeDialog.container;
      component.scope.getDialogOptions = () => activeDialog.options;
      
      activeDialog.scope = component.scope;
      activeDialog.component = component;
      
      return component;
    }
    
    const bindElements = contentElement.querySelectorAll('[bind-function]');
    let component = null;
    
    if (bindElements.length === 0) {
      const dialogRoot = contentElement.querySelector('.dialog') || contentElement;
      const bindFunctionName = `dialog_${dialogId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      dialogRoot.setAttribute('bind-function', bindFunctionName);
      component = setupComponent(dialogRoot);
    } else {
      component = setupComponent(bindElements[0]);
    }
    
    if (component) {
      setTimeout(() => {
        try {
          lightBind.digest(component);
        } catch (err) {
          log('error', `Digest error: ${err.message}`);
        }
      }, 0);
    }
  }

  function getDialogPath(dialogId) {
    const lastSlashIndex = dialogId.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      return `${lightBind.dialogsPath}/${dialogId}`;
    }
    
    const dialogPath = dialogId.substring(0, lastSlashIndex);
    const dialogName = dialogId.substring(lastSlashIndex + 1);
    return `${lightBind.dialogsPath}/${dialogPath}/${dialogName}`;
  }

  function close(result) {
    if (!activeDialog) return;

    const closeOverBtnRequired = activeDialog.options.forceCloseButton;
    const notificationFn = lightBind.notification?.error || console.warning;

    if ((result === 'escape-pressed' || result === 'overlay-click') && closeOverBtnRequired) {
      return notificationFn('Dialog close button is required, but no result provided.');
    }

    if (activeDialog.scope && activeDialog.scope.onClose) activeDialog.scope.onClose()
    
    closeDialogInternal();
  }

  function closeDialogInternal() {
    if (!activeDialog) return;

    const isConfirm = activeDialog.name === 'confirm';
    const previousDialog = isConfirm ? activeDialog.previousDialog : false;

    activeDialog.container.classList.remove('dialog-container-visible');

     if (activeDialog.container && activeDialog.container.parentNode) {
        activeDialog.container.parentNode.removeChild(activeDialog.container);
      }

      [...activeDialog.resources.js, ...activeDialog.resources.css].forEach(resource => {
        if (resource && resource.parentNode) {
          resource.parentNode.removeChild(resource);
        }
      });

      if (!previousDialog) {
        dialogOverlay.classList.remove('dialog-overlay-visible');
        dialogOverlay.removeEventListener('click', handleOverlayClick);
        dialogOverlay.style.display = 'none';
        activeDialog = null;
      } else {
        activeDialog = previousDialog;
      }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && activeDialog) {
      event.preventDefault();
      close('escape-pressed');
    }
  }

  function handleOverlayClick(event) {
    if (event.target === dialogOverlay) close('overlay-click');
  }

  function clearCache() {
    templateCache.clear();
    functionRegistry.clear();
  }

  function confirm(text, onSuccess) {
    return open('confirm', { text, onSuccess });
  }

  init();

  return { open, close, clearCache, confirm };
}
