import json
import logging
import sys
from datetime import datetime, timezone


class CloudRunJsonFormatter(logging.Formatter):
    """Logs JSON compatibles Cloud Logging (champ severity)."""

    SEVERITY_MAP = {
        logging.DEBUG: 'DEBUG',
        logging.INFO: 'INFO',
        logging.WARNING: 'WARNING',
        logging.ERROR: 'ERROR',
        logging.CRITICAL: 'CRITICAL',
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, object] = {
            'severity': self.SEVERITY_MAP.get(record.levelno, 'DEFAULT'),
            'message': record.getMessage(),
            'timestamp': datetime.now(tz=timezone.utc).isoformat(),
            'logger': record.name,
        }
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_entry, ensure_ascii=False)


def configure_logging(environment: str) -> None:
    handler = logging.StreamHandler(sys.stdout)
    if environment == 'production':
        handler.setFormatter(CloudRunJsonFormatter())
    else:
        handler.setFormatter(logging.Formatter('%(levelname)s %(name)s — %(message)s'))

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers = [handler]

    logging.getLogger('uvicorn.access').setLevel(
        logging.WARNING if environment == 'production' else logging.INFO
    )
