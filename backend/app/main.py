import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from app.db.init_db import init_db
from app.db.seed import seed_data
from app.api.v1.auth import router as auth_router
from app.api.v1.employees import router as employees_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.leave import router as leave_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.candidates import router as candidates_router
from app.api.v1.interviews import router as interviews_router
from app.api.v1.copilot import router as copilot_router
from app.api.v1.notifications import router as notifications_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # Store active connections grouped by user_id/role or global list
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        logger.info(f"Broadcasting websocket message: {message.get('type')}")
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                # Remove dead connections
                logger.warning(f"Failed to send websocket message, connection might be closed: {e}")

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the database
    try:
        await init_db()
        await seed_data()
    except Exception as e:
        logger.error(f"Failed to initialize/seed database during startup: {e}")
    yield
    # Shutdown logic (if any)
    pass

app = FastAPI(
    title="AI Talent Intelligence HRMS API",
    description="Enterprise-grade AI-powered Human Resource Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(employees_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(leave_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(candidates_router, prefix="/api/v1")
app.include_router(interviews_router, prefix="/api/v1")
app.include_router(copilot_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AI Talent Intelligence HRMS Backend",
        "documentation": "/docs"
    }

# Global WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for ping/pong or client messages
            data = await websocket.receive_json()
            # Echo back or handle specific client actions if needed
            await websocket.send_json({"status": "received", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        manager.disconnect(websocket)

# Global broadcast helper (can be imported in routers if needed)
async def broadcast_realtime_update(event_type: str, payload: dict):
    await manager.broadcast({
        "type": event_type,
        "payload": payload
    })
