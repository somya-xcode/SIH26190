import time
from typing import Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

class InMemoryRateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = {}

    async def dispatch(self, request: Request, call_next):
        # Exclude docs and health checks
        if request.url.path in ("/docs", "/redoc", "/openapi.json", "/health", "/"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()

        # Clean old timestamps
        history = self.requests.get(client_ip, [])
        history = [t for t in history if now - t < self.window_seconds]
        self.requests[client_ip] = history

        if len(history) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."}
            )

        history.append(now)
        self.requests[client_ip] = history
        return await call_next(request)
