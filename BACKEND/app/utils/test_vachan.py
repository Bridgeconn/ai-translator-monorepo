import time
import requests

BASE_URL = "https://api.vachanengine.org"
LOGIN_URL = "/v2/ai/token"
TRANSLATE_URL = "/v2/ai/model/text/translate"
JOB_STATUS_URL = "/v2/ai/model/job"
MAX_RETRIES = 10

# Login credentials
login_data = {
    "username": "slimywhite2@gmail.com",
    "password": "Demon@9827"
}

# Mapping for language codes
bcp_code_map = {
    "english": "eng_Latn",
    "hindi": "hin_Deva"
    
}

def login():
    res = requests.post(BASE_URL + LOGIN_URL, data=login_data)
    res.raise_for_status()
    return res.json()["access_token"]

def translate_text(token, src_lang, tgt_lang, text):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    payload = [text]
    url = f"{BASE_URL}{TRANSLATE_URL}?device=cpu&model_name=nllb-600M&source_language={src_lang}&target_language={tgt_lang}"
    res = requests.post(url, json=payload, headers=headers)
    print("Translation request response:", res.status_code, res.text)
    res.raise_for_status()

    data = res.json()
    return data["data"]["jobId"]

def poll_job_status(token, job_id):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }

    for _ in range(MAX_RETRIES):
        res = requests.get(f"{BASE_URL}{JOB_STATUS_URL}?job_id={job_id}", headers=headers)
        res.raise_for_status()
        data = res.json()["data"]
        
        status = data["status"].lower()
        if status == "job finished":
            return data["output"]["translations"]
        elif "failed" in status:
            raise Exception("Translation job failed")
        
        print(f"Status: {status}... retrying in 2s")
        time.sleep(2)

    raise TimeoutError("Max retries exceeded for job status check")

if __name__ == "__main__":
    # Hardcoded test
    source_lang = bcp_code_map["english"]
    target_lang = bcp_code_map["hindi"]
    text = "Hello, how are you?"

    print("Logging in...")
    token = login()
    print(f"Token: {token}")

    print("Requesting translation...")
    job_id = translate_text(token, source_lang, target_lang, text)
    print(f"Job ID: {job_id}")

    print("Polling job status...")
    translations = poll_job_status(token, job_id)

    print("\nTranslation result:")
    for t in translations:
        print(f"- {t['translatedText']}")
