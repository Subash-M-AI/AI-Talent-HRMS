import os
import json
import logging
import numpy as np

from app.ai.gemini_client import generate_gemini_text, is_gemini_enabled

logger = logging.getLogger(__name__)

# Try to import sentence_transformers
try:
    from sentence_transformers import SentenceTransformer
    model_name = 'sentence-transformers/all-MiniLM-L6-v2'
    transformer_model = SentenceTransformer(model_name)
    logger.info("SentenceTransformer loaded successfully.")
except Exception as e:
    logger.warning(f"Failed to load SentenceTransformer: {e}. Falling back to basic TF-IDF mock ranking.")
    transformer_model = None

def calculate_cosine_similarity(vec1, vec2):
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

async def rank_candidate_against_job(resume_json: dict, job_description: str, job_requirements: list) -> dict:
    """
    Ranks a candidate's parsed resume details against a job description.
    Returns: match_percentage, skill_match (dict), hiring_recommendation
    """
    # 1. Calculate semantic match percentage
    match_percentage = 0.5  # default
    
    resume_skills = resume_json.get("skills", [])
    resume_text = f"Skills: {', '.join(resume_skills)}. "
    resume_text += f"Summary: {resume_json.get('resume_summary', '')}. "
    for exp in resume_json.get("experience", []):
        resume_text += f"Worked as {exp.get('role', '')} at {exp.get('company', '')}: {exp.get('description', '')}. "

    # Semantic similarity
    if transformer_model is not None:
        try:
            embeddings = transformer_model.encode([resume_text, job_description])
            sim = calculate_cosine_similarity(embeddings[0], embeddings[1])
            # Scale sim from roughly [0, 1] to a nice percentage [0, 100]
            match_percentage = max(0.0, min(100.0, sim * 100))
        except Exception as e:
            logger.error(f"Error calculating SentenceTransformer embeddings: {e}")
            match_percentage = calculate_simple_overlap_score(resume_skills, job_requirements)
    else:
        # Fallback keyword overlap
        match_percentage = calculate_simple_overlap_score(resume_skills, job_requirements)

    # 2. Skill match categorization
    matched_skills = []
    missing_skills = []
    
    for req in job_requirements:
        # Simple substring match check
        found = False
        for skill in resume_skills:
            if skill.lower() in req.lower() or req.lower() in skill.lower():
                matched_skills.append(req)
                found = True
                break
        if not found:
            missing_skills.append(req)

    # 3. Generate recommendation with Gemini or mock synthesis
    recommendation = ""
    if is_gemini_enabled():
        prompt = f"""
        You are an expert technical HR Recruiter.
        Compare this candidate's resume summary & skills against the job requirements and description.
        
        Candidate Skills: {', '.join(resume_skills)}
        Candidate Summary: {resume_json.get('resume_summary', '')}
        Job Title: {job_description[:100]}
        Job Requirements: {', '.join(job_requirements)}
        
        Generate a concise, professional Hiring Recommendation (2-3 sentences max).
        Highlight whether the candidate is a strong, moderate, or weak fit, what major skills overlap, and if you recommend interviewing them.
        """
        try:
            response_text = await generate_gemini_text(prompt)
            recommendation = response_text or generate_mock_recommendation(match_percentage, matched_skills, missing_skills)
        except Exception as e:
            logger.error(f"Error generating recommendation from Gemini: {e}")
            recommendation = generate_mock_recommendation(match_percentage, matched_skills, missing_skills)
    else:
        recommendation = generate_mock_recommendation(match_percentage, matched_skills, missing_skills)

    return {
        "match_percentage": round(match_percentage, 1),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "hiring_recommendation": recommendation
    }

def calculate_simple_overlap_score(resume_skills: list, job_requirements: list) -> float:
    if not job_requirements:
        return 50.0
    
    overlap_count = 0
    for req in job_requirements:
        for skill in resume_skills:
            if skill.lower() in req.lower() or req.lower() in skill.lower():
                overlap_count += 1
                break
                
    score = (overlap_count / len(job_requirements)) * 100
    # Add a baseline so it feels organic
    return min(100.0, max(30.0, score + 15.0))

def generate_mock_recommendation(score: float, matched: list, missing: list) -> str:
    if score >= 80:
        fit = "strong"
    elif score >= 55:
        fit = "moderate"
    else:
        fit = "weak"
        
    rec = f"The candidate is a {fit} match for the role, scoring {round(score, 1)}% in semantic similarity. "
    if matched:
        rec += f"They demonstrate alignment with core requirements like {', '.join(matched[:3])}. "
    if missing:
        rec += f"However, they lack direct experience with {', '.join(missing[:2])}. "
    
    if fit in ["strong", "moderate"]:
        rec += "Recommended to move forward to the interview stage."
    else:
        rec += "Not recommended for technical interview at this time."
    return rec
