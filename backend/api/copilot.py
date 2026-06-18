import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import httpx
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    context: Optional[Any] = None

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
# If the API key is not set, we'll gracefully mock the response, but ideally it should be set
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def parse_intent(query: str) -> dict:
    if not client:
        return {"intent": "general", "confidence": 0.5}
        
    system_prompt = """
    You are an intent parser for the Pravaaha Police Command Center. 
    Analyze the user's query and extract a JSON structured output with:
    - intent: (predict_congestion | get_hotspots | get_root_causes | get_patrol_route | general)
    - zone: The specific area mentioned (if any)
    - time_range: The time mentioned (e.g. 'tomorrow', 'today', etc.)
    - confidence: A score from 0.0 to 1.0
    
    Respond ONLY with valid JSON.
    """
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error parsing intent: {e}")
        return {"intent": "general", "confidence": 0.0}

@router.post("/chat")
async def chat_copilot(req: ChatRequest):
    """
    Officer Copilot: Parses intent, queries backend ML/data components, 
    and summarizes using Llama-3.1.
    """
    if not client:
        # Mock response if no API key is provided
        return {
            "response": f"Mock AI Response for: '{req.query}'. Please set GROQ_API_KEY to enable Llama-3.1.",
            "intent": "mocked"
        }

    # 1. Parse the user's intent using Groq Structured Outputs
    parsed_intent = parse_intent(req.query)
    intent = parsed_intent.get("intent", "general")
    
    # 2. In a fully connected backend, we would call the ML model / DB here based on intent
    # Example: 
    # if intent == "predict_congestion":
    #    data = ml_pipeline.predict(parsed_intent["zone"], parsed_intent["time_range"])
    #    context = f"Prediction data: {data}"
    
    context = req.context or "Top hotspot is Koramangala with 1200 violations. Primary offense: WRONG PARKING."
    
    # 3. Summarize back to the user
    system_prompt = f"""
    You are the Pravaaha AI Copilot for Bangalore Traffic Police.
    You answer questions clearly, professionally, and concisely.
    Use the following retrieved data context to answer the user's question:
    ---
    {context}
    ---
    """
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.query}
            ],
            model="llama-3.1-8b-instant"
        )
        
        return {
            "response": response.choices[0].message.content,
            "intent": intent,
            "parsed": parsed_intent
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
