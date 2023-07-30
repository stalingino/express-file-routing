Object.defineProperty(exports, '__esModule', { value: true });

var express = require('express');
var path = require('path');
var fs = require('fs');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

const config = {
    VALID_FILE_EXTENSIONS: [".ts", ".js", ".mjs", "jsx", "tsx"],
    INVALID_NAME_SUFFIXES: [".d.ts"],
    IGNORE_PREFIX_CHAR: "_",
    DEFAULT_METHOD_EXPORTS: [
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "head",
        "connect",
        "options",
        "trace"
    ]
};

const isCjs = () => typeof module !== "undefined" && !!(module === null || module === void 0 ? void 0 : module.exports);
/**
 * @param parsedFile
 *
 * @returns Boolean Whether or not the file has to be excluded from route generation
 */
const isFileIgnored = (parsedFile) => !config.VALID_FILE_EXTENSIONS.includes(parsedFile.ext.toLowerCase()) ||
    config.INVALID_NAME_SUFFIXES.some(suffix => parsedFile.base.toLowerCase().endsWith(suffix)) ||
    parsedFile.name.startsWith(config.IGNORE_PREFIX_CHAR) ||
    parsedFile.dir.startsWith(`/${config.IGNORE_PREFIX_CHAR}`);
const isHandler = (handler) => typeof handler === "function" || Array.isArray(handler);
/**
 * @param routes
 *
 * @returns An array of sorted routes based on their priority
 */
const prioritizeRoutes = (routes) => routes.sort((a, b) => a.priority - b.priority);
/**
 * ```ts
 * mergePaths("/posts/[id]", "index.ts") -> "/posts/[id]/index.ts"
 * ```
 *
 * @param paths An array of mergeable paths
 *
 * @returns A unification of all paths provided
 */
const mergePaths = (...paths) => "/" +
    paths
        .map(path => path.replace(/^\/|\/$/g, ""))
        .filter(path => path !== "")
        .join("/");
const regBackets = /\[([^}]*)\]/g;
const transformBrackets = (value) => regBackets.test(value) ? value.replace(regBackets, (_, s) => `:${s}`) : value;
/**
 * @param path
 *
 * @returns A new path with all wrapping `[]` replaced by prefixed `:`
 */
const convertParamSyntax = (path) => {
    const subpaths = [];
    for (const subpath of path.split("/")) {
        subpaths.push(transformBrackets(subpath));
    }
    return mergePaths(...subpaths);
};
/**
 * ```ts
 * convertCatchallSyntax("/posts/:...catchall") -> "/posts/*"
 * ```
 *
 * @param url
 *
 * @returns A new url with all `:...` replaced by `*`
 */
const convertCatchallSyntax = (url) => url.replace(/:\.\.\.\w+/g, "*");
const buildRoutePath = (parsedFile) => {
    const directory = parsedFile.dir === parsedFile.root ? "" : parsedFile.dir;
    const name = parsedFile.name.startsWith("index")
        ? parsedFile.name.replace("index", "")
        : `/${parsedFile.name}`;
    return directory + name;
};
/**
 * @param path
 *
 * @returns A new path with all wrapping `[]` replaced by prefixed `:` and all `:...` replaced by `*`
 */
const buildRouteUrl = (path) => {
    const url = convertParamSyntax(path);
    return convertCatchallSyntax(url);
};
/**
 * The smaller the number the higher the priority with zero indicating highest priority
 *
 * @param url
 *
 * @returns An integer ranging from 0 to Infinity
 */
const calculatePriority = (url) => {
    var _a, _b, _c;
    const depth = ((_a = url.match(/\/.+?/g)) === null || _a === void 0 ? void 0 : _a.length) || 0;
    const specifity = ((_b = url.match(/\/:.+?/g)) === null || _b === void 0 ? void 0 : _b.length) || 0;
    const catchall = ((_c = url.match(/\/\*/g)) === null || _c === void 0 ? void 0 : _c.length) > 0 ? Infinity : 0;
    return depth + specifity + catchall;
};
const getHandlers = (handler) => {
    if (!Array.isArray(handler))
        return [handler];
    return handler;
};
const getMethodKey = (method) => {
    let methodKey = method.toLowerCase();
    if (methodKey === "del")
        return "delete";
    return methodKey;
};

