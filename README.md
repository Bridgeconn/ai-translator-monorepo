# ai-translator-monorepo
A monorepo for an AI-powered language translation application, encompassing both frontend UI and backend API services.
# Clone repo

git clone https://github.com/Bridgeconn/ai-translator-monorepo.git
 
# Go into folder

cd ai-translator-monorepo
 
# Install backend

cd BACKEND 

# Mini conda installation 

wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
 
bash Miniconda3-latest-Linux-x86_64.sh 

conda create -n myenv
 
conda activate myenv
 
# Install dependencies
pip install -r requirements.txt 
 
# Run backend

uvicorn app.main:app --reload

or 

python -m uvicorn app.main:app --reload
 
# Install frontend

cd ai-translator-monorepo

cd UI

cd ai-translator

pnpm install

pnpm run dev 

# if not work : 
Then do this in you repo path in terminal ---->    
curl -fsSL https://get.pnpm.io/install.sh | sh -

source ~/.bashrc

pnpm -v 

pnpm install

pnpm run dev
