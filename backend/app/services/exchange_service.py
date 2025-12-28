import asyncio
import aiohttp
import hashlib
import hmac
import base64
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Trade

try:
    from aiohttp_socks import SocksConnector
    SOCKS_AVAILABLE = True
except ImportError:
    SOCKS_AVAILABLE = False

class ExchangeService:
    BLOFIN_API_URL = "https://openapi.blofin.com"  # Correct domain per Blofin support
    BLOFIN_DEMO_URL = "https://openapi-demo.blofin.com"
    # SOCKS5 proxy to bypass geoblocking (US)
    # You can replace this with your own VPN's SOCKS5 proxy address
    # Format: "socks5://ip:port" or "socks5://user:pass@ip:port"
    # Updated: Using more reliable free proxy
    SOCKS5_PROXY = "socks5://159.65.9.135:8080"  # Singapore SOCKS5 proxy

    def __init__(self):
        pass

    def _generate_blofin_signature(self, timestamp_str: str, method: str, request_path: str, body: str, api_secret: str, nonce: str = "", sig_format: int = 2) -> str:
        """
        Generate HMAC-SHA256 signature for Blofin API authentication.
        sig_format determines the string concatenation order:
        1 = path + method + ts + nonce + body
        2 = ts + method + path + body (original)
        3 = method + path + ts + body
        4 = path + method + ts
        5 = path + method + ts (without query params)
        """
        if sig_format == 1:
            sign_string = request_path + method + timestamp_str + nonce + body
        elif sig_format == 2:
            sign_string = timestamp_str + method + request_path + body
        elif sig_format == 3:
            sign_string = method + request_path + timestamp_str + body
        elif sig_format == 4:
            sign_string = request_path + method + timestamp_str
        else:
            sign_string = timestamp_str + method + request_path + body

        signature = base64.b64encode(
            hmac.new(
                api_secret.encode(),
                sign_string.encode(),
                hashlib.sha256
            ).digest()
        ).decode()
        return signature

    async def _make_blofin_request(self, session: aiohttp.ClientSession, method: str, endpoint: str,
                                   api_key: str, api_secret: str, api_passphrase: str,
                                   params: Dict = None, body: str = "") -> Dict[str, Any]:
        """
        Make authenticated request to Blofin API.
        Signature: path + method + timestamp + nonce + body (per official Blofin docs)
        """
        from urllib.parse import urlencode
        import uuid

        timestamp_ms = int(time.time() * 1000)
        timestamp_str = str(timestamp_ms)
        nonce = str(uuid.uuid4())  # Generate unique nonce for this request

        # Build the full URL with query parameters
        url = self.BLOFIN_API_URL + endpoint
        if params and method == "GET":
            # Use urlencode which maintains proper URL encoding and sorted keys
            param_str = urlencode(sorted(params.items()))
            url = f"{url}?{param_str}"
            request_path = f"{endpoint}?{param_str}"
        else:
            request_path = endpoint

        # CORRECT Signature format per Blofin documentation:
        # path + method + timestamp + nonce + body
        # Then: HMAC-SHA256 -> hexdigest -> base64encode
        sign_string = request_path + method + timestamp_str + nonce + body
        hex_sig = hmac.new(
            api_secret.encode(),
            sign_string.encode(),
            hashlib.sha256
        ).hexdigest().encode()
        signature = base64.b64encode(hex_sig).decode()

        # Prepare headers with correct header names (Blofin documentation)
        headers = {
            "ACCESS-KEY": api_key,
            "ACCESS-SIGN": signature,
            "ACCESS-TIMESTAMP": timestamp_str,
            "ACCESS-NONCE": nonce,
            "ACCESS-PASSPHRASE": api_passphrase,
        }

        print(f"\n🔐 Blofin Request Debug:")
        print(f"   Method: {method}")
        print(f"   URL: {url}")
        print(f"   Request Path: {request_path}")
        print(f"   Timestamp: {timestamp_str}")
        print(f"   Sign String: {sign_string[:120]}...")
        print(f"   Signature: {signature}")

        try:
            async with session.request(method, url, headers=headers, data=body if body else None) as response:
                try:
                    data = await response.json()
                except Exception as json_err:
                    # If JSON parsing fails, get raw text
                    text = await response.text()
                    print(f"❌ Blofin API Error {response.status}: Failed to parse JSON")
                    print(f"   Response type: {response.content_type}")
                    print(f"   Response text (first 500 chars): {text[:500]}")
                    return {"code": str(response.status), "data": []}

                if response.status != 200:
                    print(f"❌ Blofin API Error: {response.status}")
                    print(f"   Response: {data}")
                    print(f"   Full headers in response: {response.headers}")
                    return {"code": str(response.status), "data": []}

                return data

        except Exception as e:
            print(f"❌ Request failed: {e}")
            import traceback
            traceback.print_exc()
            return {"code": "error", "data": []}

    async def fetch_all_trades(self, exchange_id: str, api_key: str, api_secret: str, api_passphrase: str = None, since: int = None) -> List[Dict[str, Any]]:
        """
        Fetch ALL trade history from Blofin using native REST API.
        Returns normalized trades ready for database insertion.
        """
        if exchange_id != 'blofin':
            raise ValueError(f"This method only supports Blofin exchange")

        all_trades = []

        try:
            # Use direct connection with correct domain (openapi.blofin.com)
            print("✅ Using direct connection to Blofin API (openapi.blofin.com)")
            connector = None

            async with aiohttp.ClientSession(connector=connector) as session:
                # Fetch all fills (completed trades)
                print("🔍 Fetching trade fills from Blofin API...")

                # Get trade history - this contains completed trades with entry/exit prices, PnL, etc
                # Per Blofin documentation: /api/v1/trade/fills-history accesses completed fill records
                # Do NOT use instType parameter - the working implementation fetches all fills without filtering
                # This returns futures trades from your Blofin account
                fills_endpoint = "/api/v1/trade/fills-history"
                params = {
                    "limit": 100
                }

                all_fills = []
                after = None

                while True:
                    if after:
                        params["after"] = after

                    response = await self._make_blofin_request(
                        session, "GET", fills_endpoint, api_key, api_secret, api_passphrase,
                        params=params
                    )

                    # Check for permission error
                    if response.get("code") == "152404":
                        error_msg = (
                            "❌ API KEY PERMISSION ERROR: Your API key type does not have access to trade endpoints.\n"
                            "   Error: 152404 - This operation is not supported\n"
                            "   \n"
                            "   Your current API key is likely a 'Third-Party Application' type key, which has LIMITED permissions.\n"
                            "   Third-Party keys can only access PUBLIC endpoints like market data, NOT your private trade history.\n"
                            "   \n"
                            "   SOLUTION: Create a REGULAR (non-third-party) API key with:\n"
                            "   - READ permission enabled (to fetch trade history)\n"
                            "   - TRADE permission enabled (optional, for placing orders)\n"
                            "   \n"
                            "   Steps:\n"
                            "   1. Go to Blofin account settings → API Management\n"
                            "   2. Delete the 'Third-Party Application' key (5356f0a4a5fb...)\n"
                            "   3. Create a NEW API key with 'Main Account' or 'Sub Account' type\n"
                            "   4. Enable 'Read' and/or 'Trade' permissions\n"
                            "   5. Use the new API key credentials in this application\n"
                        )
                        print(error_msg)
                        return []

                    if response.get("code") != "0" or not response.get("data"):
                        print(f"No more fills or error: {response.get('code')} - {response.get('msg')}")
                        break

                    fills = response.get("data", [])
                    if not fills:
                        break

                    all_fills.extend(fills)
                    print(f"📦 Fetched {len(fills)} fills (total: {len(all_fills)})")

                    # Get next page ID
                    after = response.get("paging", {}).get("after")
                    if not after:
                        break

                    # Safety limit
                    if len(all_fills) > 50000:
                        print("Reached 50k trade limit")
                        break

                print(f"✅ Total fills fetched: {len(all_fills)}")

                # CRITICAL: Aggregate fills by orderId to group partial fills into complete trades
                # Blofin returns individual fills, not complete trades
                from app.services.blofin_client import aggregate_fills_by_order, calculate_trade_fields
                aggregated_fills = aggregate_fills_by_order(all_fills)
                print(f"✅ Aggregated {len(all_fills)} fills into {len(aggregated_fills)} complete trades")

                # Calculate trade fields for all aggregated trades
                calculated_trades = []
                for fill in aggregated_fills:
                    try:
                        trade = calculate_trade_fields(fill)
                        # Skip invalid trades (returns None if entry price <= 0)
                        if trade is not None:
                            calculated_trades.append(trade)
                        else:
                            print(f"⏭️ Skipped invalid trade (entry price <= 0)")
                    except Exception as e:
                        print(f"⚠️ Failed to process trade: {e}")
                        continue

                print(f"✅ Successfully calculated fields for {len(calculated_trades)} trades")

                # Normalize calculated trades data
                all_trades = self._normalize_calculated_blofin_trades(calculated_trades, [], exchange_id)

                return all_trades

        except Exception as e:
            print(f"❌ Error fetching Blofin trades: {e}")
            import traceback
            traceback.print_exc()
            return []

    def deduplicate_trades(self, new_trades: List[Dict], user_id: str, exchange_name: str, db: Session) -> List[Dict]:
        """
        Deduplicate trades by checking exchange_trade_id against database.
        Only returns trades that don't already exist.
        """
        if not new_trades:
            return []

        # Get all existing exchange_trade_ids for this user/exchange
        existing_ids = db.query(Trade.exchange_trade_id).filter(
            Trade.user_id == user_id,
            Trade.exchange == exchange_name,
            Trade.exchange_trade_id.isnot(None)
        ).all()

        existing_id_set = {id_tuple[0] for id_tuple in existing_ids}

        # Filter out duplicates
        unique_trades = [
            t for t in new_trades
            if t.get('exchange_trade_id') not in existing_id_set
        ]

        print(f"Deduplicated: {len(new_trades)} -> {len(unique_trades)} trades")
        return unique_trades

    def _normalize_blofin_trades(self, fills: List[Dict], positions: List[Dict], exchange_id: str) -> List[Dict[str, Any]]:
        """
        Normalize Blofin native API trade data.
        Blofin /api/v1/trade/fills returns completed trade legs (fills).
        Blofin /api/v1/trade/position-history returns closed positions with PnL.

        For perpetual futures, each position closure generates multiple fills.
        We need to combine fill data with position-level PnL for accurate accounting.
        """
        normalized = []

        if not fills:
            print("⚠️ No fill data received from Blofin")
            return normalized

        # Create lookup map for positions by symbol and close time (for matching fills)
        position_map = {}
        for pos in positions:
            try:
                symbol = pos.get('instId', '')
                close_ts = pos.get('cTime')
                if symbol and close_ts:
                    key = (symbol, close_ts)
                    position_map[key] = pos
            except Exception as e:
                print(f"⚠️ Error processing position: {e}")
                continue

        # Process fills
        for fill in fills:
            try:
                # Extract fill data
                trade_id = fill.get('tradeId', fill.get('id', ''))
                symbol = fill.get('instId', fill.get('symbol', 'UNKNOWN'))
                side_raw = fill.get('side', 'buy')  # 'buy' or 'sell'
                side = side_raw.upper()  # Convert to uppercase

                # Price and size
                entry_price = float(fill.get('fillPrice', 0)) if fill.get('fillPrice') else 0
                size = float(fill.get('fillSize', 0)) if fill.get('fillSize') else 0

                # Fee
                fee = float(fill.get('fee', 0)) if fill.get('fee') else 0

                # Leverage
                lever_val = fill.get('lever')
                try:
                    leverage = float(lever_val) if lever_val is not None and str(lever_val).strip() else 1.0
                except (ValueError, AttributeError, TypeError):
                    leverage = 1.0

                # Timestamp
                timestamp_ms = int(fill.get('ts', 0)) or int(fill.get('cTime', 0)) or 0
                if timestamp_ms:
                    # Blofin returns timestamps in milliseconds
                    dt = datetime.utcfromtimestamp(timestamp_ms / 1000)
                else:
                    dt = datetime.utcnow()

                # PnL data - Blofin provides PnL per fill for closed positions
                pnl_usd = float(fill.get('fillPnl', 0)) if fill.get('fillPnl') else 0

                # Calculate exit price and PnL percentage
                # For a fill, the entry price is the fillPrice
                # But for a closed position, we need to calculate exit from the PnL
                exit_price = entry_price
                pnl_pct = None

                if pnl_usd != 0 and size != 0 and entry_price != 0:
                    # Calculate exit price from PnL
                    if side == 'BUY':
                        # For BUY: entry_price is what we paid, exit is where we sold
                        # PnL = (exit - entry) * size
                        exit_price = entry_price + (pnl_usd / size)
                        pnl_pct = ((exit_price - entry_price) / entry_price) * 100
                    elif side == 'SELL':
                        # For SELL: entry_price is where we shorted, exit is where we covered
                        # PnL = (entry - exit) * size
                        exit_price = entry_price - (pnl_usd / size)
                        pnl_pct = ((entry_price - exit_price) / entry_price) * 100

                # Skip only truly invalid trades: entry price = 0 or exit price = 0
                # NOTE: Don't filter trades with entry=exit and pnl=0 - these are legitimate entries with no realized PnL
                if entry_price == 0 or exit_price == 0:
                    print(f"⏭️ Skipped invalid/fake trade {trade_id}: entry={entry_price}, exit={exit_price}")
                    continue

                # Create normalized trade
                normalized_trade = {
                    "exchange_trade_id": str(trade_id),
                    "exchange": exchange_id,
                    "symbol": symbol,
                    "side": side,
                    "entry": entry_price,
                    "exit": exit_price,
                    "size": size,
                    "leverage": leverage,
                    "fees": fee,
                    "pnl_usd": pnl_usd,
                    "pnl_pct": pnl_pct,
                    "date": dt,
                    "notes": f"Blofin perpetual futures fill #{trade_id}"
                }

                pnl_str = f"{pnl_pct:.4f}%" if pnl_pct is not None else "N/A"
                print(f"✅ Normalized fill {trade_id}: {side} {symbol} @ {entry_price} (exit: {exit_price}, PnL: {pnl_str})")
                normalized.append(normalized_trade)

            except Exception as e:
                print(f"❌ Error normalizing fill {fill.get('tradeId', 'unknown')}: {e}")
                import traceback
                traceback.print_exc()
                continue

        print(f"\n✅ Normalized {len(normalized)} trades from Blofin API")
        return normalized

    def _normalize_calculated_blofin_trades(self, trades: List[Dict], position_history: List[Dict], exchange_id: str) -> List[Dict]:
        """
        Normalize pre-calculated Blofin trades (already aggregated and field-calculated).
        These trades have keys like 'entry', 'exit', 'size' (not fillPrice, fillSize, etc.)
        """
        from datetime import datetime
        normalized = []

        for i, trade in enumerate(trades):
            try:
                # Extract values from already-calculated trade
                trade_id = i
                symbol = trade.get('symbol', 'UNKNOWN')
                side = trade.get('side', 'BUY').upper()
                entry_price = float(trade.get('entry', 0))
                exit_price = float(trade.get('exit', 0))
                size = float(trade.get('size', 0))
                leverage = float(trade.get('leverage', 1.0))
                fee = float(trade.get('fees', 0))
                pnl_usd = float(trade.get('pnl_usd', 0))
                pnl_pct = trade.get('pnl_pct', None)

                # Parse date
                date_str = trade.get('date', '')
                if date_str:
                    dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                else:
                    dt = datetime.utcnow()

                # Skip invalid trades
                if entry_price == 0 or exit_price == 0:
                    print(f"⏭️ Skipped invalid trade: entry={entry_price}, exit={exit_price}")
                    continue

                # Create normalized trade
                normalized_trade = {
                    "exchange_trade_id": f"blofin-{i}",
                    "exchange": exchange_id,
                    "symbol": symbol,
                    "side": side,
                    "entry": entry_price,
                    "exit": exit_price,
                    "size": size,
                    "leverage": leverage,
                    "fees": fee,
                    "pnl_usd": pnl_usd,
                    "pnl_pct": pnl_pct,
                    "date": dt,
                    "notes": f"Blofin perpetual futures trade #{i}"
                }

                pnl_str = f"{pnl_pct:.4f}%" if pnl_pct is not None else "N/A"
                print(f"✅ Normalized trade {i}: {side} {symbol} @ {entry_price} (exit: {exit_price}, PnL: {pnl_str})")
                normalized.append(normalized_trade)

            except Exception as e:
                print(f"❌ Error normalizing calculated trade: {e}")
                import traceback
                traceback.print_exc()
                continue

        print(f"\n✅ Normalized {len(normalized)} calculated Blofin trades")
        return normalized

    def _normalize_trades(self, trades: List[Dict], exchange_id: str) -> List[Dict[str, Any]]:
        """
        Normalizes CCXT trade structure to our application's Trade model structure.
        Extracts all necessary data including PnL calculation.
        Handles exchange-specific formats, particularly Blofin perpetual futures.
        """
        normalized = []
        for t in trades:
            # Check if this is CCXT Blofin format with native Blofin data in 'info' field
            is_ccxt_blofin = t.get('info') and 'fillPrice' in t.get('info', {})

            if is_ccxt_blofin:
                # Handle Blofin-specific format
                info = t.get('info', {})

                # Extract symbol (Blofin uses instId, fallback to CCXT symbol)
                symbol = info.get('instId', t.get('symbol', 'UNKNOWN'))

                # FIX #1: Properly convert side to uppercase
                # Blofin returns 'buy' or 'sell' (lowercase), convert to uppercase
                side_raw = info.get('side', 'buy')
                side = side_raw.upper()

                # Extract numeric fields from Blofin response
                fill_price = float(info.get('fillPrice', 0)) if info.get('fillPrice') else 0
                pnl = float(info.get('fillPnl', 0)) if info.get('fillPnl') else 0
                size = float(info.get('fillSize', 0)) if info.get('fillSize') else 0
                fee = float(info.get('fee', 0)) if info.get('fee') else 0

                # FIX #2: Properly handle leverage (may be None)
                # Blofin API often returns None for lever field
                lever_val = info.get('lever')
                try:
                    leverage = float(lever_val) if lever_val is not None and str(lever_val).strip() else 1.0
                except (ValueError, AttributeError):
                    leverage = 1.0

                # FIX #3: Calculate exit price from PnL using correct formulas
                entry_price = fill_price
                exit_price = fill_price

                if pnl != 0 and size != 0 and fill_price != 0:
                    if side == 'BUY':
                        # For BUY: fillPrice is entry, calculate exit from PnL
                        # PnL = (exit - entry) * size => exit = entry + (PnL / size)
                        estimated_exit = fill_price + (pnl / size)
                        exit_price = estimated_exit
                    elif side == 'SELL':
                        # For SELL: fillPrice is entry (short entry), calculate exit from PnL
                        # PnL = (entry - exit) * size => exit = entry - (PnL / size)
                        estimated_exit = fill_price - (pnl / size)
                        exit_price = estimated_exit

                # FIX #4: Calculate PnL percentage correctly
                pnl_pct = None
                if entry_price and entry_price != 0 and exit_price != 0 and entry_price != exit_price:
                    if side == 'BUY':
                        # For LONG: pnl% = (exit - entry) / entry * 100
                        pnl_pct = ((exit_price - entry_price) / entry_price) * 100
                    elif side == 'SELL':
                        # For SHORT: pnl% = (entry - exit) / entry * 100
                        pnl_pct = ((entry_price - exit_price) / entry_price) * 100

                # Get timestamp
                timestamp_ms = int(info.get('ts', 0)) or int(info.get('cTime', 0)) or 0
                if timestamp_ms:
                    dt = datetime.utcfromtimestamp(timestamp_ms / 1000)
                else:
                    dt = datetime.utcnow()

                normalized_trade = {
                    "exchange_trade_id": str(info.get('tradeId', t.get('id', ''))),
                    "exchange": exchange_id,
                    "symbol": symbol,
                    "side": side,
                    "entry": entry_price,
                    "exit": exit_price,
                    "size": size,
                    "leverage": leverage,
                    "fees": fee,
                    "pnl_usd": pnl,
                    "pnl_pct": pnl_pct,
                    "date": dt,
                    "notes": f"Imported from {exchange_id} via API"
                }
                normalized.append(normalized_trade)
            else:
                # Generic CCXT format (fallback for other exchanges)
                side = t.get('side', '').upper() if t.get('side') else 'BUY'
                price = t.get('price', 0)
                amount = t.get('amount', 0)
                cost = t.get('cost', price * amount)  # total cost including fees
                fee = t.get('fee', {}).get('cost', 0) if t.get('fee') else 0

                # Calculate entry/exit prices
                entry_price = price
                exit_price = price

                # For generic CCXT, we only have the executed price
                # In a real scenario with multiple legs, we'd need more complex logic

                timestamp = t.get('timestamp')
                if timestamp:
                    dt = datetime.utcfromtimestamp(timestamp / 1000)
                else:
                    dt = datetime.utcnow()

                normalized_trade = {
                    "exchange_trade_id": str(t.get('id')),
                    "exchange": exchange_id,
                    "symbol": t.get('symbol'),
                    "side": side,
                    "entry": entry_price,
                    "exit": exit_price,
                    "size": amount,
                    "fees": fee,
                    "pnl_usd": None,  # Will be calculated or left for user to specify
                    "pnl_pct": None,
                    "date": dt,
                    "notes": f"Imported from {exchange_id} via API"
                }
                normalized.append(normalized_trade)

        return normalized

    async def validate_connection(self, exchange_id: str, api_key: str, api_secret: str, api_passphrase: str = None) -> bool:
        """
        Validates API keys by attempting to fetch balance.
        Ensures the exchange is supported and credentials are correct.
        """
        try:
            exchange_class = getattr(ccxt, exchange_id)
        except AttributeError:
            raise ValueError(f"Exchange {exchange_id} not found in CCXT. Supported exchanges: {', '.join(ccxt.exchanges)}")

        config = {
            'apiKey': api_key,
            'secret': api_secret,
            'enableRateLimit': True,
            'options': {'defaultType': 'swap'}
        }
        if api_passphrase:
            config['password'] = api_passphrase

        exchange = exchange_class(config)

        try:
            print(f"Validating {exchange_id} connection...")
            await exchange.load_markets()
            balance = await exchange.fetch_balance()

            # Check if we got valid balance data
            if not balance:
                raise ValueError("Failed to fetch balance: empty response")

            print(f"Validation successful for {exchange_id}. Account balance fetched.")
            return True

        except ccxt.AuthenticationError as e:
            raise ValueError(f"Authentication failed: Invalid API key or secret for {exchange_id}")
        except ccxt.NetworkError as e:
            raise ValueError(f"Network error: Unable to connect to {exchange_id}")
        except Exception as e:
            print(f"Connection validation failed: {str(e)}")
            raise ValueError(f"Connection failed: {str(e)}")

        finally:
            await exchange.close()
