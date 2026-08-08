import { BaseDirective } from './base-directive.js';

class BindUploadDirective extends BaseDirective {
  constructor(lightBind) {
    super(lightBind);

    if (!document.getElementById('bind-upload-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'bind-upload-styles';
      styleElement.textContent = `
        .bind-upload-zone {
          position: relative;
        }

        .bind-upload-zone.default-style {
          display: block;
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

    const multiple = element.getAttribute('multiple') === 'true';
    const dragEnabled = element.getAttribute('drag') !== 'false';
    const fileSelectEnabled = element.getAttribute('fileselect') !== 'false';
    const fileSizeLimit = element.getAttribute('file-size-limit') ?
                          parseInt(element.getAttribute('file-size-limit')) : null;
    const readAsText = element.getAttribute('read-as-text') === 'true';
    const dataExpr = element.getAttribute('data');

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    hiddenInput.multiple = multiple;
    hiddenInput.style.display = 'none';
    element.appendChild(hiddenInput);

    const hiddenDropLayer = document.createElement('div');
    hiddenDropLayer.className = 'hidden-drop-layer';
    element.appendChild(hiddenDropLayer);

    element.classList.add('bind-upload-zone');

    let fileSelectElement = null;

    const handleFiles = (fileList) => {
      const files = Array.from(fileList);
      const fileInfos = [];

      function processNextFile(index) {
        if (index >= files.length) {
          const additionalData = dataExpr ? lightBind.evaluateExpression(dataExpr, component.scope) : null;
          if (component.scope[expression]) {
            component.scope[expression](fileInfos, additionalData);
            lightBind.digest(component);
          }
          return;
        }

        const file = files[index];

        if (fileSizeLimit && file.size > fileSizeLimit * 1000000) {
          lightBind.log('warn', `File size exceeds limit of ${fileSizeLimit}MB: ${file.name}`);
          processNextFile(index + 1);
          return;
        }

        const reader = new FileReader();

        reader.onload = function() {
          const content = readAsText ? reader.result : new Uint8Array(reader.result);

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

      processNextFile(0);
    };

    const setupFileSelect = () => {
      fileSelectElement = element.querySelector('.file-select');

      hiddenInput.addEventListener('change', function() {
        handleFiles(hiddenInput.files);
        hiddenInput.value = '';
      });

      if (fileSelectElement) {
        fileSelectElement.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          hiddenInput.click();
        });
      } else if (fileSelectEnabled) {
        element.addEventListener('click', function() {
          hiddenInput.click();
        });
      }
    };

    const setupDragAndDrop = () => {
      let dragActive = false;
      let dragStartedInside = false;

      element.addEventListener('dragstart', function() {
        dragStartedInside = true;
      });

      element.addEventListener('dragend', function() {
        dragStartedInside = false;
      });

      element.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (dragStartedInside) return;
        hiddenDropLayer.style.display = 'block';
        element.classList.add('drag-active');
        dragActive = true;
      });

      element.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const rect = element.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
          hiddenDropLayer.style.display = 'none';
          element.classList.remove('drag-active');
          dragActive = false;
        }
      });

      element.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
      });

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
