function loadUrl(url) {
  var req = new XMLHttpRequest();
  req.open('GET', url);
  req.onload = function(e) {
    console.log('req.onload()', req.readyState, req.status);
    if (req.readyState == 4 && req.status == 200) {
      //Pebble.showSimpleNotificationOnPebble("Response", (req.responseText || '').slice(0, 100));
      //Pebble.showSimpleNotificationOnPebble("Response", (req.responseText || '').length);
      Pebble.sendAppMessage({response:(req.responseText || '').slice(0, 100)});
    } else if (req.readyState == 4) {
      // Error
      Pebble.sendAppMessage({error:req.status.toString()});
    }
  };
  req.send(null);
}

Pebble.addEventListener('ready', function(e) {
  console.log('Application initialized!');
  Pebble.addEventListener('appmessage', function(e) {
    console.log('AppMsg:', JSON.stringify(e.payload));
    loadUrl(e.payload.request);
  });
});
