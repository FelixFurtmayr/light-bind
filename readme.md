# LightBind
LightBind is a minimalist JavaScript framework that binds html and js seamless and provides basic functionality. The developer can focus on creating optimized content for his application.

## Live Demo
https://felixfurtmayr.github.io/light-bind/example.html

Running The Examples Locally: ES6 modules require a web server. Choose any of these options:

> python3 -m http.server 8000

Now visit: http://localhost:8000/example.html

# Principles
- Quick setup, Rapid Development, Minimal Footprint
- Beautiful and short Code
- Enhance the web standards
- Provide core components for common needs (notifications, uploads, drag-and-drop, storage, http)
- Reactive Data Binding, Component System

# Todo
- debugging
- performance updates: initial load + repeat (compile the html directly)
- make startup process more robust in all variants

## low prio
- css grid? icons?
- routing recommendation?
- filters - for date and currency? the reapeat itself does does filtering already better
- diggest cycle after events?
- animation


## Quick Start

```html
<script type="module">
  import { LightBind } from './lightbind.js';
   lightBind = new LightBind();
   lightBind.setGlobals();
   lightBind.start();
</script>
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

For detailed documentation, see:
- [directives](./docs/directives.md)
- [modules](./docs/modules.md)
- [components](./docs/components.md)

## Browser Support
Supports all modern browsers that implement ES6 features.

## Author

Felix Furtmayr

## License

MIT
