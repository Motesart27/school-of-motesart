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


@router.post("/dispatch")
async def mya_dispatch(request: MyaDispatchRequest):
    if _is_meeting_request(request.message):
        return {
            "status": "executed",
            "type": "calendar",
            "action": "create_event",
            "execution_status": "ready_for_calendar_integration",
            "calendar_event": {
                "title": request.title or "Motesart Meeting",
                "attendee_name": request.attendee_name,
                "requested_datetime_text": request.requested_datetime_text,
                "biz": request.biz or "som",
            },
        }
    return {"status": "stored"}
