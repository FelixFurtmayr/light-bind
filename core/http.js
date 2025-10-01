/*

example usage:

({

  apiPath: '/api/',

  // Example: Add token authorization
  processRequest: (request) => {
    const token = localStorage.getItem('token');
    if (token) request.headers.Authorization = `Bearer ${token}`;
    return request;
  },
  
  // Handle specific status codes
  handleResponseStatus: {
    401: (error) => {
      // Custom unauthorized handler
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    },
    403: (error) => {
      console.error('Permission denied:', error);
      showPermissionDeniedMessage();
    }
  }
});

*/

export default function (options, lightBind) {
  // Default configuration
  let config = {
    baseUrl: null,
    apiPath: '/api/',
    timeout: 150000,
    autoRefresh: true,

    // Request processor function (customizable)
    processRequest: (request) => {
      // Default does nothing, just returns the request as is
      return request;
    },

    // Response handler for specific status codes
    handleResponseStatus: {
      // No defaults for unauthorized - must be provided by user
    }
  };

  // Handle nested response status handlers
  if (options.handleResponseStatus) {
    config.handleResponseStatus = {
      ...config.handleResponseStatus,
      ...options.handleResponseStatus
    };
    delete options.handleResponseStatus;
  }

  if (options.setHeaderTokenFromStorage) {
    config.processRequest = function (request) {
      let key = options.setHeaderTokenFromStorage;
      let tokenKey = typeof key === 'string' ? key : 'token';
      const token = localStorage.getItem(tokenKey);
      if (token) request.headers[tokenKey] = token;
      return request;
    };
  }

  if (options.logoutOnDeniedPage) {
    config.handleResponseStatus[403] = logout;
    config.handleResponseStatus[401] = logout;

    function logout (error) {
      localStorage.removeItem('token');
      let loginUrl = 'login.html';
      if (typeof options.logoutOnDeniedPage === 'string'){
        loginUrl = options.logoutOnDeniedPage;
      }
      window.location.href = loginUrl
    };
  }

  // Apply other options
  config = { ...config, ...options };

  function http(data, callback) {
    return httpToApi(data.method, data.url, data, callback);
  }

  http.get = function (url, callback) {
    return httpToApi('GET', url, callback);
  };

  http.post = function (url, data, callback) {
    return httpToApi('POST', url, data, callback);
  };

  http.postFile = postFile;

  http.put = function (url, data, callback) {
    return httpToApi('PUT', url, data, callback);
  };

  http.delete = function (url, data, callback) {
    return httpToApi('DELETE', url, data, callback);
  };

  http.getApiUrl = function (url) {
    let newUrl = http.getBaseUrl() + config.apiPath;
    if (url) {
      if (url.startsWith('/')) url = url.slice(1);
      newUrl = newUrl + url;
    }
    return newUrl;
  };

  http.getBaseUrl = function () {
    if (config.baseUrl) return config.baseUrl;
    return http.getProtocol() + http.getCurrentDomain();
  };

  http.getProtocol = function () {
    return (window.location.hostname === 'localhost') ? 'http://' : 'https://';
  };

  http.getCurrentDomain = function () {
    const { hostname, port } = window.location;
    return `${hostname}${port ? `:${port}` : ''}`;
  };

  http.httpSend = httpSend;

  // Allow direct access to config for advanced use cases
  http.getConfig = () => config;

  // Internal function to direct requests to API endpoint
  function httpToApi(method, url, data, callback) {
    url = http.getApiUrl(url);
    return httpSend(method, url, data, callback);
  }

  // Main HTTP send function
  function httpSend(method, url, data, callback) {
    url = url || '';
    if (!url) throw new Error('No URL provided');
    data = data || {};

    if (typeof data === 'function') {
      callback = data;
      data = {};
    }

    let headers = data.headers || {};

    // Handle POST, PUT, DELETE data formatting
    if ((method === 'POST') || (method === 'PUT') || (method === 'DELETE')) {
      if (!data.body) data = { body: data };
      headers['Content-Type'] = 'application/json';
    }

    // GET: put data the query, so we can pass a JSON in the same way like for a post 
    // Only it should be small to not make the URL too long - otherwise we have to do a post
    if ((method === 'GET') && data) {
      // Convert objects to JSON strings before URL encoding
      const processedData = {};
      for (const key in data) {
        const value = data[key];
        if (typeof value === 'object' && value !== null) {
          processedData[key] = JSON.stringify(value);
        } else {
          processedData[key] = value;
        }
      }
      
      let urlParams = new URLSearchParams(processedData);
      let params = urlParams.toString();
      if (params) url = url + '?' + params;
      headers['Content-Type'] = 'application/json';
    }

    // Handle binary data
    if (data.binary) {
      headers['Content-Type'] = 'application/octet-stream';
    } else if (data.body && typeof data.body !== 'string') {
      data.body = JSON.stringify(data.body);
    }

    // Prepare the request object
    let request = {
      method: method || 'GET',
      url,
      headers,
      body: data.body || null,
      originalData: data
    };

    // Allow custom request processing
    if (typeof config.processRequest === 'function') {
      request = config.processRequest(request);
    }

    return new Promise(function (resolve, reject) {
      fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: AbortSignal.timeout(config.timeout)
      })
        .then(response => {
          refreshUI(); // Refresh UI after response

          // Check if the response status is not OK (status 200-299)
          if (!response.ok) {
            return response.text().then(errorText => {
              let error = `HTTP error ${response.status}: ${errorText}`;
              if (response.statusText) error += ` (${response.statusText})`;
              if (callback) callback(error);
              reject(error); // Reject with error message

              // Handle specific status codes with custom handlers
              const statusHandler = config.handleResponseStatus[response.status];
              if (statusHandler) {
                setTimeout(() => statusHandler(error), 10);
              }

              throw error;
            });
          }
          
          // Handle response based on responseType or Content-Type
          const contentType = response.headers.get('content-type') || '';
          const responseType = data.responseType;
          
          // If responseType is specified, use it
          if (responseType === 'blob') {
            return response.blob();
          } else if (responseType === 'arraybuffer') {
            return response.arrayBuffer();
          } else if (responseType === 'text') {
            return response.text();
          }
          
          // Auto-detect based on Content-Type
          if (contentType.includes('application/octet-stream') ||
              contentType.includes('application/pdf') ||
              contentType.includes('application/zip') ||
              contentType.includes('application/vnd.ms-excel') ||
              contentType.includes('application/vnd.openxmlformats') ||
              contentType.includes('image/') ||
              contentType.includes('video/') ||
              contentType.includes('audio/')) {
            return response.blob();
          }
          
          // Default to text for JSON, HTML, plain text, etc.
          return response.text();
        })
        .then(function (result) {
          refreshUI(); // Refresh UI after processing

          // If result is text, try to parse as JSON
          if (typeof result === 'string') {
            try {
              result = JSON.parse(result);
            } catch (e) {
              // Keep as text if JSON parsing fails
            }
          }
          // If result is blob or arraybuffer, keep as is

          if (callback) callback(null, result);
          resolve(result);
        })
        .catch(function (error) {
          refreshUI(); // Refresh UI after error

          // Log errors and reject the promise
          console.error('HTTP Error:', error);

          if (callback) callback(error);
          reject(error);
        });
    });
  }

  function refreshUI() {
    try {
      if (config.autoRefresh) {
        if (lightBind){
          for (const [element, component] of lightBind.components.entries()) {
            if (component && typeof component.scope.$refresh === 'function') {
              component.scope.$refresh();
            }
          }
        }
        // custom refresh function
        if (config.refresh) config.refresh();
      }
    } catch (e) {
      console.warn('Error refreshing UI:', e);
    }
  }


  function postFile(urlPath, data, file, callbackOrOptions, callback) {
    let options = {
      showprogress: true
    };

    // http.postFile(urlPath, data, file, callback)
    if (typeof callbackOrOptions === 'function') {
      callback = callbackOrOptions;

    // http.postFile(urlPath, data, file, headers, [callback])
    } else if (typeof callbackOrOptions === 'object') {
      options = callbackOrOptions;
    }

    urlPath = http.getApiUrl(urlPath);

    let headers = Object.assign({}, data || {});

    let fileIsBlob = file instanceof Blob;
    if (!fileIsBlob){
      // add possible infos from the file
      ['extension', 'filename', 'mimetype', 'shortName'].forEach((key) => {
        if (file[key]) headers[key] = file[key];
      });

      console.log('postFile: file should be a Blob, but got:', headers);

      file = new Blob([file.content], {  type: headers.mimetype || 'application/octet-stream' });
    }

    if (headers.filename) headers.filename = sanitizeFilenameForHTTP(headers.filename);
    if (headers.shortName) headers.shortName = sanitizeFilenameForHTTP(headers.shortName);

    // Apply processRequest to headers before creating FormData
    // Create a request-like object that processRequest can modify
    let request = {
      method: 'POST',
      url: urlPath,
      headers,
    };

    // Allow custom request processing
    if (typeof config.processRequest === 'function') {
      request = config.processRequest(request);
    }

    // Update headers from processed request
    headers = request.headers;
    urlPath = request.url;

    // Create a FormData object to track upload progress
    const formData = new FormData();

    // Add the file to FormData
    formData.append('file', file, headers.filename || 'file');

    // Create XHR for progress tracking
    const xhr = new XMLHttpRequest();

    // Create progress bar elements if showprogress is enabled
    let progressBarContainer, progressBar;
    if (options.showprogress) {
      progressBarContainer = document.createElement('div');
      progressBarContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:4px;z-index:9999;';

      progressBar = document.createElement('div');
      progressBar.style.cssText = 'height:100%;width:0;transition:width 0.2s;';

      const mainColor = getComputedStyle(document.documentElement).getPropertyValue('--main-color').trim() || '#ff0000';
      progressBar.style.backgroundColor = mainColor;

      progressBarContainer.appendChild(progressBar);
      document.body.appendChild(progressBarContainer);
    }

    // Set up progress tracking
    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);

        // Update the progress bar if showprogress is enabled
        if (options.showprogress && progressBar) {
          progressBar.style.width = percentComplete + '%';
        }

        // Dispatch a custom event that code can listen for
        const progressEvent = new CustomEvent('http:uploadProgress', {
          detail: {
            urlPath,
            percentComplete,
            loaded: event.loaded,
            total: event.total
          }
        });
        document.dispatchEvent(progressEvent);
      }
    };

    // Return a promise for promise-based usage
    return new Promise((resolve, reject) => {
      xhr.open('POST', urlPath, true);

      // Set headers
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });

      xhr.onload = function () {
        // Remove progress bar when complete
        if (options.showprogress && progressBarContainer) {
          setTimeout(() => {
            document.body.removeChild(progressBarContainer);
          }, 500);
        }

        let response = {};

        try{
          response = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch (e) {
          console.error('Error in xhr.responseText:', xhr.responseText);
        }

        refreshUI();

        if (xhr.status >= 200 && xhr.status < 300) {
          // Success - call callback if provided and resolve promise
          if (typeof callback === 'function') callback(null, response);
          resolve(response);
        } else {
          // Error - call callback with error if provided and reject promise
          const error = new Error(`Request failed with status ${xhr.status}`);
          error.response = response;
          if (typeof callback === 'function') callback(error);
          reject(error);
        }
      };

      xhr.onerror = function () {
        // Remove progress bar on error
        if (options.showprogress && progressBarContainer) {
          document.body.removeChild(progressBarContainer);
        }
        const error = new Error('Network error occurred');
        if (typeof callback === 'function') callback(error);
        reject(error);
      };
      xhr.send(formData);
    });
  }
  // allow others to listen to upload progress
  http.onUploadProgress = function (urlPath, callback) {
      const handler = function (event) {
        if (!urlPath || event.detail.urlPath === urlPath) callback(event.detail);
      };
      document.addEventListener('http:uploadProgress', handler);
      return function () {
        document.removeEventListener('http:uploadProgress', handler);
      };
  };

  function sanitizeFilenameForHTTP(filename) {
    // Preserve the file extension
    const lastDotIndex = filename.lastIndexOf('.');
    const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
    
    // Remove or replace problematic characters
    let sanitized = name
      // Remove control characters (0-31, 127)
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Remove characters that have special meaning in HTTP headers
      .replace(/[()<>@,;:\\"\/\[\]?={}]/g, '')
      // Replace spaces with underscores (optional, but recommended)
      .replace(/\s+/g, '_')
      // Replace other spaces with a single underscore
      .replace(/[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+/g, '_')
      // Remove any non-ASCII characters (optional, for maximum compatibility)
      .replace(/[^\x20-\x7E]/g, '')
      // Remove leading/trailing dots and spaces
      .replace(/^[\s.]+|[\s.]+$/g, '');
    
    // Ensure the filename isn't empty after sanitization
    if (!sanitized) sanitized = 'unnamed';
    
    // Limit length (optional, but good practice)
    const maxLength = 255 - ext.length;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized + ext;
  }


  return http;
};
