

var cacheBustify = (function(defaultVal) {
  var today = new Date();
//  var cachebuster = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)).getTime() / 1000);  
  var cachebuster = Math.round(Math.random()*10000000000000000);
  
  return function(src, overrideDefault) {
    if (   (overrideDefault !== undefined && overrideDefault == true)
        || (defaultVal && overrideDefault == undefined)) {
        return src + ("?cb=" + cachebuster);
    } else {
      return src;
    }
  }
  
})(true);
var require = function(src,bustCache,type,element,options) {
  src = cacheBustify(src,bustCache);
  var elem = document.createElement(element);
  for (k in options) {
    elem.setAttribute(k, options[k]);
  }
  queue.push({type:type,elem:elem});
}

var queue = [];
var requireLess = function(src,bustCache) {
  //NEW:
  
  // require(
  //   src,
  //   bustCache,
  //   'less',
  //   'link',
  //   {'rel':'stylesheet/less',
  //    'type':'text/css',
  //    'href',src});
  
  //OLD:
  src = cacheBustify(src,bustCache);
  var cssElement=document.createElement('link');
  cssElement.setAttribute('rel','stylesheet/less');
  cssElement.setAttribute('type','text/css');
  cssElement.setAttribute('href', src);
  queue.push({type:'less', elem:cssElement});
}
var requireCss = function(src,bustCache) {
  src = cacheBustify(src,bustCache);
  var cssElement=document.createElement('link');
  cssElement.setAttribute('rel','stylesheet');
  cssElement.setAttribute('type','text/css');
  cssElement.setAttribute('href', src);
  queue.push({type:'css', elem:cssElement});
}
var requireScript = function(src, bustCache) {
  src = cacheBustify(src,bustCache);
  var jsElement=document.createElement('script')
  jsElement.setAttribute('type','text/javascript');
  jsElement.setAttribute('charset','utf-8');  
  jsElement.setAttribute('src', src);
  queue.push({type:'js', elem:jsElement});
}

var loadAll = function() {

  function pollWebkit(linkElem) {
      var pollCount = 0;
      
      function poller() {
        var styleSheets = document.styleSheets;
        var i = styleSheets.length;
        
        // Look for a stylesheet matching the pending URL.
        while (--i >= 0) {
          if (styleSheets[i].href === linkElem.href) {
            loadNext();
            return;
          }
        }

        pollCount += 1;

        if (pollCount < 200) {
          setTimeout(poller, 50);
        } else {
          console.log("ERROR: We timed-out waiting for CSS to load");
        }
      }
      poller();
  }
  
  function loadNext() {
    if (queue.length > 0) {
      var q = queue.shift();
      var elem = q.elem;
      var isCSS = q.type == 'css';
      var isLess = q.type == 'less';
      
      if (!isCSS) {
        elem.onload = loadNext;          
      }

      document.getElementsByTagName("head")[0].appendChild(elem);   

      if (isCSS) {
        console.log("loading " + elem.getAttribute('href'));
        pollWebkit(elem);
      } else if (isLess) {
        console.log("loading " + elem.getAttribute('href'));
        loadNext();
      } else {
        console.log("loading " + elem.getAttribute('src'));
      }

    }
  }
  loadNext();
  
}

loadScriptPronto = function(src,bustCache) {

  src = cacheBustify(src,bustCache);
  var jsElement=document.createElement('script')
  jsElement.setAttribute('type','text/javascript');
  jsElement.setAttribute('charset','utf-8');  
  jsElement.setAttribute('src', src);

  document.getElementsByTagName("head")[0].appendChild(jsElement);   
  console.log("loading " + jsElement.getAttribute('src'));

}

var isiPad = navigator.userAgent.match(/iPad/i) != null;

//Styling:
requireCss('/stylesheets/style.css');

//Libaries
requireScript('/js/lib/underscore-min.js',     false);
requireScript("/js/lib/jquery-2.0.2.min.js"  , false);


//Internal Libraries
requireScript('/js/Events.js');
requireScript('/js/iPadScroller.js');

requireScript('/js/initialize.js');

loadAll();
