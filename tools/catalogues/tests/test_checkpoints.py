import json
import sys
import tempfile
import unittest
from datetime import datetime,timezone
from pathlib import Path
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
from checkpoints import load, bounded
NOW=datetime(2026,11,14,tzinfo=timezone.utc)
class CheckpointTests(unittest.TestCase):
    def check(self,row):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'state.json';p.write_text(json.dumps({'url':row}))
            return load(p,NOW)
    def row(self):
        return {'downloaded_at':NOW.isoformat(),'sha256':'a'*64,'status':'ocr_evidence_only','region':'VIC'}
    def test_preserves_old_observation_time(self):
        r=self.row();r['downloaded_at']='2026-11-13T00:00:00+00:00'
        self.assertEqual(self.check(r)['url']['downloaded_at'],r['downloaded_at'])
    def test_old_future_or_naive_checkpoints_are_ignored(self):
        for t in ['2026-11-01T00:00:00+00:00','2026-11-15T00:00:00+00:00','2026-11-14']:
            r=self.row();r['downloaded_at']=t
            self.assertEqual(self.check(r),{})
    def test_unknown_status_and_paths_not_trusted(self):
        r=self.row();r['status']='published';self.assertEqual(self.check(r),{})
        r=self.row();r['file']='../../bad'
        self.assertNotIn('file',self.check(r)['url'])
    def test_checkpoint_count_is_bounded(self):
        self.assertEqual(len(bounded({str(i):self.row() for i in range(800)})),500)
