"""Sanitised failure metadata; never log exception messages or response bodies."""
import socket,ssl
from urllib.error import HTTPError,URLError


def failure(error,stage):
    result={'stage':stage,'http_status':None,'kind':'unexpected'}
    if isinstance(error,HTTPError):
        result.update(http_status=error.code,kind='access' if error.code in [401,403] else 'rate_limit' if error.code==429 else 'upstream')
    elif isinstance(error,URLError):
        reason=error.reason
        result['kind']=('dns' if isinstance(reason,socket.gaierror) else 'tls' if isinstance(reason,ssl.SSLError) else
                        'timeout' if isinstance(reason,TimeoutError) else 'refused' if isinstance(reason,ConnectionRefusedError) else 'transport')
    elif isinstance(error,TimeoutError):result['kind']='timeout'
    elif isinstance(error,ValueError):
        # Only internal fixed guard names affect classification. No message is emitted.
        code=str(error)
        result['kind']=('budget' if code in ['request_budget','byte_budget'] else 'timeout' if code=='body_timeout' else
                        'access' if code=='robots_denied' else 'parser_drift')
    elif isinstance(error,OSError):result['kind']='transport'
    return result
