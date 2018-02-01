self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('v1').then(function(cache) {
      return cache.addAll([
        '/index.html',
        '/mscp/libs/js/jquery.min.js',
        '/mscp/libs/js/jquery.cookie.js',
        '/mscp/libs/js/jquery.detectswipe.js',
        '/mscp/libs/js/jquery.longpress.js',
        '/js/sharedlists.js',
        '/css/sharedlists.css',
        '/mscp/libs/js/popupcreator.js',
        '/mscp/libs/css/popupcreator.css',
        '/mscp/js/browser.js',
        '/mscp/libs/img/min.png',
        '/mscp/libs/img/max.png',
        '/mscp/libs/img/windowed.png',
        '/mscp/libs/img/close.png',
        '/img/checklist_128.png',
        '/img/checklist_196.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  let reqClone = event.request.clone()
  event.respondWith(caches.match(event.request).then(function(response) {
    // caches.match() always resolves
    // but in case of success response will have value
    if (response !== undefined) {
      return response;
    } else {
      return fetch(event.request).then(function (response) {
        // response may be used only once
        // we need to save clone to put one copy in cache
        // and serve second one
        let responseClone = response.clone();

        caches.open('v1').then(function (cache) {
          try{
            cache.put(event.request, responseClone);
          } catch(err){}
        });
        return response;
      }).catch(async function (e) {
        return new Response(JSON.stringify({success: false, error: "Offline", offline: true}))
      });
    }
  }));
});
