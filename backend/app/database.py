"""SQLite audit persistence layer.

Reads database path from SAAKHSETU_DB_PATH env var (default: saakhsetu.db).
Provides init_db() for schema creation and save_audit_log() for inserting records.
"""

import json
import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("SAAKHSETU_DB_PATH", "saakhsetu.db")

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id  TEXT    NOT NULL,
    timestamp   TEXT    NOT NULL,
    land_area_acres       REAL    NOT NULL,
    crop_type             TEXT    NOT NULL,
    repayment_history_score REAL  NOT NULL,
    annual_income_band    TEXT    NOT NULL,
    score                 REAL    NOT NULL,
    reason_codes          TEXT    NOT NULL,
    logged_at             TEXT    NOT NULL
);
"""


@contextmanager
def _get_connection():
    """Yield a sqlite3 connection that auto-commits on success."""
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Create the audit_logs table if it does not exist."""
    with _get_connection() as conn:
        conn.execute(_CREATE_TABLE)


def save_audit_log(
    request_id: str,
    timestamp: str,
    land_area_acres: float,
    crop_type: str,
    repayment_history_score: float,
    annual_income_band: str,
    score: float,
    reason_codes: list[str],
    logged_at: str,
) -> None:
    """Insert one audit record into the database."""
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO audit_logs
                (request_id, timestamp, land_area_acres, crop_type,
                 repayment_history_score, annual_income_band, score,
                 reason_codes, logged_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                request_id,
                timestamp,
                land_area_acres,
                crop_type,
                repayment_history_score,
                annual_income_band,
                score,
                json.dumps(reason_codes),
                logged_at,
            ),
        )
