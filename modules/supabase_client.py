"""
Supabase 클라이언트 모듈
- KIS API 키 조회/갱신
- 토큰 캐시 저장/조회

키 관리 아키텍처:
1. Supabase 조회 (api_credentials 테이블)
2. 키 유효 → 사용
3. 키 무효 → 환경변수 Fallback
4. 환경변수 유효 → Supabase 자동 동기화
"""
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple

# Supabase 클라이언트 (선택적 import)
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


class SupabaseCredentialManager:
    """Supabase를 통한 API 자격증명 관리"""

    def __init__(self):
        self._client: Optional[Client] = None
        self._initialized = False
        self._init_error: Optional[str] = None

    def _get_client(self) -> Optional[Client]:
        """Supabase 클라이언트 (lazy initialization)"""
        if self._initialized:
            return self._client

        self._initialized = True

        if not SUPABASE_AVAILABLE:
            self._init_error = "supabase 패키지가 설치되지 않았습니다"
            return None

        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            self._init_error = "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다"
            return None

        try:
            self._client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            return self._client
        except Exception as e:
            self._init_error = f"Supabase 클라이언트 생성 실패: {e}"
            return None

    def is_available(self) -> bool:
        """Supabase 사용 가능 여부"""
        return self._get_client() is not None

    def get_init_error(self) -> Optional[str]:
        """초기화 에러 메시지"""
        self._get_client()  # 초기화 시도
        return self._init_error

    def get_kis_credentials(self) -> Optional[Dict[str, str]]:
        """KIS API 키 조회

        Returns:
            {"app_key": "...", "app_secret": "..."} 또는 None
        """
        client = self._get_client()
        if not client:
            return None

        try:
            response = client.table("api_credentials").select(
                "credential_type, credential_value"
            ).eq("service_name", "kis").eq("is_active", True).execute()

            if not response.data:
                return None

            result = {}
            for row in response.data:
                result[row["credential_type"]] = row["credential_value"]

            if "app_key" in result and "app_secret" in result:
                return result
            return None

        except Exception as e:
            print(f"[Supabase] KIS 키 조회 실패: {e}")
            return None

    def update_kis_credentials(self, app_key: str, app_secret: str) -> bool:
        """KIS API 키 업데이트 (Supabase에 동기화)

        Args:
            app_key: 앱 키
            app_secret: 앱 시크릿

        Returns:
            성공 여부
        """
        client = self._get_client()
        if not client:
            return False

        try:
            now = datetime.now(timezone.utc).isoformat()

            # app_key 업데이트
            client.table("api_credentials").upsert({
                "service_name": "kis",
                "credential_type": "app_key",
                "credential_value": app_key,
                "environment": "production",
                "is_active": True,
                "updated_at": now,
            }, on_conflict="service_name,credential_type,environment").execute()

            # app_secret 업데이트
            client.table("api_credentials").upsert({
                "service_name": "kis",
                "credential_type": "app_secret",
                "credential_value": app_secret,
                "environment": "production",
                "is_active": True,
                "updated_at": now,
            }, on_conflict="service_name,credential_type,environment").execute()

            print(f"[Supabase] KIS 키 동기화 완료")
            return True

        except Exception as e:
            print(f"[Supabase] KIS 키 업데이트 실패: {e}")
            return False

    def get_kis_token(self) -> Optional[Dict[str, Any]]:
        """KIS 액세스 토큰 조회

        Returns:
            {"access_token": "...", "expires_at": "...", "issued_at": "..."} 또는 None
        """
        client = self._get_client()
        if not client:
            return None

        try:
            response = client.table("api_credentials").select(
                "credential_type, credential_value"
            ).eq("service_name", "kis_token").eq("is_active", True).execute()

            if not response.data:
                return None

            result = {}
            for row in response.data:
                result[row["credential_type"]] = row["credential_value"]

            if "access_token" in result:
                return result
            return None

        except Exception as e:
            print(f"[Supabase] KIS 토큰 조회 실패: {e}")
            return None

    def save_kis_token(
        self,
        access_token: str,
        expires_at: str,
        issued_at: str
    ) -> bool:
        """KIS 액세스 토큰 저장

        Args:
            access_token: 액세스 토큰
            expires_at: 만료 시간 (ISO format)
            issued_at: 발급 시간 (ISO format)

        Returns:
            성공 여부
        """
        client = self._get_client()
        if not client:
            return False

        try:
            now = datetime.now(timezone.utc).isoformat()

            # 각 토큰 정보를 개별 행으로 저장
            for cred_type, cred_value in [
                ("access_token", access_token),
                ("expires_at", expires_at),
                ("issued_at", issued_at),
            ]:
                client.table("api_credentials").upsert({
                    "service_name": "kis_token",
                    "credential_type": cred_type,
                    "credential_value": cred_value,
                    "environment": "production",
                    "is_active": True,
                    "updated_at": now,
                }, on_conflict="service_name,credential_type,environment").execute()

            print(f"[Supabase] KIS 토큰 저장 완료")
            return True

        except Exception as e:
            print(f"[Supabase] KIS 토큰 저장 실패: {e}")
            return False

    def invalidate_kis_token(self) -> bool:
        """KIS 토큰 무효화"""
        client = self._get_client()
        if not client:
            return False

        try:
            client.table("api_credentials").update({
                "is_active": False,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("service_name", "kis_token").execute()

            print(f"[Supabase] KIS 토큰 무효화 완료")
            return True

        except Exception as e:
            print(f"[Supabase] KIS 토큰 무효화 실패: {e}")
            return False


# 싱글톤 인스턴스
_credential_manager: Optional[SupabaseCredentialManager] = None


def get_credential_manager() -> SupabaseCredentialManager:
    """SupabaseCredentialManager 싱글톤 인스턴스"""
    global _credential_manager
    if _credential_manager is None:
        _credential_manager = SupabaseCredentialManager()
    return _credential_manager


def get_kis_credentials_with_fallback() -> Tuple[Optional[str], Optional[str], str]:
    """KIS API 키 조회 (Supabase → 환경변수 Fallback)

    Returns:
        (app_key, app_secret, source)
        source: 'supabase' | 'env' | 'none'
    """
    manager = get_credential_manager()

    # 1. Supabase에서 조회 시도
    if manager.is_available():
        creds = manager.get_kis_credentials()
        if creds:
            print(f"[KIS] Supabase에서 API 키 로드")
            return creds.get("app_key"), creds.get("app_secret"), "supabase"

    # 2. 환경변수 Fallback
    from config.settings import KIS_APP_KEY, KIS_APP_SECRET
    if KIS_APP_KEY and KIS_APP_SECRET:
        print(f"[KIS] 환경변수에서 API 키 로드")
        return KIS_APP_KEY, KIS_APP_SECRET, "env"

    # 3. 키 없음
    return None, None, "none"


def sync_kis_credentials_to_supabase(app_key: str, app_secret: str) -> bool:
    """환경변수 KIS 키를 Supabase에 동기화

    Args:
        app_key: 앱 키
        app_secret: 앱 시크릿

    Returns:
        성공 여부
    """
    manager = get_credential_manager()
    if not manager.is_available():
        return False

    return manager.update_kis_credentials(app_key, app_secret)
