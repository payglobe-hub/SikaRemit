import hashlib
from user_agents import parse

class DeviceFingerprint:
    @staticmethod
    def generate(request):
        """
        Generates a unique fingerprint for the device
        Uses: IP, User-Agent, Accept-Language
        """
        ua_string = request.META.get('HTTP_USER_AGENT', '')
        ip = request.META.get('REMOTE_ADDR', '')
        language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        
        user_agent = parse(ua_string)
        device_info = f"{ip}-{user_agent.browser.family}-{user_agent.os.family}-{language}"
        
        return hashlib.sha256(device_info.encode()).hexdigest()[:32]
