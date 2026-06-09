import json
import logging
import re
from typing import Dict, Any

from app.ai.gemini_client import generate_gemini_text, is_gemini_enabled

logger = logging.getLogger(__name__)

async def analyze_performance(
    employee_name: str,
    job_title: str,
    department: str,
    rating: float,
    skills: list,
    attendance_stats: Dict[str, Any],
    leave_stats: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Invokes Gemini to analyze the employee's performance data and returns structured JSON analysis.
    """
    if not is_gemini_enabled():
        logger.warning("Gemini API key not configured. Using mock fallback for performance analysis.")
        return generate_mock_performance_analysis(employee_name, job_title, department, rating, skills, attendance_stats, leave_stats)

    skills_str = ", ".join(skills) if skills else "None listed"
    prompt = f"""
    You are an expert Talent Analytics Specialist and Executive Performance Coach.
    Analyze the following employee profile, attendance reliability, and leave history.
    
    Employee Name: {employee_name}
    Job Title: {job_title}
    Department: {department}
    Current Rating: {rating}/5.0
    Skills: {skills_str}
    
    Attendance Stats (Today & History):
    - Total recorded punch-in days: {attendance_stats.get('total_days', 0)}
    - Late arrivals: {attendance_stats.get('late_days', 0)}
    - On-Time reliability: {attendance_stats.get('on_time_percentage', 100)}%
    
    Leave Stats:
    - Total Leave Requests: {leave_stats.get('total_leaves', 0)}
    - Approved Leaves: {leave_stats.get('approved_leaves', 0)}
    
    Provide the response strictly as a JSON object, with no markdown styling, no ```json formatting wrapper, just the raw JSON object.
    The JSON structure must match this EXACT schema:
    {{
        "summary": "string (A cohesive and professional 3-4 sentence performance summary paragraph.)",
        "strengths": ["list of strings (3 key strengths identified from their skills, rating, or attendance)"],
        "improvements": ["list of strings (2-3 constructive areas for development or training)"],
        "goals": ["list of strings (3 key SMART goals or future action items)"],
        "recommended_rating": float (an AI suggested rating from 1.0 to 5.0, taking into account current rating and attendance/late metrics. Ensure it matches standard float format like 4.2)
    }}
    """

    try:
        response_text = await generate_gemini_text(prompt)
        if not response_text:
            return generate_mock_performance_analysis(employee_name, job_title, department, rating, skills, attendance_stats, leave_stats)
        
        # Clean any JSON code block markers
        response_text = re.sub(r"^```json\s*", "", response_text)
        response_text = re.sub(r"\s*```$", "", response_text)
        response_text = response_text.strip()
        
        parsed_json = json.loads(response_text)
        return parsed_json
    except Exception as e:
        logger.error(f"Error generating performance analysis via Gemini: {e}")
        return generate_mock_performance_analysis(employee_name, job_title, department, rating, skills, attendance_stats, leave_stats)

def generate_mock_performance_analysis(
    name: str,
    job: str,
    dept: str,
    rating: float,
    skills: list,
    attendance_stats: Dict[str, Any],
    leave_stats: Dict[str, Any]
) -> Dict[str, Any]:
    """Generates structured mock performance data when Gemini is disabled or fails."""
    on_time = float(attendance_stats.get("on_time_percentage", 100.0))
    late_days = int(attendance_stats.get("late_days", 0))
    
    # Calculate recommended rating adjusted slightly by attendance
    recommended_rating = rating
    if on_time < 85.0:
        recommended_rating = max(1.0, round(rating - 0.3, 1))
    elif on_time > 95.0 and rating < 4.8:
        recommended_rating = min(5.0, round(rating + 0.2, 1))
        
    skills_slice = skills[:3] if skills else ["Professionalism"]
    skills_joined = " and ".join(skills_slice)

    summary = (
        f"{name} is performing as a dedicated {job} in the {dept} department. "
        f"With a current rating of {rating}/5.0, they demonstrate good command over {skills_joined}. "
        f"Their overall punctuality stands at {on_time}%, reflecting their level of dedication and alignment with team schedules."
    )

    strengths = [
        f"Solid command and execution of key technologies like {', '.join(skills_slice)}.",
        "Consistent delivery and execution of standard task items.",
        "Maintains professional team communication and alignment on deadlines."
    ]

    improvements = []
    if late_days > 0:
        improvements.append("Improve punctuality and coordinate clock-in reliability to avoid late status flags.")
    improvements.append("Acquire broader system design training to scale technical capabilities.")
    improvements.append("Participate in cross-functional team initiatives to boost leadership exposure.")

    goals = [
        "Complete at least one advanced training certification in their technology domain.",
        "Achieve a 95%+ attendance on-time reliability score for the upcoming quarter.",
        "Lead a technical session or share best practices during the monthly developer meeting."
    ]

    return {
        "summary": summary,
        "strengths": strengths,
        "improvements": improvements,
        "goals": goals,
        "recommended_rating": recommended_rating
    }
