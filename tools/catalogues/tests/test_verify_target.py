import io
import json
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from verify_target import verify, NoRedirects, URL, MAX_BYTES
from preflight import PROJECT, TEAM, REPOSITORY


class TargetTests(unittest.TestCase):
    def env(self):
        return dict(GITHUB_REPOSITORY=REPOSITORY, GITHUB_REF='refs/heads/main',
                    VERCEL_PROJECT_ID=PROJECT, VERCEL_ORG_ID=TEAM, VERCEL_TOKEN='private-test-token')

    def client(self, body):
        response = Mock(status=200)
        response.read.return_value = body
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        client = Mock()
        client.open.return_value = response
        return client

    def test_verified_target_only_one_fixed_get(self):
        client = self.client(json.dumps(dict(id=PROJECT, accountId=TEAM, env=['private-data'])).encode())
        report = verify(self.env(), client)
        self.assertTrue(report['ok'])
        request = client.open.call_args.args[0]
        self.assertEqual(request.full_url, URL)
        self.assertEqual(request.method, 'GET')
        self.assertEqual(client.open.call_count, 1)
        self.assertEqual(client.open.call_args.kwargs['timeout'], 15)
        self.assertNotIn('private', str(report))

    def test_untrusted_branch_target_and_missing_token_never_contact_api(self):
        for key, value in [('GITHUB_REF', 'refs/pull/38/merge'), ('GITHUB_REPOSITORY', 'other/repo'),
                           ('VERCEL_PROJECT_ID', 'other'), ('VERCEL_ORG_ID', 'other'), ('VERCEL_TOKEN', '')]:
            env = self.env(); env[key] = value
            client = Mock()
            self.assertFalse(verify(env, client)['ok'])
            client.open.assert_not_called()

    def test_wrong_team_or_project_and_malformed_body_rejected(self):
        for body in [b'{}', b'[]', b'null', b'broken', b'\xff',
                     json.dumps(dict(id=PROJECT, accountId='wrong')).encode(), b'x' * (MAX_BYTES + 1)]:
            self.assertFalse(verify(self.env(), self.client(body))['ok'])

    def test_errors_are_fixed_reports_without_retry_or_response_content(self):
        for code, status in [(401, 'token_rejected'), (403, 'access_denied'),
                             (404, 'project_not_accessible'), (429, 'rate_limited'), (302, 'http_error')]:
            client = Mock()
            client.open.side_effect = urllib.error.HTTPError(URL, code, 'private-test-token', {}, io.BytesIO(b'private-body'))
            report = verify(self.env(), client)
            self.assertEqual(report['status'], status)
            self.assertEqual(client.open.call_count, 1)
            self.assertNotIn('private', str(report))
        client = Mock(); client.open.side_effect = RuntimeError('private-test-token')
        self.assertEqual(verify(self.env(), client)['status'], 'transport_error')

    def test_redirects_never_forward_credentials(self):
        self.assertIsNone(NoRedirects().redirect_request(None, None, 302, '', {}, 'https://other.example'))


if __name__ == '__main__':
    unittest.main()
