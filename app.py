"""Tic Tac Toe - Flask application (serves the UI and the AI JSON API)."""
from __future__ import annotations

import os

from flask import Flask, jsonify, render_template, request

from game import choose_move, evaluate, validate_board

app = Flask(__name__)


def _error(message: str, status: int = 400):
    return jsonify({"error": message}), status


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/evaluate")
def api_evaluate():
    """Return winner / winning line / draw for a given board."""
    data = request.get_json(silent=True) or {}
    try:
        board = validate_board(data.get("board"))
    except ValueError as exc:
        return _error(str(exc))
    return jsonify(evaluate(board))


@app.post("/api/ai-move")
def api_ai_move():
    """Let the computer play. Body: {board, ai: 'X'|'O', difficulty}."""
    data = request.get_json(silent=True) or {}
    try:
        board = validate_board(data.get("board"))
        move = choose_move(board, data.get("ai", "O"), data.get("difficulty", "hard"))
    except ValueError as exc:
        return _error(str(exc))

    board[move] = data.get("ai", "O")
    return jsonify({"move": move, **evaluate(board)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
