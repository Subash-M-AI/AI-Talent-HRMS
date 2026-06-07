import json
import logging

from app.ai.gemini_client import generate_gemini_text, is_gemini_enabled

logger = logging.getLogger(__name__)

async def analyze_skill_gap(current_role: str, target_role: str, current_skills: list) -> dict:
    """
    Compares current skills/role to target role.
    Returns: missing_skills (list), learning_roadmap (list), courses (list), certifications (list)
    """
    current_skills = current_skills or []

    if not is_gemini_enabled():
        return generate_mock_skill_gap(current_role, target_role, current_skills)

    prompt = f"""
    You are an expert Career Development Coach and Technical Trainer.
    Analyze the skill gap for an employee moving from their current role to a target role.
    
    Employee Details:
    - Current Role: {current_role}
    - Target Role: {target_role}
    - Current Skills: {', '.join(current_skills)}
    
    Generate a gap analysis in a structured JSON format. Return ONLY the raw JSON object with no markdown styling, no ```json wrapper.
    The JSON structure must match this EXACT schema:
    {{
        "missing_skills": ["list of 3-6 skills needed for the target role that are not in current skills"],
        "learning_roadmap": [
            {{
                "phase": "string (e.g. 'Phase 1: Fundamentals')",
                "milestone": "string (what they will achieve)",
                "duration": "string (e.g. '1-2 months')",
                "tasks": ["list of specific study tasks or projects"]
            }}
        ],
        "courses": [
            {{
                "name": "string (realistic course name)",
                "platform": "string (Coursera, Udemy, Pluralsight, etc.)",
                "duration": "string"
            }}
        ],
        "certifications": [
            {{
                "name": "string (standard industry certification)",
                "provider": "string (AWS, Microsoft, Google, Scrum Alliance, etc.)",
                "difficulty": "string (Beginner, Intermediate, Advanced)"
            }}
        ]
    }}
    """

    try:
        text_resp = await generate_gemini_text(prompt)
        if not text_resp:
            return generate_mock_skill_gap(current_role, target_role, current_skills)
        
        # Clean any JSON code block markers
        if text_resp.startswith("```"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(text_resp)
        return parsed
    except Exception as e:
        logger.error(f"Error analyzing skill gap via Gemini: {e}")
        return generate_mock_skill_gap(current_role, target_role, current_skills)

def generate_mock_skill_gap(current_role: str, target_role: str, current_skills: list) -> dict:
    """Offline gap analysis that changes with role, target title, and current skills."""
    target_lower = target_role.lower()
    current_lower = current_role.lower()
    normalized_skills = {_normalize_skill(skill) for skill in (current_skills or [])}

    target_skill_map = [
        (("lead", "senior", "principal", "architect", "manager"), [
            "System Design & Architecture",
            "Technical Leadership",
            "Mentoring & Code Review",
            "Delivery Planning",
            "Architecture Decision Records",
        ]),
        (("frontend", "ui", "react"), [
            "Advanced React Patterns",
            "Frontend Performance",
            "Accessibility Engineering",
            "Design Systems",
            "State Management Architecture",
        ]),
        (("backend", "api", "server"), [
            "API Design Best Practices",
            "Distributed Systems",
            "Database Performance Tuning",
            "Event-Driven Architecture",
            "Observability",
        ]),
        (("full stack", "fullstack"), [
            "End-to-End System Design",
            "Next.js Architecture",
            "API Contract Design",
            "Cloud Deployment",
            "Automated Testing Strategy",
        ]),
        (("cloud", "devops", "sre", "platform"), [
            "Docker & Kubernetes",
            "Terraform Infrastructure as Code",
            "Cloud Architecture",
            "CI/CD Automation",
            "Prometheus Monitoring",
        ]),
        (("data", "analytics", "bi"), [
            "SQL Analytics",
            "Data Modeling",
            "Dashboard Storytelling",
            "Python Data Pipelines",
            "Experiment Analysis",
        ]),
        (("machine learning", "ml", "ai"), [
            "Machine Learning Modeling",
            "Feature Engineering",
            "Model Evaluation",
            "MLOps Deployment",
            "Responsible AI Practices",
        ]),
        (("qa", "test", "quality"), [
            "Test Automation",
            "API Testing",
            "Performance Testing",
            "Release Quality Gates",
            "Defect Triage",
        ]),
        (("product", "scrum", "owner"), [
            "Product Discovery",
            "Roadmap Prioritization",
            "Stakeholder Communication",
            "Agile Delivery",
            "Metrics-Driven Decisions",
        ]),
    ]

    desired_skills = []
    for keywords, skills in target_skill_map:
        if any(keyword in target_lower for keyword in keywords):
            desired_skills.extend(skills)

    if not desired_skills:
        desired_skills = [
            f"Advanced {target_role} Fundamentals",
            f"{target_role} Project Delivery",
            "Cross-Functional Communication",
            "Practical Automation",
            "Quality & Testing Discipline",
        ]

    if "engineer" in current_lower and not any("testing" in skill.lower() for skill in desired_skills):
        desired_skills.append("Production Debugging & Incident Response")

    missing = []
    for skill in desired_skills:
        normalized = _normalize_skill(skill)
        if not any(current in normalized or normalized in current for current in normalized_skills if current):
            missing.append(skill)
        if len(missing) == 6:
            break

    if not missing:
        missing = [
            f"Advanced {target_role} Portfolio Project",
            f"{target_role} Interview Storytelling",
            "Leadership Communication",
        ]

    focus = missing[:2]
    build = missing[2:4] or focus
    prove = missing[4:6] or build
    roadmap = [
        {
            "phase": "Phase 1: Role Foundations",
            "milestone": f"Close the first gaps for {target_role}",
            "duration": "2-3 weeks",
            "tasks": [f"Study {skill} with notes tied to your {current_role} work" for skill in focus]
        },
        {
            "phase": "Phase 2: Applied Practice",
            "milestone": f"Build a practical {target_role} proof project",
            "duration": "3-5 weeks",
            "tasks": [f"Create one portfolio task using {skill}" for skill in build]
        },
        {
            "phase": "Phase 3: Work Readiness",
            "milestone": f"Prepare promotion evidence for {target_role}",
            "duration": "2 weeks",
            "tasks": [f"Document outcomes and review feedback for {skill}" for skill in prove]
        },
    ]

    platforms = ["Coursera", "Udemy", "Pluralsight"]
    courses = [
        {
            "name": f"{skill} for {target_role}",
            "platform": platforms[idx % len(platforms)],
            "duration": f"{3 + idx} weeks",
        }
        for idx, skill in enumerate(missing[:3])
    ]

    certs = _recommended_certifications(target_lower, target_role)

    return {
        "missing_skills": missing,
        "learning_roadmap": roadmap,
        "courses": courses,
        "certifications": certs
    }


def _normalize_skill(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


def _recommended_certifications(target_lower: str, target_role: str) -> list:
    if any(term in target_lower for term in ["cloud", "devops", "sre", "platform"]):
        return [
            {"name": "AWS Certified Solutions Architect", "provider": "AWS", "difficulty": "Intermediate"},
            {"name": "Certified Kubernetes Application Developer", "provider": "CNCF", "difficulty": "Advanced"},
        ]
    if any(term in target_lower for term in ["data", "analytics", "bi"]):
        return [
            {"name": "Google Data Analytics Professional Certificate", "provider": "Google", "difficulty": "Beginner"},
            {"name": "Microsoft Power BI Data Analyst", "provider": "Microsoft", "difficulty": "Intermediate"},
        ]
    if any(term in target_lower for term in ["machine learning", "ml", "ai"]):
        return [
            {"name": "Machine Learning Specialization", "provider": "DeepLearning.AI", "difficulty": "Intermediate"},
            {"name": "Google Professional Machine Learning Engineer", "provider": "Google Cloud", "difficulty": "Advanced"},
        ]
    if any(term in target_lower for term in ["lead", "manager", "product", "scrum"]):
        return [
            {"name": "Certified ScrumMaster", "provider": "Scrum Alliance", "difficulty": "Beginner"},
            {"name": f"{target_role} Leadership Certificate", "provider": "LinkedIn Learning", "difficulty": "Intermediate"},
        ]
    return [
        {"name": f"{target_role} Professional Certificate", "provider": "Coursera", "difficulty": "Intermediate"},
        {"name": "Software Engineering Practices Certificate", "provider": "Pluralsight", "difficulty": "Intermediate"},
    ]
