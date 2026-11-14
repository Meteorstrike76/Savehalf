"""Readiness checks only. No network, credential reads, collection or deployment."""
import argparse
import json
import os
import re
from pathlib import Path

PROJECT='prj_nPs0HfBKQI4wCBKFpwmAEmu3SKwC'
TEAM='team_5vtuiNYLRKgK8jmgLl8idnDD'
REPOSITORY='Meteorstrike76/Savehalf'


def assess(env):
    mode=env.get('SAVEHALF_CATALOGUE_MODE','pilot')
    checks=[]
    def add(key,ok,scope,reason):
        checks.append({'check':key,'ok':bool(ok),'scope':scope,'required_action':None if ok else reason})
    add('correct_repository',env.get('GITHUB_REPOSITORY')==REPOSITORY,'stage','Run from the existing Savehalf repository.')
    add('reviewed_default_branch',env.get('GITHUB_REF')=='refs/heads/main','stage','Adopt the reviewed PR on main; a production deployment alone does not install a scheduled workflow.')
    add('source_use_reviewed',env.get('SAVEHALF_CATALOGUE_SOURCE_REVIEWED')=='true','stage','Record the source-use basis and then set SAVEHALF_CATALOGUE_SOURCE_REVIEWED=true.')
    add('included_budget_reviewed',env.get('SAVEHALF_CATALOGUE_BUDGET_REVIEWED')=='true','stage','Verify available included Actions/Vercel quotas and then set SAVEHALF_CATALOGUE_BUDGET_REVIEWED=true.')
    add('valid_rollout_mode',mode in ['pilot','full'],'stage','Set SAVEHALF_CATALOGUE_MODE to pilot or full.')
    add('full_rollout_reviewed',mode!='full' or env.get('SAVEHALF_CATALOGUE_FULL_REVIEWED')=='true','stage','Run and inspect the two-store pilot before setting SAVEHALF_CATALOGUE_FULL_REVIEWED=true.')
    add('correct_vercel_project',env.get('VERCEL_PROJECT_ID')==PROJECT,'publish','Configure the verified existing SaveHalf VERCEL_PROJECT_ID.')
    add('correct_vercel_team',env.get('VERCEL_ORG_ID')==TEAM,'publish','Configure the verified existing SaveHalf VERCEL_ORG_ID.')
    add('reviewed_cli_version',bool(re.fullmatch(r'\d+\.\d+\.\d+',env.get('VERCEL_CLI_VERSION',''))),'publish','Set a reviewed exact VERCEL_CLI_VERSION; no latest tags or package expressions.')
    # The workflow supplies only a boolean expression, never the credential.
    add('token_visible_to_job',env.get('VERCEL_TOKEN_PRESENT')=='true','publish','Configure VERCEL_TOKEN directly in the appropriate protected GitHub environment; do not paste it into chat.')
    stage=all(c['ok'] for c in checks if c['scope']=='stage')
    publishing=stage and all(c['ok'] for c in checks if c['scope']=='publish')
    return {'schema_version':1,'mode':mode if mode in ['pilot','full'] else 'invalid','stage_ready':stage,'publish_ready':publishing,
            'stage_enabled':env.get('SAVEHALF_CATALOGUE_STAGE_ENABLED')=='true',
            'publish_enabled':env.get('SAVEHALF_CATALOGUE_PUBLISH_ENABLED')=='true',
            'scheduled_budget_estimate':{'runs_per_31_day_month':62,'stage_max_minutes':620,'stage_plus_publish_max_minutes':1240,'shared_quota_reserved':False,'manual_runs_extra':True},
            'checks':checks,'limits':({'requests':20,'viewers':2,'images':2,'specials':2,'stores':['Coles','Woolworths']} if mode!='full' else {'requests':80,'viewers':4,'images':5,'specials':14,'stores':'website targets'}),
            'limitations':['Readiness attestations do not independently verify permissions or remaining account-wide quotas.',
                            'Token visibility applies only to this job; an environment-scoped secret may not be visible to a repository-only check.',
                            'Stage readiness does not enable collection or publication.']}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--require',choices=['stage','publish'])
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    result=assess(os.environ)
    text=json.dumps(result,indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(text+'\n')
    print(text)
    if args.require and not result[args.require+'_ready']:
        raise SystemExit(2)

if __name__=='__main__':main()
