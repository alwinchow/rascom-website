"""Local preview server that mimics Azure Static Web Apps clean-URL routing.
Maps /about -> about.html so the site's extensionless links work locally.
Run: python serve.py   (serves on http://localhost:8000)
"""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class CleanURLHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        local = super().translate_path(path)
        # If the request has no extension and no such dir/file, try adding .html
        if not os.path.exists(local) and not os.path.splitext(local)[1]:
            if os.path.isfile(local + ".html"):
                return local + ".html"
        return local


if __name__ == "__main__":
    port = 8000
    print(f"Serving http://localhost:{port}  (clean URLs enabled, Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", port), CleanURLHandler).serve_forever()
