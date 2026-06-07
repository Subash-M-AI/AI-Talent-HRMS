import logging

from app.ai.gemini_client import generate_gemini_text, is_gemini_enabled

logger = logging.getLogger(__name__)

def predict_attrition_risk_score(metrics: dict) -> tuple:
    """
    Simulates a Random Forest/XGBoost predictor by mapping numeric factors to risk score.
    Returns: (risk_score_percentage, risk_level_string)
    
    Inputs in metrics:
    - satisfaction_score: 1.0 to 5.0 (low is risk)
    - work_life_balance: 1.0 to 5.0 (low is risk)
    - environment_satisfaction: 1.0 to 5.0 (low is risk)
    - training_times_last_year: 0 to 6 (low is risk)
    - years_at_company: 0 to 10 (mid-range 1-3 years is high risk)
    - performance_rating: 1.0 to 5.0 (low is risk, extremely high with low satisfaction is also risk)
    """
    # Baseline risk
    score = 25.0
    
    satisfaction = float(metrics.get("satisfaction_score", 4.0))
    wlb = float(metrics.get("work_life_balance", 4.0))
    env = float(metrics.get("environment_satisfaction", 4.0))
    trainings = int(metrics.get("training_times_last_year", 2))
    tenure = int(metrics.get("years_at_company", 1))
    perf = float(metrics.get("performance_rating", 3.0))

    # Calculate risk weights
    # 1. Satisfaction impact (Max 25 pts)
    score += (5.0 - satisfaction) * 6.25
    
    # 2. Work Life Balance impact (Max 20 pts)
    score += (5.0 - wlb) * 5.0
    
    # 3. Environment satisfaction impact (Max 15 pts)
    score += (5.0 - env) * 3.75
    
    # 4. Tenure impact (Max 10 pts)
    # Peak risk is around 1-3 years
    if 1 <= tenure <= 3:
        score += 10
    elif tenure < 1:
        score += 5
        
    # 5. Training/Investment impact (Max 10 pts)
    if trainings == 0:
        score += 10
    elif trainings == 1:
        score += 5
        
    # 6. Performance vs Satisfaction disconnect (Max 10 pts)
    # High performers who are unsatisfied are very high risk to leave
    if perf >= 4.0 and satisfaction <= 2.5:
        score += 15

    # Normalize score between 0 and 100
    score = max(5.0, min(95.0, score))
    
    if score >= 75.0:
        level = "HIGH"
    elif score >= 45.0:
        level = "MEDIUM"
    else:
        level = "LOW"
        
    return round(score, 1), level

async def generate_retention_strategy(employee_name: str, job_title: str, metrics: dict, risk_score: float, risk_level: str) -> str:
    """Generates a tailored HR action plan to keep the employee based on risk indicators."""
    if not is_gemini_enabled():
        return generate_mock_retention_strategy(employee_name, job_title, metrics, risk_level)

    prompt = f"""
    You are an expert HR Psychologist and Talent Retention Consultant.
    Review the following employee risk indicators and design a custom retention strategy.
    
    Employee Name: {employee_name}
    Job Title: {job_title}
    Attrition Risk Score: {risk_score}%
    Risk Level: {risk_level}
    
    Metrics (each rated 1.0 to 5.0 or raw integers):
    - Job Satisfaction: {metrics.get('satisfaction_score')}
    - Work-Life Balance: {metrics.get('work_life_balance')}
    - Environment Satisfaction: {metrics.get('environment_satisfaction')}
    - Training Sessions last year: {metrics.get('training_times_last_year')}
    - Years at Company: {metrics.get('years_at_company')}
    - Performance Rating: {metrics.get('performance_rating')}
    
    Provide a professional, actionable 3-point HR Retention Strategy specifically addressing their low-scoring areas.
    Format your response in neat markdown bullet points. Do not mention the metrics scale in text, just provide the actionable points.
    """

    try:
        response_text = await generate_gemini_text(prompt)
        if response_text:
            return response_text
        return generate_mock_retention_strategy(employee_name, job_title, metrics, risk_level)
    except Exception as e:
        logger.error(f"Error generating retention strategy via Gemini: {e}")
        return generate_mock_retention_strategy(employee_name, job_title, metrics, risk_level)

def generate_mock_retention_strategy(name: str, job: str, metrics: dict, level: str) -> str:
    satisfaction = float(metrics.get("satisfaction_score", 4.0))
    wlb = float(metrics.get("work_life_balance", 4.0))
    
    strategies = []
    
    if level == "LOW":
        return (
            "1. **Engage with Continuous Growth**: Maintain current satisfaction levels by providing pathways to new project assignments.\n"
            "2. **Regular Check-ins**: Conduct standard quarterly reviews to ensure career roadmap alignment.\n"
            "3. **Skill Recognition**: Highlight accomplishments in team meetings to foster continued belonging."
        )

    if satisfaction <= 3.0:
        strategies.append(
            "**Conduct Stay Interview**: Arrange a 1-on-1 meeting with the manager to discuss job role fit and resolve blockages in day-to-day work."
        )
    if wlb <= 3.0:
        strategies.append(
            "**Evaluate Workload Distribution**: Offer flexible remote arrangements or review project delivery timelines to reduce overtime stress."
        )
    
    # Generic backups
    if len(strategies) < 1:
        strategies.append("**Review Compensation & Rewards**: Ensure base salary is competitive relative to current market data for this role.")
    if len(strategies) < 2:
        strategies.append("**Upskilling & Certifications**: Sponsor enrollment in a new technical training course to increase role attachment.")
        
    strategies.append("**Promotional Pipeline**: Outline clear KPIs required for the next title bump to maintain high motivation.")

    return "\n".join([f"{i+1}. {strat}" for i, strat in enumerate(strategies)])
