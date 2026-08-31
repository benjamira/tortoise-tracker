FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    # HEIC/HEIF support for iPhone photos – prebuilt wheel exists for this base image.
    && pip install --no-cache-dir "pillow-heif==0.21.0"

COPY app ./app

ENV DATA_DIR=/data
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
