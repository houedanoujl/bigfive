globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import 'node-fetch-native/polyfill';
import { Server as Server$1 } from 'node:http';
import { Server } from 'node:https';
import destr from 'destr';
import { defineEventHandler, handleCacheHeaders, createEvent, eventHandler, setHeaders, sendRedirect, proxyRequest, getRequestHeader, setResponseStatus, setResponseHeader, getRequestHeaders, createError, createApp, createRouter as createRouter$1, toNodeListener, fetchWithEvent, lazyEventHandler } from 'h3';
import { createFetch as createFetch$1, Headers } from 'ofetch';
import { createCall, createFetch } from 'unenv/runtime/fetch/index';
import { createHooks } from 'hookable';
import { snakeCase } from 'scule';
import { klona } from 'klona';
import defu, { defuFn } from 'defu';
import { hash } from 'ohash';
import { parseURL, withoutBase, joinURL, getQuery, withQuery, withLeadingSlash, withoutTrailingSlash } from 'ufo';
import { createStorage, prefixStorage } from 'unstorage';
import { toRouteMatcher, createRouter } from 'radix3';
import { promises } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'pathe';
import gracefulShutdown from 'http-graceful-shutdown';

const inlineAppConfig = {};



const appConfig = defuFn(inlineAppConfig);

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {}
};
const ENV_PREFIX = "NITRO_";
const ENV_PREFIX_ALT = _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_";
const _sharedRuntimeConfig = _deepFreeze(
  _applyEnv(klona(_inlineRuntimeConfig))
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  _applyEnv(runtimeConfig);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
_deepFreeze(klona(appConfig));
function _getEnv(key) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[ENV_PREFIX + envKey] ?? process.env[ENV_PREFIX_ALT + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function _applyEnv(obj, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = _getEnv(subKey);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
      }
      _applyEnv(obj[key], subKey);
    } else {
      obj[key] = envValue ?? obj[key];
    }
  }
  return obj;
}
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

const _assets = {

};

function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0].replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "");
}

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

const storage = createStorage({});

storage.mount('/assets', assets$1);

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

