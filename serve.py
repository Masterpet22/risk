"""Serve the static game locally with the correct MIME type for ES modules."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class GameHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript"}


if __name__ == "__main__":
    root = Path(__file__).resolve().parent / "dist"
    handler = partial(GameHandler, directory=str(root))
    print("Juego disponible en http://localhost:8000", flush=True)
    ThreadingHTTPServer(("localhost", 8000), handler).serve_forever()
