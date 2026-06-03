from enum import Enum

from pydantic import BaseModel, Field, field_validator


class IncomeBand(str, Enum):
    UNDER_2L = "<2L"
    BAND_2_5L = "2-5L"
    BAND_5_10L = "5-10L"
    OVER_10L = ">10L"


class ScoreRequest(BaseModel):
    land_area_acres: float = Field(gt=0, description="Land area in acres; must be positive")
    crop_type: str = Field(min_length=1, description="Non-empty crop label")
    repayment_history_score: float = Field(
        ge=0, le=100, description="Repayment history score 0-100 inclusive"
    )
    annual_income_band: IncomeBand

    @field_validator("crop_type")
    @classmethod
    def strip_and_validate_crop(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("crop_type must be non-empty")
        return v


class ScoreResponse(BaseModel):
    request_id: str
    score: float = Field(ge=0, le=100)
    reason_codes: list[str]
    contributions: dict[str, float]
    risk_category: str
    risk_summary: str
    recommendations: list[str]
    timestamp: str


class ChatRequest(BaseModel):
    message: str
    request_id: str | None = None


class ChatResponse(BaseModel):
    response: str
