"""Local preview server that mimics Azure Static Web Apps.

- Clean URLs: maps /about -> about.html so extensionless links work locally.
- API proxy: forwards /api/* to the Azure Functions host (default http://localhost:7071),
  exactly like Azure Static Web Apps wires them together. Start the Functions host
  separately with `func start` (from the api/ folder) so /api/contact and /api/pricing work.

Run: python serve.py   (serves on http://localhost:8000)
"""
import os
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

API_HOST = os.environ.get("API_HOST", "http://localhost:7071")


class CleanURLHandler(SimpleHTTPRequestHandler):
    def _proxy_api(self):
        """Forward the current request to the Functions host and stream the response back."""
        target = API_HOST + self.path
        length = int(self.headers.get("Content-Length", 0) or 0)
        data = self.rfile.read(length) if length else None

        req = urllib.request.Request(target, data=data, method=self.command)
        for h in ("Content-Type", "Accept", "Authorization"):
            if h in self.headers:
                req.add_header(h, self.headers[h])

        try:
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                body = resp.read()
                for k, v in resp.getheaders():
                    if k.lower() not in ("transfer-encoding", "connection", "content-length"):
                        self.send_header(k, v)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.URLError:
            msg = b'{"error":"API host not reachable. Start it with: cd api && func start"}'
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._proxy_api()
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._proxy_api()
        self.send_error(405, "Method Not Allowed")

    def translate_path(self, path):
        local = super().translate_path(path)
        # If the request has no extension and no such dir/file, try adding .html
        if not os.path.exists(local) and not os.path.splitext(local)[1]:
            if os.path.isfile(local + ".html"):
                return local + ".html"
        return local


if __name__ == "__main__":
    # Serve the site root (this script's folder) regardless of where it's launched from.
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = 8000
    print(f"Serving http://localhost:{port}  (clean URLs + /api proxy -> {API_HOST}, Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", port), CleanURLHandler).serve_forever()
