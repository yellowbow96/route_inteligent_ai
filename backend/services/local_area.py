import asyncio
import math
import os
from typing import Any

import httpx


OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return radius_km * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def _pick_name(tags: dict[str, Any], fallback: str) -> str:
    return (
        tags.get("name")
        or tags.get("brand")
        or tags.get("operator")
        or tags.get("tourism")
        or tags.get("amenity")
        or tags.get("shop")
        or tags.get("leisure")
        or fallback
    )


def _pick_phone(tags: dict[str, Any]) -> str | None:
    return tags.get("phone") or tags.get("contact:phone") or tags.get("mobile")


def _classify_place(tags: dict[str, Any]) -> tuple[str, str]:
    amenity = tags.get("amenity")
    shop = tags.get("shop")
    tourism = tags.get("tourism")
    leisure = tags.get("leisure")
    natural = tags.get("natural")
    waterway = tags.get("waterway")

    if amenity in {"fuel", "charging_station", "parking"}:
        return "essentials", "mobility"
    if amenity in {"hospital", "pharmacy", "police", "atm", "bank"}:
        return "services", "services"
    if amenity in {"restaurant", "cafe", "fast_food", "bar", "ice_cream"}:
        return "food", "food"
    if shop:
        return "shops", "shops"
    if tourism in {"viewpoint", "attraction", "museum"}:
        return "nature", "sights"
    if leisure in {"park", "garden", "nature_reserve", "playground"}:
        return "nature", "green"
    if natural or waterway:
        return "nature", "nature"
    return "services", "other"


def _score_snapshot(categories: dict[str, list[dict[str, Any]]]) -> dict[str, int]:
    essentials = len(categories["essentials"])
    shops = len(categories["shops"])
    food = len(categories["food"])
    nature = len(categories["nature"])
    services = len(categories["services"])

    convenience = min(100, 20 + essentials * 16 + shops * 8 + food * 7 + services * 6)
    scenic = min(100, 15 + nature * 16 + max(0, food - 1) * 3)
    balance = min(100, round((convenience * 0.55) + (scenic * 0.45)))
    return {
        "convenience": convenience,
        "scenic": scenic,
        "balance": balance,
    }


def _build_fallback_summary(location_name: str, categories: dict[str, list[dict[str, Any]]]) -> str:
    highlights = []
    if categories["nature"]:
        highlights.append(f"{len(categories['nature'])} nature-oriented spots nearby")
    if categories["shops"]:
        highlights.append(f"{len(categories['shops'])} shopping stops in reach")
    if categories["food"]:
        highlights.append(f"{len(categories['food'])} food and cafe options")
    if categories["essentials"]:
        highlights.append(f"{len(categories['essentials'])} rider essentials like fuel or parking")

    if not highlights:
        highlights.append("limited mapped points nearby, so this area looks quieter and less commercial")

    joined = ", ".join(highlights[:4])
    return f"{location_name} looks balanced for a short ride stop, with {joined}."


