/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  importScripts("/sw-push.js");
  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "sw-push.js",
    "revision": "b265da814ab4749c0a7f5f756acbd2a5"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "ed8a61d5260470025e3838838d4773c9"
  }, {
    "url": "pwa-512x512.png",
    "revision": "ed8a61d5260470025e3838838d4773c9"
  }, {
    "url": "pwa-192x192.png",
    "revision": "475244e8435a3de148caad11c0355a41"
  }, {
    "url": "index.html",
    "revision": "d47bece71178bc7c1cdfd505d145b40b"
  }, {
    "url": "icon.svg",
    "revision": "3f4d01f4a06fa2f227fbefe5cf1f8342"
  }, {
    "url": "favicon.png",
    "revision": "b17ba0c5e10f59453d71b2d752827bcf"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "948ee6a06b2f2f33c2d6e117ff16af51"
  }, {
    "url": "assets/web-Bdtscsa0.js",
    "revision": null
  }, {
    "url": "assets/index-D21o8wFF.js",
    "revision": null
  }, {
    "url": "assets/index-CoGYEYuS.css",
    "revision": null
  }, {
    "url": "assets/esm-DwkAN020.js",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261110-230024_Flipkart_d7063a61.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261110-225836_AI_Studio_c4b7fdad.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261110-223220_WhatsApp_da20da2e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-164107_Chrome_37dffaa2.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-163745_Chrome_0d2d9532.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-162604_ABHI_FASHION_Admin_11381f99.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-162601_ABHI_FASHION_Admin_235b985b.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-155831_ABHI_FASHION_Admin_e4f6252d.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-144026_ABHI_FASHION_Admin_d2e75894.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261101-000822_ABHI_FASHION_Admin_08bb27a7.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261031-000735_ABHI_FASHION_Admin_00a3d1db.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261030-234449_ABHI_FASHION_Admin_093c8c5e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261030-221934_ABHI_FASHION_57d00992.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261030-141437_Razorpay_c801364a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261029-220837_ABHI_FASHION_c31d3ad9.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261029-204238_ABHI_FASHION_Admin_857767bf.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261029-201853_Files_by_Google_628840d3.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261029-191349_Drive_fe4ac373.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261028-095625_ABHI_FASHION_Admin_44cff3da.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261025-165726_ABHI_FASHION_Admin_4df8d437.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261024-151620_ABHI_FASHION_0d1916c2.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261024-141658_ABHI_FASHION_Admin_951f292d.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261024-123323_Gmail_b57ca35e.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "948ee6a06b2f2f33c2d6e117ff16af51"
  }, {
    "url": "favicon.png",
    "revision": "b17ba0c5e10f59453d71b2d752827bcf"
  }, {
    "url": "icon.svg",
    "revision": "3f4d01f4a06fa2f227fbefe5cf1f8342"
  }, {
    "url": "pwa-192x192.png",
    "revision": "475244e8435a3de148caad11c0355a41"
  }, {
    "url": "pwa-512x512.png",
    "revision": "ed8a61d5260470025e3838838d4773c9"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "ed8a61d5260470025e3838838d4773c9"
  }, {
    "url": "manifest.webmanifest",
    "revision": "72e10425fc77cfb2309e96ef1f3d4f9c"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/images\.unsplash\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "product-images-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
