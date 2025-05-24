// A utility for finding DOM elements by binding paths, including those in repeated components

// Creates a function to find elements by binding path
export function createBindingPathFinder(element) {
   // Internal state
   const repeatContexts = new Map(); // Maps repeat elements to their context info
   const bindingCache = new Map();   // Caches binding paths to elements for performance
   
   // Initialize by parsing repeats
   parseRepeats(element);
   
   // Return the finder function
   return function findElementByPath(path) {
     // Check cache first
     if (bindingCache.has(path)) {
       return bindingCache.get(path);
     }
     
     // Parse the path to identify array access vs property access
     const pathParts = parsePath(path);
     
     // If simple binding, look for direct match
     if (pathParts.length === 1 && !pathParts[0].isArray) {
       const element = findDirectBinding(pathParts[0].name);
       if (element) {
         bindingCache.set(path, element);
         return element;
       }
       return null;
     }
     
     // If array access, find the repeat and then the element inside it
     if (pathParts[0].isArray) {
       const arrayName = pathParts[0].name;
       const index = pathParts[0].index;
       
       // Find all repeats with this array as context
       const repeats = Array.from(repeatContexts.entries())
         .filter(([_, context]) => context.arrayName === arrayName)
         .map(([element]) => element);
       
       if (repeats.length > 0) {
         // Get the nested property name after the array part
         const remainingPath = pathParts.slice(1)
           .map(part => part.name)
           .join('.');
         
         // Find the binding inside the repeat
         const element = findBindingInRepeat(repeats[0], index, remainingPath);
         if (element) {
           bindingCache.set(path, element);
           return element;
         }
       }
     }
     
     return null;
   };
   
   // Parse a path like "contacts[0].name" into structured parts
   function parsePath(path) {
     const parts = [];
     const segments = path.split('.');
     
     for (const segment of segments) {
       const arrayMatch = segment.match(/(.+)\[(\d+)\]/);
       if (arrayMatch) {
         parts.push({
           name: arrayMatch[1],
           isArray: true,
           index: parseInt(arrayMatch[2])
         });
       } else {
         parts.push({
           name: segment,
           isArray: false
         });
       }
     }
     
     return parts;
   }
   
   // Find an element with binding matching exactly this name
   function findDirectBinding(name) {
     const selector = `[bind="${name}"]`;
     return element.querySelector(selector);
   }
   
   // Find a binding inside a repeat at specific index
   function findBindingInRepeat(repeatElement, index, propertyPath) {
     const context = repeatContexts.get(repeatElement);
     if (!context) return null;
     
     // Convert the property path from the full path to the repeat-relative path
     // e.g., 'name' -> 'contact.name' if the repeat is 'contact in contacts'
     const itemName = context.itemName;
     const relativeSelector = `[bind="${itemName}.${propertyPath}"], [bind="${propertyPath}"]`;
     
     // Find all generated items from this repeat
     const generatedItems = getRepeatItems(repeatElement, index);
     if (generatedItems.length <= index) return null;
     
     // Get the specific item instance and find the binding inside it
     const itemInstance = generatedItems[index];
     return itemInstance.querySelector(relativeSelector);
   }
   
   // Get all generated items from a repeat directive
   function getRepeatItems(repeatElement, index) {
     const marker = findRepeatMarker(repeatElement);
     if (!marker) return [];
     
     // Get all siblings between the marker and the next marker
     const items = [];
     let currentNode = marker.nextSibling;
     
     while (currentNode && !isRepeatMarker(currentNode)) {
       if (currentNode.nodeType === Node.ELEMENT_NODE) {
         items.push(currentNode);
       }
       currentNode = currentNode.nextSibling;
     }
     
     return items;
   }
   
   // Find the comment marker for a repeat
   function findRepeatMarker(repeatElement) {
     if (!repeatElement.parentNode) return null;
     
     let node = repeatElement.parentNode.firstChild;
     while (node) {
       if (node.nodeType === Node.COMMENT_NODE && 
           node.textContent.includes('bind-repeat')) {
         return node;
       }
       node = node.nextSibling;
     }
     return null;
   }
   
   // Check if node is a repeat marker
   function isRepeatMarker(node) {
     return node.nodeType === Node.COMMENT_NODE && 
            node.textContent.includes('bind-repeat');
   }
   
   // Parse all repeats in the DOM tree
   function parseRepeats(rootElement) {
     // Find all elements with bind-repeat attribute
     const repeatElements = rootElement.querySelectorAll('[bind-repeat]');
     
     for (const repeatElement of repeatElements) {
       const expression = repeatElement.getAttribute('bind-repeat');
       
       // Parse the expression (e.g., "contact in contacts")
       const match = expression.match(/^\s*(?:(\w+),\s*(\w+)\s+in\s+|\s*(\w+)\s+in\s+)(.+)$/);
       if (!match) continue;
       
       const itemName = match[1] || match[3];
       const indexName = match[2] || '$index';
       const arrayName = match[4].trim();
       
       // Clone the template for future reference
       const template = repeatElement.cloneNode(true);
       template.removeAttribute('bind-repeat');
       
       // Store the context information
       repeatContexts.set(repeatElement, {
         itemName,
         indexName,
         arrayName,
         template
       });
       
       // Recursively parse repeats in this template
       parseRepeats(template);
     }
   }
 }
 