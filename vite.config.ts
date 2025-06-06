/*
 * Copyright (C)  Online-Go.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Plugin, defineConfig, ResolvedConfig, ViteDevServer, ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { promises as fs } from "fs";
import { IncomingMessage } from "http";
import http from "http";
import checker from "vite-plugin-checker";
import atImport from "postcss-import";
import inline_svg from "postcss-inline-svg";
import autoprefixer from "autoprefixer";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import fixReactVirtualized from "esbuild-plugin-react-virtualized";

let OGS_BACKEND = process.env.OGS_BACKEND;
OGS_BACKEND = OGS_BACKEND ? OGS_BACKEND.toUpperCase() : "BETA";

const SUPPORTED_BACKENDS = ["BETA", "PRODUCTION", "LOCAL"] as const;
if (process.env.OGS_BACKEND && !SUPPORTED_BACKENDS.includes(OGS_BACKEND as any)) {
    throw new Error(
        `Unsupported OGS_BACKEND value: ${OGS_BACKEND}. Must be one of: ${SUPPORTED_BACKENDS.join(
            ", ",
        )}`,
    );
}

const backend_url =
    OGS_BACKEND === "BETA"
        ? "https://beta.kidsgoserver.com"
        : OGS_BACKEND === "PRODUCTION"
          ? "https://kidsgoserver.com"
          : "http://127.0.0.1:1080"; // LOCAL

const proxy: Record<string, ProxyOptions> = {};

// REST api proxies
for (const base_path of [
    "/api",
    "/termination-api",
    "/merchant",
    "/billing",
    "/sso",
    "/oauth2",
    "/complete",
    "/disconnect",
    "/OGSScoreEstimator",
    "/oje",
    "/firewall",
    "/__debug__",
]) {
    proxy[base_path] = {
        target: backend_url,
        changeOrigin: true,
        rewrite: (path: string) => {
            return backend_url + path;
        },
    };
}

// termination-server websocket proxy
proxy["^/$"] = {
    target: backend_url + "/",
    changeOrigin: true,
    ws: true,
    rewriteWsOrigin: true,
    rewrite: (path: string) => {
        //console.info("termination-server websocket -> ", backend_url + "/");
        return backend_url + path;
    },
    bypass: (req, res, _options) => {
        if (res) {
            // res is undefined for websockets, which is the only thing we want
            // to proxy. For other requests, namely serving index.html, we want
            // vite to handle it, so returning the url here does that.
            return req.url;
        }
        return undefined;
    },
};

export default defineConfig({
    root: "src",

    build: {
        // This is our production build
        outDir: "../dist",
        sourcemap: true,
        minify: "terser",
        chunkSizeWarningLimit: 1024 * 1024 * 1.5,
        rollupOptions: {
            input: {
                kidsgo: "src/kidsgo.tsx",
            },
            output: {
                assetFileNames: "[name].[ext]",
                entryFileNames: "[name].js",
            },
        },
    },
    /*
     * NOTE: We don't use vite css processing for our production builds because
     * it doesn't support generating sourcemaps in production as of 2025-01-07
     *
     * For production, see compile-css.js, which should always kept in sync
     * with this config.
     */
    css: {
        postcss: {
            plugins: [atImport(), inline_svg(), autoprefixer()],
        },
        preprocessorMaxWorkers: true,
        devSourcemap: true,
    },
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),

        /* This is for goban to let it know we are building for a front end, as opposed to server usage */
        CLIENT: true,
    },
    plugins: [
        ogs_vite_middleware(),
        react(),
        {
            name: "welcome-message",
            configureServer(server) {
                server.httpServer?.once("listening", () => {
                    console.log("\n⚫ ⚪ Online-Go.com development server running...!");
                    console.log(
                        "\n⚫ ⚪ Chat with us in Slack at:\n\n   https://join.slack.com/t/online-go/shared_invite/zt-2jww58l2v-iwhhBiVsXNxcD9xm74bIKA\n",
                    );
                });
            },
        },
        process.env.NODE_ENV !== "production" ? nodePolyfills() : null,
        // checker relative directory is src/
        //
        checker({
            /*
            typescript: {
                tsconfigPath:
                    process.env.NODE_ENV === "production"
                        ? "tsconfig.json"
                        : "../tsconfig.json",
            },
            */
            eslint: {
                useFlatConfig: true,
                lintCommand: `eslint ${path.resolve(__dirname, "src")}`,
            },
            overlay: {
                initialIsOpen: true,
            },
            enableBuild: true,
        }),
    ],
    resolve: {
        alias: Object.assign(
            {
                "@kidsgo": path.resolve(__dirname, "src"),
                "@": path.resolve(__dirname, "online-go.com/src"),
                goban: path.resolve(__dirname, "online-go.com/submodules/goban/src"),
                goscorer: path.resolve(
                    __dirname,
                    "online-go.com/submodules/goban/src/third_party/goscorer/goscorer",
                ),
                "react-dynamic-help": path.resolve(__dirname, "submodules/react-dynamic-help/src"),
            },
            process.env.NODE_ENV !== "production"
                ? {
                      "source-map-js": "source-map",
                  }
                : ({} as any),
        ),
    },
    optimizeDeps: {
        esbuildOptions: {
            plugins: [fixReactVirtualized as any],
        },
    },

    server: {
        port: 18888,
        host: true,
        proxy,
        allowedHosts: true,
        hmr: {
            path: "/__vite_hmr",
            overlay: true,
        },
    },
});

