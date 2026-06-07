import logging
import os
from typing import Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
DEFAULT_GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-pro",
]


def _configured_models() -> list[str]:
    configured = [
        model.strip()
        for model in os.getenv("GEMINI_MODEL", "").split(",")
        if model.strip()
    ]
    models = configured + DEFAULT_GEMINI_MODELS
    return list(dict.fromkeys(models))


if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini API configured successfully")
else:
    logger.warning("GEMINI_API_KEY not set - Gemini features disabled")


def is_gemini_enabled() -> bool:
    return bool(GEMINI_API_KEY)


async def generate_gemini_text(prompt: str, system_instruction: Optional[str] = None) -> Optional[str]:
    if not GEMINI_API_KEY:
        logger.warning("Gemini not enabled (no API key)")
        return None

    models = _configured_models()
    last_error: Optional[Exception] = None
    
    for model_name in models:
        try:
            logger.info(f"Attempting Gemini call with model: {model_name}")
            
            try:
                # Try with system instruction first
                if system_instruction:
                    model = genai.GenerativeModel(
                        model_name,
                        system_instruction=system_instruction
                    )
                else:
                    model = genai.GenerativeModel(model_name)
            except Exception as e:
                # If system_instruction fails, try without it
                logger.warning(f"Failed to create model with system instruction: {e}. Retrying without.")
                model = genai.GenerativeModel(model_name)
            
            # Generate content
            response = await model.generate_content_async(prompt)
            
            # Extract text from response
            text = ""
            if hasattr(response, 'text'):
                text = response.text
            elif hasattr(response, 'candidates') and response.candidates:
                first_candidate = response.candidates[0]
                if hasattr(first_candidate, 'content') and hasattr(first_candidate.content, 'parts'):
                    text = "".join([part.text for part in first_candidate.content.parts if hasattr(part, 'text')])
            
            if text and text.strip():
                logger.info(f"✓ Gemini {model_name} succeeded")
                return text.strip()
            else:
                logger.warning(f"Empty response from {model_name}")
                
        except Exception as exc:
            last_error = exc
            logger.warning(f"Gemini model {model_name} failed: {type(exc).__name__}: {str(exc)}")

    if last_error:
        logger.error(f"All Gemini models failed. Last error: {type(last_error).__name__}: {last_error}")
    else:
        logger.error("No Gemini models available to try")
    
    return None
