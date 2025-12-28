from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from backtest.models.strategy_config import StrategyConfig

STORE_PATH = Path("data/strategies.json")


def _ensure_store_file():
    if not STORE_PATH.parent.exists():
        STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not STORE_PATH.exists():
        STORE_PATH.write_text("{}", encoding="utf-8")


def load_all_strategies() -> Dict[str, Any]:
    _ensure_store_file()
    raw = STORE_PATH.read_text(encoding="utf-8")
    if not raw.strip():
        return {}
    return json.loads(raw)


def save_all_strategies(data: Dict[str, Any]) -> None:
    _ensure_store_file()
    STORE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def save_strategy(name: str, config: StrategyConfig) -> None:
    data = load_all_strategies()
    data[name] = config.dict()
    save_all_strategies(data)


def get_strategy(name: str) -> StrategyConfig | None:
    data = load_all_strategies()
    cfg = data.get(name)
    if cfg is None:
        return None
    return StrategyConfig(**cfg)


def list_strategies() -> List[str]:
    data = load_all_strategies()
    return sorted(list(data.keys()))
