from __future__ import annotations


class Bud2APIError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(f"bud2 API error {status_code}: {detail}")
        self.status_code = status_code
        self.detail = detail
