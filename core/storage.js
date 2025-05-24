const LightBindStorage = (function() {
   const PREFIX = 'lightbind-storage-';
   
   function isLocalStorageAvailable() {
     try {
       const test = '__storage_test__';
       localStorage.setItem(test, test);
       localStorage.removeItem(test);
       return true;
     } catch (e) {
       return false;
     }
   }
   
   const storageAvailable = isLocalStorageAvailable();
   if (!storageAvailable) {
     console.warn('localStorage is not available. LightBindStorage will not persist data.');
   }
   
   function getPrefixedKey(key) {
     return `${PREFIX}${key}`;
   }
   
   function set(key, value) {
     if (!storageAvailable || !key) return false;
     
     try {
       const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
       localStorage.setItem(getPrefixedKey(key), serializedValue);
       return true;
     } catch (e) {
       console.error('Error storing data:', e);
       return false;
     }
   }
   
   function get(key, defaultValue = null) {
     if (!storageAvailable || !key) return defaultValue;
     
     try {
       const value = localStorage.getItem(getPrefixedKey(key));
       if (value === null) return defaultValue;
       
       try {
         return JSON.parse(value);
       } catch {
         return value;
       }
     } catch (e) {
       return defaultValue;
     }
   }
   
   function remove(key) {
     if (!storageAvailable || !key) return false;
     
     try {
       localStorage.removeItem(getPrefixedKey(key));
       return true;
     } catch (e) {
       return false;
     }
   }
   
   function clear() {
     if (!storageAvailable) return false;
     
     try {
       const keysToRemove = [];
       for (let i = 0; i < localStorage.length; i++) {
         const key = localStorage.key(i);
         if (key && key.startsWith(PREFIX)) {
           keysToRemove.push(key);
         }
       }
       keysToRemove.forEach(key => localStorage.removeItem(key));
       return true;
     } catch (e) {
       return false;
     }
   }
   
   function has(key) {
     if (!storageAvailable || !key) return false;
     try {
       return localStorage.getItem(getPrefixedKey(key)) !== null;
     } catch {
       return false;
     }
   }
   
   return { set, get, remove, clear, has, PREFIX };
 })();
  
 export default LightBindStorage;
