FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    torch==2.11.0 torchvision==0.26.0 \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements-api.txt ./requirements-api.txt
RUN pip install --no-cache-dir -r requirements-api.txt

COPY src ./src

ENV MODEL_PATH=/models/best_model.pth
EXPOSE 8000

CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
