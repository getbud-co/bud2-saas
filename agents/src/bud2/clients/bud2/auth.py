from __future__ import annotations

from bud2.auth.static_token import StaticTokenCredentialProvider
from bud2.config import Settings


def credential_provider_from_settings(settings: Settings) -> StaticTokenCredentialProvider:
    if not settings.bud2_api_token:
        raise ValueError("BUD2_API_TOKEN is required for the initial static credential provider")
    if settings.is_production and not settings.allow_static_bud2_token_in_production:
        raise ValueError("static BUD2_API_TOKEN is disabled in production")
    return StaticTokenCredentialProvider(settings.bud2_api_token)
