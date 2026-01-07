# Mizan Software

Hybrid Desktop Application (Electron + Python).

## Prerequisites
- Node.js
- Python (added to PATH)
- Clear disk space on C: drive (npm cache requires space)

## Setup

1.  **Backend Setup**:
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

2.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    npm run build
    ```

3.  **Electron Setup**:
    ```bash
    # Root directory
    npm install
    npm start
    ```

## Structure
- `main.js`: Electron entry point. Manages Python process.
- `backend/`: Python FastAPI app.
- `frontend/`: React Vite app.
