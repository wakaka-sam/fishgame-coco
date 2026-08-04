#!/usr/bin/env python3
import copy
import json
import os
import re
import tempfile
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


HOST = os.environ.get("FISH_COCO_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("FISH_COCO_API_PORT", "8088"))
STORE_PATH = Path(os.environ.get("FISH_COCO_STORE_PATH", "/var/lib/fish-coco-api/store.json"))
ALLOWED_ORIGINS = {
    "https://fish.wakaka007.cn",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
}

DEFAULT_CODES = {
    "WELCOME2024": {"coins": 500, "desc": "Welcome pack"},
    "FISHING666": {"coins": 200, "desc": "Fishing luck pack"},
    "GOLDENROD": {"coins": 1000, "desc": "Golden rod fund"},
    "LUCKYDAY": {"coins": 300, "desc": "Lucky day pack"},
    "VIP888": {"coins": 888, "desc": "VIP pack"},
    "WAKAKA_NB": {"diamonds": 900, "desc": "WAKAKA diamond pack"},
    "WAKAKA666": {"diamonds": 10000, "desc": "Mystery diamond treasure"},
}

PETS = {
    "cat": ("pet", "cat", "cat", "小猫咪", "pet_cat"),
    "dog": ("pet", "dog", "dog", "小狗狗", "pet_dog"),
    "parrot": ("pet", "parrot", "parrot", "鹦鹉", "pet_parrot"),
    "penguin": ("pet", "penguin", "penguin", "小企鹅", "pet_penguin"),
    "rabbit": ("pet", "rabbit", "rabbit", "兔子", "pet_rabbit"),
    "fox": ("pet", "fox", "fox", "小狐狸", "pet_fox"),
    "dragon": ("pet", "dragon", "dragon", "小龙", "pet_dragon"),
    "unicorn": ("pet", "unicorn", "unicorn", "独角兽", "pet_unicorn"),
}

RODS = {
    "nightmyst": ("rod", "nightmyst", "月", "神秘暗夜竿", "rod_nightmyst"),
    "panda": ("rod", "panda", "熊", "熊猫竿", "rod_panda"),
    "firekirin": ("rod", "firekirin", "火", "极品火麒麟鱼竿", "rod_firekirin"),
    "greenxuanwu": ("rod", "greenxuanwu", "龟", "极品绿玄武鱼竿", "rod_greenxuanwu"),
    "headphone": ("rod", "headphone", "耳", "耳机竿", "rod_headphone"),
    "candy": ("rod", "candy", "糖", "Candy竿", "rod_candy"),
}

ACCESSORIES = {
    "scale_charm": ("accessory", "scale_charm", "鳞", "鳞光坠", "accessory_scale_charm"),
    "tide_bracelet": ("accessory", "tide_bracelet", "潮", "潮汐环", "accessory_tide_bracelet"),
    "star_brooch": ("accessory", "star_brooch", "星", "星砂针", "accessory_star_brooch"),
}

PROVINCES = {"广东", "浙江", "江苏", "四川", "山东", "河南", "湖北", "北京"}
STORE_LOCK = threading.Lock()
MAX_BEST_SCORE = 60000
MAX_TODAY_SCORE = 500000
MAX_BEST_WEIGHT = 1500.0


def utc_now_ms():
    return int(time.time() * 1000)


def today_key():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def sanitize_username(value):
    username = re.sub(r"[^a-z0-9_-]", "", str(value or "").lower())[:40]
    return username or "guest"


def fresh_user(username):
    return {
        "username": username,
        "money": 100,
        "diamonds": 0,
        "baits": {"worm": 5, "shrimp": 0, "lure": 0, "magic": 0, "divine": 0},
        "currentBait": "worm",
        "dex": {},
        "stats": {"totalCatches": 0, "totalEarned": 0, "totalDiamonds": 0},
        "history": [],
        "ownedRods": [],
        "rodSkin": "",
        "ownedCharacters": ["fishing_master"],
        "activeCharacter": "fishing_master",
        "characterFragments": {},
        "ownedPets": [],
        "activePet": None,
        "accessories": [],
        "equippedAccessory": None,
        "vipAuto": False,
        "chances": {"left": 10, "max": 10, "shareGrants": 0, "lastDate": today_key()},
        "province": "广东",
        "ranking": {"bestScore": 0, "bestFish": "", "bestWeight": 0, "todayScore": 0, "lastScoreDate": today_key()},
        "calendar": {"dayKey": "", "season": "spring", "forecast": []},
        "lastFailure": None,
        "lastShareDate": "",
        "rankRewards": [],
    }


def as_non_negative_int(value, default=0):
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return default


def as_non_negative_float(value, default=0.0):
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        return default


def list_or_empty(value):
    return value if isinstance(value, list) else []


def dict_or_empty(value):
    return value if isinstance(value, dict) else {}


def normalize_user(value, username):
    base = fresh_user(username)
    user = copy.deepcopy(value) if isinstance(value, dict) else {}
    merged = {**base, **user}
    merged["username"] = username
    merged["money"] = as_non_negative_int(merged.get("money"), base["money"])
    merged["diamonds"] = as_non_negative_int(merged.get("diamonds"), base["diamonds"])
    merged["baits"] = {**base["baits"], **dict_or_empty(merged.get("baits"))}
    merged["baits"] = {key: as_non_negative_int(val) for key, val in merged["baits"].items()}
    merged["dex"] = dict_or_empty(merged.get("dex"))
    merged["stats"] = {**base["stats"], **dict_or_empty(merged.get("stats"))}
    merged["stats"] = {key: as_non_negative_int(val) for key, val in merged["stats"].items()}
    merged["history"] = list_or_empty(merged.get("history"))[:30]
    merged["ownedRods"] = list_or_empty(merged.get("ownedRods"))
    merged["ownedCharacters"] = list_or_empty(merged.get("ownedCharacters")) or ["fishing_master"]
    if "fishing_master" not in merged["ownedCharacters"]:
        merged["ownedCharacters"].insert(0, "fishing_master")
    merged["characterFragments"] = dict_or_empty(merged.get("characterFragments"))
    merged["ownedPets"] = list_or_empty(merged.get("ownedPets"))
    merged["accessories"] = list_or_empty(merged.get("accessories"))
    merged["rankRewards"] = list_or_empty(merged.get("rankRewards"))
    merged["province"] = merged.get("province") if merged.get("province") in PROVINCES else base["province"]
    merged["chances"] = {**base["chances"], **dict_or_empty(merged.get("chances"))}
    merged["ranking"] = {**base["ranking"], **dict_or_empty(merged.get("ranking"))}
    day = today_key()
    if merged["chances"].get("lastDate") != day:
        merged["chances"]["left"] = as_non_negative_int(merged["chances"].get("max"), 10)
        merged["chances"]["shareGrants"] = 0
        merged["chances"]["lastDate"] = day
    if merged["ranking"].get("lastScoreDate") != day:
        merged["ranking"]["todayScore"] = 0
        merged["ranking"]["lastScoreDate"] = day
    merged["ranking"]["bestScore"] = min(MAX_BEST_SCORE, as_non_negative_int(merged["ranking"].get("bestScore")))
    merged["ranking"]["todayScore"] = min(MAX_TODAY_SCORE, as_non_negative_int(merged["ranking"].get("todayScore")))
    merged["ranking"]["bestFish"] = str(merged["ranking"].get("bestFish") or "")[:40]
    merged["ranking"]["bestWeight"] = min(MAX_BEST_WEIGHT, as_non_negative_float(merged["ranking"].get("bestWeight")))
    merged["updatedAt"] = utc_now_ms()
    return merged


def read_store_unlocked():
    if not STORE_PATH.exists():
        return {"users": {}, "redeemed": {}, "rankHistory": []}
    try:
        with STORE_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError):
        return {"users": {}, "redeemed": {}, "rankHistory": []}
    return {
        "users": dict_or_empty(data.get("users")),
        "redeemed": dict_or_empty(data.get("redeemed")),
        "rankHistory": list_or_empty(data.get("rankHistory")),
    }


