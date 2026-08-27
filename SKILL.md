---
name: lightbind
description: Use this skill whenever writing, editing, or debugging code that uses LightBind — Felix's minimalist JS framework for reactive data binding, dialogs, notifications, HTTP, drag-and-drop, and file uploads. Trigger on any mention of LightBind, bind-function, bind-repeat, bind-if, bind-component, dialog.open, dialog.confirm, scope.$refresh, scope.$render, or when working on Record Express admin/shop frontend code that imports lightbind.js. Also trigger when creating LightBind dialogs, components, or templates.
---

# LightBind

A minimalist JS framework to bind html and js and provide UI basics like drag&drop or dialogs. The developer shall focus on creating optimized content for his application.

## Principles
- Quick setup, Rapid Development, Minimal Footprint
- Beautiful and short Code
- Enhance the web standards
- Provide core components for common needs (notifications, uploads, drag-and-drop, storage, http)
- Reactive Data Binding, Component System

## Quick Start

```html
<script type="module">import { LightBind } from './lightbind.js'; new LightBind().start();</script>

<div bind-function="CounterApp">
  <h1>{{title}}</h1>
  <button on-click="increment()">Count: {{count}}</button>
</div>

<script>
function CounterApp(scope) {
  scope.title = 'Simple Counter';
  scope.count = 0;

  scope.increment = () => {
    scope.count++;
  };
}
</script>
```

## Start Options

### Minimal

```html
<script type="module">import { LightBind } from './lightbind.js'; new LightBind().setGlobals().start(); </script>
```

### Custom

```html
<script type="module">
   import { LightBind } from './lightbind.js';
   let lightBind = new LightBind({ setHeaderTokenFromStorage: true });
   lightBind.setGlobals();
   lightBind.start();
</script>
```

```html
<script type="module">
   import { LightBind } from './lightbind.js';

   // other paths for components and dialogs
   const lightBind = new LightBind({
      componentsPath: '/component',
      dialogsPath: '/dialog'
   });

   // take what you need: set globals manually instead of lightBind.setGlobals();
   window.lightBind = lightBind;
   window.http = lightBind.http;
   window.notification = lightBind.notification;
   window.dialog = lightBind.dialog;
   window.storage = lightBind.storage;
   window.JSON.copy = lightBind.copy;

   // start with a specific element or selector
   lightBind.start('#app');
   lightBind.start(document.getElementById('app'));
</script>
```

## Project Structure

For larger applications, organize your code like this:
```
/my-app
  ├── index.html
  │
  ├── views/
  │   ├── login/
  │   │   ├── template.html
  │   │   ├── script.js
  │   │   └── style.css
  │   └── confirm/
  │       └── template.html
  │
  ├── components/
  │   ├── user-profile/
  │   │   ├── template.html
  │   │   ├── script.js
  │   │   └── style.css
  │   └── product-card/
  │       ├── template.html
  │       ├── script.js
  │       └── style.css
  │
  ├── dialogs/
  │   ├── user-edit/
  │   │   ├── template.html
  │   │   ├── script.js
  │   │   └── style.css
  │   └── confirm/
  │       └── template.html
  │
  ├── styles/
  │   └── main.css
  │
  └── js/
      ├── app.js
      ├── your_libs.js
      └── /lightbind/lightbind.js
```

## Data Binding

```html
<div bind-function="ProductCard">
  <!-- Text Interpolation -->
  <h3>{{name}}</h3>

  <!-- Two-way Binding -->
  <input bind="quantity" type="number">

  <!-- Attribute Binding -->
  <div class="{{productClass}}"></div>

  <!-- Events -->
  <button on-click="addToCart(product)">Add to Cart</button>

  <!-- Condition -->
  <div bind-if="inStock">In Stock</div>

  <!-- List -->
  <ul><li bind-repeat="feature in features">{{feature}}</li></ul>
</div>
```

## Built-in Modules

