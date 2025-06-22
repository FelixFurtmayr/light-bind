// Import the styles from the separate file
import { DIALOG_STYLES, SIZECLASSES } from './dialog-styles.js';

// Confirm dialog template stored inline
const CONFIRM_DIALOG_TEMPLATE = `
<div class="dialog dialog-medium" bind-function="confirmDialog">
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
    animationDuration: 300
  };

  function extractFirstFunction(scriptContent) {
    try {
      // Trim whitespace to avoid issues with leading spaces
      const trimmedContent = scriptContent.trim();
      
      // Find the first function declaration
      const functionMatch = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*{/.exec(trimmedContent);
      
      if (!functionMatch) {
        throw new Error("No function declaration found in the script content");
      }
      
      const functionName = functionMatch[1];
      const params = functionMatch[2].split(',').map(p => p.trim());
      const startIndex = functionMatch.index;
      
      // Find the opening brace position
      const openingBracePos = trimmedContent.indexOf('{', startIndex);
      if (openingBracePos === -1) {
        throw new Error(`Opening brace not found for function '${functionName}'`);
      }
      
      // Track braces to find the matching closing brace
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
      
      // Extract the full function and its body
      const fullFunction = trimmedContent.substring(startIndex, position);
      const body = trimmedContent.substring(openingBracePos + 1, position - 1);
      
      return {
        name: functionName,
        params: params,
        body: body,
        fullFunction: fullFunction
      };
    } catch (error) {
      // Add context to the error for better debugging
      if (error.message.includes('Function')) {
        throw error; // Rethrow our custom errors
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
    
    // Register the confirmDialog function
    functionRegistry.set('confirm', function confirmDialog(data, { onSuccess, text }) {
      data.continue = function () {
        if (onSuccess) onSuccess();
        data.closeDialog('confirmed');
      };
      data.text = text || 'Are you sure you want to proceed?';
    });
    
    // Cache the confirm dialog template
    templateCache.set('confirm', CONFIRM_DIALOG_TEMPLATE);
  }

  function getDialogFunction(dialogId) {
    return functionRegistry.has(dialogId) ? functionRegistry.get(dialogId) : null;
  }

  function open(dialogName, optionsOrCallback = {}, callback = null) {
    init();
    log('dialog', `Opening dialog: ${dialogName}`);

    // Check if a dialog is already active, with exception for 'confirm' dialog
    if (activeDialog && dialogName !== 'confirm') {
      throw new Error(`Cannot open dialog '${dialogName}' while another dialog is active`);
    }

    let dialogOptions = { ...DEFAULTOPTIONS };
    if (typeof optionsOrCallback === 'function') {
      callback = optionsOrCallback;
    } else {
      dialogOptions = { ...dialogOptions, ...optionsOrCallback };
      dialogOptions.sizeExplicitlySet = 'size' in optionsOrCallback;
    }

    if (callback) dialogOptions.onSuccess = callback;

    // Save previous dialog if opening a confirm dialog
    let previousDialog = null;
    if (dialogName === 'confirm' && activeDialog) {
      previousDialog = activeDialog;
    } else if (activeDialog) {
      closeDialogInternal();
    }

    // Create container
    const dialogContainer = document.createElement('div');
    dialogContainer.className = `dialog-container ${SIZECLASSES[dialogOptions.size] || SIZECLASSES.small}`;
    dialogContainer.dataset.dialogName = dialogName;
    dialogContainer.dataset.forceClose = dialogOptions.forceCloseButton.toString();
    
    // Add higher z-index for confirm dialog if it's on top of another dialog
    if (dialogName === 'confirm' && previousDialog) {
      dialogContainer.style.zIndex = "9002"; // One higher than the standard
    }

    // Create header if needed
    if (dialogOptions.title || dialogOptions.showCloseButton) {
      const dialogHeader = document.createElement('div');
      dialogHeader.className = 'dialog-header';

      if (dialogOptions.title) {
        const dialogTitle = document.createElement('h2');
        dialogTitle.className = 'dialog-title';
        dialogTitle.textContent = dialogOptions.title;
        dialogHeader.appendChild(dialogTitle);
      }

      if (dialogOptions.showCloseButton) {
        const closeButton = document.createElement('button');
        closeButton.className = 'dialog-close-btn';
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('aria-label', 'Close dialog');
        closeButton.addEventListener('click', () => close());
        dialogHeader.appendChild(closeButton);
      }

      dialogContainer.appendChild(dialogHeader);
    }

    // Create content
    const dialogContent = document.createElement('div');
    dialogContent.className = 'dialog-content';
    dialogContent.innerHTML = '<div class="dialog-loading">Loading...</div>';
    dialogContainer.appendChild(dialogContent);

    // Show dialog
    dialogOverlay.style.display = 'block';
    document.body.appendChild(dialogContainer);
    dialogOverlay.addEventListener('click', handleOverlayClick);

    activeDialog = {
      container: dialogContainer,
      content: dialogContent,
      name: dialogName,
      options: dialogOptions,
      resources: { js: [], css: [] },
      component: null,
      scope: {},
      previousDialog: previousDialog
    };

    loadDialogContent(dialogName, dialogContent);

    // Animation
    setTimeout(() => {
      dialogOverlay.classList.add('dialog-overlay-visible');
      dialogContainer.classList.add('dialog-container-visible');
    }, 10);

    // Focus management
    setTimeout(() => {
      dialogContainer.focus();
      const focusable = dialogContainer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }, 50);

    return dialogContainer;
  }

  function fetchDialogTemplate(dialogId) {
    const normalizedDialogId = dialogId.replace(/\\/g, '/');
    
    // Special case for confirm dialog
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
    
    // Try paths sequentially
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

  function loadDialogContent(dialogId, contentElement) {
    fetchDialogTemplate(dialogId)
      .then(html => {
        if (html) {
          processDialogTemplate(html, dialogId, contentElement);
        } else {
          contentElement.innerHTML = `<div class="dialog-error">Failed to load dialog: ${dialogId}</div>`;
        }
      })
      .catch(error => {
        contentElement.innerHTML = `<div class="dialog-error">Error loading dialog: ${error.message}</div>`;
      });
  }
  
  function processDialogTemplate(html, dialogId, contentElement) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html.trim();
    
    processDialogTitle(tempDiv, dialogId);
    processDialogSize(tempDiv);
    
    // Set content
    contentElement.innerHTML = tempDiv.innerHTML;
    
    // Process resources
    const normalizedDialogId = dialogId.replace(/\\/g, '/');
    const basePath = getDialogPath(normalizedDialogId);
    
    const cssPromises = processCss(dialogId, contentElement, basePath);
    const jsPromises = processJs(dialogId, contentElement, basePath);
    
    // Initialize after resources load
    Promise.all([...cssPromises, ...jsPromises])
      .then(() => initializeLightBind(dialogId, contentElement))
      .catch(() => initializeLightBind(dialogId, contentElement)); // Still initialize on error
  }

  function processDialogTitle(tempDiv, dialogId) {
    const titleElement = tempDiv.querySelector('title');
    if (titleElement && titleElement.textContent && !activeDialog.options.title) {
      setDialogTitle(titleElement.textContent.trim());
      titleElement.parentNode.removeChild(titleElement);
    } else if (!activeDialog.options.title) {
      const autoTitle = dialogId.replace(/[-_/\\]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      setDialogTitle(autoTitle);
    }
  }

  function setDialogTitle(title) {
    const headerEl = activeDialog.container.querySelector('.dialog-header');
    if (headerEl) {
      const titleEl = headerEl.querySelector('.dialog-title');
      if (titleEl) {
        titleEl.textContent = title;
      } else {
        const newTitleEl = document.createElement('h2');
        newTitleEl.className = 'dialog-title';
        newTitleEl.textContent = title;
        headerEl.insertBefore(newTitleEl, headerEl.firstChild);
      }
    }
  }

  function processDialogSize(tempDiv) {
    const rootElement = tempDiv.querySelector('.dialog');
    if (rootElement && rootElement.classList && !activeDialog.options.sizeExplicitlySet) {
      const sizeClass = Array.from(rootElement.classList).find(cls =>
        ['dialog-small', 'dialog-medium', 'dialog-large', 'dialog-fullscreen'].includes(cls)
      );

      if (sizeClass) {
        Object.values(SIZECLASSES).forEach(cls => {
          activeDialog.container.classList.remove(cls);
        });
        activeDialog.container.classList.add(sizeClass);
      }
    }
  }

  function processCss(dialogId, contentElement, basePath) {
    const promises = [];
    let stylesFound = false;
    
    // Helper to add style to head
    function addStyle(css, source) {
      const style = document.createElement('style');
      style.textContent = css;
      style.dataset.dialogCss = dialogId;
      style.dataset.cssSource = source;
      document.head.appendChild(style);
      activeDialog.resources.css.push(style);
      return style;
    }
    
    // Process embedded styles
    const embeddedStyles = contentElement.querySelectorAll('style');
    if (embeddedStyles.length > 0) {
      stylesFound = true;
      embeddedStyles.forEach((styleEl, i) => addStyle(styleEl.textContent, `embedded-${i}`));
    }
    
    // Process link tags
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
    
    // Try external CSS if no styles found
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
    
    // Skip JS processing for confirm dialog as it's already registered
    if (dialogId === 'confirm') {
      return promises;
    }
    
    // Process inline scripts
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
    
    // Process external scripts
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
    
    // Try external JS if no scripts found
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
        // Instead of creating with new Function, evaluate the entire function
        // This preserves the destructuring syntax
        const fn = eval(`(${extracted.fullFunction})`);
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
      
      // Add helper methods
      component.scope.closeDialog = (result) => close(result);
      component.scope.getDialogContainer = () => activeDialog.container;
      component.scope.getDialogOptions = () => activeDialog.options;
      
      // Store references
      activeDialog.scope = component.scope;
      activeDialog.component = component;
      
      return component;
    }
    
    // Find binding elements
    const bindElements = contentElement.querySelectorAll('[bind-function]');
    let component = null;
    
    if (bindElements.length === 0) {
      // Use dialog root if no bind-function elements
      const dialogRoot = contentElement.querySelector('.dialog') || contentElement;
      const bindFunctionName = `dialog_${dialogId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      dialogRoot.setAttribute('bind-function', bindFunctionName);
      component = setupComponent(dialogRoot);
    } else {
      // Use first bind-function element
      component = setupComponent(bindElements[0]);
    }
    
    // Trigger digest
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

    // Check if this is a confirm dialog and there's a previous dialog to restore
    const isConfirm = activeDialog.name === 'confirm';
    const previousDialog = isConfirm ? activeDialog.previousDialog : null;

    // Start animation
    activeDialog.container.classList.remove('dialog-container-visible');
    
    // Only remove overlay visibility if not restoring a previous dialog
    if (!previousDialog) {
      dialogOverlay.classList.remove('dialog-overlay-visible');
    }

    // Cleanup after animation
    setTimeout(() => {
      // Remove container
      if (activeDialog.container && activeDialog.container.parentNode) {
        activeDialog.container.parentNode.removeChild(activeDialog.container);
      }

      // Clean up resources
      [...activeDialog.resources.js, ...activeDialog.resources.css].forEach(resource => {
        if (resource && resource.parentNode) {
          resource.parentNode.removeChild(resource);
        }
      });

      // If no previous dialog to restore, remove event listeners and hide overlay
      if (!previousDialog) {
        dialogOverlay.removeEventListener('click', handleOverlayClick);
        dialogOverlay.style.display = 'none';
        activeDialog = null;
      } else {
        // Restore previous dialog
        activeDialog = previousDialog;
      }
    }, activeDialog.options.animationDuration);
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

  // Add a convenience method for confirm dialogs
  function confirm(text, onSuccess) {
    return open('confirm', { text, onSuccess });
  }

  init();

  // Public API
  return { open, close, clearCache, confirm };
}
