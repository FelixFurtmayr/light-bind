# LightBind Modules

## HTTP Client

```javascript
// Configuration
http.init({
  apiPath: '/api/',
  timeout: 30000,
  autoRefresh: true,
  
  processRequest: (request) => {
    const token = localStorage.getItem('token');
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
  },
  
  handleResponseStatus: {
    401: () => window.location.href = '/login',
    403: () => notification.error('Permission denied')
  }
});

// Making Requests
http.get('users').then(users => {
  scope.users = users;
  scope.$refresh();
});
http.post('users', {
  name: 'John Doe',
  email: 'john@example.com'
});
http.put('users/123', userData);
http.delete('users/123');
```


## Dialog System

```javascript
// Open a dialog
dialog.open('confirm-delete', {
  // given inputs will be available in the second parameter of the bind directive as inputs
  title: 'Confirm Action',
  size: 'small', // small, medium, large, fullscreen
  showCloseButton: true,
  forceCloseButton: false
}, result => {
  if (result) deleteItem(result.id);
});

// Close the current dialog with a result
dialog.close({ success: true, id: 123 });

```

### Dialog Template (/dialogs/confirm-delete.html)

```html
<div class="dialog" bind-function="initDialog">
  <p>Are you sure you want to delete this item?</p>
  <div class="dialog-actions">
    <button on-click="closeDialog()">Cancel</button>
    <button on-click="confirm()">Delete</button>
  </div>
</div>
<script>
function initDialog(scope, input, html) {
  scope.confirm = () => {
   input.onSuccess();
   closeDialog();
  };
}
</script>
<style>
   .dialog-actions{}
</style>
```

## Notification System

```javascript
// Basic notification
notification.show('Operation completed', 'info');

// Different types with default settings
notification.success('Item saved successfully');
notification.error('An error occurred');
notification.warning('Your session will expire soon');
notification.info('New features available');

// With options
notification.show({
  message: 'Custom notification',
  type: 'info',
  duration: 8000
});

notification.dismissAll(); // remove all
```

## Storage System

```javascript
// Save 
storage.set('user-settings', {
  theme: 'dark',
  fontSize: 16
});

// Get data with default fallback
const settings = storage.get('user-settings', {
  theme: 'light',
  fontSize: 14
});

if (storage.has('auth-token')) {} // key exists?
storage.remove('temp-data'); // remove one key
storage.clear(); // Clear complete
```

## Using Together

```javascript
function UserProfile(scope) {
  // Load user data
  http.get('users/current')
    .then(userData => {
      scope.user = userData;
      scope.$refresh();
    })
    .catch(() => notification.error('Failed to load user data'));
    
  // Save user data
  scope.saveProfile = () => {
    http.put('users/current', scope.user)
      .then(() => {
        notification.success('Profile updated');
        storage.set('user-cache', scope.user);
      })
      .catch(() => dialog.open('error-dialog'));
  };
}
```