```javascript
// HTTP Client
http.get('/api/users').then(data => {
  scope.users = data;
  scope.$refresh();
});
http.post('/api/users', { name: 'John' });

// Dialogs
dialog.open('login-form', { message: 'Pass something into the dialog' }, (result) => {
  scope.user = result;
  scope.$refresh();
});

// Notifications
notification.success('Data saved successfully!');
notification.warning({
  message: 'Your session will expire soon',
  duration: 10000
});

// Storage
storage.set('user', { id: 1, name: 'John' });
const user = storage.get('user');
```

## Advanced Features

```html
<!-- File Upload -->
<div bind-upload="handleFiles" multiple="true" drag="true">
  Drop files here or click to upload
</div>

<!-- Drag & Drop -->
<div bind-drag="itemData">Drag me</div>
<div bind-drop="handleDrop">Drop here</div>

<!-- Dynamic Components -->
<div bind-component="selectedComponent" data="componentData"></div>
```

## Browser Support
Supports all modern browsers that implement ES6 features.

---

# Directives

Attribute directives that accept key-value mappings (`bind-attr`, `bind-style`, `bind-class`) use JS object notation. Curly braces are optional: `bind-attr="{ src: url }"` and `bind-attr="src: url"` are equivalent.

## bind

```html
<!-- Text input -->
<input bind="username" placeholder="Enter username">

<!-- Number input debounced with 500ms -->
<input type="number" bind="quantity" debounce="500">

<!-- Checkbox -->
<input type="checkbox" bind="isActive">

<!-- Select -->
<select bind="selectedOption">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>

<!-- Select from a list of objects -->
<select bind="selectedOption">
  <option bind-repeat="opt in options" value="{{opt.value}}">{{opt.label}}</option>
</select>
```

## bind-if

```html
<!-- Basic condition -->
<div bind-if="isLoggedIn">Welcome back!</div>

<!-- Complex condition -->
<button bind-if="cart.items.length > 0" on-click="checkout()">
  Checkout
</button>
```

## bind-repeat

```html
<!-- Basic -->
<li bind-repeat="item in items">{{item.name}}</li>

<!-- With index -->
<li bind-repeat="index, item in items">{{index + 1}}. {{item.name}}</li>

<!-- Object iteration -->
<div bind-repeat="(key, value) in userObject">{{key}}: {{value}}</div>

<!-- Filter + sort -->
<li bind-repeat="item in items" filter="activeItemsOnly" sort="sortByName">{{item.name}}</li>
<li bind-repeat="item in items" sort="{ name: 1, age: -2 }">{{item.name}}</li>

<!-- Position helpers -->
<li bind-repeat="item in items" bind-class="{ even: $even, last: $last }">
  {{$index + 1}}. {{item.name}}
</li>
```

Position helpers available on each item: `$index`, `$first`, `$last`, `$middle`, `$even`, `$odd`.

```javascript
function ListComponent(scope) {
  scope.items = [{ name: 'Alice', age: 30, active: true }, { name: 'Bob', age: 25, active: false }];

  scope.activeItemsOnly = (item) => item.active === true;     // filter function
  scope.sortByName = (a, b) => a.name.localeCompare(b.name); // sort comparator
  scope.sortCriteria = { name: 1, age: -2 };                 // sort object: positive = asc, negative = desc, value = priority
}
```

Array mutations (`push`, `splice`, `sort`, ...) trigger re-render automatically.
To replace the array use `scope.$render({ items: newItems })` or `scope.items = newItems; scope.$refresh()`.


## bind-attr

```html
<!-- Single attribute -->
<img bind-attr="{ src: user.profileImage }">

<!-- Multiple attributes -->
<a bind-attr="{ href: item.url, title: item.description }">
  {{item.name}}
</a>

<!-- Conditional class -->
<div bind-attr="{ class: isActive ? 'active' : '' }">
  Toggle me
</div>

<!-- Disabled attribute -->
<button bind-attr="{ disabled: !formValid }">Submit</button>
```

## bind-class

```html
<!-- Single class toggle -->
<div bind-class="isActive ? 'active' : ''">Toggle Class</div>

<!-- Multiple classes with object syntax -->
<div bind-class="{ active: isActive, highlight: isHighlighted, error: hasError }">
  Dynamic Classes
</div>
```

