"""SaakhSetu Credit Advisor knowledge base — loaded into every chat system prompt."""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path

_KB_PATH = Path(__file__).resolve().parent / "data" / "advisor_knowledge.md"


def _audit_log_path() -> Path:
    data_dir = Path(os.environ.get("SAAKHSETU_DATA_DIR", ".")).resolve()
    return data_dir / "audit_logs.json"

# Section headers in advisor_knowledge.md used for lightweight retrieval
_SECTION_PATTERN = re.compile(r"^## (.+)$", re.MULTILINE)

# Always include these sections (substring match on header title)
_CORE_SECTION_KEYWORDS = (
    "Product overview",
    "Scoring model",
    "Risk categories",
    "Reason codes",
    "AI Credit Advisor",
)


@lru_cache(maxsize=1)
def get_knowledge_base() -> str:
    """Return full knowledge base markdown text."""
    if not _KB_PATH.is_file():
        raise FileNotFoundError(f"Advisor knowledge base not found: {_KB_PATH}")
    return _KB_PATH.read_text(encoding="utf-8").strip()


def _split_sections(text: str) -> list[tuple[str, str]]:
    """Split markdown into (title, body) sections by ## headers."""
    parts = _SECTION_PATTERN.split(text)
    if len(parts) < 2:
        return [("Full document", text)]
    sections: list[tuple[str, str]] = []
    # parts[0] is preamble before first ##
    preamble = parts[0].strip()
    if preamble:
        sections.append(("Introduction", preamble))
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        body = parts[i + 1].strip() if i + 1 < len(parts) else ""
        sections.append((title, f"## {title}\n\n{body}" if body else f"## {title}"))
    return sections


def _tokenize(text: str) -> set[str]:
    return {w.lower() for w in re.findall(r"[a-zA-Z0-9_]+", text) if len(w) > 2}


def select_knowledge_for_query(user_message: str, *, prefer_full: bool = True) -> str:
    """
    Return knowledge base text for the prompt.
    Defaults to the full document so the advisor can answer any related question completely.
    Set prefer_full=False to use section retrieval for very long future KB versions.
    """
    full = get_knowledge_base()
    if prefer_full or not user_message.strip():
        return full

    query_tokens = _tokenize(user_message)
    sections = _split_sections(full)
    selected: list[str] = []
    seen: set[str] = set()

    for title, body in sections:
        title_lower = title.lower()
        is_core = any(k.lower() in title_lower for k in _CORE_SECTION_KEYWORDS)
        section_tokens = _tokenize(title + " " + body)
        overlap = len(query_tokens & section_tokens)
        if is_core or overlap >= 2 or (overlap >= 1 and len(query_tokens) <= 4):
            if title not in seen:
                seen.add(title)
                selected.append(body)

    if len(selected) < 3:
        return full

    return "\n\n---\n\n".join(selected)


def resolve_score_record(request_id: str) -> dict | None:
    """Load a score profile from audit_logs.json for chat context."""
    audit_path = _audit_log_path()
    if not audit_path.is_file():
        return None
    try:
        with open(audit_path, encoding="utf-8") as f:
            logs = json.load(f)
        for log in logs:
            if log.get("request_id") == request_id:
                return log
    except (json.JSONDecodeError, OSError):
        return None
    return None


def format_score_context(record: dict) -> str:
    """Format a score record as markdown for the system prompt."""
    contributions = record.get("contributions") or {}
    contrib_lines = ""
    if isinstance(contributions, dict) and contributions:
        max_map = {
            "repayment_history": 35,
            "land_area": 25,
            "income_band": 25,
            "crop_risk": 15,
        }
        rows = [
            "| Factor | Points earned | Max |",
            "| --- | --- | --- |",
        ]
        for key, val in contributions.items():
            mx = max_map.get(key, "—")
            rows.append(f"| {key.replace('_', ' ').title()} | {val} | {mx} |")
        contrib_lines = "\n\n**Point contributions:**\n\n" + "\n".join(rows)

    recs = record.get("recommendations") or []
    rec_block = ""
    if recs:
        rec_block = "\n**Recommendations:**\n" + "\n".join(f"- {r}" for r in recs)

    return (
        f"**Loaded user profile** (request_id: `{record.get('request_id', '')}`)\n\n"
        f"| Field | Value |\n| --- | --- |\n"
        f"| Credit score | {record.get('score')}/100 |\n"
        f"| Risk category | {record.get('risk_category')} |\n"
        f"| Repayment input | {record.get('repayment_history_score')}/100 |\n"
        f"| Land area | {record.get('land_area_acres')} acres |\n"
        f"| Crop | {record.get('crop_type')} |\n"
        f"| Income band | {record.get('annual_income_band')} |\n"
        f"| Reason codes | {', '.join(record.get('reason_codes', []))} |\n"
        f"{contrib_lines}\n"
        f"**Risk summary:** {record.get('risk_summary', 'N/A')}"
        f"{rec_block}\n"
    )


def build_advisor_system_prompt(user_message: str, request_id: str | None = None) -> str:
    """Build the full system prompt with knowledge base and optional user profile."""
    kb = select_knowledge_for_query(user_message)

    score_block = ""
    if request_id:
        record = resolve_score_record(request_id)
        if record:
            score_block = (
                "\n\n## USER PROFILE (personalize answers using this data; "
                "do not alter these numbers)\n\n"
                + format_score_context(record)
            )
        else:
            score_block = (
                f"\n\n## USER PROFILE\n\n"
                f"No record found for request_id `{request_id}`. "
                f"Answer from the knowledge base and ask the user to run a new calculation.\n"
            )
    else:
        score_block = (
            "\n\n## USER PROFILE\n\n"
            "No profile loaded. Answer general SaakhSetu questions from the knowledge base. "
            "Suggest running a score calculation to load a personalized profile.\n"
        )

    return (
        "You are **SaakhSetu Credit Advisor** — calm, clear, and helpful on agricultural credit scoring.\n\n"
        "## Style (strict)\n"
        "- **Brief:** 2–5 sentences for simple questions; never exceed ~100 words unless the user asks for full detail.\n"
        "- **Simple:** plain language for farmers; no jargon, no filler, no repetition.\n"
        "- **Elegant:** one direct opening line, then at most 3 short bullets if needed.\n"
        "- Answer accurately from the KNOWLEDGE BASE; personalize only from USER PROFILE when present.\n"
        "- **Never** change, recalculate, or invent scores or profile numbers.\n"
        "- Off-topic: one polite sentence, then redirect to credit scoring.\n\n"
        "## Formatting (light Markdown)\n"
        "- **Bold** only for the score, risk category, and 1–2 key terms.\n"
        "- Use `-` bullets only when listing 2–4 items; skip bullets for single-point answers.\n"
        "- Use a **small table** only when comparing 3+ factors at once; otherwise prefer prose.\n"
        "- No headers (#), no long preambles, no code blocks.\n\n"
        "## KNOWLEDGE BASE\n\n"
        f"{kb}"
        f"{score_block}"
    )
