# LightBind start

## Standard

```html
<script type="module">
  import { LightBind } from './lightbind.js';
   lightBind = new LightBind();
   lightBind.setGlobals();
   lightBind.start();
</script>

```

## Custom

```html
<script type="module">
  import { LightBind } from './lightbind.js';

   // other paths for components and dialogs
   const lightBind = new LightBind({
      componentsPath: '../components',
      dialogsPath: '../dialogs'
   });

   // take what you need: set globals manually instead of lightBind.setGlobals();
   window.LightBind = lightBind;
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