const IS_ESM = !isCjs();
const MODULE_IMPORT_PREFIX = IS_ESM ? "file://" : "";
/**
 * Recursively walk a directory and return all nested files.
 *
 * @param directory The directory path to walk recursively
 * @param tree The tree of directories leading to the current directory
 *
 * @returns An array of all nested files in the specified directory
 */
const walkTree = (directory, tree = []) => {
    const results = [];
    for (const fileName of fs.readdirSync(directory)) {
        const filePath = path__default["default"].join(directory, fileName);
        const fileStats = fs.statSync(filePath);
        if (fileStats.isDirectory()) {
            results.push(...walkTree(filePath, [...tree, fileName]));
        }
        else {
            results.push({
                name: fileName,
                path: directory,
                rel: mergePaths(...tree, fileName)
            });
        }
    }
    return results;
};
/**
 * Generate routes from an array of files by loading them as modules.
 *
 * @param files An array of files to generate routes from
 *
 * @returns An array of routes
 */
const generateRoutes = (files) => __awaiter(void 0, void 0, void 0, function* () {
    const routes = [];
    for (const file of files) {
        const parsedFile = path__default["default"].parse(file.rel);
        if (isFileIgnored(parsedFile))
            continue;
        const routePath = buildRoutePath(parsedFile);
        const url = buildRouteUrl(routePath);
        const priority = calculatePriority(url);
        const exports = yield (function (t) { return Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(t)); }); })(MODULE_IMPORT_PREFIX + path__default["default"].join(file.path, file.name));
        routes.push({
            url,
            priority,
            exports
        });
    }
    return prioritizeRoutes(routes);
});

var _a;
const CJS_MAIN_FILENAME = typeof require !== "undefined" && ((_a = require.main) === null || _a === void 0 ? void 0 : _a.filename);
const PROJECT_DIRECTORY = CJS_MAIN_FILENAME
    ? path__default["default"].dirname(CJS_MAIN_FILENAME)
    : process.cwd();
/**
 * Attach routes to an Express app or router instance
 *
 * ```ts
 * await createRouter(app)
 * ```
 *
 * @param app An express app or router instance
 * @param options An options object (optional)
 */
const createRouter = (app, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const files = walkTree(options.directory || path__default["default"].join(PROJECT_DIRECTORY, "routes"));
    const routes = yield generateRoutes(files);
    for (const { url, exports } of routes) {
        const exportedMethods = Object.entries(exports);
        for (const [method, handler] of exportedMethods) {
            const methodKey = getMethodKey(method);
            const handlers = getHandlers(handler);
            if (!((_b = options.additionalMethods) === null || _b === void 0 ? void 0 : _b.includes(methodKey)) &&
                !config.DEFAULT_METHOD_EXPORTS.includes(methodKey))
                continue;
            app[methodKey](url, ...handlers);
        }
        // wildcard default export route matching
        if (typeof exports.default !== "undefined") {
            if (isHandler(exports.default)) {
                app.all.apply(app, [url, ...getHandlers(exports.default)]);
            }
            else if (typeof exports.default === "object" &&
                isHandler(exports.default.default)) {
                app.all.apply(app, [url, ...getHandlers(exports.default.default)]);
            }
        }
    }
    return app;
});

/**
 * Routing middleware
 *
 * ```ts
 * app.use("/", await router())
 * ```
 *
 * @param options An options object (optional)
 */
const router = (options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const routerOptions = (options === null || options === void 0 ? void 0 : options.routerOptions) || {};
    return yield createRouter(express.Router(routerOptions), options);
});

exports.createRouter = createRouter;
exports["default"] = createRouter;
exports.router = router;
//# sourceMappingURL=index.js.map
