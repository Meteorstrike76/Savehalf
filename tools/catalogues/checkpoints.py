"""Small, bounded image checkpoints. Reuse never renews source observations."""
import json
import re
from datetime import datetime, timedelta, timezone

MAX_ENTRIES=500
MAX_BYTES=500_000


def load(path, now=None):
    now=now or datetime.now(timezone.utc)
    try:
        if path.stat().st_size>MAX_BYTES:
            return {}
        value=json.loads(path.read_text())
        if not isinstance(value,dict) or len(value)>MAX_ENTRIES:
            return {}
        result={}
        for url,row in value.items():
            if not isinstance(url,str) or len(url)>1000 or not isinstance(row,dict):
                continue
            when=datetime.fromisoformat(row.get('downloaded_at',''))
            if when.tzinfo is None or when>now or now-when>timedelta(days=7):
                continue
            if not re.fullmatch('[a-f0-9]{64}',row.get('sha256','')) or row.get('status') not in ['ocr_empty','ocr_evidence_only']:
                continue
            if row.get('region') not in [None,'NSW','VIC','ACT','QLD','TAS','SA','NT','WA']:
                continue
            # No arbitrary cached paths, source payloads or text are trusted.
            result[url]={k:row.get(k) for k in ['downloaded_at','sha256','status','region']}
        return result
    except (OSError,ValueError,TypeError):
        return {}


def bounded(rows):
    return dict(sorted(rows.items(),key=lambda pair:pair[1]['downloaded_at'],reverse=True)[:MAX_ENTRIES])
