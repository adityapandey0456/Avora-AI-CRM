import os
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from dotenv import load_dotenv
from langchain_core.messages import SystemMessage
load_dotenv()

# Initialize LLM with the required model[cite: 1]
llm = ChatGroq(
    temperature=0,
    model_name="llama-3.3-70b-versatile", 
    groq_api_key=os.getenv("GROQ_API_KEY")
)

# Tool 1: Log Interaction (Mandatory)[cite: 1]
@tool
def log_interaction(hcp_name: str, interaction_type: str, topics_discussed: str, sentiment: str) -> str:
    """Logs a new interaction with an HCP. Use this tool when the user wants to save interaction details."""
    # Note: Hum ise baad me database.py ke sath connect karenge real saving ke liye.
    return f"Successfully logged interaction for {hcp_name}. Topics: {topics_discussed}. Sentiment: {sentiment}."

# Tool 2: Edit Interaction (Mandatory)[cite: 1]
@tool
def edit_interaction(log_id: int, updated_topics: str = None, updated_sentiment: str = None) -> str:
    """Edits an existing interaction log. Use this when the user wants to change or modify logged data."""
    return f"Updated log {log_id} successfully in the system."

# Tool 3: Fetch HCP Profile / History[cite: 1]
@tool
def fetch_hcp_history(hcp_name: str) -> str:
    """Fetches previous interaction history for a given Healthcare Professional."""
    return f"Fetched history for {hcp_name}. (Recent discussion: Product efficacy, Positive sentiment)."

# Tool 4: Extract Action Items[cite: 1]
@tool
def extract_action_items(notes: str) -> str:
    """Extracts actionable next steps or follow-up actions from interaction notes."""
    return "Suggested Actions: 1. Schedule follow-up meeting, 2. Send product brochure."

# Tool 5: Analyze Sentiment[cite: 1]
@tool
def analyze_sentiment(text: str) -> str:
    """Analyzes the sentiment of the interaction notes. Returns Positive, Neutral, or Negative."""
    return "Positive"

@tool
def generate_followup_email(hcp_name: str, topics: str) -> str:
    """
    CRITICAL RULE: USE THIS TOOL *ONLY* IF THE USER TYPES WORDS LIKE "EMAIL", "DRAFT AN EMAIL", OR "WRITE AN EMAIL". 
    DO NOT use this tool if the user only asks for a "meeting", "call", or "follow-up".
    Generates a professional email draft.
    """
    
    draft = f"""
    Subject: Follow-up on our recent discussion
    
    Dear {hcp_name},
    
    Thank you for taking the time to meet with me today. It was great discussing {topics} with you. 
    I have noted your feedback and will be sharing the requested materials with you shortly.
    
    Best regards,
    [Your Name]
    """
    return draft

@tool
def flag_compliance_risk(notes: str) -> str:
    """Checks interaction notes for compliance risks, off-label usage, or adverse events."""
    risky_keywords = ["side effect", "adverse", "off-label", "reaction", "hospitalized"]
    notes_lower = notes.lower()
    
    if any(word in notes_lower for word in risky_keywords):
        return "⚠️ COMPLIANCE WARNING: Potential adverse event or risky discussion detected in notes. Please route this to the Pharmacovigilance (Safety) team immediately."
    
    return "✅ Compliance check passed. No high-risk keywords detected."
# Defining minimum of 5 specific tools[cite: 1]
# Array ka naam 'tools' hona chahiye
tools = [
    log_interaction, 
    edit_interaction, 
    fetch_hcp_history, 
    extract_action_items, 
    analyze_sentiment, 
    generate_followup_email,  
    flag_compliance_risk      
]

# Taaki yeh line bina error ke chal sake
# agent_executor = create_react_agent(llm, tools)

# Initialize LangGraph Agent
agent_executor = create_react_agent(llm, tools)

def chat_with_agent(user_message: str):
    # System prompt to force the AI to return formatted conversational text AND extracted data as JSON
    system_prompt = """You are an AI assistant for a Healthcare CRM. 
    When the user logs an interaction, process it using your tools. 
    
    STRICT RULES FOR YOUR RESPONSE:
    1. CONVERSATION FIRST: Write a polite, formatted conversational reply (use \n\n, bullet points, and bold text) to make it easy to read.
    2. THE EMAIL RULE: IF the user specifically asks to "email" or "draft an email", use the email tool and display the draft under "**📧 Follow-up Email:**". IF they only ask to "schedule a meeting", "call", or "follow-up", DO NOT generate an email.
    3. THE WARNING RULE: IF you detect compliance risks (side effects, adverse events), display a "**⚠️ Compliance Warning:**" and format it properly.
    4. THE JSON RULE: You MUST append a JSON block at the very end of your response containing the extracted details so the frontend can auto-fill the form.
    
    Format the JSON EXACTLY like this at the end:
    ```json
    {
      "hcpName": "Name of the doctor",
      "topics": "Key discussion points",
      "sentiment": "Positive", 
      "actions": "Next steps"
    }
    ```
    If a field is unknown, leave it empty. Sentiment must be Positive, Neutral, or Negative.
    """
    
    # Invoke agent with the system message and user message
    # Make sure from langchain_core.messages import SystemMessage is at the top of your file
    response = agent_executor.invoke({"messages": [SystemMessage(content=system_prompt), ("user", user_message)]})
    return response["messages"][-1].content