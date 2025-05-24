const LightBindNotification = (function () {
  // Keep track of notifications
  let notificationQueue = [];
  let notificationSpacing = 10;
  let notificationStyles = false;

  function injectStyles() {
    if (notificationStyles) return;

    const style = document.createElement('style');
    style.textContent = `
       .notification-container {
         position: fixed;
         top: 50px;
         left: 50%;
         transform: translateX(-50%);
         padding: 10px 20px;
         color: white;
         border-radius: 4px;
         box-shadow: 0 2px 4px rgba(0,0,0,0.2);
         z-index: 10000;
         cursor: pointer;
         text-align: center;
         min-width: 200px;
         max-width: 90%;
       }
     `;
    document.head.appendChild(style);
    notificationStyles = true;
  }

  function showNotification(message) {
    injectStyles();

    if (typeof message !== 'object') {
      message = {
        content: message,
        type: type || 'info'
      };
    }

    let type = message.type || 'info';

    // Determine color based on type
    const color = type === 'error' ? 'red' :
      type === 'warning' ? '#ff9800' :
        type === 'info' ? '#2196F3' : '#4CAF50';


    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} notification-container`;
    notification.textContent = message.content;
    notification.style.backgroundColor = color;
    notification.style.top = '-100px';
    notification.style.opacity = '0';
    notification.style.transition = 'all 0.3s ease-in-out';

    // Generate unique ID
    const notificationId = Date.now() + Math.random().toString(36).substr(2, 5);
    notification.dataset.notificationId = notificationId;

    // Log to console
    console.log(`%cNotification: ${type} - ${message.content}`, `color: ${color}; font-weight: bold;`);

    // Add to document
    document.body.appendChild(notification);

    /**
     * Position all notifications in the queue
     */
    function positionNotifications() {
      let topPosition = 20;
      notificationQueue.forEach((notification) => {
        const elem = notification.element;
        const height = elem.offsetHeight || 50;
        elem.style.top = `${topPosition}px`;
        elem.style.transform = 'translateX(-50%)';
        topPosition += height + notificationSpacing;
      });
    }

    function removeNotification(notificationId) {
      const index = notificationQueue.findIndex(n => n.id === notificationId);
      if (index === -1) return;

      const notification = notificationQueue[index];
      clearTimeout(notification.timer);
      notification.element.style.opacity = '0';
      notification.element.style.transform = 'translateY(-20px) translateX(-50%)';

      setTimeout(() => {
        if (notification.element.parentNode) {
          notification.element.parentNode.removeChild(notification.element);
        }
        notificationQueue.splice(index, 1);
        positionNotifications();
      }, 300);
    }

    // Add to queue
    notificationQueue.push({
      element: notification,
      id: notificationId,
      timer: setTimeout(() => removeNotification(notificationId), 5000)
    });

    // Position notifications
    positionNotifications();

    // Add click handler
    notification.addEventListener('click', () => removeNotification(notificationId));

    // Trigger animation
    setTimeout(() => { notification.style.opacity = '1'; }, 10);

    return notificationId;
  }

  function dismissAll() {
    const notifications = [...notificationQueue];
    notifications.forEach(notification => {
      const notificationId = notification.id;
      clearTimeout(notification.timer);
      notification.element.style.opacity = '0';
      notification.element.style.transform = 'translateY(-20px) translateX(-50%)';

      setTimeout(() => {
        if (notification.element.parentNode) {
          notification.element.parentNode.removeChild(notification.element);
        }
        const index = notificationQueue.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          notificationQueue.splice(index, 1);
        }
      }, 300);
    });
  }

  // Helper methods for different notification types
  function success(message) {
    if (typeof message === 'string') message = { content: message };
    message.type = 'success';
    return showNotification(message);
  }

  function error(message) {
    if (typeof message === 'string') message = { content: message };
    message.type = 'error';
    return showNotification(message);
  }

  function warning(message) {
    if (typeof message === 'string') message = { content: message };
    message.type = 'warning';
    return showNotification(message);
  }

  function info(message) {
    if (typeof message === 'string') message = { content: message };
    message.type = 'info';
    return showNotification(message);
  }

  // Public API
  return {
    show: showNotification,
    success: success,
    error: error,
    warning: warning,
    info: info,
    dismissAll: dismissAll
  };
})();

export default LightBindNotification;
