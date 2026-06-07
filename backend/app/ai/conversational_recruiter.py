import json
import logging

from app.ai.gemini_client import generate_gemini_text, is_gemini_enabled

logger = logging.getLogger(__name__)

async def generate_screening_questions(candidate_skills: list, job_title: str) -> list:
    """Generates 3-5 technical questions tailored to candidate's skills and the role."""
    if not is_gemini_enabled():
        return [
            f"Can you explain your experience working with {candidate_skills[0] if candidate_skills else 'software development'}?",
            f"What is the most complex project you built using {candidate_skills[-1] if candidate_skills else 'APIs'} and how did you design it?",
            "How do you handle scaling and concurrency challenges in an production application?",
            "Can you describe your experience collaborating with cross-functional teams in an agile environment?"
        ]

    prompt = f"""
    You are an AI Technical Recruiter screening a candidate for the role: "{job_title}".
    The candidate has the following skills: {', '.join(candidate_skills)}.
    
    Generate exactly 4 relevant, challenging screening questions that combine their skills with the role requirements.
    Return ONLY a JSON list of strings, with no markdown formatting, no ```json wrapper, just the raw JSON list.
    Example output format:
    ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]
    """
    try:
        text_resp = await generate_gemini_text(prompt)
        if not text_resp:
            raise ValueError("Gemini returned no text")
        # strip codeblocks
        if text_resp.startswith("```"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        
        questions = json.loads(text_resp)
        return questions
    except Exception as e:
        logger.error(f"Error generating questions from Gemini: {e}")
        return [
            f"Describe your background working with {candidate_skills[0] if candidate_skills else 'software development'}.",
            "Walk me through a challenging technical problem you solved recently.",
            "How do you design APIs that are highly scalable and maintainable?",
            "What strategies do you use to ensure code quality and testing?"
        ]

async def chat_respond(chat_history: list, user_message: str, context: dict) -> str:
    """
    Maintains a chat conversation with candidates or employees about the recruitment process.
    chat_history is a list of dicts: [{"sender": "ai"/"candidate", "message": "..."}]
    """
    if not is_gemini_enabled():
        return generate_mock_chat_response(user_message, context)

    history_text = "\n".join(
        f"{'Assistant' if turn.get('sender') == 'ai' else 'User'}: {turn.get('message', '')}"
        for turn in chat_history[-8:]
    )

    system_instruction = f"""
    You are 'TalentAI', the friendly Conversational Recruiter and HR Assistant for the AI Talent Intelligence HRMS.
    Your job is to assist candidates and employees, guide them through applications, explain job statuses, and answer general HR queries.
    Keep your tone professional, helpful, encouraging, and clear.
    
    Context about current user:
    - User Role: {context.get('role', 'Candidate')}
    - Application Status: {context.get('app_status', 'N/A')}
    - Job Title: {context.get('job_title', 'N/A')}
    - Candidate Name: {context.get('name', 'User')}
    
    If they ask about their application, inform them about their current status politely.
    """

    try:
        prompt = f"""
        Conversation so far:
        {history_text or 'No previous messages.'}

        Latest user message:
        {user_message}

        Reply as TalentAI in 2-5 concise sentences.
        """
        response_text = await generate_gemini_text(prompt, system_instruction=system_instruction)
        if response_text:
            return response_text
        return generate_mock_chat_response(user_message, context)
    except Exception as e:
        logger.error(f"Error calling Gemini in chat recruiter: {e}")
        return generate_mock_chat_response(user_message, context)

def generate_mock_chat_response(user_message: str, context: dict) -> str:
    msg_lower = user_message.lower()
    name = context.get('name', 'User')
    status = context.get('app_status', 'Applied')
    job = context.get('job_title', 'Software Engineer')

    if "status" in msg_lower or "application" in msg_lower:
        return f"Hi {name}, I checked our system, and your application status for **{job}** is currently **{status}**. We will update you here or via email as soon as the recruiting team completes their evaluation."
    elif "salary" in msg_lower or "pay" in msg_lower:
        return "Our salary packages are highly competitive and aligned with market standards for the experience level. Exact details can be discussed with the HR panel during the final round."
    elif "hello" in msg_lower or "hi" in msg_lower or "hey" in msg_lower:
        return f"Hello {name}! I am TalentAI, your HR Assistant. How can I help you today? I can update you on your application status or guide you through the next steps of your recruitment journey."
    elif "interview" in msg_lower:
        return "Your interview is conducted online. You can complete the automated AI Voice Interview directly from your candidate dashboard at any time that works for you."
    else:
        return f"Thank you for reaching out! Regarding '{user_message}', I've logged your query. Our HR recruiting team will get in touch with you shortly. Is there anything else about your application for {job} that I can help with?"
