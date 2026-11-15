"""Write the FastAPI OpenAPI schema to the path given as the first argument."""

import json
import sys
from pathlib import Path

from fretless.api import app

Path(sys.argv[1]).write_text(json.dumps(app.openapi()), encoding="utf-8")
