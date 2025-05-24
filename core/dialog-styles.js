// dialog-styles.js
export const DIALOG_STYLES = `
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 9000;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .dialog-overlay-visible {
    opacity: 1;
  }
  
  .dialog-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    background-color: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    z-index: 9001;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
    overflow: hidden;
  }
  
  .dialog-container-visible {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  
  .dialog-small {
    width: 400px;
  }
  
  .dialog-medium {
    width: 600px;
  }
  
  .dialog-large {
    width: 1200px;
  }
  
  .dialog-fullscreen {
    width: calc(100vw - 32px);
    height: calc(100vh - 32px);
  }
  
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .dialog-title {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: #333;
  }
  
  .dialog-close-btn {
    background: none;
    border: none;
    font-size: 24px;
    line-height: 1;
    color: #666;
    cursor: pointer;
    padding: 0;
    margin: 0;
    width: 24px;
    height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }
  
  .dialog-close-btn:hover {
    background-color: rgba(0, 0, 0, 0.1);
    color: #333;
  }
  
  .dialog-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .dialog-content > * {
    width: 100%;
  }
  
  .dialog-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100px;
    color: #666;
    font-style: italic;
  }
    
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
  }

  /*
  .btn {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
    
  .btn-primary {
    background-color: #3498db;
    color: white;
  }

  .btn-secondary {
    background-color: #e0e0e0;
    color: #333;
  }
  */
  
  @media (max-width: 768px) {
    .dialog-small, 
    .dialog-medium, 
    .dialog-large {
      width: calc(100vw - 32px);
    }
    
    .dialog-header {
      padding: 12px;
    }
    
    .dialog-content {
      padding: 12px;
    }
  }
`;

export const SIZECLASSES = {
  small: 'dialog-small',
  medium: 'dialog-medium',
  large: 'dialog-large',
  fullscreen: 'dialog-fullscreen'
};