const defaultCacheOptions = {
  name: "_",
  base: "/cache",
  swr: true,
  maxAge: 1
};
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions, ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = hash([opts.integrity, fn, opts]);
  const validate = opts.validate || (() => true);
  async function get(key, resolver, shouldInvalidateCache) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    const entry = await useStorage().getItem(cacheKey) || {};
    const ttl = (opts.maxAge ?? opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || !validate(entry);
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry)) {
          useStorage().setItem(cacheKey, entry).catch((error) => console.error("[nitro] [cache]", error));
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (opts.swr && entry.value) {
      _resolvePromise.catch(console.error);
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = opts.shouldInvalidateCache?.(...args);
    const entry = await get(key, () => fn(...args), shouldInvalidateCache);
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
const cachedFunction = defineCachedFunction;
function getKey(...args) {
  return args.length > 0 ? hash(args, {}) : "";
}
function escapeKey(key) {
  return key.replace(/[^\dA-Za-z]/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions) {
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const key = await opts.getKey?.(event);
      if (key) {
        return escapeKey(key);
      }
      const url = event.node.req.originalUrl || event.node.req.url;
      const friendlyName = escapeKey(decodeURI(parseURL(url).pathname)).slice(
        0,
        16
      );
      const urlHash = hash(url);
      return `${friendlyName}.${urlHash}`;
    },
    validate: (entry) => {
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: [opts.integrity, handler]
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const reqProxy = cloneWithProxy(incomingEvent.node.req, { headers: {} });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            for (const header in headers2) {
              this.setHeader(header, headers2[header]);
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.context = incomingEvent.context;
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = headers.Etag || headers.etag || `W/"${hash(body)}"`;
      headers["last-modified"] = headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString();
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(event);
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      event.node.res.setHeader(name, response.headers[name]);
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler() {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      return sendRedirect(
        event,
        routeRules.redirect.to,
        routeRules.redirect.statusCode
      );
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: $fetch.raw,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    const path = new URL(event.node.req.url, "http://localhost").pathname;
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(path, useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

const plugins = [
  
];

function hasReqHeader(event, name, includes) {
  const value = getRequestHeader(event, name);
  return value && typeof value === "string" && value.toLowerCase().includes(includes);
}
function isJsonRequest(event) {
  return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function normalizeError(error) {
  const cwd = typeof process.cwd === "function" ? process.cwd() : "/";
  const stack = (error.stack || "").split("\n").splice(1).filter((line) => line.includes("at ")).map((line) => {
    const text = line.replace(cwd + "/", "./").replace("webpack:/", "").replace("file://", "").trim();
    return {
      text,
      internal: line.includes("node_modules") && !line.includes(".cache") || line.includes("internal") || line.includes("new Promise")
    };
  });
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage ?? (statusCode === 404 ? "Not Found" : "");
  const message = error.message || error.toString();
  return {
    stack,
    statusCode,
    statusMessage,
    message
  };
}
function trapUnhandledNodeErrors() {
  {
    process.on(
      "unhandledRejection",
      (err) => console.error("[nitro] [unhandledRejection] " + err)
    );
    process.on(
      "uncaughtException",
      (err) => console.error("[nitro]  [uncaughtException] " + err)
    );
  }
}

const errorHandler = (async function errorhandler(error, event) {
  const { stack, statusCode, statusMessage, message } = normalizeError(error);
  const errorObject = {
    url: event.node.req.url,
    statusCode,
    statusMessage,
    message,
    stack: "",
    data: error.data
  };
  if (error.unhandled || error.fatal) {
    const tags = [
      "[nuxt]",
      "[request error]",
      error.unhandled && "[unhandled]",
      error.fatal && "[fatal]",
      Number(errorObject.statusCode) !== 200 && `[${errorObject.statusCode}]`
    ].filter(Boolean).join(" ");
    console.error(tags, errorObject.message + "\n" + stack.map((l) => "  " + l.text).join("  \n"));
  }
  if (event.handled) {
    return;
  }
  setResponseStatus(event, errorObject.statusCode !== 200 && errorObject.statusCode || 500, errorObject.statusMessage);
  if (isJsonRequest(event)) {
    setResponseHeader(event, "Content-Type", "application/json");
    event.node.res.end(JSON.stringify(errorObject));
    return;
  }
  const isErrorPage = event.node.req.url?.startsWith("/__nuxt_error");
  const res = !isErrorPage ? await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig().app.baseURL, "/__nuxt_error"), errorObject), {
    headers: getRequestHeaders(event),
    redirect: "manual"
  }).catch(() => null) : null;
  if (!res) {
    const { template } = await import('../error-500.mjs');
    if (event.handled) {
      return;
    }
    setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
    event.node.res.end(template(errorObject));
    return;
  }
  const html = await res.text();
  if (event.handled) {
    return;
  }
  for (const [header, value] of res.headers.entries()) {
    setResponseHeader(event, header, value);
  }
  setResponseStatus(event, res.status && res.status !== 200 ? res.status : void 0, res.statusText);
  event.node.res.end(html);
});

const assets = {
  "/app.config.mjs": {
    "type": "application/javascript",
    "etag": "\"b4-w4/qaKLl0poFdUiW/VPGr+KgHp8\"",
    "mtime": "2023-06-27T10:59:13.094Z",
    "size": 180,
    "path": "../public/app.config.mjs"
  },
  "/components.d.ts": {
    "type": "video/mp2t",
    "etag": "\"1d50-xeavPIz85D5hx9Csoh4FpG1bxSU\"",
    "mtime": "2023-06-27T10:59:13.096Z",
    "size": 7504,
    "path": "../public/components.d.ts"
  },
  "/imports.d.ts": {
    "type": "video/mp2t",
    "etag": "\"79d-94V4Kexl6xcrIV3RYiFco9utW5A\"",
    "mtime": "2023-06-27T10:59:13.124Z",
    "size": 1949,
    "path": "../public/imports.d.ts"
  },
  "/nuxt.d.ts": {
    "type": "video/mp2t",
    "etag": "\"32b-2/qim/+SJQXbcVFnb3n/BTtQFpI\"",
    "mtime": "2023-06-27T10:59:13.129Z",
    "size": 811,
    "path": "../public/nuxt.d.ts"
  },
  "/nuxt.json": {
    "type": "application/json",
    "etag": "\"93-3xbd9Da1xrrAZE5R4e2lE4gB5TY\"",
    "mtime": "2023-06-27T10:59:13.134Z",
    "size": 147,
    "path": "../public/nuxt.json"
  },
  "/tsconfig.json": {
    "type": "application/json",
    "etag": "\"8e5-HGyFoRqiX6o6k30eKSwfzazlaMo\"",
    "mtime": "2023-06-27T10:59:13.142Z",
    "size": 2277,
    "path": "../public/tsconfig.json"
  },
  "/tsconfig.server.json": {
    "type": "application/json",
    "etag": "\"662-1Zqu8YsNd6LzkknKNX892NNpLEk\"",
    "mtime": "2023-06-27T10:59:13.145Z",
    "size": 1634,
    "path": "../public/tsconfig.server.json"
  },
  "/vue-router.d.ts": {
    "type": "video/mp2t",
    "etag": "\"1a-VunGZA5RGzve9Fiz90gn2O1Iz/w\"",
    "mtime": "2023-06-27T10:59:13.179Z",
    "size": 26,
    "path": "../public/vue-router.d.ts"
  },
  "/dev/index.mjs": {
    "type": "application/javascript",
    "etag": "\"a277-ZO76fwyfTpUV7t66l2iIcpYTBH8\"",
    "mtime": "2023-06-27T10:59:13.101Z",
    "size": 41591,
    "path": "../public/dev/index.mjs"
  },
  "/dev/index.mjs.map": {
    "type": "application/json",
    "etag": "\"26a6d-6byE6Wbnjb9amOwBJEGA/LUYSPw\"",
    "mtime": "2023-06-27T10:59:13.109Z",
    "size": 158317,
    "path": "../public/dev/index.mjs.map"
  },
  "/schema/nuxt.schema.d.ts": {
    "type": "video/mp2t",
    "etag": "\"27f-HnLd2pObZ/msWzsbeJSTWEYiatM\"",
    "mtime": "2023-06-27T10:59:13.137Z",
    "size": 639,
    "path": "../public/schema/nuxt.schema.d.ts"
  },
  "/schema/nuxt.schema.json": {
    "type": "application/json",
    "etag": "\"11-5XR6aG3zDB+uEGD0gajVnoHsCUE\"",
    "mtime": "2023-06-27T10:59:13.140Z",
    "size": 17,
    "path": "../public/schema/nuxt.schema.json"
  },
  "/types/app.config.d.ts": {
    "type": "video/mp2t",
    "etag": "\"40d-/LHDsJj0wjohv7kDtm6jJj8UNLk\"",
    "mtime": "2023-06-27T10:59:13.148Z",
    "size": 1037,
    "path": "../public/types/app.config.d.ts"
  },
  "/types/imports.d.ts": {
    "type": "video/mp2t",
    "etag": "\"7bba-BXF7VaSSEJEtjW+RiztE8ffySbs\"",
    "mtime": "2023-06-27T10:59:13.151Z",
    "size": 31674,
    "path": "../public/types/imports.d.ts"
  },
  "/types/layouts.d.ts": {
    "type": "video/mp2t",
    "etag": "\"117-KuByYUiKdu6N9pZA0rFiFLUDlt4\"",
    "mtime": "2023-06-27T10:59:13.154Z",
    "size": 279,
    "path": "../public/types/layouts.d.ts"
  },
  "/types/middleware.d.ts": {
    "type": "video/mp2t",
    "etag": "\"137-NUZHaPyCRnm/+HL/eQO43XjHcvk\"",
    "mtime": "2023-06-27T10:59:13.156Z",
    "size": 311,
    "path": "../public/types/middleware.d.ts"
  },
  "/types/nitro-config.d.ts": {
    "type": "video/mp2t",
    "etag": "\"d5-ZILgnJq15oORutWeK7sjZpxO1Vo\"",
    "mtime": "2023-06-27T10:59:13.159Z",
    "size": 213,
    "path": "../public/types/nitro-config.d.ts"
  },
  "/types/nitro-imports.d.ts": {
    "type": "video/mp2t",
    "etag": "\"2394-DTwspELBV/k4gHe8gOKSOWxcVwQ\"",
    "mtime": "2023-06-27T10:59:13.162Z",
    "size": 9108,
    "path": "../public/types/nitro-imports.d.ts"
  },
  "/types/nitro-nuxt.d.ts": {
    "type": "video/mp2t",
    "etag": "\"9-1OsAyJBE/z+5+tq9HMEFoPVInHs\"",
    "mtime": "2023-06-27T10:59:13.165Z",
    "size": 9,
    "path": "../public/types/nitro-nuxt.d.ts"
  },
  "/types/nitro-routes.d.ts": {
    "type": "video/mp2t",
    "etag": "\"189-22LoUWwOsrbXS4QPoOjn9L8SCdA\"",
    "mtime": "2023-06-27T10:59:13.166Z",
    "size": 393,
    "path": "../public/types/nitro-routes.d.ts"
  },
  "/types/nitro.d.ts": {
    "type": "video/mp2t",
    "etag": "\"89-1HVPr1iyzdtggudUc/zvyWOg8TA\"",
    "mtime": "2023-06-27T10:59:13.169Z",
    "size": 137,
    "path": "../public/types/nitro.d.ts"
  },
  "/types/plugins.d.ts": {
    "type": "video/mp2t",
    "etag": "\"54b-d24IKevcLPDTBaj3A1TgMhw/PfQ\"",
    "mtime": "2023-06-27T10:59:13.172Z",
    "size": 1355,
    "path": "../public/types/plugins.d.ts"
  },
  "/types/schema.d.ts": {
    "type": "video/mp2t",
    "etag": "\"38e-cHxScQXMu4/brcCYexL4EbUswPU\"",
    "mtime": "2023-06-27T10:59:13.174Z",
    "size": 910,
    "path": "../public/types/schema.d.ts"
  },
  "/types/vue-shim.d.ts": {
    "type": "video/mp2t",
    "etag": "\"91-fHdc0daJiYt9M6gACrSf7r2MgOs\"",
    "mtime": "2023-06-27T10:59:13.177Z",
    "size": 145,
    "path": "../public/types/vue-shim.d.ts"
  },
  "/_nuxt/axios.8f19e258.js": {
    "type": "application/javascript",
    "etag": "\"4559-HPqmJmPmRxO/Lfj47drZtLBMoJ0\"",
    "mtime": "2023-07-05T13:56:54.844Z",
    "size": 17753,
    "path": "../public/_nuxt/axios.8f19e258.js"
  },
  "/_nuxt/entry.229a0fc3.js": {
    "type": "application/javascript",
    "etag": "\"228f7-RRYual9yS9JDEYqwPut4PS6ANTE\"",
    "mtime": "2023-07-05T13:56:54.844Z",
    "size": 141559,
    "path": "../public/_nuxt/entry.229a0fc3.js"
  },
  "/_nuxt/error-404.23f2309d.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"e2e-ivsbEmi48+s9HDOqtrSdWFvddYQ\"",
    "mtime": "2023-07-05T13:56:54.843Z",
    "size": 3630,
    "path": "../public/_nuxt/error-404.23f2309d.css"
  },
  "/_nuxt/error-404.9cee4ef2.js": {
    "type": "application/javascript",
    "etag": "\"8d2-jtpEibet/f5B25HZNJsOhzyPDok\"",
    "mtime": "2023-07-05T13:56:54.837Z",
    "size": 2258,
    "path": "../public/_nuxt/error-404.9cee4ef2.js"
  },
  "/_nuxt/error-500.aa16ed4d.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"79e-7j4Tsx89siDo85YoIs0XqsPWmPI\"",
    "mtime": "2023-07-05T13:56:54.843Z",
    "size": 1950,
    "path": "../public/_nuxt/error-500.aa16ed4d.css"
  },
  "/_nuxt/error-500.df67b4b4.js": {
    "type": "application/javascript",
    "etag": "\"756-NKSu73os6cMzJwxD6y2JgPP1ZwU\"",
    "mtime": "2023-07-05T13:56:54.839Z",
    "size": 1878,
    "path": "../public/_nuxt/error-500.df67b4b4.js"
  },
  "/_nuxt/index.207ba468.js": {
    "type": "application/javascript",
    "etag": "\"760-FQ5WrqIS5GkO3ujs7le7JY2fo7o\"",
    "mtime": "2023-07-05T13:56:54.843Z",
    "size": 1888,
    "path": "../public/_nuxt/index.207ba468.js"
  },
  "/_nuxt/index.654837fa.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"3c95-6Dw45uc8e5El1JhHnzEaZKMcXY4\"",
    "mtime": "2023-07-05T13:56:54.843Z",
    "size": 15509,
    "path": "../public/_nuxt/index.654837fa.css"
  },
  "/_nuxt/index.79189bb4.js": {
    "type": "application/javascript",
    "etag": "\"dc-uf+NKYH1WkZoRPlJkMP2/WvqSEM\"",
    "mtime": "2023-07-05T13:56:54.843Z",
    "size": 220,
    "path": "../public/_nuxt/index.79189bb4.js"
  },
  "/_nuxt/index.98fce891.js": {
    "type": "application/javascript",
    "etag": "\"e6-zBZTjagBANgSjf6e1rS0tIf9UZI\"",
    "mtime": "2023-07-05T13:56:54.843Z",
    "size": 230,
    "path": "../public/_nuxt/index.98fce891.js"
  },
  "/_nuxt/index.9e2dec2d.js": {
    "type": "application/javascript",
    "etag": "\"e1-pwquQaBWMxkS7Lj/79I1agET6Fs\"",
    "mtime": "2023-07-05T13:56:54.843Z",
    "size": 225,
    "path": "../public/_nuxt/index.9e2dec2d.js"
  },
  "/_nuxt/index.bf768af9.js": {
    "type": "application/javascript",
    "etag": "\"db-JA/020u1LWkwyj3uXByKHjjl9Vs\"",
    "mtime": "2023-07-05T13:56:54.844Z",
    "size": 219,
    "path": "../public/_nuxt/index.bf768af9.js"
  },
  "/_nuxt/index.fb32270e.js": {
    "type": "application/javascript",
    "etag": "\"22ac6-MPDS9oA7Pfh1ZzlgFh5bcrkZUQw\"",
    "mtime": "2023-07-05T13:56:54.838Z",
    "size": 142022,
    "path": "../public/_nuxt/index.fb32270e.js"
  },
  "/_nuxt/Logo.be781622.js": {
    "type": "application/javascript",
    "etag": "\"321-ZDGwdgCqh6IryBuayK+MkSwF/2Q\"",
    "mtime": "2023-07-05T13:56:54.844Z",
    "size": 801,
    "path": "../public/_nuxt/Logo.be781622.js"
  },
  "/_nuxt/nuxt-link.2a13f265.js": {
    "type": "application/javascript",
    "etag": "\"10f7-x1pqxqcgMscwyctVYHhPrKB8NZs\"",
    "mtime": "2023-07-05T13:56:54.843Z",
    "size": 4343,
    "path": "../public/_nuxt/nuxt-link.2a13f265.js"
  }
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {"/_nuxt":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _f4b49z = eventHandler((event) => {
  if (event.node.req.method && !METHODS.has(event.node.req.method)) {
    return;
  }
  let id = decodeURIComponent(
    withLeadingSlash(
      withoutTrailingSlash(parseURL(event.node.req.url).pathname)
    )
  );
  let asset;
  const encodingHeader = String(
    event.node.req.headers["accept-encoding"] || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  if (encodings.length > 1) {
    event.node.res.setHeader("Vary", "Accept-Encoding");
  }
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      event.node.res.removeHeader("cache-control");
      throw createError({
        statusMessage: "Cannot find static asset " + id,
        statusCode: 404
      });
    }
    return;
  }
  const ifNotMatch = event.node.req.headers["if-none-match"] === asset.etag;
  if (ifNotMatch) {
    if (!event.handled) {
      event.node.res.statusCode = 304;
      event.node.res.end();
    }
    return;
  }
  const ifModifiedSinceH = event.node.req.headers["if-modified-since"];
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    if (!event.handled) {
      event.node.res.statusCode = 304;
      event.node.res.end();
    }
    return;
  }
  if (asset.type && !event.node.res.getHeader("Content-Type")) {
    event.node.res.setHeader("Content-Type", asset.type);
  }
  if (asset.etag && !event.node.res.getHeader("ETag")) {
    event.node.res.setHeader("ETag", asset.etag);
  }
  if (asset.mtime && !event.node.res.getHeader("Last-Modified")) {
    event.node.res.setHeader("Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !event.node.res.getHeader("Content-Encoding")) {
    event.node.res.setHeader("Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !event.node.res.getHeader("Content-Length")) {
    event.node.res.setHeader("Content-Length", asset.size);
  }
  return readAsset(id);
});

const _lazy_JoKh9t = () => import('../handlers/renderer.mjs');

const handlers = [
  { route: '', handler: _f4b49z, lazy: false, middleware: true, method: undefined },
  { route: '/__nuxt_error', handler: _lazy_JoKh9t, lazy: true, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_JoKh9t, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const h3App = createApp({
    debug: destr(false),
    onError: errorHandler
  });
  const router = createRouter$1();
  h3App.use(createRouteRulesHandler());
  const localCall = createCall(toNodeListener(h3App));
  const localFetch = createFetch(localCall, globalThis.fetch);
  const $fetch = createFetch$1({
    fetch: localFetch,
    Headers,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(
    eventHandler((event) => {
      event.context.nitro = event.context.nitro || {};
      const envContext = event.node.req.__unenv__;
      if (envContext) {
        Object.assign(event.context, envContext);
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
    })
  );
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch
  };
  for (const plugin of plugins) {
    plugin(app);
  }
  return app;
}
const nitroApp = createNitroApp();
const useNitroApp = () => nitroApp;

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT, 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  gracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((err) => {
          console.error(err);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const server = cert && key ? new Server({ key, cert }, toNodeListener(nitroApp.h3App)) : new Server$1(toNodeListener(nitroApp.h3App));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const listener = server.listen(port, host, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const addressInfo = listener.address();
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
  console.log(`Listening ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
const nodeServer = {};

export { useRuntimeConfig as a, getRouteRules as g, nodeServer as n, useNitroApp as u };
//# sourceMappingURL=node-server.mjs.map
