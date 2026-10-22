import random

import pytest

from app import app
from game import choose_move, evaluate, validate_board
from game.engine import available_moves, other


def test_detects_row_win():
    r = evaluate(["X", "X", "X", None, "O", "O", None, None, None])
    assert r["winner"] == "X" and r["line"] == [0, 1, 2]


def test_detects_draw():
    r = evaluate(["X", "O", "X", "X", "O", "O", "O", "X", "X"])
    assert r["draw"] and r["winner"] is None


def test_rejects_bad_boards():
    with pytest.raises(ValueError):
        validate_board(["X"] * 9)
    with pytest.raises(ValueError):
        validate_board([None] * 8)


def test_hard_ai_takes_winning_move():
    board = ["O", "O", None, "X", "X", None, None, None, None]
    assert choose_move(board, "O", "hard") == 2


def test_hard_ai_blocks():
    board = ["X", "X", None, None, "O", None, None, None, None]
    assert choose_move(board, "O", "hard") == 2


def test_medium_ai_blocks():
    board = ["X", "X", None, None, "O", None, None, None, None]
    assert choose_move(board, "O", "medium") == 2


def _explore(board, turn, ai):
    """Try every possible human reply; the hard AI must never lose."""
    r = evaluate(board)
    if r["over"]:
        assert r["winner"] != other(ai)
        return
    if turn == ai:
        move = choose_move(board, ai, "hard", random.Random(1))
        board[move] = ai
        _explore(board, other(turn), ai)
        board[move] = None
    else:
        for move in available_moves(board):
            board[move] = turn
            _explore(board, other(turn), ai)
            board[move] = None


@pytest.mark.parametrize("ai", ["X", "O"])
def test_hard_ai_is_unbeatable(ai):
    _explore([None] * 9, "X", ai)


def test_api_ai_move():
    client = app.test_client()
    res = client.post("/api/ai-move", json={"board": [None] * 9, "ai": "O", "difficulty": "easy"})
    assert res.status_code == 200
    assert 0 <= res.get_json()["move"] <= 8


def test_api_rejects_invalid_input():
    client = app.test_client()
    res = client.post("/api/ai-move", json={"board": ["Z"] * 9})
    assert res.status_code == 400
