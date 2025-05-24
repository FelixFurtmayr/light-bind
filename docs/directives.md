# LightBind Directives

## bind

```html
<!-- Text input -->
<input bind="username" placeholder="Enter username">

<!-- Number input -->
<input type="number" bind="quantity">

<!-- Checkbox -->
<input type="checkbox" bind="isActive">

<!-- Select -->
<select bind="selectedOption">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
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
<!-- Basic array iteration -->
<ul>
  <li bind-repeat="item in items">{{item.name}}</li>
</ul>

<!-- With index -->
<ul>
  <li bind-repeat="(index, item) in items">
    {{index + 1}}. {{item.name}}
  </li>
</ul>

<!-- Object iteration -->
<dl>
  <div bind-repeat="(key, value) in userObject">
    <dt>{{key}}</dt>
    <dd>{{value}}</dd>
  </div>
</dl>

<!-- With filtering and sorting -->
<ul>
  <li bind-repeat="item in items" filter="activeItemsOnly" sort="sortByName">
    {{item.name}}
  </li>
</ul>
```

```javascript
function ListComponent(scope) {
  scope.activeItemsOnly = (item) => item.active === true;
  scope.sortByName = (a, b) => a.name.localeCompare(b.name);
}
```

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
