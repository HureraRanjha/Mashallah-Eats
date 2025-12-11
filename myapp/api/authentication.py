from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Session authentication without CSRF enforcement.
    Used for API endpoints accessed from React frontend.
    """

    def enforce_csrf(self, request):
        # Skip CSRF check for API requests
        return
