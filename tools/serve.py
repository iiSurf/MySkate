#!/usr/bin/env python3
"""A local test server for MySkate.

Python's built-in `python3 -m http.server` drops connections when a browser asks for
the app's many small modules at once, and it lets the browser cache old copies of files.
This one queues more connections and never caches. Run it from the repo root:

    python3 tools/serve.py          # http://localhost:8000
    python3 tools/serve.py 9000     # another port

GitHub Pages is not affected by either problem.
"""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


http.server.ThreadingHTTPServer.request_queue_size = 128

if __name__ == "__main__":
    http.server.test(HandlerClass=Handler, ServerClass=http.server.ThreadingHTTPServer, port=PORT, bind="127.0.0.1")
