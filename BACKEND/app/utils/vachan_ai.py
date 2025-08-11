# app/utils/vachan_ai.py
import httpx
import time
from fastapi import HTTPException

VACHAN_LOGIN_URL = "https://api.vachanengine.org/v2/ai/token"
VACHAN_TRANSLATE_URL = "https://api.vachanengine.org/v2/ai/model/text/translate"
VACHAN_JOB_STATUS_URL = "https://api.vachanengine.org/v2/ai/model/job"

# Hardcoded login credentials (per your request)
USERNAME = "slimywhite2@gmail.com"
PASSWORD = "Demon@9827"

MAX_RETRIES = 15
POLL_INTERVAL = 2  # seconds

def get_access_token():
    """Login to Vachan AI and return access token."""
    try:
        resp = httpx.post(VACHAN_LOGIN_URL, data={
            "username": USERNAME,
            "password": PASSWORD
        })
        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            raise HTTPException(status_code=500, detail="Vachan AI did not return an access token.")
        return token
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vachan login failed: {str(e)}")

def request_translation(token: str, text: str, src_lang: str, tgt_lang: str):
    """Send translation request and return job_id."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    url = f"{VACHAN_TRANSLATE_URL}?device=cpu&model_name=nllb-600M&source_language={src_lang}&target_language={tgt_lang}"
    resp = httpx.post(url, json=[text], headers=headers)
    resp.raise_for_status()

    job_id = resp.json().get("data", {}).get("jobId")
    if not job_id:
        raise HTTPException(status_code=500, detail=f"Vachan translation request failed: {resp.text}")
    return job_id

def poll_job_status(token: str, job_id: int):
    """Poll until translation job completes or fails."""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{VACHAN_JOB_STATUS_URL}?job_id={job_id}"

    for _ in range(MAX_RETRIES):
        resp = httpx.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json().get("data", {})

        status = data.get("status", "").lower()
        if "finished" in status:
            translations = data.get("output", {}).get("translations", [])
            if translations:
                return translations[0]["translatedText"]
            else:
                raise HTTPException(status_code=500, detail="Vachan AI returned no translations.")
        elif "failed" in status:
            raise HTTPException(status_code=500, detail="Vachan AI job failed.")

        time.sleep(POLL_INTERVAL)

    raise HTTPException(status_code=504, detail="Timeout waiting for Vachan AI translation.")
    
def translate_text_with_polling(src_lang: str, tgt_lang: str, text: str):
    """Full translation flow: login, request translation, poll until done."""
    token = get_access_token()
    job_id = request_translation(token, text, src_lang, tgt_lang)
    return poll_job_status(token, job_id)
