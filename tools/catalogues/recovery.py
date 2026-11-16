"""Finite recovery decisions. This module never makes requests or enables publishing."""

def challenge_headers(headers):
    """Keep only documented verification markers, never cookies or arbitrary values."""
    known = {str(k).lower(): v for k, v in (headers or {}).items()
             if str(k).lower() in ('x-amzn-waf-action', 'cf-mitigated')}
    result = {}
    if known.get('x-amzn-waf-action') in ('challenge', 'captcha'):
        result['x-amzn-waf-action'] = known['x-amzn-waf-action']
    if known.get('cf-mitigated') == 'challenge':
        result['cf-mitigated'] = 'challenge'
    return result


def decision(diagnostic, transient_attempts=0):
    """Unknown failures and access challenges never trigger blind retry loops."""
    kind = diagnostic.get('kind')
    status = diagnostic.get('http_status')
    if kind == 'verification_required' or status in (401, 403):
        action = 'pause_source_request_supported_access'
    elif kind == 'rate_limit' or status == 429:
        action = 'pause_until_retry_after_and_budget_review'
    elif (kind in ('timeout', 'dns', 'transport', 'refused') or
          (isinstance(status, int) and 500 <= status <= 599)):
        action = 'one_budgeted_retry' if transient_attempts == 0 else 'pause_source'
    elif kind == 'parser_drift':
        action = 'quarantine_fix_against_fixture'
    elif kind == 'budget':
        action = 'stop_at_budget'
    else:
        action = 'pause_source_inspect_evidence'
    return {'action': action, 'publish_allowed': False,
            'automatic_source_switch': False}
