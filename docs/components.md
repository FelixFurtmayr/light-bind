# LightBind Components

## Component Lifecycle

```javascript
function MyComponent(scope,  { elem, attrs, bindings, inputs }) {
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
  // Form field elements directly available
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
    
    // Display all errors in one place
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
