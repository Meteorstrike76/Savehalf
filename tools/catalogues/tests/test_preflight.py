import sys,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
from preflight import assess,REPOSITORY,PROJECT,TEAM
class PreflightTests(unittest.TestCase):
    def ready(self):
        return {'GITHUB_REPOSITORY':REPOSITORY,'GITHUB_REF':'refs/heads/main',
                'SAVEHALF_CATALOGUE_SOURCE_REVIEWED':'true','SAVEHALF_CATALOGUE_BUDGET_REVIEWED':'true',
                'VERCEL_PROJECT_ID':PROJECT,'VERCEL_ORG_ID':TEAM,'VERCEL_CLI_VERSION':'1.2.3',
                'VERCEL_TOKEN_PRESENT':'true'}
    def test_empty_setup_fails_closed_and_does_not_enable_anything(self):
        r=assess({});self.assertFalse(r['stage_ready']);self.assertFalse(r['publish_ready'])
        self.assertFalse(r['stage_enabled']);self.assertEqual(r['limits']['requests'],20)
    def test_ready_configuration_still_does_not_activate_flags(self):
        r=assess(self.ready());self.assertTrue(r['publish_ready']);self.assertFalse(r['publish_enabled'])
    def test_branch_and_repository_mismatch_block(self):
        for key,value in [('GITHUB_REF','refs/heads/feat/catalogue-pipeline'),('GITHUB_REPOSITORY','Meteorstrike76/savehalf-etl')]:
            e=self.ready();e[key]=value;self.assertFalse(assess(e)['stage_ready'])
    def test_target_and_cli_guards(self):
        for key,value in [('VERCEL_PROJECT_ID','another-project'),('VERCEL_ORG_ID','another-team'),('VERCEL_CLI_VERSION','latest'),('VERCEL_CLI_VERSION','1.2.3;echo x')]:
            e=self.ready();e[key]=value;self.assertFalse(assess(e)['publish_ready'])
    def test_no_credentials_or_supplied_values_are_echoed(self):
        e=self.ready();e['VERCEL_TOKEN']='sensitive-credential';e['VERCEL_CLI_VERSION']='sensitive-input';e['SAVEHALF_CATALOGUE_MODE']='sensitive-mode'
        result=str(assess(e));self.assertNotIn('sensitive-credential',result);self.assertNotIn('sensitive-input',result);self.assertNotIn('sensitive-mode',result)
    def test_full_rollout_needs_separate_review(self):
        e=self.ready();e['SAVEHALF_CATALOGUE_MODE']='full';self.assertFalse(assess(e)['stage_ready'])
        e['SAVEHALF_CATALOGUE_FULL_REVIEWED']='true';self.assertTrue(assess(e)['stage_ready'])
    def test_token_presence_is_separate_from_source_collection(self):
        e=self.ready();e['VERCEL_TOKEN_PRESENT']='false';r=assess(e)
        self.assertTrue(r['stage_ready']);self.assertFalse(r['publish_ready'])
    def test_typo_mode_or_uppercase_attestation_is_rejected(self):
        e=self.ready();e['SAVEHALF_CATALOGUE_MODE']='ful';self.assertFalse(assess(e)['stage_ready'])
        e=self.ready();e['SAVEHALF_CATALOGUE_SOURCE_REVIEWED']='TRUE';self.assertFalse(assess(e)['stage_ready'])
