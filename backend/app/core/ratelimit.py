from __future__ import annotations

"""
Optionele rate limiting via slowapi.
We exposen altijd dezelfde symbolen zodat imports niet breken, ook als slowapi niet geïnstalleerd is.
"""

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    from slowapi.middleware import SlowAPIMiddleware
    from slowapi.errors import RateLimitExceeded
    from slowapi import _rate_limit_exceeded_handler as _default_handler

    # Key-functie: IP-adres van client
    limiter = Limiter(key_func=get_remote_address)

    def rate_limit_exceeded_handler(request, exc):
        # Je kunt een eigen response maken; nu gebruiken we de default slowapi handler.
        return _default_handler(request, exc)

except Exception:  # pragma: no cover - fallback pad
    limiter = None
    SlowAPIMiddleware = None
    RateLimitExceeded = None

    def rate_limit_exceeded_handler(*args, **kwargs):  # type: ignore
        # No-op fallback als slowapi ontbreekt
        pass