## bind-style

```html
<!-- Single style property -->
<div bind-style="{ color: textColor }">Colored Text</div>

<!-- Multiple style properties -->
<div bind-style="{
  backgroundColor: bgColor,
  fontSize: fontSize + 'px',
  fontWeight: isBold ? 'bold' : 'normal'
}">
  Styled Text
</div>
```

## bind-html

```html
<div bind-html="richTextContent"></div>

<script>
function ContentComponent(scope) {
  scope.richTextContent = '<h3>Dynamic Content</h3><p>This is <strong>HTML</strong> content.</p>';
}
</script>
```

## bind-component

```html
<div bind-component="selectedComponent" data="componentData"></div>

<script>
function ComponentLoader(scope) {
  scope.selectedComponent = 'user-profile';
  scope.componentData = { userId: 123 };

  scope.showSettings = () => {
    scope.selectedComponent = 'user-settings';
    scope.componentData = { userId: 123 };
  };
}
</script>
```

## Event Directives

```html
<button on-click="saveForm()">Save</button>

<button on-click="deleteItem($event, item.id)">Delete</button>

<input on-input="updateSearch($event)" on-blur="validateField($event)">

<form on-submit="submitForm($event)">
  <button type="submit">Submit</button>
</form>

<div
  on-mouseover="showTooltip()"
  on-mouseout="hideTooltip()"
  on-right-click="showContextMenu($event)">
  Hover or right-click me
</div>
```

All Events:
- on-click
- on-change
- on-input
- on-submit
- on-blur
- on-double-click
- on-middle-click
- on-focus
- on-keyup
- on-keydown
- on-keypress
- on-mouseover
- on-mouseout
- on-mouseenter
- on-mouseleave
- on-touchstart
- on-touchmove
- on-touchend
- on-touchcancel
- on-swipe-left
- on-swipe-right


### Swipe Gestures

`on-swipe-left` and `on-swipe-right` are composite events (touchstart + touchmove + touchend). They fire when the user swipes past a threshold (default 40px).

```html
<div on-swipe-left="nextSlide()" on-swipe-right="prevSlide()">
  Swipeable content
</div>
```

Optional attributes:
- `swipe-animate` — the element follows the finger via translateX during the swipe and snaps back on release
- `swipe-threshold="60"` — custom distance threshold in pixels (default: 40)

```html
<div on-swipe-left="next()" on-swipe-right="prev()" swipe-animate swipe-threshold="60">
  Animated swipe carousel
</div>
```


## bind-drag and bind-drop

```html
<!-- Draggable element -->
<div
  bind-drag="dragData"
  index="$index"
  name="draggedItemName">
  Drag me
</div>

<!-- Drop target -->
<div bind-drop="handleDrop" drop-data="targetZone">Drop here</div>
```

```javascript
function DragDropComponent(scope) {
  scope.dragData = { id: 123, type: 'item' };
  scope.handleDrop = (data) => {
    console.log(`Item dropped: ${data.id} in zone: ${data.dropData}`);
  };
}
```

## bind-upload

```html
<div
  bind-upload="handleFiles"
  multiple="true"
  drag="true"
  file-size-limit="5"
  read-as-text="false"
  data="uploadContext">

  <div class="file-select">Select files or drop here</div>
  <div class="upload-status">{{uploadStatus}}</div>
</div>
```

```javascript
function UploadComponent(scope) {
  scope.uploadStatus = 'No files selected';
  scope.uploadContext = { type: 'profile' };

  scope.handleFiles = (files, contextData) => {
    scope.uploadStatus = `Uploading ${files.length} files...`;

    files.forEach(file => {
      console.log(`File: ${file.filename}, Size: ${file.size}`);
      // file.content contains the raw file data
    });

    scope.$refresh();
  };
}
```

## Custom Directives

```javascript
// Create a new directive
const CustomFocusDirective = {
  process(element, expression, component) {
    this.lightBind.createWatcher(component, expression, (newValue) => {
      if (newValue) element.focus();
    });

    return { success: true };
  }
};

// Extend from BaseDirective
Object.setPrototypeOf(CustomFocusDirective, new BaseDirective(lightBind));

// Register the directive
lightBind.directives['bind-focus'] = CustomFocusDirective;
```