/*
 * For historical reasons, OGS uses a custom index.html template system
 */
function ogs_vite_middleware(): Plugin {
    let config: ResolvedConfig;
    //let command: "build" | "serve" = "build";
    return {
        name: "ogs-process-index-template",
        /*
        config(_config, env) {
            command = env.command;
        },
        */
        configResolved(resolvedConfig) {
            config = resolvedConfig;
        },

        /**
         * for dev
         * if SPA, just use template and write script main.{js,ts} for /{entry}.html
         * if MPA, check pageName(default is index) and write /${pagesDir}/{pageName}/${entry}.html
         */
        configureServer(server: ViteDevServer) {
            return () => {
                /* Handle our custom index template, serve it for anything that doesn't look like a file */
                server.middlewares.use(async (req, res, next) => {
                    const url = req.originalUrl || "";
                    // if not html, next it.
                    const should_serve_index =
                        url.endsWith(".html") || url === "/" || /^.*\/[^.]*$/.test(url);
                    if (!should_serve_index) {
                        return next();
                    }

                    let content = await fs.readFile(
                        path.resolve(config.root, "kidsgo-index.html"),
                        "utf-8",
                    );

                    content = await ogs_process_template(content, req);

                    // using vite's transform html function to add basic html support
                    //content = await server.transformIndexHtml?.(req.url, content, req.originalUrl);
                    content = await server.transformIndexHtml?.(url, content, req.originalUrl);

                    res.end(content);
                });

                /* Handle some non vite static files */
                server.middlewares.use(async (req, res, next) => {
                    const url = req.originalUrl;

                    function send_response(
                        body: string,
                        content_type: string = "application/javascript",
                    ) {
                        res.setHeader("Content-Type", `${content_type}; charset=utf-8`);
                        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                        res.setHeader("Pragma", "no-cache");
                        res.setHeader("Expires", "0");
                        res.setHeader("Content-Length", Buffer.byteLength(body));
                        res.statusCode = 200;
                        res.end(body);
                        return;
                    }

                    const static_files = {
                        ".svg": "image/svg+xml",
                        ".png": "image/png",
                        ".ico": "image/x-icon",
                        ".webp": "image/webp",
                        ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg",
                        ".webm": "video/webm",
                    };
                    for (const [ext, mime_type] of Object.entries(static_files)) {
                        try {
                            if (url.endsWith(ext)) {
                                const f = path.resolve(__dirname + "/assets/" + url);
                                console.info(`GET ${url} -> ${f}`);
                                if (ext === ".svg") {
                                    send_response(await fs.readFile(f, "utf-8"), mime_type);
                                } else {
                                    send_response(await fs.readFile(f, null), mime_type);
                                }
                                return;
                            }
                        } catch (e) {
                            console.error(e);
                            res.statusCode = 404;
                            res.end("Not found");
                            return;
                        }
                    }

                    if (url === "/manifest.json") {
                        const manifest = {
                            short_name: "Kids Go Server",
                            name: "Kids Go Server",
                            icons: [
                                {
                                    //src: "https://cdn.online-go.com/icons/android-chrome-192x192.png",
                                    type: "image/png",
                                    sizes: "192x192",
                                },
                            ],
                            start_url: "/",
                            display: "standalone",
                            scope: "/",
                            background_color: "#eeeeee",
                            theme_color: "#000000",
                        };
                        send_response(JSON.stringify(manifest), "application/json");
                        return;
                    }
                    if (url?.endsWith("kidsgo.css")) {
                        // blank, vite deals with css stuff until production
                        send_response("", "text/css");
                        return;
                    }

                    /*
                    if (url?.endsWith("vendor.js")) {
                        console.info(`GET ${url} -> node_modules/vendor.js`);
                        send_response("");
                        return;
                    }
                    */

                    return next();
                });
            };
        },
    };
}

