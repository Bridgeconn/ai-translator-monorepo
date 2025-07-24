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