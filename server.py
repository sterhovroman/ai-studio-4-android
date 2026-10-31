from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

app = FastAPI(title="AI Studio Ultimate 3.0 Local Bridge", version="3.0.0")
# Development default. Restrict origins and add auth before exposing beyond localhost/LAN.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False,
                   allow_methods=["GET", "POST"], allow_headers=["*"])

class Prompt(BaseModel):
    prompt: str
    duration: int | None = 30
    style: str | None = "cinematic"

@app.get("/health")
def health():
    return {"status":"ok","service":"AI Studio Local Bridge","version":"3.0.0",
            "adapters":{"music":"not_configured","image":"not_configured",
                        "video":"not_configured","speech":"browser_only",
                        "asr":"not_configured","segmentation":"not_configured"},
            "message":"Bridge is running; connect and configure open model adapters separately."}

@app.get("/capabilities")
def capabilities():
    return {"music":["ACE-Step","MusicGen"],"image":["ComfyUI","Stable Diffusion"],
            "video":["ComfyUI workflows","FFmpeg"],"speech":["Piper","browser SpeechSynthesis"],
            "asr":["Whisper"],"photo":["background removal","inpainting","upscaling"],
            "note":"Names describe possible integrations, not installed models."}

@app.post("/generate/music")
def generate_music(req: Prompt):
    return {"status":"not_configured","message":"Connect an ACE-Step or MusicGen adapter first.",
            "received_prompt":req.prompt}

@app.post("/generate/video")
def generate_video(req: Prompt):
    return {"status":"not_configured","message":"Connect a ComfyUI video workflow first.",
            "received_prompt":req.prompt}

@app.post("/photo/remove-background")
def remove_background():
    return {"status":"not_configured","message":"Install and configure a segmentation adapter (for example RMBG/rembg) first."}
