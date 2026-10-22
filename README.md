# Tic Tac Toe

A classic Tic Tac Toe game with a chalkboard / paper look, a **two-player mode**, and a
**computer opponent** with three difficulty levels (the hardest is unbeatable).
Built with a **Python (Flask)** backend and a dependency-free **HTML/CSS/JavaScript** frontend.

## Tech stack

| Layer      | Technology |
|------------|------------|
| Backend    | Python 3.9+, Flask (REST API + page serving) |
| Game AI    | Pure Python - minimax algorithm with alpha-beta pruning |
| Frontend   | HTML5, CSS3 (custom properties, grid, animations), vanilla JavaScript (ES2020) |
| Testing    | pytest (engine, AI and API tests) |
| Extras     | Web Audio API sound effects, localStorage persistence, SVG hand-drawn marks |

## Features

- Two modes: **vs Computer** and **2 Players** (same device)
- Three AI levels: **Easy** (random), **Medium** (wins/blocks, otherwise mostly random), **Hard** (unbeatable minimax)
- Choose to play as **X** or **O** (the computer opens when you play O)
- Scoreboard (wins, draws) saved between visits
- **Undo** your last move, **New round**, **Reset scores**
- Animated hand-drawn X / O marks, winning-line highlight, "thinking" indicator
- Chalkboard and Paper themes, optional sound effects
- Fully responsive (phones, tablets, desktop), touch friendly
- Accessible: ARIA labels, live status announcements, visible focus, keyboard play (keys 1-9, N, U), respects reduced-motion
- Graceful fallback if the server can't be reached (random move)

## Run it

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the app
python app.py

# 4. Open http://127.0.0.1:5000 in your browser
```

Optional: `PORT=8000 python app.py` to change the port, `FLASK_DEBUG=1 python app.py` for auto-reload.

## Run the tests

```bash
pytest -v
```

The test suite includes an exhaustive check that the Hard AI never loses, whether it plays X or O.

## Project structure

```
tictactoe/
├── app.py                # Flask app: page + JSON API
├── game/
│   ├── __init__.py
│   └── engine.py         # Rules, win detection, minimax AI
├── templates/index.html  # Page markup
├── static/
│   ├── css/style.css     # Themes, layout, animations
│   └── js/app.js         # Game flow, UI, sound, storage
├── tests/test_engine.py  # pytest suite
├── requirements.txt
└── README.md
```

## API

| Method | Endpoint        | Body                                   | Returns |
|--------|-----------------|----------------------------------------|---------|
| GET    | `/api/health`   | -                                      | `{"status": "ok"}` |
| POST   | `/api/evaluate` | `{"board": [9 cells]}`                 | `{winner, line, draw, over}` |
| POST   | `/api/ai-move`  | `{"board", "ai": "X"/"O", "difficulty"}` | `{move, winner, line, draw, over}` |

Cells are `"X"`, `"O"` or `null`, indexed 0-8 row by row.

## Ideas to extend

Online multiplayer with WebSockets, larger boards (4x4 / 5x5), a move-history replay, or deployment to Render / Railway.
"# tic-tac-toe" 