async function ogs_process_template(content: string, req: IncomingMessage): Promise<string> {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const port = url.port;

    const supported_languages = JSON.parse(
        await fs.readFile("i18n/languages.json", { encoding: "utf-8" }),
    );

    const replaced = content.replace(/[{][{]\s*(\w+)\s*[}][}]/g, (_, parameter) => {
        switch (parameter) {
            case "CDN_SERVICE": {
                // We run within a docker container on 8080 but are served out of 443 so no
                // need to specify a port, just use the same hostname.
                if (url.hostname?.indexOf("uffizzi") >= 0) {
                    return `//${url.hostname}/`;
                }
                return `//${url.hostname}:${port}/`;
            }
            case "LIVE_RELOAD": {
                if (url.hostname?.indexOf("uffizzi") >= 0) {
                    // no need for live reloading on uffizzi
                    return ``;
                }
                //return `<script async src="//${url.hostname}:35701/livereload.js"></script>`;
                return ``;
            }
            case "MIN":
                return "";

            case "PAGE_TITLE":
                return "";
            case "PAGE_DESCRIPTION":
                return "";
            case "PAGE_KEYWORDS":
                return "";
            case "PAGE_LANGUAGE":
                return getPreferredLanguage(req, supported_languages);

            case "OG_TITLE":
                return "";
            case "OG_URL":
                return "";
            case "OG_IMAGE":
                return "";
            case "OG_DESCRIPTION":
                return "";
            case "SUPPORTED_LANGUAGES":
                return JSON.stringify(supported_languages);

            case "AMEX_CLIENT_ID":
                /* cspell: disable-next-line */
                return "kvEB9qXE6jpNUv3fPkdbWcPaZ7nQAXyg";
            case "AMEX_ENV":
                return "qa";

            case "RELEASE":
                return "";
            case "VERSION":
                return "";
            case "LANGUAGE_VERSION":
                return "";
            case "VENDOR_HASH_DOTJS":
                return "js";
            case "VERSION_DOTJS":
                //return "js";
                return "";
            case "KIDSGO_VERSION_HASH_DOTJS":
                return "js";
            case "VERSION_DOTCSS":
                return "css";
            case "LANGUAGE_VERSION_DOTJS":
                return "js";
            case "GOBAN_JS": {
                // Since we're using Vite's module resolution in dev mode,
                // we don't need to serve a separate goban.js file
                return "";
            }
            case "EXTRA_CONFIG":
                //return `<script>window['websocket_host'] = "${server_url}";</script>`;
                return ``;
        }
        return "{{" + parameter + "}}";
    });
    return replaced;
}

/* Detect preferred language  */
function isSupportedLanguage(lang: string, supported_languages: any) {
    if (!lang) {
        return null;
    }

    lang = lang.toLowerCase();

    if (lang in supported_languages) {
        return lang;
    }

    lang = lang.replace(/-[a-z]+/, "");

    if (lang in supported_languages) {
        return lang;
    }

    return null;
}

function getPreferredLanguage(req: IncomingMessage, supported_languages: any) {
    let languages = ["en"];
    try {
        languages = (req.headers?.["accept-language"] || "")
            .split(",")
            .map((s) => s.replace(/;q=.*/, "").trim().toLowerCase());
    } catch (e) {
        console.trace(e);
    }

    try {
        for (let i = 0; i < languages.length; ++i) {
            const lang = isSupportedLanguage(languages[i], supported_languages);
            if (lang) {
                return lang;
            }
        }
    } catch (e) {
        console.trace(e);
    }

    return "en";
}
