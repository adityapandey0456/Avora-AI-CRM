from fastapi import FastAPI, Depends # Depends add kiya
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session # Naya import
from datetime import datetime # Naya import
import database
import agent

app = FastAPI(title="Al-First CRM HCP Module")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

# Form Data receive karne ke liye schema
class InteractionForm(BaseModel):
    hcpName: str
    interactionType: str
    date: str
    time: str
    topics: str
    sentiment: str
    actions: str

@app.get("/")
def read_root():
    return {"message": "Backend and SQLite Database are running successfully!"}

@app.post("/api/chat")
def chat_endpoint(request: ChatRequest):
    reply = agent.chat_with_agent(request.message)
    return {"reply": reply}

# MAGIC DATABASE SAVE ROUTE
@app.post("/api/save_log")
def save_interaction_log(form_data: InteractionForm, db: Session = Depends(database.get_db)):
    # Handle empty dates and times safely
    parsed_date = datetime.strptime(form_data.date, "%Y-%m-%d").date() if form_data.date else None
    parsed_time = datetime.strptime(form_data.time, "%H:%M").time() if form_data.time else None

    # Database model me data map karo
    new_log = database.InteractionLog(
        hcp_name=form_data.hcpName,
        interaction_type=form_data.interactionType,
        date=parsed_date,
        time=parsed_time,
        topics_discussed=form_data.topics,
        sentiment=form_data.sentiment,
        follow_up_actions=form_data.actions
    )
    
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return {"message": "Data saved successfully to database!", "log_id": new_log.id}