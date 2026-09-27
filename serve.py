"""
@file serve.py
@description Servidor HTTP local para Fronteras de Acero.
Sirve los archivos estáticos de la carpeta `dist/` asegurando el tipo MIME
adecuado ('text/javascript') para los módulos ECMAScript (.mjs).
"""

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
