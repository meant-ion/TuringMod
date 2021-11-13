# 🐼 HTTPanda - a frugal HTTP server for simple tasks

- Lightweight and fast
- Streamlined feature set, sufficient for most applications
- Supports `express` (and `connect`) compatible middleware
- Both CommonJS and ES module support via [tsukuru](https://www.npmjs.com/package/tsukuru)

## Basic usage

```ts
import { Server } from 'httpanda';
import cors from 'cors';

const server = new Server();
server.use(cors())
      .get('/hello', (req, res) => res.end('Hello World!'))
      .get('/users/:id', (req, res) => res.end(`Welcome, user ${req.params.id}!`))
      .listen(3000).then(() => console.log('Listening on port 3000')).catch(e => console.error(e));
```

## Reference

### `new Server(options?: ServerOptions)`

Creates a new instance of HTTPanda.

All options are *optional*, you can just use `new Server()` to use the default options.

Available options:

#### `server`

Your own HTTP server instance. Can also take a `https.Server` to support SSL.

#### `onError`

An error handler that takes the following arguments:

- `e` - the error object
- `req` - the request object (an instance of the internal `Request` type)
- `res` - the response object (an instance of the internal `Response` type, currently equivalent to `http.ServerResponse`)
- `next` - a function you can call to ignore the error and keep walking the middleware chain

#### Example

```ts
const server = new Server({
    server: https.createServer({ /* ... certificate stuff ... */ }),
    onError: (e, res) => {
        console.log(e);
        res.statusCode = e.code || 500;
        res.end(JSON.stringify(e));
    }
})
```

### `server.listen(port: number): Promise<this>`

Listens to the given port. The returned `Promise` resolves with the `Server` instance on success, or rejects in case the port is in use or could otherwise not be bound.

Other forms of this as shown in the [node `net` documentation](https://nodejs.org/api/net.html#net_server_listen) are also supported, except the callback is always replaced by the returned `Promise`.

### `server.use(...callbacks: RouteCallback[]): this`
### `server.use(path: string, ...callbacks: RouteCallback[]): this`

Chains a set of middlewares on the given path, or on any path if none is given. **Express middlewares are supported!**

### `server.add(method: string | undefined, path: string, ...callbacks: RouteCallback[]): this`

Adds a callback to a specific path. Parameters can be specified on the path with a leading colon and are available on `req.params`:

```ts
server.get('/users/:id', (req, res) => res.end(`Welcome, user ${req.params.id}!`))
```

If you pass `undefined` as method, the callback will execute on any method.

### `server.all(path: string, ...callbacks: RouteCallback[]): this`

A shortcut to `server.add(undefined, path, ...callbacks)`.

### `server.get(path: string, ...callbacks: RouteCallback[]): this`

A shortcut to `server.add('GET', path, ...callbacks)`.

Other shortcuts that work the same way:

- `server.head`
- `server.options`
- `server.post`
- `server.put`
- `server.patch`
- `server.delete`
- `server.connect`
- `server.trace`
