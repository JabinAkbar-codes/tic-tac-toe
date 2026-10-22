"""Pure-Python Tic Tac Toe engine.

The board is a list of 9 cells (index 0..8, row-major). Each cell is
"X", "O" or None (empty / "" is also accepted and normalised).

Difficulty levels
-----------------
easy   : picks a random free cell.
medium : wins or blocks when it can, otherwise plays randomly most of the time.
hard   : minimax with alpha-beta pruning - mathematically unbeatable.
"""
from __future__ import annotations

import random
from typing import List, Optional, Sequence

WIN_LINES = (
    (0, 1, 2), (3, 4, 5), (6, 7, 8),   # rows
    (0, 3, 6), (1, 4, 7), (2, 5, 8),   # columns
    (0, 4, 8), (2, 4, 6),              # diagonals
)

PLAYERS = ("X", "O")
DIFFICULTIES = ("easy", "medium", "hard")


def other(player: str) -> str:
    return "O" if player == "X" else "X"


def validate_board(board: Sequence) -> List[Optional[str]]:
    """Return a normalised copy of the board or raise ValueError."""
    if not isinstance(board, (list, tuple)) or len(board) != 9:
        raise ValueError("Board must be a list of 9 cells.")
    clean: List[Optional[str]] = []
    for cell in board:
        if cell in (None, ""):
            clean.append(None)
        elif cell in PLAYERS:
            clean.append(cell)
        else:
            raise ValueError(f"Invalid cell value: {cell!r}")
    x, o = clean.count("X"), clean.count("O")
    if abs(x - o) > 1:
        raise ValueError("Board is not a reachable position.")
    return clean


def available_moves(board: Sequence) -> List[int]:
    return [i for i, cell in enumerate(board) if not cell]


def evaluate(board: Sequence) -> dict:
    """Describe the state of a board: winner, winning line, draw flag."""
    for a, b, c in WIN_LINES:
        if board[a] and board[a] == board[b] == board[c]:
            return {"winner": board[a], "line": [a, b, c], "draw": False, "over": True}
    draw = all(board)
    return {"winner": None, "line": None, "draw": draw, "over": draw}


# --------------------------------------------------------------------------- #
# Minimax with alpha-beta pruning
# --------------------------------------------------------------------------- #
def _minimax(board: list, turn: str, ai: str, depth: int, alpha: int, beta: int) -> int:
    result = evaluate(board)
    if result["winner"] == ai:
        return 10 - depth          # faster wins score higher
    if result["winner"]:
        return depth - 10          # slower losses score higher
    if result["draw"]:
        return 0

    if turn == ai:
        best = -100
        for move in available_moves(board):
            board[move] = turn
            best = max(best, _minimax(board, other(turn), ai, depth + 1, alpha, beta))
            board[move] = None
            alpha = max(alpha, best)
            if beta <= alpha:
                break
        return best

    best = 100
    for move in available_moves(board):
        board[move] = turn
        best = min(best, _minimax(board, other(turn), ai, depth + 1, alpha, beta))
        board[move] = None
        beta = min(beta, best)
        if beta <= alpha:
            break
    return best


def _best_moves(board: list, ai: str) -> List[int]:
    """All moves sharing the best minimax score (lets the AI vary its play)."""
    scored = []
    for move in available_moves(board):
        board[move] = ai
        score = _minimax(board, other(ai), ai, 1, -100, 100)
        board[move] = None
        scored.append((score, move))
    top = max(score for score, _ in scored)
    return [move for score, move in scored if score == top]


def _winning_move(board: list, player: str) -> Optional[int]:
    for move in available_moves(board):
        board[move] = player
        won = evaluate(board)["winner"] == player
        board[move] = None
        if won:
            return move
    return None


def choose_move(board: Sequence, ai: str, difficulty: str = "hard",
                rng: Optional[random.Random] = None) -> int:
    """Pick a move for `ai` on `board` according to `difficulty`."""
    rng = rng or random
    state = validate_board(board)
    if ai not in PLAYERS:
        raise ValueError("ai must be 'X' or 'O'.")
    if difficulty not in DIFFICULTIES:
        raise ValueError(f"difficulty must be one of {DIFFICULTIES}.")
    moves = available_moves(state)
    if not moves or evaluate(state)["over"]:
        raise ValueError("No moves available - the game is already over.")

    if difficulty == "easy":
        return rng.choice(moves)

    if difficulty == "medium":
        win = _winning_move(state, ai)
        if win is not None:
            return win
        block = _winning_move(state, other(ai))
        if block is not None:
            return block
        if rng.random() < 0.35:                      # sometimes play smart
            return rng.choice(_best_moves(state, ai))
        return rng.choice(moves)

    return rng.choice(_best_moves(state, ai))        # hard
