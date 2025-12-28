from typing import List, Optional


def compute_sma(values: List[float], length: int) -> List[Optional[float]]:
    """
    Simple moving average. Returns a list the same length as `values`,
    with None for the first (length - 1) positions where the window
    is not full yet.
    """
    if length <= 0:
        raise ValueError("length must be positive")

    out: List[Optional[float]] = []
    window: List[float] = []

    for v in values:
        window.append(v)
        if len(window) > length:
            window.pop(0)

        if len(window) == length:
            out.append(sum(window) / length)
        else:
            out.append(None)

    return out


def compute_ema(values: List[float], length: int) -> List[Optional[float]]:
    """
    Exponential moving average using the standard EMA smoothing:
    alpha = 2 / (length + 1).
    Returns a list the same length as `values`,
    with None for the first (length - 1) positions.
    """
    if length <= 0:
        raise ValueError("length must be positive")

    out: List[Optional[float]] = []

    alpha = 2.0 / (length + 1.0)
    ema_val: Optional[float] = None

    for idx, v in enumerate(values):
        if ema_val is None:
            # seed EMA with a simple average of the first `length` values
            # once we have that many points
            if idx + 1 < length:
                out.append(None)
                continue
            start_slice = values[idx + 1 - length : idx + 1]
            ema_val = sum(start_slice) / float(length)
            out.append(ema_val)
        else:
            ema_val = alpha * v + (1.0 - alpha) * ema_val
            out.append(ema_val)

    return out


def compute_rsi(values: List[float], length: int = 14) -> List[Optional[float]]:
    """
    Classic Wilder's RSI.
    Returns list same length as `values`, with None where RSI
    cannot be computed yet (first `length` points).
    """
    if length <= 0:
        raise ValueError("length must be positive")

    if len(values) == 0:
        return []

    rsi: List[Optional[float]] = [None] * len(values)

    # First pass: compute initial average gain/loss
    gains: List[float] = []
    losses: List[float] = []

    for i in range(1, len(values)):
        change = values[i] - values[i - 1]
        if change > 0:
            gains.append(change)
            losses.append(0.0)
        else:
            gains.append(0.0)
            losses.append(-change)

    if len(gains) < length:
        # Not enough data to compute RSI
        return rsi

    avg_gain = sum(gains[:length]) / float(length)
    avg_loss = sum(losses[:length]) / float(length)

    # The index in `values` where we can first place a real RSI value
    # corresponds to gains index (length - 1) --> values index length
    first_rsi_index = length

    if avg_loss == 0:
        rsi[first_rsi_index] = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi[first_rsi_index] = 100.0 - (100.0 / (1.0 + rs))

    # Wilder smoothing for the rest
    for i in range(length + 1, len(values)):
        gain = gains[i - 1]
        loss = losses[i - 1]

        avg_gain = (avg_gain * (length - 1) + gain) / float(length)
        avg_loss = (avg_loss * (length - 1) + loss) / float(length)

        if avg_loss == 0:
            rsi[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi[i] = 100.0 - (100.0 / (1.0 + rs))

    return rsi


import pandas as pd


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds standard indicators (EMA, SMA, RSI) to the OHLCV dataframe.
    Uses the custom SMA/EMA/RSI functions defined above.
    Returns a new dataframe with indicator columns.
    """

    closes = df["close"].tolist()

    # EMA
    df["ema_20"] = compute_ema(closes, 20)
    df["ema_50"] = compute_ema(closes, 50)
    df["ema_200"] = compute_ema(closes, 200)

    # SMA
    df["sma_20"] = compute_sma(closes, 20)
    df["sma_50"] = compute_sma(closes, 50)

    # RSI
    df["rsi_14"] = compute_rsi(closes, 14)

    return df
