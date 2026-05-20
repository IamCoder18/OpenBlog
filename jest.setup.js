require("@testing-library/jest-dom");
const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (!global.Headers) {
  global.Headers = class Headers {
    constructor(init) {
      this._map = new Map();
      if (init) {
        if (init instanceof Map || init instanceof Headers) {
          init.forEach((v, k) => this._map.set(k.toLowerCase(), v));
        } else {
          Object.entries(init).forEach(([k, v]) =>
            this._map.set(k.toLowerCase(), v)
          );
        }
      }
    }
    get(key) {
      return this._map.get(key.toLowerCase()) || null;
    }
    set(key, value) {
      this._map.set(key.toLowerCase(), value);
    }
    has(key) {
      return this._map.has(key.toLowerCase());
    }
    delete(key) {
      this._map.delete(key.toLowerCase());
    }
    append(key, value) {
      const existing = this.get(key);
      this.set(key, existing ? `${existing}, ${value}` : value);
    }
    forEach(cb) {
      this._map.forEach(cb);
    }
    entries() {
      return this._map.entries();
    }
    [Symbol.iterator]() {
      return this._map.entries();
    }
  };
}

if (!global.Request) {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === "string" ? input : input.url;
      this.method = init?.method || "GET";
      this.headers = init?.headers ? new Headers(init.headers) : new Headers();
      this.body = init?.body;
    }
    async json() {
      const text = await this.text();
      return JSON.parse(text);
    }
    async text() {
      if (typeof this.body === "string") return this.body;
      if (this.body && typeof this.body === "object")
        return JSON.stringify(this.body);
      return String(this.body || "");
    }
  };
}

if (!global.Response) {
  global.Response = class Response {
    constructor(body, init = {}) {
      this._body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || "OK";
      this.headers = new Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }
    async json() {
      const text = await this.text();
      return JSON.parse(text);
    }
    async text() {
      if (typeof this._body === "string") return this._body;
      if (this._body instanceof Uint8Array)
        return new TextDecoder().decode(this._body);
      if (this._body && typeof this._body === "object")
        return JSON.stringify(this._body);
      return String(this._body || "");
    }
  };
}

global.__PRISMA_INSTANCES__ = global.__PRISMA_INSTANCES__ || new Set();

afterAll(async () => {
  const instances = Array.from(global.__PRISMA_INSTANCES__);

  try {
    const db = await import("./src/lib/db");
    if (db.prisma && !global.__PRISMA_INSTANCES__.has(db.prisma)) {
      instances.push(db.prisma);
    }
  } catch {}

  for (const instance of instances) {
    if (instance && typeof instance.$disconnect === "function") {
      try {
        await Promise.race([
          instance.$disconnect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 200)
          ),
        ]);
      } catch {}
    }
  }
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
