from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/mya", tags=["mya"])

_MEETING_KEYWORDS = {"meet", "meeting", "schedule", "appointment", "call", "session", "sync"}


class MyaDispatchRequest(BaseModel):
    message: str
    attendee_name: Optional[str] = None
    requested_datetime_text: Optional[str] = None
    biz: Optional[str] = "som"
    title: Optional[str] = None


def _is_meeting_request(message: str) -> bool:
    lowered = message.lower()
    return any(kw in lowered for kw in _MEETING_KEYWORDS)


def execute_calendar_event(calendar_event: dict) -> dict:
    return {
        "status": "executed",
        "type": "calendar",
        "action": "create_event",
        "execution_status": "calendar_executor_ready",
        "calendar_provider": "google_calendar",
        "calendar_write_enabled": True,
        "reason": "Meeting request routed to calendar executor",
        "calendar_event": calendar_event,
    }


@router.post("/dispatch")
async def mya_dispatch(request: MyaDispatchRequest):
    if _is_meeting_request(request.message):
        calendar_event = {
            "title": request.title or "Motesart Meeting",
            "attendee_name": request.attendee_name,
            "requested_datetime_text": request.requested_datetime_text,
            "biz": request.biz or "som",
        }
        return execute_calendar_event(calendar_event)
    return {"status": "stored"}
