"""Conditional revalidation of bounded parsed snapshots. Never persist raw HTML."""
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

REVISION=1
MAX_BYTES=2_000_000
MAX_ENTRIES=80


def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def validator(value):
    return value if isinstance(value,str) and len(value)<=512 and not any(c in value for c in '\r\n\x00') else None

class SnapshotCache:
    def __init__(self,path):
        self.path=Path(path)
        self.rows={}
        self.metrics={'revalidated':0,'unchanged':0,'changed':0}
        try:
            if self.path.stat().st_size>MAX_BYTES:return
            data=json.loads(self.path.read_text())
            if not isinstance(data,dict) or len(data)>MAX_ENTRIES:return
            now=datetime.now(timezone.utc)
            for key,row in data.items():
                if not isinstance(row,dict) or row.get('revision')!=REVISION:continue
                when=datetime.fromisoformat(row['checked_at'])
                if when.tzinfo is None or when>now or now-when>timedelta(days=7):continue
                observed=datetime.fromisoformat(row['first_observed_at'])
                if observed.tzinfo is None or observed>when:continue
                if row.get('digest')!=digest(row.get('payload')):continue
                self.rows[key]=row
        except (OSError,ValueError,KeyError,TypeError):
            self.rows={}
    def fetch(self,client,url,kind,parse):
        key=kind+':'+url
        old=self.rows.get(key)
        conditions={}
        if old:
            for name,field in [('If-None-Match','etag'),('If-Modified-Since','last_modified')]:
                if validator(old.get(field)):conditions[name]=old[field]
        conditional=hasattr(client,'get_conditional')
        body=client.get_conditional(url,conditions) if conditional else client.get(url)
        status=getattr(client,'last_status',200) if conditional else 200
        now=datetime.now(timezone.utc).isoformat()
        if status==304:
            if not old or not conditions:raise ValueError('unverified_304')
            self.metrics['revalidated']+=1
            payload=old['payload']
        else:
            payload=parse(body.decode('utf-8'))
        hashed=digest(payload)
        unchanged=bool(old and old['digest']==hashed)
        self.metrics['unchanged' if unchanged else 'changed']+=1
        headers=getattr(client,'last_headers',{}) if conditional else {}
        row={'revision':REVISION,'payload':payload,'digest':hashed,'checked_at':now,
             'first_observed_at':old['first_observed_at'] if unchanged else now,
             'etag':validator(headers.get('etag')) or (old.get('etag') if status==304 else None),
             'last_modified':validator(headers.get('last-modified')) or (old.get('last_modified') if status==304 else None)}
        self.rows[key]=row
        # Always replace state atomically; original capture time never becomes now.
        rows=dict(sorted(self.rows.items(),key=lambda pair:pair[1]['checked_at'],reverse=True)[:MAX_ENTRIES])
        text=json.dumps(rows)
        while len(text.encode())>MAX_BYTES and rows:
            rows.pop(next(reversed(rows)));text=json.dumps(rows)
        self.path.parent.mkdir(parents=True,exist_ok=True)
        tmp=self.path.with_suffix('.tmp');tmp.write_text(text);tmp.replace(self.path)
        return payload,{'checked_at':now,'first_observed_at':row['first_observed_at'],
                        'unchanged':unchanged,'http_status':status}
