
const CACHE="paris-reise-v3";
const ASSETS=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./carte-food-perruche-summer.pdf","./Elio.pdf","./menu-perruche-1.jpg","./menu-perruche-2.jpg","./menu-perruche-3.jpg","./menu-perruche-4.jpg","./menu-perruche-5.jpg","./menu-perruche-6.jpg","./menu-elio-1.jpg","./menu-elio-2.jpg","./menu-elio-3.jpg","./menu-elio-4.jpg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
  }).catch(()=>caches.match("./index.html"))));
});