def write_store_unlocked(data):
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=".store.", suffix=".json", dir=str(STORE_PATH.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, separators=(",", ":"))
            file.write("\n")
        os.replace(temp_name, STORE_PATH)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def result_from_tuple(item, **extra):
    item_type, item_id, icon, text, asset = item
    result = {"type": item_type, "id": item_id, "icon": icon, "text": text, "asset": asset}
    result.update(extra)
    return result


def add_unique(items, item):
    if item not in items:
        items.append(item)


def create_accessory(kind):
    return {
        "uid": f"acc_{int(time.time() * 1000):x}_{os.urandom(3).hex()}",
        "type": kind,
        "star": 1,
    }


def run_gacha(user, count, currency, season):
    results = []
    accessories = ["scale_charm", "tide_bracelet", "star_brooch"]
    for _ in range(count):
        roll = int.from_bytes(os.urandom(4), "big") / 2**32 * 100
        if currency == "coins" and season == 2:
            pet_id = ""
            for threshold, candidate in [
                (0.10, "cat"), (0.20, "dog"), (0.25, "parrot"), (0.30, "penguin"),
                (0.35, "rabbit"), (0.40, "fox"), (0.41, "dragon"), (0.42, "unicorn"),
            ]:
                if roll < threshold:
                    pet_id = candidate
                    break
            if pet_id:
                add_unique(user["ownedPets"], pet_id)
                results.append(result_from_tuple(PETS[pet_id]))
            elif roll < 10.42:
                user["diamonds"] += 10
                results.append({"type": "diamonds", "diamonds": 10, "icon": "钻", "text": "10 钻石", "asset": "ui_redeem"})
            else:
                user["money"] += 1
                results.append({"type": "coins", "coins": 1, "icon": "币", "text": "1 金币", "asset": "ui_gacha"})
        elif currency == "diamonds" and season == 3:
            if roll < 30:
                kind = accessories[min(2, int(roll // 10))]
                item = create_accessory(kind)
                user["accessories"].append(item)
                results.append(result_from_tuple(ACCESSORIES[kind], star=item["star"]))
            else:
                user["money"] += 100
                results.append({"type": "coins", "coins": 100, "icon": "币", "text": "100 金币", "asset": "ui_gacha"})
        elif currency == "diamonds" and season == 2:
            if roll < 0.01:
                add_unique(user["ownedRods"], "headphone")
                results.append(result_from_tuple(RODS["headphone"]))
            elif roll < 1:
                add_unique(user["ownedRods"], "candy")
                results.append(result_from_tuple(RODS["candy"]))
            elif roll < 11:
                user["diamonds"] += 10
                results.append({"type": "diamonds", "diamonds": 10, "icon": "钻", "text": "10 钻石", "asset": "ui_redeem"})
            else:
                user["money"] += 1000
                results.append({"type": "coins", "coins": 1000, "icon": "币", "text": "1000 金币", "asset": "ui_gacha"})
        elif currency == "diamonds":
            if roll < 1:
                add_unique(user["ownedRods"], "firekirin")
                results.append(result_from_tuple(RODS["firekirin"]))
            elif roll < 2:
                add_unique(user["ownedRods"], "greenxuanwu")
                results.append(result_from_tuple(RODS["greenxuanwu"]))
            elif roll < 10:
                user["diamonds"] += 10
                results.append({"type": "diamonds", "diamonds": 10, "icon": "钻", "text": "10 钻石", "asset": "ui_redeem"})
            else:
                user["money"] += 1000
                results.append({"type": "coins", "coins": 1000, "icon": "币", "text": "1000 金币", "asset": "ui_gacha"})
        elif roll < 10:
            if roll < 0.1:
                add_unique(user["ownedRods"], "nightmyst")
                results.append(result_from_tuple(RODS["nightmyst"]))
            elif roll < 1.1:
                add_unique(user["ownedRods"], "panda")
                results.append(result_from_tuple(RODS["panda"]))
            else:
                user["money"] += 1000
                results.append({"type": "coins", "coins": 1000, "icon": "币", "text": "1000 金币", "asset": "ui_gacha"})
        else:
            user["money"] += 1
            results.append({"type": "coins", "coins": 1, "icon": "币", "text": "1 金币", "asset": "ui_gacha"})
    return results


def total_weight(user):
    total = 0.0
    for item in dict_or_empty(user.get("dex")).values():
        if isinstance(item, dict):
            total += as_non_negative_float(item.get("maxWeight")) * as_non_negative_int(item.get("count"))
    return round(total, 2)


def today_catches_and_weight(user):
    day = datetime.now().astimezone().date()
    catches = 0
    weight = 0.0
    for item in list_or_empty(user.get("history")):
        if not isinstance(item, dict):
            continue
        try:
            timestamp = int(item.get("at", 0)) / 1000
            if datetime.fromtimestamp(timestamp).date() != day:
                continue
        except (TypeError, ValueError, OSError):
            continue
        catches += 1
        weight += as_non_negative_float(item.get("weight"))
    return catches, round(weight, 2)


def leaderboard_rows(users, province=None, limit=100):
    rows = []
    for user in users.values():
        if not isinstance(user, dict):
            continue
        if province and user.get("province") != province:
            continue
        today_catches, today_weight = today_catches_and_weight(user)
        ranking = dict_or_empty(user.get("ranking"))
        rows.append({
            "username": user.get("username", ""),
            "name": user.get("username", ""),
            "province": user.get("province", "广东"),
            "score": as_non_negative_int(ranking.get("bestScore")),
            "todayScore": as_non_negative_int(ranking.get("todayScore")),
            "todayCatches": today_catches,
            "todayWeight": today_weight,
            "totalCatches": as_non_negative_int(dict_or_empty(user.get("stats")).get("totalCatches")),
            "totalWeight": total_weight(user),
            "bestFish": str(ranking.get("bestFish") or ""),
            "bestWeight": as_non_negative_float(ranking.get("bestWeight")),
        })
    rows.sort(key=lambda row: (row["score"], row["todayScore"], row["totalCatches"]), reverse=True)
    for index, row in enumerate(rows, start=1):
        row["rank"] = index
    return rows[:limit] if limit else rows


def province_war_rows(users, limit=100):
    teams = {
        province: {
            "province": province,
            "name": f"{province}队",
            "score": 0,
            "todayScore": 0,
            "members": 0,
            "todayCatches": 0,
            "bestPlayer": "",
            "topScore": 0,
        }
        for province in sorted(PROVINCES)
    }
    for user in users.values():
        if not isinstance(user, dict):
            continue
        province = user.get("province") if user.get("province") in PROVINCES else "广东"
        ranking = dict_or_empty(user.get("ranking"))
        stats = dict_or_empty(user.get("stats"))
        today_score = as_non_negative_int(ranking.get("todayScore"))
        best_score = as_non_negative_int(ranking.get("bestScore"))
        today_catches, _today_weight = today_catches_and_weight(user)
        team = teams.setdefault(province, {
            "province": province,
            "name": f"{province}队",
            "score": 0,
            "todayScore": 0,
            "members": 0,
            "todayCatches": 0,
            "bestPlayer": "",
            "topScore": 0,
        })
        team["score"] += today_score
        team["todayScore"] += today_score
        team["todayCatches"] += today_catches
        if as_non_negative_int(stats.get("totalCatches")) > 0 or best_score > 0 or today_score > 0:
            team["members"] += 1
        if best_score > team["topScore"]:
            team["topScore"] = best_score
            team["bestPlayer"] = str(user.get("username", ""))
    rows = list(teams.values())
    rows.sort(key=lambda row: (row["score"], row["members"], row["topScore"]), reverse=True)
    for index, row in enumerate(rows, start=1):
        row["rank"] = index
    return rows[:limit] if limit else rows


def api_ping(_body):
    return {"ok": True, "service": "fish-coco-api", "time": utc_now_ms()}


def api_login(body):
    username = sanitize_username(body.get("username"))
    incoming = body.get("state")
    with STORE_LOCK:
        store = read_store_unlocked()
        existing = store["users"].get(username)
        user = normalize_user(existing or incoming or fresh_user(username), username)
        store["users"][username] = user
        write_store_unlocked(store)
    response = copy.deepcopy(user)
    response["pendingRankRewards"] = []
    return response


def api_save(body):
    username = sanitize_username(body.get("username"))
    state = body.get("state")
    user = normalize_user(state or fresh_user(username), username)
    with STORE_LOCK:
        store = read_store_unlocked()
        previous = normalize_user(store["users"].get(username) or fresh_user(username), username)
        store["users"][username] = user
        old_score = as_non_negative_int(dict_or_empty(previous.get("ranking")).get("bestScore"))
        new_score = as_non_negative_int(dict_or_empty(user.get("ranking")).get("bestScore"))
        if new_score > old_score:
            store["rankHistory"].insert(0, {
                "username": username,
                "province": user.get("province", "广东"),
                "score": new_score,
                "bestFish": dict_or_empty(user.get("ranking")).get("bestFish", ""),
                "bestWeight": dict_or_empty(user.get("ranking")).get("bestWeight", 0),
                "at": utc_now_ms(),
            })
            store["rankHistory"] = store["rankHistory"][:100]
        write_store_unlocked(store)
    return user


def api_leaderboard(body):
    username = sanitize_username(body.get("username"))
    province = body.get("province") if body.get("province") in PROVINCES else None
    requested_scope = body.get("scope")
    if requested_scope == "provinceWar":
        scope = "provinceWar"
    else:
        scope = "province" if province else "national"
    state = body.get("state")
    with STORE_LOCK:
        store = read_store_unlocked()
        if isinstance(state, dict):
            store["users"][username] = normalize_user(state, username)
            write_store_unlocked(store)
        own_user = normalize_user(store["users"].get(username) or state or fresh_user(username), username)
        own_province = own_user.get("province") if own_user.get("province") in PROVINCES else "广东"
        if scope == "provinceWar":
            all_rows = province_war_rows(store["users"], limit=None)
        else:
            all_rows = leaderboard_rows(store["users"], province, limit=None)
        rows = all_rows[:100]
    for row in rows:
        if scope == "provinceWar":
            row["self"] = row.get("province") == own_province
        else:
            row["self"] = row["username"] == username
    self_rank = 0
    if scope == "provinceWar":
        for row in all_rows:
            if row.get("province") == own_province:
                self_rank = row["rank"]
                break
    else:
        for row in all_rows:
            if row["username"] == username:
                self_rank = row["rank"]
                break
    total = len(all_rows)
    beat_percent = int(max(0, min(99, round((total - self_rank) / max(1, total) * 100)))) if self_rank else 0
    return {
        "rows": rows,
        "scope": scope,
        "province": province,
        "total": total,
        "selfRank": self_rank,
        "beatPercent": beat_percent,
        "generatedAt": utc_now_ms(),
    }


def api_rank_history(_body):
    with STORE_LOCK:
        store = read_store_unlocked()
        history = list_or_empty(store.get("rankHistory"))[:30]
    return {"history": history}


def api_redeem(body):
    username = sanitize_username(body.get("username"))
    code = str(body.get("code") or "").strip().upper()
    if code not in DEFAULT_CODES:
        raise ValueError("兑换码不存在")
    with STORE_LOCK:
        store = read_store_unlocked()
        user = normalize_user(body.get("state") or store["users"].get(username) or fresh_user(username), username)
        used = list_or_empty(store["redeemed"].get(username))
        if code in used:
            raise ValueError("该兑换码已使用")
        entry = DEFAULT_CODES[code]
        if entry.get("coins"):
            user["money"] += int(entry["coins"])
        if entry.get("diamonds"):
            user["diamonds"] += int(entry["diamonds"])
        used.append(code)
        store["redeemed"][username] = used
        store["users"][username] = normalize_user(user, username)
        write_store_unlocked(store)
        saved = copy.deepcopy(store["users"][username])
    return {
        "success": True,
        "coins": DEFAULT_CODES[code].get("coins", 0),
        "diamonds": DEFAULT_CODES[code].get("diamonds", 0),
        "desc": DEFAULT_CODES[code]["desc"],
        "user": saved,
    }


def api_gacha(body):
    username = sanitize_username(body.get("username"))
    count = 10 if body.get("count") == 10 else 1
    currency = "diamonds" if body.get("currency") == "diamonds" else "coins"
    season = body.get("season") if body.get("season") in {1, 2, 3} else 1
    cost = (10 if count == 1 else 90) if currency == "diamonds" else (
        (10000 if count == 1 else 100000) if season == 2 else (1000 if count == 1 else 9000)
    )
    with STORE_LOCK:
        store = read_store_unlocked()
        user = normalize_user(body.get("state") or store["users"].get(username) or fresh_user(username), username)
        if currency == "diamonds":
            if user["diamonds"] < cost:
                raise ValueError("钻石不足")
            user["diamonds"] -= cost
        else:
            if user["money"] < cost:
                raise ValueError("金币不足")
            user["money"] -= cost
        results = run_gacha(user, count, currency, season)
        store["users"][username] = normalize_user(user, username)
        write_store_unlocked(store)
        saved = copy.deepcopy(store["users"][username])
    return {"results": results, "user": saved}


ROUTES = {
    "/api/ping": api_ping,
    "/api/login": api_login,
    "/api/save": api_save,
    "/api/leaderboard": api_leaderboard,
    "/api/rank-history": api_rank_history,
    "/api/redeem": api_redeem,
    "/api/gacha": api_gacha,
}


class Handler(BaseHTTPRequestHandler):
    server_version = "FishCocoAPI/1.0"

    def end_headers(self):
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        elif not origin:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status, payload):
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def reject_method(self):
        self.send_response(405)
        self.send_header("Allow", "POST")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(b'{"error":"method not allowed"}')

    def do_GET(self):
        self.reject_method()

    def do_OPTIONS(self):
        self.reject_method()

    def do_PUT(self):
        self.reject_method()

    def do_DELETE(self):
        self.reject_method()

    def do_PATCH(self):
        self.reject_method()

    def do_POST(self):
        path = urlparse(self.path).path
        route = ROUTES.get(path)
        if not route:
            self.send_json(404, {"error": "unknown api"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length > 1024 * 1024:
            self.send_json(413, {"error": "request too large"})
            return
        try:
            raw = self.rfile.read(length) if length else b"{}"
            body = json.loads(raw.decode("utf-8") or "{}")
            if not isinstance(body, dict):
                raise ValueError("request body must be an object")
            payload = route(body)
            self.send_json(200, payload)
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except Exception as error:
            self.log_error("request failed: %s", error)
            self.send_json(500, {"error": "internal server error"})


def main():
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"fish-coco-api listening on {HOST}:{PORT}, store={STORE_PATH}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
