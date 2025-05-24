import { BaseDirective } from './base-directive.js';

class BindUploadDirective extends BaseDirective {
  constructor(lightBind) {
    super(lightBind);
    
    // Add styles to document
    if (!document.getElementById('bind-upload-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'bind-upload-styles';
      styleElement.textContent = `
        /* Styles for bind-upload directive */
        .bind-upload-zone {
          position: relative;
          display: block;
        }
        
        .bind-upload-zone.default-style {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          transition: all 0.2s ease;
        }
        
        .bind-upload-zone.drag-active {
          border-color: #007bff;
          background-color: rgba(0, 123, 255, 0.05);
        }
        
        .bind-upload-zone .hidden-drop-layer {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: rgba(240, 240, 240, 0.6);
          display: none;
          pointer-events: none;
        }
        
        .bind-upload-zone .file-select {
          color: #007bff;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .bind-upload-zone.default-style .file-select:hover {
          color: #0056b3;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }

  process(element, expression, component) {

    let lightBind = this.lightBind

    lightBind.log('debug', `Setting up bind-upload with handler: ${expression}`);
    
    // Extract attributes
    const multiple = element.getAttribute('multiple') === 'true';
    const dragEnabled = element.getAttribute('drag') !== 'false';
    const fileSelectEnabled = element.getAttribute('fileselect') !== 'false';
    const fileSizeLimit = element.getAttribute('file-size-limit') ? 
                          parseInt(element.getAttribute('file-size-limit')) : null;
    const readAsText = element.getAttribute('read-as-text') === 'true';
    const dataExpr = element.getAttribute('data');
    
    // Create hidden input for file selection
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    hiddenInput.multiple = multiple;
    hiddenInput.style.display = 'none';
    element.appendChild(hiddenInput);
    
    // Create hidden drop layer for visual feedback
    const hiddenDropLayer = document.createElement('div');
    hiddenDropLayer.className = 'hidden-drop-layer';
    element.appendChild(hiddenDropLayer);
    
    // Mark the element as an upload zone
    element.classList.add('bind-upload-zone');
    
    // Find or handle file select element
    let fileSelectElement = null;


    
    // Setup file handling
    const handleFiles = (files) => {
      const fileInfos = [];
      let processedCount = 0;
      
      // Process file one by one
      function processNextFile(index) {
        if (index >= files.length) {
          // All files processed
          const additionalData = dataExpr ? lightBind.evaluateExpression(dataExpr, component.scope) : null;
            
          // Call the upload handler in the scope
          if (component.scope[expression]) {
            component.scope[expression](fileInfos, additionalData);
            lightBind.digest(component);
          }
          return;
        }
        
        const file = files[index];
        
        // Check file size limit
        if (fileSizeLimit && file.size > fileSizeLimit * 1000000) {
          lightBind.log('warn', `File size exceeds limit of ${fileSizeLimit}MB: ${file.name}`);
          processNextFile(index + 1);
          return;
        }
        
        // Read file content
        const reader = new FileReader();
        
        reader.onload = function() {
          const content = readAsText ? reader.result : new Uint8Array(reader.result);
          
          // Extract file information
          const fileInfo = {
            filename: file.name,
            shortName: file.name.replace(/\.[^/.]+$/, ''),
            extension: file.name.split('.').pop(),
            size: file.size,
            mimetype: file.type,
            content: content
          };
          
          fileInfos.push(fileInfo);
          processNextFile(index + 1);
        };
        
        reader.onerror = function() {
          lightBind.log('error', `Error reading file: ${file.name}`);
          processNextFile(index + 1);
        }.bind(this);
        
        if (readAsText) {
          reader.readAsText(file);
        } else {
          reader.readAsArrayBuffer(file);
        }
      }
      
      // Start processing the first file
      processNextFile(0);
    };
    
    // Setup click-to-upload
    const setupFileSelect = () => {
      // Find file-select element if it exists
      fileSelectElement = element.querySelector('.file-select');
      
      hiddenInput.addEventListener('change', function() {
        handleFiles(hiddenInput.files);
        // Reset input to allow selecting the same file again
        hiddenInput.value = '';
      });
      
      if (fileSelectElement) {
        // Use designated element to trigger file selection
        fileSelectElement.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          hiddenInput.click();
        });
      } else if (fileSelectEnabled) {
        // Use the entire element to trigger file selection
        element.addEventListener('click', function() {
          hiddenInput.click();
        });
      }
    };
    
    // Setup drag and drop
    const setupDragAndDrop = () => {
      let dragActive = false;
      let dragStartedInside = false;
      
      // Track if drag started inside this element
      element.addEventListener('dragstart', function() {
        dragStartedInside = true;
      });
      
      element.addEventListener('dragend', function() {
        dragStartedInside = false;
      });
      
      // Handle drag enter
      element.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (dragStartedInside) return;
        
        hiddenDropLayer.style.display = 'block';
        element.classList.add('drag-active');
        dragActive = true;
      });
      
      // Handle drag leave
      element.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const rect = element.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        // Check if mouse left the element boundaries
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
          hiddenDropLayer.style.display = 'none';
          element.classList.remove('drag-active');
          dragActive = false;
        }
      });
      
      // Handle drag over (prevent default to allow drop)
      element.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
      });
      
      // Handle drop
      element.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        hiddenDropLayer.style.display = 'none';
        element.classList.remove('drag-active');
        
        if (!dragStartedInside && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFiles(e.dataTransfer.files);
        }
      });
    };
    
    // Initialize after a short delay to ensure all child elements are available
    setTimeout(function() {
      setupFileSelect();
      if (dragEnabled) {
        setupDragAndDrop();
      }
    }, 0);
    
    return { success: true };
  }
}

export { BindUploadDirective };