Usage:

```html
<input bind-focus="shouldFocus">
```

---

# Modules

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

## File Upload

```javascript
// send a file
http.postFiles('file', blob);

// file + json data
http.postFiles('file', blob, { order_id, item_id, slot, side });

// send Multiple files via FormData and allow attach an optional json for more info as file too
http.postFiles('file', [
  { blob: coverBlob, filename: 'front_cover.jpg', mimetype: 'image/jpeg' },
  { blob: audioBlob, filename: 'song.mp3', mimetype: 'audio/mpeg', title: 'My Song' }
], {
  order_id: 'abc123',
  item_id:  'uuid',
  slot:     'cover',
  side:     'front'
});

// Listen to upload progress
const stop = http.onUploadProgress('file', ({ percentComplete }) => {
  console.log(percentComplete + '%');
});
stop(); // unsubscribe
```

Server receives:
- `json` → `{ data: { order_id, ... }, files: [{ filename, mimetype, ... }] }`
- `file` → binary blobs in same order as `files[]`



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

### Dialog Template (/dialog/confirm-delete/template.html)

```html
<!-- dialog options here in this tag, if wanted: -->
<dialog-config size="xl" show-header="false" force-close-button="true" />

<div class="dialog" bind-function="ConfirmDelete">
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

#### Opening a dialog

Info: the dialog can also have style.css and script.js separate as files, but in the simplest form all is just put into template.html

```js
  dialog.open('admin/edit-workflow', function () {}, { });

  dialog.open('admin/edit-workflow', { options }, function () {

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


#### Dialog Config Attributes
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

---

# Components

## Component Lifecycle

```javascript
function MyComponent(scope, { elem, attrs, bindings, inputs }) {
  scope.isLoading = true;
  scope.data = [];

  // Update component with new data
  scope.$render = (newData = {}) => {
    Object.assign(scope, newData);
    loadData();
    return scope;
  };

  // Trigger a re-render
  scope.$refresh = () => {
    return scope;
  };

  function loadData() {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        scope.data = data;
        scope.isLoading = false;
        scope.$refresh();
      });
  }
}
```

## Parent to Child Communication (in development)

```html
<!-- Parent component -->
<div bind-function="ParentComponent">
  <h2>Parent Component</h2>
  <div bind-function="ChildComponent" data-parent-message="{{message}}">
  </div>
  <button on-click="updateMessage()">Update Message</button>
</div>
```

```javascript
function ParentComponent(scope) {
  scope.message = 'Hello from parent';

  scope.updateMessage = () => {
    scope.message = 'Updated message: ' + new Date().toLocaleTimeString();
  };
}

function ChildComponent(scope) {
  // Access attribute from parent
  const parentMessage = scope.element.getAttribute('data-parent-message');
  scope.receivedMessage = parentMessage;

  // Or access parent scope directly
  const parentComponent = scope.$parent;
  if (parentComponent) {
    scope.parentMsg = parentComponent.message;
  }
}
```

## Child to Parent Communication (in development)

```html
<!-- Parent component -->
<div bind-function="TaskList">
  <h2>Task List</h2>
  <div bind-function="TaskItem"
       bind-repeat="task in tasks"
       data-task-id="{{task.id}}"
       on-task-complete="completeTask($event)">
  </div>
</div>
```

```javascript
function TaskList(scope) {
  scope.tasks = [
    { id: 1, name: 'Task 1', completed: false },
    { id: 2, name: 'Task 2', completed: false }
  ];

  scope.completeTask = (taskId) => {
    const task = scope.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = true;
      scope.$refresh();
    }
  };
}

function TaskItem(scope) {
  const taskId = parseInt(scope.element.getAttribute('data-task-id'), 10);

  scope.markComplete = () => {
    // Call parent handler through custom event
    const event = new CustomEvent('task-complete', {
      detail: taskId,
      bubbles: true
    });
    scope.element.dispatchEvent(event);

    // Or directly call parent function
    const parent = scope.$parent;
    if (parent && parent.completeTask) {
      parent.completeTask(taskId);
    }
  };
}
```

## Reusable Components

### Component File Structure (/components/user-card/template.html)

```html
<template bind-function="UserCard">
  <div class="user-card">
    <img src="{{user.avatar}}" alt="{{user.name}}" class="avatar">
    <div class="details">
      <h3>{{user.name}}</h3>
      <p>{{user.title}}</p>
      <button on-click="viewProfile(user.id)">View Profile</button>
    </div>
  </div>

  <style>
    .user-card {
      display: flex;
      border: 1px solid #eee;
      padding: 10px;
    }
    .avatar {
      width: 50px;
      height: 50px;
      border-radius: 25px;
      margin-right: 10px;
    }
  </style>
</template>

<script>
function UserCard(scope, input) {
  scope.user = input.user || {
    id: 0,
    name: 'User Name',
    title: 'Job Title',
    avatar: '/default-avatar.png'
  };

  scope.viewProfile = (userId) => {
    if (input.onProfileView) {
      input.onProfileView(userId);
    }
  };
}
</script>
```

### Using Components

```html
<div bind-function="UserDirectory">
  <h2>User Directory</h2>

  <div bind-component="'user-card'"
       data="{
         user: selectedUser,
         onProfileView: viewUserProfile
       }"
       bind-repeat="user in users">
  </div>
</div>
```

```javascript
function UserDirectory(scope) {
  scope.users = [
    { id: 1, name: 'Alice', title: 'Developer', avatar: '/alice.jpg' },
    { id: 2, name: 'Bob', title: 'Designer', avatar: '/bob.jpg' }
  ];

  scope.viewUserProfile = (userId) => {
    scope.selectedUser = scope.users.find(u => u.id === userId);
    dialog.open('user-profile', {
      title: scope.selectedUser.name
    });
  };
}
```

## Form Handling

```javascript
function UserForm(scope, input) {
  const nameField = scope.element.querySelector('#name');
  const emailField = scope.element.querySelector('#email');
  const errorDisplay = scope.element.querySelector('.errors');

  scope.form = input.user || { name: '', email: '' };
  scope.errors = {};
  scope.isFormValid = false;

  scope.validate = () => {
    scope.errors = {};

    if (!scope.form.name) {
      scope.errors.name = 'Name is required';
      nameField.classList.add('error');
    } else {
      nameField.classList.remove('error');
    }

    if (!scope.form.email) {
      scope.errors.email = 'Email is required';
      emailField.classList.add('error');
    } else if (!/\S+@\S+\.\S+/.test(scope.form.email)) {
      scope.errors.email = 'Email is invalid';
      emailField.classList.add('error');
    } else {
      emailField.classList.remove('error');
    }

    if (Object.keys(scope.errors).length > 0) {
      errorDisplay.innerHTML = Object.values(scope.errors)
        .map(error => `<div>${error}</div>`)
        .join('');
      errorDisplay.style.display = 'block';
    } else {
      errorDisplay.style.display = 'none';
    }

    scope.isFormValid = Object.keys(scope.errors).length === 0;
    return scope.isFormValid;
  };

  scope.submitForm = (event) => {
    event.preventDefault();

    if (scope.validate()) {
      if (input.onSubmit) {
        input.onSubmit(scope.form);
      }
    }
  };

  scope.cancel = () => {
    if (input.onCancel) {
      input.onCancel();
    }
  };
}
```

```html
<div bind-function="UserForm">
  <form on-submit="submitForm($event)">
    <div class="form-group">
      <label for="name">Name</label>
      <input id="name" bind="form.name" required>
    </div>

    <div class="form-group">
      <label for="email">Email</label>
      <input id="email" type="email" bind="form.email" required>
    </div>

    <!-- All errors displayed here -->
    <div class="errors" style="display: none; color: red;"></div>

    <div class="form-actions">
      <button type="button" on-click="cancel()">Cancel</button>
      <button type="submit" bind-attr="{ disabled: !isFormValid }">
        Save
      </button>
    </div>
  </form>
</div>
```
