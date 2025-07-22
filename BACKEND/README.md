### Backend Set Up - 22 -Jul - 2025

> Go into the backend folder
Open terminal and run:
cd backend

> Create a virtual environment
python -m venv venv
venv\Scripts\activate          

> Install FastAPI and Uvicorn
pip install fastapi uvicorn

> Created main.py
backend/main.py

> Run the FastAPI app

uvicorn main:app --reload

> Open Swagger UI

http://127.0.0.1:8000/docs