# Project Setup

### Create Virtual Environment
- `python -m venv ENV`

### Activate the Virtual Environment
- `source env/bin/activate`

### Upgrade pip 
Many exotic errors while installing a package are solved by just upgrading pip first.
- `python -m pip install --upgrade pip`

### Add .gitignore
Do this once, right after you create the virtual environment.It will create a .gitignore file inside the env folder so it will ignore everything in the .venv directory.
- `echo "*" > env/.gitignore`

### Install Packages
 **FastAPI**
 Make sure you put "fastapi[standard]" in quotes to ensure it works in all terminals.
 `pip install "fastapi[standard]"` 


  
### Add packages to requirements.txt file
Once you have installed all packages you can save the details in requirements.txt file
- `pip freeze > requirements.txt`

### Project Setup (Using Miniconda)
**Install Miniconda (if not already)**
- Download the installer: https://docs.conda.io/en/latest/miniconda.html

Then run:

`bash Miniconda3-latest-Linux-x86_64.sh`
**Create and activate environment**
`conda create --name bible-translator python=3.10 -y`
`conda activate bible-translator`


### Start the app
`uvicorn app.main:app --reload`

### Packages
pip install ruff black mypy (for testing lint errors)
for test - `ruff check .`
fix automatically - `ruff check . --fix`   (DONT TRY)


### ERRORS
Install seperatly if any warning related to passlib
passlib[bcrypt] - pip install passlib[bcrypt]

