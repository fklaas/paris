
const CACHE="paris-reise-v-gallery-smart-1";
const ASSETS=["./","./index.html",
  "./assistant.js","./gallery.css","./gallery.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./carte-food-perruche-summer.pdf","./Elio.pdf","./menu-perruche-1.jpg","./menu-perruche-2.jpg","./menu-perruche-3.jpg","./menu-perruche-4.jpg","./menu-perruche-5.jpg","./menu-perruche-6.jpg","./menu-elio-1.webp","./menu-elio-2.webp","./menu-elio-3.webp","./menu-elio-4.webp","./fotospot-trocadero.webp","./fotospot-alexandre.webp","./fotospot-louvre.webp","./fotospot-disney.webp","./fotospot-universite.webp","./fotospot-seine.webp","./app-icon-apple-maps.svg","./app-icon-google-maps.svg","./app-icon-citymapper.svg","./app-icon-idfm.svg","./app-icon-disneyland.svg","./app-icon-translate.svg","./app-icon-chatgpt.svg","./app-icon-thefork.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
  }).catch(()=>caches.match("./index.html"))));
});
