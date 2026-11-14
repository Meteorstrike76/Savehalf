"""One read-only Vercel project probe; never print credentials or response bodies."""
import json
import os
import urllib.error
import urllib.request

from preflight import PROJECT, TEAM, REPOSITORY

MAX_BYTES = 262144
URL = f'https://api.vercel.com/v9/projects/{PROJECT}?teamId={TEAM}'


class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def verify(env, opener=None):
    result = {'schema_version': 1, 'ok': False, 'status': 'configuration_blocked',
              'requests': 0, 'deployment_performed': False,
              'limitation': 'Read access does not prove deployment permission, quota or source rights.'}
    if (env.get('GITHUB_REPOSITORY') != REPOSITORY or
            env.get('GITHUB_REF') != 'refs/heads/main' or
            env.get('VERCEL_PROJECT_ID') != PROJECT or env.get('VERCEL_ORG_ID') != TEAM):
        return result
    token = env.get('VERCEL_TOKEN', '')
    if not token:
        result['status'] = 'token_missing'
        return result
    # No supplied URL, redirect following, retry, package install or response logging.
    request = urllib.request.Request(URL, headers={'Authorization': 'Bearer ' + token}, method='GET')
    client = opener if opener is not None else urllib.request.build_opener(NoRedirects())
    result['requests'] = 1
    try:
        with client.open(request, timeout=15) as response:
            if response.status != 200:
                result['status'] = 'unexpected_http_status'
                return result
            body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            result['status'] = 'response_too_large'
            return result
        data = json.loads(body)
        if not isinstance(data, dict):
            result['status'] = 'invalid_response'
            return result
        result['ok'] = data.get('id') == PROJECT and data.get('accountId') == TEAM
        result['status'] = 'target_verified' if result['ok'] else 'target_mismatch'
    except urllib.error.HTTPError as error:
        result['status'] = {401: 'token_rejected', 403: 'access_denied',
                            404: 'project_not_accessible', 429: 'rate_limited'}.get(error.code, 'http_error')
        error.close()
    except (ValueError, UnicodeError):
        result['status'] = 'invalid_response'
    except Exception:
        # Exception strings can contain credential-bearing request details.
        result['status'] = 'transport_error'
    return result


if __name__ == '__main__':
    report = verify(os.environ)
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report['ok'] else 2)
