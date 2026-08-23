import logging
import re
from typing import Dict, Any

logger = logging.getLogger("voicerag.planner")

WEB_TRIGGERS = [
    "latest", "recent", "current", "news", "today", "2024", "2025", "2026",
    "update", "newest", "compare with", "recent research", "state of the art",
    "modern alternatives", "outside knowledge", "online"
]

class QueryPlannerService:
    def plan_query(self, question_text: str, has_uploaded_audio: bool = True) -> Dict[str, Any]:
        """
        Analyzes question text to determine retrieval & answer requirements:
        - audio_required: whether to search uploaded knowledge audio
        - web_required: whether to search live web
        - search_query: cleaned query keywords for web search
        """
        q_lower = question_text.lower()
        
        # Check if question explicitly requests recent/web/latest information
        web_required = any(trigger in q_lower for trigger in WEB_TRIGGERS)
        
        # If user uploaded audio, default audio_required to True unless web-only query
        audio_required = has_uploaded_audio or not web_required

        # Clean search query string
        search_query = re.sub(r"[^\w\s]", "", question_text).strip()
        if not search_query:
            search_query = "machine learning backpropagation research"

        if web_required and audio_required:
            q_type = "comparison_with_current_information"
        elif web_required and not audio_required:
            q_type = "web_search_only"
        else:
            q_type = "concept_explanation"

        plan = {
            "question_text": question_text,
            "question_type": q_type,
            "audio_required": audio_required,
            "web_required": web_required,
            "search_query": search_query
        }
        
        logger.info(f"Query Plan: q_type='{q_type}', audio_required={audio_required}, web_required={web_required}")
        return plan

query_planner_service = QueryPlannerService()
