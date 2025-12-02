from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi import Response
from pydantic import BaseModel
from supabase import create_client, Client
from datetime import datetime
import os
import traceback
import sys



# ---------------- Supabase Setup ----------------
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)


# ---------------- FastAPI Setup ----------------
app = FastAPI()

# CORS to allow frontend to call APIs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the frontend folder at the root URL
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# ---------------- Pydantic Model ----------------
class Catch(BaseModel):
    user_id: str
    date: str
    time: str
    location: str
    species: str
    length_in: float
    weight_lbs: float
    temperature: float
    bait: str




# ---------------- API Endpoints ----------------
@app.get("/index.html")
def get_index():
    return FileResponse("frontend/index.html")

@app.get("/")
def get_index():
    return FileResponse("frontend/index.html")

# Serve charts page
@app.get("/charts.html")
def get_charts():
    return FileResponse("frontend/charts.html")

@app.post("/log-catch")
def logCatch(catch: Catch):
    """
    Logs a new catch tied to a specific user_id.
    """
    try:
        if not catch.user_id:
            raise HTTPException(status_code=400, detail="Missing user_id")

        if not catch.date:
            catch.date = datetime.today().date().isoformat()
        if not catch.time:
            catch.time = datetime.now().strftime("%H:%M")

        response = supabase.table("catches").insert(catch.dict()).execute()
        return {"success": True, "data": response.data}

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))




@app.get("/catches")
def getCatches(user_id: str):
    """
    Returns ONLY the catches that belong to this user_id.
    """
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id")

        response = (
            supabase.table("catches")
            .select("*")
            .eq("user_id", user_id)
            .order("id", desc=False)
            .execute()
        )

        return {"data": response.data}

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))




@app.delete("/delete-catch/{catchId}")
def deleteCatch(catchId: int, user_id: str):
    """
    Deletes a catch only if it belongs to the requesting user_id.
    """
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id")

        # Delete only rows that match BOTH id AND user_id
        response = (
            supabase.table("catches")
            .delete()
            .eq("id", catchId)
            .eq("user_id", user_id)
            .execute()
        )

        if not response.data:
            return {"success": False, "message": "Catch not found or unauthorized"}

        return {"success": True, "message": "Catch deleted successfully"}

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))



@app.put("/edit-catch/{catchId}")
async def editCatch(catchId: int, catch: Catch):
    """
    Updates a catch only if it belongs to the correct user_id.
    """
    try:
        if not catch.user_id:
            raise HTTPException(status_code=400, detail="Missing user_id")

        response = (
            supabase.table("catches")
            .update(catch.dict(exclude={"id"}))
            .eq("id", catchId)
            .eq("user_id", catch.user_id)   # security check
            .execute()
        )

        if not response.data:
            return {"success": False, "message": "Catch not found or unauthorized"}

        return {"success": True, "data": response.data}

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    


@app.get("/keepalive")
def keepalive():
    """
    Endpoint that pings supabase to keep it from going idle
    """
    try:
        resp = supabase.table("catches").select("id").limit(1).execute()
        return {"ok": True, "supabase_rows": len(resp.data or [])}
    except Exception as e:
        return Response(content=f'{{"ok":false,"error":"{str(e)}"}}', media_type="application/json", status_code=200)
