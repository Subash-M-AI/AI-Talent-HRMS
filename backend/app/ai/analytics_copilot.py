import logging
import asyncio

from app.ai.gemini_client import generate_gemini_text, is_gemini_enabled

logger = logging.getLogger(__name__)

async def ask_copilot(query: str, company_context: dict) -> str:
    """
    Uses Gemini AI to answer any HR question intelligently.
    Falls back to smart response if Gemini fails.
    """
    if not is_gemini_enabled():
        logger.warning("Gemini API key not configured")
        return _smart_response(query, company_context)
    
    # Build context string
    context_str = _build_context_string(company_context)
    requester_role = company_context.get("requester_role", "HR Manager")
    
    # Create prompt for Gemini - keep it simple and direct
    user_prompt = f"""You are TalentCopilot, an HR AI assistant. Answer this question directly and helpfully.

User Role: {requester_role}
Question: {query}

Company Data (if available):
{context_str}

Answer the question directly. Be professional, concise, and helpful."""

    try:
        logger.info(f"Calling Gemini: {query[:40]}...")
        
        # Call Gemini without system instruction first (simpler)
        response = await asyncio.wait_for(
            generate_gemini_text(user_prompt),
            timeout=12.0
        )
        
        if response and response.strip():
            logger.info(f"✓ Gemini responded successfully")
            return response.strip()
        else:
            logger.warning("Gemini returned empty response")
            
    except asyncio.TimeoutError:
        logger.error("Gemini request timed out after 12s")
    except Exception as e:
        logger.error(f"Gemini error: {type(e).__name__}: {str(e)}")
    
    # Smart fallback response
    return _smart_response(query, company_context)

def _smart_response(query: str, context: dict) -> str:
    """Generate smart response when Gemini fails."""
    q_lower = query.lower()
    
    # Attrition/Risk questions
    if any(word in q_lower for word in ['attrition', 'risk', 'highest risk', 'department risk']):
        depts = context.get('departments', [])
        if depts:
            highest = max(depts, key=lambda x: x.get('attrition_rate', 0))
            return f"### Attrition Analysis\n\n**{highest['name']}** department has the highest attrition risk at **{highest['attrition_rate']}%**.\n\n**Avg Performance Rating:** {highest['average_perf']}/5.0\n\n**Recommendation:** Review workload, conduct retention interviews, and implement engagement initiatives."
    
    # Promotion questions
    if any(word in q_lower for word in ['promote', 'promotion', 'candidate for promotion', 'top employee']):
        performers = context.get('high_performers', [])
        if performers:
            top = performers[0]
            return f"### Promotion Recommendation\n\n**{top['name']}** is your strongest promotion candidate.\n\n**Performance Rating:** {top['rating']}/5.0\n**Role:** {top['role']}\n**Tenure:** {top['years']} years\n\nReady for leadership development and promotion."
    
    # Hiring/Candidate questions
    if any(word in q_lower for word in ['hire', 'candidate', 'recruitment', 'best candidate', 'suitable', 'developer', 'engineer', 'position']):
        candidates = context.get('top_candidates', [])
        if candidates:
            best = max(candidates, key=lambda x: x.get('match_pct', 0))
            return f"### Candidate Recommendation\n\n**{best['name']}** is the best match for **{best['job']}**.\n\n**Match Score:** {best['match_pct']}%\n\nRecommend advancing to interview stage immediately."
    
    # Skill/Training questions
    if any(word in q_lower for word in ['skill', 'training', 'develop', 'learn', 'certification']):
        return f"### Skill Development\n\nFor training and skill development:\n\n• Use our Skill Gap Analyzer tool to identify learning paths\n• Review available certifications for your target role\n• Speak with your manager about training budgets\n• Check our learning platform for courses\n\nYour question: *{query}*"
    
    # Attendance/Leave questions
    if any(word in q_lower for word in ['attendance', 'leave', 'absent', 'vacation', 'clock']):
        return f"### Attendance & Leave\n\n• Use the attendance tracker to clock in/out\n• Request leave through the leave request form\n• Managers can view team attendance on their dashboard\n• Check notifications for leave approval updates\n\nYour question: *{query}*"
    
    # Department questions
    if any(word in q_lower for word in ['department', 'teams', 'which department']):
        total = context.get('total_employees', 0)
        depts = context.get('departments', [])
        if depts:
            dept_list = ", ".join([f"{d['name']} ({d['employee_count']} emp)" for d in depts[:5]])
            return f"### Department Overview\n\n**Total Employees:** {total}\n\n**Departments:**\n{dept_list}\n\nFor detailed department analytics, ask about specific departments or concerns."
    
    # Generic helpful response
    return f"### I'm TalentCopilot\n\nYour question: *{query}*\n\n**I can help with:**\n• Employee attrition and retention risks\n• Promotion and career development\n• Candidate hiring and recruitment\n• Skill development and training\n• Attendance and leave management\n• Department and team analytics\n\nPlease rephrase your question focusing on one of these areas for better insights."

def _build_context_string(context: dict) -> str:
    """Build a readable context string from company data."""
    lines = []
    
    total_emp = context.get('total_employees', 0)
    open_jobs = context.get('open_jobs', 0)
    
    if total_emp > 0 or open_jobs > 0:
        if total_emp > 0:
            lines.append(f"Total Employees: {total_emp}")
        if open_jobs > 0:
            lines.append(f"Open Positions: {open_jobs}")
    else:
        return "No company data available"
    
    departments = context.get('departments', [])
    if departments:
        lines.append("\nDepartments:")
        for dept in departments:
            lines.append(f"  • {dept['name']}: {dept['employee_count']} emp, {dept['attrition_rate']}% attrition, {dept['average_perf']}/5.0 rating")
    
    top_performers = context.get('high_performers', [])
    if top_performers:
        lines.append("\nTop Performers:")
        for emp in top_performers[:3]:
            lines.append(f"  • {emp['name']}: {emp['rating']}/5.0 rating, {emp['years']} years")
    
    candidates = context.get('top_candidates', [])
    if candidates:
        lines.append("\nCandidates:")
        for cand in candidates[:3]:
            lines.append(f"  • {cand['name']} for {cand['job']}: {cand['match_pct']}% match")
    
    return "\n".join(lines) if lines else "Company data processing..."
