var CACHE='todo-v6';
var FILES=['./','index.html','manifest.json','icon-192.png','icon-512.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(FILES.map(function(f){return c.add(f).catch(function(){})}));
  }));
  self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
  }));
  self.clients.claim();
});

function offlinePage(){
  return caches.match('index.html',{ignoreSearch:true}).then(function(r){
    return r||caches.match('./',{ignoreSearch:true});
  }).then(function(r){
    return r||new Response('<h1>Offline</h1><p>Open the app once with internet so it can be saved for offline use.</p>',
      {status:503,headers:{'Content-Type':'text/html'}});
  });
}

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin) return;

  // Pages: try the network first (fresh version), fall back to the saved copy.
  if(req.mode==='navigate'){
    var net=fetch(req.url,{cache:'no-cache'}).then(function(res){
      if(res&&res.ok){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){c.put('index.html',copy)});
        return res;
      }
      throw new Error('bad response');
    });
    var timeout=new Promise(function(_,rej){setTimeout(function(){rej(new Error('slow'))},4000)});
    e.respondWith(Promise.race([net,timeout]).catch(offlinePage));
    return;
  }

  // Other files: use the saved copy right away, refresh it in the background.
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(function(hit){
    var refresh=fetch(req).then(function(res){
      if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy)});}
      return res;
    }).catch(function(){return hit||Response.error()});
    return hit||refresh;
  }));
});
