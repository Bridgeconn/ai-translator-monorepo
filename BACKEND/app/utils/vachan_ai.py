import os
from dotenv import load_dotenv
import httpx
import time
from fastapi import HTTPException
import logging

logging.basicConfig(level=logging.INFO)
# Load environment variables
load_dotenv()
 
VACHAN_LOGIN_URL = os.getenv("VACHAN_LOGIN_URL")
VACHAN_TRANSLATE_URL = os.getenv("VACHAN_TRANSLATE_URL")
VACHAN_JOB_STATUS_URL = os.getenv("VACHAN_JOB_STATUS_URL")
VACHAN_USERNAME = os.getenv("VACHAN_USERNAME")
VACHAN_PASSWORD = os.getenv("VACHAN_PASSWORD")
VACHAN_MODEL_NAME = os.getenv("VACHAN_MODEL_NAME")
 
MAX_RETRIES = 200
POLL_INTERVAL = 3 

SUPPORTED_MODELS = [
    "nllb-600M",
    "nllb_finetuned_eng_nzm"
]

DEFAULT_MODEL = "nllb-600M"
 
def get_access_token():
    try:
        resp = httpx.post(VACHAN_LOGIN_URL, data={
            "username": VACHAN_USERNAME,
            "password": VACHAN_PASSWORD
        })
        logging.info(f"[Vachan] Login response status: {resp.status_code}")
        logging.info(f"[Vachan] Login response body: {resp.text}")

        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            raise HTTPException(status_code=500, detail="Vachan AI did not return an access token.")
        return token
    except Exception as e:
        logging.error("get_access_token failed", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Vachan login failed: {str(e)}")
def request_translation(token: str, texts: list[str], src_lang: str, tgt_lang: str, model_name: str = DEFAULT_MODEL):
    """Send batch translation request and return job_id."""
    if model_name not in SUPPORTED_MODELS:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {model_name}")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    # url = f"{VACHAN_TRANSLATE_URL}?device=cpu&model_name=nllb-600M&source_language={src_lang}&target_language={tgt_lang}"
    
    url = (f"{VACHAN_TRANSLATE_URL}?device=cpu"
           f"&model_name={model_name}"
           f"&source_language={src_lang}"
           f"&target_language={tgt_lang}")
    # Pass the whole list of tokens
    resp = httpx.post(url, json=texts, headers=headers)
    resp.raise_for_status()
 
    job_id = resp.json().get("data", {}).get("jobId")
    if not job_id:
        raise HTTPException(status_code=500, detail=f"Vachan translation request failed: {resp.text}")
    return job_id
# def poll_job_status(token: str, job_id: int):
#     """Poll until translation job completes or fails. Returns list of translations."""
#     headers = {"Authorization": f"Bearer {token}"}
#     url = f"{VACHAN_JOB_STATUS_URL}?job_id={job_id}"
 
#     for _ in range(MAX_RETRIES):
#         resp = httpx.get(url, headers=headers)
#         resp.raise_for_status()
#         data = resp.json().get("data", {})
#         status = data.get("status", "").lower()
#         if "finished" in status:
#             translations = data.get("output", {}).get("translations", [])
#             if translations:
#                 # return full list of translated texts
#                 return [t["translatedText"] for t in translations]
#             else:
#                 raise HTTPException(status_code=500, detail="Vachan AI returned no translations.")
#         elif "failed" in status:
#             raise HTTPException(status_code=500, detail="Vachan AI job failed.")
 
#         time.sleep(POLL_INTERVAL)
 
#     raise HTTPException(status_code=504, detail="Timeout waiting for Vachan AI translation.")
# def translate_texts_with_polling(src_lang: str, tgt_lang: str, texts: list[str]):
#     """Full batch translation flow: login, request, poll until done. Returns list of translations."""
#     token = get_access_token()
#     job_id = request_translation(token, texts, src_lang, tgt_lang)
#     return poll_job_status(token, job_id)
# def translate_texts_with_polling(src_lang: str, tgt_lang: str, texts: list[str]):
#     """
#     Full batch translation flow: login, request, poll until done.
#     Raises exception immediately if any failure occurs.
#     """
#     try:
#         token = get_access_token()
#         job_id = request_translation(token, texts, src_lang, tgt_lang)
#         translations = poll_job_status(token, job_id)
#         return translations
#     except Exception as e:
#         # Log the error for debugging
#         print(f"Translation failed: {e}")
#         # Raise the exception to stop the backend batch loop immediately
#         raise
def translate_texts_with_polling(src_lang: str, tgt_lang: str, texts: list[str], model_name: str = DEFAULT_MODEL):
    """
    Full batch translation flow with fixed batch size 10.
    Returns list of translated texts.
    """
    if not texts:
        return []

    batch_size = 10
    total_tokens = len(texts)
    all_translations = []
    token_index = 0

    try:
        token = get_access_token()

        while token_index < total_tokens:
            batch_texts = texts[token_index: token_index + batch_size]
            job_id = request_translation(token, batch_texts, src_lang, tgt_lang, model_name)
            # Collect translations from generator
            translated_texts = list(poll_job_status(token, job_id))
            all_translations.extend(translated_texts)
            token_index += batch_size

        return all_translations

    except Exception as e:
        print(f"[ERROR] Translation failed at index {token_index}: {e}")
        raise

def poll_job_status(token: str, job_id: int):
    """
    Poll Vachan AI job until completion or failure.
    Yields each translated text as soon as it is available.
    """
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{VACHAN_JOB_STATUS_URL}?job_id={job_id}"

    for attempt in range(MAX_RETRIES):
        resp = httpx.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json().get("data", {})
        status = data.get("status", "").lower()

        if "finished" in status:
            translations = data.get("output", {}).get("translations", [])
            if translations:
                for t in translations:
                    yield t["translatedText"]  # ✅ yield per token
                return
            else:
                raise HTTPException(status_code=500, detail="Vachan AI returned no translations.")

        elif "failed" in status:
            raise HTTPException(status_code=500, detail="Vachan AI job failed.")

        time.sleep(POLL_INTERVAL)

    raise HTTPException(status_code=504, detail="Timeout waiting for Vachan AI translation.")