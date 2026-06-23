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

### Dialog Template (/dialog/confirm-delete.html)

```html

<!-- dialog options here in this tag, if wanted: -->
<dialog-config size="xl" show-header="false" force-close-button="true" />

<div class="dialog" bind-function="initDialog">
  <p>Are you sure you want to delete this item?</p>
  <div class="dialog-actions">
    <button on-click="closeDialog()">Cancel</button>
    <button on-click="confirm()">Delete</button>
  </div>
</div>
<script>
function ConfirmDelete(scope, params) {
  const onSuccess = params.onSuccess || (() => {});
  scope.confirm = function () {
    onSuccess();
    scope.closeDialog('confirmed');
  };
}
</script>
<style>
   .dialog-actions{}
</style>
```

#### opening a dialog

Info: the dialog can also have style.css and script.js separate as files, but in the simplest for all is just put into template.html


```js
  dialog.open('admin/edit-workflow', function () {}, { });

  dialog.open('admin/edit-workflow', { options}, function  (){

  });

  // special short term - very useful to confirm a delete
  dialog.confirm('Should the box be white?', function () {}, { });

  dialog.open('user-edit', {
    userId: 123,
    mode: 'edit',
  }, result => {
    if (result) refreshList();
  });


  // example of how to use the success function with the dialog to return something
  function UserEdit(scope, params) {
    const onSuccess = params.onSuccess || (() => {});
    const user      = params.data || {};   // your custom data lives under params.data

    scope.userId = user.id;
    scope.mode   = params.mode;  // or any other key passed directly

    scope.btnClick = function (){
       onSuccess({ text: 'btn clicked' });
    };

  }

```


#### dialog options
```html
<dialog-config
  size="medium"
  show-header="true"
  show-close-button="true"
  force-close-button="false"
  animation-duration="300"
/>
```

| Attribute | Type | Default | Description |
|---|---|---|---|
| `size` | string | `small` | `small` / `medium` / `large` / `xl` / `fullscreen` |
| `show-header` | bool | `true` | Show the dialog header bar with title and close button |
| `show-close-button` | bool | `true` | Show the × close button in the header |
| `force-close-button` | bool | `false` | If true, clicking overlay or pressing Escape does NOT close – only the close button does |
| `animation-duration` | number | `300` | Open/close animation in milliseconds |

`title` can be passed via `dialog.open` options at runtime and overrides any auto-generated title.


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