async def summarize_with_ollama(payload: dict[str, Any]) -> str | None:
    prompt = (
        "You are a local travel and rider assistant. "
        "Write exactly 3 short sentences about this area for a rider dashboard. "
        "Mention convenience, atmosphere, and scenic or nature potential. "
        "Avoid hype, lists, markdown, and uncertainty.\n\n"
        f"Area data: {payload}"
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
            text = (data.get("response") or "").strip()
            return text or None
    except Exception:
        return None


async def fetch_local_area_snapshot(lat: float, lon: float, radius_m: int = 3500) -> dict[str, Any]:
    reverse_url = (
        "https://nominatim.openstreetmap.org/reverse"
        f"?format=jsonv2&lat={lat}&lon={lon}&zoom=15"
    )
    overpass_query = f"""
    [out:json][timeout:25];
    (
      node(around:{radius_m},{lat},{lon})[shop];
      node(around:{radius_m},{lat},{lon})[amenity];
      node(around:{radius_m},{lat},{lon})[tourism];
      node(around:{radius_m},{lat},{lon})[leisure];
      node(around:{radius_m},{lat},{lon})[natural];
      node(around:{radius_m},{lat},{lon})[waterway];
    );
    out center 60;
    """

    headers = {"User-Agent": "RiderIntel/1.0"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        reverse_task = client.get(reverse_url, headers=headers)
        overpass_task = client.post(
            "https://overpass-api.de/api/interpreter",
            data=overpass_query,
            headers=headers,
        )
        reverse_res, overpass_res = await asyncio.gather(reverse_task, overpass_task)

    location_data = reverse_res.json() if reverse_res.status_code == 200 else {}
    overpass_data = overpass_res.json() if overpass_res.status_code == 200 else {"elements": []}

    location_name = (
        location_data.get("address", {}).get("suburb")
        or location_data.get("address", {}).get("neighbourhood")
        or location_data.get("address", {}).get("city_district")
        or location_data.get("address", {}).get("city")
        or location_data.get("display_name", "Current area").split(",")[0]
    )

    categories = {
        "essentials": [],
        "food": [],
        "shops": [],
        "nature": [],
        "services": [],
    }

    counts = {
        "fuel": 0,
        "food": 0,
        "shops": 0,
        "parks": 0,
        "nature": 0,
        "viewpoints": 0,
        "services": 0,
    }

    for idx, element in enumerate(overpass_data.get("elements", [])[:80]):
        tags = element.get("tags", {})
        item_lat = element.get("lat") or element.get("center", {}).get("lat")
        item_lon = element.get("lon") or element.get("center", {}).get("lon")
        if item_lat is None or item_lon is None:
            continue

        distance_km = round(haversine_km(lat, lon, item_lat, item_lon), 2)
        bucket, label = _classify_place(tags)
        name = _pick_name(tags, f"{label.title()} Spot {idx + 1}")
        item = {
            "name": name,
            "type": label,
            "distance_km": distance_km,
            "phone": _pick_phone(tags),
        }
        categories[bucket].append(item)

        if tags.get("amenity") == "fuel":
            counts["fuel"] += 1
        if tags.get("amenity") in {"restaurant", "cafe", "fast_food", "bar", "ice_cream"}:
            counts["food"] += 1
        if tags.get("shop"):
            counts["shops"] += 1
        if tags.get("leisure") in {"park", "garden", "nature_reserve"}:
            counts["parks"] += 1
        if tags.get("natural") or tags.get("waterway"):
            counts["nature"] += 1
        if tags.get("tourism") == "viewpoint":
            counts["viewpoints"] += 1
        if bucket == "services":
            counts["services"] += 1

    for key in categories:
        categories[key] = sorted(categories[key], key=lambda item: item["distance_km"])[:5]

    vibe_scores = _score_snapshot(categories)
    ollama_context = {
        "location_name": location_name,
        "counts": counts,
        "closest_shops": categories["shops"][:3],
        "closest_food": categories["food"][:3],
        "closest_nature": categories["nature"][:3],
        "scores": vibe_scores,
    }
    ollama_summary = await summarize_with_ollama(ollama_context)
    summary = ollama_summary or _build_fallback_summary(location_name, categories)

    highlights = []
    if counts["fuel"]:
        highlights.append(f"{counts['fuel']} fuel or mobility points nearby")
    if counts["shops"]:
        highlights.append(f"{counts['shops']} mapped shops in the surrounding area")
    if counts["parks"] or counts["nature"] or counts["viewpoints"]:
        highlights.append(
            f"{counts['parks'] + counts['nature'] + counts['viewpoints']} scenic or nature markers around you"
        )
    if counts["food"]:
        highlights.append(f"{counts['food']} food stops for a break")

    return {
        "location_name": location_name,
        "summary": summary,
        "summary_source": "ollama" if ollama_summary else "heuristic",
        "radius_m": radius_m,
        "vibe_scores": vibe_scores,
        "counts": counts,
        "highlights": highlights[:4],
        "categories": categories,
    }


async def search_local_stops(lat: float, lon: float, query: str, radius_m: int = 3500) -> dict[str, Any]:
    snapshot = await fetch_local_area_snapshot(lat, lon, radius_m)
    needle = query.strip().lower()
    matches = []

    for category, items in snapshot["categories"].items():
        for item in items:
            haystack = f"{item.get('name', '')} {item.get('type', '')} {category}".lower()
            if needle in haystack:
                match = dict(item)
                match["category"] = category
                matches.append(match)

    matches.sort(key=lambda item: item["distance_km"])
    return {
        "query": query,
        "location_name": snapshot["location_name"],
        "results": matches[:8],
        "summary": snapshot["summary"],
    }
