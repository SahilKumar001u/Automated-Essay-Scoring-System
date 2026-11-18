FROM python:3.12-slim

# Java runs the local LanguageTool server (essays never leave the container for grammar checks)
RUN apt-get update && apt-get install -y --no-install-recommends default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake models into the image so the first evaluation is fast and needs no downloads
RUN python -m spacy download en_core_web_sm \
    && python -c "import language_tool_python as l; l.LanguageTool('en-US').close()" \
    && python -c "from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2 as E; E()(['warm'])"

COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
