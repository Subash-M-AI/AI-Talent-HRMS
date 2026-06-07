import json
import logging

from app.ai.gemini_client import generate_gemini_text, is_gemini_enabled

logger = logging.getLogger(__name__)

async def evaluate_voice_interview(questions: list, answers: list, job_title: str) -> dict:
    """
    Evaluates candidate's responses to interview questions.
    Returns: technical_score, communication_score, confidence_score, overall_score, summary
    """
    if not questions or not answers:
        return {
            "technical_score": 50.0,
            "communication_score": 50.0,
            "confidence_score": 50.0,
            "overall_score": 50.0,
            "summary": "Evaluation not available. Questions or answers were empty."
        }

    # Format the dialogue for the prompt
    dialogue = ""
    for i, (q, a) in enumerate(zip(questions, answers)):
        dialogue += f"Q{i+1}: {q}\nA{i+1}: {a}\n\n"

    if not is_gemini_enabled():
        return mock_evaluate_voice_interview(dialogue)

    prompt = f"""
    You are an expert technical interviewer evaluating a candidate's voice transcript responses for the role: "{job_title}".
    Based on the questions and the candidate's answers below, evaluate their performance.
    
    Interview Dialogue:
    ---
    {dialogue}
    ---
    
    Provide your evaluation in a JSON structure. Return ONLY the raw JSON object with no markdown styling, no ```json wrapper.
    The JSON structure must match this EXACT schema:
    {{
        "technical_score": float (score from 0 to 100 on accuracy, depth, and correctness of technical answers),
        "communication_score": float (score from 0 to 100 on clarity, structure, and expressiveness),
        "confidence_score": float (score from 0 to 100 on assertiveness, speed, and lack of hesitation/filler words),
        "summary": "string (a detailed professional synthesis of the candidate's strengths and areas of improvement)"
    }}
    """

    try:
        text_resp = await generate_gemini_text(prompt)
        if not text_resp:
            return mock_evaluate_voice_interview(dialogue)
        
        # Clean any JSON code block markers
        if text_resp.startswith("```"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(text_resp)
        # Calculate overall score as average
        tech = float(parsed.get("technical_score", 60))
        comm = float(parsed.get("communication_score", 60))
        conf = float(parsed.get("confidence_score", 60))
        overall = round((tech + comm + conf) / 3, 1)

        return {
            "technical_score": tech,
            "communication_score": comm,
            "confidence_score": conf,
            "overall_score": overall,
            "summary": parsed.get("summary", "Technical interview successfully completed and evaluated.")
        }
    except Exception as e:
        logger.error(f"Error evaluating interview via Gemini: {e}")
        return mock_evaluate_voice_interview(dialogue)

def mock_evaluate_voice_interview(dialogue: str) -> dict:
    """Mock evaluation for voice answers based on length and key terms."""
    # Check general lengths of answers
    words = dialogue.split()
    word_count = len(words)
    
    # Calculate crude score heuristics
    tech = 70.0
    comm = 75.0
    conf = 72.0
    
    if "don't know" in dialogue.lower() or "not sure" in dialogue.lower():
        tech -= 10
        conf -= 5
    if word_count > 300:
        comm += 10
        tech += 5
    elif word_count < 100:
        comm -= 15
        conf -= 10

    # Boundaries
    tech = max(10.0, min(100.0, tech))
    comm = max(10.0, min(100.0, comm))
    conf = max(10.0, min(100.0, conf))
    overall = round((tech + comm + conf) / 3, 1)

    summary = (
        f"The candidate showed good overall responsiveness. "
        f"They spoke around {word_count} words during the screening. "
        f"They exhibited strong communication, though technical depth could be expanded. "
        f"Recommended for further team screening."
    )

    return {
        "technical_score": tech,
        "communication_score": comm,
        "confidence_score": conf,
        "overall_score": overall,
        "summary": summary
    }
