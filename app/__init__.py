"""Machine Hub User — Flask app factory (offline-only)."""
from pathlib import Path
from flask import Flask


def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=True)

    # Minimal config
    app.config["SECRET_KEY"] = "mh-user-offline-only-2026"
    app.config["JSON_SORT_KEYS"] = False

    # Ensure folders
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    # Register blueprints
    from .routes import bp
    app.register_blueprint(bp)

    # No-cache for HTML (force fresh SW updates)
    @app.after_request
    def _no_cache(response):
        path = ""
        try:
            from flask import request
            path = request.path or ""
        except Exception:
            pass
        if path.startswith("/static/") and "service-worker" in path:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response

    print("[MH User] App created — offline-only")
    return app
